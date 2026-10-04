import { entries, get, immutable, put, drop, type Tree } from "../kernel/index";
import type { Counters } from "../kernel/counters";
import type { CellBelief, MapProfile, MapObservation } from "./types";
export interface GeographyVersion {
  id: string;
  owner: string;
  revision: number;
  cells: Tree<CellBelief>;
  observations: Tree<MapObservation>;
}
export const cellKey = (cell: number) => String(cell).padStart(8, "0");
export function geometryCell(
  v: GeographyVersion,
  cell: number,
  visit?: () => void,
): CellBelief | null {
  return get(v.cells, cellKey(cell), visit);
}
export function changedGeography(
  v: GeographyVersion,
  cells: CellBelief[],
  metadata: Record<string, MapObservation>,
): GeographyVersion {
  let root = v.cells;
  let observations = v.observations;
  const touched = new Set<string>();
  for (const c of cells) {
    const old = geometryCell(v, c.cell);
    if (old) touched.add(old.provenance);
    touched.add(c.provenance);
  }
  for (const key of touched)
    observations = metadata[key]
      ? put(observations, key, immutable({ ...metadata[key]! }))
      : drop(observations, key);
  for (const c of cells) root = put(root, cellKey(c.cell), immutable(c));
  return Object.freeze({
    owner: v.owner,
    revision: v.revision + 1,
    id: `${v.owner}:${v.revision + 1}`,
    cells: root,
    observations,
  });
}
export interface PersonalTopology {
  regionByCell: Record<number, number>;
  regions: Record<number, { id: number; cells: number[]; neighbors: number[] }>;
}
// Derived by personal version, never by physical terrain or observer state.
const topologyCache = new WeakMap<
  GeographyVersion,
  Map<string, PersonalTopology>
>();
export function personalTopology(
  v: GeographyVersion,
  profile: MapProfile,
  counts: Counters,
): PersonalTopology {
  const key = JSON.stringify(profile);
  const cache = topologyCache.get(v) ?? new Map<string, PersonalTopology>();
  topologyCache.set(v, cache);
  const old = cache.get(key);
  if (old) return old;
  const geography = entries(v.cells),
    passable = new Set(geography.filter((c) => c.passable).map((c) => c.cell));
  counts.geographyRegionBuildCells += geography.length;
  const regionByCell: Record<number, number> = {},
    regions: PersonalTopology["regions"] = {};
  const cols = Math.ceil(profile.width / profile.regionCells);
  const chunk = (k: number) =>
    Math.floor((k % profile.width) / profile.regionCells) +
    cols * Math.floor(Math.floor(k / profile.width) / profile.regionCells);
  const neighbors = (k: number) =>
    [k - 1, k + 1, k - profile.width, k + profile.width].filter(
      (n) =>
        n >= 0 &&
        n < profile.width * profile.height &&
        Math.abs((k % profile.width) - (n % profile.width)) <= 1,
    );
  for (const c of geography) {
    if (!c.passable || regionByCell[c.cell] !== undefined) continue;
    const id = c.cell,
      queue = [id],
      cells: number[] = [];
    regionByCell[id] = id;
    for (let i = 0; i < queue.length; i++) {
      const k = queue[i]!;
      cells.push(k);
      for (const n of neighbors(k))
        if (
          passable.has(n) &&
          chunk(n) === chunk(id) &&
          regionByCell[n] === undefined
        ) {
          regionByCell[n] = id;
          queue.push(n);
        }
    }
    regions[id] = { id, cells: cells.sort((a, b) => a - b), neighbors: [] };
  }
  for (const [k, id] of Object.entries(regionByCell))
    for (const n of neighbors(+k)) {
      const other = regionByCell[n];
      if (
        other !== undefined &&
        other !== id &&
        !regions[id]!.neighbors.includes(other)
      )
        regions[id]!.neighbors.push(other);
    }
  for (const r of Object.values(regions)) r.neighbors.sort((a, b) => a - b);
  const topology = immutable({ regionByCell, regions });
  cache.set(key, topology);
  return topology;
}
