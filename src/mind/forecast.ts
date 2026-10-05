import { math } from "../kernel/numerics";
import { QUANTA } from "../kernel/time";
import type { PersonalReview } from "../evidence/read";
import { EXTRACTION_INDEX } from "../content/extraction";
import {
  conditionSegment,
  starvationHazard,
  fatigueClosure,
  enjoymentClosure,
} from "../laws/physiology";
import type { Operation } from "../runtime/types";
import { bodySignals, ownedLots } from "./signals";
import { ReviewEffort } from "./effort";
import type { BoundOption, Consequences, ConsequenceBlock } from "./types";
export const HORIZONS = [3, 12, 60] as const;
interface Activity {
  start: number;
  end: number;
  step: Operation;
  rate: number;
  load: number;
  effort: number;
  rest: boolean;
  pleasant: number;
  compulsory: boolean;
}
// Typed public law adapter: no utility, no selection, no writable world.
function activity(
  review: PersonalReview,
  step: Operation,
  start: number,
  end: number,
): Activity {
  const b = bodySignals(review);
  const a: Activity = {
    start,
    end,
    step,
    rate: 0,
    load: 0,
    effort: 0,
    rest: false,
    pleasant: 0,
    compulsory: false,
  };
  if (step.family === "Move") {
    a.load = 0.35;
    a.effort = 0.7;
  }
  if (step.family === "Transfer") {
    a.load = 0.1;
    a.effort = 0.1;
    if (step.use === "consume") a.rate = step.quantity / (end - start);
  }
  if (step.family === "Work") {
    const law = EXTRACTION_INDEX.method(step.law);
    if (law) {
      a.load = law.load;
      a.effort = law.effort;
      a.rate = review.rateEstimate(step.law, law.siteKind)?.rate ?? 0;
    }
    a.compulsory = step.compulsory ?? false;
  }
  if (step.family === "Recover") {
    a.rest = (step.mode ?? step.law) === "rest";
    if ((step.mode ?? step.law) === "leisure") {
      const p = review.self.location,
        key = `leisure:${Math.floor(p.x / 3)}:${Math.floor(p.y / 3)}:Recover`;
      const exposure = b.familiarity[key],
        n = exposure
          ? exposure.count *
            math.exp(-(review.time - exposure.at) / QUANTA / 36)
          : 0;
      a.pleasant = (1 + (0.2 * 3) / (n + 3)) / (1 + 0.5 * b.satiation);
    }
  }
  return a;
}
export function forecast(
  review: PersonalReview,
  option: BoundOption,
  meter: ReviewEffort,
  horizon = 3,
  lots = ownedLots(review, "food"),
): Consequences | null {
  const b = bodySignals(review),
    activities: Activity[] = [];
  let cursor = 0;
  for (const [i, step] of option.steps.entries()) {
    const duration =
      step.family === "Move"
        ? (option.routes[i]?.nodes[option.routes[i]!.goal]?.g ?? 0) /
          (80 *
            math.sqrt(Math.max(0.05, b.condition)) *
            math.sqrt(1 - b.wounds) *
            (1 - 0.2 * b.fatigue))
        : step.duration / QUANTA;
    activities.push(activity(review, step, cursor, cursor + duration));
    cursor += duration;
  }
  // Six base blocks plus at most four explicit operation boundaries. The public
  // adapters integrate bounded activity fragments and canonical closures inside
  // these blocks. This is an analytic plan estimate, not a future-world rollout.
  const bounds = new Set(
    Array.from({ length: 7 }, (_, i) => (horizon * i) / 6),
  );
  for (const a of activities
    .filter((a) => a.end > 0 && a.end < horizon)
    .slice(0, 4))
    bounds.add(a.end);
  const grid = [...bounds].sort((a, z) => a - z);
  const blocks: ConsequenceBlock[] = [];
  const backing = new Map(lots.map((l) => [l.subject, l.quantity]));
  let heldActivity: Activity | undefined,
    heldRate = 0;
  let c = b.condition,
    d = b.fatigue,
    f = b.enjoyment,
    food = lots.reduce((sum, x) => sum + x.quantity, 0);
  let effort = b.effortSd,
    rest = b.restSd,
    pleasant = b.pleasantSd,
    compulsory = b.compulsorySd;
  let intervalStart = b.intervalStart / QUANTA - review.time / QUANTA;
  const offset = parseInt(review.owner.slice(-5), 16) / QUANTA;
  let closure =
    Math.floor(review.time / QUANTA) + offset - review.time / QUANTA;
  if (closure <= 0) closure++;
  let severeHazard = 0;
  const stock = new Map<string, number>();
  for (const a of activities)
    if (a.step.family === "Work" && a.step.site && !stock.has(a.step.site)) {
      const law = EXTRACTION_INDEX.method(a.step.law);
      const e = law ? review.belief(a.step.site, `stock:${law.good}`) : null;
      stock.set(a.step.site, typeof e?.value === "number" ? e.value : 0);
    }
  for (let i = 1; i < grid.length; i++) {
    if (!meter.spend("forecast")) return null;
    meter.counts.forecastBlocks++;
    const start = grid[i - 1]!,
      end = grid[i]!;
    let t = start,
      service = 0,
      loss = 0,
      hazard = 0,
      deficit = 0;
    while (t < end - 1e-12) {
      const a = activities.find(
        (a) => a.start <= t + 1e-12 && a.end > t + 1e-12,
      );
      const nextStart =
        activities.find((a) => a.start > t + 1e-12)?.start ?? end;
      if (a !== heldActivity) {
        heldActivity = a;
        const law =
          a?.step.family === "Work"
            ? EXTRACTION_INDEX.method(a.step.law)
            : null;
        heldRate = law
          ? (a!.rate *
              math.pow(
                Math.max(0, c) / Math.max(0.05, b.condition),
                law.conditionExponent,
              ) *
              (1 - law.fatiguePenalty * d)) /
            (1 - law.fatiguePenalty * b.fatigue)
          : 0;
      }
      const source =
        a?.step.family === "Transfer" && a.step.use === "consume"
          ? a.step.from
          : null;
      const available = source ? (backing.get(source) ?? 0) : 0;
      const depletion =
        source && available > 1e-12 && a!.rate > 0
          ? t + available / a!.rate
          : Infinity;
      const z = Math.min(end, a?.end ?? nextStart, closure, depletion),
        dt = z - t;
      if (!(dt > 0)) throw Error("Forecast fragment did not advance");
      let intake = 0;
      if (a?.step.family === "Transfer" && a.step.use === "consume") {
        intake = Math.min(a.rate, available / dt);
        const used = intake * dt;
        food -= used;
        loss += used;
        backing.set(a.step.from, Math.max(0, available - used));
      }
      if (a?.step.family === "Work") {
        const law = EXTRACTION_INDEX.method(a.step.law),
          site = a.step.site ?? "";
        const quantity = Math.min(stock.get(site) ?? 0, heldRate * dt);
        stock.set(site, Math.max(0, (stock.get(site) ?? 0) - quantity));
        if (law?.good === "food") {
          food += quantity;
          service += quantity;
          backing.set(
            review.self.carried.subject,
            (backing.get(review.self.carried.subject) ?? 0) + quantity,
          );
        }
      }
      const segment = conditionSegment(
        c,
        intake,
        b.quiet + b.classFactor * ((a?.load ?? 0) + 0.3 * b.wounds),
        dt,
      );
      const h = starvationHazard(c, segment.target, segment.tau, dt);
      hazard += h;
      c = segment.c;
      deficit += (1 - f) ** 2 * dt;
      effort += (a?.effort ?? 0) * dt;
      rest += a?.rest ? dt : 0;
      pleasant += (a?.pleasant ?? 0) * dt;
      compulsory += a?.compulsory ? dt : 0;
      t = z;
      if (Math.abs(t - closure) < 1e-10) {
        const elapsed = closure - intervalStart;
        d = fatigueClosure(d, elapsed, effort, rest);
        f = enjoymentClosure(f, elapsed, pleasant, compulsory);
        effort = rest = pleasant = compulsory = 0;
        intervalStart = closure;
        closure++;
        heldActivity = undefined;
      }
    }
    severeHazard += hazard;
    blocks.push({
      start,
      end,
      materialService: service / (end - start),
      materialLoss: loss / (end - start),
      dependantCoverage: 0,
      enjoymentDeficit: deficit / (end - start),
      processValue: 0,
      relationshipExperience: 0,
      encounterValue: 0,
      severeHazard: hazard,
      condition: c,
      fatigue: d,
      enjoyment: f,
      foodRemaining: food,
    });
  }
  meter.counts.forecastOptions++;
  // Finite completion obligations beyond the routine horizon are not liquidated
  // into a bonus. Carry their remaining net material flow as a discounted tail.
  let tail = 0;
  for (const a of activities)
    if (a.end > horizon) {
      const remaining = a.end - Math.max(horizon, a.start);
      if (a.step.family === "Transfer" && a.step.use === "consume")
        tail -= (a.rate * remaining) / b.quiet;
      if (a.step.family === "Work") {
        const law = EXTRACTION_INDEX.method(a.step.law);
        if (law?.good === "food")
          tail +=
            Math.min(stock.get(a.step.site ?? "") ?? 0, a.rate * remaining) /
            b.quiet;
      }
    }
  return {
    horizon,
    blocks,
    oneOff: 0,
    severeHazard,
    severeProbability: -math.expm1((-severeHazard * 3) / horizon),
    commitments: [],
    assent: [],
    tail: {
      value: tail,
      error: 0,
      reason:
        cursor > horizon
          ? "finite remaining authorised material flows"
          : "no remaining finite service after completion; no terminal liquidation",
    },
  };
}
