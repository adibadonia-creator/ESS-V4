import {
  CONTENT_HASH,
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
import { QUANTA, checkTime, future, sd, type Time } from "../kernel/time";
import { versions } from "../kernel/versions";
import { math } from "../kernel/numerics";
import type { Snapshot } from "../projection/types";
import { GoodsLedger, type GoodsRequest, type GoodsState } from "./goods";
import {
  Movement,
  positionAt,
  baseSpeed,
  type PersonShell,
  type MotionInputs,
} from "./movement";
import {
  beginSearch,
  resumeSearch,
  pullPath,
  segments,
  type SearchState,
} from "./routing";
import { SpatialIndex } from "./spatial";
import {
  generateTerrain,
  buildRegions,
  cell,
  center,
  changeCell,
  type Terrain,
  type Point,
  type Regions,
} from "./terrain";
type PhysicalEvent =
  | { kind: "leg"; actor: Key; generation: number }
  | { kind: "lease"; reservation: Key }
  | { kind: "contact"; a: Key; b: Key; ga: number; gb: number; radius: number }
  | { kind: "diagnostic"; actor: Key };
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
  private routes = new Map<Key, RouteRequest>();
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
      this.ledger.add({
        ...cache,
        kind: "cache",
        location: { kind: "ground", point: { ...p } },
        custodian: a.key,
        capacityCu: d.cacheCapacityCu,
        stocks: {},
      });
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
    for (let i = 0; i < d.sites; i++) {
      const k = cells[Math.floor(((i + 0.25) * cells.length) / d.sites)]!,
        p = center(this.terrain, k),
        id = this.kernel.ids.allocate("resource-site", root, i);
      const g = this.config.goods[i % this.config.goods.length]!,
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
  private inputs(actor: Key): MotionInputs {
    const a = this.actor(actor),
      carried = this.ledger.state.containers.find(
        (c) => c.location.kind === "carrier" && c.location.actor === a.key,
      )!;
    return {
      ability: 1,
      condition: 1,
      wound: 0,
      fatigue: 0,
      nominalCargoCu: this.config.diagnostic.nominalCargoCu,
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
    this.kernel.advance(target, (e) => this.execute(e));
  }
  private execute(e: Event<PhysicalEvent>): void {
    const p = e.payload;
    if (p.kind === "diagnostic")
      this.kernel.record("diagnostic-unrelated-event", p.actor, {});
    if (p.kind === "leg") {
      const a = this.actor(p.actor);
      if (a.motion?.status !== "moving" || p.generation !== a.motion.generation)
        return;
      this.movement.finishLeg(a, e.at);
      this.spatial.put(a.key, a.position);
      this.launchLeg(a);
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
      )
        this.kernel.record("spatial-radius-crossing", e.subject, {
          a: p.a,
          b: p.b,
          radius: p.radius,
        });
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
    const prepared = this.ledger.prepare(key, now, request);
    for (const actor of prepared.loadActors)
      this.movement.settle(this.actor(actor), now);
    this.kernel.ids.allocate("transaction", parent);
    prepared.commit();
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
      this.kernel.schedule(key, request.expires, PHASE.settle, {
        kind: "lease",
        reservation: key,
      });
    if (request.kind === "release") this.kernel.invalidate(request.reservation);
    this.kernel.record("goods-" + request.kind, parent, {
      transaction: key,
      request,
    });
    return key;
  }
  diagnosticGoods(request: Exclude<GoodsRequest, { kind: "expire" }>): Key {
    return this.goods(request);
  }
  diagnosticInterrupt(actor: Key): void {
    const a = this.actor(actor);
    this.movement.interrupt(a, this.kernel.state.now);
    this.kernel.invalidate(motionScope(actor));
    this.routes.delete(actor);
    this.kernel.record("diagnostic-interruption", actor, {
      position: a.position,
    });
  }
  diagnosticInputs(actor: Key, inputs: MotionInputs): void {
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
      fixture: "Diagnostic physical execution fixture — no autonomous choice",
      actors,
      containers,
      reservations: this.ledger.state.reservations.map((r) => ({ ...r })),
      history: this.kernel.state.history
        .slice(-30)
        .map(({ key, at, kind, subject }) => ({ key, at, kind, subject })),
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
      routes: [...this.routes.values()].sort((a, b) =>
        compareKey(a.actor, b.actor),
      ),
    };
  }
  private terrainDigestCache: { version: number; hash: string } | null = null;
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
