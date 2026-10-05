import { PhysicalSimulation } from "./simulation";
import { resolveConfig } from "../content/profile";
// A small natural-opportunity panel: actual generated terrain, adults, founding
// prehistory/endowments and local perceived deposits. No action is selected here.
export function createExplorationFixture(seed: string): PhysicalSimulation {
  const sim = new PhysicalSimulation(seed, resolveConfig({width:6,height:6,regionCells:2},{actors:2,sites:3,cacheFoodFu:8}));
  for (const actor of sim.actorKeys()) {
    const held=sim.containerKeys(actor)[0]!;
    sim.diagnosticGoods({kind:"source",source:"initial-endowment",to:held,good:"stone",quantity:1});
    sim.diagnosticFoundAdult(actor,"M",{
      capability:{B:1,A:1,C:1,P:1,displayPotential:1,efficiency:1},
      mastery:{Field:.5,Fight:.5,Make:.5,Organise:.5,Social:.5},
      initial:{condition:1,fatigue:.1,enjoyment:.2,satiation:1},
    });
    const point=sim.personalReview(actor).self.location;
    sim.diagnosticObserveResource(actor,sim.diagnosticResource("stone-deposit",point,12,"glassy-stone"));
    sim.diagnosticObserveResource(actor,sim.diagnosticResource("food-patch",point,24));
    sim.enableAutonomous(actor);
    sim.requestReview(actor,"periodic");
  }
  return sim;
}
