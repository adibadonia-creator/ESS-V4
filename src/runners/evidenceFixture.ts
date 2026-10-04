import type { PhysicalSimulation } from "../world/simulation";
import { time } from "../kernel/time";
// Diagnostic selected intentions prove execution, never autonomous deliberation.
// Destinations depend on public raster geometry and own position only.
export function launchEvidenceFixture(sim: PhysicalSimulation): void {
  for (const actor of sim.actorKeys()) {
    sim.enablePersonal(actor);
    const v = sim.personalView(actor),
      cache = v.places.find((e) => e.property === "own-local-stocks");
    const x = Math.min(
      v.profile.width - 1,
      Math.floor(v.self.location.x / v.profile.cellKm) + 8,
    );
    const y = Math.floor(v.self.location.y / v.profile.cellKm);
    sim.diagnosticSelect({
      actor,
      intentionId: `diagnostic:${actor}`,
      taskId: `diagnostic-task:${actor}`,
      semanticKey: "diagnostic-inspect-prefix",
      source: "diagnostic-selected-intention",
      objective: "inspect a preselected nearby destination",
      method: "exchange",
      bindings: { destination: "public raster offset" },
      authorised: { time: time(0.5), goods: { food: 0.5 } },
      dependsOn: [],
      reserve: cache
        ? [
            {
              subject: cache.subject,
              good: "food",
              quantity: 0.5,
              expires: time(2),
            },
          ]
        : [],
      steps: [
        ...(cache
          ? [
              {
                family: "Transfer" as const,
                from: cache.subject,
                to: v.self.carried.subject,
                good: "food",
                quantity: 0.5,
                basis: "own-custody" as const,
                duration: time(0.02),
              },
            ]
          : []),
        {
          family: "Move",
          target: {
            x: (x + 0.5) * v.profile.cellKm,
            y: (y + 0.5) * v.profile.cellKm,
          },
          exploratory: true,
        },
        { family: "Attend", scope: "local-survey", duration: time(0.1) },
      ],
    });
  }
}
