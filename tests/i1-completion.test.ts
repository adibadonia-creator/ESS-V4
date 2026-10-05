import { it, expect } from "vitest";
import { flatWorld, editWorld, task, time, execution } from "./pack0b-fixture";
import { PhysicalSimulation } from "../src/runners/simulation";
import { resolveConfig } from "../src/content/profile";
import { digest } from "../src/kernel/canonical";
import { ProjectFrontier } from "../src/mind/projects";
import { createMaterialFixture } from "../src/runners/materialFixture";
const adult = {
  capability: { B: 1.5, A: 1, C: 1, P: 1, displayPotential: 1, efficiency: 1 },
  mastery: { Field: 0.5, Fight: 0.5, Make: 0.5, Organise: 0.5, Social: 0.5 },
  initial: { condition: 1, fatigue: 0.1, enjoyment: 0.95 },
};
it("a 13-stage project autonomously executes all paid dependencies across reviews and active restore", () => {
  let s = flatWorld("physical-deep");
  const recipes = Array.from({ length: 13 }, (_, i) => ({
    id: `transform-${i}`,
    inputs: i < 12 ? { [`part-${i + 1}`]: 1 } : {},
    work: 0.001,
    output: i === 0 ? "fish" : `part-${i}`,
    bulk: i === 0 ? 1 : 0.01,
    effect: { kind: "none", scope: "", coefficient: 0 },
  }));
  const methods = recipes.map((r) => ({
    id: r.id,
    effects: [`have:${r.output}`],
    inputs: Object.keys(r.inputs).map((g) => `have:${g}`),
    schema: {
      target: "self",
      operation: "make",
      law: r.id,
      good: r.output,
      prerequisites: Object.entries(r.inputs).map(([good, quantity]) => ({
        effect: `have:${good}`,
        good,
        quantity,
        consumes: true,
      })),
      durationSd: 0.01,
      cheapCost: r.work,
      locality: "known-local-or-route",
    },
  }));
  s = editWorld(s, (b) => {
    b.config.diagnostic.cacheFoodFu = 12;
    const c = b.goods.containers.find((c: any) => c.kind === "cache"),
      tx = b.goods.transactions.find(
        (t: any) => t.request.kind === "source" && t.request.to === c.key,
      );
    c.stocks.food = 12;
    tx.amount = 12;
    tx.request.quantity = 12;
    b.storage.anchors[c.key].stocks.food = 12;
    b.config.recipes.push(...recipes);
    b.config.methods.push(...methods);
    b.config.goods.push(
      ...recipes
        .slice(1)
        .map((r) => ({ id: r.output, bulk: 0.01, divisible: false })),
    );
    b.config.evidence.foundingMethods = [
      "consume",
      "rest",
      "leisure",
      "gather",
      "eat-fish",
      ...methods.map((m) => m.id),
    ];
    b.configurationHash = digest(b.config);
  });
  const a = s.actorKeys()[0]!;
  s.diagnosticFoundAdult(a, "M", adult);
  s.diagnosticGoods({
    kind: "source",
    source: "initial-endowment",
    to: s.snapshot().actors[0]!.container,
    good: "food",
    quantity: 0.8,
  });
  s.diagnosticObserveResource(
    a,
    s.diagnosticResource("food-patch", s.personalReview(a).self.location, 24),
  );
  s.enableAutonomous(a, { p: 0, rT: 0, aT: 0 });
  // A declared desired service; no selected physical steps are supplied.
  s = editWorld(s, (b) => {
    b.mind[0].projects = [
      ProjectFrontier.found({
        kind: "have",
        good: "fish",
        quantity: 2.9,
        place: "carried",
      }),
    ];
  });
  s.requestReview(a, "periodic");
  s.advanceTo(time(0.01));
  const r = PhysicalSimulation.restore(s.checkpoint());
  s.requestReview(a, "periodic");
  r.requestReview(a, "periodic");
  s.advanceTo(time(0.5));
  for (const q of [0.02, 0.037, 0.08, 0.2, 0.5]) {
    r.snapshot();
    r.advanceTo(time(q));
  }
  expect(r.causalHash()).toBe(s.causalHash());
  expect(s.decisionPanel(a)!.projects![0]!.status).toBe("complete");
  expect(
    new Set(
      s
        .materialSnapshot()
        .work.filter((w) => w.complete)
        .map((w) => w.recipe),
    ).size,
  ).toBe(13);
  expect(s.snapshot().reconciliation.ok).toBe(true);
  expect(
    Object.values(JSON.parse(s.checkpoint()).body.runtime.effort).every(
      (e: any) => e.spent <= e.allowance,
    ),
  ).toBe(true);
});
it("ordinary autonomous valuation constructs and uses a cache for a real carried surplus", () => {
  const s = new PhysicalSimulation(
      "cache-autonomy",
      resolveConfig(
        { width: 16, height: 12, regionCells: 4 },
        { actors: 1, sites: 3, foundingCaches: false },
      ),
    ),
    a = s.actorKeys()[0]!;
  s.diagnosticFoundAdult(a, "M", adult);
  s.diagnosticGoods({
    kind: "source",
    source: "initial-endowment",
    to: s.snapshot().actors[0]!.container,
    good: "food",
    quantity: 4.2,
  });
  s.diagnosticObserveResource(
    a,
    s.diagnosticResource("food-patch", s.personalReview(a).self.location, 24),
  );
  s.diagnosticFoundRate(a, "establish-cache", "making", 0.5);
  s.enableAutonomous(a, { p: 0, rT: 0, aT: 0 });
  s.requestReview(a, "periodic");
  s.advanceTo(1);
  expect(s.decisionPanel(a)!.traces.at(-1)!.selected?.method).toBe(
    "establish-cache",
  );
  s.advanceTo(time(0.01));
  const r = PhysicalSimulation.restore(s.checkpoint());
  s.advanceTo(time(0.2));
  r.advanceTo(time(0.2));
  expect(r.causalHash()).toBe(s.causalHash());
  const cache = s.snapshot().containers.find((c) => c.kind === "cache")!;
  expect(cache.capacityCu).toBe(12);
  expect(cache.stocks.food).toBeGreaterThan(3);
  expect(execution(s).budget.spent.goods.food).toBeGreaterThan(3);
  expect(s.snapshot().reconciliation.ok).toBe(true);
});
it("standing nourishment and concurrent extraction settle once across a new worker, closure and restore", () => {
  const s = flatWorld("maintenance-coflow", 2),
    [a, b] = s.actorKeys();
  s.diagnosticFoundAdult(a!);
  s.diagnosticFoundAdult(b!);
  s.diagnosticGoods({
    kind: "source",
    source: "initial-endowment",
    to: s.snapshot().actors[0]!.container,
    good: "food",
    quantity: 0.5,
  });
  const site = s.diagnosticResource(
      "food-patch",
      s.personalReview(a!).self.location,
      24,
    ),
    seen = s.diagnosticObserveResource(a!, site),
    other = s.diagnosticObserveResource(b!, site);
  const t = task(
    s,
    [
      {
        family: "Work",
        law: "gather",
        site: seen,
        duration: time(0.2),
        maintenance: {
          from: s.personalReview(a!).self.carried.subject,
          good: "food",
          rate: 1.2,
          quantity: 0.24,
        },
      },
    ],
    "maintained",
  );
  t.method = "gather";
  t.authorised.goods = { food: 0.3 };
  s.diagnosticSelect(t);
  s.advanceTo(time(0.03));
  const r = PhysicalSimulation.restore(s.checkpoint());
  for (const sim of [s, r]) {
    sim.advanceTo(time(0.05));
    const next = task(
      sim,
      [{ family: "Work", law: "gather", site: other, duration: time(0.1) }],
      "concurrent",
    );
    next.actor = b!;
    next.method = "gather";
    sim.diagnosticSelect(next);
    sim.advanceTo(time(0.25));
  }
  expect(r.causalHash()).toBe(s.causalHash());
  expect(s.snapshot().reconciliation.ok).toBe(true);
  const sinks = JSON.parse(s.checkpoint())
    .body.goods.transactions.filter(
      (t: any) =>
        t.request.kind === "sink" &&
        t.request.sink === "consumption" &&
        t.request.actor === a,
    )
    .reduce((n: number, t: any) => n + t.amount, 0);
  expect(sinks).toBeCloseTo(0.24, 5);
});
it("material-life observer reads and host partitions preserve active causal state", () => {
  const a = createMaterialFixture("material-life");
  a.advanceTo(time(0.02));
  const b = PhysicalSimulation.restore(a.checkpoint());
  const hash = a.causalHash();
  for (let i = 0; i < 8; i++) {
    a.snapshot();
    a.materialSnapshot();
    a.decisionPanel(a.actorKeys()[0]!);
  }
  expect(a.causalHash()).toBe(hash);
  a.advanceTo(time(1));
  for (let q = time(0.037); q < time(1); q += time(0.073)) b.advanceTo(q);
  b.advanceTo(time(1));
  expect(b.causalHash()).toBe(a.causalHash());
  expect(a.snapshot().reconciliation.ok).toBe(true);
  expect(a.materialSnapshot().items.some((i) => i.kind === "work-tool")).toBe(
    true,
  );
});

it("natural predator harm and flight preserve event phases and movement ownership across seeds", () => {
  for (const seed of ["material-life-b", "material-life-c"]) {
    const s = createMaterialFixture(seed);
    s.advanceTo(time(0.3));
    const r = PhysicalSimulation.restore(s.checkpoint());
    s.advanceTo(time(2.1));
    for (const at of [0.5, 0.9, 1.4, 1.9, 2.1]) r.advanceTo(time(at));
    expect(r.causalHash()).toBe(s.causalHash());
    expect(s.snapshot().reconciliation.ok).toBe(true);
  }
});

it("paying a short making prefix cannot falsely complete a retained material project", () => {
  let s = flatWorld("unfinished-milestone");
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
  s.enableAutonomous(a, { p: 0, rT: 0, aT: 0 });
  const p = ProjectFrontier.found({
    kind: "have",
    good: "work-tool",
    quantity: 1,
    place: "carried",
  });
  s = editWorld(s, (b) => {
    b.mind[0].projects = [p];
  });
  const t = task(
    s,
    [{ family: "Work", law: "make-work-tool", duration: time(0.001) }],
    "short-project-prefix",
  );
  t.method = "make-work-tool";
  t.project = p.key;
  t.projectFinal = true;
  t.projectMilestone = 0;
  t.authorised.goods = { wood: 1, stone: 1 };
  s.diagnosticSelect(t);
  s.advanceTo(time(0.002));
  expect(s.materialSnapshot().work[0]!.complete).toBe(false);
  expect(s.decisionPanel(a)!.projects![0]!.status).not.toBe("complete");
  expect(s.snapshot().reconciliation.ok).toBe(true);
});
