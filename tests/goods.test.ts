import { describe, it, expect } from "vitest";
import { GoodsLedger } from "../src/world/goods";
import { resolveConfig } from "../src/content/profile";
import { counters } from "../src/kernel/counters";
import { canonical } from "../src/kernel/canonical";
function fixture() {
  const ledger = new GoodsLedger(
    resolveConfig(),
    (actor) => ({ x: actor === "remote" ? 5 : 0, y: 0 }),
    counters(),
  );
  ledger.add({
    key: "cache",
    handle: 1,
    kind: "cache",
    location: { kind: "ground", point: { x: 0, y: 0 } },
    custodian: "a",
    capacityCu: 12,
    stocks: {},
  });
  ledger.add({
    key: "carry",
    handle: 2,
    kind: "carried",
    location: { kind: "carrier", actor: "a" },
    custodian: "a",
    capacityCu: 3,
    stocks: {},
  });
  ledger.transact("source", 0, {
    kind: "source",
    source: "initial-endowment",
    to: "cache",
    good: "food",
    quantity: 8,
  });
  return ledger;
}
describe("finite single-writer physical goods", () => {
  it("conserves deposits and withdrawals and preserves custody", () => {
    const l = fixture();
    l.transact("take", 0, {
      kind: "transfer",
      basis: "diagnostic-physical",
      actor: "a",
      from: "cache",
      to: "carry",
      good: "food",
      quantity: 2,
    });
    l.transact("put", 0, {
      kind: "transfer",
      basis: "diagnostic-physical",
      actor: "a",
      from: "carry",
      to: "cache",
      good: "food",
      quantity: 1,
    });
    expect(l.get("carry").stocks.food).toBe(1);
    expect(l.get("cache").stocks.food).toBe(7);
    expect(l.get("cache").custodian).toBe("a");
    expect(l.reconciliation().ok).toBe(true);
  });
  it("reserves existing stock and releases only the unused part", () => {
    const l = fixture();
    l.transact("lease", 0, {
      kind: "reserve",
      actor: "a",
      from: "cache",
      good: "food",
      quantity: 4,
      expires: 100,
    });
    expect(l.get("cache").stocks.food).toBe(8);
    expect(l.available("cache", "food")).toBe(4);
    l.transact("consume", 10, {
      kind: "sink",
      sink: "consumption",
      actor: "a",
      from: "cache",
      good: "food",
      quantity: 1,
      reservation: "lease",
    });
    expect(l.reservation("lease").remaining).toBe(3);
    expect(l.available("cache", "food")).toBe(4);
    const tx = l.transact("release", 11, {
      kind: "release",
      actor: "a",
      reservation: "lease",
    });
    expect(tx.amount).toBe(3);
    expect(l.available("cache", "food")).toBe(7);
    expect(l.reconciliation().totals.food).toEqual({
      sources: 8,
      sinks: 1,
      stock: 7,
    });
  });
  it("cannot spend backing twice and cannot fund an expired lease", () => {
    const l = fixture();
    l.transact("lease", 0, {
      kind: "reserve",
      actor: "a",
      from: "cache",
      good: "food",
      quantity: 7,
      expires: 10,
    });
    expect(() =>
      l.transact("overspend", 1, {
        kind: "transfer",
        basis: "diagnostic-physical",
        actor: "a",
        from: "cache",
        to: "carry",
        good: "food",
        quantity: 2,
      }),
    ).toThrow();
    expect(() =>
      l.transact("late", 10, {
        kind: "sink",
        sink: "consumption",
        actor: "a",
        from: "cache",
        good: "food",
        quantity: 1,
        reservation: "lease",
      }),
    ).toThrow();
    l.transact("expire", 10, { kind: "expire", reservation: "lease" });
    expect(l.available("cache", "food")).toBe(8);
    expect(l.reconciliation().ok).toBe(true);
  });
  it("consumes once and rejects duplicate transaction identity", () => {
    const l = fixture(),
      request = {
        kind: "sink",
        sink: "consumption",
        actor: "a",
        from: "cache",
        good: "food",
        quantity: 2,
      } as const;
    l.transact("eat", 0, request);
    const before = canonical(l.state);
    expect(() => l.transact("eat", 0, request)).toThrow();
    expect(canonical(l.state)).toBe(before);
    expect(l.reconciliation().totals.food!.sinks).toBe(2);
  });
  it("failed capacity, locality and quantity validation leave all causal records unchanged", () => {
    const l = fixture();
    const before = canonical(l.state);
    for (const request of [
      {
        kind: "transfer",
        basis: "diagnostic-physical",
        actor: "a",
        from: "cache",
        to: "carry",
        good: "food",
        quantity: 4,
      },
      {
        kind: "sink",
        sink: "consumption",
        actor: "remote",
        from: "cache",
        good: "food",
        quantity: 1,
      },
      {
        kind: "source",
        source: "diagnostic-source",
        to: "carry",
        good: "food",
        quantity: -1,
      },
    ] as const) {
      expect(() => l.transact("fail", 0, request)).toThrow();
      expect(canonical(l.state)).toBe(before);
    }
  });
  it("rejects stale prepared transactions before a write and copies the validated request", () => {
    const l = fixture(),
      request = {
        kind: "sink",
        sink: "consumption",
        actor: "a",
        from: "cache",
        good: "food",
        quantity: 2,
      } as const;
    const prepared = l.prepare("first", 0, request);
    l.transact("second", 0, request);
    const before = canonical(l.state);
    expect(() => prepared.commit()).toThrow(/stale/);
    expect(canonical(l.state)).toBe(before);
    const mutable: {
      kind: "sink";
      sink: "consumption";
      actor: string;
      from: string;
      good: string;
      quantity: number;
    } = { ...request };
    const next = l.prepare("third", 0, mutable);
    mutable.quantity = 99;
    next.commit();
    expect(l.get("cache").stocks.food).toBe(4);
    expect(l.reconciliation().ok).toBe(true);
  });
  it("accounts for nested loads and rejects ancestor capacity overflow", () => {
    const l = fixture();
    l.add({
      key: "pouch",
      handle: 3,
      kind: "cache",
      location: { kind: "container", container: "carry" },
      custodian: "a",
      capacityCu: 10,
      stocks: {},
    });
    l.transact("nested", 0, {
      kind: "source",
      source: "diagnostic-source",
      to: "pouch",
      good: "food",
      quantity: 2,
    });
    expect(l.load("carry")).toBe(2);
    expect(l.carrier("pouch")).toBe("a");
    const before = canonical(l.state);
    expect(() =>
      l.transact("over", 0, {
        kind: "source",
        source: "diagnostic-source",
        to: "pouch",
        good: "food",
        quantity: 2,
      }),
    ).toThrow();
    expect(canonical(l.state)).toBe(before);
  });
});
