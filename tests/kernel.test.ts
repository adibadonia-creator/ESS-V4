import { describe, it, expect } from "vitest";
import { Kernel, PHASE, compareEvents } from "../src/kernel/kernel";
import { Identities, lineage } from "../src/kernel/identity";
import { time, future, QUANTA } from "../src/kernel/time";
import { canonical, digest } from "../src/kernel/canonical";
import { counters } from "../src/kernel/counters";
import { draw, philox } from "../src/kernel/random";
import { math } from "../src/kernel/numerics";

describe("integer time and semantic identities", () => {
  it("rounds future boundaries up and rejects overflow and invalid timestamps", () => {
    expect(time(1)).toBe(QUANTA);
    expect(future(4, 0.1 / QUANTA)).toBe(5);
    for (const n of [NaN, Infinity, -1, Number.MAX_SAFE_INTEGER])
      expect(() => time(n)).toThrow();
    expect(() => future(Number.MAX_SAFE_INTEGER, 1 / QUANTA)).toThrow();
  });
  it("never reuses handles or keys, while unrelated allocations do not change lineage", () => {
    const a = new Identities(),
      b = new Identities();
    const first = a.allocate("person", "root");
    b.allocate("site", "elsewhere");
    const other = b.allocate("person", "root");
    expect(first.key).toBe(other.key);
    expect(first.handle).not.toBe(other.handle);
    const second = a.allocate("person", "root");
    expect(second.handle).toBeGreaterThan(first.handle);
    expect(second.key).not.toBe(first.key);
    expect(() => a.allocate("person", "root", 0)).toThrow();
    const restored = new Identities(JSON.parse(JSON.stringify(a.state)));
    expect(restored.allocate("person", "root").handle).toBe(second.handle + 1);
  });
  it("hashes sorted records and rejects nonfinite causal values", () => {
    expect(digest({ b: 2, a: [1, 0] })).toBe(digest({ a: [1, 0], b: 2 }));
    expect(canonical(new Uint8Array([1, 2]))).toBe("[1,2]");
    expect(() => digest({ x: NaN })).toThrow();
  });
});
describe("phased mutable scheduler", () => {
  it("does not publish a timestamp with newly pending same-time work", () => {
    const k = new Kernel(counters());
    k.schedule("a", 0, PHASE.close, null);
    expect(k.committed).toBe(false);
    k.advance(0, () => {});
    expect(k.committed).toBe(true);
  });

  it("orders by timestamp, phase and semantic key rather than insertion handle", () => {
    const k = new Kernel<string>(counters());
    const phases = [PHASE.decide, PHASE.harm, PHASE.close, PHASE.observe];
    const events = phases.flatMap((phase) =>
      ["z", "a"].map((subject) => k.schedule(subject, 10, phase, subject)),
    );
    const expected = [...events].sort(compareEvents).map((e) => e.key),
      seen: string[] = [];
    k.advance(10, (e) => seen.push(e.key));
    expect(seen).toEqual(expected);
    expect(k.state.phase).toBe(-1);
  });
  it("allows later-phase same-time work and rejects zero-time cycles", () => {
    const k = new Kernel<number>(counters());
    k.schedule("a", 3, PHASE.close, 0);
    const seen: number[] = [];
    k.advance(3, (e) => {
      seen.push(e.payload);
      if (e.payload === 0) k.schedule("a", 3, PHASE.settle, 1);
    });
    expect(seen).toEqual([0, 1]);
    const bad = new Kernel(counters());
    bad.schedule("a", 4, PHASE.commit, null);
    expect(() =>
      bad.advance(4, () => bad.schedule("a", 4, PHASE.commit, null)),
    ).toThrow(/Zero-time/);
    expect(bad.committed).toBe(false);
  });
  it("invalidates stale work, preserves identity, and compacts without committing it", () => {
    const c = counters(),
      k = new Kernel<number>(c);
    for (let i = 0; i < 300; i++) k.schedule("a", 10, PHASE.close, i);
    const handles = k.state.ids.nextHandle;
    k.invalidate("a");
    expect(c.heapCompactions).toBe(1);
    const valid = k.schedule("a", 10, PHASE.close, 777);
    expect(valid.handle).toBe(handles);
    const seen: number[] = [];
    k.advance(10, (e) => seen.push(e.payload));
    expect(seen).toEqual([777]);
    k.schedule("b", 11, PHASE.close, 888);
    k.invalidate("b");
    k.advance(11, (e) => seen.push(e.payload));
    expect(c.staleEvents).toBe(1);
    expect(seen).toEqual([777]);
  });
  it("retains append-only records without aliasing caller objects", () => {
    const k = new Kernel(counters()),
      detail = { amount: 2 };
    k.record("sink", "a", detail);
    detail.amount = 99;
    expect(k.state.history[0]!.detail).toEqual({ amount: 2 });
  });
});
describe("versioned causal random/numerical adapters", () => {
  it("matches published Random123 Philox4x32-10 reference vectors", () => {
    // Primary KAT source: https://github.com/DEShawResearch/random123/blob/main/tests/kat_vectors
    expect(philox([0, 0, 0, 0], [0, 0])).toEqual([
      0x6627e8d5, 0xe169c58d, 0xbc57ac4c, 0x9b00dbd8,
    ]);
    expect(
      philox(
        [0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff],
        [0xffffffff, 0xffffffff],
      ),
    ).toEqual([0x408f276d, 0x41c83b0e, 0xa20bc7c6, 0x6d5451fd]);
  });
  it("keys draws by semantic lineage, domain and ordinal, independent of draw order", () => {
    const key = lineage("person", "root", 0),
      first = draw("seed", "ability", [key], 3);
    draw("seed", "cosmetic", ["else"], 900);
    expect(draw("seed", "ability", [key], 3)).toBe(first);
    expect(draw("seed", "ability", [key], 4)).not.toBe(first);
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1);
  });
  it("retains V2 numerical accuracy and small-increment precision", () => {
    for (const x of [-20, -1, -0.001, 0, 0.001, 1, 20])
      expect(Math.abs(math.exp(x) / Math.exp(x) - 1)).toBeLessThan(5e-14);
    for (const x of [1e-200, 0.1, 1, 2, 1e200])
      expect(Math.abs(math.log(x) - Math.log(x))).toBeLessThan(2e-12);
    expect(math.log1p(1e-16)).toBeCloseTo(1e-16, 30);
    expect(math.expm1(1e-16)).toBeCloseTo(1e-16, 30);
    expect(math.pow(2, 0.5)).toBeCloseTo(Math.sqrt(2), 14);
  });
  it("fails explicitly for invalid causal numerical input", () => {
    for (const fn of [
      math.exp,
      math.log,
      math.log1p,
      math.expm1,
      math.tanh,
      math.sqrt,
    ])
      expect(() => fn(NaN)).toThrow();
    expect(() => math.exp(710)).toThrow();
    expect(() => math.log(0)).toThrow();
    expect(() => math.sqrt(-1)).toThrow();
  });
});
