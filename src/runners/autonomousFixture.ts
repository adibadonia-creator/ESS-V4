import type { PhysicalSimulation } from "./simulation";
// Founding inputs and genuine local observations only. No selected task or
// expected sequence is supplied: every operation must come from one mind.
export function launchAutonomousFixture(sim: PhysicalSimulation): void {
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
      initial: {
        condition: 1,
        fatigue: i % 4 === 0 ? 0.6 : 0.15,
        enjoyment: i % 3 === 0 ? 0.2 : 0.65,
      },
    });
    const point = sim.personalReview(actor).self.location;
    sim.diagnosticObserveResource(
      actor,
      sim.diagnosticResource("food-patch", point, 24),
    );
    sim.enableAutonomous(actor);
  }
}
