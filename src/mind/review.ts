import { canonical, compareKey, digest } from "../kernel/canonical";
import { draw, normal } from "../kernel/random";
import { math } from "../kernel/numerics";
import { QUANTA } from "../kernel/time";
import type { Counters } from "../kernel/counters";
import type { PersonalReview } from "../evidence/read";
import type {
  Task,
  Budget,
  SelectedIntention,
  Operation,
} from "../runtime/types";
import { METHOD_INDEX, type MethodIndex } from "../content/methods";
import { openReview, ReviewEffort } from "./effort";
import { Binder, optionKey } from "./binder";
import { bodySignals, drives, ownedLots, ownedLotsPage } from "./signals";
import { forecast } from "./forecast";
import {
  heldErrors,
  preference,
  feasibility,
  arbitrate,
  type CognitivePrecision,
} from "./arbiter";
import {
  effectOf,
  type MindState,
  type WakeCause,
  type BoundOption,
  type Compared,
  type DecisionTrace,
  type Dispositions,
} from "./types";
export const TRACE_WINDOW = 4;
export interface Execution {
  task: Task | null;
  budget: { authorised: Budget; spent: Budget } | null;
}
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
export class Mind {
  private people = new Map<string, MindState>();
  constructor(
    readonly seed: string,
    private counts: Counters,
    readonly state: MindState[] = [],
    private catalogue: MethodIndex = METHOD_INDEX,
  ) {
    for (const s of state) {
      validateMind(s);
      Object.freeze(s.dispositions);
      this.people.set(s.actor, s);
    }
  }
  person(actor: string) {
    return this.people.get(actor) ?? null;
  }
  found(actor: string, at: number, dispositions?: Dispositions): MindState {
    if (this.people.has(actor)) throw Error("Duplicate cognitive owner");
    const d = dispositions ?? {
      p: 2 * draw(this.seed, "disposition-p", [actor]) - 1,
      rT: 2 * draw(this.seed, "disposition-risk", [actor]) - 1,
      aT: 2 * draw(this.seed, "disposition-relational", [actor]) - 1,
    };
    const offset =
      1 +
      Math.floor(draw(this.seed, "review-stagger", [actor]) * (2 * QUANTA - 1));
    let periodicAt = Math.floor(at / (2 * QUANTA)) * 2 * QUANTA + offset;
    if (periodicAt <= at) periodicAt += 2 * QUANTA;
    const s: MindState = {
      actor,
      dispositions: Object.freeze({ ...d }),
      periodicAt,
      nextWake: null,
      pending: [],
      foodArmed: true,
      restArmed: true,
      capDay: -1,
      capCount: 0,
      epoch: 0,
      signatures: {},
      agendaCursor: 0,
      comparisonCursor: 0,
      methodCursors: {},
      targetCursors: {},
      deferred: [],
      traces: [],
      admitted: 0,
      consulted: [],
    };
    validateMind(s);
    this.people.set(actor, s);
    this.state.push(s);
    return s;
  }
  request(actor: string, cause: WakeCause, at: number): boolean {
    const s = this.people.get(actor);
    if (!s) return false;
    this.counts.reviewWakesRequested++;
    if (cause === "periodic") this.counts.periodicWakes++;
    if (cause === "food" || cause === "rest") this.counts.thresholdWakes++;
    if (cause === "completion") this.counts.completionWakes++;
    if (cause === "failure") this.counts.failureWakes++;
    if (s.pending.includes(cause) || s.nextWake === at)
      this.counts.reviewWakesCoalesced++;
    if (!s.pending.includes(cause)) s.pending.push(cause);
    s.pending.sort(compareKey);
    if (s.nextWake === null || at < s.nextWake) {
      s.nextWake = at;
      return true;
    }
    return false;
  }
  thresholds(review: PersonalReview): WakeCause[] {
    const s = this.people.get(review.owner);
    if (!s) return [];
    const b = bodySignals(review),
      coverage =
        ownedLots(review, "food").reduce((sum, l) => sum + l.quantity, 0) /
        b.quiet;
    const causes: WakeCause[] = [];
    if (coverage > 0.5) s.foodArmed = true;
    if (s.foodArmed && coverage < 0.25) {
      s.foodArmed = false;
      causes.push("food");
    }
    if (b.fatigue <= 0.35) s.restArmed = true;
    if (s.restArmed && b.fatigue >= 0.5) {
      s.restArmed = false;
      causes.push("rest");
    }
    return causes;
  }
  admit(review: PersonalReview, execution: Execution) {
    const s = this.people.get(review.owner)!;
    const causes = [...s.pending];
    s.pending = [];
    s.nextWake = null;
    const b = bodySignals(review),
      food =
        ownedLots(review, "food").reduce((sum, l) => sum + l.quantity, 0) /
        b.quiet;
    const features = [
      Math.round(b.condition / 0.05),
      Math.round(food / 0.05),
      Math.round(b.fatigue / 0.05),
      Math.round((1 - b.enjoyment) ** 2 / 0.01),
      execution.task?.semanticKey ?? null,
      execution.task?.status ?? null,
    ];
    const versions = s.consulted
      .filter(
        (d) =>
          !(
            d.subject === "self" &&
            ["body-experience", "quiet-requirement"].includes(d.property)
          ),
      )
      .map((d) => [
        d.subject,
        d.property,
        review.version(d.subject, d.property),
      ]);
    const signatures: Partial<Record<WakeCause, string>> = {};
    const fresh = causes.filter((cause) => {
      const signature = digest([
        cause,
        features,
        versions,
        cause === "periodic" ? Math.floor(review.time / (2 * QUANTA)) : null,
      ]);
      if (s.signatures[cause] === signature) {
        this.counts.wakeSameStateDrops++;
        return false;
      }
      signatures[cause] = signature;
      return true;
    });
    if (!fresh.length) return null;
    const day = Math.floor(review.time / QUANTA);
    if (day !== s.capDay) {
      s.capDay = day;
      s.capCount = 0;
    }
    if (s.capCount >= 8) {
      s.pending = fresh;
      s.nextWake =
        s.periodicAt > review.time ? s.periodicAt : s.periodicAt + 2 * QUANTA;
      this.counts.wakeCapDeferrals++;
      return null;
    }
    Object.assign(s.signatures, signatures);
    s.capCount++;
    s.admitted++;
    s.epoch = Math.floor(review.time / (2 * QUANTA));
    this.counts.reviewWakesExecuted++;
    return {
      causes: fresh,
      signature: digest([fresh, features, versions]),
      account: openReview(review.owner, review.time),
    };
  }
  deliberate(
    review: PersonalReview,
    execution: Execution,
    admission: NonNullable<ReturnType<Mind["admit"]>>,
    precision: CognitivePrecision,
  ): DecisionTrace {
    const s = this.people.get(review.owner)!,
      meter = new ReviewEffort(admission.account, this.counts);
    const page = ownedLotsPage(
      review,
      "food",
      4,
      s.targetCursors["own-input:food"] ?? null,
    );
    s.targetCursors["own-input:food"] = page.next;
    const binder = new Binder(review, s, meter, this.catalogue, page.lots);
    this.counts.autonomousDeliberations++;
    const reference = continuation(review, execution);
    const refForecast = forecast(review, reference, meter, 3, page.lots);
    if (!refForecast)
      throw Error("Mandatory reference forecast was not reserved");
    const allDrives = drives(review, page.lots);
    this.counts.drivesConsidered += allDrives.length;
    const ordered = [...allDrives].sort(
      (a, b) =>
        b.urgency - a.urgency ||
        compareKey(canonical(a.objective), canonical(b.objective)),
    );
    const fair = allDrives[s.agendaCursor % allDrives.length]!;
    s.agendaCursor = (s.agendaCursor + 1) % allDrives.length;
    const agenda = [
      ...new Map(
        [...ordered.slice(0, 2), fair, ...ordered].map((d) => [
          effectOf(d.objective),
          d,
        ]),
      ).values(),
    ].slice(0, 24);
    const admitted = agenda.filter(() => meter.spend("descriptor"));
    this.counts.agendaAdmitted += admitted.length;
    this.counts.agendaDeferred += allDrives.length - admitted.length;
    const bound: BoundOption[] = [],
      deferrals: string[] = [];
    for (const item of admitted)
      for (const method of binder.admission(effectOf(item.objective))) {
        const o = binder.bind(item.objective, method);
        // A short alternative may resume the already authorised remaining plan.
        // Both prefix and continuation are explicit paid operations in the new
        // envelope. No no-new-intention reference gets free maintenance.
        if (
          o.status === "executable" &&
          reference.steps.length &&
          o.duration < 3 * QUANTA &&
          effectOf(o.objective) !== effectOf(reference.objective)
        )
          append(o, reference);
        bound.push(o);
        if (o.status === "computationally-deferred") deferrals.push(o.reason);
      }
    // Generic agenda composition: when there is no incumbent, a short end may
    // be followed by the highest urgency different executable end already bound
    // in this review. This represents an explicit serial plan, not future funds.
    const primitives = copy(bound);
    if (!reference.steps.length)
      for (const o of bound) {
        if (o.status !== "executable" || o.duration >= 3 * QUANTA) continue;
        const suffix = primitives.find(
          (x) =>
            x.key !== o.key &&
            x.status === "executable" &&
            x.duration >= QUANTA &&
            effectOf(x.objective) !== effectOf(o.objective),
        );
        if (suffix) append(o, copy(suffix));
      }
    const executable = bound.filter((o) => o.status === "executable");
    const first = [
      ...new Map(executable.map((o) => [effectOf(o.objective), o])).keys(),
    ].map((effect) =>
      executable.find((o) => effectOf(o.objective) === effect)!,
    );
    const extras = executable.filter((o) => !first.includes(o));
    const start = extras.length ? s.comparisonCursor % extras.length : 0;
    const fairExtras = [...extras.slice(start), ...extras.slice(0, start)];
    s.comparisonCursor++;
    const candidates = [reference, ...first, ...fairExtras].slice(0, 6);
    for (const o of bound.filter(
      (o) => o.status === "executable" && !candidates.includes(o),
    )) {
      o.status = "computationally-deferred";
      o.reason = "full comparison admission cap";
      deferrals.push(o.reason);
    }
    const compared: Compared[] = [];
    const sharedErrors = new Map<string, number>();
    for (const o of candidates) {
      const c = o.reference
        ? refForecast
        : forecast(review, o, meter, 3, page.lots);
      if (!c) {
        o.status = "computationally-deferred";
        o.reason = "forecast EU exhausted";
        deferrals.push(o.reason);
        continue;
      }
      const ages = o.dependencies
        .map((d) => review.belief(d.subject, d.property)?.observedAt)
        .filter((x): x is number => x !== undefined);
      const age = ages.length
        ? (review.time - Math.min(...ages)) / QUANTA
        : null;
      const errors = o.reference
        ? c.blocks.map(() => 0)
        : heldErrors(
            this.seed,
            review.owner,
            o.key,
            s.epoch,
            c,
            age,
            precision,
          );
      for (let i = 0; i < c.blocks.length; i++) {
        const block = c.blocks[i]!,
          mid = (block.start + block.end) / 2,
          r = refForecast.blocks.find((r) => r.start <= mid && r.end >= mid)!;
        const changed = canonical([
          block.materialService - r.materialService,
          block.materialLoss - r.materialLoss,
          block.enjoymentDeficit - r.enjoymentDeficit,
          block.dependantCoverage - r.dependantCoverage,
          block.relationshipExperience - r.relationshipExperience,
        ]);
        if (changed === "[0,0,0,0,0]") errors[i] = 0;
        else {
          const key = canonical([changed, block.start, block.end]);
          if (!sharedErrors.has(key))
            sharedErrors.set(
              key,
              (normal(this.seed, "forecast-held-error", [
                review.owner,
                key,
                String(s.epoch),
                "common",
              ]) *
                0.05 *
                (block.end - block.start) *
                (age === null ? 2 : 1 + age / (3 + age))) /
                Math.max(0.25, precision.denominator()),
            );
          errors[i] = sharedErrors.get(key)!;
        }
      }
      if (c.tail.value !== refForecast.tail.value)
        c.tail.error =
          (normal(this.seed, "forecast-tail-error", [
            review.owner,
            o.key,
            String(s.epoch),
            "tail",
          ]) *
            0.1 *
            (age === null ? 2 : 1 + age / (3 + age))) /
          Math.max(0.25, precision.denominator());
      const value = 0;
      const x: Compared = {
        option: o,
        consequences: c,
        feasible: true,
        gate: null,
        riskPass: c.severeProbability <= 0.12 + 0.06 * s.dispositions.rT,
        value,
        error: errors.reduce((sum, x) => sum + x, 0) + c.tail.error,
        errors,
      };
      const emergency =
        !o.reference &&
        effectOf(o.objective) === "service:nourishment" &&
        refForecast.severeProbability > 0.12 + 0.06 * s.dispositions.rT;
      x.gate = feasibility(review, x, emergency, page.lots);
      x.feasible = x.gate === null;
      if (x.feasible && !o.reference)
        x.value = preference(
          c,
          refForecast,
          s.dispositions,
          review.quietRequirement(),
          errors,
        );
      if (!x.feasible) this.counts.feasibilityRejected++;
      if (!x.riskPass) this.counts.severeRiskRejected++;
      compared.push(x);
    }
    const result = arbitrate(compared, 0.12 + 0.06 * s.dispositions.rT);
    const selected = result.winner.option.reference
      ? null
      : authorization(review, s, result.winner.option, meter.account.key);
    if (selected) {
      this.counts.alternativeSelected++;
    } else this.counts.incumbentRetained++;
    s.deferred = copy(
      bound.filter((o) => o.status === "computationally-deferred").slice(0, 5),
    );
    s.consulted = copy(binder.dependencies);
    const trace: DecisionTrace = {
      actor: review.owner,
      at: review.time,
      epoch: s.epoch,
      causes: admission.causes,
      signature: admission.signature,
      effort: copy(meter.account),
      drives: allDrives.map((d) => ({ ...d, admitted: admitted.includes(d) })),
      agenda: admitted.map((d) => d.objective),
      methods: [...binder.methods],
      bindings: copy(bound),
      dependencies: copy(binder.dependencies),
      premises: {
        self: copy(review.self),
        geographyId: review.geographyId,
        quietEstimate: review.quietRequirement(),
        ownedInputs: copy(page.lots),
      },
      evidence: [
        ...binder.dependencies,
        { subject: "self", property: "body-experience" },
        { subject: "self", property: "quiet-requirement" },
      ]
        .map((d) => review.belief(d.subject, d.property))
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .map((e) => ({
          subject: e.subject,
          property: e.property,
          version: e.version,
          observedAt: e.observedAt,
          value: copy(e.value),
        })),
      compared: copy(compared),
      winner: result.winner.option.key,
      rejected: result.rejected?.option.key ?? null,
      rule: result.rule,
      margin: result.margin,
      selected,
      deferrals,
    };
    s.traces.push(copy(trace));
    if (s.traces.length > TRACE_WINDOW) s.traces.shift();
    return trace;
  }
}
function append(prefix: BoundOption, suffix: BoundOption) {
  const offset = prefix.steps.length;
  prefix.steps.push(...copy(suffix.steps));
  for (const [i, r] of Object.entries(suffix.routes))
    prefix.routes[Number(i) + offset] = copy(r);
  for (const [k, v] of Object.entries(suffix.bindings))
    prefix.bindings[`continuation:${k}`] = v;
  prefix.dependencies = [
    ...new Map(
      [...prefix.dependencies, ...suffix.dependencies].map((d) => [
        canonical([d.subject, d.property]),
        d,
      ]),
    ).values(),
  ];
  prefix.duration += suffix.duration;
  for (const [good, q] of Object.entries(suffix.goods))
    prefix.goods[good] = (prefix.goods[good] ?? 0) + q;
  prefix.key = optionKey(prefix);
}
export function continuation(
  review: PersonalReview,
  execution: Execution,
): BoundOption {
  const t = execution.task;
  const valid =
    t && ["running", "ready", "routing", "suspended"].includes(t.status);
  const steps = valid ? copy(t.steps.slice(t.cursor)) : [];
  if (steps.length && steps[0]!.family !== "Move") {
    const step = steps[0]! as Exclude<Operation, { family: "Move" }>;
    const oldDuration = step.duration;
    step.duration = Math.max(0, step.duration - t!.paidForStep);
    if (step.family === "Transfer")
      step.quantity *= step.duration / oldDuration;
    if (!step.duration) steps.shift();
  }
  const objective = t?.envelope?.end as BoundOption["objective"] | undefined;
  const o: BoundOption = {
    key: "",
    objective: objective ?? {
      kind: "service",
      service: "ordinary-continuation",
      quantity: 0,
    },
    method: t?.method ?? "ordinary-continuation",
    steps,
    dependencies: valid
      ? t.dependsOn.map((d) => {
          const [subject, property] = JSON.parse(d.key) as string[];
          return { subject: subject!, property: property!, version: d.version };
        })
      : [],
    bindings: valid ? copy(t.bindings) : {},
    status: valid || !t ? "executable" : "known-available",
    reason: valid
      ? "remaining paid authorised plan, with sunk prefixes excluded"
      : "explicit no-new-intention continuation; no free intake or recovery",
    prerequisites: [],
    routes: {},
    duration:
      valid && execution.budget
        ? execution.budget.authorised.time - execution.budget.spent.time
        : 0,
    goods:
      valid && execution.budget
        ? Object.fromEntries(
            Object.entries(execution.budget.authorised.goods).map(([g, q]) => [
              g,
              q - (execution.budget!.spent.goods[g] ?? 0),
            ]),
          )
        : {},
    reference: true,
  };
  if (valid && t.route && steps[0]?.family === "Move") {
    const r = copy(t.route),
      p = review.profile,
      at = review.self.location;
    const k =
      Math.floor(at.x / p.cellKm) + p.width * Math.floor(at.y / p.cellKm);
    const suffix = r.path.slice(t.routeCursor);
    r.path = [k, ...suffix.filter((cell, i) => i !== 0 || cell !== k)];
    r.start = k;
    let point = at,
      cost = 0;
    for (const cell of r.path.slice(1)) {
      const next = {
        x: ((cell % p.width) + 0.5) * p.cellKm,
        y: (Math.floor(cell / p.width) + 0.5) * p.cellKm,
      };
      cost +=
        math.sqrt((next.x - point.x) ** 2 + (next.y - point.y) ** 2) /
        Math.max(0.01, review.cell(cell)?.speed ?? r.prior.speedFactor);
      point = next;
    }
    if (r.nodes[r.goal]) r.nodes[r.goal]!.g = cost;
    o.routes[0] = r;
  }
  if (valid)
    o.goods = Object.fromEntries(
      [
        ...new Set(
          steps.filter((s) => s.family === "Transfer").map((s) => s.good),
        ),
      ].map((g) => [
        g,
        steps.reduce(
          (sum, s) =>
            sum + (s.family === "Transfer" && s.good === g ? s.quantity : 0),
          0,
        ),
      ]),
    );
  o.key = optionKey(o);
  return o;
}
function authorization(
  review: PersonalReview,
  s: MindState,
  o: BoundOption,
  account: string,
): SelectedIntention {
  const purpose = canonical([o.objective, account]);
  const key = digest([review.owner, purpose, o.steps, o.bindings]);
  return {
    actor: review.owner,
    intentionId: `intention:${key}`,
    taskId: `task:${key}`,
    semanticKey: key,
    objective: purpose,
    method: o.method,
    bindings: copy(o.bindings),
    steps: copy(o.steps),
    dependsOn: o.dependencies.map((d) => ({
      key: canonical([d.subject, d.property]),
      version: d.version,
    })),
    authorised: {
      time: Math.ceil(o.duration * 1.25),
      goods: Object.fromEntries(
        Object.entries(o.goods).map(([g, q]) => [g, q * 1.1]),
      ),
    },
    reserve: [],
    source: "bounded-personal-review",
    effortAccount: account,
    preparedRoutes: copy(o.routes),
    repairScope: { moveTargets: [], bindings: {} },
    envelope: {
      purpose,
      end: o.objective,
      targets: Object.values(o.bindings),
      quantity: {
        estimate: o.objective.quantity,
        low: o.objective.quantity * 0.75,
        high: o.objective.quantity * 1.25,
      },
      riskCeiling: 0.12 + 0.06 * s.dispositions.rT,
      locationBasis:
        "dated personal locations and established personal route prefixes",
      rightsBasis: "own-custody-and-public-extraction",
      stop: [
        "desired end reached",
        "finite authorised time or goods exhausted",
      ],
      escalation: [
        "required personal assumption invalidated",
        "operation fails outside permitted repair",
        "risk or spending ceiling exceeded",
      ],
      reviewAccount: account,
    },
  };
}
export function validateMind(s: MindState): void {
  const wakeCauses = ["periodic", "food", "rest", "completion", "failure"];
  if (
    !s.actor ||
    !s.dispositions ||
    canonical(Object.keys(s.dispositions).sort(compareKey)) !==
      canonical(["aT", "p", "rT"]) ||
    Object.values(s.dispositions).some(
      (x) => !Number.isFinite(x) || x < -1 || x > 1,
    ) ||
    !Number.isSafeInteger(s.periodicAt) ||
    s.periodicAt < 0 ||
    !Number.isSafeInteger(s.capCount) ||
    s.capCount < 0 ||
    s.capCount > 8 ||
    !Array.isArray(s.traces) ||
    s.traces.length > TRACE_WINDOW ||
    !Array.isArray(s.deferred) ||
    s.deferred.length > 5 ||
    !Array.isArray(s.consulted) ||
    !s.methodCursors ||
    !s.targetCursors ||
    !s.signatures ||
    !Array.isArray(s.pending) ||
    s.pending.some((c) => !wakeCauses.includes(c)) ||
    new Set(s.pending).size !== s.pending.length ||
    (s.nextWake !== null &&
      (!Number.isSafeInteger(s.nextWake) || s.nextWake < 0)) ||
    [s.epoch, s.agendaCursor, s.comparisonCursor, s.admitted].some(
      (x) => !Number.isSafeInteger(x) || x < 0,
    ) ||
    typeof s.foodArmed !== "boolean" ||
    typeof s.restArmed !== "boolean"
  )
    throw Error("Invalid cognitive continuation state");
}
