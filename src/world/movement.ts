import { math } from "../kernel/numerics";
import { future, QUANTA, type Time } from "../kernel/time";
import type { Identity, Key } from "../kernel/identity";
import type { PhysicalConfig } from "../content/profile";
import { segments, type CellSegment } from "./routing";
import { cell, type Point, type Terrain } from "./terrain";
export interface MotionInputs {
  ability: number;
  condition: number;
  wound: number;
  fatigue: number;
  nominalCargoCu: number;
  loadCu: number;
}
export interface Leg {
  from: Point;
  to: Point;
  cell: number;
  start: Time;
  end: Time;
  speedKmPerSd: number;
}
export interface Motion {
  key: Key;
  points: Point[];
  segments: CellSegment[];
  segmentCursor: number;
  leg: Leg | null;
  inputs: MotionInputs;
  started: Time;
  paidThrough: Time;
  generation: number;
  status: "moving" | "arrived" | "interrupted";
}
export interface PersonShell extends Identity {
  label: string;
  position: Point;
  travelPaidQuanta: number;
  motion: Motion | null;
}
export function baseSpeed(i: MotionInputs, c: PhysicalConfig): number {
  if (
    !Object.values(i).every(Number.isFinite) ||
    i.ability <= 0 ||
    i.condition <= 0 ||
    i.wound < 0 ||
    i.wound >= 1 ||
    i.fatigue < 0 ||
    i.fatigue > 1 ||
    i.nominalCargoCu <= 0 ||
    i.loadCu < 0
  )
    throw new Error("Invalid diagnostic motion inputs");
  return (
    (c.movement.baseKmPerSd *
      i.ability *
      math.sqrt(i.condition) *
      math.sqrt(1 - i.wound) *
      (1 - c.movement.fatiguePenalty * i.fatigue)) /
    (1 + i.loadCu / i.nominalCargoCu)
  );
}
export function positionAt(actor: PersonShell, at: Time): Point {
  const l = actor.motion?.leg;
  if (!l) return { ...actor.position };
  const f = Math.max(0, Math.min(1, (at - l.start) / (l.end - l.start)));
  return {
    x: l.from.x + (l.to.x - l.from.x) * f,
    y: l.from.y + (l.to.y - l.from.y) * f,
  };
}
export class Movement {
  constructor(
    private terrain: Terrain,
    private config: PhysicalConfig,
  ) {}
  // Authoritative legs split at every raster edge; terrain cost is integrated
  // cell by cell and the same anchors drive display. Each future end rounds up.
  nextLeg(actor: PersonShell, now: Time): Leg | null {
    const m = actor.motion!;
    while (m.segmentCursor < m.segments.length) {
      const s = m.segments[m.segmentCursor]!,
        from = { ...actor.position },
        to = s.to;
      if (from.x === to.x && from.y === to.y) {
        m.segmentCursor++;
        continue;
      }
      if (!this.terrain.passable[s.cell]) {
        m.status = "interrupted";
        m.leg = null;
        return null;
      }
      const length = math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2),
        speed = baseSpeed(m.inputs, this.config) * this.terrain.speed[s.cell]!;
      const end = future(now, length / speed);
      if (end <= now) throw new Error("Zero duration motion");
      return (m.leg = {
        from,
        to,
        cell: s.cell,
        start: now,
        end,
        speedKmPerSd: speed,
      });
    }
    m.leg = null;
    m.status = "arrived";
    return null;
  }
  settle(actor: PersonShell, now: Time): void {
    const m = actor.motion;
    if (!m || m.status !== "moving" || !m.leg) return;
    if (now < m.paidThrough) throw new Error("Movement cursor regression");
    actor.position = positionAt(actor, now);
    actor.travelPaidQuanta += now - m.paidThrough;
    m.paidThrough = now;
  }
  finishLeg(actor: PersonShell, now: Time): void {
    const m = actor.motion!;
    if (!m.leg || m.leg.end !== now) throw new Error("Invalid leg completion");
    this.settle(actor, now);
    actor.position = { ...m.leg.to };
    m.leg = null;
    m.segmentCursor++;
  }
  interrupt(actor: PersonShell, now: Time): void {
    this.settle(actor, now);
    if (actor.motion) {
      actor.motion.leg = null;
      actor.motion.status = "interrupted";
    }
  }
  validPosition(actor: PersonShell, at: Time): boolean {
    return (
      this.terrain.passable[cell(this.terrain, positionAt(actor, at))] === 1
    );
  }
}
