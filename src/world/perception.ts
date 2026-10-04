import { math } from "../kernel/numerics";
import type { Point, Terrain } from "./terrain";
import { cell, center } from "./terrain";
import type { SeenCell } from "../evidence/types";
export function detection(distance: number, sight: number): number {
  return Math.max(0.2, Math.min(0.95, 0.95 - 0.75 * (distance / sight) ** 2));
}
export function visible(
  t: Terrain,
  from: Point,
  to: Point,
  sight: number,
): boolean {
  const dx = to.x - from.x,
    dy = to.y - from.y;
  if (dx * dx + dy * dy > sight * sight + 1e-14) return false;
  const a = cell(t, from),
    b = cell(t, to);
  if (a < 0 || b < 0) return false;
  const w = t.profile.width,
    x0 = a % w,
    y0 = Math.floor(a / w),
    x1 = b % w,
    y1 = Math.floor(b / w);
  let x = x0,
    y = y0;
  const xx = Math.abs(x1 - x),
    yy = Math.abs(y1 - y),
    sx = x < x1 ? 1 : -1,
    sy = y < y1 ? 1 : -1;
  let err = xx - yy;
  while (x !== x1 || y !== y1) {
    const e = err * 2;
    if (e > -yy) {
      err -= yy;
      x += sx;
    }
    if (e < xx) {
      err += xx;
      y += sy;
    }
    const k = x + w * y;
    if (k !== b && t.opaque[k]) return false;
  }
  return true;
}
export function visibleTerrain(
  t: Terrain,
  p: Point,
  sight: number,
): SeenCell[] {
  const s = t.profile,
    out: SeenCell[] = [];
  for (
    let y = Math.max(0, Math.floor((p.y - sight) / s.cellKm));
    y <= Math.min(s.height - 1, Math.floor((p.y + sight) / s.cellKm));
    y++
  )
    for (
      let x = Math.max(0, Math.floor((p.x - sight) / s.cellKm));
      x <= Math.min(s.width - 1, Math.floor((p.x + sight) / s.cellKm));
      x++
    ) {
      const k = x + s.width * y,
        q = center(t, k);
      if (!visible(t, p, q, sight)) continue;
      const r = math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2);
      out.push({
        cell: k,
        terrain: t.kind[k]!,
        passable: !!t.passable[k],
        speed: t.speed[k]!,
        detection: detection(r, sight),
      });
    }
  return out;
}
// Exact intersection of a continuous leg with a sight circle. No renderer sampling.
export function entryFraction(
  from: Point,
  to: Point,
  p: Point,
  radius: number,
): number | null {
  const x = from.x - p.x,
    y = from.y - p.y,
    vx = to.x - from.x,
    vy = to.y - from.y,
    A = vx * vx + vy * vy,
    B = 2 * (x * vx + y * vy),
    C = x * x + y * y - radius * radius,
    D = B * B - 4 * A * C;
  if (C <= 0 || !A || D < 0) return null;
  const u = (-B - math.sqrt(D)) / (2 * A);
  return u > 0 && u <= 1 ? u : null;
}
