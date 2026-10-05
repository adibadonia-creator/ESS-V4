import { it, expect } from "vitest";
import { flatWorld, editWorld, time } from "./pack0b-fixture";
import { digest } from "../src/kernel/canonical";
import { PhysicalSimulation } from "../src/runners/simulation";
function fixture(stock: number) {
  let s = flatWorld("p2-autonomy");
  s = editWorld(s, (b) => {
    b.config.diagnostic.cacheFoodFu = 0;
    const cache = b.goods.containers.find((c: any) => c.kind === "cache"),
      tx = b.goods.transactions.find(
        (t: any) => t.request.kind === "source" && t.request.to === cache.key,
      );
    cache.stocks.food = 0;
    b.storage.anchors[cache.key].stocks.food = 0;
    tx.amount = 0;
    tx.request.quantity = 0;
    b.config.evidence.foundingMethods = [
      "consume",
      "rest",
      "leisure",
      "wood",
      "stone",
      "make-spear",
      "fish",
      "eat-fish",
    ];
    b.configurationHash = digest(b.config);
  });
  const a = s.actorKeys()[0]!,
    held = s.snapshot().actors[0]!.container;
  s.diagnosticFoundAdult(a, "M", {
    capability: {
      B: 1.5,
      A: 1,
      C: 1,
      P: 1,
      displayPotential: 1,
      efficiency: 1,
    },
    mastery: { Field: 0.5, Fight: 0.5, Make: 0.5, Organise: 0.5, Social: 0.5 },
    initial: { condition: 0.7, fatigue: 0.1, enjoyment: 0.9 },
  });
  s.diagnosticGoods({
    kind: "source",
    source: "initial-endowment",
    to: held,
    good: "food",
    quantity: 0.5,
  });
  for (const good of ["wood", "stone"])
    s.diagnosticGoods({
      kind: "source",
      source: "initial-endowment",
      to: held,
      good,
      quantity: 2,
    });
  s.diagnosticObserveResource(
    a,
    s.diagnosticResource(
      "fishing-node",
      s.personalReview(a).self.location,
      stock,
    ),
  );
  s.diagnosticFoundRate(a, "fish", "fishing-node", 3);
  s.diagnosticFoundRate(a, "make-spear", "making", 0.5);
  s.enableAutonomous(a, { p: 0, rT: 0, aT: 0 });
  s.requestReview(a, "periodic");
  s.advanceTo(1);
  s.requestReview(a, "periodic");
  s.advanceTo(2);
  return { s, a };
}
it("ordinary autonomy makes a spear, fishes and consumes actual fish through active restore", () => {
  const { s, a } = fixture(24),
    selected = s.decisionPanel(a)!.traces.at(-1)!.selected!;
  expect(selected.method).toBe("eat-fish");
  expect(
    selected.steps.map((s) => (s.family === "Work" ? s.law : s.family)),
  ).toEqual(["make-spear", "fish", "Transfer"]);
  s.advanceTo(time(0.02));
  const restored = PhysicalSimulation.restore(s.checkpoint());
  s.advanceTo(time(2));
  for (const q of [0.1, 0.3, 0.8, 1.4, 2]) restored.advanceTo(time(q));
  expect(restored.causalHash()).toBe(s.causalHash());
  const body = JSON.parse(s.checkpoint()).body;
  expect(
    s
      .materialSnapshot()
      .items.some((i) => i.kind === "spear" && i.durability < 1),
  ).toBe(true);
  expect(
    body.goods.transactions
      .filter(
        (t: any) =>
          t.request.kind === "sink" &&
          t.request.sink === "consumption" &&
          t.request.good === "fish",
      )
      .reduce((n: number, t: any) => n + t.amount, 0),
  ).toBeGreaterThan(0.5);
  expect(s.snapshot().reconciliation.ok).toBe(true);
  expect(
    Object.values(body.runtime.effort).every(
      (e: any) => e.spent <= e.allowance,
    ),
  ).toBe(true);
});
it("an observed empty fishing source prevents autonomous investment and fishing output", () => {
  const { s, a } = fixture(0);
  expect(s.decisionPanel(a)!.traces.at(-1)!.selected?.method).not.toBe(
    "eat-fish",
  );
  s.advanceTo(time(2));
  expect(s.materialSnapshot().work).toHaveLength(0);
  expect(s.snapshot().reconciliation.totals.fish!.sources).toBe(0);
  expect(s.snapshot().reconciliation.ok).toBe(true);
});
