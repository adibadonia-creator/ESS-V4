import {it,expect} from "vitest";
import {MethodIndex,METHOD_INDEX,type MethodEntry} from "../src/content/methods";
import {ProjectFrontier} from "../src/mind/projects";
import {ReviewEffort,openReview} from "../src/mind/effort";
import {Binder} from "../src/mind/binder";
import {capitalOptions} from "../src/mind/capital";
import {cognition} from "./exploration-fixture";
import {canonical} from "../src/kernel/canonical";
function chain(depth:number,cycle=false) {
 const rows:MethodEntry[]=Array.from({length:depth},(_,i)=>({id:`chain-${i}`,effects:[`have:g${i}`],inputs:i<depth-1?[`have:g${i+1}`]:cycle?["have:g0"]:[],schema:{target:"self",prerequisites:i<depth-1?[{effect:`have:g${i+1}`,good:`g${i+1}`,consumes:true}]:cycle?[{effect:"have:g0",good:"g0",consumes:true}]:[],operation:"make",law:`chain-${i}`,good:`g${i}`,durationSd:.01,cheapCost:.01,locality:"known-local-or-route"}}));
 const catalogue=new MethodIndex(rows),f=cognition({catalogue,trial:false,inquiry:false});f.e.foundMethods(f.actor,rows.map(r=>r.id),0);
 return {f,catalogue};
}
it("a prerequisite chain exceeds one review's EU and advances across restored bounded frontiers without a depth ceiling",()=>{
 const {f,catalogue}=chain(220);
 let state=ProjectFrontier.found({kind:"have",good:"g0",quantity:1,place:"carried"});let leaf:null|{objective:unknown;method:string}=null,total=0,reviews=0;
 while(!leaf&&reviews<40){
  const frontier=new ProjectFrontier(state,catalogue),meter=new ReviewEffort(openReview(f.actor,reviews),f.counts);
  leaf=frontier.advance(f.review(),meter);total+=meter.account.spent;reviews++;
  expect(meter.nodes).toBeLessThanOrEqual(16);expect(meter.account.spent).toBeLessThanOrEqual(600);
  state=JSON.parse(canonical(state));
 }
 expect(leaf?.method).toBe("chain-219");expect(reviews).toBeGreaterThan(1);expect(total).toBeGreaterThan(600);expect(state.frames).toHaveLength(220);
});
it("an unfunded indirect cycle produces neither executable output nor a success declaration",()=>{
 const {f,catalogue}=chain(5,true),p=ProjectFrontier.found({kind:"have",good:"g0",quantity:1,place:"carried"});
 const leaf=new ProjectFrontier(p,catalogue).advance(f.review(),new ReviewEffort(openReview(f.actor,0),f.counts));
 expect(leaf).toBeNull();expect(p.status).toBe("impossible-under-personal-assumptions");expect(p.reason).toContain("cycle");
});
it("project abandonment is durable and prevents further planning spend",()=>{
 const {f,catalogue}=chain(40),p=ProjectFrontier.found({kind:"have",good:"g0",quantity:1,place:"carried"}),frontier=new ProjectFrontier(p,catalogue);
 frontier.abandon("required access lost");const meter=new ReviewEffort(openReview(f.actor,0),f.counts);
 expect(new ProjectFrontier(JSON.parse(canonical(p)),catalogue).advance(f.review(),meter)).toBeNull();expect(meter.account.spent).toBe(0);
});
it("complementary recipe inputs use one generic paid binder prefix",()=>{
 const f=cognition({trial:false,inquiry:false});f.e.foundMethods(f.actor,["wood","stone","make-work-tool"],0);
 f.e.fact(f.actor,"woodsite","location",f.self.location,0,"direct");f.e.fact(f.actor,"woodsite","resource-kind","wood-site",0,"direct");f.e.fact(f.actor,"woodsite","stock:wood",10,0,"direct");
 f.e.fact(f.actor,"self","rate:wood:wood-site",{priorRate:4,priorWeight:1,weight:0,logSum:0,anchorAt:0,samples:1},0,"public rate prior");
 const meter=new ReviewEffort(openReview(f.actor,0),f.counts),binder=new Binder(f.review(),f.state,meter);
 const o=binder.bind({kind:"have",good:"work-tool",quantity:1,place:"carried"},METHOD_INDEX.get("make-work-tool")!);
 expect(o.status).toBe("executable");expect(o.steps.filter(s=>s.family==="Work").map(s=>s.law)).toEqual(["wood","make-work-tool"]);expect(o.goods).toMatchObject({wood:1,stone:1});expect(meter.nodes).toBeLessThanOrEqual(16);
});
it("capital has no intrinsic value when no personally evidenced service use or opportunity exists",()=>{
 const f=cognition({trial:false,inquiry:false});f.self.carried.stocks.wood=2;f.self.carried.stocks.stone=2;
 f.e.foundMethods(f.actor,["make-work-tool","make-spear"],0);
 const meter=new ReviewEffort(openReview(f.actor,0),f.counts),options=capitalOptions(f.review(),new Binder(f.review(),f.state,meter),meter);
 expect(options).toHaveLength(2);expect(options.every(o=>o.capital?.length===0)).toBe(true);expect(meter.account.spent).toBeLessThanOrEqual(600);
});
it("the tool's future material services depend on personal paid use and decline with wear",()=>{
 const f=cognition({trial:false,inquiry:false,rate:6});f.self.carried.stocks.wood=1;f.self.carried.stocks.stone=1;
 f.e.foundMethods(f.actor,["make-work-tool"],0);f.e.fact(f.actor,"method:gather","service-use",{workSd:.4,since:0},0,"own paid history","self");
 const meter=new ReviewEffort(openReview(f.actor,0),f.counts),options=capitalOptions(f.review(),new Binder(f.review(),f.state,meter),meter);
 expect(options[0]!.capital![0]!.materialService).toBeGreaterThan(0);expect(options[0]!.capital![0]!.materialService).toBeLessThan(6*.4*.3*.85);
});
