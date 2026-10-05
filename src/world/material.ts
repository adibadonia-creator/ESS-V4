import { RECIPES, type RecipeIndex } from "../content/recipes";
import { compareKey, digest } from "../kernel/canonical";
import { draw } from "../kernel/random";
import type { Point } from "../evidence/types";
import type { GoodsLedger } from "./goods";
export interface WorkObject {
  key: string; actor: string; recipe: string; point: Point;
  progress: number; required: number; consumed: Record<string, number>;
  qualityTarget: number; preparation: number; ordinal: number;
  qualityDraw: number; competenceSum: number; workSum: number;
  complete: boolean; reportedCosts: boolean; output: string | null;
}
export interface Item {
  key: string; kind: string; recipe: string; maker: string;
  container: string; quality: number; durability: number;
}
export interface MaterialState { work: WorkObject[]; items: Item[] }
export interface MaterialPort {
  position(actor: string): Point;
  input(actor: string, good: string, quantity: number): void;
  output(actor: string, good: string, quantity: number): void;
  cache(actor: string, point: Point, key: string): string;
  fact(actor: string, subject: string, property: string, value: unknown): void;
}
// Located physical progress and effects. No goals, candidate selection or estimates.
export class MaterialLaw {
  private objects = new Map<string, WorkObject>();
  private byContainer = new Map<string, Item[]>();
  private latest = new Map<string,WorkObject>();
  private nextOrdinal = new Map<string,number>();
  constructor(readonly seed: string, private ledger: GoodsLedger, private port: MaterialPort,
    readonly state: MaterialState = {work: [], items: []}, readonly recipes: RecipeIndex = RECIPES) {
    for (const w of state.work) {
      if (this.objects.has(w.key) || !recipes.get(w.recipe) || ![w.progress,w.required,w.qualityDraw,w.competenceSum,w.workSum].every(Number.isFinite) || w.progress < 0 || w.progress > w.required + 1e-8 || w.required <= 0 || w.qualityDraw < 0 || w.qualityDraw >= 1) throw Error("Invalid work object");
      this.objects.set(w.key,w);
      const base=this.key(w.actor,w.recipe,w.point);const previous=this.latest.get(base);
      if(!previous || w.ordinal>previous.ordinal)this.latest.set(base,w);
      this.nextOrdinal.set(base,Math.max(this.nextOrdinal.get(base)??0,w.ordinal+1));
    }
    for (const item of state.items) {
      if (!recipes.get(item.recipe) || item.quality < .4 || item.quality > 2.5 || item.durability < 0 || item.durability > 1) throw Error("Invalid item");
      this.ledger.get(item.container);
      const rows = this.byContainer.get(item.container) ?? []; rows.push(item); this.byContainer.set(item.container, rows);
    }
  }
  key(actor: string, recipe: string, point: Point) { return digest(["located-work",actor,recipe,point]); }
  pending(actor:string,recipe:string,point=this.port.position(actor)) { const w=this.latest.get(this.key(actor,recipe,point));return w&&!w.complete?w:null; }
  start(actor: string, recipe: string, point = this.port.position(actor), qualityTarget=1, preparation=0) {
    const r = this.recipes.get(recipe); if (!r) return null;
    const base = this.key(actor, recipe, point);
    if(![.75,1,1.5,2,2.5].includes(qualityTarget)||preparation<0||preparation>1||!Number.isFinite(preparation))throw Error("Invalid making parameters");
    const prior=this.latest.get(base);if(prior&&!prior.complete)return prior;
    const ordinal=this.nextOrdinal.get(base)??0,key=digest([base,ordinal]);
    const from = this.ledger.carriedContainer(actor).key;
    if (Object.entries(r.inputs).some(([g,q]) => this.ledger.available(from,g) + 1e-9 < q*(1+preparation))) return null;
    // All inputs validated first; only the ledger writes actual quantities.
    for (const [g,q] of Object.entries(r.inputs)) this.port.input(actor,g,q*(1+preparation));
    const w: WorkObject = {key, actor, recipe, point:{...point},progress:0,required:r.work*(qualityTarget**2+preparation),qualityTarget,preparation,ordinal,
      consumed:Object.fromEntries(Object.entries(r.inputs).map(([g,q])=>[g,q*(1+preparation)])),qualityDraw:draw(this.seed,"quality",[key]),competenceSum:0,workSum:0,complete:false,reportedCosts:false,output:null};
    this.objects.set(key,w);this.latest.set(base,w);this.nextOrdinal.set(base,ordinal+1);this.state.work.push(w);
    this.publish(w); return w;
  }
  settle(key: string, work: number, competence: number) {
    const w = this.objects.get(key); if (!w || !Number.isFinite(work) || work < 0 || !Number.isFinite(competence) || competence < 0) throw Error("Invalid work settlement"); if (w.complete) return {quantity:0,costs:{}};
    const paid = Math.min(work, w.required-w.progress);
    w.progress += paid; w.competenceSum += paid*competence; w.workSum += paid;
    const costs = w.reportedCosts ? {} : {...w.consumed}; w.reportedCosts = true;
    let quantity = 0;
    if (w.progress >= w.required - 1e-9) {
      const r = this.recipes.get(w.recipe)!;
      if (r.effect.kind === "storage") w.output = this.port.cache(w.actor,w.point,w.key);
      else {
        const container = this.ledger.carriedContainer(w.actor).key;
        // Completed items stay located if cargo cannot hold them; never minted early.
        if (this.ledger.load(container) + r.bulk > this.ledger.get(container).capacityCu + 1e-9) { this.publish(w); return {quantity:0,costs}; }
        this.port.output(w.actor,r.output,1);
        const item: Item = {key:digest([w.key,"item"]),kind:r.output,recipe:r.id,maker:w.actor,container,
          quality:Math.min(2.5,Math.max(.4,Math.min(w.qualityTarget,w.competenceSum/Math.max(1e-12,w.workSum))*(1+.15*w.preparation)*.85*(.90+.20*w.qualityDraw))),durability:1};
        this.state.items.push(item); const rows=this.byContainer.get(container)??[];rows.push(item);this.byContainer.set(container,rows);w.output=item.key;
        this.publishItems(w.actor);
      }
      w.complete = true; quantity = 1;
    }
    this.publish(w);return {quantity,costs};
  }
  activeItem(actor: string, scope: string) {
    const held=this.ledger.carriedContainer(actor);
    return (this.byContainer.get(held.key)??[]).filter(i => i.container===held.key && (held.stocks[i.kind]??0)>0 && i.durability>0 && this.recipes.get(i.recipe)?.effect.scope===scope)
      .sort((a,b)=> b.quality*b.durability-a.quality*a.durability || compareKey(a.key,b.key))[0] ?? null;
  }
  effect(actor: string, scope: string) {
    const i=this.activeItem(actor,scope); return i ? 1+this.recipes.get(i.recipe)!.effect.coefficient*i.quality*i.durability : 1;
  }
  wear(actor: string, scope: string, paidSd: number) {
    const item=this.activeItem(actor,scope);if (item) {item.durability=Math.max(0,item.durability-.04*paidSd);this.publishItems(actor);}
  }
  transfer(from:string,to:string,good:string,quantity:number) {
    const rows=this.byContainer.get(from)??[];
    const moved=rows.filter(i=>i.kind===good).sort((a,b)=>compareKey(a.key,b.key)).slice(0,quantity);
    if(!moved.length)return;
    for(const item of moved){rows.splice(rows.indexOf(item),1);item.container=to;const dst=this.byContainer.get(to)??[];dst.push(item);this.byContainer.set(to,dst);}
    for(const key of [from,to]){const c=this.ledger.get(key);if(c.kind==="carried"&&c.custodian)this.publishItems(c.custodian);}
  }
  publishItems(actor: string) {
    // Only currently carried items are exact self evidence; distant objects remain dated.
    const rows=this.byContainer.get(this.ledger.carriedContainer(actor).key)??[];
    this.port.fact(actor,"self","items",rows.map(i=>({...i,effect:this.recipes.get(i.recipe)!.effect})));
  }
  private publish(w: WorkObject) {this.port.fact(w.actor,w.key,"work-progress",{recipe:w.recipe,point:w.point,progress:w.progress,required:w.required,complete:w.complete});}
}
