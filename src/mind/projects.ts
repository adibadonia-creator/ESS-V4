import { canonical, digest } from "../kernel/canonical";
import type { PersonalReview } from "../evidence/read";
import type { MethodIndex } from "../content/methods";
import type { ReviewEffort } from "./effort";
import { effectOf, type Objective, type BindingStatus } from "./types";
export interface ProjectFrame { effect:string; quantity:number; method:string|null; next:number; parent:number|null }
export interface Project {
  key:string; root:Objective; status:BindingStatus|"abandoned"|"complete";
  frames:ProjectFrame[]; focus:number; visits:number; reason:string;
  dependencies:{subject:string;property:string;version:number}[];
}
// One active prerequisite at a time; immutable ancestor receipts have no depth cap.
// The path index is rebuilt once on restore, then each paid descent is O(1).
export class ProjectFrontier {
  private path = new Map<string,number>();
  constructor(readonly state:Project,private catalogue:MethodIndex) {
    if (!state.frames.length || state.focus<0 || state.focus>=state.frames.length) throw Error("Invalid project frontier");
    let i:number|null=state.focus;
    while(i!==null){const f:ProjectFrame|undefined=state.frames[i];if(!f || this.path.has(f.effect))throw Error("Invalid project ancestry");this.path.set(f.effect,i);i=f.parent;}
  }
  static found(root:Objective):Project {return {key:digest(["project",root]),root,status:"computationally-deferred",frames:[{effect:effectOf(root),quantity:root.quantity,method:null,next:0,parent:null}],focus:0,visits:0,reason:"unexpanded personal prerequisite",dependencies:[]};}
  abandon(reason:string){this.state.status="abandoned";this.state.reason=reason;this.path.clear();}
  advance(review:PersonalReview,meter:ReviewEffort):{objective:Objective;method:string}|null {
    const p=this.state;if(p.status==="abandoned"||p.status==="complete")return null;
    while(meter.spend("binding")) {
      const f=p.frames[p.focus]!;p.visits++;
      if(f.effect.startsWith("have:") && (review.self.carried.stocks[f.effect.slice(5)]??0)>=f.quantity) {
        this.path.delete(f.effect);
        if(f.parent===null){p.status="complete";p.reason="root personally funded";return null;}
        p.focus=f.parent;continue;
      }
      if(!f.method) {
        if(!meter.spend("retrieval"))break;
        const known=review.bestMethod(f.effect)??review.methods(f.effect,1).entries[0];
        const method=known?this.catalogue.get(known.subject.slice(7)):null;
        if(!method?.schema){p.status="epistemically-unresolved";p.reason="no personally known declarative producer";return null;}
        f.method=method.id;p.dependencies.push({subject:known!.subject,property:"known",version:review.version(known!.subject,"known")});
      }
      const m=this.catalogue.get(f.method)!;
      if(review.belief(`method:${f.method}`,"known")?.value!==true){f.method=null;p.status="epistemically-unresolved";p.reason="required method belief revised";return null;}
      const inputs=m.schema!.prerequisites;
      const missing=inputs.findIndex(input=>(review.self.carried.stocks[input.good]??0)<(input.quantity??(m.schema!.operation==="consume"?f.quantity:1)));
      if(missing<0) {
        p.status="known-available";p.reason="personally funded frontier leaf";
        const good=m.schema!.good;
        return {objective:good?{kind:"have",good,quantity:f.quantity,place:"carried"}:p.root,method:m.id};
      }
      const input=inputs[missing]!,quantity=input.quantity??(m.schema!.operation==="consume"?f.quantity:1);
      if(this.path.has(input.effect)){p.status="impossible-under-personal-assumptions";p.reason="unfunded prerequisite cycle";return null;}
      const parent=p.focus;f.next=missing;
      p.frames.push({effect:input.effect,quantity,method:null,next:0,parent});p.focus=p.frames.length-1;this.path.set(input.effect,p.focus);
    }
    p.status="computationally-deferred";p.reason="paid prerequisite frontier resumes next review";return null;
  }
}
export const projectKey=(root:Objective)=>canonical(root);
