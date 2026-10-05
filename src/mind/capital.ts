import { RECIPES } from "../content/recipes";
import { EXTRACTION_INDEX } from "../content/extraction";
import { nutrition } from "../content/goods";
import { math } from "../kernel/numerics";
import { QUANTA } from "../kernel/time";
import type { PersonalReview } from "../evidence/read";
import type { BoundOption } from "./types";
import type { ReviewEffort } from "./effort";
import type { Binder } from "./binder";
// A dated service difference, never an intrinsic asset utility or liquidation bonus.
export function capitalOptions(review:PersonalReview,binder:Binder,meter:ReviewEffort):BoundOption[] {
 const out:BoundOption[]=[];
 for(const method of binder.admission("service:capital")) {
  const recipe=method.schema?RECIPES.get(method.schema.law):null;if(!recipe||!meter.spend("descriptor"))continue;
  const option=binder.bind({kind:"have",good:recipe.output,quantity:1,place:"carried"},method);
  if(option.status!=="executable"){out.push(option);continue;}
  const start=option.duration/QUANTA,end=12;
  let benefit=0;
  if(recipe.effect.kind==="rate") {
   if(!meter.spend("retrieval"))break;
   const use=review.places("service-use",2);
   for(const record of use.entries) {
    if(!meter.spend("information"))break;
    const history=record.value as Record<string,number>;
    const law=EXTRACTION_INDEX.method(record.subject.slice(7));if(!law||nutrition(law.good)<=0)continue;
    const known=review.places(`class:resource-kind:${JSON.stringify(law.siteKind)}`,2);
    if(!known.entries.some(e=>Number(review.belief(e.subject,`stock:${law.good}`)?.value??0)>0))continue;
    const rate=review.rateEstimate(law.id,law.siteKind)?.rate??0;
    const duty=Math.min(1,history.workSd!/Math.max(1,(review.time-history.since!)/QUANTA));
    const rows=review.belief("self","items")?.value as unknown as {quality:number;durability:number;effect:{scope:string;coefficient:number}}[]|undefined;
    const existing=Math.max(0,...(rows??[]).filter(i=>i.effect.scope===recipe.effect.scope).map(i=>i.effect.coefficient*i.quality*i.durability));
    const incremental=Math.max(0,recipe.effect.coefficient*.85-existing);
    const wear=Math.max(0,1-.04*duty*(end-start)/2);
    benefit+=rate*duty*incremental*wear*nutrition(law.good);
    option.valuationDependencies=(option.valuationDependencies??[]).concat([{subject:record.subject,property:record.property,version:record.version}]);
   }
  } else if(recipe.effect.kind==="storage") {
   if(!meter.spend("information"))break;
   const carried=Math.max(0,(review.self.carried.stocks.food??0)-review.quietRequirement()*(start+.5));
   const existing=review.places("kind",4).entries.some(e=>e.value==="cache"&&review.belief(e.subject,"own-local-stocks"));
   if(!existing&&end>start)benefit=Math.min(12,carried)*(math.exp(-.20*(end-start))-math.exp(-.35*(end-start)))/(end-start);
  } else if(recipe.effect.kind==="access") {
   // Bounded known consumer posting; unknown opportunities confer no value.
   const consumers=review.places(`method-input:have:${recipe.output}`,2);
   for(const known of consumers.entries) {
    if(!meter.spend("information"))break;
    const law=EXTRACTION_INDEX.method(known.subject.slice(7));if(!law||nutrition(law.good)<=0)continue;
    const sites=review.places(`class:resource-kind:${JSON.stringify(law.siteKind)}`,2);
    const stock=sites.entries.reduce((q,e)=>Math.max(q,Number(review.belief(e.subject,`stock:${law.good}`)?.value??0)),0);
    const rate=review.rateEstimate(law.id,law.siteKind)?.rate??0;
    if(stock>0&&rate>0)benefit=Math.max(benefit,Math.min(review.quietRequirement(),stock/(end-start),rate*.4));
   }
  }
  option.capital=benefit>0&&end>start?[{start,end,materialService:benefit,provenance:`personal dated service difference:${recipe.id}`}]:[];
  option.reason=benefit>0?"paid acquisition with personally evidenced future service difference":"no personally evidenced future service benefit";
  out.push(option);
 }
 return out;
}
