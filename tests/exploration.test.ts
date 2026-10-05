import { describe, expect, it } from "vitest";
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
import { PhysicalSimulation } from "../src/runners/simulation";
import { flatWorld, editWorld } from "./pack0b-fixture";
import { pleasantWeight } from "../src/laws/enjoyment";
import { cognition, trialWorld, experiment, profile } from "./exploration-fixture";
describe("Pack 0C3A personal exploration",()=>{
  it("uses three bounded EVSI classes and cannot create backing",()=>{
    const h=cognition(),meter=new ReviewEffort(openReview(h.actor,0),h.counts);
    const v=inquiryValue(h.review(),meter,0,.5,.1)!;
    expect(v.value).toBeGreaterThan(0);expect(v.probabilities.reduce((a,b)=>a+b,0)).toBeCloseTo(1);expect(h.counts.inquiryClasses).toBe(3);
    const o=explorationOptions(h.review(),h.state,meter).find(o=>o.objective.kind==="knows")!;
    expect(o.informationValue).toBeGreaterThan(0);expect(o.goods).toEqual({});expect(o.steps.filter(s=>s.family==="Work")).toEqual([]);expect(meter.account.spent).toBeLessThanOrEqual(600);
  });
  it("compares affordable T1 and inquiry through the existing arbiter",()=>{
    const h=cognition();const t=h.deliberate();
    expect(t.compared.some(x=>x.option.method==="try-compatible")).toBe(true);
    expect(t.compared.some(x=>x.option.method==="inquire")).toBe(true);
    expect(t.effort.spent).toBeLessThanOrEqual(600);
    console.log("directional choices",t.selected?.method,t.compared.map(x=>[x.option.method,x.value,x.gate,x.consequences.severeProbability]));
  });
  it("never constructs a trial without an eligible held hammer",()=>{
    const h=cognition({hammer:0});const options=explorationOptions(h.review(),h.state,new ReviewEffort(openReview(h.actor,0),h.counts));expect(options.filter(o=>o.method==="try-compatible")).toHaveLength(0);
  });
  it("empty qualified observation lowers the local posterior without double counting overlap",()=>{
    const h=cognition(),before=h.review().belief("occupancy","food-patch:0")!.value as Record<string,number>;
    const packet:PerceptionPacket={terrain:[{cell:300,terrain:0,passable:true,speed:1,detection:1}],facts:[],resourceClasses:["food-patch"],footprint:{duration:time(.12),cells:[{cell:300,detection:1}]}};
    h.e.observe(h.actor,packet,1,"paid empty search",true);const a=h.e.review(h.actor,1,profile,h.self).belief("occupancy","food-patch:0")!.value as Record<string,number>;
    h.e.observe(h.actor,packet,2,"overlapping empty search",true);const b=h.e.review(h.actor,2,profile,h.self).belief("occupancy","food-patch:0")!.value;
    expect(a.beta!).toBeGreaterThan(before.beta!);expect(a.alpha!/a.beta!).toBeLessThan(before.alpha!/before.beta!);expect(b).toEqual(a);
  });
  it("process value is the family enjoyment law and declines with familiarity and contextual frustration",()=>{
    expect(pleasantWeight(.3,1.5,0,0)).toBeCloseTo(.75);
    expect(pleasantWeight(.3,1.5,3,0)).toBeLessThan(.75);
    const h=cognition(),before=explorationWeight(h.review(),experiment);h.e.observeExploration(h.actor,experiment,0,"observed-failure");
    expect(explorationWeight(h.review(),experiment)).toBeLessThan(before);
    expect(explorationWeight(h.review(),{...experiment,form:"inquiry",operation:"survey",targetKind:"food-patch:0"})).toBe(before);
    const c=h.review().belief("exploration","T1:strike:glassy-stone")!.value as Record<string,number>;expect(c.alpha).toBe(1);expect(c.beta).toBe(5);
    const broad=h.review().belief("exploration","T1:strike:*")!.value as Record<string,number>;expect(broad.beta).toBe(4.25);
  });
  it("installs provisional knowledge only after observed success and exposes it to ordinary binding",()=>{
    const h=cognition();expect(h.review().methods("have:edged-flake",2).entries).toHaveLength(0);
    h.e.observeExploration(h.actor,{...experiment,success:true,method:"edge-flaking",good:"edged-flake",yield:.5},0,"paid-observed-success");
    expect(h.review().belief("method:edge-flaking","confidence")!.value).toBe(.4);expect(h.review().belief("method:edge-flaking","known")!.modality).toBe("trial");
    const binder=new Binder(h.review(),h.state,new ReviewEffort(openReview(h.actor,0),h.counts));const methods=binder.admission("have:edged-flake");expect(methods.map(m=>m.id)).toContain("edge-flaking");
    expect(binder.bind({kind:"have",good:"edged-flake",place:"own",quantity:.5},methods[0]!).status).toBe("executable");
    h.e.register("unobserving-person");expect(h.e.review("unobserving-person",0,profile,{...h.self,identity:"unobserving-person"}).methods("have:edged-flake",2).entries).toHaveLength(0);
  });
  it("exhaustion defers instead of declaring an opportunity impossible",()=>{
    const h=cognition(),account=openReview(h.actor,0);account.spent=599;
    const meter=new ReviewEffort(account,h.counts);expect(inquiryValue(h.review(),meter,0,.5,.1)).toBeNull();expect(account.spent).toBe(600);
  });
  it("actual optional reserve rejects curiosity without prior food",()=>{
    const h=cognition({food:.2}),o=explorationOptions(h.review(),h.state,new ReviewEffort(openReview(h.actor,0),h.counts)).find(o=>o.method==="try-compatible")!;
    const c=forecast(h.review(),o,new ReviewEffort(openReview(h.actor,0),h.counts))!;
    expect(feasibility(h.review(),{option:o,consequences:c,feasible:true,gate:null,riskPass:true,value:0,error:0,errors:[]} ,false)).toContain("reserve");
  });
  it("hidden schema worlds make identical first decisions and diverge only after paid observation",()=>{
    const a=trialWorld("paired-schema",true),b=trialWorld("paired-schema",false);
    a.sim.advanceTo(1);b.sim.advanceTo(1);
    expect(a.sim.decisionPanel(a.actor)).toEqual(b.sim.decisionPanel(b.actor));
    const selected=a.sim.decisionPanel(a.actor)!.traces.at(-1)!;
    console.log("physical first",selected.selected?.method,selected.compared.map(x=>[x.option.method,x.value,x.gate]));
    expect(a.sim.personalReview(a.actor).belief("method:edge-flaking","known")).toBeNull();
    a.sim.advanceTo(time(.05));b.sim.advanceTo(time(.05));
    expect(a.sim.snapshot().reconciliation.ok).toBe(true);expect(b.sim.snapshot().reconciliation.ok).toBe(true);
    console.log("physical learned",a.sim.personalReview(a.actor).belief("method:edge-flaking","known")?.value);
  });
  it("irrelevant successful global methods do not change personal nomination or choice",()=>{
    const added=Array.from({length:10000},(_,i)=>({id:`unknown-${i}`,effects:["have:edged-flake"],inputs:["property:glassy"]}));
    const a=cognition(),b=cognition({catalogue:new MethodIndex([...JSON.parse(JSON.stringify((awaitContent()))),...added])});
    expect(a.deliberate()).toEqual(b.deliberate());expect(a.counts.personalReadEntriesVisited).toBe(b.counts.personalReadEntriesVisited);
  });
});
import content from "../src/content/physical.json";
function awaitContent(){return content.methods;}
