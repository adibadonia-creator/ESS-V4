import { canonical, digest } from "../kernel/canonical";
import { draw, normal } from "../kernel/random";
import { EVIDENCE_PROFILE } from "../content/profile";
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
} from "./types";
export interface PersonEvidence {
  owner: string;
  records: Evidence[];
  versions: Record<string, number>;
  links: Record<string, string>;
  nextHandle: number;
  cells: Record<number, CellBelief>;
  coverage: Record<number, number>;
  routes: RouteBelief[];
  routine: { day: number; count: number };
  delivered: Record<string, boolean>;
}
export interface EvidenceState {
  people: PersonEvidence[];
}
export function beliefKey(subject: string, property: string): string {
  return canonical([subject, property]);
}
export class EvidenceService {
  readonly state: EvidenceState;
  private latestIndex = new Map<string, Map<string, Evidence>>();
  private people = new Map<string, PersonEvidence>();
  constructor(
    private seed: string,
    private counts: Counters,
    state: EvidenceState = { people: [] },
  ) {
    this.state = state;
    for (const p of state.people) {
      this.people.set(p.owner, p);
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
      records: [],
      versions: {},
      links: {},
      nextHandle: 1,
      cells: {},
      coverage: {},
      routes: [],
      routine: { day: -1, count: 0 },
      delivered: {},
    };
    this.state.people.push(p);
    this.people.set(owner, p);
    this.latestIndex.set(owner, new Map());
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
    const known = Object.keys(p.links).find((k) => p.links[k] === reference);
    if (known) return known;
    const h = `seen:${p.nextHandle++}`;
    p.links[h] = reference;
    return h;
  }
  subjectFor(owner: string, reference: string): string | null {
    return (
      Object.keys(this.person(owner).links).find(
        (k) => this.person(owner).links[k] === reference,
      ) ?? null
    );
  }
  selfHandle(owner: string, reference: string): string {
    return this.handle(owner, reference);
  }
  version(owner: string, key: string): number {
    return this.person(owner).versions[key] ?? 0;
  }
  latest(owner: string, subject: string, property: string): Evidence | null {
    const key = beliefKey(subject, property);
    const r = this.latestIndex.get(owner)?.get(key);
    return r ? clone(r) : null;
  }
  deliver(record: Omit<Evidence, "version">): boolean {
    const p = this.person(record.owner),
      identity = digest([
        record.provenance,
        record.subject,
        record.property,
        record.value,
      ]);
    if (p.delivered[identity]) return false;
    p.delivered[identity] = true;
    const key = beliefKey(record.subject, record.property),
      version = (p.versions[key] ?? 0) + 1;
    p.versions[key] = version;
    p.records.push(clone({ ...record, version }));
    this.latestIndex.get(record.owner)!.set(key, p.records.at(-1)!);
    this.counts.evidenceUpdates++;
    return true;
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
      this.fact(
        owner,
        "local-survey",
        "terrain",
        cells.length,
        at,
        context,
        "direct",
        0,
        "fixed",
        packet.footprint,
      );
      for (const c of cells) {
        const old = p.cells[c.cell];
        const changed =
          !old ||
          old.terrain !== c.terrain ||
          old.passable !== c.passable ||
          old.speed !== c.speed;
        if (changed)
          this.fact(
            owner,
            `cell:${c.cell}`,
            "geometry",
            { terrain: c.terrain, passable: +c.passable, speed: c.speed },
            at,
            context,
          );
        p.cells[c.cell] = {
          ...c,
          observedAt: changed ? at : old!.observedAt,
          version: this.version(owner, beliefKey(`cell:${c.cell}`, "geometry")),
        };
        p.coverage[c.cell] = Math.max(p.coverage[c.cell] ?? 0, c.detection);
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
  }
  route(
    owner: string,
    subject: string,
    cells: number[],
    status: RouteBelief["status"],
    at: number,
  ): void {
    this.fact(owner, subject, "route-status", status, at, "executed route");
    const p = this.person(owner),
      r = {
        subject,
        cells: [...cells],
        status,
        observedAt: at,
        version: this.version(owner, beliefKey(subject, "route-status")),
      };
    const index = p.routes.findIndex((x) => x.subject === subject);
    if (index < 0) p.routes.push(r);
    else p.routes[index] = r;
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
      evidence = clone(p.records),
      current = [...this.latestIndex.get(owner)!.values()],
      geography = clone(Object.values(p.cells).sort((a, b) => a.cell - b.cell));
    // Connected components within public spatial chunks, and witnessed crossings.
    const passable = new Set(
      geography.filter((c) => c.passable).map((c) => c.cell),
    );
    const cellRegion = new Map<number, number>(),
      regions = new Map<
        number,
        { id: number; cells: number[]; neighbors: number[] }
      >();
    const cols = Math.ceil(profile.width / profile.regionCells);
    const chunk = (k: number) =>
      Math.floor((k % profile.width) / profile.regionCells) +
      cols * Math.floor(Math.floor(k / profile.width) / profile.regionCells);
    const neighbors = (k: number) =>
      [k - 1, k + 1, k - profile.width, k + profile.width].filter(
        (n) =>
          n >= 0 &&
          n < profile.width * profile.height &&
          Math.abs((k % profile.width) - (n % profile.width)) <= 1,
      );
    for (const c of geography) {
      if (!c.passable || cellRegion.has(c.cell)) continue;
      const id = c.cell,
        queue = [id],
        cells: number[] = [];
      cellRegion.set(id, id);
      for (let i = 0; i < queue.length; i++) {
        const k = queue[i]!;
        cells.push(k);
        for (const n of neighbors(k))
          if (passable.has(n) && chunk(n) === chunk(id) && !cellRegion.has(n)) {
            cellRegion.set(n, id);
            queue.push(n);
          }
      }
      regions.set(id, {
        id,
        cells: cells.sort((a, b) => a - b),
        neighbors: [],
      });
    }
    for (const [k, id] of cellRegion)
      for (const n of neighbors(k)) {
        const other = cellRegion.get(n);
        if (
          other !== undefined &&
          other !== id &&
          !regions.get(id)!.neighbors.includes(other)
        )
          regions.get(id)!.neighbors.push(other);
      }

    return clone({
      owner,
      time: at,
      profile,
      self: ownState,
      geography,
      regions: [...regions.values()].map((r) => ({
        ...r,
        neighbors: r.neighbors.sort((a, b) => a - b),
      })),
      routes: p.routes,
      evidence,
      methods: current.filter((e) => e.subject.startsWith("method:")),
      places: current.filter(
        (e) =>
          e.subject.startsWith("seen:") &&
          this.latest(owner, e.subject, "kind")?.value !== "person",
      ),
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
