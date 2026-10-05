import {optionKey} from './binder';
import {QUANTA} from '../kernel/time';
import type {PersonalReview} from '../evidence/read';
import type {MethodIndex} from '../content/methods';
import type {BoundOption} from './types';
import type {ReviewEffort} from './effort';
import {ownedLots,bodySignals} from './signals';
// Standing own nourishment is an explicit part of the selected envelope.
// It provides intake only from already personally accessible backing and never
// takes extra time from another activity or predicts a future harvest as funds.
export function grantMaintenance(review:PersonalReview,option:BoundOption,catalogue:MethodIndex,meter:ReviewEffort){
 if(option.reference||option.status!=='executable'||option.steps.some(s=>s.family==='Transfer'&&s.use==='consume')||!meter.spend('information'))return;
 const good=review.methods('service:nourishment',2).entries.flatMap(e=>catalogue.get(e.subject.slice(7))?.schema?.prerequisites??[])[0]?.good;
 if(!good)return;
 const lots=ownedLots(review,good),funds=new Map(lots.map(l=>[l.subject,l.quantity]));
 // Preserve backing already promised to explicit consumption and deposits.
 for(const step of option.steps)if(step.family==='Transfer'&&step.good===good)funds.set(step.from,Math.max(0,(funds.get(step.from)??0)-step.quantity));
 const b=bodySignals(review);let point={...review.self.location};
 for(const [index,step] of option.steps.entries()){
  if(step.family!=='Work'&&step.family!=='Move')continue;
  const sd=step.family==='Move'?(option.routes[index]?.nodes[option.routes[index]!.goal]?.g??0)/80:step.duration/QUANTA;
  const load=step.family==='Move'?.35:.45;
  const rate=b.quiet+b.classFactor*(load+.3*b.wounds);
  const lot=lots.find(l=>{const p=l.subject===review.self.carried.subject?point:review.belief(l.subject,'location')?.value as {x:number;y:number}|undefined;return (funds.get(l.subject)??0)>0&&p&&(step.family!=='Move'||l.subject===review.self.carried.subject)&&(p.x-point.x)**2+(p.y-point.y)**2<=.08**2;});
  if(lot){const quantity=Math.min(rate*sd,funds.get(lot.subject)!);if(quantity>0){step.maintenance={from:lot.subject,good,rate,quantity};funds.set(lot.subject,funds.get(lot.subject)!-quantity);option.goods[good]=(option.goods[good]??0)+quantity;}}
  if(step.family==='Move')point={...step.target};
 }
 option.key=optionKey(option);
}
