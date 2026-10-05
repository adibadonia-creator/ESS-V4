import {math} from "../kernel/numerics";
import {QUANTA} from "../kernel/time";
import type {GoodsLedger,GoodsRequest} from "./goods";
export interface StorageAnchor {at:number;stocks:Record<string,number>;flow:null|{good:string;rate:number}}
export interface StorageState {anchors:Record<string,StorageAnchor>}
export class StorageLaw {
 constructor(private ledger:GoodsLedger,private now:()=>number,private decay:(from:string,good:string,quantity:number)=>void,readonly state:StorageState={anchors:{}}) {
  for(const [key,a] of Object.entries(state.anchors)){ledger.get(key);if(!Number.isSafeInteger(a.at)||a.at>now()||Object.values(a.stocks).some(q=>!Number.isFinite(q)||q<0)||a.flow&&(!Number.isFinite(a.flow.rate)||a.flow.rate<0))throw Error("Invalid storage anchor");}
 }
 rate(container:string,good:string){return this.ledger.nutrition(good)>0?(this.ledger.get(container).kind==="carried"?.35:this.ledger.get(container).kind==="cache"?.20:3):0;}
 touch(container:string){this.state.anchors[container]={at:this.now(),stocks:{...this.ledger.get(container).stocks},flow:null};}
 losses(container:string){
  const a=this.state.anchors[container];if(!a)return {};
  const dt=(this.now()-a.at)/QUANTA,out:Record<string,number>={};
  for(const [good,q] of Object.entries(a.stocks)){
   const lambda=this.rate(container,good);if(!lambda||q<=0)continue;
   const removed=-math.expm1(-lambda*dt),r=a.flow?.good===good?a.flow.rate:0;
   out[good]=Math.max(0,Math.min(q,q*removed-r*(dt-removed/lambda)));
  }return out;
 }
 settle(container:string){const a=this.state.anchors[container];if(a?.flow)return;for(const [good,q] of Object.entries(this.losses(container)))if(q>1e-12)this.decay(container,good,q);this.touch(container);}
 preview(request:GoodsRequest){
  const keys=request.kind==="source"?[request.to]:request.kind==="transfer"?[request.from,request.to]:"from" in request?[request.from]:[];
  const out=new Map<string,Record<string,number>>();
  for(const key of keys){const stock={...this.ledger.get(key).stocks};for(const [good,q] of Object.entries(this.losses(key)))stock[good]=Math.max(0,(stock[good]??0)-q);out.set(key,stock);}return out;
 }
 beginFlow(container:string,good:string,rate:number){this.settle(container);const a=this.state.anchors[container]!;a.flow={good,rate};const q=a.stocks[good]??0,lambda=this.rate(container,good);return lambda>0?math.log1p(lambda*q/rate)/lambda:q/rate;}
 endFlow(container:string){const a=this.state.anchors[container];if(!a?.flow)return;const loss=this.losses(container);a.flow=null;for(const [good,q] of Object.entries(loss))if(q>1e-12)this.decay(container,good,q);this.touch(container);}
}
