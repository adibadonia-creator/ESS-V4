import data from "./physical.json";
import extraction from "./extraction.json";
import materialEffects from "./material-effects.json";
import { digest } from "../kernel/canonical";
export interface SpatialProfile {
  width: number;
  height: number;
  cellKm: number;
  regionCells: number;
  bucketKm: number;
}
export type PhysicalConfig = typeof data;
export function resolveConfig(
  spatial: Partial<SpatialProfile> = {},
  diagnostic: Partial<PhysicalConfig["diagnostic"]> = {},
): PhysicalConfig {
  const c = JSON.parse(JSON.stringify(data)) as PhysicalConfig;
  Object.assign(c.spatial, spatial);
  Object.assign(c.diagnostic, diagnostic);
  const s = c.spatial;
  if (
    ![s.width, s.height, s.regionCells].every(
      (x) => Number.isSafeInteger(x) && x >= 2,
    ) ||
    s.width * s.height > 4_000_000 ||
    !Number.isFinite(s.cellKm) ||
    s.cellKm <= 0 ||
    !Number.isFinite(s.bucketKm) ||
    s.bucketKm <= 0
  )
    throw new Error("Invalid spatial profile");
  if (
    !Number.isSafeInteger(c.diagnostic.actors) ||
    c.diagnostic.actors < 1 ||
    c.diagnostic.actors > 10000 ||
    !Number.isSafeInteger(c.diagnostic.sites) ||
    c.diagnostic.sites < 1 ||
    !Number.isSafeInteger(c.diagnostic.routeExpansionsPerResume) ||
    c.diagnostic.routeExpansionsPerResume < 1
  )
    throw new Error("Invalid diagnostic profile");
  return deepFreeze(c);
}
function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object") {
    for (const v of Object.values(o)) deepFreeze(v);
    Object.freeze(o);
  }
  return o;
}
export const CONTENT_HASH = digest({ physical: data, extraction, materialEffects });

export const EVIDENCE_PROFILE = Object.freeze(data.evidence);

export const PUBLIC_MAP_PROFILE = Object.freeze(data.spatial);

// Causal P/N baseline values from Revision 4.0 §47, not host bounds.
export const EFFORT_PROFILE = Object.freeze(data.cognitiveEffort);
