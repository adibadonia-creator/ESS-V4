import {it,expect} from 'vitest';
import {cognition,profile} from './exploration-fixture';
import {MethodIndex,METHOD_INDEX,type MethodEntry} from '../src/content/methods';
import {RecipeIndex,type Recipe} from '../src/content/recipes';
import {ProjectFrontier} from '../src/mind/projects';
import {canonical} from '../src/kernel/canonical';
import {Mind} from '../src/mind/review';

it('ordinary autonomous arbitration invests in evidenced high use and declines an unused tool',()=>{
 function fixture(use:number){const f=cognition({food:40,rate:6,trial:false,inquiry:false});f.self.carried.stocks.wood=1;f.e.foundMethods(f.actor,['make-work-tool'],0);f.e.fact(f.actor,'method:gather','service-use',{workSd:use,since:0},0,'own paid history','self');return f;}
 const high=fixture(.4).deliberate(),low=fixture(0).deliberate();
 expect(high.selected?.method).toBe('make-work-tool');expect(low.selected?.method).not.toBe('make-work-tool');
 expect(high.effort.spent).toBeLessThanOrEqual(600);expect(low.compared.find(x=>x.option.method==='make-work-tool')!.gate).toContain('instrumental');
});
it('a retained deep project reaches an executable leaf through ordinary reviews without a protected action slot',()=>{
 const recipes:Recipe[]=Array.from({length:24},(_,i)=>({id:`transform-${i}`,inputs:i<23?{[`part-${i+1}`]:1}:{},work:.001,output:i===0?'fish':`part-${i}`,bulk:.01,effect:{kind:'none',scope:'',coefficient:0}}));
 const rows:MethodEntry[]=recipes.map((r,i)=>({id:r.id,effects:[`have:${r.output}`],inputs:Object.keys(r.inputs).map(g=>`have:${g}`),schema:{target:'self',operation:'make',law:r.id,good:r.output,prerequisites:Object.entries(r.inputs).map(([good,quantity])=>({effect:`have:${good}`,good,quantity,consumes:true})),durationSd:r.work,cheapCost:r.work,locality:'known-local-or-route'}}));
 const consume=METHOD_INDEX.get('consume')!,rest=METHOD_INDEX.get('rest')!,leisure=METHOD_INDEX.get('leisure')!;
 const catalogue=new MethodIndex([...rows,consume,rest,leisure],new RecipeIndex(recipes));
 const f=cognition({catalogue,food:40,trial:false,inquiry:false});f.e.foundMethods(f.actor,rows.map(r=>r.id),0);
 f.state.projects=[ProjectFrontier.found({kind:'have',good:'fish',quantity:3,place:'carried'})];
 let leaf=false;
 for(let review=0;review<8&&!leaf;review++){
  f.mind.request(f.actor,'periodic',review*2097152+1);const view=f.e.review(f.actor,review*2097152,profile,f.self),admission=f.mind.admit(view,{task:null,budget:null});if(!admission)continue;
  const t=f.mind.deliberate(view,{task:null,budget:null},admission,{denominator:()=>Infinity});
  leaf=t.bindings.some(o=>o.project&&o.steps.some(s=>s.family==='Work'&&s.law==='transform-23'));
  expect(t.effort.spent).toBeLessThanOrEqual(600);
 }
 expect(leaf).toBe(true);expect(f.state.projects![0]!.frames.length).toBe(24);
});
import {flatWorld,task,time,editWorld,execution} from './pack0b-fixture';
import {PhysicalSimulation} from '../src/runners/simulation';
it('autonomous tool selection executes input-paid manufacture and survives active restore',()=>{
 let s=flatWorld('autonomous-investment');s=editWorld(s,b=>{
 b.config.evidence.foundingMethods=b.config.evidence.foundingMethods.filter((id:string)=>!['establish-cache','make-spear','try-compatible','inquire'].includes(id));
 b.config.diagnostic.cacheFoodFu=12;b.configurationHash=__digest(b.config);
 const c=b.goods.containers.find((c:any)=>c.kind==='cache'),tx=b.goods.transactions.find((t:any)=>t.request.kind==='source'&&t.request.to===c.key);c.stocks.food=12;tx.amount=12;tx.request.quantity=12;
 });
 const a=s.actorKeys()[0]!,held=s.snapshot().actors[0]!.container;
 s.diagnosticFoundAdult(a,'M',{capability:{B:1,A:1,C:1,P:1,displayPotential:1,efficiency:1},mastery:{Field:.5,Fight:.5,Make:.5,Organise:.5,Social:.5},initial:{condition:1,fatigue:.1,enjoyment:.6}});
 for(const good of ['wood','stone'])s.diagnosticGoods({kind:'source',source:'initial-endowment',to:held,good,quantity:1});
 s.diagnosticObserveResource(a,s.diagnosticResource('food-patch',s.personalReview(a).self.location,24));
 s.diagnosticFoundUse(a,'gather',.4);s.diagnosticFoundRate(a,'gather','food-patch',6);s.diagnosticFoundRate(a,'make-work-tool','making',.5);
 s.enableAutonomous(a,{p:0,rT:0,aT:0});s.requestReview(a,'periodic');s.advanceTo(1);
 expect(s.decisionPanel(a)!.traces.at(-1)!.selected?.method).toBe('make-work-tool');
 s.advanceTo(time(.02));const r=PhysicalSimulation.restore(s.checkpoint());s.advanceTo(time(.2));r.advanceTo(time(.2));
 expect(r.causalHash()).toBe(s.causalHash());expect(s.materialSnapshot().work.length).toBeGreaterThan(0);
 s.advanceTo(time(.3));expect(s.materialSnapshot().items.some(i=>i.kind==='work-tool')).toBe(true);expect(s.snapshot().reconciliation.ok).toBe(true);
});
import {digest as __digest} from '../src/kernel/canonical';
it('changed declarative spear inputs execute through the same binder, runtime and physical owner',()=>{
 let s=flatWorld('changed-inputs');s=editWorld(s,b=>{
 const recipe=b.config.recipes.find((r:any)=>r.id==='make-spear');recipe.inputs={wood:1,stone:1,fibre:1};
 const method=b.config.methods.find((m:any)=>m.id==='make-spear');method.inputs=Object.keys(recipe.inputs).map(g=>`have:${g}`);method.schema.prerequisites=Object.entries(recipe.inputs).map(([good,quantity])=>({effect:`have:${good}`,good,quantity,consumes:true}));method.schema.durationSd=.4;b.configurationHash=__digest(b.config);
 });
 const a=s.actorKeys()[0]!,held=s.snapshot().actors[0]!.container;s.diagnosticFoundAdult(a);
 for(const good of ['wood','stone','fibre'])s.diagnosticGoods({kind:'source',source:'initial-endowment',to:held,good,quantity:1});
 const config=JSON.parse(s.checkpoint()).body.config,catalogue=new MethodIndex(config.methods,new RecipeIndex(config.recipes));
 const mind=new Mind(s.seed,s.counters,[],catalogue),state=mind.found(a,0,{p:0,rT:0,aT:0});
 const meter=new __ReviewEffort(__openReview(a,0),s.counters),bound=new __Binder(s.personalReview(a),state,meter,catalogue).bind({kind:'have',good:'spear',quantity:1,place:'carried'},catalogue.get('make-spear')!);
 expect(bound.status).toBe('executable');expect(bound.goods).toMatchObject({wood:1,stone:1,fibre:1});
 const t=task(s,bound.steps,'changed-content');t.method=bound.method;t.authorised.goods=bound.goods;s.diagnosticSelect(t);s.advanceTo(time(.3));
 expect(s.materialSnapshot().items.some(i=>i.kind==='spear')).toBe(true);expect(s.personalReview(a).self.carried.stocks.fibre??0).toBe(0);expect(s.snapshot().reconciliation.ok).toBe(true);
});
import {Binder as __Binder} from '../src/mind/binder';
import {ReviewEffort as __ReviewEffort,openReview as __openReview} from '../src/mind/effort';
it('constructed output binding permits physical cache deposit, withdrawal, decay and active restore',()=>{
 const s=flatWorld('cache-output'),a=s.actorKeys()[0]!,held=s.snapshot().actors[0]!.container;s.diagnosticFoundAdult(a);
 s.diagnosticGoods({kind:'source',source:'initial-endowment',to:held,good:'food',quantity:1});
 const t=task(s,[{family:'Work',law:'establish-cache',duration:time(.1)},{family:'Transfer',from:s.personalReview(a).self.carried.subject,to:'$output:0',good:'food',quantity:.8,basis:'own-custody',duration:time(.02)}],'cache-output');t.method='establish-cache';t.authorised.goods={food:1};s.diagnosticSelect(t);s.advanceTo(time(.01));
 const r=PhysicalSimulation.restore(s.checkpoint());s.advanceTo(time(.1));r.advanceTo(time(.1));expect(r.causalHash()).toBe(s.causalHash());
 const constructed=s.snapshot().containers.find(c=>c.key===s.materialSnapshot().work[0]!.output)!;expect(constructed.capacityCu).toBe(12);expect(constructed.stocks.food).toBeGreaterThan(.79);expect(constructed.stocks.food).toBeLessThan(.8);
 const cache=execution(s).task.bindings['$output:0'];const withdraw=task(s,[{family:'Transfer',from:cache,to:s.personalReview(a).self.carried.subject,good:'food',quantity:.4,basis:'own-custody',duration:time(.02)}],'withdraw');withdraw.method='consume';withdraw.objective='withdraw cached food';withdraw.authorised.goods={food:.4};s.diagnosticSelect(withdraw);s.advanceTo(time(.15));
 expect(s.snapshot().containers.find(c=>c.key===constructed.key)!.stocks.food).toBeLessThan(.4);expect(s.snapshot().reconciliation.ok).toBe(true);
});
