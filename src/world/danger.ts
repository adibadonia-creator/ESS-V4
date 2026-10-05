import { draw } from "../kernel/random";
import { math } from "../kernel/numerics";
import { QUANTA } from "../kernel/time";
import { compareKey } from "../kernel/canonical";
import { contestProbability, injuryProbability } from "../laws/engagement";
import type { Point } from "../evidence/types";
export interface Predator {
  key: string;
  point: Point;
  home: Point;
  direction: Point;
  at: number;
  retreatUntil: number;
  engagements: number;
  pursuit?: string | null;
  hazards: Record<
    string,
    { at: number; spent: number; budget: number; episodes: number }
  >;
}
export interface DangerState {
  predator: Predator | null;
}
export interface DangerPort {
  now(): number;
  nearby(point: Point, radius: number): string[];
  position(actor: string): Point;
  passable(point: Point): boolean;
  alive(actor: string): boolean;
  force(actor: string): number;
  wounds(actor: string): number;
  harm(actor: string, wound: number, fatal: boolean): void;
  fact(actor: string, subject: string, property: string, value: unknown): void;
}
// One local animal law. It queries only physical neighbors, never human beliefs or plans.
export class DangerLaw {
  constructor(
    private seed: string,
    private port: DangerPort,
    readonly state: DangerState = { predator: null },
  ) {
    const p = state.predator;
    if (
      p &&
      (![p.point.x, p.point.y, p.at, p.retreatUntil, p.engagements].every(
        Number.isFinite,
      ) ||
        p.at > port.now())
    )
      throw Error("Invalid predator state");
  }
  found(key: string, point: Point) {
    if (this.state.predator) throw Error("Only one founding predator");
    this.state.predator = {
      key,
      point: { ...point },
      home: { ...point },
      direction: { x: 1, y: 0 },
      at: this.port.now(),
      retreatUntil: 0,
      engagements: 0,
      pursuit: null,
      hazards: {},
    };
  }
  tick() {
    const p = this.state.predator;
    if (!p) return;
    const now = this.port.now(),
      dt = (now - p.at) / QUANTA;
    const nearby = this.port
      .nearby(p.point, 0.8)
      .filter((a) => this.port.alive(a))
      .sort((a, b) => {
        const x = this.port.position(a),
          y = this.port.position(b);
        return (
          (x.x - p.point.x) ** 2 +
            (x.y - p.point.y) ** 2 -
            ((y.x - p.point.x) ** 2 + (y.y - p.point.y) ** 2) ||
          compareKey(a, b)
        );
      });
    if (!nearby.length || p.retreatUntil > now) p.pursuit = null;
    for (const actor of p.retreatUntil > now ? [] : nearby.slice(0, 1)) {
      const point = this.port.position(actor),
        distance = math.sqrt(
          (point.x - p.point.x) ** 2 + (point.y - p.point.y) ** 2,
        );
      const h = (p.hazards[actor] ??= {
        at: p.at,
        spent: 0,
        budget: -math.log(
          Math.max(
            1e-12,
            draw(this.seed, "predator-hazard", [p.key, actor, "0"]),
          ),
        ),
        episodes: 0,
      });
      if (p.pursuit !== actor) {
        p.pursuit = actor;
        h.episodes++;
        h.spent = 0;
        h.budget = -math.log(
          Math.max(
            1e-12,
            draw(this.seed, "predator-hazard", [
              p.key,
              actor,
              String(h.episodes),
              "pursuit",
            ]),
          ),
        );
      }
      if (p.retreatUntil <= now)
        h.spent += 0.15 * Math.max(0, 1 - distance / 0.8) * dt;
      h.at = now;
      if (h.spent >= h.budget) {
        const ordinal = ++h.episodes;
        h.spent -= h.budget;
        h.budget = -math.log(
          Math.max(
            1e-12,
            draw(this.seed, "predator-hazard", [p.key, actor, String(ordinal)]),
          ),
        );
        const wound =
          0.2 +
          0.4 *
            draw(this.seed, "predator-wound", [p.key, actor, String(ordinal)]);
        this.port.harm(
          actor,
          wound,
          draw(this.seed, "predator-fatality", [
            p.key,
            actor,
            String(ordinal),
          ]) < Math.min(1, 0.05 + 0.3 * this.port.wounds(actor)),
        );
        this.port.fact(actor, p.key, "danger-contact", { wound, at: now });
      }
    }
    let direction = p.direction;
    if (p.retreatUntil > now) {
      direction = { x: p.point.x - p.home.x, y: p.point.y - p.home.y };
    } else if (nearby.length) {
      const target = this.port.position(nearby[0]!);
      direction = { x: target.x - p.point.x, y: target.y - p.point.y };
    }
    const norm = math.sqrt(direction.x ** 2 + direction.y ** 2) || 1,
      speed = p.retreatUntil > now ? 8 : 4;
    const next = {
      x: p.point.x + (direction.x / norm) * Math.min(speed * dt, norm),
      y: p.point.y + (direction.y / norm) * Math.min(speed * dt, norm),
    };
    if (this.port.passable(next)) {
      p.point = next;
      p.direction = { x: direction.x / norm, y: direction.y / norm };
    } else p.direction = { x: -p.direction.y, y: p.direction.x };
    p.at = now;
  }
  engage(actor: string, target: string, duration: number) {
    const p = this.state.predator;
    if (!p || p.key !== target || !this.port.alive(actor)) return null;
    const point = this.port.position(actor);
    if ((point.x - p.point.x) ** 2 + (point.y - p.point.y) ** 2 > 0.08 ** 2)
      return null;
    const key = [p.key, actor, String(p.engagements++)],
      a = this.port.force(actor),
      b = 1.6;
    const won =
      draw(this.seed, "engagement-outcome", key) < contestProbability(a, b);
    const probability = injuryProbability(b / (a + b), !won, 0, duration);
    const injured = draw(this.seed, "engagement-injury", key) < probability;
    if (injured)
      this.port.harm(
        actor,
        0.2 + 0.4 * draw(this.seed, "engagement-wound", key),
        draw(this.seed, "engagement-fatality", key) <
          Math.min(1, 0.05 + 0.3 * this.port.wounds(actor)),
      );
    p.retreatUntil = this.port.now() + Math.ceil(3 * QUANTA);
    this.port.fact(actor, p.key, "threat", {
      force: 1.6,
      point: p.point,
      active: false,
      at: this.port.now(),
    });
    return { won, injured };
  }
}
