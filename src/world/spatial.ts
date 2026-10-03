import type { Key } from "../kernel/identity";
import type { Counters } from "../kernel/counters";
import type { Point } from "./terrain";
export class SpatialIndex {
  private buckets = new Map<string, Set<Key>>();
  private entries = new Map<Key, { point: Point; bucket: string }>();
  constructor(
    private size: number,
    private counters: Counters,
  ) {}
  private tag(p: Point): string {
    return `${Math.floor(p.x / this.size)},${Math.floor(p.y / this.size)}`;
  }
  put(key: Key, p: Point): void {
    const tag = this.tag(p),
      old = this.entries.get(key);
    if (old) this.buckets.get(old.bucket)!.delete(key);
    const b = this.buckets.get(tag) ?? new Set<Key>();
    b.add(key);
    this.buckets.set(tag, b);
    this.entries.set(key, { point: { ...p }, bucket: tag });
  }
  remove(key: Key): void {
    const old = this.entries.get(key);
    if (old) this.buckets.get(old.bucket)!.delete(key);
    this.entries.delete(key);
  }
  query(p: Point, radius: number): Key[] {
    this.counters.spatialQueries++;
    const out: Key[] = [];
    for (
      let y = Math.floor((p.y - radius) / this.size);
      y <= Math.floor((p.y + radius) / this.size);
      y++
    )
      for (
        let x = Math.floor((p.x - radius) / this.size);
        x <= Math.floor((p.x + radius) / this.size);
        x++
      )
        for (const key of this.buckets.get(`${x},${y}`) ?? []) {
          const q = this.entries.get(key)!.point,
            dx = q.x - p.x,
            dy = q.y - p.y;
          if (dx * dx + dy * dy <= radius * radius) out.push(key);
        }
    return out.sort();
  }
}
