import { describe, it, expect } from "vitest";
import {
  flatWorld,
  editWorld,
  task,
  move,
  attend,
  execution,
  time,
  beliefKey,
} from "./pack0b-fixture";
import { PhysicalSimulation } from "../src/world/simulation";
import { EvidenceService } from "../src/evidence/service";
import { counters } from "../src/kernel/counters";
import {
  beginPersonalSearch,
  resumePersonalSearch,
} from "../src/runtime/routing";
import type { PerceptionPacket } from "../src/evidence/types";
const packet = (n: number, offset = 0): PerceptionPacket => ({
  terrain: [],
  facts: Array.from({ length: n }, (_, i) => ({
    reference: "site-" + (i + offset),
    kind: "site",
    position: { x: (i + offset) * 0.01, y: 0 },
    detection: 1,
    properties: [
      { property: "stock:food", value: 0, volatility: "fast", uncertainty: 0 },
    ],
  })),
  footprint: { cells: [], duration: 0 },
});
describe("bounded current personal beliefs", () => {
  it("keeps 32 discretionary places, evicts least salient knowledge, and drops its execution capability", () => {
    const e = new EvidenceService("memory", counters());
    e.register("a");
    e.observe("a", packet(40), 10, "direct", true);
    const p = e.state.people[0]!;
    expect(Object.keys(p.memory.places)).toHaveLength(32);
    expect(p.records.some((r) => r.subject === "seen:1")).toBe(false);
    expect(e.reference("a", "seen:1")).toBe(null);
    expect(p.memory.evictions).toBe(8);
    expect(p.memory.precedent.regions["0,0"]!.observedEmpty).toBe(8);
    expect(p.memory.precedent.regions["0,0"]!.forgottenPlaces).toBe(8);
    const before = p.records.length;
    for (let t = 11; t < 100; t++)
      e.observe("a", packet(32, 8), t, "direct", true);
    expect(p.records.length).toBe(before);
    expect(Object.keys(p.delivered).length).toBe(before);
  });
  it("pins typed required records and current targets without consuming the discretionary slots", () => {
    const e = new EvidenceService("memory", counters());
    e.register("a");
    e.observe("a", packet(1), 0, "initial", true);
    const target = e.state.people[0]!.records.find(
      (r) => r.property === "kind",
    )!.subject;
    e.pin(
      "a",
      "task",
      {
        subjects: [],
        beliefKeys: [beliefKey(target, "stock:food")],
        targets: [],
        reason: "task",
      },
      0,
    );
    e.observe("a", packet(40, 1), 100, "new places", true);
    expect(e.latest("a", target, "kind")).not.toBe(null);
    expect(Object.keys(e.state.people[0]!.memory.places)).toHaveLength(33);
    e.unpin("a", "task");
    expect(e.latest("a", target, "kind")).toBe(null);
    expect(Object.keys(e.state.people[0]!.memory.places)).toHaveLength(32);
  });
  it("real task target/self pins survive eviction; goods, physical entities, history and another person are preserved", () => {
    let a = editWorld(flatWorld("many", 2, 80), (s) => {
      const sites = s.goods.containers.filter((c: any) => c.kind === "site");
      sites.forEach((c: any) => (c.location.point = { x: 2.75, y: 1.55 }));
      sites[0].location.point = { x: 0.55, y: 0.85 };
    });
    const actor = a.actorKeys()[0]!,
      other = a.actorKeys()[1]!;
    a.enablePersonal(actor);
    a.enablePersonal(other);
    a.diagnosticObserve(actor, true);
    const target = a
      .personalView(actor)
      .places.find(
        (e) => e.property === "location" && (e.value as any).x === 0.55,
      )!.subject;
    const t = task(a, [attend(time(1))]);
    t.bindings = { target };
    t.dependsOn = [
      {
        key: beliefKey(target, "existence"),
        version: a
          .personalView(actor)
          .places.find(
            (e) => e.subject === target && e.property === "existence",
          )!.version,
      },
    ];
    a.diagnosticSelect(t);
    a = editWorld(a, (s) =>
      s.goods.containers
        .filter((c: any) => c.kind === "site")
        .slice(1)
        .forEach((c: any) => (c.location.point = { x: 0.65, y: 0.85 })),
    );
    const before = JSON.parse(a.checkpoint()).body,
      otherView = a.personalView(other);
    a.diagnosticObserve(actor, true);
    const after = JSON.parse(a.checkpoint()).body,
      v = a.personalView(actor);
    expect(v.memory.discretionaryPlaces).toBe(32);
    expect(v.memory.pinnedPlaces).toBeGreaterThanOrEqual(2);
    expect(v.places.some((e) => e.subject === target)).toBe(true);
    expect(v.evidence.find((e) => e.subject === target)!.pinned).toBe(true);
    expect(v.evidence.some((e) => e.subject === "self" && e.pinned)).toBe(true);
    expect(v.methods.find((e) => e.subject === "method:contact")!.pinned).toBe(
      true,
    );
    expect(after.goods).toEqual(before.goods);
    expect(after.actors).toEqual(before.actors);
    expect(after.kernel.history.slice(0, before.kernel.history.length)).toEqual(
      before.kernel.history,
    );
    expect(a.personalView(other)).toEqual(otherView);
    expect(v.geography.length).toBeGreaterThanOrEqual(
      Object.keys(before.evidence.people[0].cells).length,
    );
    expect(v.evidence.some((e) => e.subject.startsWith("cell:"))).toBe(false);
    expect(v.mapObservations).not.toEqual({});
    const b = PhysicalSimulation.restore(a.checkpoint());
    expect(b.personalView(actor)).toEqual(v);
    a.advanceTo(time(1));
    b.advanceTo(time(1));
    expect(b.causalHash()).toBe(a.causalHash());
  });
  it("stores a compact delivered map observation with dated cell versions and replaces provenance after new observed geometry", () => {
    const a = flatWorld(),
      actor = a.actorKeys()[0]!;
    a.enablePersonal(actor);
    const v = a.personalView(actor),
      c = v.geography[0]!;
    const before = JSON.parse(a.checkpoint()).body.evidence.people[0];
    expect(
      before.records.every((e: any) => !e.subject.startsWith("cell:")),
    ).toBe(true);
    a.diagnosticTerrain(c.cell, !c.passable, c.passable ? 0 : 1);
    expect(
      a.personalView(actor).geography.find((k) => k.cell === c.cell)!.version,
    ).toBe(c.version);
    a.diagnosticObserve(actor, true);
    const next = a
      .personalView(actor)
      .geography.find((k) => k.cell === c.cell)!;
    expect(next.version).toBe(c.version + 1);
    expect(next.provenance).not.toBe(c.provenance);
    const b = PhysicalSimulation.restore(a.checkpoint());
    expect(b.personalView(actor)).toEqual(a.personalView(actor));
  });
});
describe("declared priors and engineering computation", () => {
  it("Move has no selectable prior or CPU allowance; its search snapshots the declared personal prior", () => {
    const a = flatWorld(),
      t = task(a, [move()]);
    expect(() =>
      a.diagnosticSelect({
        ...t,
        steps: [{ ...move(), priorSpeed: 0.01 } as any],
      }),
    ).toThrow("Invalid personal route binding");
    expect(() =>
      a.diagnosticSelect({
        ...t,
        steps: [{ ...move(), effortEu: 9000 } as any],
      }),
    ).toThrow("Invalid personal route binding");
    a.diagnosticSelect(t);
    expect(execution(a).task.route.prior).toEqual(
      a.personalView(t.actor).traversalPrior,
    );
    expect(execution(a).task.route.effortAccount).toBeTruthy();
    expect(execution(a).task.route).not.toHaveProperty("computationEnd");
  });
  it("unseen realised terrain cannot change the exploratory frontier under the same declared prior", () => {
    const a = flatWorld(),
      b = editWorld(a, (s) => {
        for (let x = 17; x < 32; x++) {
          s.terrain.speed[x + 8 * 32] = 0.15;
          s.terrain.kind[x + 8 * 32] = 3;
        }
        s.terrain.version++;
      });
    const t = task(a, [move(2.55)]);
    b.enablePersonal(t.actor);
    a.diagnosticSelect(t);
    b.diagnosticSelect(t);
    while (a.resumePersonalRouting(1)) {}
    while (b.resumePersonalRouting(65536)) {}
    expect(execution(a)).toEqual(execution(b));
    expect(a.personalView(t.actor)).toEqual(b.personalView(t.actor));
  });
  it("a declared wrong prior changes expected costs without consulting the realised map", () => {
    const a = flatWorld(),
      actor = a.actorKeys()[0]!;
    a.enablePersonal(actor);
    const v = a.personalView(actor),
      e = new EvidenceService("prior", counters());
    e.register(actor);
    e.foundTraversalPrior(
      actor,
      {
        speedFactor: 0.2,
        uncertainty: 1,
        context: "declared wrong-prior culture",
      },
      0,
    );
    const prior = e.latest(actor, "prior:unseen-terrain", "speed-factor")!;
    const wrong = {
      speedFactor: prior.value as number,
      uncertainty: prior.uncertainty,
      version: prior.version,
      provenance: prior.provenance,
    };
    const c = counters(),
      one = beginPersonalSearch(
        v.profile,
        [],
        0,
        31,
        true,
        v.traversalPrior,
        c,
      ),
      two = beginPersonalSearch(v.profile, [], 0, 31, true, wrong, c);
    while (resumePersonalSearch(one, 4096, c) === "unresolved") {}
    while (resumePersonalSearch(two, 4096, c) === "unresolved") {}
    expect(two.nodes[31]!.g).toBeGreaterThan(one.nodes[31]!.g);
    expect(two.prior).toEqual(wrong);
  });
  it("caller causal allowance exhausts without destroying the frontier, independent of host slices", () => {
    const a = flatWorld(),
      actor = a.actorKeys()[0]!;
    a.enablePersonal(actor);
    const v = a.personalView(actor),
      c = counters();
    const wall = Array.from({ length: 192 }, (_, y) => ({
      ...v.geography[0]!,
      cell: 128 + y * 256,
      passable: false,
      speed: 0,
    }));
    const s = beginPersonalSearch(
        { ...v.profile, width: 256, height: 192 },
        wall,
        3 + 8 * 256,
        200 + 8 * 256,
        true,
        v.traversalPrior,
        c,
      ),
      t = JSON.parse(JSON.stringify(s));
    while (
      resumePersonalSearch(s, 1, c, 4096 - s.expansions) === "unresolved"
    ) {}
    expect(resumePersonalSearch(t, 65536, c, 4096)).toBe("deferred");
    expect(s).toEqual(t);
    expect(s.status).toBe("unresolved");
    expect(s.expansions).toBe(4096);
    const restored = JSON.parse(JSON.stringify(s));
    expect(resumePersonalSearch(restored, 1, c)).toBe("unresolved");
    expect(restored.expansions).toBe(4097);
    expect(restored).not.toHaveProperty("computationEnd");
    expect(Object.keys(restored.nodes).length).toBeGreaterThan(
      Object.keys(s.nodes).length,
    );
  });
});
describe("preauthorised bound repair interface", () => {
  it("changed known suffix keeps semantic identity, located progress and cumulative time/goods, including restore", () => {
    const a = flatWorld(),
      actor = a.actorKeys()[0]!;
    a.enablePersonal(actor);
    const v = a.personalView(actor),
      cache = v.places.find((e) => e.property === "own-local-stocks")!;
    const t = task(a, [
      {
        family: "Transfer",
        from: cache.subject,
        to: v.self.carried.subject,
        good: "food",
        quantity: 0.5,
        basis: "own-custody",
        duration: time(0.02),
      },
      move(2.55),
      attend(),
    ]);
    t.repairScope = {
      moveTargets: [{ x: 0.85, y: 0.85 }],
      bindings: { destination: ["known local alternative"] },
    };
    a.diagnosticSelect(t);
    a.advanceTo(time(0.022));
    a.diagnosticTaskInterrupt(actor);
    const before = execution(a),
      repair = {
        semanticKey: before.task.semanticKey,
        objective: t.objective,
        bindings: { destination: "known local alternative" },
        steps: [move(0.85), attend()],
        dependsOn: [],
      };
    const b = PhysicalSimulation.restore(a.checkpoint());
    a.diagnosticInstallRepair(actor, repair);
    b.diagnosticInstallRepair(actor, repair);
    expect(execution(a).budget).toEqual(before.budget);
    expect(execution(a).task.semanticKey).toBe(before.task.semanticKey);
    expect(execution(a).task.progress).toEqual(before.task.progress);
    expect(execution(a).task.cursor).toBe(1);
    expect(execution(a).task.bindingRevision).toBe(1);
    a.advanceTo(time(0.2));
    b.advanceTo(time(0.2));
    expect(execution(a).task.status).toBe("done");
    expect(execution(a).budget.spent.goods.food).toBe(0.5);
    expect(a.causalHash()).toBe(b.causalHash());
    expect(a.personalView(actor).self.carried.stocks.food).toBe(0.5);
    expect(() =>
      a.diagnosticSelect({ ...t, taskId: "renamed", steps: [attend()] }),
    ).toThrow("Same-objective");
  });
  it("rejects new purpose, unknown target and unauthorised suffix without creating authority", () => {
    const a = flatWorld(),
      t = task(a, [move(), attend()]);
    t.repairScope = { moveTargets: [{ x: 2.95, y: 0.85 }], bindings: {} };
    a.diagnosticSelect(t);
    a.advanceTo(time(0.001));
    a.diagnosticTaskInterrupt(t.actor);
    const before = a.checkpoint(),
      r = {
        semanticKey: execution(a).task.semanticKey,
        objective: t.objective,
        bindings: {},
        steps: [move(2.95), attend()],
        dependsOn: [],
      };
    expect(() =>
      a.diagnosticInstallRepair(t.actor, { ...r, objective: "new objective" }),
    ).toThrow("semantic purpose");
    expect(() => a.diagnosticInstallRepair(t.actor, r)).toThrow(
      "authorised known place",
    );
    expect(a.checkpoint()).toBe(before);
  });
});
