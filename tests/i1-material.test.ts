import {it,expect} from "vitest";
import {flatWorld,task,time,execution} from "./pack0b-fixture";
import {PhysicalSimulation} from "../src/runners/simulation";
function maker(recipe="make-work-tool") {
 const s=flatWorld("i1-material"),a=s.actorKeys()[0]!;
 const to=s.snapshot().actors[0]!.container;
 for(const good of ["wood","stone"])s.diagnosticGoods({kind:"source",source:"initial-endowment",to,good,quantity:recipe==="make-spear"?2:1});
 s.diagnosticFoundAdult(a);
 const t=task(s,[{family:"Work",law:recipe,duration:time(.4)}],recipe,time(2));t.method=recipe;t.objective=recipe;t.authorised.goods={wood:2,stone:2};
 return {s,a,t};
}
it("making spends actual inputs, emits no early item, and completes a paid quality-bearing item",()=>{
 const {s,a,t}=maker();s.diagnosticSelect(t);
 expect(s.personalReview(a).self.carried.stocks.wood??0).toBe(0);
 expect(s.materialSnapshot().work[0]!.progress).toBe(0);
 expect(s.materialSnapshot().items).toHaveLength(0);
 s.advanceTo(time(.1));
 expect(s.materialSnapshot().items).toHaveLength(1);
 expect(s.materialSnapshot().items[0]!.quality).toBeGreaterThanOrEqual(.4);
 expect(s.materialSnapshot().items[0]!.durability).toBe(1);
 expect(execution(s).budget.spent.goods).toMatchObject({wood:1,stone:1});
 expect(s.snapshot().reconciliation.ok).toBe(true);
});
it("unfinished work and held quality survive interruption, observation, restore and a renamed continuation",()=>{
 const {s,a,t}=maker();s.diagnosticSelect(t);s.advanceTo(time(.03));s.diagnosticTaskInterrupt(a);
 const w=s.materialSnapshot().work[0]!,r=PhysicalSimulation.restore(s.checkpoint());
 expect(w.progress).toBeGreaterThan(0);expect(w.complete).toBe(false);
 for(let i=0;i<5;i++){r.snapshot();r.materialSnapshot();}
 r.diagnosticTaskResume(a);s.diagnosticTaskResume(a);r.advanceTo(time(.2));s.advanceTo(time(.2));
 expect(r.causalHash()).toBe(s.causalHash());expect(r.materialSnapshot().work[0]!.qualityDraw).toBe(w.qualityDraw);
 expect(r.materialSnapshot().items).toHaveLength(1);expect(r.snapshot().reconciliation.ok).toBe(true);
});
it("physical tool improves compatible extraction and wears only through paid use",()=>{
 const {s,a,t}=maker();s.diagnosticSelect(t);s.advanceTo(time(.1));
 const original=s.materialSnapshot().items[0]!;
 const site=s.diagnosticObserveResource(a,s.diagnosticResource("food-patch",s.personalReview(a).self.location,12));
 const next=task(s,[{family:"Work",law:"gather",site,duration:time(.1)}],"gather",time(1));next.method="gather";
 s.diagnosticSelect(next);s.advanceTo(time(.2));
 const used=s.materialSnapshot().items[0]!;
 expect(used.durability).toBeCloseTo(original.durability-.04*time(.1)/1048576,12);
 expect(s.personalReview(a).self.carried.stocks.food).toBeGreaterThan(0);
 s.advanceTo(time(.3));expect(s.materialSnapshot().items[0]!.durability).toBe(used.durability);
});
it("an unbacked recipe fails before spending or creating work",()=>{
 const s=flatWorld("no-recipe-input"),a=s.actorKeys()[0]!;s.diagnosticFoundAdult(a);
 const t=task(s,[{family:"Work",law:"make-work-tool",duration:time(.1)}]);t.method="make-work-tool";
 s.diagnosticSelect(t);expect(s.materialSnapshot().work).toHaveLength(0);expect(execution(s).task.status).toBe("blocked");
});
it("the content-only access chain requires its held item",()=>{
 const no=flatWorld("no-access"),a=no.actorKeys()[0]!;no.diagnosticFoundAdult(a);
 const site=no.diagnosticObserveResource(a,no.diagnosticResource("fishing-node",no.personalReview(a).self.location,12));
 const t=task(no,[{family:"Work",law:"fish",site,duration:time(.1)}]);t.method="fish";no.diagnosticSelect(t);
 expect(execution(no).task.status).toBe("blocked");expect(no.personalReview(a).self.carried.stocks.fish??0).toBe(0);
 const {s,a:actor,t:make}=maker("make-spear");s.diagnosticSelect(make);s.advanceTo(time(.3));
 const bound=s.diagnosticObserveResource(actor,s.diagnosticResource("fishing-node",s.personalReview(actor).self.location,12));
 const fish=task(s,[{family:"Work",law:"fish",site:bound,duration:time(.1)}],"fish");fish.method="fish";
 s.diagnosticSelect(fish);s.advanceTo(time(.4));expect(s.personalReview(actor).self.carried.stocks.fish).toBeGreaterThan(0);
});
