import { EXPLORATION } from "../content/exploration";
import type { ExplorationOutcome } from "./types";
import { EXTRACTION_INDEX } from "../content/extraction";
import { METHOD_INDEX } from "../content/methods";
import {
  entries,
  get,
  put,
  drop,
  immutable,
  canonicalTree,
  type Tree,
} from "../kernel/index";
import {
  changedGeography,
  geometryCell,
  personalTopology,
  type GeographyVersion,
} from "./geography";
import {
  PersonalReview,
  postingKey,
  readKey,
  type PersonalIndexes,
} from "./read";
import { canonical, digest } from "../kernel/canonical";
import { draw, normal } from "../kernel/random";
import { EVIDENCE_PROFILE, PUBLIC_MAP_PROFILE } from "../content/profile";
import { math } from "../kernel/numerics";
import { QUANTA } from "../kernel/time";
import type { Counters } from "../kernel/counters";
import type {
  Evidence,
  ExactSelf,
  MapProfile,
  PersonalView,
  PerceptionPacket,
  RouteBelief,
  Value,
  CellBelief,
  MemoryPins,
  MapObservation,
  RegionPrecedent,
} from "./types";
interface RateStatistic {
  at: number;
  weight: number;
  logSum: number;
  samples: number;
}
interface RateSample {
  context: string;
  at: number;
  weight: number;
  logRate: number;
}
export interface PersonEvidence {
  frontiers: Record<string, Evidence>;
  occupancy: Record<string, { alpha: number; beta: number }>;
  occupancyCoverage: Record<string, Record<number, number>>;
  discoveredSites: Record<string, boolean>;
  exploration: Record<
    string,
    {
      alpha: number;
      beta: number;
      failures: number;
      at: number;
      attempts: number;
      paid: number;
      evidenceVersion: number;
      completed: boolean;
    }
  >;
  explorationProvenance: Record<string, boolean>;
  rateStatistics: Record<string, RateStatistic>;
  // Exact provenance backing is historical, never enumerated by a current estimate.
  rateProvenance: Record<string, RateSample>;
  owner: string;
  geographyRevision: number;
  records: Evidence[];
  versions: Record<string, number>;
  links: Record<string, string>;
  nextHandle: number;
  cells: Record<number, CellBelief>;
  coverage: Record<number, number>;
  routes: RouteBelief[];
  routine: { day: number; count: number };
  delivered: Record<string, string>;
  mapObservations: Record<string, MapObservation>;
  memory: {
    places: Record<
      string,
      { observedAt: number; usedAt: number; uses: number }
    >;
    pins: Record<string, MemoryPins>;
    evictions: number;
    precedent: { regionKm: number; regions: Record<string, RegionPrecedent> };
  };
}
export interface EvidenceState {
  people: PersonEvidence[];
  geographyPins: Record<string, string>;
  pinnedGeography: GeographyVersion[];
}
export function beliefKey(subject: string, property: string): string {
  return canonical([subject, property]);
}
export class EvidenceService {
  readonly state: EvidenceState;
  private latestIndex = new Map<string, Map<string, Evidence>>();
  private membership = new Map<string, Map<string, string[]>>();
  private subjectRecords = new Map<
    string,
    Map<string, Map<string, Evidence>>
  >();
  private readIndexes = new Map<string, PersonalIndexes>();
  private reverseLinks = new Map<string, Map<string, string>>();
  private currentGeography = new Map<string, GeographyVersion>();
  private geographyVersions = new Map<string, GeographyVersion>();
  private geographyPinCounts = new Map<string, number>();
  private pinnedSlots = new Map<string, number>();
  private routeIndexes = new Map<string, Map<string, number>>();
  private people = new Map<string, PersonEvidence>();
  constructor(
    private seed: string,
    private counts: Counters,
    state: EvidenceState = {
      people: [],
      geographyPins: {},
      pinnedGeography: [],
    },
    private consequential: (
      owner: string,
      kind: string,
      detail: unknown,
    ) => void = () => {},
    private regionKm = PUBLIC_MAP_PROFILE.regionCells *
      PUBLIC_MAP_PROFILE.cellKm,
    private methods = METHOD_INDEX,
    private profile: import("./types").MapProfile = PUBLIC_MAP_PROFILE,
  ) {
    this.state = state;
    for (let i = 0; i < state.pinnedGeography.length; i++) {
      const v = state.pinnedGeography[i]!;
      this.geographyVersions.set(v.id, immutable(v));
      this.pinnedSlots.set(v.id, i);
    }
    for (const id of Object.values(state.geographyPins))
      this.geographyPinCounts.set(
        id,
        (this.geographyPinCounts.get(id) ?? 0) + 1,
      );
    for (const p of state.people) {
      if (
        !p.rateStatistics ||
        !p.rateProvenance ||
        !p.frontiers ||
        !p.occupancy ||
        !p.occupancyCoverage ||
        !p.discoveredSites ||
        !p.exploration ||
        !p.explorationProvenance
      )
        throw Error("Missing rate continuation state");
      for (const stat of Object.values(p.rateStatistics))
        if (
          !Number.isSafeInteger(stat.at) ||
          ![stat.weight, stat.logSum, stat.samples].every(Number.isFinite) ||
          stat.weight < 0 ||
          !Number.isSafeInteger(stat.samples) ||
          stat.samples < 0
        )
          throw Error("Invalid rate sufficient statistics");
      for (const sample of Object.values(p.rateProvenance))
        if (
          !p.rateStatistics[sample.context] ||
          !Number.isSafeInteger(sample.at) ||
          !Number.isFinite(sample.weight) ||
          sample.weight <= 0 ||
          !Number.isFinite(sample.logRate)
        )
          throw Error("Invalid rate provenance backing");
      this.people.set(p.owner, p);
      this.reverseLinks.set(
        p.owner,
        new Map(Object.entries(p.links).map(([a, b]) => [b, a])),
      );
      this.readIndexes.set(p.owner, {
        beliefs: null,
        postings: null,
        routes: null,
        frontiers: null,
      });
      this.membership.set(p.owner, new Map());
      this.subjectRecords.set(p.owner, new Map());
      for (const e of p.records) this.indexBelief(p, immutable(e));
      for (const [key, e] of Object.entries(p.frontiers))
        this.readIndexes.get(p.owner)!.frontiers = put(
          this.readIndexes.get(p.owner)!.frontiers,
          key,
          immutable(e),
        );
      const indexes = this.readIndexes.get(p.owner)!;
      for (const route of p.routes)
        indexes.routes = put(indexes.routes, route.subject, immutable(route));
      this.routeIndexes.set(
        p.owner,
        new Map(p.routes.map((r, i) => [r.subject, i])),
      );
      let root: Tree<CellBelief> = null;
      for (const c of Object.values(p.cells))
        root = put(root, String(c.cell).padStart(8, "0"), immutable(c));
      let observations: Tree<MapObservation> = null;
      for (const o of Object.values(p.mapObservations))
        observations = put(observations, o.provenance, immutable({ ...o }));
      const v = immutable({
        owner: p.owner,
        revision: p.geographyRevision,
        id: `${p.owner}:${p.geographyRevision}`,
        cells: root,
        observations,
      });
      this.currentGeography.set(p.owner, v);
      this.geographyVersions.set(v.id, this.geographyVersions.get(v.id) ?? v);
      this.latestIndex.set(
        p.owner,
        new Map(p.records.map((e) => [beliefKey(e.subject, e.property), e])),
      );
    }
  }
  register(owner: string): void {
    if (this.people.has(owner)) return;
    const p: PersonEvidence = {
      owner,
      frontiers: {},
      occupancy: {},
      occupancyCoverage: {},
      discoveredSites: {},
      exploration: {},
      explorationProvenance: {},
      rateStatistics: {},
      rateProvenance: {},
      geographyRevision: 0,
      records: [],
      versions: {},
      links: {},
      nextHandle: 1,
      cells: {},
      coverage: {},
      routes: [],
      routine: { day: -1, count: 0 },
      delivered: {},
      mapObservations: {},
      memory: {
        places: {},
        pins: {},
        evictions: 0,
        precedent: { regionKm: this.regionKm, regions: {} },
      },
    };
    this.state.people.push(p);
    this.people.set(owner, p);
    this.reverseLinks.set(owner, new Map());
    this.readIndexes.set(owner, {
      beliefs: null,
      postings: null,
      routes: null,
      frontiers: null,
    });
    this.membership.set(owner, new Map());
    this.subjectRecords.set(owner, new Map());
    this.routeIndexes.set(owner, new Map());
    const v: GeographyVersion = Object.freeze({
      owner,
      revision: 0,
      id: `${owner}:0`,
      cells: null,
      observations: null,
    });
    this.currentGeography.set(owner, v);
    this.geographyVersions.set(v.id, v);
    this.latestIndex.set(owner, new Map());
  }
  persisted(): EvidenceState {
    return {
      ...this.state,
      pinnedGeography: this.state.pinnedGeography
        .map((v) => ({
          ...v,
          cells: canonicalTree(v.cells),
          observations: canonicalTree(v.observations),
        }))
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    };
  }
  private person(owner: string): PersonEvidence {
    const p = this.people.get(owner);
    if (!p) throw Error("No personal evidence");
    return p;
  }
  // Internal execution capability; never returned by PersonalView.
  reference(owner: string, subject: string): string | null {
    return this.person(owner).links[subject] ?? null;
  }
  private handle(owner: string, reference: string): string {
    const p = this.person(owner);
    const known = this.reverseLinks.get(owner)!.get(reference);
    if (known) return known;
    const h = `seen:${p.nextHandle++}`;
    p.links[h] = reference;
    this.reverseLinks.get(owner)!.set(reference, h);
    return h;
  }
  subjectFor(owner: string, reference: string): string | null {
    return this.reverseLinks.get(owner)?.get(reference) ?? null;
  }
  selfHandle(owner: string, reference: string): string {
    return this.handle(owner, reference);
  }
  version(owner: string, key: string): number {
    const [subject, property] = JSON.parse(key) as string[];
    if (subject?.startsWith("cell:") && property === "geometry")
      return this.person(owner).cells[+subject.slice(5)]?.version ?? 0;
    return this.person(owner).versions[key] ?? 0;
  }
  latest(owner: string, subject: string, property: string): Evidence | null {
    const key = beliefKey(subject, property);
    if (subject.startsWith("cell:") && property === "geometry") {
      const p = this.person(owner),
        c = p.cells[+subject.slice(5)];
      if (!c) return null;
      const o = p.mapObservations[c.provenance]!;
      return {
        owner,
        subject,
        property,
        value: { terrain: c.terrain, passable: +c.passable, speed: c.speed },
        observedAt: c.observedAt,
        receivedAt: o.receivedAt,
        modality: o.modality,
        provenance: c.provenance,
        context: o.context,
        reliability: o.reliability,
        uncertainty: o.uncertainty,
        volatilityClass: "fixed",
        expiry: null,
        pinned: false,
        version: c.version,
      };
    }
    const r = this.latestIndex.get(owner)?.get(key);
    return r ? clone(r) : null;
  }
  deliver(record: Omit<Evidence, "version">): boolean {
    const p = this.person(record.owner),
      key = beliefKey(record.subject, record.property);
    const identity = digest([
      record.provenance,
      record.value,
      record.footprint ?? null,
    ]);
    const old = this.latestIndex.get(record.owner)!.get(key);
    if (
      p.delivered[key] === identity ||
      (old && record.receivedAt < old.receivedAt)
    )
      return false;
    p.delivered[key] = identity;
    const version = (p.versions[key] ?? 0) + 1;
    p.versions[key] = version;
    const next = clone({
      ...record,
      pinned: record.pinned || old?.pinned === true,
      version,
    });
    const index = p.records.findIndex(
      (e) => e.subject === record.subject && e.property === record.property,
    );
    if (index < 0) p.records.push(next);
    else p.records[index] = next;
    this.latestIndex.get(record.owner)!.set(key, next);
    this.indexBelief(p, immutable(next));
    const place = p.memory.places[record.subject];
    if (place) place.observedAt = Math.max(place.observedAt, record.observedAt);
    if (
      record.property === "kind" &&
      (record.value === "site" || record.value === "cache")
    )
      p.memory.places[record.subject] ??= {
        observedAt: record.observedAt,
        usedAt: 0,
        uses: 0,
      };
    this.counts.evidenceUpdates++;
    return true;
  }
  // A single discretionary account. Pins are exceptions, not extra discretionary slots.
  private isPinned(p: PersonEvidence, subject: string): boolean {
    if (p.records.some((e) => e.subject === subject && e.pinned)) return true;
    const location = this.latestIndex
      .get(p.owner)!
      .get(beliefKey(subject, "location"))?.value as
      { x: number; y: number } | undefined;
    return Object.values(p.memory.pins).some(
      (pin) =>
        pin.subjects.includes(subject) ||
        pin.beliefKeys.some(
          (k) => (JSON.parse(k) as string[])[0] === subject,
        ) ||
        (location &&
          pin.targets.some((t) => t.x === location.x && t.y === location.y)),
    );
  }
  pin(owner: string, scope: string, pin: MemoryPins, at: number): void {
    const p = this.person(owner);
    p.memory.pins[scope] = clone(pin);
    for (const subject of Object.keys(p.memory.places))
      if (this.isPinned(p, subject)) {
        const m = p.memory.places[subject]!;
        m.usedAt = at;
        m.uses++;
      }
    this.enforceMemory(owner);
  }
  unpin(owner: string, scope: string): void {
    delete this.person(owner).memory.pins[scope];
    this.enforceMemory(owner);
  }
  enforceMemory(owner: string): void {
    const p = this.person(owner);
    // Relevance is protected by scopes; then recency and observed use rank salience.
    const discretionary = Object.keys(p.memory.places)
      .filter((k) => !this.isPinned(p, k))
      .sort((a, b) => {
        const x = p.memory.places[a]!,
          y = p.memory.places[b]!;
        return (
          Math.max(x.observedAt, x.usedAt) - Math.max(y.observedAt, y.usedAt) ||
          x.uses - y.uses ||
          Number(a.split(":")[1]) - Number(b.split(":")[1])
        );
      });
    for (const subject of discretionary.slice(
      0,
      Math.max(0, discretionary.length - EVIDENCE_PROFILE.places),
    )) {
      const location = this.latestIndex
        .get(owner)!
        .get(beliefKey(subject, "location"))?.value as
        { x: number; y: number } | undefined;
      const empty = p.records.some(
          (e) =>
            e.subject === subject &&
            e.property.startsWith("stock:") &&
            e.value === 0,
        ),
        at = p.memory.places[subject]!.observedAt;
      if (location) {
        const r = p.memory.precedent,
          region =
            Math.floor(location.x / r.regionKm) +
            "," +
            Math.floor(location.y / r.regionKm),
          summary = (r.regions[region] ??= {
            forgottenPlaces: 0,
            observedEmpty: 0,
            lastAt: 0,
          });
        summary.forgottenPlaces++;
        summary.observedEmpty += +empty;
        summary.lastAt = Math.max(summary.lastAt, at);
      }
      this.consequential(owner, "personal-place-forgotten", {
        subject,
        observedAt: at,
        outcome: empty ? "observed-empty" : "remembered-place",
      });
      for (const e of p.records.filter((e) => e.subject === subject)) {
        this.removeBelief(p, e);
        const k = beliefKey(subject, e.property);
        delete p.versions[k];
        delete p.delivered[k];
        this.latestIndex.get(owner)!.delete(k);
      }
      p.records = p.records.filter((e) => e.subject !== subject);
      delete p.memory.places[subject];
      this.reverseLinks.get(owner)!.delete(p.links[subject]!);
      delete p.links[subject];
      p.memory.evictions++;
      this.counts.memoryEvictions++;
    }
  }
  foundTraversalPrior(
    owner: string,
    prior: { speedFactor: number; uncertainty: number; context: string },
    at: number,
  ): void {
    if (
      !(prior.speedFactor > 0 && prior.speedFactor <= 1) ||
      !Number.isFinite(prior.uncertainty) ||
      prior.uncertainty < 0
    )
      throw Error("Invalid declared traversal prior");
    this.fact(
      owner,
      "prior:unseen-terrain",
      "speed-factor",
      prior.speedFactor,
      at,
      prior.context,
      "record",
      prior.uncertainty,
    );
  }
  fact(
    owner: string,
    subject: string,
    property: string,
    value: Value,
    at: number,
    context: string,
    modality: Evidence["modality"] = "direct",
    uncertainty = 0,
    volatilityClass: Evidence["volatilityClass"] = "fixed",
    footprint?: Evidence["footprint"],
  ): void {
    if (subject === "self" && property === "body-experience")
      this.estimateRequirement(owner, value as Record<string, number>, at);
    this.deliver({
      owner,
      subject,
      property,
      value,
      observedAt: at,
      receivedAt: at,
      modality,
      provenance: digest([owner, context, at, subject, property]),
      context,
      reliability: 1,
      uncertainty,
      volatilityClass,
      expiry: null,
      pinned: modality === "self",
      ...(footprint ? { footprint } : {}),
    });
  }
  private estimateRequirement(
    owner: string,
    v: Record<string, number>,
    at: number,
  ): void {
    const old = this.latest(owner, "self", "body-experience");
    const prior = (v as unknown as { class: string }).class === "F" ? 0.85 : 1;
    const existing = this.latest(owner, "self", "quiet-requirement");
    const stat = existing?.value as Record<string, number> | undefined;
    let sum = stat?.sum ?? prior,
      count = stat?.count ?? 1;
    if (old && at > old.observedAt) {
      const p = old.value as Record<string, number>,
        dt = (at - old.observedAt) / QUANTA;
      if (p.intake! > 0 && p.condition !== v.condition) {
        const tau = v.condition! < p.condition! ? 0.35 : 0.7;
        const e = math.exp(-dt / tau),
          target = (v.condition! - p.condition! * e) / (1 - e);
        if (target > 0 && target < 1.2) {
          const coverage =
            target <= 1
              ? math.sqrt(target / (2 - target))
              : 0.2 / (1.2 - target);
          const estimate =
            p.intake! / coverage -
            prior * ((p.activityLoad ?? 0) + 0.3 * (p.wounds ?? 0));
          if (Number.isFinite(estimate) && estimate > 0) {
            sum += estimate;
            count++;
          }
        }
      }
    }
    if (!existing || sum !== stat?.sum)
      this.fact(
        owner,
        "self",
        "quiet-requirement",
        { sum, count, estimate: sum / count },
        at,
        "ordinary cultural prior and inverse experienced condition segments",
        "self",
      );
  }
  observePerformance(
    owner: string,
    method: string,
    context: string,
    output: number,
    paidSd: number,
    provenance: string,
    at: number,
    cognitive: number,
    field: number,
  ): void {
    const schema = EXTRACTION_INDEX.method(method);
    if (!schema || paidSd <= 0 || output <= 0) return; // Censored zero yield is stock evidence, not log(0) capability.
    const p = this.person(owner),
      key = canonical([method, context]);
    const variance = (0.35 / Math.max(0.25, math.sqrt(cognitive * field))) ** 2;
    const logRate =
      math.log(output / paidSd) +
      math.sqrt(variance) *
        normal(this.seed, "own-performance-inference", [owner, provenance]);
    const previous = p.rateProvenance[provenance];
    if (previous && previous.context !== key)
      throw Error("Performance provenance context changed");
    const stat = p.rateStatistics[key] ?? {
      at,
      weight: 0,
      logSum: 0,
      samples: 0,
    };
    const decay = math.exp(-(at - stat.at) / QUANTA / 3);
    stat.weight *= decay;
    stat.logSum *= decay;
    stat.at = at;
    if (previous) {
      const old = previous.weight * math.exp(-(at - previous.at) / QUANTA / 3);
      stat.weight -= old;
      stat.logSum -= old * previous.logRate;
    } else stat.samples++;
    const weight = 1 / variance;
    stat.weight += weight;
    stat.logSum += weight * logRate;
    p.rateStatistics[key] = stat;
    p.rateProvenance[provenance] = { context: key, at, weight, logRate };
    // One ordinary cultural prior sample. No latent ability/mastery is returned.
    const priorWeight = 1 / 0.35 ** 2,
      mean =
        (stat.logSum + priorWeight * math.log(schema.referenceRate)) /
        (stat.weight + priorWeight);
    this.fact(
      owner,
      "self",
      `rate:${method}:${context}`,
      {
        rate: math.exp(mean),
        logVariance: 1 / (stat.weight + priorWeight),
        samples: stat.samples,
        output,
        paidSd,
        weight: stat.weight,
        logSum: stat.logSum,
        anchorAt: at,
        priorRate: schema.referenceRate,
        priorWeight,
      },
      at,
      "experienced paid performance",
      "inference",
      math.sqrt(1 / (stat.weight + priorWeight)),
      "slow",
    );
  }
  observeExploration(
    owner: string,
    outcome: ExplorationOutcome,
    at: number,
    provenance: string,
  ): void {
    const p = this.person(owner);
    if (p.explorationProvenance[provenance]) return;
    p.explorationProvenance[provenance] = true;
    const context = `${outcome.form}:${outcome.operation}:${outcome.targetKind}`;
    for (const [key, weight] of [
      [context, 1],
      [`${outcome.form}:${outcome.operation}:*`, EXPLORATION.generalisation],
      [outcome.descriptor, 1],
    ] as const) {
      const s = (p.exploration[key] ??= {
        alpha: EXPLORATION.alpha,
        beta: EXPLORATION.beta,
        failures: 0,
        at,
        attempts: 0,
        paid: 0,
        evidenceVersion: 0,
        completed: false,
      });
      s.failures *= math.exp(
        -(at - s.at) / QUANTA / EXPLORATION.frustrationDecaySd,
      );
      s.at = at;
      s.paid += outcome.paid * weight;
      if (outcome.completed) {
        s.attempts += weight;
        if (outcome.success) s.alpha += weight;
        else {
          s.beta += weight;
          s.failures += weight;
        }
        s.completed = true;
        s.evidenceVersion = outcome.evidenceVersion;
      }
      this.fact(
        owner,
        "exploration",
        key,
        { ...s, completed: s.completed ? 1 : 0 },
        at,
        provenance,
        "inference",
      );
    }
    this.fact(
      owner,
      outcome.descriptor,
      "outcome",
      outcome,
      at,
      provenance,
      "trial",
    );
    if (
      outcome.completed &&
      !outcome.success &&
      outcome.method &&
      this.latest(owner, `method:${outcome.method}`, "known")?.value === true
    ) {
      const subject = `method:${outcome.method}`,
        property = `confidence:${context}`;
      const old = Number(
        this.latest(owner, subject, property)?.value ??
          this.latest(owner, subject, "confidence")?.value ??
          EXPLORATION.trialConfidence,
      );
      this.fact(owner, subject, property, old * 0.6, at, provenance, "trial");
    }
    if (outcome.completed && outcome.success && outcome.method) {
      this.fact(
        owner,
        `affordance:${outcome.operation}:${outcome.targetKind}`,
        "known",
        true,
        at,
        provenance,
        "trial",
      );
      const subject = `method:${outcome.method}`;
      const previous = this.latest(owner, subject, "confidence")?.value;
      const confidence =
        typeof previous === "number"
          ? 1 - (1 - previous) * 0.6
          : EXPLORATION.trialConfidence;
      this.fact(
        owner,
        subject,
        "observed-yield",
        { yield: outcome.yield ?? 0, paid: outcome.paid },
        at,
        provenance,
        "trial",
      );
      this.fact(
        owner,
        subject,
        "confidence",
        confidence,
        at,
        provenance,
        "trial",
      );
      this.fact(
        owner,
        subject,
        "observed-context",
        context,
        at,
        provenance,
        "trial",
      );
      this.fact(owner, subject, "known", true, at, provenance, "trial");
    }
  }
  foundMethods(owner: string, methods: string[], at: number): void {
    this.foundPerformancePriors(owner, methods, at);
    if (methods.includes("try-compatible"))
      for (const operation of EVIDENCE_PROFILE.foundingOperations)
        this.fact(
          owner,
          `operation:${operation}`,
          "compatible-operation",
          operation,
          at,
          "declared cultural compatibility",
          "record",
        );
    for (const method of methods)
      this.fact(
        owner,
        `method:${method}`,
        "known",
        true,
        at,
        "declared founding diagnostic library",
        "record",
      );
  }
  observeResourceStock(
    owner: string,
    subject: string,
    kind: string,
    good: string,
    stock: number,
    at: number,
    cognitive: number,
    field: number,
  ): void {
    const logSd = 0.35 / Math.max(0.25, math.sqrt(cognitive * field));
    const value =
      stock > 0
        ? stock *
          math.exp(
            logSd *
              normal(this.seed, "physical-resource-observation", [
                owner,
                subject,
                String(at),
                good,
              ]),
          )
        : 0;
    this.fact(
      owner,
      subject,
      `stock:${good}`,
      value,
      at,
      "direct local resource observation",
      "direct",
      stock > 0 ? logSd : 0,
      kind === "food-patch" ? "fast" : "slow",
    );
  }
  foundPerformancePriors(
    owner: string,
    methods: readonly string[],
    at: number,
  ): void {
    for (const method of methods) {
      const m = EXTRACTION_INDEX.method(method);
      if (!m) continue;
      this.fact(
        owner,
        "self",
        `rate:${method}:${m.siteKind}`,
        {
          rate: m.referenceRate,
          logVariance: 0.35 ** 2,
          samples: 0,
          weight: 0,
          logSum: 0,
          anchorAt: at,
          priorRate: m.referenceRate,
          priorWeight: 1 / 0.35 ** 2,
        },
        at,
        "declared ordinary cultural rate prior",
        "record",
        0.35,
        "fixed",
      );
    }
  }
  observe(
    owner: string,
    packet: PerceptionPacket,
    at: number,
    context: string,
    directed = false,
  ): void {
    const p = this.person(owner),
      day = Math.floor(at / QUANTA);
    if (p.routine.day !== day) p.routine = { day, count: 0 };
    const accept = () => {
      if (!directed && p.routine.count >= EVIDENCE_PROFILE.routineObservations)
        return false;
      if (!directed) {
        p.routine.count++;
        this.counts.routineObservations++;
      }
      return true;
    };
    // A survey is one observation with a qualified, bounded local footprint.
    const cells = packet.terrain.filter((c) => {
      const old = p.cells[c.cell];
      return (
        !old ||
        old.terrain !== c.terrain ||
        old.passable !== c.passable ||
        old.speed !== c.speed ||
        c.detection > (p.coverage[c.cell] ?? 0)
      );
    });
    let deliveredSurvey = false;
    if (cells.length && accept()) {
      const delivered = this.deliver({
        owner,
        subject: "local-survey",
        property: "terrain",
        value: digest(cells),
        observedAt: at,
        receivedAt: at,
        modality: "direct",
        provenance: digest([owner, context, at, "terrain", digest(cells)]),
        context,
        reliability: 1,
        uncertainty: 0,
        volatilityClass: "fixed",
        expiry: null,
        pinned: false,
        footprint: packet.footprint,
      });
      if (delivered) {
        deliveredSurvey = true;
        const event = this.latestIndex
          .get(owner)!
          .get(beliefKey("local-survey", "terrain"))!;
        for (const c of cells) {
          const old = p.cells[c.cell],
            changed =
              !old ||
              old.terrain !== c.terrain ||
              old.passable !== c.passable ||
              old.speed !== c.speed;
          if (changed) {
            if (old) {
              const o = p.mapObservations[old.provenance]!;
              o.references--;
              if (o.references === 0) delete p.mapObservations[old.provenance];
            }
            const o = (p.mapObservations[event.provenance] ??= {
              observedAt: at,
              receivedAt: at,
              provenance: event.provenance,
              context,
              modality: "direct",
              reliability: 1,
              uncertainty: 0,
              duration: packet.footprint.duration,
              references: 0,
            });
            o.references++;
            p.cells[c.cell] = {
              ...c,
              observedAt: at,
              version: (old?.version ?? 0) + 1,
              provenance: event.provenance,
            };
            this.counts.personalMapUpdates++;
          } else
            p.cells[c.cell] = {
              ...old!,
              detection: Math.max(old!.detection, c.detection),
            };
          p.coverage[c.cell] = Math.max(p.coverage[c.cell] ?? 0, c.detection);
        }
        const previous = this.currentGeography.get(owner)!;
        const v = changedGeography(
          previous,
          cells.map((c) => p.cells[c.cell]!),
          p.mapObservations,
        );
        p.geographyRevision = v.revision;
        this.currentGeography.set(owner, v);
        this.geographyVersions.set(v.id, v);
        if (!this.geographyPinCounts.has(previous.id))
          this.geographyVersions.delete(previous.id);
      }
    }
    if (packet.resourceClasses && (deliveredSurvey || directed)) {
      for (const resource of packet.resourceClasses) {
        const coverage = (p.occupancyCoverage[resource] ??= {});
        for (const c of packet.terrain) {
          const scope = `${resource}:${c.terrain}`;
          const posterior = (p.occupancy[scope] ??= {
            alpha:
              resource === "food-patch"
                ? EXPLORATION.foodDensityKm2
                : EXPLORATION.rawDensityKm2,
            beta: EXPLORATION.occupancyStrengthKm2,
          });
          const detection = directed ? 1 : c.detection;
          posterior.beta +=
            this.profile.cellKm ** 2 *
            Math.max(0, detection - (coverage[c.cell] ?? 0));
          coverage[c.cell] = Math.max(coverage[c.cell] ?? 0, detection);
          this.fact(
            owner,
            "occupancy",
            scope,
            { ...posterior },
            at,
            "qualified personal coverage",
            "inference",
          );
        }
      }
    }
    // Incremental personally represented frontier: only affected geometry and
    // its immediate neighbours. No unseen terrain or whole-map enumeration.
    if (deliveredSurvey) {
      const affected = new Set<number>();
      const width = this.profile.width,
        height = this.profile.height;
      for (const c of cells)
        for (const [dx, dy] of [
          [0, 0],
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const x = (c.cell % width) + dx!,
            y = Math.floor(c.cell / width) + dy!;
          if (x >= 0 && x < width && y >= 0 && y < height)
            affected.add(x + y * width);
        }
      for (const k of affected) {
        const x = k % width,
          y = Math.floor(k / width);
        const adjacent = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ].some(
          ([a, b]) =>
            a! >= 0 &&
            b! >= 0 &&
            a! < width &&
            b! < height &&
            p.cells[a! + b! * width]?.passable,
        );
        const key = `frontier:${k}`,
          ix = this.readIndexes.get(owner)!;
        if (!p.cells[k] && adjacent) {
          if (!p.frontiers[key]) {
            const e: Evidence = {
              owner,
              subject: key,
              property: "frontier",
              value: {
                x: (x + 0.5) * this.profile.cellKm,
                y: (y + 0.5) * this.profile.cellKm,
              },
              observedAt: at,
              receivedAt: at,
              modality: "inference",
              provenance: digest([owner, key, at]),
              context: "personal coverage frontier",
              reliability: 1,
              uncertainty: 1,
              volatilityClass: "slow",
              expiry: null,
              pinned: false,
              version: 1,
            };
            p.frontiers[key] = e;
            ix.frontiers = put(ix.frontiers, key, immutable(e));
          }
        } else if (p.frontiers[key]) {
          delete p.frontiers[key];
          ix.frontiers = drop(ix.frontiers, key);
        }
      }
    }
    // Packet order is geometric and independent of hidden allocation/keys.
    for (const f of packet.facts) {
      if (
        !directed &&
        draw(this.seed, "perception-detection", [
          owner,
          digest([f.kind, f.position, at, context]),
        ]) >= f.detection
      )
        continue;
      if (!accept()) break;
      const subject = this.handle(owner, f.reference);
      const resource = f.properties.find(
        (item) => item.property === "resource-kind",
      )?.value;
      if (typeof resource === "string" && !p.discoveredSites[f.reference]) {
        p.discoveredSites[f.reference] = true;
        const k =
          Math.floor(f.position.x / this.profile.cellKm) +
          this.profile.width * Math.floor(f.position.y / this.profile.cellKm);
        const scope = `${resource}:${p.cells[k]?.terrain ?? 0}`;
        const posterior = (p.occupancy[scope] ??= {
          alpha:
            resource === "food-patch"
              ? EXPLORATION.foodDensityKm2
              : EXPLORATION.rawDensityKm2,
          beta: EXPLORATION.occupancyStrengthKm2,
        });
        posterior.alpha++;
        this.fact(
          owner,
          "occupancy",
          scope,
          { ...posterior },
          at,
          "independent personally detected site",
          "inference",
        );
      }
      this.fact(owner, subject, "existence", true, at, context);
      this.fact(owner, subject, "location", f.position, at, context);
      this.fact(owner, subject, "kind", f.kind, at, context);
      for (const item of f.properties) {
        const value =
          item.property.startsWith("stock:") &&
          typeof item.value === "number" &&
          item.value > 0 &&
          item.uncertainty > 0
            ? item.value *
              math.exp(
                normal(this.seed, "evidence-stock-noise", [
                  owner,
                  digest([f.position, item.property, at, context]),
                ]) * item.uncertainty,
              )
            : item.value;
        this.fact(
          owner,
          subject,
          item.property,
          value,
          at,
          context,
          "direct",
          item.uncertainty,
          item.volatility,
        );
      }
    }
    // Search-qualified non-detection, never geological absence or a site census.
    if (directed && packet.footprint.duration > 0)
      this.fact(
        owner,
        "local-survey",
        "site-detection-count",
        packet.facts.filter((f) => f.kind === "site").length,
        at,
        context,
        "direct",
        1 - Math.max(0, ...packet.footprint.cells.map((c) => c.detection)),
        "fast",
        packet.footprint,
      );
    this.enforceMemory(owner);
  }
  route(
    owner: string,
    subject: string,
    cells: number[],
    status: RouteBelief["status"],
    at: number,
  ): void {
    const journey = subject;
    subject = `route:${digest(cells)}`;
    this.consequential(owner, "personal-journey-observed", {
      journey,
      route: subject,
      cells,
      status,
      observedAt: at,
    });
    this.fact(owner, subject, "route-status", status, at, "executed route");
    const p = this.person(owner),
      r = {
        subject,
        cells: [...cells],
        status,
        observedAt: at,
        version: this.version(owner, beliefKey(subject, "route-status")),
      };
    const index = this.routeIndexes.get(owner)!.get(subject) ?? -1;
    if (index < 0) {
      this.routeIndexes.get(owner)!.set(subject, p.routes.length);
      p.routes.push(r);
    } else p.routes[index] = r;
    const indexes = this.readIndexes.get(owner)!;
    indexes.routes = put(indexes.routes, subject, immutable(r));
  }
  private region(p: PersonEvidence, subject: string): string | undefined {
    const location = get(
      this.readIndexes.get(p.owner)!.beliefs,
      readKey(subject, "location"),
    )?.value as { x: number; y: number } | undefined;
    return location
      ? `${Math.floor(location.x / this.regionKm)},${Math.floor(location.y / this.regionKm)}`
      : undefined;
  }
  private indexBelief(p: PersonEvidence, e: Evidence): void {
    const ix = this.readIndexes.get(p.owner)!;
    const key = beliefKey(e.subject, e.property),
      old = get(ix.beliefs, readKey(e.subject, e.property));
    if (old) this.removeBelief(p, old);
    ix.beliefs = put(ix.beliefs, readKey(e.subject, e.property), e);
    ix.beliefs = put(ix.beliefs, readKey(e.subject, e.property, e.context), e);
    const tags: string[] = [];
    const add = (property: string, region?: string, rowKey = key) => {
      const tag = postingKey(property, region);
      tags.push(tag);
      ix.postings = put(
        ix.postings,
        tag,
        put(get(ix.postings, tag), rowKey, e),
      );
    };
    add(e.property);
    if (
      e.property === "frontier" &&
      typeof e.value === "object" &&
      e.value !== null
    )
      add("eligible-frontier");
    if (e.property === "perceptible-properties" && typeof e.value === "string")
      for (const property of e.value.split(","))
        add(`material-property:${property}`);
    if (
      e.property === "own-local-stocks" &&
      e.value &&
      typeof e.value === "object"
    )
      for (const [good, q] of Object.entries(e.value))
        if (typeof q === "number" && q > 0) add(`owned-good:${good}`);
    if (
      typeof e.value === "string" &&
      this.methods.isTargetProperty(e.property)
    )
      add(`class:${e.property}:${JSON.stringify(e.value)}`);
    const region = this.region(p, e.subject);
    if (region) add(e.property, region);
    if (
      e.subject.startsWith("method:") &&
      e.property === "known" &&
      e.value === true
    ) {
      // Declared effect vocabulary for the two existing diagnostic methods.
      const method = this.methods.get(e.subject.slice(7));
      for (const effect of method?.effects ?? ["known"]) {
        add(`method-effect:${effect}`);
        if (method?.schema)
          add(`method-cheap:${effect}`, undefined, this.cheapKey(e));
      }
      for (const input of method?.inputs ?? []) add(`method-input:${input}`);
    }
    this.membership.get(p.owner)!.set(key, tags);
    const records =
      this.subjectRecords.get(p.owner)!.get(e.subject) ??
      new Map<string, Evidence>();
    records.set(key, e);
    this.subjectRecords.get(p.owner)!.set(e.subject, records);
    if (e.property === "location")
      for (const other of [...records.values()])
        if (other.property !== "location") this.indexBelief(p, other);
  }
  private cheapKey(e: Evidence): string {
    const cost = this.methods.get(e.subject.slice(7))?.schema?.cheapCost ?? 0;
    return cost.toFixed(9).padStart(24, "0") + beliefKey(e.subject, e.property);
  }
  private removeBelief(p: PersonEvidence, e: Evidence): void {
    const ix = this.readIndexes.get(p.owner)!;
    ix.beliefs = drop(ix.beliefs, readKey(e.subject, e.property));
    ix.beliefs = drop(ix.beliefs, readKey(e.subject, e.property, e.context));
    const key = beliefKey(e.subject, e.property);
    for (const tag of this.membership.get(p.owner)!.get(key) ?? []) {
      const root = drop(
        get(ix.postings, tag),
        tag.startsWith('["method-cheap:') ? this.cheapKey(e) : key,
      );
      ix.postings = root ? put(ix.postings, tag, root) : drop(ix.postings, tag);
    }
    this.membership.get(p.owner)!.delete(key);
    const records = this.subjectRecords.get(p.owner)!.get(e.subject);
    records?.delete(key);
    if (!records?.size) this.subjectRecords.get(p.owner)!.delete(e.subject);
  }
  review(
    owner: string,
    at: number,
    profile: MapProfile,
    ownState: ExactSelf,
  ): PersonalReview {
    return new PersonalReview(
      owner,
      at,
      profile,
      clone(ownState),
      { ...this.readIndexes.get(owner)! },
      this.currentGeography.get(owner)!,
      this.counts,
    );
  }
  pinGeography(owner: string, scope: string): GeographyVersion {
    const v = this.currentGeography.get(owner)!;
    this.pinGeographyVersion(v.id, scope);
    return v;
  }
  pinGeographyVersion(id: string, scope: string): void {
    const v = this.geography(id);
    if (this.state.geographyPins[scope] === id) return;
    this.unpinGeography(scope);
    this.state.geographyPins[scope] = id;
    this.geographyPinCounts.set(id, (this.geographyPinCounts.get(id) ?? 0) + 1);
    this.geographyVersions.set(id, v);
    if (!this.pinnedSlots.has(id)) {
      this.pinnedSlots.set(id, this.state.pinnedGeography.length);
      this.state.pinnedGeography.push(v);
    }
  }
  geography(id: string): GeographyVersion {
    const v = this.geographyVersions.get(id);
    if (!v) throw Error("Missing pinned personal geography");
    return v;
  }
  unpinGeography(scope: string): void {
    const id = this.state.geographyPins[scope];
    if (!id) return;
    delete this.state.geographyPins[scope];
    const count = this.geographyPinCounts.get(id)! - 1;
    if (count) this.geographyPinCounts.set(id, count);
    else {
      this.geographyPinCounts.delete(id);
      const slot = this.pinnedSlots.get(id)!;
      const last = this.state.pinnedGeography.pop()!;
      if (last.id !== id) {
        this.state.pinnedGeography[slot] = last;
        this.pinnedSlots.set(last.id, slot);
      }
      this.pinnedSlots.delete(id);
      const v = this.geographyVersions.get(id);
      if (v && this.currentGeography.get(v.owner)?.id !== id)
        this.geographyVersions.delete(id);
    }
  }

  blockedCells(owner: string, cells: number[]): boolean {
    const p = this.person(owner);
    return cells.some((k) => p.cells[k]?.passable === false);
  }
  view(
    owner: string,
    at: number,
    profile: MapProfile,
    ownState: ExactSelf,
  ): PersonalView {
    this.counts.personalViewProjections++;
    const p = this.person(owner),
      evidence = clone(p.records).map((e) => ({
        ...e,
        pinned: e.pinned || this.isPinned(p, e.subject),
      })),
      current = evidence,
      geography = clone(Object.values(p.cells).sort((a, b) => a.cell - b.cell));
    const topology = personalTopology(
      this.currentGeography.get(owner)!,
      profile,
      this.counts,
    );

    const prior = this.latest(owner, "prior:unseen-terrain", "speed-factor");
    if (!prior) throw Error("No declared personal traversal prior");
    const pinnedPlaces = Object.keys(p.memory.places).filter((k) =>
      this.isPinned(p, k),
    ).length;
    return clone({
      traversalPrior: {
        speedFactor: prior.value as number,
        uncertainty: prior.uncertainty,
        version: prior.version,
        provenance: prior.provenance,
      },
      mapObservations: p.mapObservations,
      memory: {
        discretionaryPlaces: Object.keys(p.memory.places).length - pinnedPlaces,
        pinnedPlaces,
        limit: EVIDENCE_PROFILE.places,
        evictions: p.memory.evictions,
        precedent: p.memory.precedent,
      },
      owner,
      time: at,
      profile,
      self: ownState,
      geography,
      regions: Object.values(topology.regions),
      routes: p.routes,
      evidence,
      methods: current.filter((e) => e.subject.startsWith("method:")),
      places: current.filter((e) => !!p.memory.places[e.subject]),
      people: current.filter(
        (e) =>
          e.subject.startsWith("seen:") &&
          this.latest(owner, e.subject, "kind")?.value === "person",
      ),
    });
  }
}
export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}
