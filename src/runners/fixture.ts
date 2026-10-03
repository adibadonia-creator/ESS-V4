import type { PhysicalSimulation } from "../world/simulation";
// Preselected physical operations. Never described as deliberation/emergence.
export function launchPhysicalFixture(sim: PhysicalSimulation): void {
  const snapshot = sim.snapshot();
  for (const actor of snapshot.actors) {
    const target = snapshot.containers
      .filter((c) => c.kind === "site")
      .sort((a, b) => {
        const da =
            (a.position.x - actor.position.x) ** 2 +
            (a.position.y - actor.position.y) ** 2,
          db =
            (b.position.x - actor.position.x) ** 2 +
            (b.position.y - actor.position.y) ** 2;
        return da - db || (a.key < b.key ? -1 : 1);
      })[0]!;
    sim.diagnosticMove(actor.key, target.position);
  }
}
