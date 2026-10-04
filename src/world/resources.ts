import { math } from "../kernel/numerics";
import { QUANTA } from "../kernel/time";
export interface ResourceSite {
  key: string;
  kind: string;
  point: { x: number; y: number };
  anchor: { at: number; stock: number; demand: number };
  capacity: number;
  renewal: number;
}
export function stockAt(s: ResourceSite, at: number) {
  const a = s.anchor,
    dt = (at - a.at) / QUANTA;
  if (dt < 0) throw Error("Resource anchor regression");
  if (!s.renewal) return Math.max(0, a.stock - a.demand * dt);
  const equilibrium = s.capacity - a.demand * s.renewal;
  return Math.max(
    0,
    equilibrium + (a.stock - equilibrium) * math.exp(-dt / s.renewal),
  );
}
export function depletionSd(s: ResourceSite) {
  const a = s.anchor;
  if (a.stock <= 0) return 0;
  if (!s.renewal) return a.demand > 0 ? a.stock / a.demand : Infinity;
  const equilibrium = s.capacity - a.demand * s.renewal;
  return equilibrium < 0
    ? s.renewal * math.log((a.stock - equilibrium) / -equilibrium)
    : Infinity;
}
