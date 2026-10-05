import { MethodIndex, type MethodEntry } from "../content/methods";
import { RecipeIndex } from "../content/recipes";
import { StorageLaw, type StorageState } from "../world/storage";
import { DangerLaw, type DangerState } from "../world/danger";
import { boundedRepair } from "../mind/repair";
import { MaterialLaw, type MaterialState } from "../world/material";
import { stockAt } from "../world/resources";
import { EXTRACTION_INDEX } from "../content/extraction";
import { AdultPhysical, type AdultPhysicalState } from "../world/adultPhysical";
import {
  cargoNominal,
  materialiseBody,
  travelAbility,
  competence,
} from "../world/body";
import {
  CONTENT_HASH,
  EFFORT_PROFILE,
  resolveConfig,
  type PhysicalConfig,
  type SpatialProfile,
} from "../content/profile";
import { canonical, compareKey, digest } from "../kernel/canonical";
import { counters, type Counters } from "../kernel/counters";
import { lineage, type Key } from "../kernel/identity";
import {
  Kernel,
  PHASE,
  compareEvents,
  type Event,
  type KernelState,
} from "../kernel/kernel";
import { entries, validateTree } from "../kernel/index";
import { QUANTA, checkTime, future, sd, type Time } from "../kernel/time";
import { versions } from "../kernel/versions";
import { math } from "../kernel/numerics";
import type { Snapshot } from "../projection/types";
import {
  GoodsLedger,
  type GoodsRequest,
  type GoodsState,
} from "../world/goods";
import {
  Movement,
  positionAt,
  baseSpeed,
  type PersonShell,
  type MotionInputs,
} from "../world/movement";
import {
  beginSearch,
  resumeSearch,
  pullPath,
  segments,
  type SearchState,
} from "../world/routing";
import { SpatialIndex } from "../world/spatial";
import {
  generateTerrain,
  buildRegions,
  cell,
  center,
  changeCell,
  type Terrain,
  type Point,
  type Regions,
} from "../world/terrain";
import {
  EvidenceService,
  beliefKey,
  clone,
  type EvidenceState,
} from "../evidence/service";
import type {
  PersonalView,
  PerceptibleFact,
  ExactSelf,
} from "../evidence/types";
import { TaskRuntime } from "../runtime/runtime";
import type { SelectedIntention, RuntimeState, Task } from "../runtime/types";
import {
  visible,
  visibleTerrain,
  detection,
  entryFraction,
} from "../world/perception";
import { Mind } from "../mind/review";
import type { MindState, WakeCause, Dispositions } from "../mind/types";
import { bodySignals, ownedLots } from "../mind/signals";
type PhysicalEvent =
  | { kind: "predator-tick" }
  | { kind: "animal-harm"; actor: Key; wound: number; fatal: boolean }
  | { kind: "danger-observe" | "mind-safety"; actor: Key }
  | { kind: "leg"; actor: Key; generation: number }
  | { kind: "lease"; reservation: Key }
  | { kind: "contact"; a: Key; b: Key; ga: number; gb: number; radius: number }
  | { kind: "diagnostic"; actor: Key }
  | {
      kind: "perceive";
      actor: Key;
      motion: Key;
      generation: number;
      focus?: Key;
      mandatory?: boolean;
    }
  | { kind: "runtime-boundary"; actor: Key }
  | { kind: "runtime-operation"; taskId: string; event: "operation" | "budget" }
  | { kind: "representative-closure"; actor: Key }
  | {
      kind:
        "mind-periodic" | "mind-review" | "mind-food-crossing" | "mind-repair";
      actor: Key;
    };
interface RouteRequest {
  actor: Key;
  target: Point;
  inputs: MotionInputs;
  search: SearchState;
}
interface ForkMetadata {
  parentCheckpoint: string | null;
  intervention: {
    at: Time;
    reason: string;
    oldConfig: string;
    newConfig: string;
  } | null;
}
interface Save {
  versions: typeof versions;
  contentHash: string;
  configurationHash: string;
  seed: string;
  config: PhysicalConfig;
  time: Time;
  phase: -1;
  fork: ForkMetadata;
  kernel: KernelState<PhysicalEvent>;
  terrain: Record<string, unknown>;
  actors: PersonShell[];
  goods: GoodsState;
  routes: RouteRequest[];
  evidence: EvidenceState;
  runtime: RuntimeState;
  epistemicActors: Key[];
  adultPhysical: AdultPhysicalState;
  materials: MaterialState;
  danger: DangerState;
  storage: StorageState;
  mind: MindState[];
}
const FIELDS = [
  "kind",
  "passable",
  "speed",
  "opaque",
  "elevation",
  "moisture",
  "fertility",
  "geology",
  "drain",
  "flow",
] as const;
export class PhysicalSimulation {
  readonly counters: Counters = counters();
  readonly kernel: Kernel<PhysicalEvent>;
  readonly config: PhysicalConfig;
  private terrain: Terrain;
  private regions: Regions;
  private actors: PersonShell[] = [];
  private byActor = new Map<Key, PersonShell>();
  private ledger: GoodsLedger;
  private movement: Movement;
  private spatial: SpatialIndex;
  private materialKinds: Map<string, PhysicalConfig["materialKinds"][number]>;
  private materialEffects: Set<string>;
  private routes = new Map<Key, RouteRequest>();
  private evidence: EvidenceService;
  private runtime: TaskRuntime;
  private adultPhysical: AdultPhysical;
  private materials: MaterialLaw;
  private danger: DangerLaw;
  private storage: StorageLaw;
  private mind: Mind;
  private epistemicActors = new Set<Key>();
  private carriedByActor = new Map<Key, Key>();
  private fork: ForkMetadata = { parentCheckpoint: null, intervention: null };
  constructor(
    readonly seed: string,
    config = resolveConfig(),
    saved?: Save,
  ) {
    // Own immutable configuration; caller-owned objects cannot change laws later.
    config = freezeProjection(
      JSON.parse(JSON.stringify(config)) as PhysicalConfig,
    );
    this.config = config;
    const catalogue = new MethodIndex(
      config.methods as MethodEntry[],
      new RecipeIndex(config.recipes),
    );
    this.materialKinds = new Map(config.materialKinds.map((k) => [k.id, k]));
    this.materialEffects = new Set(config.materialEffects);
    this.kernel = new Kernel(this.counters, saved?.kernel);
    this.terrain = saved
      ? restoreTerrain(saved.terrain, config)
      : generateTerrain(seed, config);
    this.regions = buildRegions(this.terrain);
    if (saved) {
      this.actors = saved.actors;
      this.fork = saved.fork;
      for (const r of saved.routes) this.routes.set(r.actor, r);
    }
    this.byActor = new Map(this.actors.map((a) => [a.key, a]));
    this.ledger = new GoodsLedger(
      config,
      (key) => this.position(key),
      this.counters,
      saved?.goods,
    );
    this.ledger.rebuildChildren();
    this.movement = new Movement(this.terrain, config);
    this.spatial = new SpatialIndex(config.spatial.bucketKm, this.counters);
    if (!saved) this.foundDiagnosticFixture();
    this.rebuildSpatial();
    for (const c of this.ledger.state.containers)
      if (c.location.kind === "carrier")
        this.carriedByActor.set(c.location.actor, c.key);
    this.evidence = new EvidenceService(
      seed,
      this.counters,
      saved?.evidence,
      (owner, kind, detail) => this.kernel.record(kind, owner, detail),
      config.spatial.regionCells * config.spatial.cellKm,
      catalogue,
      config.spatial,
    );
    this.epistemicActors = new Set(saved?.epistemicActors ?? []);
    this.storage = new StorageLaw(
      this.ledger,
      () => this.kernel.state.now,
      (from, good, quantity) => {
        this.goods({
          kind: "sink",
          sink: "spoilage",
          actor: this.ledger.get(from).custodian ?? from,
          from,
          good,
          quantity,
        });
        const c = this.ledger.get(from),
          owner = c.custodian;
        if (owner && this.epistemicActors.has(owner)) {
          const p = this.position(owner),
            q = this.ledger.location(from);
          if (
            c.kind === "carried" ||
            (p.x - q.x) ** 2 + (p.y - q.y) ** 2 <= 0.08 ** 2
          )
            this.publishOwnStocks(owner, from);
        }
      },
      saved?.storage,
    );
    if (!saved)
      for (const c of this.ledger.state.containers) this.storage.touch(c.key);
    this.materials = new MaterialLaw(
      seed,
      this.ledger,
      {
        position: (actor) => this.position(actor),
        input: (actor, good, quantity) => {
          const from = this.ledger.carriedContainer(actor).key;
          this.goods({
            kind: "sink",
            sink: "recipe-input",
            actor,
            from,
            good,
            quantity,
          });
          this.publishOwnStocks(actor, from);
        },
        output: (actor, good, quantity) => {
          const to = this.ledger.carriedContainer(actor).key;
          this.goods({
            kind: "source",
            source: "production",
            to,
            good,
            quantity,
          });
          this.publishOwnStocks(actor, to);
        },
        cache: (actor, point, key) => {
          const id = this.kernel.ids.allocate("constructed-cache", key);
          this.ledger.add({
            ...id,
            kind: "cache",
            location: { kind: "ground", point: { ...point } },
            custodian: actor,
            capacityCu: 12,
            stocks: {},
          });
          this.spatial.put(id.key, point);
          this.evidence.selfHandle(actor, id.key);
          this.publishOwnStocks(actor, id.key);
          this.perceive(actor, "cache completion", true);
          return id.key;
        },
        fact: (actor, subject, property, value) =>
          this.evidence.fact(
            actor,
            subject === "self"
              ? subject
              : this.evidence.selfHandle(actor, subject),
            property,
            value as import("../evidence/types").Value,
            this.kernel.state.now,
            "paid material law",
            subject === "self" ? "self" : "direct",
          ),
      },
      saved?.materials,
      catalogue.recipes,
    );
    this.adultPhysical = new AdultPhysical(
      {
        now: () => this.kernel.state.now,
        remainingGoods: (actor, good) => {
          const b = this.runtime.currentExecution(actor).budget;
          return b
            ? (b.authorised.goods[good] ?? 0) - (b.spent.goods[good] ?? 0)
            : 0;
        },
        engage: (actor, target, duration) =>
          !!this.danger.engage(actor, target, duration),
        workRadiusKm: config.movement.workRadiusKm,
        position: (actor) => this.position(actor),
        knownMethod: (actor, method) =>
          this.personalReview(actor).belief(`method:${method}`, "known")
            ?.value === true,
        legitimate: (actor) => {
          const k = cell(this.terrain, this.position(actor));
          return k >= 0 && !!this.terrain.passable[k];
        },
        rate: (
          actor,
          method,
          context,
          output,
          paidSd,
          provenance,
          cognitive,
          field,
        ) =>
          this.evidence.observePerformance(
            actor,
            method,
            context,
            output,
            paidSd,
            provenance,
            this.kernel.state.now,
            cognitive,
            field,
          ),
        reference: (actor, subject) => this.evidence.reference(actor, subject),
        fact: (actor, subject, property, value, context) => {
          const known =
            subject === "self"
              ? subject
              : this.evidence.selfHandle(actor, subject);
          this.evidence.fact(
            actor,
            known,
            property,
            value as import("../evidence/types").Value,
            this.kernel.state.now,
            context,
            subject === "self" ? "self" : "direct",
          );
        },
        observeStock: (actor, site, kind, good, stock, cognitive, field) =>
          this.evidence.observeResourceStock(
            actor,
            this.evidence.selfHandle(actor, site),
            kind,
            good,
            stock,
            this.kernel.state.now,
            cognitive,
            field,
          ),
        effectInstalled: (id) => this.materialEffects.has(id),
        methodConfidence: (actor, method, context) =>
          Number(
            this.personalReview(actor).belief(
              `method:${method}`,
              `confidence:${context}`,
            )?.value ??
              this.personalReview(actor).belief(
                `method:${method}`,
                "confidence",
              )?.value ??
              1,
          ),
        frustration: (actor, context) => {
          const e = this.personalReview(actor).belief("exploration", context);
          const s = e?.value as Record<string, number> | undefined;
          return s
            ? s.failures! *
                math.exp(-(this.kernel.state.now - s.at!) / QUANTA / 24)
            : 0;
        },
        outcome: (actor, outcome, provenance) =>
          this.evidence.observeExploration(
            actor,
            outcome,
            this.kernel.state.now,
            provenance,
          ),
        recipeInput: (actor, good, quantity) => {
          const from = this.ledger.carriedContainer(actor).key;
          this.goods({
            kind: "sink",
            sink: "recipe-input",
            actor,
            from,
            good,
            quantity,
          });
          this.publishOwnStocks(actor, from);
        },
        source: (to, good, quantity, production = false) => {
          this.goods({
            kind: "source",
            source: production ? "production" : "extraction",
            to,
            good,
            quantity,
          });
          const owner = this.ledger.get(to).custodian;
          if (owner) this.publishOwnStocks(owner, to);
        },
        consume: (actor, from, good, quantity, reservation) => {
          this.goods({
            kind: "sink",
            sink: "consumption",
            actor,
            from,
            good,
            quantity,
            reservation,
          });
          this.publishOwnStocks(actor, from);
        },
        reserve: (actor, from, good, quantity, expires) =>
          this.goods({ kind: "reserve", actor, from, good, quantity, expires }),
        schedule: (actor, at) => {
          const task = this.runtime?.task(actor);
          if (!task?.active) return;
          this.kernel.invalidate(
            digest(["task-operation", task.actor, task.semanticKey]),
          );
          task.active.end = at;
          this.kernel.schedule(
            digest(["task-operation", task.actor, task.semanticKey]),
            at,
            PHASE.settle,
            {
              kind: "runtime-operation",
              taskId: task.taskId,
              event: "operation",
            },
          );
        },
      },
      this.ledger,
      this.counters,
      saved?.adultPhysical,
      this.materials,
      this.storage,
    );
    for (const site of this.adultPhysical.state.sites)
      this.spatial.put(site.key, site.point);
    this.danger = new DangerLaw(
      seed,
      {
        now: () => this.kernel.state.now,
        position: (actor) => this.position(actor),
        nearby: (point, radius) =>
          this.spatial
            .query(point, radius)
            .filter((key) => this.byActor.has(key)),
        passable: (point) => {
          const k = cell(this.terrain, point);
          return k >= 0 && !!this.terrain.passable[k];
        },
        alive: (actor) => this.adultPhysical.body(actor)?.alive ?? false,
        force: (actor) =>
          this.adultPhysical.force(actor) * this.materials.force(actor),
        wounds: (actor) => {
          const b = this.adultPhysical.body(actor);
          return b ? materialiseBody(b, this.kernel.state.now).w : 0;
        },
        harm: (actor, wound, fatal) => {
          const id = this.kernel.ids.allocate("animal-harm", actor);
          this.kernel.schedule(
            id.key,
            this.kernel.state.now +
              (this.kernel.state.phase > PHASE.harm ? 1 : 0),
            PHASE.harm,
            { kind: "animal-harm", actor, wound, fatal },
          );
        },
        fact: (actor, subject, property, value) =>
          this.evidence.fact(
            actor,
            this.evidence.selfHandle(actor, subject),
            property,
            value as import("../evidence/types").Value,
            this.kernel.state.now,
            "local physical encounter",
            "direct",
          ),
      },
      saved?.danger,
    );
    if (this.danger.state.predator)
      this.spatial.put(
        this.danger.state.predator.key,
        this.danger.state.predator.point,
      );
    this.runtime = new TaskRuntime(
      {
        beginPhysical: (task, step, remaining) => {
          const before = task.dependsOn.map((d) => ({
            key: d.key,
            before: this.evidence.version(task.actor, d.key),
          }));
          const result = this.adultPhysical.begin(task, step, remaining);
          if (result.ok) this.refreshMindThresholds(task.actor, step);
          return result.ok
            ? {
                ...result,
                ownWrites: before
                  .map((d) => ({
                    ...d,
                    after: this.evidence.version(task.actor, d.key),
                  }))
                  .filter((d) => d.before !== d.after),
              }
            : result;
        },
        endPhysical: (task, final) => {
          const before = task.dependsOn.map((d) => ({
            key: d.key,
            before: this.evidence.version(task.actor, d.key),
          }));
          const result = this.adultPhysical.end(task, final);
          const ownWrites = before
            .map((d) => ({
              ...d,
              after: this.evidence.version(task.actor, d.key),
            }))
            .filter((d) => d.before !== d.after);
          return {
            ...result,
            ...("outputSubject" in result && result.outputSubject
              ? {
                  outputSubject: this.evidence.selfHandle(
                    task.actor,
                    result.outputSubject,
                  ),
                }
              : {}),
            ownWrites,
          };
        },
        paidPhysical: (task, start, end) =>
          this.adultPhysical.paid(task, start, end),
        physicalClosure: (actor) => this.adultPhysical.closure(actor),
        now: () => this.kernel.state.now,
        personal: (actor) => this.personalReview(actor),
        pinGeography: (actor, scope) =>
          this.evidence.pinGeography(actor, scope),
        geography: (id) => this.evidence.geography(id),
        pinGeographyVersion: (id, scope) =>
          this.evidence.pinGeographyVersion(id, scope),
        unpinGeography: (scope) => this.evidence.unpinGeography(scope),
        pin: (task) => {
          for (const [index, route] of Object.entries(
            task.preparedRoutes ?? {},
          )) {
            const scope = `prepared:${task.actor}:${task.semanticKey}:${index}`;
            if (+index >= task.cursor && route.geographyId)
              this.evidence.pinGeographyVersion(route.geographyId, scope);
            else this.evidence.unpinGeography(scope);
          }
          const subjects = [
            ...Object.values(task.bindings),
            ...task.steps
              .slice(task.cursor)
              .flatMap((s) => (s.family === "Transfer" ? [s.from, s.to] : [])),
            ...task.reservations.map((r) => r.subject),
          ];
          this.evidence.pin(
            task.actor,
            task.taskId,
            {
              subjects,
              beliefKeys: [
                ...task.dependsOn.map((d) => d.key),
                beliefKey(`method:${task.method}`, "known"),
              ],
              targets: task.steps
                .slice(task.cursor)
                .flatMap((s) => (s.family === "Move" ? [s.target] : [])),
              reason: "task",
            },
            this.kernel.state.now,
          );
        },
        unpin: (task) => {
          this.evidence.unpin(task.actor, task.taskId);
          if (task.status === "done")
            for (const index of Object.keys(task.preparedRoutes ?? {}))
              this.evidence.unpinGeography(
                `prepared:${task.actor}:${task.semanticKey}:${index}`,
              );
        },
        exactSelf: (actor) => this.exactSelf(actor),
        blockedCells: (actor, cells) =>
          this.evidence.blockedCells(actor, cells),
        version: (actor, key) => this.evidence.version(actor, key),
        startPrefix: (actor, target) => this.startPersonalPrefix(actor, target),
        stopMove: (actor) => {
          this.movement.interrupt(this.actor(actor), this.kernel.state.now);
          this.kernel.invalidate(motionScope(actor));
        },
        observe: (actor, duration) => {
          const task = this.runtime.task(actor),
            step = task?.steps[task.cursor];
          this.perceive(actor, "paid directed Attend", true, duration);
          if (task && step?.family === "Attend" && step.experiment) {
            const count = this.personalReview(actor).belief(
              "local-survey",
              `site-detection-count:${step.experiment.targetKind.split(":")[0]}`,
            )?.value;
            this.evidence.observeExploration(
              actor,
              {
                ...step.experiment,
                paid: 0,
                completed: true,
                success: typeof count === "number" && count > 0,
              },
              this.kernel.state.now,
              `${task.semanticKey}:${task.cursor}:${this.kernel.state.now}`,
            );
          }
        },
        schedule: (task, at, kind) =>
          this.kernel.schedule(
            digest(["task-operation", task.actor, task.semanticKey]),
            at,
            kind === "budget"
              ? PHASE.close
              : ["Work", "Recover"].includes(
                    task.steps[task.cursor]?.family ?? "",
                  )
                ? PHASE.settle
                : task.steps[task.cursor]?.family === "Transfer"
                  ? PHASE.commit
                  : PHASE.observe,
            { kind: "runtime-operation", taskId: task.taskId, event: kind },
          ),
        cancel: (task) =>
          this.kernel.invalidate(
            digest(["task-operation", task.actor, task.semanticKey]),
          ),
        transfer: (task, step, reservation) => {
          const from = this.evidence.reference(task.actor, step.from),
            to = this.evidence.reference(task.actor, step.to);
          if (!from || !to)
            return {
              ok: false,
              observed: "bound container not personally known",
            };
          const p = this.position(task.actor);
          for (const k of [from, to]) {
            const q = this.ledger.location(k);
            if (
              math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2) >
              this.config.movement.workRadiusKm
            )
              return { ok: false, observed: "no local transfer access" };
          }
          this.perceive(task.actor, "attempted local transfer", true);
          if (
            this.ledger.get(from).custodian !== task.actor ||
            this.ledger.get(to).custodian !== task.actor
          )
            return { ok: false, observed: "own custody not authorised" };
          try {
            this.goods({
              kind: "transfer",
              basis: "own-custody",
              actor: task.actor,
              from,
              to,
              good: step.good,
              quantity: step.quantity,
              ...(reservation ? { reservation } : {}),
            });
            for (const key of [from, to]) {
              const c = this.ledger.get(key),
                subject = this.evidence.subjectFor(task.actor, key)!;
              this.evidence.fact(
                task.actor,
                subject,
                c.location.kind === "carrier" ? "stocks" : "own-local-stocks",
                { ...c.stocks },
                this.kernel.state.now,
                "completed own transfer",
                "self",
              );
            }
            this.perceive(task.actor, "completed own transfer", true);
            return { ok: true };
          } catch {
            return { ok: false, observed: "local transfer unavailable" };
          }
        },
        reserve: (actor, subject, good, quantity, expires) => {
          const from = this.evidence.reference(actor, subject);
          if (!from || this.ledger.get(from).custodian !== actor)
            throw Error("No own reservation authority");
          return this.goods({
            kind: "reserve",
            actor,
            from,
            good,
            quantity,
            expires,
          });
        },
        release: (actor, key) => {
          if (this.ledger.reservation(key).status === "active")
            this.goods({ kind: "release", actor, reservation: key });
        },
        routeEvidence: (actor, subject, cells, status, at) =>
          this.evidence.route(actor, subject, cells, status, at),
        record: (kind, actor, detail) => {
          this.kernel.record(kind, actor, detail);
          if (kind === "task-complete") {
            const d = detail as {
              project?: string;
              projectFinal?: boolean;
              projectMilestone?: number;
            };
            if (d.project && d.projectMilestone !== undefined)
              this.mind.completedProject(
                actor,
                d.project,
                d.projectMilestone,
                !!d.projectFinal,
              );
            if (!this.runtime.resumeSuspended(actor))
              this.requestReview(actor, "completion");
          }
          if (kind === "task-repair-required" && this.mind?.person(actor))
            this.kernel.schedule(
              digest(["mind-repair", actor]),
              this.kernel.state.now +
                (this.kernel.state.phase === PHASE.decide ? 1 : 0),
              PHASE.decide,
              { kind: "mind-repair", actor },
            );
        },
      },
      this.counters,
      saved?.runtime,
    );
    this.mind = new Mind(seed, this.counters, saved?.mind, catalogue);
  }
  private publishOwnStocks(actor: Key, container: Key): void {
    if (!this.epistemicActors.has(actor)) return;
    const c = this.ledger.get(container),
      subject = this.evidence.subjectFor(actor, container);
    if (c.custodian !== actor || !subject) return;
    this.evidence.fact(
      actor,
      subject,
      c.location.kind === "carrier" ? "stocks" : "own-local-stocks",
      { ...c.stocks },
      this.kernel.state.now,
      "own paid goods receipt",
      "self",
    );
    this.mind?.observeOwnStocks(this.personalReview(actor));
  }
  private actor(key: Key): PersonShell {
    const a = this.byActor.get(key);
    if (!a) throw new Error("Missing actor");
    return a;
  }
  private position(key: Key): Point {
    return positionAt(this.actor(key), this.kernel.state.now);
  }
  private rebuildSpatial(): void {
    for (const a of this.actors) this.spatial.put(a.key, this.position(a.key));
    for (const c of this.ledger.state.containers)
      if (c.location.kind === "ground")
        this.spatial.put(c.key, c.location.point);
  }
  private foundDiagnosticFixture(): void {
    const root = digest(["physical-diagnostic", this.seed]),
      { diagnostic: d } = this.config;
    let largest = 0;
    for (let i = 1; i < this.regions.sizes.length; i++)
      if (this.regions.sizes[i]! > this.regions.sizes[largest]!) largest = i;
    const cells: number[] = [];
    for (let k = 0; k < this.terrain.kind.length; k++)
      if (this.regions.component[k] === largest) cells.push(k);
    if (cells.length < d.actors + d.sites)
      throw new Error("Diagnostic scenario has insufficient passable cells");
    // Spatial samples from the largest component; no seed rejection/rescue law.
    for (let i = 0; i < d.actors; i++) {
      const p = center(
          this.terrain,
          cells[Math.floor(((i + 0.5) * cells.length) / d.actors)]!,
        ),
        id = this.kernel.ids.allocate("person-shell", root, i);
      const a: PersonShell = {
        ...id,
        label: `Shell ${i + 1}`,
        position: p,
        travelPaidQuanta: 0,
        motion: null,
      };
      this.actors.push(a);
      this.byActor.set(a.key, a);
      const carried = this.kernel.ids.allocate("carried", a.key),
        cache = this.kernel.ids.allocate("cache", a.key);
      this.ledger.add({
        ...carried,
        kind: "carried",
        location: { kind: "carrier", actor: a.key },
        custodian: a.key,
        capacityCu: 2 * d.nominalCargoCu,
        stocks: {},
      });
      if (d.foundingCaches) {
        this.ledger.add({
          ...cache,
          kind: "cache",
          location: { kind: "ground", point: { ...p } },
          custodian: a.key,
          capacityCu: d.cacheCapacityCu,
          stocks: {},
        });
        if (d.cacheFoodFu > 0)
          this.ledger.transact(
            this.kernel.ids.allocate("transaction", cache.key).key,
            0,
            {
              kind: "source",
              source: "initial-endowment",
              to: cache.key,
              good: "food",
              quantity: d.cacheFoodFu,
            },
          );
      }
    }
    for (let i = 0; i < d.sites; i++) {
      const k = cells[Math.floor(((i + 0.25) * cells.length) / d.sites)]!,
        p = center(this.terrain, k),
        id = this.kernel.ids.allocate("resource-site", root, i);
      const g = this.config.goods.filter((g) => g.divisible)[
          i % this.config.goods.filter((g) => g.divisible).length
        ]!,
        quantity =
          g.id === "food"
            ? d.sourceFoodFu
            : g.id === "wood"
              ? d.sourceWood
              : g.id === "stone"
                ? d.sourceStone
                : d.sourceFibre;
      this.ledger.add({
        ...id,
        kind: "site",
        location: { kind: "ground", point: p },
        custodian: null,
        capacityCu: quantity * g.bulk,
        stocks: {},
      });
      this.ledger.transact(
        this.kernel.ids.allocate("transaction", id.key).key,
        0,
        {
          kind: "source",
          source: "diagnostic-source",
          to: id.key,
          good: g.id,
          quantity,
        },
      );
    }
  }
  actorKeys(): Key[] {
    return this.actors.map((a) => a.key);
  }
  containerKeys(actor?: Key): Key[] {
    return this.ledger.state.containers
      .filter((c) => !actor || c.custodian === actor)
      .map((c) => c.key);
  }
  // Explicit diagnostic endowment/selection, never autonomous choice.
  enablePersonal(actor: Key): void {
    if (this.epistemicActors.has(actor)) return;
    if (this.actor(actor).motion?.status === "moving")
      throw Error("Enable personal fixture before physical motion");
    this.epistemicActors.add(actor);
    this.evidence.register(actor);
    const carried = this.evidence.selfHandle(
      actor,
      this.carriedByActor.get(actor)!,
    );
    this.evidence.fact(
      actor,
      "self",
      "identity",
      actor,
      this.kernel.state.now,
      "exact own identity",
      "self",
    );
    this.evidence.fact(
      actor,
      carried,
      "stocks",
      { ...this.ledger.get(this.carriedByActor.get(actor)!).stocks },
      this.kernel.state.now,
      "founding carried goods",
      "self",
    );
    this.evidence.foundTraversalPrior(
      actor,
      this.config.evidence.traversalPrior,
      this.kernel.state.now,
    );
    this.evidence.foundMethods(
      actor,
      this.config.evidence.foundingMethods,
      this.kernel.state.now,
    );
    for (const c of this.ledger.state.containers.filter(
      (c) => c.custodian === actor && c.location.kind === "ground",
    )) {
      const p = this.ledger.location(c.key),
        q = this.position(actor);
      if (
        math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2) >
        this.config.movement.workRadiusKm
      )
        continue;
      const subject = this.evidence.selfHandle(actor, c.key);
      this.evidence.fact(
        actor,
        subject,
        "existence",
        true,
        this.kernel.state.now,
        "founding local own endowment",
        "self",
      );
      this.evidence.fact(
        actor,
        subject,
        "kind",
        c.kind,
        this.kernel.state.now,
        "founding local own endowment",
        "self",
      );
      this.evidence.fact(
        actor,
        subject,
        "location",
        p,
        this.kernel.state.now,
        "founding local own endowment",
        "self",
      );
      this.evidence.fact(
        actor,
        subject,
        "own-local-stocks",
        { ...c.stocks },
        this.kernel.state.now,
        "founding local own endowment",
        "self",
      );
    }
    this.perceive(actor, "founding current perception", false);
    const offset = parseInt(actor.slice(-5), 16),
      now = this.kernel.state.now;
    const first = Math.floor(now / QUANTA) * QUANTA + offset;
    this.kernel.schedule(
      digest(["representative-closure", actor]),
      first > now ? first : first + QUANTA,
      PHASE.lifeCourse,
      { kind: "representative-closure", actor },
    );
  }
  enableAutonomous(actor: Key, dispositions?: Dispositions): void {
    if (!this.adultPhysical.body(actor)) this.diagnosticFoundAdult(actor);
    const state = this.mind.found(actor, this.kernel.state.now, dispositions);
    this.kernel.schedule(
      digest(["mind-periodic", actor]),
      state.periodicAt,
      PHASE.observe,
      { kind: "mind-periodic", actor },
    );
    this.refreshMindThresholds(actor);
  }
  decisionPanel(actor: Key): Readonly<MindState> | null {
    const state = this.mind.person(actor);
    return state ? freezeProjection(clone(state)) : null;
  }
  requestReview(actor: Key, cause: WakeCause): void {
    if (this.adultPhysical.body(actor)?.alive === false) return;
    if (!this.mind?.person(actor)) return;
    const at =
      this.kernel.state.now +
      (this.kernel.state.phase === PHASE.decide ||
      this.kernel.state.phase === -1
        ? 1
        : 0);
    if (this.mind.request(actor, cause, at)) this.scheduleReview(actor, at);
  }
  private scheduleReview(actor: Key, at: number): void {
    const scope = digest(["mind-review", actor]);
    this.kernel.invalidate(scope);
    this.kernel.schedule(scope, at, PHASE.decide, {
      kind: "mind-review",
      actor,
    });
  }
  private refreshMindThresholds(
    actor: Key,
    step?: import("../runtime/types").Operation,
  ): void {
    const state = this.mind?.person(actor);
    if (!state) return;
    const review = this.personalReview(actor);
    for (const cause of this.mind.thresholds(review))
      this.requestReview(actor, cause);
    const scope = digest(["mind-food-crossing", actor]);
    this.kernel.invalidate(scope);
    const current =
      step ??
      this.runtime.currentExecution(actor).task?.steps[
        this.runtime.task(actor)!.cursor
      ];
    if (
      !state.foodArmed ||
      current?.family !== "Transfer" ||
      current.use !== "consume"
    )
      return;
    const b = bodySignals(review),
      quantity = ownedLots(review, "food").reduce(
        (sum, l) => sum + l.quantity,
        0,
      );
    const rate = current.quantity / (current.duration / QUANTA);
    const until =
      Math.ceil(Math.max(0, (quantity - 0.25 * b.quiet) / rate) * QUANTA) + 1;
    const remaining =
      current.duration - (this.runtime.task(actor)?.paidForStep ?? 0);
    if (until > 0 && until < remaining)
      this.kernel.schedule(
        scope,
        this.kernel.state.now + until,
        PHASE.observe,
        { kind: "mind-food-crossing", actor },
      );
  }
  personalView(actor: Key): PersonalView {
    if (!this.epistemicActors.has(actor))
      throw Error("No personal evidence fixture");
    return this.evidence.view(
      actor,
      this.kernel.state.now,
      this.config.spatial,
      this.exactSelf(actor),
    );
  }
  personalReview(actor: Key) {
    if (!this.epistemicActors.has(actor))
      throw Error("No personal evidence fixture");
    return this.evidence.review(
      actor,
      this.kernel.state.now,
      this.config.spatial,
      this.exactSelf(actor),
    );
  }
  diagnosticRouteEffort(
    actor: Key,
    kind: import("../kernel/effort").EffortKind = "review",
    alreadySpent = 0,
  ): string {
    if (!this.epistemicActors.has(actor))
      throw Error("No personal evidence fixture");
    return this.runtime.authorizeEffort(actor, kind, alreadySpent);
  }
  private exactSelf(actor: Key): ExactSelf {
    const carried = this.ledger.carriedContainer(actor);
    const subject = this.evidence.subjectFor(actor, carried.key)!,
      leg = this.actor(actor).motion?.leg;
    return {
      identity: actor,
      location: this.position(actor),
      currentLeg: leg
        ? {
            from: { ...leg.from },
            to: { ...leg.to },
            start: leg.start,
            end: leg.end,
          }
        : null,
      carried: { subject, stocks: { ...carried.stocks } },
      reservations: this.ledger.activeReservations(actor).map((r) => ({
        key: r.key,
        good: r.good,
        remaining: r.remaining,
        expires: r.expires,
        status: r.status,
      })),
    };
  }
  diagnosticFoundAdult(
    actor: Key,
    class_: "M" | "F" = "M",
    profile?: {
      capability: import("../world/body").AdultCapability;
      mastery: import("../world/body").Masteries;
      wound?: number;
      initial?: {
        condition: number;
        fatigue: number;
        enjoyment: number;
        satiation?: number;
      };
    },
  ) {
    this.enablePersonal(actor);
    this.adultPhysical.found(actor, class_, profile);
    this.adultPhysical.experience(actor);
  }
  diagnosticFoundUse(actor: Key, method: string, workSd: number) {
    if (
      this.kernel.state.now !== 0 ||
      !Number.isFinite(workSd) ||
      workSd < 0 ||
      workSd > 1 ||
      this.personalReview(actor).belief(`method:${method}`, "known")?.value !==
        true
    )
      throw Error("Invalid founding service prehistory");
    this.evidence.fact(
      actor,
      `method:${method}`,
      "service-use",
      { workSd, since: 0 },
      0,
      "declared founding personal time allocation",
      "self",
    );
  }
  diagnosticFoundRate(
    actor: Key,
    method: string,
    context: string,
    rate: number,
  ) {
    if (
      this.kernel.state.now !== 0 ||
      !Number.isFinite(rate) ||
      rate <= 0 ||
      this.personalReview(actor).belief(`method:${method}`, "known")?.value !==
        true
    )
      throw Error("Invalid founding personal rate prior");
    this.evidence.fact(
      actor,
      "self",
      `rate:${method}:${context}`,
      {
        priorRate: rate,
        priorWeight: 1,
        weight: 0,
        logSum: 0,
        anchorAt: 0,
        samples: 1,
      },
      0,
      "declared founding experienced rate prior",
      "inference",
    );
  }
  diagnosticPredator(point: Point) {
    const id = this.kernel.ids.allocate(
      "predator",
      digest([this.seed, "founding-predator"]),
    );
    this.danger.found(id.key, point);
    this.spatial.put(id.key, point);
    this.kernel.schedule(
      id.key,
      this.kernel.state.now + Math.ceil(0.1 * QUANTA),
      PHASE.harm,
      { kind: "predator-tick" },
    );
    return id.key;
  }
  diagnosticResource(
    kind: string,
    point: Point,
    stock: number,
    materialKind?: string,
  ): Key {
    const key = this.kernel.ids.allocate(
      "physical-resource",
      digest([this.seed, kind, point]),
    ).key;
    this.adultPhysical.addSite(key, kind, point, stock, materialKind);
    this.spatial.put(key, point);
    return key;
  }
  diagnosticObserveResource(actor: Key, key: Key): string {
    this.adultPhysical.observeSite(actor, key);
    return this.evidence.subjectFor(actor, key)!;
  }
  analystBody(actor: Key) {
    return this.adultPhysical.analyst(actor);
  }
  currentExecution(actor: Key) {
    return this.runtime.currentExecution(actor);
  }
  personalLens(actor: Key) {
    return {
      personal: this.personalView(actor),
      execution: this.runtime.projection(actor),
      decision: this.decisionPanel(actor),
    };
  }
  diagnosticSelect(input: SelectedIntention): Task {
    if (!this.epistemicActors.has(input.actor))
      throw Error("Enable personal fixture first");
    if (input.source !== "diagnostic-selected-intention")
      throw Error("Diagnostic adapter requires diagnostic source");
    return this.runtime.select(input, () => {
      if (!this.runtime.state.currentEffort[input.actor])
        this.runtime.authorizeEffort(input.actor, "review");
    });
  }
  diagnosticInstallRepair(
    actor: Key,
    repair: import("../runtime/types").BoundRepair,
  ): Task {
    return this.runtime.installBoundRepair(actor, repair);
  }
  diagnosticTaskInterrupt(actor: Key): void {
    this.runtime.interrupt(actor);
  }
  diagnosticTaskResume(actor: Key): void {
    this.runtime.resume(actor);
  }
  diagnosticTaskAbandon(actor: Key): void {
    this.runtime.abandon(actor);
  }
  resumePersonalRouting(
    slice = this.config.diagnostic.routeExpansionsPerResume,
  ): boolean {
    return this.runtime.resumeRouting(slice);
  }
  diagnosticObserve(actor: Key, directed = false): void {
    this.perceive(actor, "explicit diagnostic observation", directed);
  }
  private perceive(
    actor: Key,
    context: string,
    directed = false,
    duration = 0,
    focus?: Key,
  ): void {
    if (!this.epistemicActors.has(actor)) return;
    const p = this.position(actor),
      sight = this.config.movement.sightKm,
      terrain = visibleTerrain(this.terrain, p, sight),
      facts: PerceptibleFact[] = [];
    for (const key of this.spatial.query(
      p,
      sight + this.config.spatial.cellKm * 2,
    )) {
      if (key === actor || (focus && key !== focus)) continue;
      this.counters.perceptionCandidateChecks++;
      const predator = this.danger?.state.predator;
      if (predator?.key === key) {
        if (visible(this.terrain, p, predator.point, sight))
          facts.push({
            reference: key,
            kind: "animal",
            position: predator.point,
            detection: 1,
            properties: [
              {
                property: "threat",
                value: {
                  force: 1.6,
                  point: predator.point,
                  active: predator.retreatUntil <= this.kernel.state.now,
                } as unknown as import("../evidence/types").Value,
                volatility: "fast",
                uncertainty: 0,
              },
            ],
          });
        continue;
      }
      const resource = this.adultPhysical.site(key);
      if (resource) {
        if (!visible(this.terrain, p, resource.point, sight)) continue;
        const def = EXTRACTION_INDEX.resource(resource.kind)!;
        const distance = math.sqrt(
          (p.x - resource.point.x) ** 2 + (p.y - resource.point.y) ** 2,
        );
        const material = this.materialKinds.get(resource.materialKind ?? "");
        facts.push({
          reference: key,
          kind: "site",
          position: resource.point,
          detection: detection(distance, sight),
          properties: [
            {
              property: "resource-kind",
              value: resource.kind,
              volatility: "fixed",
              uncertainty: 0,
            },
            {
              property: `stock:${def.good}`,
              value: stockAt(resource, this.kernel.state.now),
              volatility: "fast",
              uncertainty:
                distance <= this.config.movement.workRadiusKm
                  ? 0
                  : this.config.evidence.stockLogSd,
            },
            ...(material
              ? [
                  {
                    property: "material-kind",
                    value: material.id,
                    volatility: "fixed" as const,
                    uncertainty: 0,
                  },
                  {
                    property: "perceptible-properties",
                    value: material.perceptible.join(","),
                    volatility: "fixed" as const,
                    uncertainty: 0,
                  },
                ]
              : []),
          ],
        });
        continue;
      }
      const other = this.byActor.get(key),
        c = other ? null : this.ledger.get(key),
        q = other ? this.position(key) : this.ledger.location(key);
      if (!visible(this.terrain, p, q, sight)) continue;
      const distance = math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2),
        local = distance <= this.config.movement.workRadiusKm;
      const properties: PerceptibleFact["properties"] = other
        ? [
            {
              property: "presence",
              value: true,
              volatility: "fast",
              uncertainty: 0,
            },
          ]
        : Object.entries(c!.stocks).map(([good, quantity]) => ({
            property: "stock:" + good,
            value: quantity,
            volatility: "fast" as const,
            uncertainty: local ? 0 : this.config.evidence.stockLogSd,
          }));
      // Own remote cache balances remain dated; exact own data is refreshed only locally.
      if (c?.custodian === actor && local)
        properties.push({
          property: "own-local-stocks",
          value: { ...c.stocks },
          volatility: "slow",
          uncertainty: 0,
        });
      facts.push({
        reference: key,
        kind: other ? "person" : c!.kind === "site" ? "site" : "cache",
        position: q,
        properties,
        detection: detection(distance, sight),
      });
    }
    if (focus && !facts.length) return;
    facts.sort(
      (a, b) =>
        (a.position.x - p.x) ** 2 +
          (a.position.y - p.y) ** 2 -
          ((b.position.x - p.x) ** 2 + (b.position.y - p.y) ** 2) ||
        a.position.y - b.position.y ||
        a.position.x - b.position.x ||
        (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0),
    );
    const geometryOnly = context === "consequential movement geometry";
    const selected = this.runtime?.task(actor);
    const relevant = selected?.route
      ? new Set(
          selected.route.path.slice(Math.max(0, selected.routeCursor - 1)),
        )
      : null;
    const observedTerrain = focus
      ? []
      : geometryOnly && relevant
        ? terrain.filter((c) => relevant.has(c.cell))
        : terrain;
    this.evidence.observe(
      actor,
      {
        terrain: observedTerrain,
        ...(!geometryOnly && !focus
          ? { resourceClasses: ["food-patch", "stone-deposit"] }
          : {}),
        facts: geometryOnly ? [] : facts,
        footprint: {
          cells: observedTerrain.map((c) => ({
            cell: c.cell,
            detection: c.detection,
          })),
          duration,
        },
      },
      this.kernel.state.now,
      context,
      directed,
    );
    if (this.mind?.person(actor) && facts.some((f) => f.kind === "animal"))
      this.kernel.schedule(
        digest(["mind-safety", actor]),
        this.kernel.state.now +
          (this.kernel.state.phase === PHASE.decide ? 1 : 0),
        PHASE.decide,
        { kind: "mind-safety", actor },
      );
    // A newly visible obstruction of the selected physical path is consequential.
    const task = this.runtime?.task(actor);
    if (task?.active?.family === "Move" && task.route) {
      const remaining = new Set(
        task.route.path.slice(Math.max(0, task.routeCursor - 1)),
      );
      const blocked = terrain.filter(
        (c) => !c.passable && remaining.has(c.cell),
      );
      if (blocked.length)
        this.evidence.observe(
          actor,
          {
            terrain: blocked,
            facts: [],
            footprint: {
              cells: blocked.map((c) => ({
                cell: c.cell,
                detection: c.detection,
              })),
              duration: 0,
            },
          },
          this.kernel.state.now,
          "observable selected-route obstruction",
          true,
        );
      this.runtime.evidenceBoundary(actor);
    }
  }
  private startPersonalPrefix(
    actor: Key,
    target: Point,
  ): { ok: true; end: number } | { ok: false; observed: string } {
    const a = this.actor(actor),
      now = this.kernel.state.now,
      p = this.position(actor);
    if (a.motion?.status === "moving")
      throw Error("Personal activity overlaps physical movement");
    this.perceive(actor, "consequential movement geometry", true);
    if (this.runtime.task(actor)?.status === "blocked")
      return { ok: false, observed: "route blocked here" };
    // Only the selected adjacent prefix is validated. No truth search or remote lookahead.
    const chunks = segments(this.terrain, p, target);
    if (!chunks) return { ok: false, observed: "route blocked here" };
    const key = this.kernel.ids.allocate("motion", actor).key;
    this.kernel.invalidate(motionScope(actor));
    a.motion = {
      key,
      points: [p, { ...target }],
      segments: chunks,
      segmentCursor: 0,
      leg: null,
      inputs: this.inputs(actor),
      started: now,
      paidThrough: now,
      generation: 0,
      status: "moving",
    };
    this.kernel.record("personal-movement-prefix", actor, { target });
    this.launchLeg(a);
    if (!a.motion.leg) return { ok: false, observed: "route blocked here" };
    // Prefix can contain two cell segments. Budget deadline is bounded by the full actual prefix.
    let duration = 0;
    for (const c of chunks)
      duration += Math.ceil(
        (math.sqrt((c.to.x - c.from.x) ** 2 + (c.to.y - c.from.y) ** 2) /
          (baseSpeed(a.motion.inputs, this.config) *
            this.terrain.speed[c.cell]!)) *
          QUANTA,
      );
    return { ok: true, end: now + duration };
  }
  private inputs(actor: Key): MotionInputs {
    const a = this.actor(actor),
      carried = this.ledger.carriedContainer(actor);
    const body = this.adultPhysical.body(actor),
      v = body ? materialiseBody(body, this.kernel.state.now) : null;
    return {
      ability: body ? travelAbility(body) : 1,
      condition: v?.c ?? 1,
      wound: v?.w ?? 0,
      fatigue: v?.d ?? 0,
      nominalCargoCu: body
        ? cargoNominal(body)
        : this.config.diagnostic.nominalCargoCu,
      loadCu: this.ledger.load(carried.key),
    };
  }
  // Clearly diagnostic: no mind, intention, method or authorization is claimed.
  diagnosticMove(
    actor: Key,
    target: Point,
    inputs?: MotionInputs,
  ): "unresolved" | "unreachable" | "moving" {
    if (
      !Number.isFinite(target.x) ||
      !Number.isFinite(target.y) ||
      cell(this.terrain, target) < 0
    )
      throw new Error("Invalid movement target");
    const a = this.actor(actor);
    if (this.epistemicActors.has(actor))
      throw Error("Personal actor must use generic task runtime");
    if (a.motion?.status === "moving" || this.routes.has(actor))
      throw new Error("Actor already has physical movement work");
    const motionInputs = inputs ? { ...inputs } : this.inputs(actor);
    baseSpeed(motionInputs, this.config);
    // Finish earlier requests in command order at the same causal instant.
    // An engineering slice size must not reorder movement-start records.
    while (this.resumeRouting()) {}
    const start = cell(this.terrain, this.position(actor)),
      goal = cell(this.terrain, target);
    const r: RouteRequest = {
      actor,
      target: { ...target },
      inputs: motionInputs,
      search: beginSearch(
        this.terrain,
        this.regions,
        start,
        goal,
        this.counters,
      ),
    };
    this.routes.set(actor, r);
    return this.progressRoute(r);
  }
  private progressRoute(
    r: RouteRequest,
  ): "unresolved" | "unreachable" | "moving" {
    const result = resumeSearch(
      this.terrain,
      r.search,
      this.config.diagnostic.routeExpansionsPerResume,
      this.counters,
      this.regions,
    );
    if (result.status === "unresolved") return "unresolved";
    if (result.status === "invalidated") {
      r.search = beginSearch(
        this.terrain,
        this.regions,
        cell(this.terrain, this.position(r.actor)),
        cell(this.terrain, r.target),
        this.counters,
      );
      if (r.search.status === "unreachable") {
        this.routes.delete(r.actor);
        return "unreachable";
      }
      return "unresolved";
    }
    this.routes.delete(r.actor);
    if (result.status !== "found") return "unreachable";
    const a = this.actor(r.actor),
      points = pullPath(this.terrain, result.path);
    if (points.length === 1) {
      points[0] = this.position(r.actor);
      points.push(r.target);
    } else {
      points[0] = this.position(r.actor);
      points[points.length - 1] = r.target;
    }
    const chunks = [];
    for (let i = 1; i < points.length; i++) {
      const ss = segments(this.terrain, points[i - 1]!, points[i]!);
      if (!ss) throw new Error("Route cannot execute");
      chunks.push(...ss);
    }
    const key = this.kernel.ids.allocate("motion", r.actor).key,
      now = this.kernel.state.now;
    this.kernel.invalidate(motionScope(a.key));
    a.motion = {
      key,
      points,
      segments: chunks,
      segmentCursor: 0,
      leg: null,
      inputs: r.inputs,
      started: now,
      paidThrough: now,
      generation: 0,
      status: "moving",
    };
    this.kernel.record("diagnostic-movement-start", a.key, {
      motion: key,
      target: r.target,
    });
    this.launchLeg(a);
    return "moving";
  }
  private launchLeg(a: PersonShell): void {
    const m = a.motion!,
      now = this.kernel.state.now,
      leg = this.movement.nextLeg(a, now);
    m.generation++;
    if (leg) {
      this.kernel.schedule(motionScope(a.key), leg.end, PHASE.close, {
        kind: "leg",
        actor: a.key,
        generation: m.generation,
      });
      this.scheduleContacts(a);
      if (this.epistemicActors.has(a.key)) {
        const candidates: Point[] = [],
          s = this.config.spatial,
          r = this.config.movement.sightKm;
        // Potential raster footprints depend on public geometry only, not hidden occlusion.
        for (
          let y = Math.max(
            0,
            Math.floor((Math.min(leg.from.y, leg.to.y) - r) / s.cellKm),
          );
          y <=
          Math.min(
            s.height - 1,
            Math.floor((Math.max(leg.from.y, leg.to.y) + r) / s.cellKm),
          );
          y++
        )
          for (
            let x = Math.max(
              0,
              Math.floor((Math.min(leg.from.x, leg.to.x) - r) / s.cellKm),
            );
            x <=
            Math.min(
              s.width - 1,
              Math.floor((Math.max(leg.from.x, leg.to.x) + r) / s.cellKm),
            );
            x++
          )
            candidates.push({
              x: (x + 0.5) * s.cellKm,
              y: (y + 0.5) * s.cellKm,
            });
        const times = new Set<number>();
        for (const p of candidates) {
          const u = entryFraction(leg.from, leg.to, p, r);
          if (u !== null)
            times.add(leg.start + Math.ceil((leg.end - leg.start) * u));
        }
        for (const at of [...times].sort((a, b) => a - b))
          this.kernel.schedule(
            digest(["sight-grid", a.key, at]),
            at,
            PHASE.observe,
            {
              kind: "perceive",
              actor: a.key,
              motion: m.key,
              generation: m.generation,
            },
          );
        const mid = {
          x: (leg.from.x + leg.to.x) / 2,
          y: (leg.from.y + leg.to.y) / 2,
        };
        for (const key of this.spatial.query(mid, r + s.cellKm * 2)) {
          if (
            this.byActor.has(key) ||
            this.adultPhysical.site(key) ||
            this.danger.state.predator?.key === key
          )
            continue;
          for (const radius of [r, this.config.movement.workRadiusKm]) {
            const u = entryFraction(
              leg.from,
              leg.to,
              this.adultPhysical.site(key)?.point ?? this.ledger.location(key),
              radius,
            );
            if (u !== null) {
              const at = leg.start + Math.ceil((leg.end - leg.start) * u);
              this.kernel.schedule(
                digest(["sight-site", a.key, key, radius]),
                at,
                PHASE.observe,
                {
                  kind: "perceive",
                  actor: a.key,
                  motion: m.key,
                  generation: m.generation,
                  focus: key,
                  mandatory: radius === this.config.movement.workRadiusKm,
                },
              );
            }
          }
        }
      }
    } else
      this.kernel.record(
        m.status === "arrived" ? "movement-arrival" : "movement-interruption",
        a.key,
        {
          motion: m.key,
          position: { ...a.position },
          paidQuanta: a.travelPaidQuanta,
        },
      );
    this.spatial.put(a.key, a.position);
  }
  private scheduleContacts(a: PersonShell): void {
    const now = this.kernel.state.now,
      l = a.motion!.leg!;
    const midpoint = { x: (l.from.x + l.to.x) / 2, y: (l.from.y + l.to.y) / 2 },
      reach = this.config.movement.sightKm + this.config.spatial.cellKm * 3;
    for (const key of this.spatial.query(midpoint, reach)) {
      if (key === a.key || !this.byActor.has(key)) continue;
      const b = this.actor(key);
      const horizon = Math.min(l.end, b.motion?.leg?.end ?? l.end),
        pa = positionAt(a, now),
        pb = positionAt(b, now),
        qa = positionAt(a, horizon),
        qb = positionAt(b, horizon),
        dx = pa.x - pb.x,
        dy = pa.y - pb.y,
        vx = qa.x - pa.x - qb.x + pb.x,
        vy = qa.y - pa.y - qb.y + pb.y,
        A = vx * vx + vy * vy;
      if (!A) continue;
      for (const radius of [
        this.config.movement.sightKm,
        this.config.movement.workRadiusKm,
      ]) {
        const B = 2 * (dx * vx + dy * vy),
          C = dx * dx + dy * dy - radius * radius,
          disc = B * B - 4 * A * C;
        if (disc < 0) continue;
        for (const u of [
          (-B - math.sqrt(disc)) / (2 * A),
          (-B + math.sqrt(disc)) / (2 * A),
        ])
          if (u > 0 && u <= 1) {
            const at = now + Math.ceil((horizon - now) * u),
              pair = [a.key, b.key].sort();
            this.kernel.schedule(
              digest(["contact-pair", pair]),
              at,
              PHASE.observe,
              {
                kind: "contact",
                a: a.key,
                b: b.key,
                ga: this.kernel.generation(motionScope(a.key)),
                gb: this.kernel.generation(motionScope(b.key)),
                radius,
              },
            );
          }
      }
    }
  }
  // One bounded host computation slice. Callers may yield between calls; it
  // creates no causal event and leaves simulation time and paid time untouched.
  // An unresolved frontier can be checkpointed here at a committed boundary.
  resumeRouting(): boolean {
    const request = this.routes.values().next().value;
    if (request) this.progressRoute(request);
    return this.routes.size > 0;
  }
  advanceTo(target: Time): void {
    checkTime(target);
    if (target < this.kernel.state.now) throw new Error("Invalid advance");
    // Headless/worker host drain: each resume is bounded, even for large routes.
    // Establish pending truth-side geometry before advancing the causal clock.
    while (this.resumeRouting()) {}
    while (this.resumePersonalRouting()) {}
    this.kernel.advance(target, (e) => {
      this.execute(e);
      while (this.resumePersonalRouting()) {}
    });
  }
  private execute(e: Event<PhysicalEvent>): void {
    const p = e.payload;
    if (p.kind === "animal-harm") {
      const task = this.runtime.task(p.actor);
      if (task) this.runtime.interrupt(p.actor, "animal harm");
      this.adultPhysical.harm(p.actor, p.wound, p.fatal);
      if (this.adultPhysical.body(p.actor)?.alive) {
        if (task) this.runtime.resume(p.actor);
      } else {
        this.runtime.abandon(p.actor);
        this.runtime.discardSuspended(p.actor);
      }
    }
    if (p.kind === "predator-tick") {
      this.danger.tick();
      const predator = this.danger.state.predator!;
      this.spatial.put(predator.key, predator.point);
      for (const actor of this.spatial
        .query(predator.point, this.config.movement.sightKm)
        .filter((key) => this.epistemicActors.has(key)))
        this.kernel.schedule(
          digest(["danger-observe", actor]),
          e.at,
          PHASE.observe,
          { kind: "danger-observe", actor },
        );
      this.kernel.schedule(
        predator.key,
        e.at + Math.ceil(0.1 * QUANTA),
        PHASE.harm,
        { kind: "predator-tick" },
      );
    }
    if (p.kind === "danger-observe")
      this.perceive(p.actor, "local moving animal", true);
    if (p.kind === "mind-safety") {
      if (!this.adultPhysical.body(p.actor)?.alive) return;
      const trace = this.mind.safety(
        this.personalReview(p.actor),
        this.runtime.currentExecution(p.actor),
      );
      if (trace) {
        this.runtime.admitEffort(trace.effort, trace.selected);
        if (trace.selected) {
          this.runtime.suspendForSafety(p.actor);
          this.runtime.select(trace.selected);
        }
      }
    }
    if (p.kind === "mind-periodic") {
      if (!this.adultPhysical.body(p.actor)?.alive) return;
      const state = this.mind.person(p.actor)!;
      this.requestReview(p.actor, "periodic");
      state.periodicAt = e.at + 2 * QUANTA;
      this.kernel.schedule(e.subject, state.periodicAt, PHASE.observe, p);
    }
    if (p.kind === "mind-food-crossing") {
      this.runtime.reviewBoundary(p.actor);
      this.refreshMindThresholds(p.actor);
    }
    if (p.kind === "mind-repair") {
      const state = this.mind.person(p.actor)!,
        execution = this.runtime.currentExecution(p.actor),
        review = this.personalReview(p.actor);
      if (
        !execution.task ||
        !execution.budget ||
        execution.task.status !== "blocked"
      )
        return;
      const signature = digest([
        execution.task.semanticKey,
        execution.task.cursor,
        execution.task.failure,
        review.geographyId,
      ]);
      if (state.repairSignature === signature) {
        this.requestReview(p.actor, "failure");
        return;
      }
      state.repairSignature = signature;
      const result = boundedRepair(
        review,
        execution.task,
        execution.budget,
        this.counters,
      );
      this.runtime.admitEffort(result.effort);
      if (result.repair)
        this.runtime.installBoundRepair(p.actor, result.repair);
      else this.requestReview(p.actor, "failure");
      this.kernel.record("bounded-repair-result", p.actor, {
        semanticKey: execution.task.semanticKey,
        installed: !!result.repair,
        reason: result.reason,
        effort: result.effort,
      });
    }
    if (p.kind === "mind-review") {
      if (!this.adultPhysical.body(p.actor)?.alive) return;
      const state = this.mind.person(p.actor)!;
      const admission = this.mind.admit(
        this.personalReview(p.actor),
        this.runtime.currentExecution(p.actor),
      );
      if (!admission) {
        if (state.nextWake !== null)
          this.scheduleReview(p.actor, state.nextWake);
        return;
      }
      this.runtime.reviewBoundary(p.actor);
      this.adultPhysical.experience(p.actor);
      const review = this.personalReview(p.actor),
        body = this.adultPhysical.body(p.actor)!;
      const trace = this.mind.deliberate(
        review,
        this.runtime.currentExecution(p.actor),
        admission,
        {
          denominator: () =>
            math.sqrt(body.capability.C * competence(body, "Organise")),
        },
      );
      this.runtime.admitEffort(trace.effort, trace.selected);
      if (trace.selected) {
        if (this.runtime.task(p.actor)) this.runtime.abandon(p.actor);
        this.runtime.select(trace.selected);
        this.counters.autonomousIntentionsCommitted++;
      }
      this.refreshMindThresholds(p.actor);
    }
    if (p.kind === "perceive") {
      const m = this.actor(p.actor).motion;
      if (m?.key === p.motion && m.generation === p.generation)
        this.perceive(
          p.actor,
          p.mandatory ? "physical site contact" : "swept sight entry",
          !!p.mandatory,
          0,
          p.focus,
        );
    }
    if (p.kind === "runtime-boundary") {
      this.perceive(p.actor, "movement arrival");
      this.runtime.movementBoundary(p.actor);
    }
    if (p.kind === "runtime-operation")
      this.runtime.operation(p.taskId, p.event);
    if (p.kind === "representative-closure") {
      const a = this.actor(p.actor),
        moving =
          !!this.adultPhysical.body(p.actor) && a.motion?.status === "moving";
      if (moving) this.movement.settle(a, this.kernel.state.now);
      this.runtime.closure(p.actor);
      for (const c of this.ledger.ownedContainers(p.actor))
        this.storage.settle(c.key);
      this.refreshMindThresholds(p.actor);
      if (moving && a.motion?.status === "moving") {
        this.kernel.invalidate(motionScope(p.actor));
        a.motion.inputs = this.inputs(p.actor);
        const route = this.routes.get(p.actor);
        if (route) route.inputs = { ...a.motion.inputs };
        this.launchLeg(a);
      }
      this.kernel.schedule(e.subject, e.at + QUANTA, PHASE.lifeCourse, {
        kind: "representative-closure",
        actor: p.actor,
      });
    }
    if (p.kind === "diagnostic")
      this.kernel.record("diagnostic-unrelated-event", p.actor, {});
    if (p.kind === "leg") {
      const a = this.actor(p.actor);
      if (a.motion?.status !== "moving" || p.generation !== a.motion.generation)
        return;
      this.movement.finishLeg(a, e.at);
      this.spatial.put(a.key, a.position);
      this.launchLeg(a);
      if (this.epistemicActors.has(a.key)) {
        this.kernel.schedule(
          digest(["personal-boundary", a.key]),
          e.at,
          PHASE.observe,
          {
            kind: "perceive",
            actor: a.key,
            motion: a.motion!.key,
            generation: a.motion!.generation,
          },
        );
        if ((a.motion as PersonShell["motion"])?.status === "arrived")
          this.kernel.schedule(
            digest(["runtime-boundary", a.key]),
            e.at,
            PHASE.decide,
            { kind: "runtime-boundary", actor: a.key },
          );
      }
    }
    if (p.kind === "lease") {
      const r = this.ledger.reservation(p.reservation);
      if (r.status === "active")
        this.goods({ kind: "expire", reservation: r.key });
    }
    if (p.kind === "contact") {
      const a = this.actor(p.a),
        b = this.actor(p.b);
      if (
        p.ga === this.kernel.generation(motionScope(a.key)) &&
        p.gb === this.kernel.generation(motionScope(b.key))
      ) {
        this.perceive(p.a, "physical contact boundary", true);
        this.perceive(p.b, "physical contact boundary", true);
        this.kernel.record("spatial-radius-crossing", e.subject, {
          a: p.a,
          b: p.b,
          radius: p.radius,
        });
      }
    }
  }
  private goods(request: GoodsRequest): Key {
    const parent =
      "actor" in request
        ? request.actor
        : "to" in request
          ? request.to
          : request.reservation;
    // Validate before allocating identities, settling motion, or changing stock.
    const tag = canonical(["transaction", parent]),
      ordinal = this.kernel.state.ids.ordinals[tag] ?? 0,
      key = lineage("transaction", parent, ordinal),
      now = this.kernel.state.now;
    if (
      this.storage &&
      !(request.kind === "sink" && request.sink === "spoilage")
    ) {
      const projected = this.storage.preview(request);
      this.ledger.validateProjected(key, now, request, projected);
      for (const container of projected.keys()) this.storage.settle(container);
    }
    const prepared = this.ledger.prepare(
      lineage("transaction", parent, this.kernel.state.ids.ordinals[tag] ?? 0),
      now,
      request,
    );
    for (const actor of prepared.loadActors)
      this.movement.settle(this.actor(actor), now);
    this.kernel.ids.allocate("transaction", parent);
    const committed = prepared.commit();
    if (
      this.storage &&
      !(request.kind === "sink" && request.sink === "spoilage")
    ) {
      const keys =
        request.kind === "source"
          ? [request.to]
          : request.kind === "transfer"
            ? [request.from, request.to]
            : request.kind === "sink"
              ? [request.from]
              : [];
      for (const container of keys) this.storage.touch(container);
    }
    if (request.kind === "transfer")
      this.materials?.transfer(
        request.from,
        request.to,
        request.good,
        request.quantity,
      );
    for (const actor of prepared.loadActors) {
      const a = this.actor(actor),
        r = this.routes.get(actor);
      if (r) r.inputs.loadCu = this.inputs(actor).loadCu;
      if (a.motion?.status === "moving") {
        this.kernel.invalidate(motionScope(actor));
        a.motion.inputs.loadCu = this.inputs(actor).loadCu;
        this.launchLeg(a);
      }
    }
    if (request.kind === "reserve")
      this.kernel.schedule(committed.key, request.expires, PHASE.settle, {
        kind: "lease",
        reservation: committed.key,
      });
    if (request.kind === "release") this.kernel.invalidate(request.reservation);
    this.kernel.record("goods-" + request.kind, parent, {
      transaction: committed.key,
      request,
    });
    return committed.key;
  }
  diagnosticGoods(request: Exclude<GoodsRequest, { kind: "expire" }>): Key {
    if ("actor" in request && this.epistemicActors.has(request.actor))
      throw Error("Personal actor must use generic task runtime");
    return this.goods(request);
  }
  diagnosticInterrupt(actor: Key): void {
    if (this.epistemicActors.has(actor)) throw Error("Use task interruption");
    const a = this.actor(actor);
    this.movement.interrupt(a, this.kernel.state.now);
    this.kernel.invalidate(motionScope(actor));
    this.routes.delete(actor);
    this.kernel.record("diagnostic-interruption", actor, {
      position: a.position,
    });
  }
  diagnosticInputs(actor: Key, inputs: MotionInputs): void {
    if (this.epistemicActors.has(actor))
      throw Error("Personal motion inputs are supplied by the physical law");
    baseSpeed(inputs, this.config);
    const a = this.actor(actor);
    if (!a.motion || a.motion.status !== "moving")
      throw new Error("No active motion");
    this.movement.settle(a, this.kernel.state.now);
    this.kernel.invalidate(motionScope(actor));
    a.motion.inputs = { ...inputs };
    this.launchLeg(a);
  }
  diagnosticTerrain(k: number, passable: boolean, speed: number): void {
    if (
      !Number.isInteger(k) ||
      k < 0 ||
      k >= this.terrain.kind.length ||
      !Number.isFinite(speed) ||
      speed < 0 ||
      (passable && speed === 0)
    )
      throw new Error("Invalid terrain mutation");
    // Only occupied cells and supercover corner guards belong to executable
    // geometry. A nearby unused cell cannot invalidate a held movement leg.
    const changed =
      this.terrain.passable[k] !== +passable || this.terrain.speed[k] !== speed;
    const affected = changed
      ? this.actors.filter((a) => {
          const m = a.motion;
          if (m?.status !== "moving") return false;
          if (this.epistemicActors.has(a.key)) return m.leg?.cell === k;
          return !passable
            ? m.segments
                .slice(m.segmentCursor)
                .some((s) => s.cell === k || s.guards?.includes(k))
            : m.leg?.cell === k;
        })
      : [];
    for (const a of affected) this.movement.settle(a, this.kernel.state.now);
    changeCell(this.terrain, k, passable, speed);
    this.regions = buildRegions(this.terrain);
    for (const a of affected) {
      this.kernel.invalidate(motionScope(a.key));
      if (!passable) {
        this.movement.interrupt(a, this.kernel.state.now);
        if (this.epistemicActors.has(a.key)) {
          this.perceive(a.key, "local terrain change", true);
          this.runtime.interrupt(a.key, "local route interruption");
        }
        this.kernel.record("terrain-motion-interruption", a.key, {
          cell: k,
          position: a.position,
        });
      } else this.launchLeg(a);
    }
    this.kernel.record("diagnostic-terrain-change", digest(["terrain", k]), {
      cell: k,
      passable,
      speed,
    });
  }
  snapshot(includeTerrain = false): Snapshot {
    if (!this.kernel.committed)
      throw new Error("Projection requires committed boundary");
    const now = this.kernel.state.now,
      actors = this.actors.map((a) => {
        const carried = this.ledger.state.containers.find(
          (c) => c.location.kind === "carrier" && c.location.actor === a.key,
        )!;
        return {
          key: a.key,
          label: a.label,
          position: this.position(a.key),
          leg: a.motion?.leg ? JSON.parse(JSON.stringify(a.motion.leg)) : null,
          motionStatus: a.motion?.status ?? "idle",
          paidTravelSd: sd(
            a.travelPaidQuanta +
              (a.motion?.status === "moving" ? now - a.motion.paidThrough : 0),
          ),
          cargoCu: this.ledger.load(carried.key),
          inputs: a.motion ? { ...a.motion.inputs } : null,
          container: carried.key,
          body: this.adultPhysical.analyst(a.key),
        };
      });
    const containers = this.ledger.state.containers.map((c) => ({
      key: c.key,
      kind: c.kind,
      position: this.ledger.location(c.key),
      custodian: c.custodian,
      capacityCu: c.capacityCu,
      stocks: { ...c.stocks },
    }));
    this.counters.projectionEntities += actors.length + containers.length;
    const terrain = includeTerrain
      ? {
          width: this.config.spatial.width,
          height: this.config.spatial.height,
          cellKm: this.config.spatial.cellKm,
          version: this.terrain.version,
          kind: Array.from(this.terrain.kind),
          colors: this.config.terrain.map((t) => t.color),
        }
      : undefined;
    const result = {
      time: now,
      seed: this.seed,
      hash: this.causalHash(),
      eventHash: this.kernel.state.historyHash,
      predator: this.danger.state.predator
        ? {
            key: this.danger.state.predator.key,
            position: { ...this.danger.state.predator.point },
            retreating:
              this.danger.state.predator.retreatUntil > this.kernel.state.now,
          }
        : null,
      fixture:
        this.mind.state.length && this.config.spatial.width === 16
          ? "Stage I.1 material life — autonomous adults, no selected actions"
          : this.config.spatial.width === 6 && this.config.spatial.height === 6
            ? "Pack 0C3A exploration proof — autonomous adults, no selected actions"
            : this.mind.state.length
              ? "Pack 0C2 autonomous personal review"
              : this.adultPhysical.state.bodies.length
                ? "Pack 0C1 diagnostic body/work/recovery fixture — no autonomous choice"
                : this.epistemicActors.size
                  ? "Pack 0B diagnostic selected-intention fixture — no autonomous choice"
                  : "Diagnostic physical execution fixture — no autonomous choice",
      actors,
      containers,
      reservations: this.ledger.state.reservations.map((r) => ({ ...r })),
      history: this.kernel.state.history
        .slice(-30)
        .map(({ key, at, kind, subject }) => ({ key, at, kind, subject })),
      personalLenses: [...this.epistemicActors]
        .sort()
        .map((actor) => this.personalLens(actor)),
      counters: { ...this.counters },
      reconciliation: this.ledger.reconciliation(),
      ...(terrain ? { terrain } : {}),
    };
    return freezeProjection(result);
  }
  private saveRecord(): Save {
    if (!this.kernel.committed)
      throw new Error("Checkpoint requires committed boundary");
    const terrain: Record<string, unknown> = {
      profile: this.terrain.profile,
      version: this.terrain.version,
    };
    for (const f of FIELDS) terrain[f] = Array.from(this.terrain[f]);
    return {
      versions,
      contentHash: CONTENT_HASH,
      configurationHash: digest(this.config),
      seed: this.seed,
      config: this.config,
      time: this.kernel.state.now,
      phase: -1,
      fork: this.fork,
      kernel: {
        ...this.kernel.state,
        queue: [...this.kernel.state.queue].sort(compareEvents),
      },
      terrain,
      actors: this.actors,
      goods: this.ledger.state,
      evidence: this.evidence.persisted(),
      runtime: this.runtime.state,
      adultPhysical: this.adultPhysical.state,
      materials: this.materials.state,
      danger: this.danger.state,
      storage: this.storage.state,
      mind: this.mind.state,
      epistemicActors: [...this.epistemicActors].sort(),
      routes: [...this.routes.values()].sort((a, b) =>
        compareKey(a.actor, b.actor),
      ),
    };
  }
  private terrainDigestCache: { version: number; hash: string } | null = null;
  materialSnapshot(): MaterialState {
    return freezeProjection(clone(this.materials.state));
  }
  causalHash(): string {
    if (!this.kernel.committed)
      throw new Error("Hash requires committed boundary");
    if (this.terrainDigestCache?.version !== this.terrain.version)
      this.terrainDigestCache = {
        version: this.terrain.version,
        hash: digest(this.terrain),
      };
    return digest({
      versions,
      contentHash: CONTENT_HASH,
      configurationHash: digest(causalConfig(this.config)),
      seed: this.seed,
      config: causalConfig(this.config),
      time: this.kernel.state.now,
      phase: -1,
      fork: this.fork,
      kernel: {
        ...this.kernel.state,
        queue: [...this.kernel.state.queue].sort(compareEvents),
      },
      terrainHash: this.terrainDigestCache.hash,
      actors: this.actors,
      goods: this.ledger.state,
      evidence: this.evidence.persisted(),
      runtime: this.runtime.state,
      adultPhysical: this.adultPhysical.state,
      materials: this.materials.state,
      danger: this.danger.state,
      storage: this.storage.state,
      mind: this.mind.state,
      epistemicActors: [...this.epistemicActors].sort(),
      routes: [...this.routes.values()].sort((a, b) =>
        compareKey(a.actor, b.actor),
      ),
    });
  }
  checkpoint(): string {
    const body = this.saveRecord(),
      text = canonical({ checksum: digest(body), body });
    this.counters.checkpoints++;
    this.counters.checkpointBytes = text.length;
    return text;
  }
  static restore(text: string): PhysicalSimulation {
    const parsed = JSON.parse(text) as { checksum: string; body: Save },
      s = parsed.body;
    if (!s || parsed.checksum !== digest(s))
      throw new Error("Checkpoint checksum mismatch");
    if (
      canonical(s.versions) !== canonical(versions) ||
      s.contentHash !== CONTENT_HASH
    )
      throw new Error("Incompatible checkpoint version/profile/source/content");
    if (
      s.configurationHash !== digest(s.config) ||
      s.phase !== -1 ||
      s.kernel.phase !== -1 ||
      s.time !== s.kernel.now
    )
      throw new Error("Invalid checkpoint metadata");
    checkTime(s.time);
    // Full records are validated before a restored owner is returned.
    validateSaved(s);
    const sim = new PhysicalSimulation(s.seed, freezeProjection(s.config), s);
    const ledger = sim.ledger.reconciliation();
    if (!ledger.ok)
      throw new Error(
        "Checkpoint violates conservation: " + ledger.errors.join(","),
      );
    return sim;
  }
  forkConfiguration(
    config: PhysicalConfig,
    reason: string,
  ): PhysicalSimulation {
    if (!reason) throw new Error("Intervention requires reason");
    const cp = this.checkpoint(),
      body = JSON.parse(cp).body as Save;
    if (
      canonical(config.spatial) !== canonical(this.config.spatial) ||
      canonical(config.goods) !== canonical(this.config.goods) ||
      canonical(config.generator) !== canonical(this.config.generator)
    )
      throw new Error("Physical migration is not implemented");
    body.config = config;
    body.configurationHash = digest(config);
    body.fork = {
      parentCheckpoint: digest(cp),
      intervention: {
        at: body.time,
        reason,
        oldConfig: digest(this.config),
        newConfig: digest(config),
      },
    };
    const result = new PhysicalSimulation(this.seed, config, body);
    for (const a of result.actors)
      if (a.motion?.status === "moving") {
        result.movement.settle(a, body.time);
        result.kernel.invalidate(motionScope(a.key));
        result.launchLeg(a);
      }
    result.kernel.record(
      "configuration-intervention",
      digest(["fork", body.fork]),
      body.fork,
    );
    return result;
  }
}
function motionScope(actor: Key): Key {
  return digest(["physical-motion", actor]);
}
function causalConfig(config: PhysicalConfig) {
  const { routeExpansionsPerResume: _workSlice, ...diagnostic } =
    config.diagnostic;
  return { ...config, diagnostic };
}
function freezeProjection<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) freezeProjection(v);
    Object.freeze(value);
  }
  return value;
}
function restoreTerrain(
  raw: Record<string, unknown>,
  c: PhysicalConfig,
): Terrain {
  const t = {
    profile: { ...c.spatial },
    version: raw.version as number,
  } as Terrain;
  for (const f of FIELDS) {
    const data = raw[f] as number[];
    if (
      !Array.isArray(data) ||
      data.length !== c.spatial.width * c.spatial.height ||
      !data.every(Number.isFinite)
    )
      throw new Error("Invalid terrain checkpoint");
    const array =
      f === "drain"
        ? new Int32Array(data)
        : ["kind", "passable", "opaque"].includes(f)
          ? new Uint8Array(data)
          : new Float64Array(data);
    (t as unknown as Record<string, unknown>)[f] = array;
  }
  return t;
}
function validateSaved(s: Save): void {
  if (
    !s.evidence ||
    !Array.isArray(s.evidence.people) ||
    !s.runtime ||
    !Array.isArray(s.runtime.tasks) ||
    !Array.isArray(s.runtime.terminal) ||
    !Array.isArray(s.runtime.paidArchive) ||
    !s.runtime.effort ||
    !s.runtime.reviewAuthorizations ||
    !Array.isArray(s.evidence.pinnedGeography) ||
    !Array.isArray(s.runtime.activity) ||
    !Array.isArray(s.epistemicActors)
  )
    throw Error("Checkpoint lacks Pack0B causal records");
  const owners = new Set(s.actors.map((a) => a.key));
  if (
    !Array.isArray(s.mind) ||
    new Set(s.mind.map((m) => m.actor)).size !== s.mind.length ||
    s.mind.some((m) => !s.epistemicActors.includes(m.actor))
  )
    throw Error("Invalid cognitive owners");
  if (
    new Set(s.epistemicActors).size !== s.epistemicActors.length ||
    s.epistemicActors.some((k) => !owners.has(k))
  )
    throw Error("Invalid personal owners");
  for (const p of s.evidence.people) {
    if (
      !s.epistemicActors.includes(p.owner) ||
      !Array.isArray(p.records) ||
      !p.versions ||
      !p.cells ||
      !p.coverage ||
      !p.links ||
      !p.delivered ||
      !p.memory ||
      !p.memory.precedent ||
      !p.mapObservations
    )
      throw Error("Invalid evidence owner/state");
    const latest = new Map<string, number>();
    for (const e of p.records) {
      checkTime(e.observedAt);
      checkTime(e.receivedAt);
      const key = beliefKey(e.subject, e.property);
      if (
        e.owner !== p.owner ||
        e.observedAt > e.receivedAt ||
        e.receivedAt > s.time ||
        !Number.isSafeInteger(e.version) ||
        e.version !== p.versions[key] ||
        latest.has(key) ||
        !Number.isFinite(e.reliability) ||
        e.reliability < 0 ||
        e.reliability > 1 ||
        !Number.isFinite(e.uncertainty) ||
        e.uncertainty < 0
      )
        throw Error("Invalid evidence record/version");
      latest.set(key, e.version);
    }
    if (canonical(Object.fromEntries(latest)) !== canonical(p.versions))
      throw Error("Evidence versions do not reconcile");
    if (
      !(p.memory.precedent.regionKm > 0) ||
      Object.values(p.memory.precedent.regions).some(
        (r) =>
          !Number.isSafeInteger(r.forgottenPlaces) ||
          r.forgottenPlaces < 0 ||
          r.observedEmpty < 0 ||
          r.observedEmpty > r.forgottenPlaces ||
          r.lastAt > s.time,
      )
    )
      throw Error("Invalid regional precedent");
    const refs: Record<string, number> = {};
    for (const c of Object.values(p.cells))
      refs[c.provenance] = (refs[c.provenance] ?? 0) + 1;
    for (const [key, o] of Object.entries(p.mapObservations)) {
      checkTime(o.observedAt);
      checkTime(o.receivedAt);
      if (
        o.provenance !== key ||
        o.references !== refs[key] ||
        o.receivedAt > s.time ||
        o.observedAt > o.receivedAt
      )
        throw Error("Invalid compact map provenance");
    }
    if (Object.keys(refs).some((k) => !p.mapObservations[k]))
      throw Error("Missing map observation");
    const pinned = (subject: string) =>
      p.records.some((e) => e.subject === subject && e.pinned) ||
      Object.values(p.memory.pins).some(
        (pin) =>
          pin.subjects.includes(subject) ||
          pin.beliefKeys.some(
            (k) => (JSON.parse(k) as string[])[0] === subject,
          ) ||
          pin.targets.some((t) =>
            p.records.some(
              (e) =>
                e.subject === subject &&
                e.property === "location" &&
                (e.value as Point).x === t.x &&
                (e.value as Point).y === t.y,
            ),
          ),
      );
    if (
      Object.keys(p.memory.places).filter((k) => !pinned(k)).length >
        s.config.evidence.places ||
      Object.keys(p.delivered).length !== p.records.length ||
      Object.keys(p.memory.places).some(
        (k) =>
          !p.records.some(
            (e) =>
              e.subject === k &&
              e.property === "kind" &&
              (e.value === "site" || e.value === "cache"),
          ),
      )
    )
      throw Error("Invalid bounded personal memory");
    if (
      p.routine.count < 0 ||
      p.routine.count > s.config.evidence.routineObservations
    )
      throw Error("Invalid routine attention account");
    for (const [k, c] of Object.entries(p.cells))
      if (
        +k !== c.cell ||
        !Number.isSafeInteger(c.version) ||
        c.version < 1 ||
        !p.mapObservations[c.provenance] ||
        !Number.isFinite(c.speed) ||
        !Number.isFinite(c.detection)
      )
        throw Error("Invalid personal geography");
  }
  const pinnedVersions = new Set<string>();
  for (const v of s.evidence.pinnedGeography) {
    validateTree(v.cells, (c) => String(c.cell).padStart(8, "0"));
    validateTree(v.observations, (o) => o.provenance);
    if (
      pinnedVersions.has(v.id) ||
      v.id !== `${v.owner}:${v.revision}` ||
      !owners.has(v.owner) ||
      !Number.isSafeInteger(v.revision) ||
      v.revision < 0
    )
      throw Error("Invalid personal geography version");
    pinnedVersions.add(v.id);
    const metadata = new Map(
      entries(v.observations).map((o) => [o.provenance, o]),
    );
    for (const c of entries(v.cells)) {
      const o = metadata.get(c.provenance);
      if (
        !o ||
        c.observedAt > s.time ||
        c.version < 1 ||
        !Number.isSafeInteger(c.cell) ||
        c.cell < 0 ||
        c.cell >= s.config.spatial.width * s.config.spatial.height ||
        !Number.isFinite(c.speed) ||
        (c.passable && !(c.speed > 0))
      )
        throw Error("Invalid pinned geography backing");
    }
  }
  if (
    Object.values(s.evidence.geographyPins).some(
      (id) => !pinnedVersions.has(id),
    )
  )
    throw Error("Missing geography pin backing");
  const currentActors = new Set<string>();
  for (const t of s.runtime.tasks) {
    if (
      currentActors.has(t.actor) ||
      ["done", "failed", "abandoned"].includes(t.status)
    )
      throw Error("Terminal/duplicate task in active table");
    currentActors.add(t.actor);
  }
  for (const t of s.runtime.terminal)
    if (!["done", "failed", "abandoned"].includes(t.status))
      throw Error("Live task in terminal archive");
  for (const [key, index] of Object.entries(s.runtime.retry))
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      !s.runtime.terminal[index] ||
      key !==
        s.runtime.terminal[index]!.actor +
          ":" +
          s.runtime.terminal[index]!.semanticKey
    )
      throw Error("Invalid semantic retry backing");
  for (const [actor, index] of Object.entries(s.runtime.latestTerminal))
    if (s.runtime.terminal[index]?.actor !== actor)
      throw Error("Invalid terminal archive reference");
  for (const [key, a] of Object.entries(s.runtime.effort)) {
    checkTime(a.openedAt);
    if (
      key !== a.key ||
      key !== canonical([a.actor, a.kind, a.openedAt]) ||
      !owners.has(a.actor) ||
      a.openedAt > s.time ||
      a.allowance !== EFFORT_PROFILE[a.kind] ||
      a.expansionsPerEu !== EFFORT_PROFILE.routeExpansionsPerEu ||
      !Number.isSafeInteger(a.spent) ||
      a.spent < 0 ||
      a.spent > a.allowance ||
      !Number.isSafeInteger(a.routeExpansions) ||
      a.routeExpansions < 0 ||
      !Number.isSafeInteger(a.prepaidExpansions) ||
      a.prepaidExpansions < 0 ||
      a.prepaidExpansions >= a.expansionsPerEu ||
      a.routeExpansions + a.prepaidExpansions > a.spent * a.expansionsPerEu
    )
      throw Error("Invalid cognitive effort account");
  }
  for (const [actor, key] of Object.entries(s.runtime.currentEffort))
    if (s.runtime.effort[key]?.actor !== actor)
      throw Error("Missing actor effort backing");
  for (const m of s.mind) {
    if (m.periodicAt <= s.time || (m.nextWake !== null && m.nextWake <= s.time))
      throw Error("Invalid cognitive wake schedule");
    for (const trace of m.traces) {
      const backing = s.runtime.effort[trace.effort.key];
      if (
        trace.actor !== m.actor ||
        trace.at > s.time ||
        !backing ||
        backing.actor !== m.actor ||
        backing.spent < trace.effort.spent ||
        (trace.selected &&
          s.runtime.reviewAuthorizations[trace.effort.key] !==
            digest(trace.selected))
      )
        throw Error("Missing cognitive trace/admission backing");
    }
  }
  for (const key of Object.keys(s.runtime.reviewAuthorizations))
    if (
      !s.runtime.effort[key] ||
      !/^[a-f0-9]{32}$/.test(s.runtime.reviewAuthorizations[key]!)
    )
      throw Error("Missing review authorization backing");
  const taskIds = new Set<string>();
  for (const t of [
    ...s.runtime.tasks,
    ...(s.runtime.suspended ?? []),
    ...s.runtime.terminal,
  ]) {
    const budget = s.runtime.budgets[t.actor + ":" + t.semanticKey];
    if (
      !owners.has(t.actor) ||
      taskIds.has(t.taskId) ||
      s.runtime.issuedTaskIds[t.taskId] !== true ||
      !Number.isSafeInteger(t.paidForStep) ||
      t.paidForStep < 0 ||
      !Number.isFinite(t.physicalStepOutput) ||
      t.physicalStepOutput < 0 ||
      t.paidForStep > (budget?.spent.time ?? 0) ||
      !Number.isSafeInteger(t.bindingRevision) ||
      t.bindingRevision < 0 ||
      !budget ||
      !t.source ||
      (t.envelope &&
        (!t.effortAccount ||
          !s.runtime.reviewAuthorizations[t.effortAccount] ||
          t.envelope.reviewAccount !== t.effortAccount ||
          s.runtime.effort[t.effortAccount]?.actor !== t.actor)) ||
      t.steps.length > s.config.evidence.maxTaskSteps ||
      t.cursor < 0 ||
      t.cursor > t.steps.length
    )
      throw Error("Invalid runtime task");
    if (
      t.maintenanceForStep !== undefined &&
      (!Number.isFinite(t.maintenanceForStep) || t.maintenanceForStep < 0)
    )
      throw Error("Invalid paid maintenance cursor");
    for (const step of t.steps)
      if (
        step.maintenance &&
        (!(step.family === "Work" || step.family === "Move") ||
          !step.maintenance.from ||
          !step.maintenance.good ||
          ![step.maintenance.rate, step.maintenance.quantity].every(
            (x) => Number.isFinite(x) && x > 0,
          ))
      )
        throw Error("Invalid saved standing nourishment");
    taskIds.add(t.taskId);
    if (s.runtime.purpose[canonical([t.actor, t.objective])] !== t.semanticKey)
      throw Error("Invalid original purpose backing");
    if (
      t.active &&
      (t.status !== "running" ||
        t.active.paidThrough > s.time ||
        t.active.paidThrough < t.active.start)
    )
      throw Error("Invalid operation cursor");
    if (t.route) {
      const r = t.route;
      if (
        !r.nodes ||
        !Array.isArray(r.open) ||
        !Array.isArray(r.path) ||
        !Number.isSafeInteger(r.expansions) ||
        r.expansions < 0 ||
        !Number.isSafeInteger(r.regionExpansions) ||
        r.regionExpansions < 0 ||
        (r.geographyId !== null &&
          !s.evidence.pinnedGeography.some(
            (v) => v.id === r.geographyId && v.owner === t.actor,
          )) ||
        !s.runtime.effort[r.effortAccount!]
      )
        throw Error("Invalid personal frontier");
      for (const open of [r.open, r.coarse.open])
        for (let i = 0; i < open.length; i++) {
          const n = open[i]!,
            parent = open[(i - 1) >>> 1];
          if (
            !Number.isFinite(n.f) ||
            !Number.isFinite(n.g) ||
            n.g < 0 ||
            !Number.isSafeInteger(n.cell) ||
            (i > 0 &&
              parent &&
              (parent.f - n.f || parent.cell - n.cell || parent.g - n.g) > 0)
          )
            throw Error("Invalid persisted personal heap");
        }
      for (const [k, n] of Object.entries(r.nodes))
        if (
          !Number.isSafeInteger(+k) ||
          +k < 0 ||
          +k >= s.config.spatial.width * s.config.spatial.height ||
          !Number.isFinite(n.g) ||
          n.g < 0 ||
          (n.parent !== -1 && !r.nodes[n.parent])
        )
          throw Error("Invalid personal search node");
    }
    for (const reservation of t.reservations)
      if (
        !s.goods.reservations.some(
          (r) => r.key === reservation.key && r.actor === t.actor,
        )
      )
        throw Error("Missing task reservation backing");
  }
  const paid = new Map<string, number>();
  for (const a of s.runtime.activity) {
    if (!owners.has(a.actor)) throw Error("Invalid activity owner");
    if (a.prefixes.length !== 0) throw Error("Closed prefixes in active state");
    let end = 0;
    const totals: Record<number, Record<string, number>> = {};
    for (const p of [
      ...s.runtime.paidArchive.filter((p) => p.actor === a.actor),
      ...a.prefixes,
    ]) {
      checkTime(p.start);
      checkTime(p.end);
      if (
        !Number.isSafeInteger(p.revision) ||
        p.revision < 0 ||
        p.start < end ||
        p.end < p.start ||
        p.end > s.time
      )
        throw Error("Overlapping paid prefixes");
      end = p.end;
      const key = a.actor + ":" + p.semanticKey;
      paid.set(key, (paid.get(key) ?? 0) + p.end - p.start);
      for (let x = p.start; x < p.end;) {
        const day = Math.floor(x / QUANTA),
          to = Math.min(p.end, (day + 1) * QUANTA),
          v = totals[day] ?? {};
        v[p.category] = (v[p.category] ?? 0) + to - x;
        totals[day] = v;
        x = to;
      }
    }
    if (
      canonical(totals) !==
        canonical({
          ...Object.fromEntries(
            s.runtime.activityArchive
              .filter((r) => r.actor === a.actor)
              .map((r) => [r.day, r.totals]),
          ),
          ...a.totals,
        }) ||
      Object.values(totals).some(
        (v) => Object.values(v).reduce((a, b) => a + b, 0) > QUANTA,
      )
    )
      throw Error("Activity allocation does not reconcile");
    if (a.lastPaidEnd !== end)
      throw Error("Personal paid cursor does not reconcile");
  }
  for (const [key, b] of Object.entries(s.runtime.budgets)) {
    checkTime(b.spent.time);
    checkTime(b.authorised.time);
    const original = JSON.parse(b.descriptor) as [
      string,
      string,
      unknown,
      unknown,
      unknown,
    ];
    const actor = key.slice(0, 32);
    if (
      canonical(original[4]) !== canonical(b.authorised) ||
      key !==
        actor +
          ":" +
          digest([actor, original[0], original[1], original[2], original[3]])
    )
      throw Error("Original semantic authorisation mismatch");
    if (
      b.spent.time > b.authorised.time ||
      b.spent.time !== (paid.get(key) ?? 0) ||
      Object.entries(b.spent.goods).some(
        ([good, q]) =>
          !Number.isFinite(q) || q < 0 || q > (b.authorised.goods[good] ?? 0),
      )
    )
      throw Error("Semantic budget does not reconcile");
  }
  const identities = s.kernel.ids;
  if (
    !Number.isSafeInteger(identities.nextHandle) ||
    identities.nextHandle < 1 ||
    new Set(identities.keys).size !== identities.keys.length ||
    identities.keys.some((k) => !/^[a-f0-9]{32}$/.test(k))
  )
    throw new Error("Invalid saved identities");
  for (const value of Object.values(identities.ordinals))
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error("Invalid semantic ordinal");
  const cellCount = s.config.spatial.width * s.config.spatial.height;
  const validCell = (k: number) =>
    Number.isSafeInteger(k) && k >= 0 && k < cellCount;
  for (const request of s.routes) {
    const search = request.search;
    if (
      !s.actors.some((a) => a.key === request.actor) ||
      !validCell(search.start) ||
      !validCell(search.goal) ||
      !["regional", "local"].includes(search.stage) ||
      search.status !== "unresolved" ||
      !Number.isSafeInteger(search.version) ||
      search.version > (s.terrain.version as number) ||
      !Array.isArray(search.path) ||
      !search.path.every(validCell) ||
      (search.corridor !== null &&
        (!Array.isArray(search.corridor) ||
          !search.corridor.every(validCell))) ||
      (search.stage === "regional" && !search.regional)
    )
      throw new Error("Invalid saved route");
    baseSpeed(request.inputs, s.config);
    for (const frontier of [
      search,
      ...(search.regional ? [search.regional] : []),
    ]) {
      if (!frontier.nodes || !Array.isArray(frontier.open))
        throw new Error("Invalid saved frontier");
      for (const [key, node] of Object.entries(frontier.nodes)) {
        if (
          !validCell(Number(key)) ||
          String(Number(key)) !== key ||
          !Number.isFinite(node.g) ||
          node.g < 0 ||
          typeof node.closed !== "boolean" ||
          (node.parent !== -1 &&
            (!validCell(node.parent) || !frontier.nodes[node.parent]))
        )
          throw new Error("Invalid saved search node");
      }
      for (const node of frontier.open)
        if (
          !validCell(node.k) ||
          !frontier.nodes[node.k] ||
          !Number.isFinite(node.g) ||
          !Number.isFinite(node.f) ||
          node.g < 0 ||
          node.f < 0
        )
          throw new Error("Invalid saved search heap");
    }
  }
  if (
    !s.adultPhysical ||
    !Array.isArray(s.adultPhysical.bodies) ||
    !Array.isArray(s.adultPhysical.sites) ||
    !Array.isArray(s.adultPhysical.segments)
  )
    throw Error("Missing physical continuation state");
  const liveTasks = new Map(s.runtime.tasks.map((t) => [t.actor, t]));
  for (const b of s.adultPhysical.bodies)
    if (!owners.has(b.actor)) throw Error("Body without person");
  for (const site of s.adultPhysical.sites) {
    if (
      !identities.keys.includes(site.key) ||
      cell({ profile: s.config.spatial } as Terrain, site.point) < 0
    )
      throw Error("Resource without valid identity/location");
  }
  for (const segment of s.adultPhysical.segments) {
    const task = liveTasks.get(segment.actor);
    if (
      !task ||
      task.taskId !== segment.taskId ||
      task.status !== "running" ||
      !task.active ||
      (task.active.end !== segment.end && task.active.family !== "Move")
    )
      throw Error("Physical segment without matching active task");
    if (segment.from) {
      const container = s.goods.containers.find((c) => c.key === segment.from),
        reservation = s.goods.reservations.find(
          (r) => r.key === segment.reservation,
        );
      if (
        !container ||
        container.custodian !== segment.actor ||
        !reservation ||
        reservation.container !== segment.from ||
        reservation.actor !== segment.actor ||
        reservation.status !== "active"
      )
        throw Error("Consumption without goods backing");
    }
  }
  const seen = new Set<number>();
  for (const e of [...s.actors, ...s.goods.containers, ...s.kernel.queue]) {
    if (
      !Number.isSafeInteger(e.handle) ||
      e.handle < 1 ||
      e.handle >= identities.nextHandle ||
      seen.has(e.handle) ||
      !identities.keys.includes(e.key)
    )
      throw new Error("Invalid saved entity/event");
    seen.add(e.handle);
  }
  for (const e of s.kernel.queue) {
    checkTime(e.at);
    if (
      e.at <= s.time ||
      e.phase < 0 ||
      e.phase > 7 ||
      !Number.isInteger(e.phase)
    )
      throw new Error("Invalid pending event");
  }
  for (const a of s.actors) {
    if (!Number.isFinite(a.position.x) || !Number.isFinite(a.position.y))
      throw new Error("Invalid actor position");
    checkTime(a.travelPaidQuanta);
    if (a.motion?.leg) {
      checkTime(a.motion.leg.start);
      checkTime(a.motion.leg.end);
      if (
        a.motion.leg.end <= a.motion.leg.start ||
        a.motion.leg.start > s.time ||
        a.motion.leg.end <= s.time
      )
        throw new Error("Invalid saved movement anchor");
      baseSpeed(a.motion.inputs, s.config);
    }
  }
}
