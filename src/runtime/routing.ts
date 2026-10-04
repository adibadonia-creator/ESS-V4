import { Heap } from "../kernel/heap";
import { math } from "../kernel/numerics";
import type { Counters } from "../kernel/counters";
import {
  geometryCell,
  personalTopology,
  type GeographyVersion,
  type PersonalTopology,
} from "../evidence/geography";
import type { MapProfile, CellBelief, TraversalPrior } from "../evidence/types";
export interface PersonalSearch {
  start: number;
  goal: number;
  exploratory: boolean;
  prior: TraversalPrior;
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
  regionExpansions: number;
  geographyId: string | null;
  effortAccount: string | null;
  deferred: boolean;
}
export function beginPersonalSearch(
  profile: MapProfile,
  cells: CellBelief[],
  start: number,
  goal: number,
  exploratory: boolean,
  prior: TraversalPrior,
  counters: Counters,
  summaries: { id: number; cells: number[]; neighbors: number[] }[] = [],
  geography?: GeographyVersion,
): PersonalSearch {
  counters.personalRouteSearches++;
  const known = geography
    ? {}
    : Object.fromEntries(cells.map((c) => [c.cell, c]));
  if (!geography) counters.personalGeographyCopied += cells.length;
  const regions = Object.fromEntries(summaries.map((r) => [r.id, r])),
    regionByCell = Object.fromEntries(
      summaries.flatMap((r) => r.cells.map((k) => [k, r.id])),
    ),
    a = regionByCell[start],
    b = regionByCell[goal];
  const topology =
    geography && !exploratory
      ? personalTopology(geography, profile, counters)
      : { regions, regionByCell };
  const aa = topology.regionByCell[start],
    bb = topology.regionByCell[goal];
  const regional = !exploratory && aa !== undefined && bb !== undefined;
  return {
    regions: geography ? {} : regions,
    regionByCell: geography ? {} : regionByCell,
    coarse: {
      open: regional ? [{ cell: aa!, g: 0, f: 0 }] : [],
      nodes: regional ? { [aa!]: { g: 0, parent: -1, closed: false } } : {},
      goal: bb ?? -1,
      done: !regional,
    },
    corridor: null,
    profile: { ...profile },
    known,
    start,
    goal,
    exploratory,
    prior: { ...prior },
    nodes: { [start]: { g: 0, parent: -1, closed: false } },
    open: [{ cell: start, g: 0, f: 0 }],
    path: [],
    status: "unresolved",
    expansions: 0,
    regionExpansions: 0,
    geographyId: geography?.id ?? null,
    effortAccount: null,
    deferred: false,
  };
}
type Open = PersonalSearch["open"][number];
const heaps = new WeakMap<Open[], Heap<Open>>();
function heapFor(open: Open[], counts: Counters): Heap<Open> {
  let heap = heaps.get(open);
  if (!heap) {
    // open is the persisted canonical heap order; restore needs no heapification.
    heap = new Heap<Open>(
      (a, b) => a.f - b.f || a.cell - b.cell || a.g - b.g,
      open,
      false,
    );
    heaps.set(open, heap);
  }
  return heap;
}
const corridors = new WeakMap<PersonalSearch, Set<number>>();
// Low level search yields only. The caller supplies remaining causal logical work.
export function resumePersonalSearch(
  s: PersonalSearch,
  slice: number,
  counters: Counters,
  allowance = Number.MAX_SAFE_INTEGER,
  geography?: GeographyVersion,
): PersonalSearch["status"] | "deferred" {
  if (s.status !== "unresolved") return s.status;
  if (
    !Number.isSafeInteger(slice) ||
    slice < 1 ||
    !Number.isSafeInteger(allowance) ||
    allowance < 0
  )
    throw Error("Invalid route work allowance");
  counters.personalRouteHostResumes++;
  const heap = heapFor(s.open, counters);
  if (s.geographyId && geography?.id !== s.geographyId)
    throw Error("Personal geography premise mismatch");
  const topology: PersonalTopology =
    geography && !s.exploratory
      ? personalTopology(geography, s.profile, counters)
      : { regions: s.regions, regionByCell: s.regionByCell };
  const known = (k: number) => {
    counters.personalRouteCellsConsulted++;
    return geography ? geometryCell(geography, k) : s.known[k];
  };
  const { width: w, height: h } = s.profile;
  const cost = (k: number) => {
    const c = known(k);
    return c
      ? c.passable
        ? 1 / c.speed
        : Infinity
      : s.exploratory
        ? 1 / s.prior.speedFactor
        : Infinity;
  };
  const heuristic = (k: number) => {
    const dx = Math.abs((k % w) - (s.goal % w)),
      dy = Math.abs(Math.floor(k / w) - Math.floor(s.goal / w));
    return (
      (Math.max(dx, dy) + (math.sqrt(2) - 1) * Math.min(dx, dy)) *
      s.profile.cellKm
    );
  };
  let n = 0,
    host = 0;
  if (!s.coarse.done) {
    const coarse = heapFor(s.coarse.open, counters);
    while (coarse.peek() && host < slice && n < allowance) {
      const entry = (counters.personalRouteHeapPops++, coarse.pop()!),
        node = s.coarse.nodes[entry.cell]!;
      host++;
      if (node.closed || node.g !== entry.g) continue;
      node.closed = true;
      // N.effort charges cell expansions. Region guiding is indexed overhead,
      // separately metered; do not invent an additional scientific unit cost.
      s.regionExpansions++;
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
      for (const k of (counters.personalRegionRecordsConsulted++,
      topology.regions[entry.cell]!.neighbors)) {
        const g = node.g + 1;
        if (!s.coarse.nodes[k] || g < s.coarse.nodes[k]!.g) {
          s.coarse.nodes[k] = { g, parent: entry.cell, closed: false };
          counters.personalRouteHeapPushes++;
          coarse.push({ cell: k, g, f: g });
        }
      }
    }
    if (!s.coarse.done && !coarse.peek()) {
      s.status = "unreachable";
      return "unreachable";
    }
    if (!s.coarse.done) return n >= allowance ? "deferred" : "unresolved";
  }
  let corridor = corridors.get(s) ?? null;
  if (s.corridor && !corridor) {
    corridor = new Set(s.corridor);
    corridors.set(s, corridor);
  }
  while (heap.peek() && host < slice && n < allowance) {
    const entry = (counters.personalRouteHeapPops++, heap.pop()!),
      node = s.nodes[entry.cell]!;
    host++;
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
      if (corridor && !corridor.has(topology.regionByCell[k]!)) continue;
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
        counters.personalRouteHeapPushes++;
        heap.push({ cell: k, g, f: g + heuristic(k) });
      }
    }
  }
  if (!heap.peek()) {
    s.status = "unreachable";
    return "unreachable";
  }
  return n >= allowance ? "deferred" : "unresolved";
}
