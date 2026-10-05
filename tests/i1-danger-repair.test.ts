import { it, expect } from "vitest";
import { cognition } from "./exploration-fixture";
import { flatWorld, task, time, execution } from "./pack0b-fixture";
import { boundedRepair } from "../src/mind/repair";
import { PhysicalSimulation } from "../src/runners/simulation";
import { contestProbability, injuryProbability } from "../src/laws/engagement";
it("an observed immediate threat uses the same arbiter with at most 80 EU and coalesces unchanged danger", () => {
  const f = cognition({ trial: false, inquiry: false });
  f.e.foundMethods(f.actor, ["escape", "defend"], 0);
  f.e.fact(
    f.actor,
    "animal",
    "threat",
    { force: 1.6, point: f.self.location, active: true } as any,
    0,
    "direct local animal",
  );
  const trace = f.mind.safety(f.review(), { task: null, budget: null });
  expect(trace).not.toBeNull();
  expect(trace!.effort.kind).toBe("safety");
  expect(trace!.effort.allowance).toBe(80);
  expect(trace!.effort.spent).toBeLessThanOrEqual(80);
  expect(trace!.selected?.method).toBe("defend");
  expect(f.mind.safety(f.review(), { task: null, budget: null })).toBeNull();
});
it("an unseen predator causes no safety decision", () => {
  const f = cognition({ trial: false, inquiry: false });
  f.e.foundMethods(f.actor, ["escape", "defend"], 0);
  expect(f.mind.safety(f.review(), { task: null, budget: null })).toBeNull();
});
it("minimal contest is directional and injury depends on actual paid exposure", () => {
  expect(contestProbability(1, 1)).toBe(0.5);
  expect(contestProbability(2, 1)).toBe(0.8);
  expect(injuryProbability(0.5, true, 0, 0.04)).toBeGreaterThan(
    injuryProbability(0.5, false, 0, 0.04),
  );
  expect(injuryProbability(0.5, false, 0, 0.02)).toBeLessThan(
    injuryProbability(0.5, false, 0, 0.04),
  );
});
it("local physical danger, paid defence and suspended purpose survive restore", () => {
  const s = flatWorld("danger-resume"),
    a = s.actorKeys()[0]!;
  s.diagnosticFoundAdult(a);
  const t = task(
    s,
    [{ family: "Recover", law: "rest", mode: "rest", duration: time(0.2) }],
    "prior-purpose",
  );
  t.method = "rest";
  const original = s.diagnosticSelect(t);
  s.enableAutonomous(a, { p: 0, rT: 0, aT: 0 });
  s.diagnosticPredator(s.personalReview(a).self.location);
  s.diagnosticObserve(a, true);
  s.advanceTo(0);
  const trace = s.decisionPanel(a)!.traces.at(-1)!;
  expect(trace.causes).toContain("danger");
  expect(["escape", "defend"]).toContain(trace.selected?.method);
  s.advanceTo(time(0.02));
  const r = PhysicalSimulation.restore(s.checkpoint());
  s.advanceTo(time(0.05));
  r.advanceTo(time(0.05));
  expect(r.causalHash()).toBe(s.causalHash());
  expect(execution(r).task.semanticKey).toBe(original.semanticKey);
  expect(execution(r).task.method).toBe("rest");
  expect(execution(r).budget.spent.time).toBeGreaterThan(0);
  expect(r.snapshot().reconciliation.ok).toBe(true);
});
it("bounded route repair rejects spending increases and fixed-operation changes", () => {
  const s = flatWorld("repair"),
    a = s.actorKeys()[0]!;
  s.diagnosticFoundAdult(a);
  const t = task(s, [{ family: "Recover", law: "rest", duration: time(0.1) }]);
  t.method = "rest";
  s.diagnosticSelect(t);
  s.diagnosticTaskInterrupt(a);
  const x = execution(s),
    result = boundedRepair(s.personalReview(a), x.task, x.budget, s.counters);
  expect(result.repair).toBeNull();
  expect(result.effort.spent).toBeLessThanOrEqual(40);
  expect(result.reason).toContain("ordinary review");
});
it("physical defence interrupts located manufacture, resumes its paid purpose and completes the same work", () => {
  let s = flatWorld("defended-work");
  s = __edit(s, (b) => {
    b.config.evidence.foundingMethods =
      b.config.evidence.foundingMethods.filter((m: string) => m !== "escape");
    b.configurationHash = __digest(b.config);
  });
  const a = s.actorKeys()[0]!;
  s.diagnosticFoundAdult(a);
  const held = s.snapshot().actors[0]!.container;
  for (const good of ["wood", "stone"])
    s.diagnosticGoods({
      kind: "source",
      source: "initial-endowment",
      to: held,
      good,
      quantity: 1,
    });
  const t = task(
    s,
    [{ family: "Work", law: "make-work-tool", duration: time(0.3) }],
    "defended-making",
  );
  t.method = "make-work-tool";
  t.authorised.goods = { wood: 1, stone: 1 };
  const original = s.diagnosticSelect(t);
  s.enableAutonomous(a, { p: 0, rT: 0, aT: 0 });
  s.advanceTo(time(0.01));
  s.diagnosticPredator(s.personalReview(a).self.location);
  s.diagnosticObserve(a, true);
  s.advanceTo(time(0.01));
  expect(s.decisionPanel(a)!.traces.at(-1)!.selected?.method).toBe("defend");
  const before = s.materialSnapshot().work[0]!;
  const r = PhysicalSimulation.restore(s.checkpoint());
  s.advanceTo(time(0.09));
  r.advanceTo(time(0.09));
  expect(r.causalHash()).toBe(s.causalHash());
  expect(execution(s).task.semanticKey).toBe(original.semanticKey);
  s.advanceTo(time(0.4));
  expect(s.materialSnapshot().work[0]!.qualityDraw).toBe(before.qualityDraw);
  expect(s.materialSnapshot().work[0]!.complete).toBe(true);
  expect(s.snapshot().reconciliation.ok).toBe(true);
});
it("a distant unperceived physical predator leaves personal decisions and wakes unchanged", () => {
  const a = flatWorld("hidden-animal"),
    actor = a.actorKeys()[0]!;
  a.diagnosticFoundAdult(actor);
  a.enableAutonomous(actor, { p: 0, rT: 0, aT: 0 });
  a.requestReview(actor, "periodic");
  const b = PhysicalSimulation.restore(a.checkpoint());
  b.diagnosticPredator({ x: 2.75, y: 1.55 });
  const wakes = [
    a.counters.reviewWakesRequested,
    b.counters.reviewWakesRequested,
  ];
  a.advanceTo(time(0.1));
  b.advanceTo(time(0.1));
  expect(a.decisionPanel(actor)).toEqual(b.decisionPanel(actor));
  expect(a.personalReview(actor).self).toEqual(b.personalReview(actor).self);
  expect(a.counters.reviewWakesRequested - wakes[0]!).toBe(
    b.counters.reviewWakesRequested - wakes[1]!,
  );
});
it("a preauthorised own input substitution preserves semantic spend and executes in the same runtime", () => {
  const s = flatWorld("equivalent-input"),
    a = s.actorKeys()[0]!;
  s.diagnosticFoundAdult(a);
  const held = s.snapshot().actors[0]!.container;
  s.diagnosticGoods({
    kind: "source",
    source: "initial-endowment",
    to: held,
    good: "food",
    quantity: 1,
  });
  const own = s.personalReview(a).self.carried.subject,
    cache = s
      .personalReview(a)
      .places("owned-good:food", 4)
      .entries.find((e) => e.subject !== own)!.subject;
  const t = task(
    s,
    [
      {
        family: "Transfer",
        from: own,
        to: own,
        good: "food",
        quantity: 0.8,
        basis: "own-custody",
        use: "consume",
        duration: time(0.2),
      },
    ],
    "equivalent-input",
  );
  t.method = "consume";
  t.repairScope = { moveTargets: [], bindings: { "input:0": [cache] } };
  const original = s.diagnosticSelect(t);
  s.advanceTo(time(0.01));
  s.diagnosticTaskInterrupt(a);
  const x = execution(s);
  const full = { ...x.task, envelope: { purpose: x.task.objective } } as any;
  const bound = boundedRepair(s.personalReview(a), full, x.budget, s.counters);
  expect(bound.repair).not.toBeNull();
  expect(bound.effort.spent).toBeLessThanOrEqual(40);
  s.diagnosticInstallRepair(a, bound.repair!);
  expect(execution(s).task.semanticKey).toBe(original.semanticKey);
  expect(execution(s).budget.spent.time).toBe(x.budget.spent.time);
  s.advanceTo(time(0.25));
  expect(execution(s).budget.spent.goods.food).toBeGreaterThan(0);
  expect(s.snapshot().reconciliation.ok).toBe(true);
});
import { editWorld as __edit } from "./pack0b-fixture";
import { digest as __digest } from "../src/kernel/canonical";
it("a same-target detour spends at most 40 EU and retains time already paid", () => {
  const s = flatWorld("detour"),
    a = s.actorKeys()[0]!;
  s.diagnosticFoundAdult(a);
  s.diagnosticObserve(a, true);
  const target = { x: 0.65, y: 0.85 };
  const t = task(s, [{ family: "Move", target, exploratory: false }], "detour");
  t.method = "escape";
  t.repairScope = { moveTargets: [target], bindings: {} };
  const original = s.diagnosticSelect(t);
  s.advanceTo(time(0.001));
  s.diagnosticTaskInterrupt(a);
  s.diagnosticTerrain(5 + 8 * 32, false, 1);
  s.diagnosticObserve(a, true);
  const x = execution(s),
    result = boundedRepair(
      s.personalReview(a),
      { ...x.task, envelope: { purpose: x.task.objective } } as any,
      x.budget,
      s.counters,
    );
  expect(result.repair, result.reason).not.toBeNull();
  expect(result.effort.spent).toBeLessThanOrEqual(40);
  expect(result.repair!.preparedRoutes![0]!.path).not.toContain(5 + 8 * 32);
  // Register the exact already-spent account in the diagnostic adapter; this
  // supplies no fresh route allowance and selects no new task or objective.
  s.diagnosticRouteEffort(a, "repair", result.effort.spent);
  s.diagnosticInstallRepair(a, result.repair!);
  expect(execution(s).task.semanticKey).toBe(original.semanticKey);
  expect(execution(s).budget.spent.time).toBe(x.budget.spent.time);
  s.advanceTo(time(0.05));
  expect(execution(s).task.status).toBe("done");
  expect(s.snapshot().reconciliation.ok).toBe(true);
});
