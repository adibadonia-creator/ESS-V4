import { it, expect, describe } from "vitest";
import { PhysicalSimulation } from "../src/world/simulation";
import { resolveConfig } from "../src/content/profile";
import { launchPhysicalFixture } from "../src/runners/fixture";
import { time } from "../src/kernel/time";
import { canonical, digest } from "../src/kernel/canonical";
import { summarize } from "../src/measurement/reduce";
const config = () =>
  resolveConfig(
    { width: 32, height: 24, regionCells: 8 },
    { actors: 2, sites: 8 },
  );
function create(seed = "spine") {
  const sim = new PhysicalSimulation(seed, config());
  launchPhysicalFixture(sim);
  return sim;
}
function record(sim: PhysicalSimulation) {
  return JSON.parse(sim.checkpoint()).body;
}
describe("physical causal execution and inert projections", () => {
  it("owns configuration independently of caller mutation", () => {
    const c = JSON.parse(JSON.stringify(config()));
    const sim = new PhysicalSimulation("spine", c),
      hash = sim.causalHash();
    c.movement.baseKmPerSd = 1;
    expect(sim.config.movement.baseKmPerSd).toBe(80);
    expect(sim.causalHash()).toBe(hash);
  });

  it("repeats exactly and ignores external stepping partitions, snapshots, and measurements", () => {
    const single = create(),
      repeated = create(),
      observed = create();
    single.advanceTo(time(1));
    repeated.advanceTo(time(1));
    for (let q = 0; q < time(1); q += 751) {
      observed.advanceTo(q);
      const before = observed.causalHash();
      summarize(observed.snapshot());
      observed.snapshot(true);
      expect(observed.causalHash()).toBe(before);
    }
    observed.advanceTo(time(1));
    expect(observed.causalHash()).toBe(single.causalHash());
    expect(repeated.causalHash()).toBe(single.causalHash());
    expect(observed.kernel.state.historyHash).toBe(
      single.kernel.state.historyHash,
    );
  });
  it("projects immutable copies while keeping the authoritative world mutable", () => {
    const sim = create(),
      snapshot = sim.snapshot(),
      hash = sim.causalHash();
    expect(Object.isFrozen(snapshot.actors[0]!.position)).toBe(true);
    expect(() => {
      (snapshot.actors[0]!.position as { x: number }).x = 99;
    }).toThrow();
    expect(Object.isFrozen(sim.kernel.state)).toBe(false);
    expect(sim.causalHash()).toBe(hash);
    sim.advanceTo(time(0.01));
    expect(sim.kernel.state.now).toBe(time(0.01));
  });
  it("moves continuously within the anchor and accounts only for paid elapsed travel", () => {
    const sim = create(),
      initial = sim.snapshot().actors.find((a) => a.leg)!;
    expect(initial).toBeDefined();
    const leg = initial.leg!,
      at = Math.floor((leg.start + leg.end) / 2);
    sim.advanceTo(at);
    const current = sim.snapshot().actors.find((a) => a.key === initial.key)!,
      fraction = (at - leg.start) / (leg.end - leg.start);
    expect(current.position.x).toBe(
      leg.from.x + (leg.to.x - leg.from.x) * fraction,
    );
    expect(current.position.y).toBe(
      leg.from.y + (leg.to.y - leg.from.y) * fraction,
    );
    expect(current.paidTravelSd).toBe(at / 2 ** 20);
    const anchored = record(sim).actors.find(
      (a: { key: string }) => a.key === initial.key,
    );
    expect(anchored.motion.leg).toEqual(leg);
    expect(anchored.position).toEqual(leg.from);
  });
  it("settles the old load prefix before changing speed and rejects a failed debit atomically", () => {
    const sim = new PhysicalSimulation("spine", config()),
      actor = sim.snapshot().actors[0]!,
      cache = sim
        .snapshot()
        .containers.find(
          (c) => c.kind === "cache" && c.custodian === actor.key,
        )!;
    sim.diagnosticGoods({
      kind: "transfer",
      basis: "diagnostic-physical",
      actor: actor.key,
      from: cache.key,
      to: actor.container,
      good: "food",
      quantity: 1,
    });
    launchPhysicalFixture(sim);
    const leg = sim.snapshot().actors[0]!.leg!;
    sim.advanceTo(Math.floor((leg.start + leg.end) / 2));
    const before = sim.snapshot().actors[0]!;
    sim.diagnosticGoods({
      kind: "sink",
      sink: "consumption",
      actor: actor.key,
      from: actor.container,
      good: "food",
      quantity: 0.5,
    });
    const after = sim.snapshot().actors[0]!;
    expect(after.position).toEqual(before.position);
    expect(after.paidTravelSd).toBe(before.paidTravelSd);
    expect(after.leg!.start).toBe(sim.kernel.state.now);
    expect(after.leg!.speedKmPerSd).toBeGreaterThan(leg.speedKmPerSd);
    const hash = sim.causalHash();
    expect(() =>
      sim.diagnosticGoods({
        kind: "sink",
        sink: "consumption",
        actor: actor.key,
        from: actor.container,
        good: "food",
        quantity: 99,
      }),
    ).toThrow();
    expect(sim.causalHash()).toBe(hash);
    expect(sim.snapshot().reconciliation.ok).toBe(true);
  });
  it("interrupts a changed physical route at its paid prefix without later stale arrival", () => {
    const sim = create(),
      a = sim.snapshot().actors.find((a) => a.leg)!,
      leg = a.leg!;
    sim.advanceTo(Math.floor((leg.start + leg.end) / 2));
    const before = sim.snapshot().actors.find((x) => x.key === a.key)!;
    sim.diagnosticTerrain(leg.cell, false, 0);
    const after = sim.snapshot().actors.find((x) => x.key === a.key)!;
    expect(after.position).toEqual(before.position);
    expect(after.motionStatus).toBe("interrupted");
    sim.advanceTo(time(1));
    expect(
      sim.snapshot().actors.find((x) => x.key === a.key)!.position,
    ).toEqual(before.position);
    expect(
      sim.kernel.state.history.filter(
        (h) => h.kind === "movement-arrival" && h.subject === a.key,
      ),
    ).toHaveLength(0);
  });
  it("rejects nonfinite movement targets before any causal mutation", () => {
    const sim = new PhysicalSimulation("spine", config()),
      hash = sim.causalHash();
    expect(() =>
      sim.diagnosticMove(sim.actorKeys()[0]!, { x: NaN, y: 0 }),
    ).toThrow();
    expect(sim.causalHash()).toBe(hash);
  });
});
describe("complete committed-boundary checkpoints", () => {
  it("restores active movement, reserved goods and queued future work exactly", () => {
    const sim = new PhysicalSimulation("spine", config()),
      actor = sim.snapshot().actors[0]!,
      cache = sim
        .snapshot()
        .containers.find(
          (c) => c.kind === "cache" && c.custodian === actor.key,
        )!;
    sim.diagnosticGoods({
      kind: "reserve",
      actor: actor.key,
      from: cache.key,
      good: "food",
      quantity: 1,
      expires: time(0.5),
    });
    launchPhysicalFixture(sim);
    const leg = sim.snapshot().actors.find((a) => a.leg)!.leg!;
    sim.advanceTo(Math.floor((leg.start + leg.end) / 2));
    const cp = sim.checkpoint(),
      saved = JSON.parse(cp).body;
    expect(
      saved.actors.some(
        (a: { motion: { status: string } }) => a.motion?.status === "moving",
      ),
    ).toBe(true);
    expect(saved.goods.reservations[0].status).toBe("active");
    expect(saved.kernel.queue.length).toBeGreaterThan(0);
    const restored = PhysicalSimulation.restore(cp);
    expect(restored.checkpoint()).toBe(cp);
    expect(restored.causalHash()).toBe(sim.causalHash());
    sim.advanceTo(time(1));
    restored.advanceTo(time(0.25));
    restored.advanceTo(time(1));
    expect(restored.causalHash()).toBe(sim.causalHash());
    expect(restored.kernel.state.historyHash).toBe(
      sim.kernel.state.historyHash,
    );
    expect(restored.snapshot().reservations[0]!.status).toBe("expired");
  });
  it("preserves unfinished route computation and reaches an identical continuation", () => {
    const c = resolveConfig(
        { width: 32, height: 24, regionCells: 8 },
        { actors: 2, sites: 8, routeExpansionsPerResume: 1 },
      ),
      sim = new PhysicalSimulation("spine", c);
    launchPhysicalFixture(sim);
    const cp = sim.checkpoint();
    expect(JSON.parse(cp).body.routes.length).toBeGreaterThan(0);
    const restored = PhysicalSimulation.restore(cp);
    sim.advanceTo(time(1));
    restored.advanceTo(time(1));
    expect(restored.causalHash()).toBe(sim.causalHash());
  });
  it("rejects tampering, incompatible profiles, future events in the past and invalid identity reuse", () => {
    const sim = create(),
      cp = sim.checkpoint();
    const modified = JSON.parse(cp);
    modified.body.seed = "tampered";
    expect(() => PhysicalSimulation.restore(JSON.stringify(modified))).toThrow(
      /checksum/,
    );
    for (const mutate of [
      (body: any) => body.versions.schema++,
      (body: any) => (body.kernel.queue[0].at = 0),
      (body: any) => (body.actors[1].handle = body.actors[0].handle),
    ]) {
      const data = JSON.parse(cp);
      mutate(data.body);
      data.checksum = digest(data.body);
      expect(() => PhysicalSimulation.restore(canonical(data))).toThrow();
    }
  });
  it("records a parameter intervention and reanchors active motion at the committed prefix", () => {
    const sim = create(),
      leg = sim.snapshot().actors.find((a) => a.leg)!.leg!;
    sim.advanceTo(Math.floor((leg.start + leg.end) / 2));
    const before = sim.snapshot();
    const config = JSON.parse(JSON.stringify(sim.config));
    config.movement.baseKmPerSd = 40;
    const fork = sim.forkConfiguration(
      config,
      "diagnostic parameter intervention",
    );
    const saved = record(fork);
    expect(saved.fork.parentCheckpoint).toHaveLength(32);
    expect(saved.fork.intervention.at).toBe(before.time);
    expect(fork.snapshot().actors[0]!.position).toEqual(
      before.actors[0]!.position,
    );
    expect(fork.causalHash()).not.toBe(sim.causalHash());
    expect(PhysicalSimulation.restore(fork.checkpoint()).causalHash()).toBe(
      fork.causalHash(),
    );
  });
});
