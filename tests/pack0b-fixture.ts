import { PhysicalSimulation } from "../src/world/simulation";
import { resolveConfig } from "../src/content/profile";
import { digest, canonical } from "../src/kernel/canonical";
import { QUANTA, time } from "../src/kernel/time";
import { beliefKey } from "../src/evidence/service";
import type { SelectedIntention, Operation } from "../src/runtime/types";
export function flatWorld(seed = "evidence", actors = 1, siteCount = 3) {
  const base = new PhysicalSimulation(
    seed,
    resolveConfig(
      { width: 32, height: 18, regionCells: 8 },
      { actors, sites: siteCount, routeExpansionsPerResume: 2 },
    ),
  );
  const cp = JSON.parse(base.checkpoint()),
    s = cp.body;
  s.terrain.passable.fill(1);
  s.terrain.speed.fill(1);
  s.terrain.kind.fill(0);
  s.terrain.opaque.fill(0);
  s.terrain.version++;
  for (let i = 0; i < s.actors.length; i++) {
    s.actors[i].position = { x: 0.35, y: 0.85 + i * 0.02 };
    const cache = s.goods.containers.find(
      (c: any) => c.kind === "cache" && c.custodian === s.actors[i].key,
    );
    cache.location.point = { ...s.actors[i].position };
  }
  const sites = s.goods.containers.filter((c: any) => c.kind === "site");
  sites[0].location.point = { x: 1.65, y: 0.85 };
  sites[1].location.point = { x: 2.75, y: 1.55 };
  sites[2].location.point = { x: 2.75, y: 0.15 };
  return PhysicalSimulation.restore(
    canonical({ checksum: digest(s), body: s }),
  );
}
export function editWorld(sim: PhysicalSimulation, edit: (s: any) => void) {
  const { body } = JSON.parse(sim.checkpoint());
  edit(body);
  return PhysicalSimulation.restore(
    canonical({ checksum: digest(body), body }),
  );
}
export function task(
  sim: PhysicalSimulation,
  steps: Operation[],
  semanticKey = "diagnostic-purpose",
  budget = time(3),
): SelectedIntention {
  const actor = sim.actorKeys()[0]!;
  sim.enablePersonal(actor);
  const view = sim.personalView(actor);
  return {
    actor,
    intentionId: "intention:" + semanticKey,
    taskId: "task:" + semanticKey,
    semanticKey,
    source: "diagnostic-selected-intention",
    objective: "inspect bound destination",
    method: "contact",
    bindings: {},
    steps,
    dependsOn: [],
    authorised: { time: budget, goods: { food: 1 } },
    reserve: [],
  };
}
export function move(
  x = 1.95,
  y = 0.85,
  exploratory = true,
): Extract<Operation, { family: "Move" }> {
  return {
    family: "Move",
    target: { x, y },
    exploratory,
  };
}
export const attend = (duration = time(0.02)): Operation => ({
  family: "Attend",
  duration,
  scope: "local-survey",
});
export function execution(sim: PhysicalSimulation) {
  return sim.personalLens(sim.actorKeys()[0]!).execution as {
    task: any;
    budget: any;
    activity: any;
  };
}
export { QUANTA, time, beliefKey };
