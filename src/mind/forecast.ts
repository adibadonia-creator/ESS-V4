import { injuryProbability, contestProbability } from "../laws/engagement";
import { nutrition } from "../content/goods";
import { METHOD_INDEX, type MethodIndex } from "../content/methods";
import { RECIPES } from "../content/recipes";
import { OPERATION_INDEX } from "../content/exploration";
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
import { explorationWeight } from "./exploration";
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
  catalogue: MethodIndex = METHOD_INDEX,
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
    if (catalogue.recipes.get(step.law) || step.workObject) {
      a.load = 0.45;
      a.effort = 0.6;
    }
    const compatible = OPERATION_INDEX.get(step.law);
    if (compatible) {
      a.load = compatible.load;
      a.effort = compatible.effort;
    }
    if (step.experiment) {
      a.pleasant = explorationWeight(review, step.experiment);
    }
    a.compulsory = step.compulsory ?? false;
    if (a.compulsory) a.pleasant = 0;
  }
  if ((step.family === "Attend" || step.family === "Move") && step.experiment)
    a.pleasant = explorationWeight(review, step.experiment);
  if (step.family === "Engage") {
    a.load = 0.7;
    a.effort = 1;
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
  catalogue: MethodIndex = METHOD_INDEX,
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
    activities.push(
      activity(review, step, cursor, cursor + duration, catalogue),
    );
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
  const backing = new Map(lots.map((l) => [l.subject + ":food", l.quantity]));
  for (const a of activities)
    if (
      a.step.family === "Transfer" &&
      a.step.use === "consume" &&
      a.step.good !== "food"
    ) {
      const good = a.step.good;
      for (const lot of ownedLots(review, good))
        backing.set(lot.subject + ":" + good, lot.quantity);
    }
  // A bounded continuation service schedule after the near authorised prefix.
  // It uses personally known local producer/rate/stock evidence. These future
  // deliveries cannot fund the selected prefix or the arbiter's return reserve.
  const futureFood = (
    horizon > 3 && meter.spend("information")
      ? review.methods("service:nourishment", 2).entries
      : []
  )
    .flatMap((e) => {
      const m = catalogue.get(e.subject.slice(7));
      return (
        m?.schema?.prerequisites.flatMap(
          (p) => review.methods(p.effect, 1).entries,
        ) ?? []
      );
    })
    .map((e) => EXTRACTION_INDEX.method(e.subject.slice(7)))
    .filter((l) => l && nutrition(l.good) > 0 && !l.requiredItemScope)
    .map((l) => {
      const site = review.places(
        `class:resource-kind:${JSON.stringify(l!.siteKind)}`,
        1,
      ).entries[0];
      const point = site
        ? (review.belief(site.subject, "location")?.value as
            { x: number; y: number } | undefined)
        : undefined;
      return {
        law: l!,
        site: site?.subject ?? "",
        quantity: site
          ? Number(review.belief(site.subject, `stock:${l!.good}`)?.value ?? 0)
          : 0,
        rate: review.rateEstimate(l!.id, l!.siteKind)?.rate ?? 0,
        local:
          point &&
          (point.x - review.self.location.x) ** 2 +
            (point.y - review.self.location.y) ** 2 <=
            0.08 ** 2,
      };
    })
    .find((x) => x.local && x.quantity > 0 && x.rate > b.quiet);
  let heldActivity: Activity | undefined,
    heldRate = 0;
  let c = b.condition,
    d = b.fatigue,
    f = b.enjoyment,
    food = [...backing.values()].reduce((sum, x) => sum + x, 0);
  let effort = b.effortSd,
    rest = b.restSd,
    pleasant = b.pleasantSd,
    compulsory = b.compulsorySd;
  let intervalStart = b.intervalStart / QUANTA - review.time / QUANTA;
  const offset = parseInt(review.owner.slice(-5), 16) / QUANTA;
  let closure =
    Math.floor(review.time / QUANTA) + offset - review.time / QUANTA;
  if (closure <= 0) closure++;
  const threatRecord = review.places("threat", 1).entries[0];
  const threat = threatRecord?.value as unknown as
    | { force: number; point: { x: number; y: number }; active: boolean }
    | undefined;
  const dangerous =
    threat?.active === true &&
    review.time - threatRecord!.observedAt <= QUANTA / 4;
  let projectedPosition = { ...review.self.location },
    defended = false;
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
      const futureSource =
        !a &&
        horizon > 3 &&
        t >= Math.max(option.reference ? 3 : cursor, cursor) &&
        review.bestMethod("service:nourishment")
          ? ([...backing.entries()].find(
              ([key, q]) =>
                q > 1e-12 && nutrition(key.slice(key.lastIndexOf(":") + 1)) > 0,
            )?.[0] ?? null)
          : null;
      const source =
        a?.step.family === "Transfer" && a.step.use === "consume"
          ? a.step.from + ":" + a.step.good
          : a?.step.maintenance
            ? a.step.maintenance.from + ":" + a.step.maintenance.good
            : futureSource;
      const consumeRate = futureSource
        ? b.quiet
        : (a?.step.maintenance?.rate ?? a?.rate ?? 0);
      const available = source ? (backing.get(source) ?? 0) : 0;
      const depletion =
        source && available > 1e-12 && consumeRate > 0
          ? t + available / consumeRate
          : Infinity;
      const z = Math.min(
          end,
          a?.end ?? nextStart,
          closure,
          depletion,
          !a &&
            horizon > 3 &&
            t < Math.max(option.reference ? 3 : cursor, cursor)
            ? Math.max(option.reference ? 3 : cursor, cursor)
            : Infinity,
        ),
        dt = z - t;
      if (!(dt > 0)) throw Error("Forecast fragment did not advance");
      let intake = 0,
        continuationLoad = 0,
        continuationEffort = 0;
      if (source) {
        intake = Math.min(consumeRate, available / dt);
        const used = intake * dt;
        food -= used;
        loss += used;
        backing.set(source, Math.max(0, available - used));
      }
      if (
        a?.step.family === "Transfer" &&
        a.step.use !== "consume" &&
        z >= a.end - 1e-12 &&
        nutrition(a.step.good) > 0
      ) {
        const from = a.step.from + ":" + a.step.good,
          to = a.step.to + ":" + a.step.good,
          moved = Math.min(a.step.quantity, backing.get(from) ?? 0);
        backing.set(from, (backing.get(from) ?? 0) - moved);
        backing.set(to, (backing.get(to) ?? 0) + moved);
      }
      if (
        !a &&
        horizon > 3 &&
        t >= Math.max(option.reference ? 3 : cursor, cursor) &&
        !source &&
        futureFood &&
        futureFood.quantity > 0
      ) {
        const produced = Math.min(futureFood.quantity, b.quiet * dt);
        futureFood.quantity -= produced;
        intake = produced / dt;
        const duty = intake / futureFood.rate;
        continuationLoad = futureFood.law.load * duty;
        continuationEffort = futureFood.law.effort * duty;
        service += produced;
        loss += produced;
      }
      if (a?.step.family === "Work") {
        const law = EXTRACTION_INDEX.method(a.step.law),
          site = a.step.site ?? "";
        const quantity = Math.min(stock.get(site) ?? 0, heldRate * dt);
        stock.set(site, Math.max(0, (stock.get(site) ?? 0) - quantity));
        if (law && nutrition(law.good) > 0) {
          food += quantity;
          service += quantity;
          backing.set(
            review.self.carried.subject + ":" + law.good,
            (backing.get(review.self.carried.subject + ":" + law.good) ?? 0) +
              quantity,
          );
        }
      }
      if (a?.step.family === "Work" && z >= a.end - 1e-12) {
        const recipe = catalogue.recipes.get(a.step.law);
        if (recipe && nutrition(recipe.output) > 0) {
          const q = nutrition(recipe.output);
          food += q;
          service += q;
          const key = review.self.carried.subject + ":" + recipe.output;
          backing.set(key, (backing.get(key) ?? 0) + 1);
        }
      }
      if (dangerous && !defended) {
        if (a?.step.family === "Engage") {
          if (z >= a.end - 1e-12) {
            const force = Number(
                review.belief("self", "force-estimate")?.value ?? 1,
              ),
              fraction = threat!.force / (force + threat!.force),
              win = contestProbability(force, threat!.force);
            const injury =
              win * injuryProbability(fraction, false, 0, a.end - a.start) +
              (1 - win) * injuryProbability(fraction, true, 0, a.end - a.start);
            hazard += -math.log(Math.max(1e-12, 1 - injury));
            defended = true;
          }
        } else {
          const distance = math.sqrt(
            (projectedPosition.x - threat!.point.x) ** 2 +
              (projectedPosition.y - threat!.point.y) ** 2,
          );
          hazard += 0.15 * Math.max(0, 1 - distance / 0.8) * dt;
        }
      }
      if (a?.step.family === "Move" && z >= a.end - 1e-12)
        projectedPosition = { ...a.step.target };
      const segment = conditionSegment(
        c,
        intake,
        b.quiet +
          b.classFactor * ((a?.load ?? continuationLoad) + 0.3 * b.wounds),
        dt,
      );
      const h = starvationHazard(c, segment.target, segment.tau, dt);
      hazard += h;
      c = segment.c;
      deficit += (1 - f) ** 2 * dt;
      effort += (a?.effort ?? continuationEffort) * dt;
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
      materialService:
        service / (end - start) +
        (option.capital ?? []).reduce(
          (q, flow) =>
            q +
            (flow.materialService *
              Math.max(
                0,
                Math.min(end, flow.end) - Math.max(start, flow.start),
              )) /
              (end - start),
          0,
        ),
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
        if (law && nutrition(law.good) > 0)
          tail +=
            Math.min(stock.get(a.step.site ?? "") ?? 0, a.rate * remaining) /
            b.quiet;
      }
    }
  if (option.completion) {
    const q = option.completion,
      tau = 24;
    // Finite service is discounted from its actual estimated date, excluding
    // any same nutritional production already booked in the explicit prefix.
    const booked = activities.reduce((v, a) => {
      if (a.step.family !== "Work") return v;
      const law = EXTRACTION_INDEX.method(a.step.law);
      if (law && law.good === q.good)
        return (
          v +
          a.rate *
            Math.max(0, Math.min(horizon, a.end) - a.start) *
            nutrition(law.good)
        );
      const recipe = catalogue.recipes.get(a.step.law);
      return (
        v +
        (recipe && recipe.output === q.good && a.end <= horizon
          ? nutrition(recipe.output)
          : 0)
      );
    }, 0);
    tail +=
      (math.exp(-(Math.max(horizon, q.at) - horizon) / tau) *
        (Math.max(0, q.materialQuantity - booked) - q.remainingCost)) /
      b.quiet;
  }
  return {
    horizon,
    blocks,
    oneOff: -(option.informationValue ?? 0),
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
