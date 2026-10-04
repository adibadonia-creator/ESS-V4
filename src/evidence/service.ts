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
export interface PersonEvidence {
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
      this.people.set(p.owner, p);
      this.reverseLinks.set(
        p.owner,
        new Map(Object.entries(p.links).map(([a, b]) => [b, a])),
      );
      this.readIndexes.set(p.owner, {
        beliefs: null,
        postings: null,
        routes: null,
      });
      this.membership.set(p.owner, new Map());
      this.subjectRecords.set(p.owner, new Map());
      for (const e of p.records) this.indexBelief(p, immutable(e));
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
  foundMethods(owner: string, methods: string[], at: number): void {
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
    const add = (property: string, region?: string) => {
      const tag = postingKey(property, region);
      tags.push(tag);
      ix.postings = put(ix.postings, tag, put(get(ix.postings, tag), key, e));
    };
    add(e.property);
    const region = this.region(p, e.subject);
    if (region) add(e.property, region);
    if (
      e.subject.startsWith("method:") &&
      e.property === "known" &&
      e.value === true
    ) {
      // Declared effect vocabulary for the two existing diagnostic methods.
      const method = METHOD_INDEX.get(e.subject.slice(7));
      for (const effect of method?.effects ?? ["known"])
        add(`method-effect:${effect}`);
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
  private removeBelief(p: PersonEvidence, e: Evidence): void {
    const ix = this.readIndexes.get(p.owner)!;
    ix.beliefs = drop(ix.beliefs, readKey(e.subject, e.property));
    ix.beliefs = drop(ix.beliefs, readKey(e.subject, e.property, e.context));
    const key = beliefKey(e.subject, e.property);
    for (const tag of this.membership.get(p.owner)!.get(key) ?? []) {
      const root = drop(get(ix.postings, tag), key);
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
