import { Heap } from "../kernel/heap";
import { math } from "../kernel/numerics";
import type { Counters } from "../kernel/counters";
import {
  adjacent,
  center,
  edgeAllowed,
  buildRegions,
  type Regions,
  type Terrain,
  type Point,
} from "./terrain";
interface Open {
  k: number;
  g: number;
  f: number;
}
// Only discovered nodes exist. Numeric keys are raster/region coordinates,
// never storage handles; canonical serialization sorts keys deterministically.
type Nodes = Record<number, { g: number; parent: number; closed: boolean }>;
interface Frontier {
  open: Open[];
  nodes: Nodes;
}
export interface SearchState extends Frontier {
  version: number;
  start: number;
  goal: number;
  stage: "regional" | "local";
  regional: Frontier | null;
  corridor: number[] | null;
  status: "unresolved" | "found" | "unreachable" | "invalidated";
  path: number[];
}
export type RouteResult =
  | {
      status: "unresolved" | "unreachable" | "invalidated";
      search: SearchState;
    }
  | { status: "found"; search: SearchState; path: number[]; cost: number };
function compare(a: Open, b: Open): number {
  return a.f - b.f || a.g - b.g || a.k - b.k;
}
function heuristic(t: Terrain, a: number, b: number): number {
  const dx = Math.abs((a % t.profile.width) - (b % t.profile.width)),
    dy = Math.abs(
      Math.floor(a / t.profile.width) - Math.floor(b / t.profile.width),
    );
  return (
    (Math.max(dx, dy) + (math.sqrt(2) - 1) * Math.min(dx, dy)) *
    t.profile.cellKm
  );
}
const regionCache = new WeakMap<Terrain, Regions>();
const heaps = new WeakMap<Frontier, Heap<Open>>();
const corridors = new WeakMap<SearchState, Set<number>>();
function heapFor(frontier: Frontier): Heap<Open> {
  let heap = heaps.get(frontier);
  if (!heap) {
    heap = new Heap(compare, frontier.open);
    heaps.set(frontier, heap);
  }
  return heap;
}
function regionalDistance(r: Regions, a: number, b: number): number {
  const p = r.centers[a]!,
    q = r.centers[b]!;
  return math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2) / r.maxSpeed;
}
export function beginSearch(
  t: Terrain,
  r: Regions,
  start: number,
  goal: number,
  c: Counters,
  // Raster mode is a diagnostic comparator, never a personal planning API.
  guidance: "regional" | "raster" = "regional",
): SearchState {
  if (r.version !== t.version) throw new Error("Stale regional graph");
  regionCache.set(t, r);
  c.routeSearches++;
  const s: SearchState = {
    version: t.version,
    start,
    goal,
    open: [],
    nodes: {},
    stage: "local",
    regional: null,
    corridor: null,
    status: "unresolved",
    path: [],
  };
  const n = t.kind.length;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(goal) ||
    start < 0 ||
    goal < 0 ||
    start >= n ||
    goal >= n ||
    !t.passable[start] ||
    !t.passable[goal] ||
    r.component[start] !== r.component[goal]
  ) {
    s.status = "unreachable";
    return s;
  }
  const a = r.region[start]!,
    b = r.region[goal]!;
  if (guidance === "regional" && a !== b) {
    s.stage = "regional";
    s.regional = {
      open: [{ k: a, g: 0, f: regionalDistance(r, a, b) }],
      nodes: { [a]: { g: 0, parent: -1, closed: false } },
    };
  } else {
    if (guidance === "regional") s.corridor = [a];
    initializeLocal(t, r, s);
  }
  return s;
}
function initializeLocal(t: Terrain, r: Regions, s: SearchState): void {
  s.stage = "local";
  s.nodes[s.start] = { g: 0, parent: -1, closed: false };
  heapFor(s).push({
    k: s.start,
    g: 0,
    f: heuristic(t, s.start, s.goal) / r.maxSpeed,
  });
}
function pathTo(nodes: Nodes, goal: number): number[] {
  const path: number[] = [];
  for (let at = goal; at !== -1; at = nodes[at]!.parent) path.push(at);
  return path.reverse();
}
export function resumeSearch(
  t: Terrain,
  s: SearchState,
  budget: number,
  c: Counters,
  regions?: Regions,
): RouteResult {
  if (!Number.isSafeInteger(budget) || budget < 1)
    throw new Error("Invalid route expansion budget");
  if (s.version !== t.version) {
    s.status = "invalidated";
    return { status: s.status, search: s };
  }
  let r = regions ?? regionCache.get(t);
  if (!r || r.version !== t.version) {
    r = buildRegions(t);
    regionCache.set(t, r);
  }
  // A slice charges both coarse and local expansions, including the transition.
  // No causal event, ordinal or timestamp is created by this computation.
  let spent = 0;
  while (s.status === "unresolved" && spent < budget) {
    const regional = s.stage === "regional",
      frontier = regional ? s.regional! : s,
      heap = heapFor(frontier),
      node = heap.pop();
    if (!node) {
      s.status = "unreachable";
      break;
    }
    const held = frontier.nodes[node.k]!;
    if (held.closed || node.g !== held.g) continue;
    held.closed = true;
    spent++;
    if (regional) {
      c.routeRegionExpansions++;
      const goal = r.region[s.goal]!;
      if (node.k === goal) {
        s.corridor = pathTo(frontier.nodes, goal);
        // No future search needs the completed coarse frontier.
        s.regional = null;
        initializeLocal(t, r, s);
        continue;
      }
      // Edges exist only where buildRegions found a traversable portal. Clusters
      // are connected internally, so this corridor always admits local refinement.
      for (const j of [...r.neighbours.get(node.k)!].sort((a, b) => a - b)) {
        const g = node.g + regionalDistance(r, node.k, j),
          old = frontier.nodes[j];
        if (!old?.closed && (!old || g < old.g)) {
          frontier.nodes[j] = { g, parent: node.k, closed: false };
          heap.push({ k: j, g, f: g + regionalDistance(r, j, goal) });
        }
      }
    } else {
      c.routeExpansions++;
      if (node.k === s.goal) {
        s.path = pathTo(s.nodes, s.goal);
        s.status = "found";
        break;
      }
      let allowed = corridors.get(s);
      if (!allowed && s.corridor) {
        allowed = new Set(s.corridor);
        corridors.set(s, allowed);
      }
      for (const j of adjacent(t, node.k)) {
        const old = s.nodes[j];
        if (
          old?.closed ||
          (allowed && !allowed.has(r.region[j]!)) ||
          !edgeAllowed(t, node.k, j)
        )
          continue;
        const diagonal =
          node.k % t.profile.width !== j % t.profile.width &&
          Math.floor(node.k / t.profile.width) !==
            Math.floor(j / t.profile.width);
        const cost =
          t.profile.cellKm *
          (diagonal ? math.sqrt(2) : 1) *
          (0.5 / t.speed[node.k]! + 0.5 / t.speed[j]!);
        const g = node.g + cost;
        if (!old || g < old.g) {
          s.nodes[j] = { g, parent: node.k, closed: false };
          heap.push({ k: j, g, f: g + heuristic(t, j, s.goal) / r.maxSpeed });
        }
      }
    }
  }
  const frontier = s.stage === "regional" ? s.regional! : s;
  if (s.status === "unresolved" && !heapFor(frontier).peek())
    s.status = "unreachable";
  return s.status === "found"
    ? {
        status: "found",
        search: s,
        path: [...s.path],
        cost: s.nodes[s.goal]!.g,
      }
    : { status: s.status, search: s };
}
export interface CellSegment {
  from: Point;
  to: Point;
  cell: number;
  length: number;
  // Passability at a diagonal corner is a real dependency despite zero length.
  guards?: number[];
}
// Exact straight-line raster traversal, with conservative supercover at corners.
export function segments(t: Terrain, a: Point, b: Point): CellSegment[] | null {
  const size = t.profile.cellKm,
    dx = b.x - a.x,
    dy = b.y - a.y,
    start = Math.floor(a.x / size) + Math.floor(a.y / size) * t.profile.width;
  if (start < 0 || start >= t.kind.length || !t.passable[start]) return null;
  const length = math.sqrt(dx * dx + dy * dy);
  if (!length) return [];
  let x = Math.floor(a.x / size),
    y = Math.floor(a.y / size),
    u = 0;
  const sx = Math.sign(dx),
    sy = Math.sign(dy),
    out: CellSegment[] = [];
  const stepX = dx === 0 ? Infinity : size / Math.abs(dx),
    stepY = dy === 0 ? Infinity : size / Math.abs(dy);
  let tx = dx === 0 ? Infinity : ((sx > 0 ? x + 1 : x) * size - a.x) / dx,
    ty = dy === 0 ? Infinity : ((sy > 0 ? y + 1 : y) * size - a.y) / dy;
  while (u < 1) {
    const next = Math.min(1, tx, ty),
      k = y * t.profile.width + x;
    if (
      x < 0 ||
      y < 0 ||
      x >= t.profile.width ||
      y >= t.profile.height ||
      !t.passable[k]
    )
      return null;
    if (next > u)
      out.push({
        from: { x: a.x + dx * u, y: a.y + dy * u },
        to: { x: a.x + dx * next, y: a.y + dy * next },
        cell: k,
        length: length * (next - u),
      });
    if (next === 1) break;
    if (Math.abs(tx - ty) < 1e-12) {
      if (!t.passable[k + sx] || !t.passable[k + sy * t.profile.width])
        return null;
      if (out.length)
        out[out.length - 1]!.guards = [k + sx, k + sy * t.profile.width];
      x += sx;
      y += sy;
      tx += stepX;
      ty += stepY;
    } else if (tx < ty) {
      x += sx;
      tx += stepX;
    } else {
      y += sy;
      ty += stepY;
    }
    u = next;
  }
  return out;
}
export function pullPath(t: Terrain, path: number[]): Point[] {
  if (!path.length) return [];
  const out = [center(t, path[0]!)];
  let at = 0;
  while (at < path.length - 1) {
    let next = at + 1;
    for (let j = path.length - 1; j > at + 1; j--)
      if (segments(t, center(t, path[at]!), center(t, path[j]!))) {
        next = j;
        break;
      }
    out.push(center(t, path[next]!));
    at = next;
  }
  return out;
}
