import { Heap } from "../kernel/heap";
import { math } from "../kernel/numerics";
import type { Counters } from "../kernel/counters";
import {
  adjacent,
  center,
  edgeAllowed,
  type Regions,
  type Terrain,
  type Point,
} from "./terrain";
interface Open {
  k: number;
  g: number;
  f: number;
}
export interface SearchState {
  version: number;
  start: number;
  goal: number;
  open: Open[];
  g: number[];
  parent: number[];
  closed: number[];
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
  // Declared terrain factors <=1. This lower bound remains admissible after
  // faster-road changes by dividing by the raster's actual maximum.
  return (
    (Math.max(dx, dy) + (math.sqrt(2) - 1) * Math.min(dx, dy)) *
    t.profile.cellKm
  );
}
export function beginSearch(
  t: Terrain,
  r: Regions,
  start: number,
  goal: number,
  c: Counters,
): SearchState {
  c.routeSearches++;
  const n = t.kind.length,
    state: SearchState = {
      version: t.version,
      start,
      goal,
      open: [],
      g: Array(n).fill(-1),
      parent: Array(n).fill(-1),
      closed: Array(n).fill(0),
      status: "unresolved",
      path: [],
    };
  if (
    start < 0 ||
    goal < 0 ||
    start >= n ||
    goal >= n ||
    !t.passable[start] ||
    !t.passable[goal] ||
    r.component[start] !== r.component[goal]
  ) {
    state.status = "unreachable";
    return state;
  }
  state.g[start] = 0;
  state.open.push({
    k: start,
    g: 0,
    f: heuristic(t, start, goal) / maxSpeed(t),
  });
  return state;
}
const maxSpeedCache = new WeakMap<Terrain, { version: number; max: number }>();
function maxSpeed(t: Terrain): number {
  const held = maxSpeedCache.get(t);
  if (held?.version === t.version) return held.max;
  let max = 0;
  for (const p of t.speed) max = Math.max(max, p);
  maxSpeedCache.set(t, { version: t.version, max });
  return max;
}
export function resumeSearch(
  t: Terrain,
  s: SearchState,
  budget: number,
  c: Counters,
): RouteResult {
  if (!Number.isSafeInteger(budget) || budget < 1)
    throw new Error("Invalid route expansion budget");
  if (s.version !== t.version) {
    s.status = "invalidated";
    return { status: s.status, search: s };
  }
  const heap = new Heap<Open>(compare, s.open),
    max = maxSpeed(t);
  for (
    let spent = 0;
    s.status === "unresolved" && heap.peek() && spent < budget;
  ) {
    const node = heap.pop()!;
    if (s.closed[node.k] || node.g !== s.g[node.k]) continue;
    c.routeExpansions++;
    spent++;
    s.closed[node.k] = 1;
    if (node.k === s.goal) {
      const path: number[] = [];
      let at = s.goal;
      while (at !== -1) {
        path.push(at);
        at = s.parent[at]!;
      }
      s.path = path.reverse();
      s.status = "found";
      break;
    }
    for (const j of adjacent(t, node.k))
      if (!s.closed[j] && edgeAllowed(t, node.k, j)) {
        const diagonal =
          node.k % t.profile.width !== j % t.profile.width &&
          Math.floor(node.k / t.profile.width) !==
            Math.floor(j / t.profile.width);
        // Cell-boundary integration: half the segment in each cell.
        const cost =
          t.profile.cellKm *
          (diagonal ? math.sqrt(2) : 1) *
          (0.5 / t.speed[node.k]! + 0.5 / t.speed[j]!);
        const g = node.g + cost;
        if (s.g[j] === -1 || g < s.g[j]!) {
          s.g[j] = g;
          s.parent[j] = node.k;
          heap.push({ k: j, g, f: g + heuristic(t, j, s.goal) / max });
        }
      }
  }
  if (s.status === "unresolved" && !heap.peek()) s.status = "unreachable";
  return s.status === "found"
    ? { status: "found", search: s, path: [...s.path], cost: s.g[s.goal]! }
    : { status: s.status, search: s };
}
export interface CellSegment {
  from: Point;
  to: Point;
  cell: number;
  length: number;
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
