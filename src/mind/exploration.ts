import { canonical, digest } from "../kernel/canonical";
import { math } from "../kernel/numerics";
import { QUANTA, time } from "../kernel/time";
import { chargeRoute, routeAllowance } from "../kernel/effort";
import { EXPLORATION as P, OPERATION_INDEX } from "../content/exploration";
import { EXTRACTION_INDEX } from "../content/extraction";
import type { PersonalReview } from "../evidence/read";
import type { Point, ExplorationOutcome } from "../evidence/types";
import { beginPersonalSearch, resumePersonalSearch } from "../runtime/routing";
import { pleasantWeight, decayed } from "../laws/enjoyment";
import { bodySignals } from "./signals";
import { optionKey } from "./binder";
import type { BoundOption, MindState, Objective } from "./types";
import type { ReviewEffort } from "./effort";

export function explorationWeight(
  review: PersonalReview,
  experiment: ExplorationOutcome,
) {
  const b = bodySignals(review),
    exposure = b.familiarity[experiment.descriptor];
  const count = exposure
    ? decayed(
        exposure.count,
        exposure.at,
        review.time,
        P.familiarityDecaySd * QUANTA,
      )
    : 0;
  const e = review.belief(
    "exploration",
    `${experiment.form}:${experiment.operation}:${experiment.targetKind}`,
  )?.value as Record<string, number> | undefined;
  const failures = e
    ? decayed(e.failures!, e.at!, review.time, P.frustrationDecaySd * QUANTA)
    : 0;
  return pleasantWeight(
    P.familyWeight,
    P.unfamiliaritySensitivity,
    count,
    b.familySatiation.exploration ?? 0,
    failures,
  );
}
function base(objective: Objective, method: string): BoundOption {
  return {
    key: "",
    objective,
    method,
    steps: [],
    dependencies: [],
    bindings: {},
    status: "executable",
    reason: "bounded personal opportunity",
    prerequisites: [],
    routes: {},
    duration: 0,
    goods: {},
    reference: false,
  };
}
function route(
  review: PersonalReview,
  state: MindState,
  meter: ReviewEffort,
  o: BoundOption,
  point: Point,
  from: Point = review.self.location,
) {
  const p = review.profile,
    cell = (x: Point) =>
      Math.floor(x.x / p.cellKm) + p.width * Math.floor(x.y / p.cellKm);
  const held = state.deferred
    .flatMap((x) => Object.values(x.routes))
    .find(
      (r) =>
        r.exploratory &&
        r.start === cell(from) &&
        r.goal === cell(point) &&
        r.geographyId === review.geographyId &&
        r.status === "unresolved",
    );
  const search = held
    ? (JSON.parse(JSON.stringify(held)) as typeof held)
    : beginPersonalSearch(
        p,
        [],
        cell(from),
        cell(point),
        true,
        review.traversalPrior(),
        meter.counts,
        [],
        review.geography(),
      );
  search.effortAccount = meter.account.key;
  const before = search.expansions,
    spent = meter.account.spent;
  const status = resumePersonalSearch(
    search,
    routeAllowance(meter.account),
    meter.counts,
    routeAllowance(meter.account),
    review.geography(),
  );
  chargeRoute(meter.account, search.expansions - before);
  const cost = meter.account.spent - spent;
  meter.counts.routeEu += cost;
  meter.counts.reviewEuTotal += cost;
  o.routes[o.steps.length] = search;
  if (status !== "found") {
    o.status =
      status === "deferred" || status === "unresolved"
        ? "computationally-deferred"
        : "impossible-under-personal-assumptions";
    o.reason =
      o.status === "computationally-deferred"
        ? "exploratory personal route frontier retained"
        : "personal traversal assumptions do not admit route";
    return false;
  }
  o.steps.push({ family: "Move", target: { ...point }, exploratory: true });
  const b = bodySignals(review);
  o.duration += time(
    search.nodes[search.goal]!.g /
      (80 *
        math.sqrt(Math.max(0.05, b.condition)) *
        math.sqrt(1 - b.wounds) *
        (1 - 0.2 * b.fatigue)),
  );
  return true;
}
// Dynamic EVSI: three declared observation classes, two personally expressible
// later decisions (retain livelihood / adopt observed production). It grants no
// forecast output and no target, reservation or backing from an unseen site.
export function inquiryValue(
  review: PersonalReview,
  meter: ReviewEffort,
  terrain: number,
  effectiveArea: number,
  travelSd: number,
) {
  const posterior = review.belief("occupancy", `food-patch:${terrain}`)
    ?.value as Record<string, number> | undefined;
  const alpha = posterior?.alpha ?? P.foodDensityKm2,
    beta = posterior?.beta ?? P.occupancyStrengthKm2;
  const present = 1 - math.pow(beta / (beta + effectiveArea), alpha);
  const culturallyKnown =
    review.belief("method:gather", "known")?.value === true;
  if (!culturallyKnown)
    return {
      value: 0,
      probabilities: [1 - present, present / 2, present / 2],
      classes: 3,
    };
  const rate = review.rateEstimate("gather", "food-patch")?.rate ?? 0;
  const known = review.places('class:resource-kind:"food-patch"', 2).entries;
  const hasSource = known.some(
    (e) => Number(review.belief(e.subject, "stock:food")?.value ?? 0) > 0,
  );
  const quiet = review.quietRequirement(),
    representedNeed = 3 * quiet;
  const stay =
    Math.min(representedNeed, (hasSource ? rate : 0) * P.adoptionHorizonSd) /
    quiet;
  const publicLaw = EXTRACTION_INDEX.method("gather")!;
  // Two equally weighted stock classes around the declared half-capacity prior.
  // They are an explicitly bounded quadrature, not predictions of true sites.
  const outcomes = [
    0,
    publicLaw.referenceRate * (0.25 + 0.75 * 0.25),
    publicLaw.referenceRate * (0.25 + 0.75 * 0.75),
  ];
  const probabilities = [1 - present, present / 2, present / 2];
  let expectedAdopt = 0,
    after = 0;
  for (let i = 0; i < P.outcomeClasses; i++) {
    if (!meter.spend("information")) return null;
    meter.counts.inquiryClasses++;
    // Bounded service improvement, actual adoption/travel opportunity cost.
    const adopt =
      Math.min(
        representedNeed,
        outcomes[i]! * Math.max(0, P.adoptionHorizonSd - travelSd),
      ) /
        quiet -
      travelSd;
    expectedAdopt += probabilities[i]! * adopt;
    after += probabilities[i]! * Math.max(stay, adopt);
  }
  return {
    value: Math.max(0, after - Math.max(stay, expectedAdopt)),
    probabilities,
    classes: P.outcomeClasses,
  };
}
function read(
  o: BoundOption,
  review: PersonalReview,
  subject: string,
  property: string,
) {
  const e = review.belief(subject, property);
  if (
    e &&
    !o.dependencies.some(
      (d) => d.subject === subject && d.property === property,
    )
  )
    o.dependencies.push({ subject, property, version: e.version });
  return e;
}
function unchanged(
  review: PersonalReview,
  descriptor: string,
  version: number,
) {
  const summary = review.belief("exploration", descriptor)?.value as
    Record<string, number> | undefined;
  return (
    !!summary &&
    (summary.paid! >= P.optionalTimeSd * QUANTA ||
      (summary.completed === 1 &&
        summary.evidenceVersion === version &&
        review.time - summary.at! < P.frustrationDecaySd * QUANTA))
  );
}
// One bounded source in the ordinary agenda, no private attention loop or slot.
export function explorationOptions(
  review: PersonalReview,
  state: MindState,
  meter: ReviewEffort,
): BoundOption[] {
  const options: BoundOption[] = [];
  if (review.belief("method:inquire", "known")?.value === true) {
    const key = "eligible-frontier",
      cursor = state.targetCursors[key];
    let page = review.places(key, 1, cursor ? { after: cursor } : null);
    if (!page.entries.length && cursor) page = review.places(key, 1);
    const source = page.entries[0];
    state.targetCursors[key] = page.next?.after ?? null;
    if (source && meter.spend("descriptor") && meter.spend("binding")) {
      const point = source.value as Point,
        descriptor = `inquiry:${source.subject}`;
      const o = base(
        { kind: "knows", question: descriptor, quantity: 1 },
        "inquire",
      );
      // Frontier coverage nominates a question; seeing the goal en route does
      // not invalidate an already authorised observation/return prefix.
      read(o, review, "method:inquire", "known");
      const p = review.profile,
        cell = (point: Point) =>
          Math.floor(point.x / p.cellKm) +
          p.width * Math.floor(point.y / p.cellKm);
      const ground = review.cell(cell(review.self.location))?.terrain ?? 0;
      // Expected newly observable area is geometry weighted by PERSONAL coverage.
      // Bounded local footprint; no map or hidden site search.
      let area = 0;
      const radius = Math.ceil(P.sightKm / p.cellKm);
      outer: for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) {
          if ((dx * dx + dy * dy) * p.cellKm ** 2 > P.sightKm ** 2) continue;
          const x = Math.floor(point.x / p.cellKm) + dx,
            y = Math.floor(point.y / p.cellKm) + dy;
          if (x < 0 || y < 0 || x >= p.width || y >= p.height) continue;
          if (!meter.spend("retrieval")) {
            o.status = "computationally-deferred";
            o.reason = "inquiry footprint EU exhausted";
            break outer;
          }
          area +=
            p.cellKm ** 2 *
            (1 - (review.cell(x + y * p.width)?.detection ?? 0));
        }
      if (
        o.status === "executable" &&
        !unchanged(review, descriptor, source.version) &&
        route(review, state, meter, o, point)
      ) {
        const estimate = inquiryValue(
          review,
          meter,
          ground,
          area,
          o.duration / QUANTA,
        );
        if (!estimate) {
          o.status = "computationally-deferred";
          o.reason = "EVSI computationally deferred";
        } else {
          const experiment: ExplorationOutcome = {
            form: "inquiry",
            operation: "survey",
            targetKind: `food-patch:${ground}`,
            descriptor,
            evidenceVersion: source.version,
            paid: 0,
            completed: false,
            success: false,
          };
          o.steps.push({
            family: "Attend",
            duration: time(P.surveySd),
            scope: "local-survey",
            experiment,
          });
          o.duration += time(P.surveySd);
          route(review,state,meter,o,{...review.self.location},point);
          o.optionalDuration = o.duration;
          o.informationValue = estimate.value;
          o.reason = `personal EVSI ${estimate.value}; absent/poor/useful ${canonical(estimate.probabilities)}`;
          const posterior=review.belief("occupancy",`food-patch:${ground}`);
          o.valuationDependencies=posterior ? [{subject:"occupancy",property:`food-patch:${ground}`,version:posterior.version}] : [];
        }
      } else if (o.status === "executable") {
        o.status = "epistemically-unresolved";
        o.reason = "unchanged local inquiry precedent";
      }
      o.key = optionKey(o);
      options.push(o);
    }
  }
  if (review.belief("method:try-compatible", "known")?.value === true) {
    // Public compatibility index is fixed at compilation; target source is an
    // eligible personal property posting, never global material × schema search.
    const opCursor = state.methodCursors["compatible-operation"];
    let ops = review.places(
      "compatible-operation",
      1,
      opCursor ? { after: opCursor } : null,
    );
    if (!ops.entries.length && opCursor)
      ops = review.places("compatible-operation", 1);
    const opRecord = ops.entries[0],
      operation = opRecord
        ? OPERATION_INDEX.get(String(opRecord.value))
        : undefined;
    if (!operation) return options;
    state.methodCursors["compatible-operation"] = ops.next?.after ?? null;
    const key = `material-property:${operation.properties[0]}`,
      cursor = state.trialCursor;
    let page = review.places(
      key,
      P.candidatesPerReview,
      cursor ? { after: cursor } : null,
    );
    if (!page.entries.length && cursor)
      page = review.places(key, P.candidatesPerReview);
    for (const source of page.entries) {
      if (!meter.spend("trial")) {
        const o = base(
          { kind: "tried", context: "pending", quantity: 1 },
          "try-compatible",
        );
        o.status = "computationally-deferred";
        o.reason = "trial construction EU exhausted";
        o.key = optionKey(o);
        options.push(o);
        break;
      }
      meter.counts.trialCandidates++;
      state.trialCursor = canonical([source.subject, source.property]);
      const properties = String(source.value).split(",");
      if (
        !operation.properties.every((property) =>
          properties.includes(property),
        ) ||
        Number(review.self.carried.stocks[operation.hammer] ?? 0) < 1
      )
        continue;
      const kind = String(
        review.belief(source.subject, "material-kind")?.value ?? "",
      );
      // Known personal effects suppress an unfamiliar-target form. No unknown
      // global effect is examined to decide whether this trial is worthwhile.
      if (
        review.belief(`affordance:${operation.id}:${kind}`, "known")?.value ===
        true
      )
        continue;
      const descriptor = `T1:${operation.id}:${source.subject}:${kind}`;
      const premiseVersion = parseInt(
        digest([kind, properties, operation.id]).slice(0, 8),
        16,
      );
      if (unchanged(review, descriptor, premiseVersion)) continue;
      const o = base(
        { kind: "tried", context: descriptor, quantity: 1 },
        "try-compatible",
      );
      read(o, review, opRecord!.subject, "compatible-operation");
      const point = read(o, review, source.subject, "location")?.value as
        Point | undefined;
      const stock = read(
        o,
        review,
        source.subject,
        `stock:${operation.input}`,
      )?.value;
      read(o, review, source.subject, "perceptible-properties");
      read(o, review, source.subject, "material-kind");
      read(o, review, "method:try-compatible", "known");
      if (!point || typeof stock !== "number" || stock < 1) continue;
      if (!meter.spend("binding")) {
        o.status = "computationally-deferred";
        o.reason = "trial binding node deferred";
      } else if (
        (point.x - review.self.location.x) ** 2 +
          (point.y - review.self.location.y) ** 2 >
        0.08 ** 2
      )
        route(review, state, meter, o, point);
      if (o.status === "executable") {
        const experiment: ExplorationOutcome = {
          form: "T1",
          operation: operation.id,
          targetKind: kind,
          descriptor,
          evidenceVersion: premiseVersion,
          paid: 0,
          completed: false,
          success: false,
        };
        o.steps.push({
          family: "Work",
          law: operation.id,
          site: source.subject,
          duration: time(operation.durationSd),
          experiment,
        });
        o.duration += time(operation.durationSd);
        o.optionalDuration = o.duration;
        o.goods[operation.input] = 1;
        const prior = read(
          o,
          review,
          "exploration",
          `T1:${operation.id}:${kind}`,
        )?.value as Record<string, number> | undefined;
        const probability =
          (prior?.alpha ?? P.alpha) /
          ((prior?.alpha ?? P.alpha) + (prior?.beta ?? P.beta));
        // This Stage-I material has no personally represented production use:
        // instrumental potential is explicitly zero, despite a success prior.
        o.reason = `T1 compatible unfamiliar material; contextual success prior ${probability}; represented instrumental service 0`;
      }
      o.key = optionKey(o);
      options.push(o);
    }
    if (!page.next) state.trialCursor = null;
  }
  return options;
}
