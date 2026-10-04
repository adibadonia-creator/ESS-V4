import { Heap } from "../kernel/heap";
import { math } from "../kernel/numerics";
import type { Counters } from "../kernel/counters";
import type { MapProfile, CellBelief } from "../evidence/types";
export interface PersonalSearch {
  start: number;
  goal: number;
  exploratory: boolean;
  priorSpeed: number;
  profile: MapProfile;
  known: Record<number, CellBelief>;
  nodes: Record<number, { g: number; parent: number; closed: boolean }>;
  open: { cell: number; g: number; f: number }[];
  regionByCell: Record<number, number>;
  regions: Record<number, { id: number; cells: number[]; neighbors: number[] }>;
  coarse: {
    open: { cell: number; g: number; f: number }[];
    nodes: Record<number, { g: number; parent: number; closed: boolean }>;
    goal: number;
    done: boolean;
  };
  corridor: number[] | null;
  path: number[];
  status: "unresolved" | "found" | "unreachable";
  expansions: number;
  effortLimit: number;
}
export function beginPersonalSearch(
  profile: MapProfile,
  cells: CellBelief[],
  start: number,
  goal: number,
  exploratory: boolean,
  priorSpeed: number,
  effortLimit: number,
  counters: Counters,
  summaries: { id: number; cells: number[]; neighbors: number[] }[] = [],
): PersonalSearch {
  counters.personalRouteSearches++;
  const known = Object.fromEntries(cells.map((c) => [c.cell, c]));
  const regions = Object.fromEntries(summaries.map((r) => [r.id, r])),
    regionByCell = Object.fromEntries(
      summaries.flatMap((r) => r.cells.map((k) => [k, r.id])),
    ),
    a = regionByCell[start],
    b = regionByCell[goal];
  const regional = !exploratory && a !== undefined && b !== undefined;
  return {
    regions,
    regionByCell,
    coarse: {
      open: regional ? [{ cell: a, g: 0, f: 0 }] : [],
      nodes: regional ? { [a]: { g: 0, parent: -1, closed: false } } : {},
      goal: b ?? -1,
      done: !regional,
    },
    corridor: null,
    profile: { ...profile },
    known,
    start,
    goal,
    exploratory,
    priorSpeed,
    nodes: { [start]: { g: 0, parent: -1, closed: false } },
    open: [{ cell: start, g: 0, f: 0 }],
    path: [],
    status: "unresolved",
    expansions: 0,
    effortLimit,
  };
}
// Engineering slice is separate from the authorisation's causal effort account.
export function resumePersonalSearch(
  s: PersonalSearch,
  slice: number,
  counters: Counters,
): PersonalSearch["status"] | "deferred" {
  if (s.status !== "unresolved") return s.status;
  const heap = new Heap<(typeof s.open)[number]>(
    (a, b) => a.f - b.f || a.cell - b.cell || a.g - b.g,
    s.open,
  );
  const { width: w, height: h } = s.profile;
  const cost = (k: number) =>
    s.known[k]
      ? s.known[k]!.passable
        ? 1 / s.known[k]!.speed
        : Infinity
      : s.exploratory
        ? 1 / s.priorSpeed
        : Infinity;
  const heuristic = (k: number) => {
    const dx = Math.abs((k % w) - (s.goal % w)),
      dy = Math.abs(Math.floor(k / w) - Math.floor(s.goal / w));
    return (
      (Math.max(dx, dy) + (math.sqrt(2) - 1) * Math.min(dx, dy)) *
      s.profile.cellKm
    );
  };
  let n = 0;
  if (!s.coarse.done) {
    const coarse = new Heap<(typeof s.coarse.open)[number]>(
      (a, b) => a.f - b.f || a.cell - b.cell,
      s.coarse.open,
    );
    while (coarse.peek() && n < slice && s.expansions < s.effortLimit) {
      const entry = coarse.pop()!,
        node = s.coarse.nodes[entry.cell]!;
      if (node.closed || node.g !== entry.g) continue;
      node.closed = true;
      n++;
      s.expansions++;
      counters.personalRouteRegionExpansions++;
      if (entry.cell === s.coarse.goal) {
        s.corridor = [];
        let k = entry.cell;
        while (k !== -1) {
          s.corridor.push(k);
          k = s.coarse.nodes[k]!.parent;
        }
        s.corridor.reverse();
        s.coarse.done = true;
        s.coarse.open.length = 0;
        break;
      }
      for (const k of s.regions[entry.cell]!.neighbors) {
        const g = node.g + 1;
        if (!s.coarse.nodes[k] || g < s.coarse.nodes[k]!.g) {
          s.coarse.nodes[k] = { g, parent: entry.cell, closed: false };
          coarse.push({ cell: k, g, f: g });
        }
      }
    }
    if (!s.coarse.done && !coarse.peek()) {
      s.status = "unreachable";
      return "unreachable";
    }
    if (!s.coarse.done)
      return s.expansions >= s.effortLimit ? "deferred" : "unresolved";
  }
  const corridor = s.corridor ? new Set(s.corridor) : null;
  while (heap.peek() && n < slice && s.expansions < s.effortLimit) {
    const entry = heap.pop()!,
      node = s.nodes[entry.cell]!;
    if (node.closed || node.g !== entry.g) continue;
    node.closed = true;
    n++;
    s.expansions++;
    counters.personalRouteExpansions++;
    if (entry.cell === s.goal) {
      let k = entry.cell;
      while (k !== -1) {
        s.path.push(k);
        k = s.nodes[k]!.parent;
      }
      s.path.reverse();
      s.open.length = 0;
      s.status = "found";
      return "found";
    }
    const x = entry.cell % w,
      y = Math.floor(entry.cell / w);
    for (const [dx, dy] of [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ]) {
      const xx = x + dx!,
        yy = y + dy!;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const k = xx + w * yy;
      if (corridor && !corridor.has(s.regionByCell[k]!)) continue;
      const c = cost(k);
      if (!Number.isFinite(c) || !Number.isFinite(cost(entry.cell))) continue;
      if (
        dx &&
        dy &&
        (!Number.isFinite(cost(x + dx! + w * y)) ||
          !Number.isFinite(cost(x + w * (y + dy!))))
      )
        continue;
      const g =
        node.g +
        (s.profile.cellKm *
          (dx && dy ? math.sqrt(2) : 1) *
          (cost(entry.cell) + c)) /
          2;
      if (!s.nodes[k] || g < s.nodes[k]!.g) {
        s.nodes[k] = { g, parent: entry.cell, closed: false };
        heap.push({ cell: k, g, f: g + heuristic(k) });
      }
    }
  }
  if (!heap.peek()) {
    s.status = "unreachable";
    return "unreachable";
  }
  return s.expansions >= s.effortLimit ? "deferred" : "unresolved";
}
