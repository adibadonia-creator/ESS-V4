import { describe, it, expect } from "vitest";
import {
  flatWorld,
  editWorld,
  task,
  move,
  attend,
  execution,
  time,
  QUANTA,
  beliefKey,
} from "./pack0b-fixture";
import { PhysicalSimulation } from "../src/world/simulation";
import { canonical, digest } from "../src/kernel/canonical";
import { EvidenceService } from "../src/evidence/service";
import { counters } from "../src/kernel/counters";
import {
  beginPersonalSearch,
  resumePersonalSearch,
} from "../src/runtime/routing";
import {
  visible,
  visibleTerrain,
  entryFraction,
} from "../src/world/perception";
import { generateTerrain } from "../src/world/terrain";
import { resolveConfig } from "../src/content/profile";

describe("Pack 0B information boundary", () => {
  it("paired unseen blockage, stock and irrelevant hidden entity location remain personally identical until sight", () => {
    const a = flatWorld(),
      b = editWorld(a, (s) => {
        s.terrain.passable[20 + 8 * 32] = 0;
        s.terrain.speed[20 + 8 * 32] = 0;
        s.terrain.version++;
        s.goods.containers.find(
          (c: any) => c.kind === "site",
        ).location.point.x = 2.65;
      });
    const actor = a.actorKeys()[0]!;
    a.enablePersonal(actor);
    b.enablePersonal(actor);
    expect(a.personalView(actor)).toEqual(b.personalView(actor));
    a.diagnosticSelect(task(a, [move(), attend()]));
    b.diagnosticSelect(task(b, [move(), attend()]));
    while (a.resumePersonalRouting(1)) {}
    while (b.resumePersonalRouting(4096)) {}
    expect(execution(a)).toEqual(execution(b));
    a.advanceTo(time(0.002));
    b.advanceTo(time(0.002));
    expect(a.personalLens(actor)).toEqual(b.personalLens(actor));
    a.advanceTo(time(0.1));
    b.advanceTo(time(0.1));
    expect(a.personalView(actor)).not.toEqual(b.personalView(actor));
    expect(
      b
        .personalView(actor)
        .geography.some((c) => c.cell === 20 + 8 * 32 && !c.passable),
    ).toBe(true);
  });
  it("remote hidden depletion and terrain changes never change personal versions or stale a binding", () => {
    const a = flatWorld(),
      actor = a.actorKeys()[0]!;
    a.enablePersonal(actor);
    const view = a.personalView(actor),
      c = view.geography[0]!,
      key = beliefKey("cell:" + c.cell, "geometry");
    const t = task(a, [move(0.75), attend()]);
    t.dependsOn = [{ key, version: c.version }];
    a.diagnosticSelect(t);
    const b = editWorld(a, (s) => {
      s.terrain.passable[30 + 16 * 32] = 0;
      s.terrain.speed[30 + 16 * 32] = 0;
      s.terrain.version++;
      const site = s.goods.containers.find((c: any) => c.kind === "site");
      site.stocks.food = 0;
      const tx = s.goods.transactions.find(
        (t: any) => t.request.to === site.key,
      );
      tx.request.quantity = 0;
      tx.amount = 0;
    });
    expect(a.personalLens(actor)).toEqual(b.personalLens(actor));
    a.advanceTo(time(0.2));
    b.advanceTo(time(0.2));
    expect(execution(a)).toEqual(execution(b));
    expect(execution(b).task.status).toBe("done");
  });
  it("unknown differs from observed zero; pure reads leave causal hash, history and evidence unchanged", () => {
    const a = flatWorld(),
      actor = a.actorKeys()[0]!;
    a.enablePersonal(actor);
    const b = editWorld(a, (s) => {
      const site = s.goods.containers.find((c: any) => c.kind === "site");
      site.location.point = { x: 0.55, y: 0.85 };
      site.stocks.food = 0;
      const tx = s.goods.transactions.find(
        (t: any) => t.request.to === site.key,
      );
      tx.request.quantity = 0;
      tx.amount = 0;
    });
    expect(
      a
        .personalView(actor)
        .places.some(
          (e) =>
            e.property === "stock:food" &&
            a
              .personalView(actor)
              .places.some(
                (k) =>
                  k.subject === e.subject &&
                  k.property === "kind" &&
                  k.value === "site",
              ),
        ),
    ).toBe(false);
    b.diagnosticObserve(actor, true);
    expect(
      b
        .personalView(actor)
        .places.some((e) => e.property === "stock:food" && e.value === 0),
    ).toBe(true);
    const cp = b.checkpoint(),
      hash = b.causalHash();
    for (let i = 0; i < 5; i++) b.personalLens(actor);
    expect(b.checkpoint()).toBe(cp);
    expect(b.causalHash()).toBe(hash);
    const text = JSON.stringify(b.personalView(actor));
    expect(text).not.toContain("historyHash");
    expect(text).not.toContain("queue");
    expect(text).not.toContain("custodian");
  });
  it("versioned evidence deduplicates one provenance; unrelated facts do not stale task", () => {
    const counts = counters(),
      e = new EvidenceService("seed", counts);
    e.register("owner");
    e.fact("owner", "place", "stock", 0, 0, "observation");
    e.fact("owner", "place", "stock", 0, 0, "observation");
    expect(counts.evidenceUpdates).toBe(1);
    expect(e.version("owner", beliefKey("place", "stock"))).toBe(1);
    e.fact("owner", "place", "stock", 1, 100, "observation");
    expect(e.version("owner", beliefKey("place", "stock"))).toBe(2);
    const a = flatWorld(),
      actor = a.actorKeys()[0]!;
    a.enablePersonal(actor);
    const t = task(a, [attend()]);
    t.dependsOn = [{ key: beliefKey("method:contact", "known"), version: 1 }];
    a.diagnosticSelect(t);
    a.diagnosticObserve(actor, true);
    a.advanceTo(time(0.1));
    expect(execution(a).task.status).toBe("done");
  });
  it("after a relevant local observation the task requires repair, never selects another objective", () => {
    const a = flatWorld(),
      actor = a.actorKeys()[0]!;
    a.enablePersonal(actor);
    const c = a
      .personalView(actor)
      .geography.find((c) => c.cell === 5 + 8 * 32)!;
    const t = task(a, [attend(), attend()]);
    t.dependsOn = [
      { key: beliefKey("cell:" + c.cell, "geometry"), version: c.version },
    ];
    a.diagnosticSelect(t);
    a.diagnosticTerrain(c.cell, false, 0);
    expect(execution(a).task.status).toBe("running");
    a.diagnosticObserve(actor, true);
    a.advanceTo(time(0.1));
    expect(execution(a).task.status).toBe("blocked");
    expect(execution(a).task.cursor).toBe(1);
  });
});
describe("perception and personal routing", () => {
  it("sight, occlusion, qualified footprints and exact swept entry are physical", () => {
    const c = resolveConfig({ width: 32, height: 18 }),
      t = generateTerrain("sight", c);
    t.opaque.fill(0);
    t.passable.fill(1);
    const p = { x: 0.35, y: 0.85 };
    expect(visible(t, p, { x: 0.85, y: 0.85 }, 0.6)).toBe(true);
    expect(visible(t, p, { x: 1.05, y: 0.85 }, 0.6)).toBe(false);
    t.opaque[5 + 8 * 32] = 1;
    expect(visible(t, p, { x: 0.55, y: 0.85 }, 0.6)).toBe(true);
    expect(visible(t, p, { x: 0.65, y: 0.85 }, 0.6)).toBe(false);
    expect(
      visibleTerrain(t, p, 0.6).every(
        (c) => c.detection >= 0.2 && c.detection <= 0.95,
      ),
    ).toBe(true);
    expect(
      entryFraction({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 0.1 }, 0.11),
    ).toBeGreaterThan(0);
  });
  it("routine attention stops at twelve per SD, directed observations bypass cap", () => {
    const a = flatWorld(),
      actor = a.actorKeys()[0]!;
    a.enablePersonal(actor);
    for (let i = 0; i < 20; i++) a.diagnosticObserve(actor, false);
    const cp = JSON.parse(a.checkpoint()).body;
    expect(cp.evidence.people[0].routine.count).toBeLessThanOrEqual(12);
    const n = a.counters.evidenceUpdates;
    a.diagnosticObserve(actor, true);
    expect(a.counters.evidenceUpdates).toBeGreaterThanOrEqual(n);
    const e = new EvidenceService("seed", counters());
    e.register("x");
    const packet = {
      terrain: [],
      facts: [
        {
          reference: "hidden-key",
          kind: "site" as const,
          position: { x: 0, y: 0 },
          properties: [],
          detection: 1,
        },
      ],
      footprint: { cells: [], duration: 0 },
    };
    for (let i = 0; i < 20; i++) e.observe("x", packet, i, "routine");
    expect(e.state.people[0]!.routine.count).toBe(12);
    e.observe("x", packet, 21, "directed", true);
    expect(e.state.people[0]!.records.some((r) => r.observedAt === 21)).toBe(
      true,
    );
  });
  it("known routes use only seen passable cells, exploratory paths use declared priors; small slices do not pass time", () => {
    const a = flatWorld(),
      actor = a.actorKeys()[0]!;
    a.enablePersonal(actor);
    const v = a.personalView(actor),
      counts = counters(),
      start = 3 + 8 * 32,
      goal = 25 + 8 * 32;
    const known = beginPersonalSearch(
      v.profile,
      v.geography,
      start,
      goal,
      false,
      1,
      40000,
      counts,
    );
    while (resumePersonalSearch(known, 1, counts) === "unresolved") {}
    expect(known.status).toBe("unreachable");
    const exploratory = beginPersonalSearch(
      v.profile,
      v.geography,
      start,
      goal,
      true,
      1,
      40000,
      counts,
    );
    expect(resumePersonalSearch(exploratory, 1, counts)).toBe("unresolved");
    expect(Object.keys(exploratory.nodes).length).toBeLessThan(12);
    const restored = JSON.parse(JSON.stringify(exploratory));
    while (resumePersonalSearch(exploratory, 1, counts) === "unresolved") {}
    while (resumePersonalSearch(restored, 9999, counts) === "unresolved") {}
    expect(restored).toEqual(exploratory);
    const deferred = beginPersonalSearch(
      v.profile,
      v.geography,
      start,
      goal,
      true,
      1,
      1,
      counts,
    );
    expect(resumePersonalSearch(deferred, 99, counts)).toBe("deferred");
    expect(deferred.status).toBe("unresolved");
  });
  it("selected route uses zero truth searches; hidden barrier is discovered locally and stops paid movement", () => {
    const a = editWorld(flatWorld(), (s) => {
        s.terrain.passable[16 + 8 * 32] = 0;
        s.terrain.speed[16 + 8 * 32] = 0;
        s.terrain.version++;
      }),
      t = task(a, [move(2.55), attend()]);
    a.diagnosticSelect(t);
    const truth = a.counters.routeSearches;
    a.advanceTo(time(0.2));
    expect(a.counters.routeSearches).toBe(truth);
    expect(execution(a).task.status).toBe("blocked");
    expect(execution(a).task.failure).toBe("route blocked here");
    expect(a.personalView(t.actor).self.location.x).toBeLessThan(1.65);
    expect(execution(a).budget.spent.time).toBeGreaterThan(0);
    expect(execution(a).task.progress.length).toBeGreaterThan(0);
  });
  it("a visible site crossed between observer frames generates dated evidence", () => {
    const a = flatWorld(),
      t = task(a, [move(2.45), attend()]);
    a.diagnosticSelect(t);
    a.advanceTo(time(0.15));
    const evidence = a
      .personalView(t.actor)
      .places.filter(
        (e) =>
          e.property === "location" &&
          typeof e.value === "object" &&
          (e.value as any).x === 1.65,
      );
    expect(evidence.length).toBeGreaterThan(0);
    expect(Math.min(...evidence.map((e) => e.observedAt))).toBeLessThan(
      time(0.03),
    );
    expect(a.counters.perceptionCandidateChecks).toBeGreaterThan(0);
  });
});
describe("generic task lifecycle, time, reservations and persistence", () => {
  it("Move → Attend Continue executes without deliberation across closure/day boundary", () => {
    const a = flatWorld(),
      t = task(a, [move(0.85), attend(time(1.5)), attend()]);
    a.diagnosticSelect(t);
    a.advanceTo(time(2));
    const e = execution(a);
    expect(e.task.status).toBe("done");
    expect(e.task.cursor).toBe(3);
    expect(a.counters.continueTransitions).toBe(2);
    expect(a.counters.autonomousDeliberations).toBe(0);
    expect(
      Object.values(e.activity.totals).every(
        (v: any) =>
          (Object.values(v) as number[]).reduce((a, b) => a + b, 0) <= QUANTA,
      ),
    ).toBe(true);
  });
  it.each(["route", "move", "between", "suspended", "blocked", "reservation"])(
    "exact continuation checkpoint during %s",
    (stage) => {
      let a = flatWorld();
      const actor = a.actorKeys()[0]!;
      a.enablePersonal(actor);
      let steps = [move(), attend()];
      if (stage === "reservation") steps = [attend(time(0.5)), attend()];
      if (stage === "blocked")
        a = editWorld(a, (s) => {
          s.terrain.passable[16 + 8 * 32] = 0;
          s.terrain.speed[16 + 8 * 32] = 0;
          s.terrain.version++;
        });
      const t = task(a, steps);
      if (stage === "reservation") {
        const v = a.personalView(actor),
          cache = v.places.find((e) => e.property === "own-local-stocks")!;
        t.reserve = [
          {
            subject: cache.subject,
            good: "food",
            quantity: 0.5,
            expires: time(2),
          },
        ];
      }
      a.diagnosticSelect(t);
      if (stage === "route") a.resumePersonalRouting(1);
      if (stage === "move" || stage === "suspended") a.advanceTo(time(0.001));
      if (stage === "suspended") a.diagnosticTaskInterrupt(actor);
      if (stage === "between") a.advanceTo(time(0.023));
      if (stage === "blocked") a.advanceTo(time(0.05));
      const checkpoint = a.checkpoint(),
        b = PhysicalSimulation.restore(checkpoint);
      expect(b.checkpoint()).toBe(checkpoint);
      if (stage === "suspended") {
        a.diagnosticTaskResume(actor);
        b.diagnosticTaskResume(actor);
      }
      a.advanceTo(time(1));
      for (let x = time(0.1); x < time(1); x += time(0.1))
        if (x > b.kernel.state.now) b.advanceTo(x);
      b.advanceTo(time(1));
      expect(b.causalHash()).toBe(a.causalHash());
      expect(b.kernel.state.history).toEqual(a.kernel.state.history);
    },
  );
  it("interrupt settles prefix once, resumes remaining paid Attend and never refunds or overlaps time", () => {
    const a = flatWorld(),
      t = task(a, [attend(time(0.5)), attend(time(0.1))]);
    a.diagnosticSelect(t);
    a.advanceTo(time(0.2));
    a.diagnosticTaskInterrupt(t.actor);
    const paid = execution(a).budget.spent.time;
    expect(paid).toBe(time(0.2));
    a.diagnosticTaskInterrupt(t.actor);
    expect(execution(a).budget.spent.time).toBe(paid);
    a.advanceTo(time(0.4));
    a.diagnosticTaskResume(t.actor);
    a.advanceTo(time(1));
    expect(execution(a).budget.spent.time).toBe(time(0.5) + time(0.1));
    expect(execution(a).task.status).toBe("done");
  });
  it("time/goods budget cannot renew under a new task id; unsupported laws fail explicitly", () => {
    const a = flatWorld(),
      t = task(a, [attend(time(0.1))], "same", time(0.15));
    a.diagnosticSelect(t);
    a.advanceTo(time(0.1));
    const t2 = { ...t, taskId: "new-id", intentionId: "new-intention" };
    a.diagnosticSelect(t2);
    expect(execution(a).task.status).toBe("done");
    expect(execution(a).budget.spent.time).toBe(time(0.1));
    a.diagnosticTaskAbandon(t.actor);
    expect(() =>
      a.diagnosticSelect({
        ...t2,
        taskId: "renew",
        authorised: { time: time(1), goods: {} },
      }),
    ).toThrow("Semantic retry");
    const b = flatWorld(),
      unsupported = task(b, [
        { family: "Work", law: "not present", duration: time(0.1) },
      ]);
    b.diagnosticSelect(unsupported);
    expect(execution(b).task.failure).toBe("not-yet-implemented law: Work");
  });
  it("own Transfer uses existing backing and custody; abandonment releases only unused reservation", () => {
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
      attend(time(1)),
    ]);
    t.method = "exchange";
    t.reserve = [
      { subject: cache.subject, good: "food", quantity: 1, expires: time(3) },
    ];
    a.diagnosticSelect(t);
    a.advanceTo(time(0.1));
    expect(a.personalView(actor).self.carried.stocks.food).toBe(0.5);
    expect(
      a
        .personalView(actor)
        .evidence.some(
          (e) =>
            e.subject === v.self.carried.subject &&
            e.property === "stocks" &&
            (e.value as any).food === 0.5,
        ),
    ).toBe(true);
    expect(execution(a).budget.spent.goods.food).toBe(0.5);
    expect(a.snapshot().reconciliation.ok).toBe(true);
    a.diagnosticTaskAbandon(actor);
    expect(a.personalView(actor).self.reservations[0]!.status).toBe("released");
    expect(a.personalView(actor).self.carried.stocks.food).toBe(0.5);
    expect(execution(a).budget.spent.time).toBe(time(0.1));
  });
  it("movement deadline stops at budget boundary; earlier checkpoint schema rejected explicitly", () => {
    const a = flatWorld(),
      t = task(a, [move(2.55)], "short", time(0.002));
    a.diagnosticSelect(t);
    a.advanceTo(time(0.2));
    expect(execution(a).task.status).toBe("blocked");
    expect(execution(a).budget.spent.time).toBe(t.authorised.time);
    expect(a.personalView(t.actor).self.location.x).toBeLessThan(2.55);
    const cp = JSON.parse(a.checkpoint());
    cp.body.versions.schema = 2;
    expect(() =>
      PhysicalSimulation.restore(
        canonical({ checksum: digest(cp.body), body: cp.body }),
      ),
    ).toThrow("Incompatible checkpoint");
  });
  it("engineering route slice and observer calls do not change causal digest", () => {
    const a = flatWorld(),
      b = flatWorld();
    const t = task(a, [move(), attend()]);
    b.enablePersonal(t.actor);
    a.diagnosticSelect(t);
    b.diagnosticSelect(t);
    while (a.resumePersonalRouting(1)) {}
    while (b.resumePersonalRouting(65536)) {}
    expect(a.kernel.state.now).toBe(0);
    expect(a.causalHash()).toBe(b.causalHash());
    a.advanceTo(time(0.2));
    for (let q = 1; q < time(0.2); q += 10003) {
      b.advanceTo(q);
      b.personalLens(t.actor);
    }
    b.advanceTo(time(0.2));
    expect(a.causalHash()).toBe(b.causalHash());
    expect(a.kernel.state.historyHash).toBe(b.kernel.state.historyHash);
  });
});
describe("additional Pack0B adversaries", () => {
  it("an occluded hidden site does not create a personal observation or change routine attention", () => {
    let a = editWorld(flatWorld(), (s) => {
      for (let x = 1; x < 31; x++) s.terrain.opaque[x + 10 * 32] = 1;
      s.goods.containers.find((c: any) => c.kind === "site").location.point = {
        x: 1.15,
        y: 1.35,
      };
    });
    const b = editWorld(a, (s) => {
      s.goods.containers.find((c: any) => c.kind === "site").location.point = {
        x: 1.75,
        y: 1.35,
      };
    });
    const t = task(a, [move(2.35), attend()]);
    b.enablePersonal(t.actor);
    a.diagnosticSelect(t);
    b.diagnosticSelect(t);
    a.advanceTo(time(0.025));
    b.advanceTo(time(0.025));
    expect(a.personalLens(t.actor)).toEqual(b.personalLens(t.actor));
    expect(JSON.parse(a.checkpoint()).body.evidence.people[0].routine).toEqual(
      JSON.parse(b.checkpoint()).body.evidence.people[0].routine,
    );
  });
  it("established routing uses resumable personal regional guidance and survives a coarse frontier checkpoint", () => {
    const a = flatWorld(),
      t = task(a, [move(0.85, 0.85, false), attend()]);
    a.diagnosticSelect(t);
    a.resumePersonalRouting(1);
    expect(execution(a).task.route.coarse.done).toBe(false);
    const b = PhysicalSimulation.restore(a.checkpoint());
    a.advanceTo(time(0.1));
    b.advanceTo(time(0.1));
    expect(a.causalHash()).toBe(b.causalHash());
    expect(execution(a).task.status).toBe("done");
    expect(a.counters.personalRouteRegionExpansions).toBeGreaterThan(0);
    expect(a.counters.routeSearches).toBe(0);
  });
  it("renaming a diagnostic task/purpose label cannot replenish the canonical semantic budget or replay completed progress", () => {
    const a = flatWorld(),
      t = task(a, [attend(time(0.05))]);
    a.diagnosticSelect(t);
    a.advanceTo(time(0.1));
    const before = execution(a).budget.spent.time;
    a.diagnosticSelect({
      ...t,
      taskId: "new-task",
      intentionId: "renamed-intention",
      semanticKey: "renamed-label",
    });
    a.advanceTo(time(0.2));
    expect(execution(a).budget.spent.time).toBe(before);
    expect(execution(a).task.status).toBe("done");
  });
  it("corrupt evidence versions, double-paid prefixes and budget resets are rejected on restore", () => {
    const a = flatWorld(),
      t = task(a, [attend(time(0.02))]);
    a.diagnosticSelect(t);
    a.advanceTo(time(0.1));
    for (const alter of [
      (s: any) => {
        s.evidence.people[0].records[0].version++;
      },
      (s: any) => {
        s.runtime.activity[0].prefixes.push(s.runtime.activity[0].prefixes[0]);
      },
      (s: any) => {
        Object.values(s.runtime.budgets).forEach(
          (b: any) => (b.spent.time = 0),
        );
      },
    ])
      expect(() => editWorld(a, alter)).toThrow();
  });
  it("a task cannot take another person’s goods or reserve a hoped-for remote harvest", () => {
    const a = flatWorld("access", 2),
      actor = a.actorKeys()[0]!,
      other = a.actorKeys()[1]!;
    a.enablePersonal(actor);
    a.diagnosticObserve(actor, true);
    const truth = a.snapshot(),
      otherCache = truth.containers.find(
        (c) => c.kind === "cache" && c.custodian === other,
      )!;
    const view = a.personalView(actor),
      otherSeen = view.places.find(
        (e) =>
          e.property === "location" &&
          (e.value as any).x === otherCache.position.x &&
          (e.value as any).y === otherCache.position.y &&
          e.subject !==
            view.places.find((e) => e.property === "own-local-stocks")!.subject,
      )!;
    const t = task(a, [
      {
        family: "Transfer",
        duration: time(0.02),
        from: otherSeen.subject,
        to: view.self.carried.subject,
        good: "food",
        quantity: 0.5,
        basis: "own-custody",
      },
    ]);
    a.diagnosticSelect(t);
    a.advanceTo(time(0.1));
    expect(execution(a).task.failure).toBe("own custody not authorised");
    expect(a.personalView(actor).self.carried.stocks.food ?? 0).toBe(0);
    expect(a.snapshot().reconciliation.ok).toBe(true);
  });
});

describe("selected binding validation", () => {
  it("exhausting time exactly at a Move prefix boundary blocks before another prefix is launched", () => {
    const probe = flatWorld();
    probe.diagnosticSelect(task(probe, [move()]));
    while (probe.resumePersonalRouting(65536)) {}
    const exactBudget = execution(probe).task.active.end;
    const a = flatWorld(),
      t = task(a, [move()], "exact-budget", exactBudget);
    a.diagnosticSelect(t);
    const b = PhysicalSimulation.restore(a.checkpoint());
    a.advanceTo(time(0.2));
    b.advanceTo(time(0.2));
    expect(execution(a).task.status).toBe("blocked");
    expect(execution(a).task.failure).toBe("authorised time exhausted");
    expect(execution(a).budget.spent.time).toBe(exactBudget);
    expect(a.causalHash()).toBe(b.causalHash());
  });
  it("invalid Move binding leaves reservations, budgets and causal history unchanged", () => {
    const a = flatWorld(),
      t = task(a, [move()]);
    const before = a.checkpoint();
    t.steps[0] = { ...move(), target: { x: NaN, y: 0.85 } };
    expect(() => a.diagnosticSelect(t)).toThrow(
      "Invalid personal route binding",
    );
    expect(a.checkpoint()).toBe(before);
  });
});
