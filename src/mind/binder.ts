import { OPERATION_INDEX } from "../content/exploration";
import { canonical, digest, compareKey } from "../kernel/canonical";
import { QUANTA, time } from "../kernel/time";
import { math } from "../kernel/numerics";
import { chargeRoute, routeAllowance } from "../kernel/effort";
import type { PersonalReview } from "../evidence/read";
import {
  METHOD_INDEX,
  type MethodIndex,
  type MethodEntry,
} from "../content/methods";
import { beginPersonalSearch, resumePersonalSearch } from "../runtime/routing";
import type { Operation } from "../runtime/types";
import { ReviewEffort } from "./effort";
import { bodySignals, ownedLots } from "./signals";
import {
  effectOf,
  type Objective,
  type BoundOption,
  type MindState,
  type Dependency,
} from "./types";

export function optionKey(
  o: Pick<BoundOption, "objective" | "steps" | "bindings">,
): string {
  // Method/task labels do not create a different physical comparison.
  return digest([o.objective, o.steps, o.bindings]);
}
export class Binder {
  method(id: string) {
    return this.catalogue.get(id);
  }
  counterfactual(good: string, quantity = 1) {
    return new Binder(
      this.review,
      this.state,
      this.meter,
      this.catalogue,
      this.sharedLots,
      { ...this.assumedGoods, [good]: quantity },
    );
  }
  get recipes() {
    return this.catalogue.recipes;
  }
  methods: string[] = [];
  dependencies: Dependency[] = [];
  constructor(
    private review: PersonalReview,
    private state: MindState,
    private meter: ReviewEffort,
    private catalogue: MethodIndex = METHOD_INDEX,
    private sharedLots?: ReturnType<typeof ownedLots>,
    private assumedGoods: Record<string, number> = {},
  ) {}
  private read(subject: string, property: string) {
    const e = this.review.belief(subject, property);
    if (
      e &&
      !this.dependencies.some(
        (d) => d.subject === subject && d.property === property,
      )
    )
      this.dependencies.push({ subject, property, version: e.version });
    return e;
  }
  admission(effect: string): MethodEntry[] {
    const after = this.state.methodCursors[effect];
    const page = this.review.methods(effect, 1, after ? { after } : null);
    const fair = page.entries[0] ?? this.review.methods(effect, 1).entries[0];
    this.state.methodCursors[effect] = fair
      ? canonical([fair.subject, fair.property])
      : null;
    const best = this.review.bestMethod(effect);
    const out: MethodEntry[] = [];
    for (const e of [best, fair]) {
      if (!e || out.some((m) => `method:${m.id}` === e.subject)) continue;
      if (!this.meter.spend("retrieval")) break;
      const m = this.catalogue.get(e.subject.slice(7));
      if (m) {
        out.push(m);
        this.methods.push(m.id);
        this.meter.counts.methodsConsidered++;
        this.read(e.subject, "known");
      }
    }
    return out;
  }
  bind(objective: Objective, method: MethodEntry): BoundOption {
    const o: BoundOption = {
      key: "",
      objective,
      method: method.id,
      steps: [],
      dependencies: [],
      bindings: {},
      status: "executable",
      reason: "bound from personal methods and backing",
      prerequisites: [],
      routes: {},
      duration: 0,
      goods: {},
      reference: false,
    };
    const local: Dependency[] = [];
    const originalRead = this.read.bind(this);
    const read = (subject: string, property: string) => {
      const e = originalRead(subject, property);
      if (
        e &&
        !local.some((d) => d.subject === subject && d.property === property)
      )
        local.push({ subject, property, version: e.version });
      return e;
    };
    read(`method:${method.id}`, "known");
    const finish = () => {
      o.dependencies = local;
      o.key = optionKey(o);
      return o;
    };
    const fail = (status: BoundOption["status"], reason: string) => {
      o.status = status;
      o.reason = reason;
      return finish();
    };
    if (!this.meter.spend("binding"))
      return fail(
        "computationally-deferred",
        "binding frontier allowance exhausted",
      );
    const s = method.schema;
    if (!s)
      return fail("unsupported", "no current declarative operation template");
    if (
      s.prerequisites.some(
        (p) =>
          p.effect === effectOf(objective) &&
          (this.review.self.carried.stocks[p.good] ?? 0) <
            (p.quantity ?? objective.quantity),
      )
    )
      return fail(
        "impossible-under-personal-assumptions",
        "cyclic prerequisite",
      );
    const b = bodySignals(this.review);
    if (s.operation === "recover") {
      const p = this.review.profile,
        loc = this.review.self.location;
      const k =
        Math.floor(loc.x / p.cellKm) + p.width * Math.floor(loc.y / p.cellKm);
      if (this.review.cell(k)?.passable !== true)
        return fail(
          "epistemically-unresolved",
          "current recovery location not personally established",
        );
      const duration = time(s.durationSd);
      o.steps.push({ family: "Recover", law: s.law, mode: s.mode, duration });
      o.duration = duration;
      return finish();
    }
    if (s.operation === "material") {
      const operation = OPERATION_INDEX.get(s.law);
      if (!operation)
        return fail(
          "epistemically-unresolved",
          "unknown personally bound operation",
        );
      const sources = this.review.places(
        `class:${s.targetProperty}:${JSON.stringify(s.targetValue)}`,
        2,
      );
      const source = sources.entries.find((e) => {
        const p = this.review.belief(e.subject, "location")?.value as
          { x: number; y: number } | undefined;
        return (
          p &&
          (p.x - this.review.self.location.x) ** 2 +
            (p.y - this.review.self.location.y) ** 2 <=
            0.08 ** 2 &&
          Number(
            this.review.belief(e.subject, `stock:${operation.input}`)?.value ??
              0,
          ) >= 1
        );
      });
      if (
        !source ||
        Number(this.review.self.carried.stocks[operation.hammer] ?? 0) < 1
      )
        return fail(
          "epistemically-unresolved",
          "known material method lacks personally accessible input/hammer",
        );
      read(source.subject, "location");
      read(source.subject, `stock:${operation.input}`);
      read(source.subject, s.targetProperty!);
      read(`method:${method.id}`, "confidence");
      read(`method:${method.id}`, "observed-yield");
      o.steps.push({
        family: "Work",
        law: s.law,
        site: source.subject,
        duration: time(s.durationSd),
      });
      o.bindings["target:0"] = source.subject;
      o.goods[operation.input] = 1;
      o.duration = time(s.durationSd);
      o.reason = "ordinary binding from personally observed provisional method";
      return finish();
    }
    if (
      s.operation === "make" ||
      (s.operation === "extract" && s.prerequisites.length)
    ) {
      const result = this.produce(
        o,
        method,
        objective.quantity,
        read,
        new Set(),
      );
      if (result) return fail(result.status, result.reason);
      o.duration = o.steps.reduce(
        (sum, step, i) =>
          sum +
          (step.family === "Move" ? this.routeDuration(o, i) : step.duration),
        0,
      );
      return finish();
    }
    // Consumed/requiring input nodes are interpreted uniformly as typed have ends.
    if (s.operation === "consume") {
      for (const prerequisite of s.prerequisites) {
        if (!this.meter.spend("binding"))
          return fail("computationally-deferred", "input frontier deferred");
        let remaining = objective.quantity;
        const lots =
          (prerequisite.good === "food" ? this.sharedLots : undefined) ??
          ownedLots(this.review, prerequisite.good);
        for (const lot of lots) {
          if (!this.meter.spend("retrieval"))
            return fail(
              "computationally-deferred",
              "owned input retrieval deferred",
            );
          this.meter.counts.targetsVisited++;
          const q = Math.min(remaining, lot.quantity);
          if (q <= 0) continue;
          read(
            lot.subject,
            lot.subject === this.review.self.carried.subject
              ? "stocks"
              : "own-local-stocks",
          );
          o.bindings[`input:${o.steps.length}`] = lot.subject;
          o.steps.push({
            family: "Transfer",
            from: lot.subject,
            to: lot.subject,
            good: prerequisite.good,
            quantity: q,
            basis: "own-custody",
            use: "consume",
            duration: time(q / (b.quiet + 0.1 * b.classFactor)),
          });
          remaining -= q;
          if (remaining <= 1e-9) break;
        }
        if (remaining > 1e-9) {
          const producers = this.admission(prerequisite.effect);
          const producer = producers.find((m) =>
            ["extract", "make"].includes(m.schema?.operation ?? ""),
          );
          if (!producer)
            return fail(
              "epistemically-unresolved",
              "required input has no personally known producer",
            );
          if (!this.meter.spend("binding"))
            return fail("computationally-deferred", "producer node deferred");
          const result = this.produce(o, producer, remaining, read, new Set());
          if (result) return fail(result.status, result.reason);
          o.steps.push({
            family: "Transfer",
            from: this.review.self.carried.subject,
            to: this.review.self.carried.subject,
            good: prerequisite.good,
            quantity: remaining,
            basis: "own-custody",
            use: "consume",
            duration: time(remaining / (b.quiet + 0.1 * b.classFactor)),
          });
        }
        o.goods[prerequisite.good] = objective.quantity;
        o.prerequisites.push({
          effect: prerequisite.effect,
          status: "executable",
        });
      }
    } else {
      const result = this.extract(o, method, objective.quantity, read);
      if (result) return fail(result.status, result.reason);
    }
    o.duration = o.steps.reduce(
      (sum, step, i) =>
        sum +
        (step.family === "Move" ? this.routeDuration(o, i) : step.duration),
      0,
    );
    return finish();
  }
  private produce(
    o: BoundOption,
    method: MethodEntry,
    quantity: number,
    read: (
      subject: string,
      property: string,
    ) => ReturnType<PersonalReview["belief"]>,
    ancestry: Set<string>,
    funding = {
      held: {
        ...this.review.self.carried.stocks,
        ...this.assumedGoods,
      } as Record<string, number>,
      withdrawn: new Map<string, number>(),
    },
  ): { status: BoundOption["status"]; reason: string } | null {
    const schema = method.schema;
    if (!schema || !["make", "extract"].includes(schema.operation))
      return { status: "unsupported", reason: "no declarative producer" };
    if (schema.operation === "make") quantity = Math.ceil(quantity);
    const effect = `have:${schema.good}`;
    if (ancestry.has(effect))
      return {
        status: "impossible-under-personal-assumptions",
        reason: "unfunded prerequisite cycle",
      };
    if (!this.meter.spend("binding"))
      return {
        status: "computationally-deferred",
        reason: "project prerequisite frontier allowance exhausted",
      };
    ancestry.add(effect);
    read(`method:${method.id}`, "known");
    if (schema.operation === "make") {
      const wip = this.review
        .places(`work-recipe:${schema.law}`, 2)
        .entries.find((e) => {
          const w = e.value as unknown as {
            point: { x: number; y: number };
            complete: boolean;
          };
          return !w.complete;
        });
      if (wip) {
        const w = wip.value as unknown as {
          progress: number;
          required: number;
          point: { x: number; y: number };
        };
        const travel = this.locate(o, w.point);
        if (travel) return travel;
        read(wip.subject, "work-progress");
        o.steps.push({
          family: "Work",
          law: schema.law,
          workObject: wip.subject,
          duration: time(
            Math.max(0.001, w.required - w.progress) /
              (this.review.rateEstimate(schema.law, "making")?.rate ?? 1),
          ),
        });
        funding.held[schema.good!] =
          (funding.held[schema.good!] ?? 0) + quantity;
        ancestry.delete(effect);
        return null;
      }
    }
    for (const prerequisite of schema.prerequisites) {
      const required =
        (prerequisite.quantity ?? 1) *
        (schema.operation === "make" && prerequisite.consumes ? quantity : 1);
      let remaining = Math.max(
        0,
        required - (funding.held[prerequisite.good] ?? 0),
      );
      const lots = ownedLots(this.review, prerequisite.good).filter(
        (l) => l.subject !== this.review.self.carried.subject,
      );
      for (const lot of lots) {
        if (!this.meter.spend("retrieval"))
          return {
            status: "computationally-deferred",
            reason: "complementary input retrieval deferred",
          };
        read(
          lot.subject,
          lot.subject === this.review.self.carried.subject
            ? "stocks"
            : "own-local-stocks",
        );
        const tag = lot.subject + ":" + prerequisite.good;
        const q = Math.min(
          remaining,
          lot.quantity - (funding.withdrawn.get(tag) ?? 0),
        );
        if (q <= 0) continue;
        funding.withdrawn.set(tag, (funding.withdrawn.get(tag) ?? 0) + q);
        funding.held[prerequisite.good] =
          (funding.held[prerequisite.good] ?? 0) + q;
        o.goods[prerequisite.good] = (o.goods[prerequisite.good] ?? 0) + q;
        if (lot.subject !== this.review.self.carried.subject)
          o.steps.push({
            family: "Transfer",
            from: lot.subject,
            to: this.review.self.carried.subject,
            good: prerequisite.good,
            quantity: q,
            basis: "own-custody",
            duration: time(0.02),
          });
        remaining -= q;
        if (remaining <= 1e-9) break;
      }
      if (remaining > 1e-9) {
        const producer = this.admission(prerequisite.effect)[0];
        if (!producer)
          return {
            status: "epistemically-unresolved",
            reason: "complement lacks personally known producer",
          };
        const result = this.produce(
          o,
          producer,
          remaining,
          read,
          ancestry,
          funding,
        );
        if (result) return result;
      }
      if (prerequisite.consumes) {
        o.goods[prerequisite.good] =
          (o.goods[prerequisite.good] ?? 0) + required;
        funding.held[prerequisite.good] =
          (funding.held[prerequisite.good] ?? 0) - required;
      }
      o.prerequisites.push({
        effect: prerequisite.effect,
        status: "executable",
      });
    }
    if (o.steps.length >= 12)
      return {
        status: "computationally-deferred",
        reason: "paid project prefix step allowance exhausted",
      };
    if (schema.operation === "make") {
      for (let i = 0; i < Math.ceil(quantity); i++)
        o.steps.push({
          family: "Work",
          law: schema.law,
          duration: time(
            schema.durationSd /
              (this.review.rateEstimate(schema.law, "making")?.rate ?? 1),
          ),
        });
    } else {
      const result = this.extract(o, method, quantity, read);
      if (result) return result;
    }
    funding.held[schema.good!] = (funding.held[schema.good!] ?? 0) + quantity;
    ancestry.delete(effect);
    return null;
  }
  private routeDuration(o: BoundOption, i: number) {
    const r = o.routes[i]!;
    const b = bodySignals(this.review);
    return time(
      r.nodes[r.goal]!.g /
        (80 *
          math.sqrt(Math.max(0.05, b.condition)) *
          math.sqrt(1 - b.wounds) *
          (1 - 0.2 * b.fatigue)),
    );
  }
  private location(o: BoundOption) {
    const last = [...o.steps].reverse().find((s) => s.family === "Move");
    return last?.family === "Move" ? last.target : this.review.self.location;
  }
  private locate(
    o: BoundOption,
    point: { x: number; y: number },
  ): { status: BoundOption["status"]; reason: string } | null {
    const origin = this.location(o);
    if ((point.x - origin.x) ** 2 + (point.y - origin.y) ** 2 <= 0.08 ** 2)
      return null;
    {
      const p = this.review.profile,
        k = (point: { x: number; y: number }) =>
          Math.floor(point.x / p.cellKm) +
          p.width * Math.floor(point.y / p.cellKm);
      const held = this.state.deferred
        .flatMap((x) => Object.values(x.routes))
        .find(
          (r) =>
            r.start === k(origin) &&
            r.goal === k(point) &&
            r.geographyId === this.review.geographyId &&
            r.status === "unresolved",
        );
      const route = held
        ? (JSON.parse(JSON.stringify(held)) as typeof held)
        : beginPersonalSearch(
            p,
            [],
            k(origin),
            k(point),
            false,
            this.review.traversalPrior(),
            this.meter.counts,
            [],
            this.review.geography(),
          );
      route.effortAccount = this.meter.account.key;
      const before = route.expansions,
        spent = this.meter.account.spent;
      let status = resumePersonalSearch(
        route,
        65536,
        this.meter.counts,
        routeAllowance(this.meter.account),
        this.review.geography(),
      );
      while (status === "unresolved")
        status = resumePersonalSearch(
          route,
          65536,
          this.meter.counts,
          routeAllowance(this.meter.account) - (route.expansions - before),
          this.review.geography(),
        );
      chargeRoute(this.meter.account, route.expansions - before);
      const cost = this.meter.account.spent - spent;
      this.meter.counts.routeEu += cost;
      this.meter.counts.reviewEuTotal += cost;
      o.routes[o.steps.length] = route;
      if (status === "deferred")
        return {
          status: "computationally-deferred",
          reason: "personal route frontier retained",
        };
      if (status !== "found")
        return {
          status: "impossible-under-personal-assumptions",
          reason: "no established route under personal known geometry",
        };
      o.steps.push({
        family: "Move",
        target: point,
        exploratory: false,
      });
    }
    return null;
  }
  private extract(
    o: BoundOption,
    method: MethodEntry,
    quantity: number,
    read: (
      subject: string,
      property: string,
    ) => ReturnType<PersonalReview["belief"]>,
  ): { status: BoundOption["status"]; reason: string } | null {
    const s = method.schema!;
    read(`method:${method.id}`, "known");
    const property = `class:${s.targetProperty}:${JSON.stringify(s.targetValue)}`;
    const cursor = this.state.targetCursors[property];
    let page = this.review.places(
      property,
      4,
      cursor ? { after: cursor } : null,
    );
    if (!page.entries.length && cursor) page = this.review.places(property, 4);
    this.state.targetCursors[property] = page.next?.after ?? null;
    const candidates: {
      subject: string;
      point: { x: number; y: number };
      distance: number;
    }[] = [];
    for (const e of page.entries) {
      if (!this.meter.spend("retrieval"))
        return {
          status: "computationally-deferred",
          reason: "source posting retrieval deferred",
        };
      this.meter.counts.targetsVisited++;
      const p = read(e.subject, "location")?.value as
        { x: number; y: number } | undefined;
      const stock = read(e.subject, `stock:${s.good}`)?.value;
      if (p && typeof stock === "number" && stock > 0)
        candidates.push({
          subject: e.subject,
          point: p,
          distance:
            (p.x - this.location(o).x) ** 2 + (p.y - this.location(o).y) ** 2,
        });
    }
    candidates.sort(
      (a, b) => a.distance - b.distance || compareKey(a.subject, b.subject),
    );
    const target = candidates[0];
    if (!target)
      return {
        status: "epistemically-unresolved",
        reason: "no personally known nonempty compatible source",
      };
    const rate = this.review.rateEstimate(method.id, s.rateContext!);
    read("self", `rate:${method.id}:${s.rateContext}`);
    if (!rate || rate.rate <= 0)
      return {
        status: "epistemically-unresolved",
        reason: "no personal expected rate",
      };
    const travel = this.locate(o, target.point);
    if (travel) return travel;
    // Dated rate evidence already includes the actor's paid expression; project
    // only the public condition/fatigue changes relative to the observed signal.
    const duration = time(quantity / rate.rate);
    o.steps.push({
      family: "Work",
      law: s.law,
      site: target.subject,
      duration,
    });
    o.bindings[`target:${o.steps.length - 1}`] = target.subject;
    return null;
  }
}
