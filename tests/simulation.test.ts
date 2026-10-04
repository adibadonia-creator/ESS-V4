import { it, expect, describe } from "vitest";
import { PhysicalSimulation } from "../src/world/simulation";
import { resolveConfig } from "../src/content/profile";
import { launchPhysicalFixture } from "../src/runners/fixture";
import { time } from "../src/kernel/time";
import { PHASE } from "../src/kernel/kernel";
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
    const snapshot = sim.snapshot(),
      actor = snapshot.actors[0]!,
      target = snapshot.containers
        .filter((c) => c.kind === "site")
        .sort(
          (a, b) =>
            (b.position.x - actor.position.x) ** 2 +
            (b.position.y - actor.position.y) ** 2 -
            ((a.position.x - actor.position.x) ** 2 +
              (a.position.y - actor.position.y) ** 2),
        )[0]!.position;
    expect(sim.diagnosticMove(actor.key, target)).toBe("unresolved");
    const cp = sim.checkpoint();
    expect(JSON.parse(cp).body.routes.length).toBe(1);
    expect(JSON.parse(cp).body.routes[0].search.stage).toBe("regional");
    let restored = PhysicalSimulation.restore(cp);
    expect(restored.checkpoint()).toBe(cp);
    expect(restored.causalHash()).toBe(sim.causalHash());
    // Explicit host yields/saves never advance causal or paid actor time.
    for (let i = 0; i < 3; i++) {
      restored.resumeRouting();
      expect(restored.kernel.state.now).toBe(0);
      expect(restored.snapshot().actors[0]!.paidTravelSd).toBe(0);
    }
    while (record(restored).routes[0].search.stage === "regional")
      restored.resumeRouting();
    const localCp = restored.checkpoint();
    restored = PhysicalSimulation.restore(localCp);
    expect(restored.checkpoint()).toBe(localCp);
    expect(JSON.parse(localCp).body.routes[0].search.stage).toBe("local");
    sim.advanceTo(time(1));
    restored.advanceTo(time(1));
    expect(restored.causalHash()).toBe(sim.causalHash());
    expect(restored.kernel.state.history).toEqual(sim.kernel.state.history);
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

describe("pre-merge causal boundary corrections", () => {
  it("makes engineering slices of 1 versus 65536 expansions history/hash/start invariant", () => {
    const runs = [1, 65536].map((budget) => {
      const sim = new PhysicalSimulation(
        "spine",
        resolveConfig(
          { width: 64, height: 48, regionCells: 8 },
          { actors: 2, sites: 8, routeExpansionsPerResume: budget },
        ),
      );
      launchPhysicalFixture(sim);
      expect(sim.kernel.state.now).toBe(0);
      const launched = record(sim);
      expect(launched.routes).toHaveLength(0);
      expect(launched.actors.every((a: any) => a.motion.started === 0)).toBe(
        true,
      );
      expect(
        launched.kernel.queue.some((e: any) => e.payload.kind === "route"),
      ).toBe(false);
      const startHash = sim.causalHash();
      sim.advanceTo(time(1));
      return { sim, startHash };
    });
    expect(runs[0]!.startHash).toBe(runs[1]!.startHash);
    expect(runs[0]!.sim.causalHash()).toBe(runs[1]!.sim.causalHash());
    expect(runs[0]!.sim.kernel.state.history).toEqual(
      runs[1]!.sim.kernel.state.history,
    );
    expect(runs[0]!.sim.kernel.state.historyHash).toBe(
      runs[1]!.sim.kernel.state.historyHash,
    );
    expect(runs[0]!.sim.snapshot().actors).toEqual(
      runs[1]!.sim.snapshot().actors,
    );
    expect(runs[0]!.sim.counters.routeExpansions).toBe(
      runs[1]!.sim.counters.routeExpansions,
    );
  });
  it("bounds each host slice and starts motion at the request time without a route event", () => {
    const sim = new PhysicalSimulation(
      "spine",
      resolveConfig(
        { width: 32, height: 24, regionCells: 8 },
        { actors: 2, sites: 8, routeExpansionsPerResume: 1 },
      ),
    );
    const snap = sim.snapshot(),
      actor = snap.actors[0]!,
      target = snap.containers.find((c) => c.kind === "site")!.position;
    const before = sim.kernel.state.historyHash;
    expect(sim.diagnosticMove(actor.key, target)).toBe("unresolved");
    expect(sim.kernel.state.queue).toHaveLength(0);
    expect(sim.kernel.state.historyHash).toBe(before);
    let pending = true;
    while (pending) {
      const before =
        sim.counters.routeExpansions + sim.counters.routeRegionExpansions;
      pending = sim.resumeRouting();
      expect(
        sim.counters.routeExpansions +
          sim.counters.routeRegionExpansions -
          before,
      ).toBeLessThanOrEqual(1);
      expect(sim.kernel.state.now).toBe(0);
    }
    expect(record(sim).actors[0].motion.started).toBe(0);
  });
  it("cancels stale motion but preserves an unrelated future event concerning the same actor", () => {
    const sim = create(),
      actor = sim.snapshot().actors.find((a) => a.leg)!;
    const stale = sim.kernel.state.queue.find(
      (e) => e.payload.kind === "leg" && e.payload.actor === actor.key,
    )!;
    const unrelated = sim.kernel.schedule(actor.key, time(0.5), PHASE.observe, {
      kind: "diagnostic",
      actor: actor.key,
    });
    sim.advanceTo(Math.floor((actor.leg!.start + actor.leg!.end) / 2));
    sim.diagnosticInterrupt(actor.key);
    expect(sim.kernel.generation(stale.subject)).not.toBe(stale.generation);
    expect(sim.kernel.generation(unrelated.subject)).toBe(unrelated.generation);
    sim.advanceTo(time(1));
    expect(
      sim.kernel.state.history.some(
        (h) =>
          h.kind === "diagnostic-unrelated-event" && h.subject === actor.key,
      ),
    ).toBe(true);
    expect(
      sim.kernel.state.history.some(
        (h) => h.kind === "movement-arrival" && h.subject === actor.key,
      ),
    ).toBe(false);
    expect(sim.counters.staleEvents).toBeGreaterThan(0);
  });
  it("revalidates a stale unresolved search without turning invalidation into unreachable", () => {
    const sim = new PhysicalSimulation(
      "spine",
      resolveConfig(
        { width: 32, height: 24, regionCells: 8 },
        { actors: 2, sites: 8, routeExpansionsPerResume: 1 },
      ),
    );
    const snap = sim.snapshot(),
      actor = snap.actors[0]!,
      target = snap.containers.find((c) => c.kind === "site")!.position;
    expect(sim.diagnosticMove(actor.key, target)).toBe("unresolved");
    const saved = record(sim);
    sim.diagnosticTerrain(
      0,
      !!saved.terrain.passable[0],
      saved.terrain.speed[0],
    );
    expect(sim.resumeRouting()).toBe(true);
    expect(record(sim).routes[0].search.status).toBe("unresolved");
    const restored = PhysicalSimulation.restore(sim.checkpoint());
    sim.advanceTo(time(1));
    restored.advanceTo(time(1));
    expect(sim.causalHash()).toBe(restored.causalHash());
    expect(sim.snapshot().actors[0]!.motionStatus).toBe("arrived");
  });
  it("interrupts when a zero-length diagonal corner guard becomes impassable", () => {
    const sim = new PhysicalSimulation(
      "spine",
      resolveConfig(
        { width: 8, height: 8, regionCells: 2 },
        { actors: 1, sites: 1 },
      ),
    );
    for (let k = 0; k < 64; k++) sim.diagnosticTerrain(k, true, 1);
    const actor = sim.snapshot().actors[0]!,
      start =
        Math.floor(actor.position.x / 0.1) +
        Math.floor(actor.position.y / 0.1) * 8;
    const dx = start % 8 < 7 ? 1 : -1,
      dy = start < 56 ? 1 : -1,
      goal = start + dx + dy * 8;
    sim.diagnosticMove(actor.key, {
      x: ((goal % 8) + 0.5) * 0.1,
      y: (Math.floor(goal / 8) + 0.5) * 0.1,
    });
    sim.advanceTo(0);
    const motion = record(sim).actors[0].motion;
    const guard = motion.segments.flatMap((s: any) => s.guards ?? [])[0];
    expect(guard).toBeDefined();
    expect(motion.segments.some((s: any) => s.cell === guard)).toBe(false);
    sim.diagnosticTerrain(guard, false, 0);
    expect(sim.snapshot().actors[0]!.motionStatus).toBe("interrupted");
    sim.advanceTo(time(1));
    expect(
      sim.kernel.state.history.some((h) => h.kind === "movement-arrival"),
    ).toBe(false);
  });
  it("does not interrupt or reanchor for an adjacent unused impassable cell", () => {
    const sim = create(),
      actor = sim.snapshot().actors.find((a) => a.leg)!,
      leg = actor.leg!;
    sim.advanceTo(Math.floor((leg.start + leg.end) / 2));
    const saved = record(sim),
      motion = saved.actors.find((a: any) => a.key === actor.key).motion;
    const used = new Set<number>(
      motion.segments
        .slice(motion.segmentCursor)
        .flatMap((s: any) => [s.cell, ...(s.guards ?? [])]),
    );
    const width = sim.config.spatial.width;
    let unused = -1;
    for (const offset of [
      -width - 1,
      -width,
      -width + 1,
      -1,
      1,
      width - 1,
      width,
      width + 1,
    ]) {
      const k = leg.cell + offset;
      if (
        k >= 0 &&
        k < width * sim.config.spatial.height &&
        saved.terrain.passable[k] &&
        !used.has(k)
      ) {
        unused = k;
        break;
      }
    }
    expect(unused).toBeGreaterThanOrEqual(0);
    const generation = sim.kernel.generation(
      digest(["physical-motion", actor.key]),
    );
    sim.diagnosticTerrain(unused, false, 0);
    const after = sim.snapshot().actors.find((a) => a.key === actor.key)!;
    expect(after.motionStatus).toBe("moving");
    expect(after.leg).toEqual(leg);
    expect(sim.kernel.generation(digest(["physical-motion", actor.key]))).toBe(
      generation,
    );
    sim.advanceTo(time(1));
    expect(
      sim.snapshot().actors.find((a) => a.key === actor.key)!.motionStatus,
    ).toBe("arrived");
  });
});
