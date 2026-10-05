import { PhysicalSimulation } from "./simulation";
import { resolveConfig } from "../content/profile";
// Declared founding prehistory, finite endowments and genuine local observations.
// This function never issues a selected action, task or desired action sequence.
export function createMaterialFixture(seed: string) {
  const sim = new PhysicalSimulation(
    seed,
    resolveConfig(
      { width: 16, height: 12, regionCells: 4 },
      { actors: 4, sites: 3, cacheFoodFu: 8 },
    ),
  );
  for (const [i, actor] of sim.actorKeys().entries()) {
    sim.diagnosticFoundAdult(actor, i % 2 ? "F" : "M", {
      capability: {
        B: 1,
        A: 1,
        C: 1,
        P: 1,
        displayPotential: 1,
        efficiency: 1,
      },
      mastery: {
        Field: 0.5,
        Fight: 0.5,
        Make: 0.5,
        Organise: 0.5,
        Social: 0.5,
      },
      initial: { condition: 1, fatigue: 0.15, enjoyment: 0.5 },
    });
    const held = sim.containerKeys(actor)[0]!;
    for (const good of ["wood", "stone"])
      sim.diagnosticGoods({
        kind: "source",
        source: "initial-endowment",
        to: held,
        good,
        quantity: 1,
      });
    const point = sim.personalReview(actor).self.location;
    for (const [kind, quantity] of [
      ["food-patch", 24],
      ["wood-site", 20],
      ["stone-deposit", 12],
      ["fishing-node", 24],
    ] as const)
      sim.diagnosticObserveResource(
        actor,
        sim.diagnosticResource(kind, point, quantity),
      );
    sim.diagnosticFoundUse(actor, "gather", 0.4);
    sim.diagnosticFoundRate(actor, "gather", "food-patch", 6);
    for (const method of ["make-work-tool", "make-spear", "establish-cache"])
      sim.diagnosticFoundRate(actor, method, "making", 0.5);
    sim.enableAutonomous(actor);
    sim.requestReview(actor, "periodic");
  }
  const near = sim.personalReview(sim.actorKeys()[0]!).self.location;
  sim.diagnosticPredator(near); // One physical founding animal; observation remains local.
  return sim;
}
