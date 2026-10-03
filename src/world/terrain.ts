import type { PhysicalConfig, SpatialProfile } from "../content/profile";
import { hash32, digest } from "../kernel/canonical";
import { Heap } from "../kernel/heap";
export interface Point {
  x: number;
  y: number;
}
export interface Terrain {
  profile: SpatialProfile;
  version: number;
  kind: Uint8Array;
  passable: Uint8Array;
  speed: Float64Array;
  opaque: Uint8Array;
  elevation: Float64Array;
  moisture: Float64Array;
  fertility: Float64Array;
  geology: Float64Array;
  drain: Int32Array;
  flow: Float64Array;
}
export function cell(t: Terrain, p: Point): number {
  const x = Math.floor(p.x / t.profile.cellKm),
    y = Math.floor(p.y / t.profile.cellKm);
  return x < 0 || y < 0 || x >= t.profile.width || y >= t.profile.height
    ? -1
    : y * t.profile.width + x;
}
export function center(t: Terrain, k: number): Point {
  return {
    x: ((k % t.profile.width) + 0.5) * t.profile.cellKm,
    y: (Math.floor(k / t.profile.width) + 0.5) * t.profile.cellKm,
  };
}
export function adjacent(t: Terrain, k: number, diagonal = true): number[] {
  const { width, height } = t.profile,
    x = k % width,
    y = Math.floor(k / width),
    out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (
        (dx || dy) &&
        (diagonal || !dx || !dy) &&
        x + dx >= 0 &&
        x + dx < width &&
        y + dy >= 0 &&
        y + dy < height
      )
        out.push((y + dy) * width + x + dx);
  return out;
}
export function edgeAllowed(t: Terrain, a: number, b: number): boolean {
  if (a < 0 || b < 0 || !t.passable[a] || !t.passable[b]) return false;
  const dx = (b % t.profile.width) - (a % t.profile.width),
    dy = Math.floor(b / t.profile.width) - Math.floor(a / t.profile.width);
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (!dx && !dy)) return false;
  return (
    !dx ||
    !dy ||
    Boolean(t.passable[a + dx] && t.passable[a + dy * t.profile.width])
  );
}
// PORT WITH SIMPLIFICATION: ESS-V2 landscape noise + priority flood. Flood uses
// a mutable heap instead of sorting a queue on every cell; no scenario/controller.
function noise(
  seed: string,
  domain: string,
  x: number,
  y: number,
  scale: number,
): number {
  const ix = Math.floor(x / scale),
    iy = Math.floor(y / scale),
    tx = x / scale - ix,
    ty = y / scale - iy,
    sx = tx * tx * (3 - 2 * tx),
    sy = ty * ty * (3 - 2 * ty);
  const n = (a: number, b: number) =>
    hash32(JSON.stringify([seed, domain, a, b])) / 2 ** 32;
  return (
    (n(ix, iy) * (1 - sx) + n(ix + 1, iy) * sx) * (1 - sy) +
    (n(ix, iy + 1) * (1 - sx) + n(ix + 1, iy + 1) * sx) * sy
  );
}
export function generateTerrain(seed: string, c: PhysicalConfig): Terrain {
  const n = c.spatial.width * c.spatial.height,
    g = c.generator;
  const t: Terrain = {
    profile: { ...c.spatial },
    version: 0,
    kind: new Uint8Array(n),
    passable: new Uint8Array(n),
    speed: new Float64Array(n),
    opaque: new Uint8Array(n),
    elevation: new Float64Array(n),
    moisture: new Float64Array(n),
    fertility: new Float64Array(n),
    geology: new Float64Array(n),
    drain: new Int32Array(n).fill(-1),
    flow: new Float64Array(n).fill(1),
  };
  const value = (d: string, x: number, y: number) =>
    g.scales.reduce(
      (sum, s, i) => sum + g.weights[i]! * noise(seed, d, x, y, s),
      0,
    );
  for (let k = 0; k < n; k++) {
    const x = k % c.spatial.width,
      y = Math.floor(k / c.spatial.width),
      warp = g.warpCells * (value("warp", x, y) - 0.5);
    t.elevation[k] = value("elevation", x + warp, y - warp);
    t.moisture[k] = value("moisture", x, y);
    t.fertility[k] = value("fertility", x, y);
    t.geology[k] = value("geology", x, y);
  }
  const filled = Float64Array.from(t.elevation),
    visited = new Uint8Array(n),
    order: number[] = [];
  const queue = new Heap<number>((a, b) => filled[a]! - filled[b]! || a - b);
  for (let k = 0; k < n; k++) {
    const x = k % c.spatial.width,
      y = Math.floor(k / c.spatial.width);
    if (
      x === 0 ||
      y === 0 ||
      x === c.spatial.width - 1 ||
      y === c.spatial.height - 1
    ) {
      visited[k] = 1;
      queue.push(k);
    }
  }
  while (queue.peek() !== undefined) {
    const k = queue.pop()!;
    order.push(k);
    for (const j of adjacent(t, k, false))
      if (!visited[j]) {
        visited[j] = 1;
        t.drain[j] = k;
        filled[j] = Math.max(filled[j]!, filled[k]! + g.floodEpsilon);
        queue.push(j);
      }
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const k = order[i]!,
      d = t.drain[k]!;
    if (d >= 0) t.flow[d] = t.flow[d]! + t.flow[k]!;
  }
  for (let k = 0; k < n; k++) {
    let kind =
      t.moisture[k]! > g.forestMoisture
        ? 1
        : t.moisture[k]! < g.scrubMoisture
          ? 2
          : t.geology[k]! > g.rockGeology
            ? 3
            : 0;
    const crossing =
      hash32(
        JSON.stringify([
          seed,
          "ford",
          k % c.spatial.width,
          Math.floor(k / c.spatial.width),
        ]),
      ) %
        g.fordModulo ===
      0;
    if (t.flow[k]! >= g.riverFlow) kind = crossing ? 5 : 4;
    else if (t.elevation[k]! > g.cliffElevation && !crossing) kind = 6;
    const entry = c.terrain[kind]!;
    t.kind[k] = kind;
    t.passable[k] = +entry.passable;
    t.speed[k] = entry.speedFactor;
    t.opaque[k] = +entry.opaque;
  }
  return t;
}
export function terrainHash(t: Terrain): string {
  return digest(t);
}
export interface Regions {
  version: number;
  component: Int32Array;
  region: Int32Array;
  sizes: number[];
  portals: { a: number; b: number; from: number; to: number }[];
  neighbours: Map<number, Set<number>>;
}
export function buildRegions(t: Terrain): Regions {
  const component = new Int32Array(t.kind.length).fill(-1),
    region = new Int32Array(t.kind.length).fill(-1),
    sizes: number[] = [],
    neighbours = new Map<number, Set<number>>();
  let regionId = 0;
  // Global connected components prove reachability; local connected clusters
  // bounded by region chunks produce real portals, including narrow crossings.
  for (let k = 0; k < component.length; k++)
    if (t.passable[k] && component[k] === -1) {
      const id = sizes.length,
        q = [k];
      component[k] = id;
      for (let at = 0; at < q.length; at++)
        for (const j of adjacent(t, q[at]!))
          if (component[j] === -1 && edgeAllowed(t, q[at]!, j)) {
            component[j] = id;
            q.push(j);
          }
      sizes.push(q.length);
    }
  const chunk = (k: number) =>
    Math.floor((k % t.profile.width) / t.profile.regionCells) +
    Math.floor(Math.floor(k / t.profile.width) / t.profile.regionCells) *
      Math.ceil(t.profile.width / t.profile.regionCells);
  for (let k = 0; k < region.length; k++)
    if (t.passable[k] && region[k] === -1) {
      const id = regionId++,
        q = [k],
        block = chunk(k);
      region[k] = id;
      for (let at = 0; at < q.length; at++)
        for (const j of adjacent(t, q[at]!))
          if (
            region[j] === -1 &&
            chunk(j) === block &&
            edgeAllowed(t, q[at]!, j)
          ) {
            region[j] = id;
            q.push(j);
          }
      neighbours.set(id, new Set());
    }
  const portals: Regions["portals"] = [];
  for (let k = 0; k < region.length; k++)
    if (region[k]! >= 0)
      for (const j of adjacent(t, k))
        if (j > k && region[j] !== region[k] && edgeAllowed(t, k, j)) {
          const a = region[k]!,
            b = region[j]!;
          portals.push({ a, b, from: k, to: j });
          neighbours.get(a)!.add(b);
          neighbours.get(b)!.add(a);
        }
  return { version: t.version, component, region, sizes, portals, neighbours };
}
export function changeCell(
  t: Terrain,
  k: number,
  passable: boolean,
  speed: number,
  kind?: number,
): void {
  if (
    !Number.isInteger(k) ||
    k < 0 ||
    k >= t.kind.length ||
    !Number.isFinite(speed) ||
    speed < 0 ||
    (passable && speed === 0)
  )
    throw new Error("Invalid terrain change");
  t.passable[k] = +passable;
  t.speed[k] = speed;
  if (kind !== undefined) t.kind[k] = kind;
  t.version++;
}
