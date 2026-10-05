import { EvidenceService, clone } from "../src/evidence/service";
import type { ExactSelf, Value, PerceptionPacket } from "../src/evidence/types";
import { counters } from "../src/kernel/counters";
import { canonical, digest } from "../src/kernel/canonical";
import { QUANTA, time } from "../src/kernel/time";
import { Mind } from "../src/mind/review";
import { Binder } from "../src/mind/binder";
import { openReview, ReviewEffort } from "../src/mind/effort";
import { explorationOptions, explorationWeight, inquiryValue } from "../src/mind/exploration";
import { forecast } from "../src/mind/forecast";
import { feasibility } from "../src/mind/arbiter";
import { METHOD_INDEX, MethodIndex } from "../src/content/methods";
import { resolveConfig } from "../src/content/profile";
import { PhysicalSimulation } from "../src/runners/simulation";
import { flatWorld, editWorld } from "./pack0b-fixture";
import { pleasantWeight } from "../src/laws/enjoyment";
export const profile={width:32,height:18,cellKm:.1,regionCells:8};
const quietPrecision={denominator:()=>Infinity};
export function cognition({food=5,f=0,leisureSatiation=10,rate=.1,hammer=1,trial=true,inquiry=true,seed="exploration-proof",catalogue=METHOD_INDEX}={}) {
  const actor=digest([seed]), counts=counters(), e=new EvidenceService(seed,counts,undefined,undefined,.8,catalogue,profile);
  e.register(actor);e.foundMethods(actor,["consume","rest","leisure","gather",...(inquiry?["inquire"]:[]),...(trial?["try-compatible"]:[])],0);
  e.foundTraversalPrior(actor,{speedFactor:1,uncertainty:1,context:"public traversal prior"},0);
  const self:ExactSelf={identity:actor,location:{x:.35,y:.85},currentLeg:null,carried:{subject:"own",stocks:{food,stone:hammer}},reservations:[]};
  e.fact(actor,"self","body-experience",{class:"M",condition:1,fatigue:.1,enjoyment:f,wounds:0,intake:0,activityLoad:0,satiation:leisureSatiation,familySatiation:{},familiarity:{},intervalStart:0,effortSd:0,restSd:0,pleasantSd:0,compulsorySd:0,leisureSd:0} as unknown as Value,0,"own experienced body","self");
  // The prior is learned performance evidence, not a true capacity input.
  e.fact(actor,"self","rate:gather:food-patch",{priorRate:rate,priorWeight:1,weight:0,logSum:0,anchorAt:0,samples:1},0,"own paid rate","inference");
  e.fact(actor,"patch","location",self.location,0,"local");e.fact(actor,"patch","resource-kind","food-patch",0,"local");e.fact(actor,"patch","stock:food",24,0,"local");
  e.fact(actor,"material","location",self.location,0,"visible");e.fact(actor,"material","material-kind","glassy-stone",0,"visible");e.fact(actor,"material","perceptible-properties","hard,glassy",0,"visible");e.fact(actor,"material","stock:stone",12,0,"visible");
  e.observe(actor,{terrain:[{cell:3+8*32,terrain:0,passable:true,speed:1,detection:1}],facts:[],resourceClasses:["food-patch"],footprint:{duration:1,cells:[{cell:3+8*32,detection:1}]}},0,"observed ground",true);
  const mind=new Mind(seed,counts,[],catalogue),state=mind.found(actor,0,{p:0,rT:0,aT:0});
  const review=()=>e.review(actor,0,profile,self);
  const deliberate=()=>{mind.request(actor,"periodic",1);const r=review(),admission=mind.admit(r,{task:null,budget:null})!;return mind.deliberate(r,{task:null,budget:null},admission,quietPrecision);};
  return {actor,counts,e,self,mind,state,review,deliberate};
}
export const experiment={form:"T1" as const,operation:"strike",targetKind:"glassy-stone",descriptor:"T1:strike:material:glassy-stone",evidenceVersion:1,paid:time(.03),completed:true,success:false};
export function trialWorld(seed="trial-world",effects=true) {
  let sim=new PhysicalSimulation(seed,resolveConfig({width:6,height:6,regionCells:2},{actors:1,sites:3,cacheFoodFu:8})); const actor=sim.actorKeys()[0]!;
  sim=editWorld(sim,s=>{
    s.terrain.passable.fill(1);s.terrain.speed.fill(1);s.terrain.kind.fill(0);s.terrain.opaque.fill(0);s.terrain.version++;
    s.actors[0].position={x:.35,y:.35};
    for (const c of s.goods.containers.filter((c:any)=>c.location.kind==="ground")) c.location.point={x:.35,y:.35};
    s.config.diagnostic.cacheFoodFu=8; // fixture intervention is explicit and reconciled
    s.config.materialEffects=effects ? ["edge-flaking"]:[];
    s.configurationHash=digest(s.config);
    const cache=s.goods.containers.find((c:any)=>c.kind==="cache" && c.custodian===actor);
    const tx=s.goods.transactions.find((t:any)=>t.request.kind==="source" && t.request.to===cache.key);
    cache.stocks.food=8;tx.amount=8;tx.request.quantity=8;
    const held=s.goods.containers.find((c:any)=>c.kind==="carried" && c.custodian===actor);
    held.stocks.stone=1;
    const id=JSON.parse(JSON.stringify(tx));id.key=digest([seed,"hammer"]);id.request={kind:"source",source:"initial-endowment",to:held.key,good:"stone",quantity:1};id.amount=1;s.goods.transactions.push(id);
  });
  sim.diagnosticFoundAdult(actor,"M",{capability:{B:1,A:1,C:1,P:1,displayPotential:1,efficiency:1},mastery:{Field:.5,Fight:.5,Make:.5,Organise:.5,Social:.5},initial:{condition:1,fatigue:.1,enjoyment:0,satiation:1}});
  sim.diagnosticObserveResource(actor,sim.diagnosticResource("stone-deposit",sim.personalReview(actor).self.location,12,"glassy-stone"));
  sim.enableAutonomous(actor,{p:0,rT:0,aT:0});sim.requestReview(actor,"periodic");
  return {sim,actor};
}
