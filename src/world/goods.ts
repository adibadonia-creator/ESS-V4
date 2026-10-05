import type { Key, Identity } from "../kernel/identity";
import { checkTime, type Time } from "../kernel/time";
import type { PhysicalConfig } from "../content/profile";
import type { Counters } from "../kernel/counters";
import { math } from "../kernel/numerics";
import type { Point } from "./terrain";
export type Location =
  | { kind: "ground"; point: Point }
  | { kind: "carrier"; actor: Key }
  | { kind: "container"; container: Key };
export interface Container extends Identity {
  kind: "carried" | "cache" | "site";
  location: Location;
  custodian: Key | null;
  capacityCu: number;
  stocks: Record<string, number>;
}
export interface Reservation {
  key: Key;
  container: Key;
  actor: Key;
  good: string;
  opening: number;
  remaining: number;
  expires: Time;
  status: "active" | "released" | "spent" | "expired";
}
export type Sink = "consumption" | "destruction" | "recipe-input" | "spoilage";
export type Source =
  "diagnostic-source" | "initial-endowment" | "extraction" | "production";
export type GoodsRequest =
  | { kind: "source"; source: Source; to: Key; good: string; quantity: number }
  | {
      kind: "transfer";
      basis: "diagnostic-physical" | "own-custody";
      actor: Key;
      from: Key;
      to: Key;
      good: string;
      quantity: number;
      reservation?: Key;
    }
  | {
      kind: "sink";
      sink: Sink;
      actor: Key;
      from: Key;
      good: string;
      quantity: number;
      reservation?: Key;
    }
  | {
      kind: "reserve";
      actor: Key;
      from: Key;
      good: string;
      quantity: number;
      expires: Time;
    }
  | { kind: "release"; actor: Key; reservation: Key }
  | { kind: "expire"; reservation: Key };
export interface Transaction {
  key: Key;
  at: Time;
  request: GoodsRequest;
  amount: number;
}
export interface GoodsState {
  containers: Container[];
  reservations: Reservation[];
  transactions: Transaction[];
}
export interface PreparedGoods {
  commit: () => Transaction;
  loadActors: Key[];
}
export class GoodsLedger {
  readonly state: GoodsState;
  private containers: Map<Key, Container>;
  private reservations: Map<Key, Reservation>;
  private seen: Set<Key>;
  private byActor = new Map<Key, Set<Key>>();
  private goodById: Map<string, PhysicalConfig["goods"][number]>;
  private owned = new Map<Key,Container[]>();
  ownedContainers(actor:Key){return this.owned.get(actor)??[];}
  private indexContainer(c:Container){if(c.custodian){const rows=this.owned.get(c.custodian)??[];rows.push(c);this.owned.set(c.custodian,rows);}}
  private carried = new Map<Key, Key>();
  private held = new Map<string, Set<Key>>();
  constructor(
    private config: PhysicalConfig,
    private position: (key: Key) => Point,
    private counters: Counters,
    state: GoodsState = { containers: [], reservations: [], transactions: [] },
  ) {
    this.state = state;
    this.goodById = new Map(config.goods.map((g) => [g.id, g]));
    if (this.goodById.size !== config.goods.length)
      throw Error("Duplicate physical good");
    for (const c of state.containers)this.indexContainer(c);
    for (const c of state.containers)
      if (c.kind === "carried" && c.location.kind === "carrier")
        this.carried.set(c.location.actor, c.key);
    this.containers = new Map(state.containers.map((x) => [x.key, x]));
    this.reservations = new Map(state.reservations.map((x) => [x.key, x]));
    this.seen = new Set(state.transactions.map((x) => x.key));
    for (const r of state.reservations) this.indexReservation(r);
  }
  get(key: Key): Container {
    const c = this.containers.get(key);
    if (!c) throw new Error("Missing container");
    return c;
  }
  reservation(key: Key): Reservation {
    const r = this.reservations.get(key);
    if (!r) throw new Error("Missing reservation");
    return r;
  }
  add(c: Container): void {
    if (
      this.containers.has(c.key) ||
      c.capacityCu < 0 ||
      !Number.isFinite(c.capacityCu)
    )
      throw new Error("Invalid container");
    if (c.location.kind === "container") this.get(c.location.container);
    if (Object.keys(c.stocks).length)
      throw new Error("New containers must be empty; use declared sources");
    this.containers.set(c.key, c);
    this.indexContainer(c);
    if (c.kind === "carried" && c.location.kind === "carrier")
      this.carried.set(c.location.actor, c.key);
    this.state.containers.push(c);
    if (c.location.kind === "container") {
      const set = this.children.get(c.location.container) ?? new Set<Key>();
      set.add(c.key);
      this.children.set(c.location.container, set);
    }
  }
  location(key: Key): Point {
    const visited = new Set<Key>();
    let c = this.get(key);
    while (c.location.kind === "container") {
      if (visited.has(c.key)) throw new Error("Container cycle");
      visited.add(c.key);
      c = this.get(c.location.container);
    }
    return c.location.kind === "ground"
      ? { ...c.location.point }
      : this.position(c.location.actor);
  }
  nutrition(good:string) { return this.good(good).nutrition??0; }
  carrier(key: Key): Key | null {
    const seen = new Set<Key>();
    let c = this.get(key);
    while (c.location.kind === "container") {
      if (seen.has(c.key)) throw new Error("Container cycle");
      seen.add(c.key);
      c = this.get(c.location.container);
    }
    return c.location.kind === "carrier" ? c.location.actor : null;
  }
  load(key: Key, override?:Map<Key,Record<string,number>>): number {
    const c = this.get(key);
    let load = 0;
    for (const good of Object.keys(override?.get(key)??c.stocks).sort())
      load += (override?.get(key)??c.stocks)[good]! * this.good(good).bulk;
    // Nesting is supported, but no child registry scan in hot load accounting.
    for (const child of this.children.get(key) ?? []) load += this.load(child,override);
    return load;
  }
  private children = new Map<Key, Set<Key>>();
  rebuildChildren(): void {
    this.children.clear();
    for (const c of this.state.containers)
      if (c.location.kind === "container") {
        const set = this.children.get(c.location.container) ?? new Set<Key>();
        set.add(c.key);
        this.children.set(c.location.container, set);
      }
    for (const c of this.state.containers) this.location(c.key);
  }
  bulk(id: string): number {
    return this.good(id).bulk;
  }
  private good(id: string): PhysicalConfig["goods"][number] {
    this.counters.contentEntriesVisited++;
    const g = this.goodById.get(id);
    if (!g) throw new Error("Unknown physical good");
    return g;
  }
  carriedContainer(actor: Key): Container {
    const key = this.carried.get(actor);
    if (!key) throw Error("Missing carried container");
    return this.get(key);
  }
  resolveAdultCargo(actor: Key, nominalCu: number, at: Time): void {
    if (at !== 0 || !Number.isFinite(nominalCu) || nominalCu <= 0)
      throw Error("Invalid founding cargo profile");
    const container = this.carriedContainer(actor),
      maximum = 2 * nominalCu;
    if (this.load(container.key) > maximum)
      throw Error("Founding cargo cannot shrink below its goods");
    container.capacityCu = maximum;
  }
  activeReservations(actor: Key): Reservation[] {
    const out: Reservation[] = [];
    for (const key of this.byActor.get(actor) ?? []) {
      this.counters.reservationRecordsVisited++;
      out.push(this.reservations.get(key)!);
    }
    return out;
  }
  private unindexReservation(r: Reservation): void {
    const tag = r.container + ":" + r.good;
    const held = this.held.get(tag);
    held?.delete(r.key);
    if (!held?.size) this.held.delete(tag);
    const actor = this.byActor.get(r.actor);
    actor?.delete(r.key);
    if (!actor?.size) this.byActor.delete(r.actor);
  }
  private indexReservation(r: Reservation): void {
    if (r.status !== "active") return;
    const actor = this.byActor.get(r.actor) ?? new Set<Key>();
    actor.add(r.key);
    this.byActor.set(r.actor, actor);
    const tag = r.container + ":" + r.good,
      set = this.held.get(tag) ?? new Set<Key>();
    set.add(r.key);
    this.held.set(tag, set);
  }
  reserved(container: Key, good: string, except?: Key): number {
    let amount = 0;
    for (const key of this.held.get(container + ":" + good) ?? []) {
      this.counters.reservationRecordsVisited++;
      const r = this.reservations.get(key)!;
      if (key !== except && r.status === "active") amount += r.remaining;
    }
    return amount;
  }
  available(container: Key, good: string, override?:Map<Key,Record<string,number>>): number {
    return (
      ((override?.get(container)??this.get(container).stocks)[good] ?? 0) - this.reserved(container, good)
    );
  }
  private ancestors(key: Key): Key[] {
    const out: Key[] = [];
    let c = this.get(key);
    while (true) {
      if (out.includes(c.key)) throw new Error("Container cycle");
      out.push(c.key);
      if (c.location.kind !== "container") return out;
      c = this.get(c.location.container);
    }
  }
  prepare(key: Key, at: Time, request: GoodsRequest): PreparedGoods {
    try {
      return this.validate(key, at, request);
    } catch (e) {
      this.counters.transactionRejections++;
      throw e;
    }
  }
  private validate(key: Key, at: Time, request: GoodsRequest, override?:Map<Key,Record<string,number>>): PreparedGoods {
    checkTime(at);
    request = JSON.parse(JSON.stringify(request)) as GoodsRequest;
    const revision = this.state.transactions.length;
    if (!key || this.seen.has(key)) throw new Error("Duplicate transaction");
    const tolerance = this.config.diagnostic.quantityTolerance;
    const deltas = new Map<Key, number>();
    let good = "",
      quantity = 0,
      reservation: Reservation | undefined,
      newReservation: Reservation | undefined;
    if (request.kind === "release" || request.kind === "expire") {
      reservation = this.reservation(request.reservation);
      if (
        reservation.status !== "active" ||
        (request.kind === "release" && request.actor !== reservation.actor) ||
        (request.kind === "expire" && at < reservation.expires)
      )
        throw new Error("Invalid reservation release");
      quantity = reservation.remaining;
    } else {
      good = request.good;
      this.good(good);
      quantity = request.quantity;
      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        (!this.good(good).divisible && !Number.isInteger(quantity))
      )
        throw new Error("Invalid physical quantity");
      if (request.kind === "source") {
        if (
          ![
            "diagnostic-source",
            "initial-endowment",
            "extraction",
            "production",
          ].includes(request.source)
        )
          throw new Error("Undeclared source");
        this.get(request.to);
        deltas.set(request.to, quantity);
      } else {
        const from = this.get(request.from);
        const a = request.kind==="sink"&&request.sink==="spoilage"?this.location(from.key):this.position(request.actor),
          p = this.location(from.key);
        if (
          math.sqrt((a.x - p.x) ** 2 + (a.y - p.y) ** 2) >
          this.config.movement.workRadiusKm
        )
          throw new Error("No physical access");
        if (request.kind === "reserve") {
          if (
            !Number.isSafeInteger(request.expires) ||
            request.expires <= at ||
            quantity > this.available(from.key, good,override)
          )
            throw new Error("Unbacked reservation");
          newReservation = {
            key,
            container: from.key,
            actor: request.actor,
            good,
            opening: quantity,
            remaining: quantity,
            expires: request.expires,
            status: "active",
          };
        } else {
          if (request.reservation) {
            reservation = this.reservation(request.reservation);
            if (
              reservation.status !== "active" ||
              reservation.container !== from.key ||
              reservation.good !== good ||
              reservation.actor !== request.actor ||
              reservation.remaining < quantity ||
              at >= reservation.expires
            )
              throw new Error("Reservation cannot fund this debit");
          }
          if (
            ((override?.get(from.key)??from.stocks)[good] ?? 0) -
              (request.kind==="sink"&&request.sink==="spoilage"?0:this.reserved(from.key, good, request.reservation)) <
            quantity
          )
            throw new Error("Insufficient finite backing");
          deltas.set(from.key, -quantity);
          if (request.kind === "transfer") {
            if (
              !["diagnostic-physical", "own-custody"].includes(request.basis) ||
              request.from === request.to
            )
              throw new Error("Invalid transaction basis");
            if (
              request.basis === "own-custody" &&
              (from.custodian !== request.actor ||
                this.get(request.to).custodian !== request.actor)
            )
              throw Error("No own custody authority");
            const to = this.get(request.to),
              q = this.location(to.key);
            if (
              math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2) >
                this.config.movement.workRadiusKm ||
              math.sqrt((a.x - q.x) ** 2 + (a.y - q.y) ** 2) >
                this.config.movement.workRadiusKm
            )
              throw new Error("Remote transfer");
            deltas.set(to.key, (deltas.get(to.key) ?? 0) + quantity);
          } else if (
            !["consumption", "destruction", "recipe-input", "spoilage"].includes(
              request.sink,
            )
          )
            throw new Error("Undeclared sink");
        }
      }
    }
    const ancestorDelta = new Map<Key, number>();
    for (const [c, delta] of deltas)
      for (const a of this.ancestors(c))
        ancestorDelta.set(
          a,
          (ancestorDelta.get(a) ?? 0) + delta * this.good(good).bulk,
        );
    for (const [c, delta] of ancestorDelta)
      if (this.load(c,override) + delta > this.get(c).capacityCu + tolerance)
        throw new Error("Capacity exceeded");
    const loadActors = [
      ...new Set(
        [...deltas.keys()]
          .map((k) => this.carrier(k))
          .filter((k): k is Key => k !== null),
      ),
    ].sort();
    let committed = false;
    return {
      loadActors,
      commit: () => {
        if (committed)
          throw new Error("Prepared transaction already committed");
        if (this.state.transactions.length !== revision)
          throw new Error("Prepared transaction is stale");
        committed = true;
        // No operation below this line can fail: all affected writes are prevalidated.
        for (const [c, delta] of deltas) {
          const record = this.get(c);
          record.stocks[good] = (record.stocks[good] ?? 0) + delta;
        }
        if (newReservation) {
          this.state.reservations.push(newReservation);
          this.reservations.set(key, newReservation);
          this.indexReservation(newReservation);
        }
        if (reservation) {
          if (request.kind === "release" || request.kind === "expire") {
            reservation.remaining = 0;
            reservation.status =
              request.kind === "release" ? "released" : "expired";
          } else {
            reservation.remaining -= quantity;
            if (reservation.remaining === 0) reservation.status = "spent";
          }
        }
        if (reservation && reservation.status !== "active")
          this.unindexReservation(reservation);
        const tx = {
          key,
          at,
          request: JSON.parse(JSON.stringify(request)) as GoodsRequest,
          amount: quantity,
        };
        this.state.transactions.push(tx);
        this.seen.add(key);
        this.counters.transactionCommits++;
        return tx;
      },
    };
  }
  validateProjected(key:Key,at:Time,request:GoodsRequest,stocks:Map<Key,Record<string,number>>) { this.validate(key,at,request,stocks); }
  transact(key: Key, at: Time, request: GoodsRequest): Transaction {
    return this.prepare(key, at, request).commit();
  }
  reconciliation(): {
    ok: boolean;
    errors: string[];
    totals: Record<string, { sources: number; sinks: number; stock: number }>;
  } {
    const totals: Record<
        string,
        { sources: number; sinks: number; stock: number }
      > = {},
      balances = new Map<string, number>(),
      errors: string[] = [];
    for (const g of this.config.goods)
      totals[g.id] = { sources: 0, sinks: 0, stock: 0 };
    const add = (c: Key, g: string, q: number) => {
      const tag = c + ":" + g;
      balances.set(tag, (balances.get(tag) ?? 0) + q);
    };
    for (const tx of this.state.transactions) {
      const r = tx.request;
      if (r.kind === "source") {
        totals[r.good]!.sources += r.quantity;
        add(r.to, r.good, r.quantity);
      }
      if (r.kind === "sink") {
        totals[r.good]!.sinks += r.quantity;
        add(r.from, r.good, -r.quantity);
      }
      if (r.kind === "transfer") {
        add(r.from, r.good, -r.quantity);
        add(r.to, r.good, r.quantity);
      }
    }
    const tol = this.config.diagnostic.quantityTolerance;
    for (const c of this.state.containers) {
      for (const g of this.config.goods) {
        const q = c.stocks[g.id] ?? 0;
        totals[g.id]!.stock += q;
        if (
          !Number.isFinite(q) ||
          q < 0 ||
          Math.abs(q - (balances.get(c.key + ":" + g.id) ?? 0)) > tol
        )
          errors.push("Container conservation " + c.key + ":" + g.id);
        if (this.reserved(c.key, g.id) > q + tol)
          errors.push("Reservation backing " + c.key);
      }
      if (this.load(c.key) > c.capacityCu + tol)
        errors.push("Container capacity " + c.key);
    }
    for (const [g, v] of Object.entries(totals))
      if (Math.abs(v.sources - v.sinks - v.stock) > tol)
        errors.push("Global conservation " + g);
    return { ok: !errors.length, errors, totals };
  }
}
