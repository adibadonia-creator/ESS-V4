import { beginPersonalSearch,resumePersonalSearch } from "../runtime/routing";
import { chargeRoute,routeAllowance } from "../kernel/effort";
import { ProjectFrontier } from "./projects";
import { capitalOptions } from "./capital";
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
import { explorationOptions, explorationWeight } from "./exploration";
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
  private projectFrontiers=new Map<string,ProjectFrontier>();
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
  safety(review:PersonalReview,execution:Execution):DecisionTrace|null {
    const state=this.people.get(review.owner);if(!state)return null;
    const evidence=review.places("threat",1).entries[0];
    const threat=evidence?.value as unknown as {force:number;point:{x:number;y:number};active:boolean}|undefined;
    if(!threat?.active || review.time-evidence!.observedAt>QUANTA/4)return null;
    const loc=review.self.location,distance=math.sqrt((loc.x-threat.point.x)**2+(loc.y-threat.point.y)**2);
    if(distance>=.6)return null;
    const signature=digest([evidence!.subject,Math.floor(distance/.1)]);
    if(state.safetySignature===signature)return null;state.safetySignature=signature;
    const account={...openReview(review.owner,review.time),kind:"safety" as const,key:canonical([review.owner,"safety",review.time]),allowance:80};
    const meter=new ReviewEffort(account,this.counts),reference=continuation(review,execution),options:BoundOption[]=[reference];
    const p=review.profile,k=(point:{x:number;y:number})=>Math.floor(point.x/p.cellKm)+p.width*Math.floor(point.y/p.cellKm);
    const norm=distance||1,away={x:(loc.x-threat.point.x)/norm,y:(loc.y-threat.point.y)/norm};
    if(distance===0){away.x=1;away.y=0;}
    for(const scale of [.5,.3]) {
      if(!meter.spend("descriptor")||!meter.spend("binding"))break;
      const point={x:Math.max(p.cellKm/2,Math.min(p.width*p.cellKm-p.cellKm/2,loc.x+away.x*scale)),y:Math.max(p.cellKm/2,Math.min(p.height*p.cellKm-p.cellKm/2,loc.y+away.y*scale))};
      if(!review.cell(k(point))?.passable||review.belief("method:escape","known")?.value!==true)continue;
      const route=beginPersonalSearch(p,[],k(loc),k(point),false,review.traversalPrior(),this.counts,[],review.geography());
      route.effortAccount=account.key;
      const before=route.expansions,allowance=Math.min(512,routeAllowance(account));resumePersonalSearch(route,allowance,this.counts,allowance,review.geography());chargeRoute(account,route.expansions-before);
      if(route.status!=="found"||route.path.some(cell=>review.cell(cell)?.passable!==true))continue;
      const b=bodySignals(review),duration=Math.ceil(route.nodes[route.goal]!.g/(80*math.sqrt(Math.max(.05,b.condition))*math.sqrt(1-b.wounds)*(1-.2*b.fatigue))*QUANTA);
      const o:BoundOption={key:"",objective:{kind:"service",service:"safety",quantity:1},method:"escape",steps:[{family:"Move",target:point,exploratory:false}],dependencies:[],bindings:{threat:evidence!.subject},status:"executable",reason:"flight on personally established local geometry",prerequisites:[],routes:{0:route},duration,goods:{},reference:false};o.key=optionKey(o);options.push(o);
    }
    if(distance<=.08&&review.belief("method:defend","known")?.value===true&&meter.spend("binding")) {
      const o:BoundOption={key:"",objective:{kind:"service",service:"safety",quantity:1},method:"defend",steps:[{family:"Engage",law:"contest",target:evidence!.subject,duration:Math.ceil(.04*QUANTA)}],dependencies:[],bindings:{threat:evidence!.subject},status:"executable",reason:"local defence of the interrupted purpose",prerequisites:[],routes:{},duration:Math.ceil(.04*QUANTA),goods:{},reference:false};o.key=optionKey(o);options.push(o);
    }
    const compared:Compared[]=[];const baseline=forecast(review,reference,meter,3);if(!baseline)return null;
    for(const o of options){const c=o.reference?baseline:forecast(review,o,meter,3);if(!c)continue;const gate=o.reference?null:feasibility(review,{option:o,consequences:c} as Compared,true);compared.push({option:o,consequences:c,feasible:gate===null,gate,riskPass:c.severeProbability<=.12+.06*state.dispositions.rT,value:o.reference?0:preference(c,baseline,state.dispositions,review.quietRequirement(),[]),error:0,errors:c.blocks.map(()=>0)});}
    const result=arbitrate(compared,.12+.06*state.dispositions.rT);
    const selected=result.winner.option.reference?null:authorization(review,state,result.winner.option,account.key);
    if(selected)selected.source="bounded-safety-reflex";
    const trace:DecisionTrace={actor:review.owner,at:review.time,epoch:state.epoch,causes:["danger"],signature,effort:copy(account),drives:options.slice(1).map(o=>({objective:o.objective,urgency:1,admitted:true})),agenda:options.slice(1).map(o=>o.objective),methods:options.slice(1).map(o=>o.method),bindings:copy(options),dependencies:[],premises:{self:review.self,geographyId:review.geographyId,quietEstimate:review.quietRequirement(),ownedInputs:ownedLots(review,"food")},evidence:[{subject:evidence!.subject,property:evidence!.property,version:evidence!.version,observedAt:evidence!.observedAt,value:copy(evidence!.value)}],compared:copy(compared),winner:result.winner.option.key,rejected:result.rejected?.option.key??null,rule:result.rule,margin:result.margin,selected,deferrals:[]};
    state.traces.push(copy(trace));if(state.traces.length>TRACE_WINDOW)state.traces.shift();return trace;
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
      projects:[],
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
      trialCursor: null,
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
    const opportunities = explorationOptions(review, s, meter);
    const allDrives = [
      ...drives(review, page.lots),
      ...(review.bestMethod("service:capital")&&review.places("service-use",1).entries.length?[{objective:{kind:"service" as const,service:"capital",quantity:1},urgency:.1}]:[]),
      ...opportunities.map((o) => {
        const experiment = o.steps.find(
          (step) =>
            (step.family === "Work" || step.family === "Attend") &&
            step.experiment,
        );
        const process =
          experiment &&
          (experiment.family === "Work" || experiment.family === "Attend")
            ? explorationWeight(review, experiment.experiment!)
            : 0;
        return {
          objective: o.objective,
          urgency:
            (o.informationValue ?? 0) +
            process * (1 - bodySignals(review).enjoyment) ** 2,
        };
      }),
    ];
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
    for (const item of admitted) {
      const opportunity = opportunities.find(
        (o) => effectOf(o.objective) === effectOf(item.objective),
      );
      const choices = item.objective.kind==="service"&&item.objective.service==="capital"?capitalOptions(review,binder,meter):opportunity
        ? [opportunity]
        : binder
            .admission(effectOf(item.objective))
            .map((method) => binder.bind(item.objective, method));
      for (const o of choices) {
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
        if(o.status==="computationally-deferred"&&o.reason.includes("frontier")) {
          s.projects??=[];
          if(s.projects.length<2&&!s.projects.some(p=>canonical(p.root)===canonical(o.objective)))s.projects.push(ProjectFrontier.found(o.objective));
        }
        if (o.status === "computationally-deferred") deferrals.push(o.reason);
      }
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
    if (opportunities.length) {
      const shorts = primitives
        .filter((o) => o.status === "executable" && o.duration < QUANTA)
        .sort((a, b) => a.duration - b.duration || compareKey(a.key, b.key));
      // Spend descriptor work for at most two serial alternatives. A known
      // discretionary end may follow another already-bound short end. Their
      // entire paid schedule (including upkeep) competes with each primitive.
      for (const prefix of shorts.slice(0, 2)) {
        const suffix = shorts.find(
          (o) => effectOf(o.objective) !== effectOf(prefix.objective),
        );
        const upkeep = primitives.find(
          (o) =>
            o.status === "executable" &&
            o.duration >= QUANTA &&
            effectOf(o.objective) !== effectOf(prefix.objective) &&
            effectOf(o.objective) !==
              effectOf(suffix?.objective ?? prefix.objective),
        );
        if (!suffix || !upkeep || !meter.spend("descriptor")) continue;
        const combined = copy(prefix);
        append(combined, copy(suffix));
        append(combined, copy(upkeep));
        combined.reason =
          "explicit serial alternatives from this admitted agenda; all prefixes paid";
        bound.push(combined);
      }
    }
    for(const project of s.projects??[]) {
      const key=canonical([s.actor,project.key]);
      let frontier=this.projectFrontiers.get(key);if(!frontier){frontier=new ProjectFrontier(project,this.catalogue);this.projectFrontiers.set(key,frontier);}
      const leaf=frontier.advance(review,meter);
      const method=leaf?this.catalogue.get(leaf.method):null;
      if(leaf&&method){const option=binder.bind(leaf.objective,method);option.project=project.key;bound.push(option);}
      else if(project.status==="computationally-deferred")deferrals.push(project.reason);
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
    // The ordinary comparison cursor also reaches alternative bindings when
    // many distinct ends fill the panel; no source has a protected action slot.
    const remaining = [...first.slice(2), ...extras];
    const rotating = remaining.length
      ? remaining[(s.comparisonCursor - 1) % remaining.length]
      : undefined;
    const candidates = [
      reference,
      ...new Set([
        ...first.slice(0, 2),
        ...(rotating ? [rotating] : []),
        ...first.slice(2),
        ...fairExtras,
      ]),
    ].slice(0, 6);
    for (const o of bound.filter(
      (o) => o.status === "executable" && !candidates.includes(o),
    )) {
      o.status = "computationally-deferred";
      o.reason = "full comparison admission cap";
      deferrals.push(o.reason);
    }
    const horizon=candidates.some(o=>(o.capital?.length??0)>0)?12:3;
    const commonReference=horizon===3?refForecast:forecast(review,reference,meter,horizon,page.lots);
    if(!commonReference)throw Error("Mandatory common reference forecast exhausted");
    const compared: Compared[] = [];
    const sharedErrors = new Map<string, number>();
    for (const o of candidates) {
      const c = o.reference
        ? commonReference
        : forecast(review, o, meter, horizon, page.lots);
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
          r = commonReference.blocks.find((r) => r.start <= mid && r.end >= mid)!;
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
      if (c.tail.value !== commonReference.tail.value)
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
          commonReference,
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
    s.consulted = copy([
      ...binder.dependencies,
      ...opportunities.flatMap((o) => [
        ...o.dependencies,
        ...(o.valuationDependencies ?? []),
      ]),
    ]);
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
      dependencies: copy(s.consulted),
      premises: {
        self: copy(review.self),
        geographyId: review.geographyId,
        quietEstimate: review.quietRequirement(),
        ownedInputs: copy(page.lots),
      },
      evidence: [
        ...s.consulted,
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
  if (suffix.optionalDuration)
    prefix.optionalDuration =
      (prefix.optionalDuration ?? 0) + suffix.optionalDuration;
  if (suffix.informationValue)
    prefix.informationValue =
      (prefix.informationValue ?? 0) + suffix.informationValue;
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
      ...(["stocks", "own-local-stocks"].includes(d.property)
        ? {
            valueFingerprint: digest(
              review.belief(d.subject, d.property)?.value,
            ),
          }
        : {}),
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
    repairScope: { moveTargets: o.steps.flatMap(step=>step.family==="Move"?[{...step.target}]:[]), bindings: {} },
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
    (s.trialCursor !== null && typeof s.trialCursor !== "string") ||
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
