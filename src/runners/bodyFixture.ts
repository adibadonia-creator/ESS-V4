import type { PhysicalSimulation } from "../runners/simulation";
import { time } from "../kernel/time";
// An explicit Stage-I execution scenario. Every step is selected at founding;
// later body signals neither choose nor insert operations.
export function launchBodyFixture(sim: PhysicalSimulation): void {
  for (const [i, actor] of sim.actorKeys().entries()) {
    sim.diagnosticFoundAdult(actor, i % 2 ? "F" : "M", {
      capability: {
        B: i % 2 ? 1.1 : 1,
        A: i % 2 ? 1.15 : 1,
        C: i % 2 ? 1.2 : 1,
        P: 1,
        displayPotential: 1,
        efficiency: 1,
      },
      mastery: {
        Field: i % 2 ? 0.6 : 0.5,
        Fight: 0.5,
        Make: 0.5,
        Organise: 0.5,
        Social: 0.5,
      },
    });
    const v = sim.personalView(actor),
      p = v.self.location;
    const food = sim.diagnosticObserveResource(
      actor,
      sim.diagnosticResource("food-patch", p, 24),
    );
    const wood = sim.diagnosticObserveResource(
      actor,
      sim.diagnosticResource("wood-site", p, 30),
    );
    const cache = v.places.find((e) => e.property === "own-local-stocks")!;
    sim.diagnosticSelect({
      actor,
      intentionId: `body-chain:${actor}`,
      taskId: `body-chain-task:${actor}`,
      semanticKey: "body-physical-chain",
      source: "diagnostic-selected-intention",
      objective: "execute preselected work, food, rest and leisure",
      method: "exchange",
      bindings: { food, wood },
      dependsOn: [],
      reserve: [],
      authorised: { time: time(8), goods: { food: 1.35 } },
      steps: [
        {
          family: "Transfer",
          duration: time(0.02),
          from: cache.subject,
          to: v.self.carried.subject,
          good: "food",
          quantity: 1,
          basis: "own-custody",
        },
        { family: "Work", law: "gather", site: food, duration: time(0.12) },
        {
          family: "Transfer",
          duration: time(0.14),
          from: v.self.carried.subject,
          to: v.self.carried.subject,
          good: "food",
          quantity: 0.35,
          basis: "own-custody",
          use: "consume",
        },
        {
          family: "Work",
          law: "wood",
          site: wood,
          duration: time(1.2),
          compulsory: true,
        },
        { family: "Recover", law: "rest", mode: "rest", duration: time(1.5) },
        {
          family: "Recover",
          law: "leisure",
          mode: "leisure",
          duration: time(1.5),
        },
        { family: "Work", law: "gather", site: food, duration: time(0.1) },
      ],
    });
  }
}
