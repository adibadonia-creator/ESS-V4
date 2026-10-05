import {it,expect} from "vitest";
import {cognition} from "./exploration-fixture";
import {flatWorld,task,time,execution} from "./pack0b-fixture";
import {boundedRepair} from "../src/mind/repair";
import {PhysicalSimulation} from "../src/runners/simulation";
import {contestProbability,injuryProbability} from "../src/laws/engagement";
it("an observed immediate threat uses the same arbiter with at most 80 EU and coalesces unchanged danger",()=>{
 const f=cognition({trial:false,inquiry:false});f.e.foundMethods(f.actor,["escape","defend"],0);
 f.e.fact(f.actor,"animal","threat",{force:1.6,point:f.self.location,active:true} as any,0,"direct local animal");
 const trace=f.mind.safety(f.review(),{task:null,budget:null});expect(trace).not.toBeNull();expect(trace!.effort.kind).toBe("safety");expect(trace!.effort.allowance).toBe(80);expect(trace!.effort.spent).toBeLessThanOrEqual(80);expect(trace!.selected?.method).toBe("defend");
 expect(f.mind.safety(f.review(),{task:null,budget:null})).toBeNull();
});
it("an unseen predator causes no safety decision",()=>{const f=cognition({trial:false,inquiry:false});f.e.foundMethods(f.actor,["escape","defend"],0);expect(f.mind.safety(f.review(),{task:null,budget:null})).toBeNull();});
it("minimal contest is directional and injury depends on actual paid exposure",()=>{expect(contestProbability(1,1)).toBe(.5);expect(contestProbability(2,1)).toBe(.8);expect(injuryProbability(.5,true,0,.04)).toBeGreaterThan(injuryProbability(.5,false,0,.04));expect(injuryProbability(.5,false,0,.02)).toBeLessThan(injuryProbability(.5,false,0,.04));});
it("local physical danger, paid defence and suspended purpose survive restore",()=>{
 const s=flatWorld("danger-resume"),a=s.actorKeys()[0]!;s.diagnosticFoundAdult(a);
 const t=task(s,[{family:"Recover",law:"rest",mode:"rest",duration:time(.2)}],"prior-purpose");t.method="rest";const original=s.diagnosticSelect(t);
 s.enableAutonomous(a,{p:0,rT:0,aT:0});s.diagnosticPredator(s.personalReview(a).self.location);s.diagnosticObserve(a,true);s.advanceTo(0);
 const trace=s.decisionPanel(a)!.traces.at(-1)!;expect(trace.causes).toContain("danger");expect(["escape","defend"]).toContain(trace.selected?.method);
 s.advanceTo(time(.02));const r=PhysicalSimulation.restore(s.checkpoint());s.advanceTo(time(.05));r.advanceTo(time(.05));
 expect(r.causalHash()).toBe(s.causalHash());expect(execution(r).task.semanticKey).toBe(original.semanticKey);expect(execution(r).task.method).toBe("rest");
 expect(execution(r).budget.spent.time).toBeGreaterThan(0);expect(r.snapshot().reconciliation.ok).toBe(true);
});
it("bounded route repair rejects spending increases and fixed-operation changes",()=>{
 const s=flatWorld("repair"),a=s.actorKeys()[0]!;s.diagnosticFoundAdult(a);const t=task(s,[{family:"Recover",law:"rest",duration:time(.1)}]);t.method="rest";s.diagnosticSelect(t);s.diagnosticTaskInterrupt(a);
 const x=execution(s),result=boundedRepair(s.personalReview(a),x.task,x.budget,s.counters);expect(result.repair).toBeNull();expect(result.effort.spent).toBeLessThanOrEqual(40);expect(result.reason).toContain("ordinary review");
});
