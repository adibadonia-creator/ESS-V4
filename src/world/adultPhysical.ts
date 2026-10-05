import type {StorageLaw} from "./storage";
import type { MaterialLaw } from "./material";
import effects from "../content/material-effects.json";
// Startup compilation; runtime lookup touches only the matching trigger.
const EFFECT_INDEX = new Map(
  effects.map((e) => [`${e.operation}:${e.kind}`, e]),
);
import {
  COMPATIBLE_OPERATIONS,
  MATERIAL_KINDS,
  OPERATION_INDEX,
  MATERIAL_KIND_INDEX,
  EXPLORATION,
} from "../content/exploration";
import { pleasantWeight, decayed } from "../laws/enjoyment";
import type { ExplorationOutcome } from "../evidence/types";
import { EXTRACTION_INDEX } from "../content/extraction";
import type { Operation, Task } from "../runtime/types";
import { QUANTA } from "../kernel/time";
import { math } from "../kernel/numerics";
import type { Counters } from "../kernel/counters";
import type { GoodsLedger } from "./goods";
import {
  ability,
  adultBody,
  accumulateBody,
  cargoNominal,
  closeBody,
  exposeLeisure,
  leisureWeight,
  learn,
  learningRates,
  materialiseBody,
  reanchorBody,
  validateBody,
  validateBodyAt,
  type Body,
  type Masteries,
  type AdultCapability,
  competence,
} from "./body";
import { depletionSd, stockAt, type ResourceSite } from "./resources";
import type { Point } from "./terrain";
export interface PhysicalSegment {
  actor: string;
  taskId: string;
  start: number;
  end: number;
  remainingEnd: number;
  category: string;
  compulsory: boolean;
  load: number;
  effort: number;
  pleasant: number;
  descriptor: string;
  rate: number;
  site: string | null;
  method: string | null;
  output: number;
  paidOutputAt: number;
  learning: Masteries | null;
  practice: Partial<Masteries> | null;
  from: string | null;
  reservation: string | null;
  good: string | null;
  reason: string | null;
  workObject?: string;
  craftCompetence?: number;
  toolScope?: string;
  maintenance?:{from:string;good:string;rate:number;quantity:number;reservation:string;at:number;consumed:number};
}
export interface AdultPhysicalState {
  bodies: Body[];
  sites: ResourceSite[];
  segments: PhysicalSegment[];
}
export interface PhysicalPort {
  now(): number;
  engage?(actor:string,target:string,duration:number):boolean;
  remainingGoods?(actor:string,good:string):number;
  workRadiusKm: number;
  position(actor: string): Point;
  legitimate(actor: string): boolean;
  knownMethod(actor: string, method: string): boolean;
  rate(
    actor: string,
    method: string,
    context: string,
    output: number,
    paidSd: number,
    provenance: string,
    cognitive: number,
    field: number,
  ): void;
  observeStock(
    actor: string,
    site: string,
    kind: string,
    good: string,
    stock: number,
    cognitive: number,
    field: number,
  ): void;
  reference(actor: string, subject: string): string | null;
  fact(
    actor: string,
    subject: string,
    property: string,
    value: unknown,
    context: string,
  ): void;
  source(
    to: string,
    good: string,
    quantity: number,
    production?: boolean,
  ): void;
  recipeInput(actor: string, good: string, quantity: number): void;
  effectInstalled(id: string): boolean;
  methodConfidence(actor: string, method: string, context: string): number;
  frustration(actor: string, context: string): number;
  outcome(actor: string, outcome: ExplorationOutcome, provenance: string): void;
  consume(
    actor: string,
    from: string,
    good: string,
    quantity: number,
    reservation: string,
  ): void;
  reserve(
    actor: string,
    from: string,
    good: string,
    quantity: number,
    expires: number,
  ): string;
  schedule(actor: string, at: number): void;
}
// World law owner. The runtime supplies an already-selected step; no choices are made here.
export class AdultPhysical {
  readonly state: AdultPhysicalState;
  private segmentSlots = new Map<string, number>();
  private bodies = new Map<string, Body>();
  private sites = new Map<string, ResourceSite>();
  private active = new Map<string, PhysicalSegment>();
  private workers = new Map<string, Set<string>>();
  constructor(
    private port: PhysicalPort,
    private goods: GoodsLedger,
    private counts: Counters,
    state: AdultPhysicalState = { bodies: [], sites: [], segments: [] },
    private materials?: MaterialLaw,
    private storage?:StorageLaw,
  ) {
    this.state = state;
    for (const b of state.bodies) {
      validateBodyAt(b, this.port.now());
      if (this.bodies.has(b.actor)) throw Error("Duplicate body");
      this.bodies.set(b.actor, b);
    }
    for (const s of state.sites) {
      const def = EXTRACTION_INDEX.resource(s.kind);
      if (
        !def ||
        s.capacity !== def.capacity ||
        s.renewal !== def.renewal ||
        !Number.isSafeInteger(s.anchor.at) ||
        s.anchor.at > this.port.now() ||
        !Number.isFinite(s.anchor.stock) ||
        s.anchor.stock < 0 ||
        s.anchor.stock > s.capacity ||
        !Number.isFinite(s.anchor.demand) ||
        s.anchor.demand < 0 ||
        ![s.point.x, s.point.y].every(Number.isFinite) ||
        this.sites.has(s.key)
      )
        throw Error("Invalid resource anchor");
      this.sites.set(s.key, s);
    }
    for (const [i, s] of state.segments.entries()) {
      if (
        !this.bodies.has(s.actor) ||
        this.active.has(s.actor) ||
        !Number.isSafeInteger(s.start) ||
        s.start > this.port.now() ||
        !Number.isSafeInteger(s.end) ||
        s.end < this.port.now() ||
        s.remainingEnd < s.end ||
        typeof s.compulsory !== "boolean" ||
        s.rate < 0 ||
        !Number.isFinite(s.rate) ||
        s.output < 0 ||
        !Number.isFinite(s.output) ||
        (s.site && !this.sites.has(s.site))
      )
        throw Error("Invalid physical segment");
      this.segmentSlots.set(s.actor, i);
      this.active.set(s.actor, s);
      if (s.site) this.addWorker(s.site, s.actor);
    }
    for (const s of state.sites) {
      let demand = 0;
      for (const actor of [...(this.workers.get(s.key) ?? [])].sort())
        demand += this.active.get(actor)!.rate;
      if (demand !== s.anchor.demand)
        throw Error("Resource demand/backing mismatch");
    }
  }
  private addWorker(site: string, actor: string) {
    const set = this.workers.get(site) ?? new Set<string>();
    set.add(actor);
    this.workers.set(site, set);
  }
  harm(actor:string,wound:number,fatal=false) {
    const b=this.bodies.get(actor);if(!b||!b.alive)return;
    const v=materialiseBody(b,this.port.now());b.anchor.w=Math.min(1,v.w+wound);b.anchor.c=v.c;b.anchor.at=this.port.now();
    if(fatal||b.anchor.w>=1)b.alive=false;
    reanchorBody(b,this.port.now(),this.active.get(actor)?.load??0,this.active.get(actor)?.from?this.active.get(actor)!.rate:0);this.experience(actor);
  }
  force(actor:string){const b=this.bodies.get(actor);if(!b||!b.alive)return 0;const v=materialiseBody(b,this.port.now());return ability(b,{B:.4,A:.1,Fight:.5},.70)*math.sqrt(v.c)*(1-v.w);}
  body(actor: string) {
    return this.bodies.get(actor) ?? null;
  }
  found(
    actor: string,
    class_: "M" | "F",
    profile?: {
      capability: AdultCapability;
      mastery: Masteries;
      wound?: number;
      initial?: {
        condition: number;
        fatigue: number;
        enjoyment: number;
        satiation?: number;
      };
    },
  ) {
    if (this.port.now() !== 0 || this.bodies.has(actor))
      throw Error("Adult profiles are founding fixture inputs only");
    const b = adultBody(actor, class_);
    if (profile) {
      b.capability = { ...profile.capability };
      b.mastery = { ...profile.mastery };
      b.anchor.w = profile.wound ?? 0;
      if (profile.initial) {
        b.anchor.c = profile.initial.condition;
        b.d = profile.initial.fatigue;
        b.f = profile.initial.enjoyment;
        b.satiation = profile.initial.satiation ?? 0;
      }
      reanchorBody(b, 0, 0, 0);
      validateBodyAt(b, this.port.now());
    }
    this.bodies.set(actor, b);
    this.state.bodies.push(b);
    this.goods.resolveAdultCargo(actor, cargoNominal(b), this.port.now());
    return b;
  }
  addSite(
    key: string,
    kind: string,
    point: Point,
    stock: number,
    materialKind?: string,
  ) {
    const def = EXTRACTION_INDEX.resource(kind);
    if (
      !def ||
      this.sites.has(key) ||
      stock < 0 ||
      stock > def.capacity ||
      !Number.isFinite(stock)
    )
      throw Error("Invalid resource site");
    const s: ResourceSite = {
      key,
      kind,
      ...(materialKind ? { materialKind } : {}),
      point: { ...point },
      anchor: { at: this.port.now(), stock, demand: 0 },
      capacity: def.capacity,
      renewal: def.renewal,
    };
    this.sites.set(key, s);
    this.state.sites.push(s);
    return s;
  }
  site(key: string) {
    return this.sites.get(key) ?? null;
  }
  observeSite(actor: string, key: string) {
    const s = this.sites.get(key);
    if (!s) return;
    const p = this.port.position(actor);
    if (
      math.sqrt((p.x - s.point.x) ** 2 + (p.y - s.point.y) ** 2) >
      this.port.workRadiusKm
    )
      throw Error("No local site observation");
    this.port.fact(
      actor,
      key,
      "existence",
      true,
      "direct local resource observation",
    );
    this.port.fact(
      actor,
      key,
      "location",
      s.point,
      "direct local resource observation",
    );
    this.port.fact(
      actor,
      key,
      "resource-kind",
      s.kind,
      "direct local resource observation",
    );
    if (s.materialKind) {
      const material = MATERIAL_KIND_INDEX.get(s.materialKind);
      this.port.fact(
        actor,
        key,
        "material-kind",
        s.materialKind,
        "perceived material kind",
      );
      this.port.fact(
        actor,
        key,
        "perceptible-properties",
        material?.perceptible.join(",") ?? "",
        "perceived material properties",
      );
    }
    const b = this.body(actor),
      def = EXTRACTION_INDEX.resource(s.kind)!;
    this.port.observeStock(
      actor,
      key,
      s.kind,
      def.good,
      stockAt(s, this.port.now()),
      b?.capability.C ?? 1,
      b ? competence(b, "Field") : 1,
    );
  }
  private updateDemand(s: ResourceSite) {
    let demand = 0;
    for (const actor of [...(this.workers.get(s.key) ?? [])].sort())
      demand += this.active.get(actor)!.rate;
    s.anchor.demand = demand;
  }
  private settleSite(s: ResourceSite) {
    const now = this.port.now(),
      a = s.anchor,
      dt = (now - a.at) / QUANTA,
      until = Math.min(dt, depletionSd(s));
    if (dt < 0) throw Error("Resource settlement regression");
    if (dt === 0) return;
    this.counts.resourceMaterialisations++;
    // Demand shares settle symmetrically from the same anchor, in semantic order.
    let unextracted = 0;
    for (const actor of [...(this.workers.get(s.key) ?? [])].sort()) {
      const seg = this.active.get(actor)!;
      this.settleMaintenance(seg);
      const wanted = seg.rate * until,
        q = Math.min(
          wanted,
          Math.max(
            0,
            this.goods.carriedContainer(actor).capacityCu -
              this.goods.load(this.goods.carriedContainer(actor).key),
          ) / this.goodBulk(seg.good!),
        );
      unextracted += wanted - q;
      if (q > 0) {
        this.port.source(this.goods.carriedContainer(actor).key, seg.good!, q);
        seg.output += q;
        if(seg.maintenance)this.storage?.beginFlow(seg.maintenance.from,seg.maintenance.good,seg.maintenance.rate);
        this.counts.workGoodsTransactions++;
      }
      seg.paidOutputAt = now;
    }
    s.anchor = {
      at: now,
      stock: Math.min(s.capacity, stockAt(s, now) + unextracted),
      demand: a.demand,
    };
  }
  private scheduleSite(s: ResourceSite, skip?: string) {
    const now = this.port.now(),
      depletion = depletionSd(s);
    for (const actor of [...(this.workers.get(s.key) ?? [])].sort()) {
      const seg = this.active.get(actor)!;
      if (seg.end <= now) continue;
      const free = Math.max(
        0,
        this.goods.carriedContainer(actor).capacityCu -
          this.goods.load(this.goods.carriedContainer(actor).key),
      );
      const good = this.goodBulk(seg.good!),
        cargo = seg.rate > 0 ? free / (good * seg.rate) : Infinity;
      const limit = Math.min(
        (seg.remainingEnd - now) / QUANTA,
        depletion,
        cargo,
      );
      seg.end = Math.max(now + 1, now + Math.ceil(limit * QUANTA));
      seg.reason =
        depletion <= cargo && depletion < (seg.remainingEnd - now) / QUANTA
          ? "resource depleted"
          : cargo < (seg.remainingEnd - now) / QUANTA
            ? "cargo full"
            : null;
      if (actor !== skip) this.port.schedule(actor, seg.end);
    }
  }
  private goodBulk(good: string) {
    return this.goods.bulk(good);
  }
  begin(
    task: Task,
    step: Operation,
    remaining: number,
  ): { ok: true; end: number } | { ok: false; observed: string } {
    const b = this.bodies.get(task.actor),
      now = this.port.now();
    const physical =
      step.family === "Work" ||
      step.family === "Recover" || step.family === "Engage" ||
      (step.family === "Transfer" && step.use === "consume");
    if (!b)
      return physical
        ? { ok: false, observed: `not-yet-implemented law: ${step.family}` }
        : { ok: true, end: now + remaining };
    if (this.active.has(task.actor))
      throw Error("Overlapping physical operation");
    const seg: PhysicalSegment = {
      actor: task.actor,
      taskId: task.taskId,
      start: now,
      end: now + remaining,
      remainingEnd: now + remaining,
      category: "handling",
      compulsory: false,
      load: 0.1,
      effort: 0.1,
      pleasant: 0,
      descriptor: "",
      rate: 0,
      site: null,
      method: null,
      output: 0,
      paidOutputAt: now,
      learning: null,
      practice: null,
      from: null,
      reservation: null,
      good: null,
      reason: null,
    };
    if (step.family === "Move") {
      seg.category = "travel";
      seg.load = 0.35;
      seg.effort = 0.7;
      seg.practice = { Field: 0.7, Organise: 0.3 };
      const v = materialiseBody(b, now);
      seg.learning = learningRates(b, v.c, v.w, seg.practice, 1);
    }
    if (step.family === "Recover") {
      if (!this.port.legitimate(task.actor))
        return {
          ok: false,
          observed: "no physically legitimate recovery location",
        };
      if (!["rest", "leisure"].includes(step.mode ?? step.law))
        return { ok: false, observed: "unknown recovery mode" };
      const mode = step.mode ?? (step.law === "leisure" ? "leisure" : "rest"),
        p = this.port.position(task.actor);
      // A passable current point is an explicit temporary bivouac, not protection.
      seg.category = mode;
      seg.load = 0;
      seg.effort = 0;
      if (mode === "leisure") {
        seg.descriptor = `leisure:${Math.floor(p.x / 3)}:${Math.floor(p.y / 3)}:Recover`;
        seg.pleasant = leisureWeight(b, seg.descriptor, now);
      }
    }
    if (step.family === "Transfer" && step.use === "consume") {
      const from = this.port.reference(task.actor, step.from),
        res = task.reservations.find(
          (r) => r.subject === step.from && r.good === step.good && this.goods.reservation(r.key).status==="active" && this.goods.reservation(r.key).remaining>0,
        );
      if (
        !from ||
        this.goods.get(from).custodian !== task.actor ||
        this.goods.nutrition(step.good) <= 0
      )
        return {
          ok: false,
          observed: "consumption lacks authorised local food",
        };
      const p = this.port.position(task.actor),
        q = this.goods.location(from);
      if (
        math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2) > this.port.workRadiusKm
      )
        return { ok: false, observed: "food inaccessible" };
      seg.from = from;
      seg.good = step.good;
      seg.rate = step.quantity / (step.duration / QUANTA);
      this.storage?.settle(from);
      const available = this.goods.available(from, step.good);
      if (!res && available <= 0)
        return { ok: false, observed: "food exhausted" };
      seg.reservation =
        res?.key ??
        this.port.reserve(
          task.actor,
          from,
          step.good,
          Math.min(step.quantity, available),
          seg.end + 1,
        );
      if (!res)
        task.reservations.push({
          key: seg.reservation,
          subject: step.from,
          good: step.good,
        });
      const r = this.goods.reservation(seg.reservation),
        backing = Math.min(
          r.remaining,
          this.goods.get(from).stocks[step.good] ?? 0,
        );
      if (r.status !== "active" || backing <= 0)
        return { ok: false, observed: "food exhausted" };
      const until=this.storage?.beginFlow(from,step.good,seg.rate)??backing/seg.rate;
      if (Math.min(backing/seg.rate,until)*QUANTA < remaining) {
        seg.end = now + Math.max(1,Math.ceil(Math.min(backing/seg.rate,until)*QUANTA));
        const dt=(seg.end-now)/QUANTA,lambda=this.storage?.rate(from,step.good)??0;
        seg.rate=until<backing/seg.rate&&lambda>0?lambda*(this.goods.get(from).stocks[step.good]??0)/math.expm1(lambda*dt):backing/dt;
        this.storage?.beginFlow(from,step.good,seg.rate);
        seg.reason = "food exhausted";
      }
    }
    if (
      (step.family === "Work" ||
        step.family === "Attend" ||
        step.family === "Move") &&
      step.experiment
    ) {
      const context = `${step.experiment.form}:${step.experiment.operation}:${step.experiment.targetKind}`;
      seg.descriptor = step.experiment.descriptor;
      const exposure = b.exposures[seg.descriptor];
      const count = exposure
        ? decayed(exposure.count, exposure.at, now, 36 * QUANTA)
        : 0;
      seg.pleasant = pleasantWeight(
        EXPLORATION.familyWeight,
        EXPLORATION.unfamiliaritySensitivity,
        count,
        b.familySatiation.exploration ?? 0,
        this.port.frustration(task.actor, context),
      );
    }
    if(step.family==="Engage"){
      if(!step.target || !this.port.reference(task.actor,step.target))return {ok:false,observed:"engagement target not personally bound"};
      seg.category="engage";seg.load=.7;seg.effort=1;seg.practice={Fight:1};const v=materialiseBody(b,now);seg.learning=learningRates(b,v.c,v.w,seg.practice,1);
    }
    const recipe = step.family === "Work" ? this.materials?.recipes.get(step.law) : null;
    if (step.family === "Work" && recipe) {
      if (!this.port.knownMethod(task.actor, task.method)) return {ok:false,observed:"making method not personally known"};
      const target=step.qualityTarget??1,prep=step.preparation??0;
      if((target>1&&b.mastery.Make<.2)||target>2)return {ok:false,observed:"making quality gate unavailable"};
      if(!this.materials!.pending(task.actor,recipe.id)&&Object.entries(recipe.inputs).some(([good,q])=>q*(1+prep)>(this.port.remainingGoods?.(task.actor,good)??task.authorised.goods[good]??0)+1e-9))return {ok:false,observed:"recipe inputs outside remaining envelope"};
      if(step.workObject){const pending=this.materials!.pending(task.actor,recipe.id);if(!pending||this.port.reference(task.actor,step.workObject)!==pending.key)return {ok:false,observed:"located work no longer accessible"};}
      const w = this.materials!.start(task.actor,recipe.id,undefined,target,prep);
      if (!w) return {ok:false,observed:"making inputs unavailable"};
      const v = materialiseBody(b,now);
      seg.method=recipe.id;seg.workObject = w.key;
      seg.craftCompetence = competence(b,"Make");
      seg.rate = ability(b,{A:.15,Make:.85},.70) * math.pow(v.c,.7) * (1-v.w) * (1-.2*b.d);
      if (seg.rate <= 0) return {ok:false,observed:"no current making capacity"};
      seg.category="work";seg.load=.45;seg.effort=.6;
      seg.practice={Make:1};seg.learning=learningRates(b,v.c,v.w,seg.practice,1);
      seg.end=Math.min(seg.end,now+Math.max(1,Math.ceil((w.required-w.progress)/seg.rate*QUANTA)));
      this.active.set(task.actor,seg);this.segmentSlots.set(task.actor,this.state.segments.length);this.state.segments.push(seg);
    } else if (
      step.family === "Work" &&
      (step.experiment || OPERATION_INDEX.has(step.law))
    ) {
      const operation = OPERATION_INDEX.get(step.law);
      const ref = step.site ? this.port.reference(task.actor, step.site) : null;
      const site = ref ? this.sites.get(ref) : null;
      const p = this.port.position(task.actor);
      // Public prerequisites only. Hidden material effects are not read here.
      if (
        !operation ||
        !site ||
        math.sqrt((p.x - site.point.x) ** 2 + (p.y - site.point.y) ** 2) >
          this.port.workRadiusKm ||
        stockAt(site, now) < 1 ||
        this.goods.available(
          this.goods.carriedContainer(task.actor).key,
          operation.hammer,
        ) < 1
      )
        return {
          ok: false,
          observed: "visible trial input or held hammer unavailable",
        };
      if (!this.port.knownMethod(task.actor, task.method))
        return {
          ok: false,
          observed: "operation not authorised from personal knowledge",
        };
      seg.category = "work";
      seg.compulsory = step.compulsory ?? false;
      if (seg.compulsory) seg.pleasant = 0;
      seg.load = operation.load;
      seg.effort = operation.effort;
      this.active.set(task.actor, seg);
      this.segmentSlots.set(task.actor, this.state.segments.length);
      this.state.segments.push(seg);
    } else if (step.family === "Work") {
      this.counts.methodRecordsConsulted++;
      const m = EXTRACTION_INDEX.method(step.law),
        ref = step.site ? this.port.reference(task.actor, step.site) : null,
        s = ref ? this.sites.get(ref) : null;
      if (
        !this.port.knownMethod(task.actor, step.law) ||
        !m ||
        !s ||
        m.siteKind !== s.kind
      )
        return { ok: false, observed: "known method/site binding unavailable" };
      if (m.requiredItemScope && !this.materials?.activeItem(task.actor,m.requiredItemScope)) return {ok:false,observed:"compatible held tool unavailable"};
      seg.toolScope = m.requiredItemScope ?? "extraction";
      const p = this.port.position(task.actor);
      if (
        math.sqrt((p.x - s.point.x) ** 2 + (p.y - s.point.y) ** 2) >
        this.port.workRadiusKm
      )
        return { ok: false, observed: "outside work radius" };
      this.settleSite(s);
      if (s.anchor.stock <= 0) {
        this.observeSite(task.actor, s.key);
        return { ok: false, observed: "resource empty" };
      }
      if (
        this.goods.load(this.goods.carriedContainer(task.actor).key) >=
        this.goods.carriedContainer(task.actor).capacityCu
      )
        return { ok: false, observed: "cargo full" };
      const v = materialiseBody(b, now),
        def = EXTRACTION_INDEX.resource(s.kind)!;
      const z = def.sparseFactor
        ? def.habitat * (0.25 + (0.75 * s.anchor.stock) / s.capacity)
        : def.habitat;
      seg.rate =
        m.referenceRate *
        ability(b, m.weights as Record<string, number>, m.classRatio) *
        math.pow(v.c, m.conditionExponent) *
        math.pow(1 - v.w, m.woundExponent) *
        (1 - m.fatiguePenalty * b.d) *
        z * (this.materials?.effect(task.actor,seg.toolScope) ?? 1);
      seg.category = "work";
      seg.compulsory = step.compulsory ?? false;
      seg.load = m.load;
      seg.effort = m.effort;
      seg.site = s.key;
      seg.method = m.id;
      seg.good = m.good;
      seg.practice = m.practice;
      seg.learning = learningRates(
        b,
        v.c,
        v.w,
        m.practice,
        seg.rate > 0 ? 1 : 0,
      );
      this.active.set(task.actor, seg);
      this.segmentSlots.set(task.actor, this.state.segments.length);
      this.state.segments.push(seg);
      this.addWorker(s.key, task.actor);
      this.updateDemand(s);
      this.scheduleSite(s, task.actor);
      this.counts.workSegmentsStarted++;
    } else {
      this.active.set(task.actor, seg);
      this.segmentSlots.set(task.actor, this.state.segments.length);
      this.state.segments.push(seg);
    }
    if(step.maintenance){
      const m=step.maintenance,from=this.port.reference(task.actor,m.from);
      if(from&&this.goods.get(from).custodian===task.actor&&this.goods.nutrition(m.good)>0){
        const p=this.port.position(task.actor),q=this.goods.location(from);
        if((p.x-q.x)**2+(p.y-q.y)**2<=this.port.workRadiusKm**2){
          this.storage?.settle(from);
          const quantity=Math.min(Math.max(0,m.quantity-(task.maintenanceForStep??0)),this.goods.available(from,m.good),this.port.remainingGoods?.(task.actor,m.good)??0);
          if(quantity>0){const reservation=this.port.reserve(task.actor,from,m.good,quantity,seg.end+1);task.reservations.push({key:reservation,subject:m.from,good:m.good});seg.maintenance={from,good:m.good,rate:m.rate,quantity,reservation,at:now,consumed:0};
            const until=this.storage?.beginFlow(from,m.good,m.rate)??quantity/m.rate;seg.end=Math.min(seg.end,now+Math.max(1,Math.floor(Math.min(until,quantity/m.rate)*QUANTA)));}
        }
      }
    }
    reanchorBody(b, now, seg.load, seg.from ? seg.rate : seg.maintenance?.rate??0);
    this.counts.bodyCommits++;
    this.counts.conditionSegments++;
    this.experience(task.actor);
    return { ok: true, end: seg.end };
  }
  private settleMaintenance(s:PhysicalSegment){
    const m=s.maintenance;if(!m)return;
    const now=this.port.now();this.storage?.endFlow(m.from);
    const r=this.goods.reservation(m.reservation);
    const available=Math.max(0,(this.goods.get(m.from).stocks[m.good]??0)-this.goods.reserved(m.from,m.good,m.reservation));
    const q=Math.min(m.rate*(now-m.at)/QUANTA,m.quantity-m.consumed,r.status==="active"?r.remaining:0,available);
    if(q>0)this.port.consume(s.actor,m.from,m.good,q,m.reservation);
    m.consumed+=q;m.at=now;
  }
  paid(task: Task, start: number, end: number) {
    const b = this.bodies.get(task.actor),
      s = this.active.get(task.actor);
    if (!b || !s) return;
    accumulateBody(
      b,
      end - start,
      s.effort,
      s.category === "rest",
      s.pleasant,
      s.compulsory,
      s.descriptor && s.category !== "leisure" ? "exploration" : "leisure",
    );
    if (s.category === "rest" || s.category === "leisure")
      this.counts.recoverPaidSegments++;
  }
  end(task: Task, final: boolean) {
    const s = this.active.get(task.actor),
      b = this.bodies.get(task.actor),
      now = this.port.now();
    if (!s || !b) return { quantity: 0 };
    if (s.site) {
      this.counts.workSettlements++;
      if (s.reason && now >= s.end) this.counts.extractionBoundaries++;
      const site = this.sites.get(s.site)!;
      this.settleSite(site);
      this.workers.get(s.site)!.delete(task.actor);
      this.updateDemand(site);
      this.scheduleSite(site);
    }
    this.settleMaintenance(s);
    const maintenanceCost=s.maintenance?.consumed??0;
    let quantity = s.output;let outputSubject:string|undefined;
    const costs: Record<string, number> = s.maintenance?{[s.maintenance.good]:maintenanceCost}:{};
    if (s.workObject && this.materials) {
      const paidSd=(now-s.start)/QUANTA;
      const made=this.materials.settle(s.workObject,s.rate*paidSd,s.craftCompetence!);
      if(paidSd>0)this.port.rate(task.actor,s.method!,"making",s.rate*paidSd,paidSd,s.workObject,b.capability.C,competence(b,"Make"));
      quantity=made.quantity;if("output" in made)outputSubject=String(made.output);for(const [good,q] of Object.entries(made.costs))costs[good]=(costs[good]??0)+q;
    }
    if (s.site && s.toolScope) this.materials?.wear(task.actor,s.toolScope,(now-s.start)/QUANTA);
    const step = task.steps[task.cursor];
    if(step?.family==="Engage" && final && now>=s.remainingEnd && step.target){
      if(!this.port.engage?.(task.actor,this.port.reference(task.actor,step.target)!, (task.paidForStep)/QUANTA))s.reason="engagement target no longer local";
    }
    if (step?.family === "Work" && OPERATION_INDEX.has(step.law)) {
      const completed = final && now >= s.remainingEnd;
      if (completed) {
        const operation = OPERATION_INDEX.get(step.law)!;
        const site = this.sites.get(
          this.port.reference(task.actor, step.site!)!,
        )!;
        this.settleSite(site);
        if (site.anchor.stock >= 1) {
          site.anchor.stock--;
          this.updateDemand(site);
          this.port.source(
            this.goods.carriedContainer(task.actor).key,
            operation.input,
            1,
          );
          this.port.recipeInput(task.actor, operation.input, 1);
          costs[operation.input] = 1;
          // The first successful-schema lookup is AFTER all required paid work.
          const candidate = EFFECT_INDEX.get(
            `${step.law}:${site.materialKind}`,
          );
          const effect =
            candidate && this.port.effectInstalled(candidate.id)
              ? candidate
              : undefined;
          quantity = effect
            ? effect.yield *
              (step.experiment
                ? EXPLORATION.trialYield
                : 0.7 +
                  0.3 *
                    this.port.methodConfidence(
                      task.actor,
                      task.method,
                      `T1:${step.law}:${site.materialKind ?? site.kind}`,
                    ))
            : 0;
          if (quantity > 0 && effect) {
            this.port.source(
              this.goods.carriedContainer(task.actor).key,
              effect.output,
              quantity,
              true,
            );
            s.good = effect.output;
          }
          if (step.experiment)
            this.port.outcome(
              task.actor,
              {
                ...step.experiment,
                target: step.site,
                paid: now - s.start,
                completed: true,
                success: quantity > 0,
                ...(effect
                  ? { method: effect.id, good: effect.output, yield: quantity }
                  : {}),
              },
              `${task.semanticKey}:${task.cursor}:${now}`,
            );
          else
            this.port.outcome(
              task.actor,
              {
                form: "T1",
                operation: step.law,
                targetKind: site.materialKind ?? site.kind,
                descriptor: `use:${task.method}:${step.site}`,
                evidenceVersion: 0,
                paid: now - s.start,
                completed: true,
                success: quantity > 0,
                method: task.method,
                ...(effect ? { good: effect.output, yield: quantity } : {}),
              },
              `${task.semanticKey}:${task.cursor}:${now}`,
            );
          this.observeSite(task.actor, site.key);
        } else if (step.experiment)
          this.port.outcome(
            task.actor,
            {
              ...step.experiment,
              target: step.site,
              paid: now - s.start,
              completed: true,
              success: false,
            },
            `${task.semanticKey}:${task.cursor}:${now}`,
          );
      } else if (step.experiment && now > s.start)
        this.port.outcome(
          task.actor,
          {
            ...step.experiment,
            paid: now - s.start,
            completed: false,
            success: false,
          },
          `${task.semanticKey}:${task.cursor}:${now}`,
        );
    }
    if (
      (step?.family === "Move" || step?.family === "Attend") &&
      step.experiment &&
      now > s.start
    )
      this.port.outcome(
        task.actor,
        {
          ...step.experiment,
          paid: now - s.start,
          completed: false,
          success: false,
        },
        `${task.semanticKey}:${task.cursor}:${now}:paid`,
      );
    if (s.from && s.reservation) {
      this.storage?.endFlow(s.from);
      const r = this.goods.reservation(s.reservation);
      quantity = Math.min((s.rate * (now - s.start)) / QUANTA, r.remaining,this.goods.get(s.from).stocks[s.good!]??0);
      if (quantity > 0) {
        this.port.consume(task.actor, s.from, s.good!, quantity, s.reservation);
        this.counts.consumptionSettlements++;
      }
    }
    if (s.learning && s.practice) {
      learn(b, s.learning, s.practice, (now - s.start) / QUANTA);
      this.counts.learningSettlements++;
      if (s.method && s.site && now > s.start) {
        this.port.rate(
          task.actor,
          s.method,
          this.sites.get(s.site!)!.kind,
          s.output,
          (now - s.start) / QUANTA,
          `${s.taskId}:${task.cursor}:${s.start}`,
          b.capability.C,
          competence(b, "Field"),
        );
        this.observeSite(task.actor, s.site!);
      }
    }
    const exposureKey =
      step && "experiment" in step && step.experiment
        ? task.semanticKey
        : `${s.taskId}:${task.cursor}`;
    if (s.descriptor && now > s.start && b.lastLeisure !== exposureKey) {
      exposeLeisure(b, s.descriptor, now);
      b.lastLeisure = exposureKey;
    }
    this.active.delete(task.actor);
    const slot = this.segmentSlots.get(s.actor)!,
      last = this.state.segments.at(-1)!;
    this.state.segments[slot] = last;
    this.segmentSlots.set(last.actor, slot);
    this.state.segments.pop();
    this.segmentSlots.delete(s.actor);
    reanchorBody(b, now, 0, 0);
    this.counts.bodyCommits++;
    this.counts.conditionSegments++;
    this.experience(task.actor);
    return {
      quantity,
      ...(outputSubject?{outputSubject}:{}),
      ...(s.maintenance?{maintenanceCost}:{}),
      costs,
      ...(s.good ? { good: s.good } : {}),
      ...(final && s.reason && now >= s.end ? { reason: s.reason } : {}),
    };
  }
  closure(actor: string) {
    const b = this.bodies.get(actor);
    if (!b) return;
    closeBody(b, this.port.now());
    reanchorBody(b, this.port.now(), 0, 0);
    this.counts.representativeBodyClosures++;
    this.counts.fatigueClosures++;
    this.counts.enjoymentClosures++;
    this.experience(actor);
  }
  experience(actor: string) {
    const b = this.bodies.get(actor);
    if (!b) return;
    const v = materialiseBody(b, this.port.now());
    this.port.fact(
      actor,
      "self",
      "body-experience",
      {
        class: b.class,
        ageSd: (this.port.now() - b.birth) / QUANTA,
        condition: Math.round(v.c * 20) / 20,
        wounds: v.w,
        fatigue: b.d,
        enjoyment: b.f,
        intake: v.intake,
        activityLoad: this.active.get(actor)?.load ?? 0,
        intervalStart: b.interval.start,
        effortSd: b.interval.effort / QUANTA,
        restSd: b.interval.rest / QUANTA,
        pleasantSd: b.interval.pleasant / QUANTA,
        compulsorySd: b.interval.compulsory / QUANTA,
        leisureSd: b.interval.leisure / QUANTA,
        satiation: b.satiation,
        familySatiation: { ...b.familySatiation },
        familiarity: b.exposures,
        practice: b.practice,
      },
      "experienced own body",
    );
    this.counts.bodyEvidenceDeliveries++;
  }
  analyst(actor: string) {
    const b = this.bodies.get(actor);
    if (!b) return null;
    this.counts.bodyMaterialisations++;
    return {
      ...materialiseBody(b, this.port.now()),
      capability: { ...b.capability },
      mastery: { ...b.mastery },
      practice: { ...b.practice },
    };
  }
}
