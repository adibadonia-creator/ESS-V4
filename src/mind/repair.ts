import { canonical } from "../kernel/canonical";
import { QUANTA } from "../kernel/time";
import { math } from "../kernel/numerics";
import { chargeRoute,routeAllowance,type EffortAccount } from "../kernel/effort";
import { beginPersonalSearch,resumePersonalSearch } from "../runtime/routing";
import type { PersonalReview } from "../evidence/read";
import type { Counters } from "../kernel/counters";
import type { BoundRepair,Task,Budget } from "../runtime/types";
import { bodySignals } from "./signals";
// Means repair is confined to the selected envelope; changed purposes need review.
export function boundedRepair(review:PersonalReview,task:Task,budget:{authorised:Budget;spent:Budget},counts:Counters):{effort:EffortAccount;repair:BoundRepair|null;reason:string} {
 const effort:EffortAccount={key:canonical([review.owner,"repair",review.time]),actor:review.owner,kind:"repair",openedAt:review.time,allowance:40,spent:4,routeExpansions:0,prepaidExpansions:0,expansionsPerEu:64};
 const fail=(reason:string)=>({effort,repair:null,reason});
 const step=task.steps[task.cursor];
 if(!task.envelope||!task.repairScope||!step)return fail("purpose, supplier, rights or fixed operation change requires ordinary review");
 if(task.dependsOn.some(d=>review.version(...JSON.parse(d.key) as [string,string])!==d.version))return fail("required non-route premise revised; ordinary review required");
 if(step.family==="Transfer"){
  if(step.basis!=="own-custody")return fail("new rights basis requires ordinary review");
  const role=`input:${task.cursor}`,allowed=(task.repairScope.bindings[role]??[]).slice(0,4).sort();
  for(const from of allowed){
   if(effort.spent>=effort.allowance)break;effort.spent++;
   const p=from===review.self.carried.subject?review.self.location:review.belief(from,"location")?.value as {x:number;y:number}|undefined;
   const stocks=from===review.self.carried.subject?review.self.carried.stocks:review.belief(from,"own-local-stocks")?.value as Record<string,number>|undefined;
   if(!p||!stocks||(p.x-review.self.location.x)**2+(p.y-review.self.location.y)**2>.08**2||(stocks[step.good]??0)<step.quantity)continue;
   if(step.duration-task.paidForStep>budget.authorised.time-budget.spent.time||step.quantity>(budget.authorised.goods[step.good]??0)-(budget.spent.goods[step.good]??0))return fail("equivalent input exceeds retained funding");
   const suffix=JSON.parse(JSON.stringify(task.steps.slice(task.cursor))) as Task["steps"];(suffix[0] as typeof step).from=from;
   return {effort,repair:{semanticKey:task.semanticKey,objective:task.objective,bindings:{...task.bindings,[role]:from},steps:suffix,dependsOn:task.dependsOn.map(d=>({...d}))},reason:"preauthorised equivalent own input at the same place and terms"};
  }
  return fail("no personally backed authorised equivalent input; ordinary review required");
 }
 if(step.family!=="Move")return fail("fixed operation change requires ordinary review");
 if(!task.repairScope.moveTargets.some(p=>p.x===step.target.x&&p.y===step.target.y))return fail("destination outside selected repair envelope");
 const profile=review.profile,k=(p:{x:number;y:number})=>Math.floor(p.x/profile.cellKm)+profile.width*Math.floor(p.y/profile.cellKm);
 const route=beginPersonalSearch(profile,[],k(review.self.location),k(step.target),step.exploratory,review.traversalPrior(),counts,[],review.geography());
 route.effortAccount=effort.key;
 const before=route.expansions;resumePersonalSearch(route,routeAllowance(effort),counts,routeAllowance(effort),review.geography());chargeRoute(effort,route.expansions-before);
 if(route.status!=="found"||route.deferred)return fail("no bounded personally established detour");
 if(route.path.some(cell=>review.cell(cell)?.passable!==true))return fail("detour would increase unestablished exposure");
 const b=bodySignals(review),travel=route.nodes[route.goal]!.g/(80*math.sqrt(Math.max(.05,b.condition))*math.sqrt(1-b.wounds)*(1-.2*b.fatigue))*QUANTA;
 const suffix=task.steps.slice(task.cursor),remaining=suffix.slice(1).reduce((t,s)=>t+(s.family==="Move"?Infinity:s.duration),0);
 if(Math.ceil(travel)+remaining>budget.authorised.time-budget.spent.time)return fail("detour exceeds retained time authority");
 return {effort,repair:{semanticKey:task.semanticKey,objective:task.objective,bindings:{...task.bindings},steps:JSON.parse(JSON.stringify(suffix)),dependsOn:task.dependsOn.map(d=>({...d})),preparedRoutes:{0:route}},reason:"same-purpose personally established route detour"};
}
