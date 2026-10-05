import { describe, it, expect } from "vitest";
import {
  flatWorld,
  editWorld,
  task,
  time,
  execution,
  QUANTA,
} from "./pack0b-fixture";
import { PhysicalSimulation } from "../src/runners/simulation";
import {
  adultBody,
  materialiseBody,
  reanchorBody,
  accumulateBody,
  closeBody,
  competence,
  learningRates,
  learn,
  quietRequirement,
  leisureWeight,
} from "../src/world/body";
import { stockAt, depletionSd } from "../src/world/resources";
import type { Operation } from "../src/runtime/types";
function consumedFood(s:PhysicalSimulation) {
  const transactions=JSON.parse(s.checkpoint()).body.goods.transactions as {request:{kind:string;sink?:string;good?:string};amount:number}[];
  return transactions.filter(t=>t.request.kind==="sink"&&t.request.sink==="consumption"&&t.request.good==="food").reduce((q,t)=>q+t.amount,0);
}
function fixture(kind = "food-patch", stock = 12) {
  const s = flatWorld("body-physical"),
    a = s.actorKeys()[0]!;
  s.diagnosticFoundAdult(a);
  const k = s.diagnosticResource(
      kind,
      s.personalReview(a).self.location,
      stock,
    ),
    site = s.diagnosticObserveResource(a, k);
  return { s, a, k, site };
}
function selected(
  s: PhysicalSimulation,
  step: Operation,
  id = "physical",
  method = "contact",
) {
  const t = task(s, [step], id, time(10));
  t.objective = id;
  t.method = method;
  t.authorised.goods.food = 10;
  return t;
}
function work(s: PhysicalSimulation, site: string, d = 0.1, method = "gather") {
  return selected(
    s,
    { family: "Work", law: method, site, duration: time(d) },
    "work",
    method,
  );
}
function recover(
  s: PhysicalSimulation,
  mode: "rest" | "leisure",
  duration = 2,
) {
  return selected(
    s,
    { family: "Recover", law: mode, mode, duration: time(duration) },
    mode,
    "recover",
  );
}
describe("Stage-I body laws", () => {
  it("materialisation is pure and analytic and responds to genuine intake changes", () => {
    const b = adultBody("a"),
      before = JSON.stringify(b);
    expect(materialiseBody(b, time(0.35)).c).toBeCloseTo(
      Math.exp(-(time(0.35) / QUANTA) / 0.35),
      13,
    );
    expect(JSON.stringify(b)).toBe(before);
    reanchorBody(b, time(0.35), 0, 2);
    expect(materialiseBody(b, time(1)).c).toBeGreaterThan(0.36);
    expect(quietRequirement(b)).toBeCloseTo(1, 14);
  });
  it("fatigue derives from actual closed work/rest and enjoyment is independent", () => {
    const b = adultBody("a"),
      r = adultBody("r"),
      l = adultBody("l");
    accumulateBody(b, QUANTA, 0.4, false, 0, true);
    closeBody(b, QUANTA);
    accumulateBody(r, QUANTA, 0, true, 0, false);
    closeBody(r, QUANTA);
    accumulateBody(
      l,
      QUANTA,
      0,
      false,
      leisureWeight(l, "same semantic descriptor", 0),
      false,
    );
    closeBody(l, QUANTA);
    expect(b.d).toBeGreaterThan(0.15);
    expect(r.d).toBeLessThan(0.15);
    expect(l.f).toBeGreaterThan(0.65);
    expect(b.f).toBeLessThan(0.65);
  });
  it("closed-form learning separates competence and later mastery", () => {
    const b = adultBody("a"),
      old = competence(b, "Field"),
      rates = learningRates(b, 1, 0, { Field: 1 }, 1);
    learn(b, rates, { Field: 1 }, 1);
    expect(competence(b, "Field")).toBeGreaterThan(old);
    expect(b.practice.Field).toBe(1);
    expect(b.practice.Make).toBe(0);
  });
  it("renewal is joint with constant demand and cannot borrow future stock", () => {
    const s = {
      key: "s",
      kind: "food-patch",
      point: { x: 0, y: 0 },
      capacity: 24,
      renewal: 8,
      anchor: { at: 0, stock: 1, demand: 20 },
    };
    expect(depletionSd(s)).toBeLessThan(0.1);
    expect(stockAt(s, time(1))).toBe(0);
    s.anchor.demand = 0;
    expect(stockAt(s, time(8))).toBeGreaterThan(1);
  });
});
describe("selected physical execution", () => {
  it("Work yields finite ledger goods and paid practice; no free initial output", () => {
    const { s, a, site } = fixture();
    const before = s.analystBody(a)!;
    s.diagnosticSelect(work(s, site));
    expect(s.personalReview(a).self.carried.stocks.food ?? 0).toBe(0);
    s.advanceTo(time(0.1));
    expect(s.personalReview(a).self.carried.stocks.food).toBeGreaterThan(0);
    expect(s.analystBody(a)!.mastery.Field).toBeGreaterThan(
      before.mastery.Field,
    );
    expect(s.snapshot().reconciliation.ok).toBe(true);
    expect(s.counters.autonomousDeliberations).toBe(0);
  });
  it("one generic path executes materially different methods", () => {
    for (const [kind, method, good] of [
      ["food-patch", "gather", "food"],
      ["wood-site", "wood", "wood"],
      ["stone-deposit", "stone", "stone"],
      ["fibre-site", "fibre", "fibre"],
    ]) {
      const { s, site } = fixture(kind!, 12);
      s.diagnosticSelect(work(s, site, 0.1, method));
      s.advanceTo(time(0.1));
      expect(
        s.personalReview(s.actorKeys()[0]!).self.carried.stocks[good!],
      ).toBeGreaterThan(0);
      expect(s.counters.methodRecordsConsulted).toBe(1);
    }
  });
  it("mid-Work restore and host partitions preserve exact anchors, output and history", () => {
    const { s, site } = fixture();
    s.diagnosticSelect(work(s, site));
    s.advanceTo(time(0.04));
    const cp = s.checkpoint();
    const r = PhysicalSimulation.restore(cp);
    s.advanceTo(time(0.1));
    for (let t = time(0.04) + 100; t < time(0.1); t += 100) {
      r.advanceTo(t);
      r.analystBody(r.actorKeys()[0]!);
      r.personalReview(r.actorKeys()[0]!);
    }
    r.advanceTo(time(0.1));
    expect(r.causalHash()).toBe(s.causalHash());
  });
  it("interrupted work settles only its paid prefix and resumes remaining duration", () => {
    const { s, a, site } = fixture();
    s.diagnosticSelect(work(s, site));
    s.advanceTo(time(0.04));
    s.diagnosticTaskInterrupt(a);
    const paid = s.analystBody(a)!.practice.Field;
    expect(paid).toBeCloseTo(time(0.04) / QUANTA, 12);
    const restored = PhysicalSimulation.restore(s.checkpoint());
    s.diagnosticTaskResume(a);
    restored.diagnosticTaskResume(a);
    s.advanceTo(time(0.1));
    restored.advanceTo(time(0.1));
    expect(restored.causalHash()).toBe(s.causalHash());
    expect(s.analystBody(a)!.practice.Field).toBeCloseTo(
      time(0.1) / QUANTA,
      12,
    );
  });
  it("Recover crosses closures without completing, restores exactly, and earns actual rest", () => {
    const { s, a } = fixture();
    s.diagnosticSelect(recover(s, "rest"));
    s.advanceTo(time(0.4));
    const cp = s.checkpoint(),
      r = PhysicalSimulation.restore(cp);
    s.advanceTo(time(1.5));
    r.advanceTo(time(1.5));
    expect(r.causalHash()).toBe(s.causalHash());
    expect(s.currentExecution(a).task?.status).toBe("running");
    expect(s.analystBody(a)!.d).toBeLessThan(0.15);
    s.advanceTo(time(2));
    expect(execution(s).task.status).toBe("done");
  });
  it("unpaid cancellation gives no rest or leisure benefit", () => {
    const { s, a } = fixture();
    s.diagnosticSelect(recover(s, "rest"));
    s.diagnosticTaskAbandon(a);
    s.advanceTo(time(1));
    expect(s.analystBody(a)!.d).toBeGreaterThan(0.15);
  });
  it("food consumption pays once, changes condition, and never refunds its prefix", () => {
    const { s, a } = fixture(),
      v = s.personalView(a),
      cache = v.places.find((e) => e.property === "own-local-stocks")!.subject;
    const t = selected(
      s,
      {
        family: "Transfer",
        duration: time(0.2),
        from: cache,
        to: v.self.carried.subject,
        good: "food",
        quantity: 0.4,
        basis: "own-custody",
        use: "consume",
      },
      "eat",
      "exchange",
    );
    s.diagnosticSelect(t);
    expect(
      (
        s.personalReview(a).belief("self", "body-experience")!.value as Record<
          string,
          number
        >
      ).intake,
    ).toBeGreaterThan(0);
    s.advanceTo(time(0.1));
    s.diagnosticTaskInterrupt(a);
    expect(s.snapshot().reconciliation.totals.food!.sinks).toBeGreaterThan(0.2);
    expect(consumedFood(s)).toBeCloseTo(0.2, 6);
    expect(execution(s).budget.spent.goods.food).toBeCloseTo(0.2, 6);
    const r = PhysicalSimulation.restore(s.checkpoint());
    s.diagnosticTaskResume(a);
    r.diagnosticTaskResume(a);
    s.advanceTo(time(0.2));
    r.advanceTo(time(0.2));
    expect(r.causalHash()).toBe(s.causalHash());
    expect(consumedFood(s)).toBeCloseTo(0.4, 6);
    expect(s.snapshot().reconciliation.ok).toBe(true);
    expect(s.analystBody(a)!.c).toBeGreaterThan(1);
  });
  it("locality, empty sites, unknown methods and cargo gates prevent extraction", () => {
    const { s, a, site } = fixture("stone-deposit", 0);
    s.diagnosticSelect(work(s, site, 0.1, "stone"));
    s.advanceTo(time(0.1));
    expect(s.personalReview(a).self.carried.stocks.stone ?? 0).toBe(0);
    expect(s.analystBody(a)!.practice.Make).toBe(0);
    expect(() =>
      s.diagnosticSelect({ ...work(s, site), method: "invented" }),
    ).toThrow();
  });
  it("hidden capacities and exact mastery never enter the personal review", () => {
    const { s, a } = fixture(),
      r = editWorld(s, (cp) => {
        cp.adultPhysical.bodies[0].capability.C = 2;
        cp.adultPhysical.bodies[0].mastery.Field = 0.8;
      });
    expect(s.personalView(a)).toEqual(r.personalView(a));
    expect(s.personalReview(a).belief("self", "body-experience")).toEqual(
      r.personalReview(a).belief("self", "body-experience"),
    );
  });
});

describe("physical boundaries and information", () => {
  it("cargo stops at a paid boundary without destroying the finite remainder", () => {
    const { s, a, k, site } = fixture("stone-deposit", 12),
      carried = s.snapshot().actors[0]!.container;
    s.diagnosticGoods({
      kind: "source",
      source: "diagnostic-source",
      to: carried,
      good: "food",
      quantity: 2.995,
    });
    s.diagnosticSelect(work(s, site, 0.1, "stone"));
    s.advanceTo(time(0.1));
    const cp = JSON.parse(s.checkpoint()).body,
      q = s.personalReview(a).self.carried.stocks.stone!;
    expect(q).toBeCloseTo(0.0125, 11);
    expect(
      cp.adultPhysical.sites.find((x: any) => x.key === k).anchor.stock + q,
    ).toBeCloseTo(12, 12);
    expect(s.snapshot().actors[0]!.cargoCu).toBeLessThanOrEqual(3 + 1e-12);
    expect(execution(s).task.failure).toBe("cargo full");
  });
  it("contending workers share finite stock symmetrically, independently of selection order", () => {
    function run(reverse: boolean) {
      const s = flatWorld("shared", 2),
        actors = s.actorKeys();
      for (const a of actors) s.diagnosticFoundAdult(a);
      const k = s.diagnosticResource(
          "stone-deposit",
          s.personalReview(actors[0]!).self.location,
          0.06,
        ),
        subjects = actors.map((a) => s.diagnosticObserveResource(a, k));
      for (const i of reverse ? [1, 0] : [0, 1]) {
        const t = work(s, subjects[i]!, 0.1, "stone");
        t.actor = actors[i]!;
        t.taskId += i;
        t.intentionId += i;
        s.diagnosticSelect(t);
      }
      s.advanceTo(time(0.1));
      return {
        s,
        amounts: actors.map(
          (a) => s.personalReview(a).self.carried.stocks.stone ?? 0,
        ),
        practice: actors.map((a) => s.analystBody(a)!.practice.Make),
      };
    }
    const x = run(false),
      y = run(true);
    expect(x.amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(0.06, 12);
    expect(x.amounts[0]).toBeCloseTo(x.amounts[1]!, 12);
    expect(x.amounts).toEqual(y.amounts);
    expect(x.practice).toEqual(y.practice);
    expect(x.s.snapshot().reconciliation.ok).toBe(true);
  });
  it("a remotely remembered site grants no extraction access", () => {
    const { s, site } = fixture(),
      r = editWorld(s, (cp) => {
        cp.actors[0].position.x += 1;
      });
    r.diagnosticSelect(work(r, site));
    r.advanceTo(time(0.1));
    expect(execution(r).task.failure).toBe("outside work radius");
    expect(r.analystBody(r.actorKeys()[0]!)!.practice.Field).toBe(0);
  });
  it("an unknown schema cannot be smuggled behind a known intention method", () => {
    const { s, site } = fixture();
    s.diagnosticSelect(
      selected(
        s,
        { family: "Work", law: "invented", site, duration: time(0.1) },
        "unknown",
        "contact",
      ),
    );
    expect(execution(s).task.failure).toBe(
      "known method/site binding unavailable",
    );
  });
  it("future renewal cannot fund an empty current claim or select a new task", () => {
    const { s, a, site } = fixture("food-patch", 0);
    s.diagnosticSelect(work(s, site));
    s.advanceTo(time(2));
    expect(s.personalReview(a).self.carried.stocks.food ?? 0).toBe(0);
    expect(s.counters.autonomousDeliberations).toBe(0);
    expect(s.counters.workSegmentsStarted).toBe(0);
  });
  it("unpaid abandonment cannot teach or extract", () => {
    const { s, a, site } = fixture();
    s.diagnosticSelect(work(s, site));
    s.diagnosticTaskAbandon(a);
    s.advanceTo(time(0.2));
    expect(s.analystBody(a)!.practice.Field).toBe(0);
    expect(s.personalReview(a).self.carried.stocks.food ?? 0).toBe(0);
  });
  it("long Work preserves purpose and exact continuation over staggered closure", () => {
    const { s, a, site } = fixture("fibre-site", 12);
    s.diagnosticSelect(work(s, site, 1.4, "fibre"));
    s.advanceTo(time(0.4));
    const r = PhysicalSimulation.restore(s.checkpoint());
    s.advanceTo(time(1.4));
    for (let q = time(0.4) + 9191; q < time(1.4); q += 9191) {
      r.advanceTo(q);
      r.snapshot();
      r.personalReview(a);
    }
    r.advanceTo(time(1.4));
    expect(r.causalHash()).toBe(s.causalHash());
    expect(s.analystBody(a)!.practice.Field).toBeCloseTo(
      (0.7 * time(1.4)) / QUANTA,
      11,
    );
    expect(execution(s).task.status).toBe("done");
    expect(s.counters.representativeBodyClosures).toBeGreaterThan(0);
  });
  it("rest interruption preserves only paid credit and restores/resumes exactly", () => {
    const { s, a } = fixture();
    s.diagnosticSelect(recover(s, "rest", 1.4));
    s.advanceTo(time(0.2));
    s.diagnosticTaskInterrupt(a);
    const r = PhysicalSimulation.restore(s.checkpoint());
    s.advanceTo(time(0.4));
    r.advanceTo(time(0.4));
    s.diagnosticTaskResume(a);
    r.diagnosticTaskResume(a);
    s.advanceTo(time(1.6));
    r.advanceTo(time(1.6));
    expect(r.causalHash()).toBe(s.causalHash());
    expect(execution(s).budget.spent.time).toBe(time(1.4));
  });
  it("backed food exhaustion ends intake without future debits", () => {
    const { s, a } = fixture(),
      v = s.personalView(a);
    s.diagnosticGoods({
      kind: "source",
      source: "diagnostic-source",
      to: s.snapshot().actors[0]!.container,
      good: "food",
      quantity: 0.1,
    });
    s.diagnosticSelect(
      selected(
        s,
        {
          family: "Transfer",
          duration: time(0.2),
          from: v.self.carried.subject,
          to: v.self.carried.subject,
          good: "food",
          quantity: 0.4,
          basis: "own-custody",
          use: "consume",
        },
        "limited meal",
        "exchange",
      ),
    );
    s.advanceTo(time(0.2));
    expect(s.snapshot().reconciliation.totals.food!.sinks).toBeCloseTo(0.1, 12);
    expect(s.analystBody(a)!.intake).toBe(0);
    expect(execution(s).task.failure).toBe("food exhausted");
  });
  it("a supplied seeded wound heals analytically; unsupplied wounds do not", () => {
    const b = adultBody("wound");
    b.anchor.w = 0.4;
    reanchorBody(b, 0, 0, 2);
    const before = JSON.stringify(b);
    expect(materialiseBody(b, time(0.2)).w).toBeCloseTo(
      0.4 - time(0.2) / QUANTA / 2,
      13,
    );
    expect(JSON.stringify(b)).toBe(before);
    reanchorBody(b, time(0.2), 0, 0);
    expect(materialiseBody(b, time(0.4)).w).toBe(
      materialiseBody(b, time(0.2)).w,
    );
  });
  it("Recover requires a passable location and does not grant enjoyment to Work", () => {
    const { s, a } = fixture(),
      r = editWorld(s, (cp) => {
        cp.terrain.passable.fill(0);
      });
    r.diagnosticSelect(recover(r, "leisure"));
    expect(execution(r).task.failure).toBe(
      "no physically legitimate recovery location",
    );
    expect(r.analystBody(a)!.f).toBe(0.65);
  });
  it("heterogeneity affects paid performance, not the other actor's private knowledge", () => {
    const s = flatWorld("heterogeneous", 2),
      [a, b] = s.actorKeys();
    s.diagnosticFoundAdult(a!);
    const p = adultBody(b!);
    p.capability.C = 1.7;
    p.mastery.Field = 0.75;
    s.diagnosticFoundAdult(b!, "M", {
      capability: p.capability,
      mastery: p.mastery,
    });
    const k = s.diagnosticResource(
        "food-patch",
        s.personalReview(a!).self.location,
        24,
      ),
      subjects = [a, b].map((x) => s.diagnosticObserveResource(x!, k));
    const before = s.personalView(a!);
    const changed = editWorld(s, (cp) => {
      cp.adultPhysical.bodies.find((x: any) => x.actor === b).capability.P = 2;
    });
    expect(changed.personalView(a!)).toEqual(before);
    for (const [i, x] of [a, b].entries()) {
      const t = work(s, subjects[i]!);
      t.actor = x!;
      t.taskId += i;
      s.diagnosticSelect(t);
    }
    s.advanceTo(time(0.1));
    expect(s.personalReview(b!).self.carried.stocks.food!).toBeGreaterThan(
      s.personalReview(a!).self.carried.stocks.food!,
    );
    expect(
      s.personalReview(a!).rateEstimate("gather", "food-patch"),
    ).not.toEqual(s.personalReview(b!).rateEstimate("gather", "food-patch"));
  });
  it("enjoyment has no direct work multiplier and labels preserve familiarity", () => {
    const { s, a, site } = fixture(),
      r = editWorld(s, (cp) => {
        cp.adultPhysical.bodies[0].f = 0.05;
      });
    s.diagnosticSelect(work(s, site));
    r.diagnosticSelect(work(r, site));
    s.advanceTo(time(0.1));
    r.advanceTo(time(0.1));
    expect(s.personalReview(a).self.carried.stocks).toEqual(
      r.personalReview(a).self.carried.stocks,
    );
    const x = fixture(),
      y = fixture();
    const tx = recover(x.s, "leisure", 1.2),
      ty = {
        ...recover(y.s, "leisure", 1.2),
        taskId: "renamed task",
        intentionId: "renamed intention",
        objective: "renamed pleasure",
      };
    x.s.diagnosticSelect(tx);
    y.s.diagnosticSelect(ty);
    x.s.advanceTo(time(1.2));
    y.s.advanceTo(time(1.2));
    expect(x.s.analystBody(x.a)!.f).toBe(y.s.analystBody(y.a)!.f);
    expect(
      JSON.parse(x.s.checkpoint()).body.adultPhysical.bodies[0].exposures,
    ).toEqual(
      JSON.parse(y.s.checkpoint()).body.adultPhysical.bodies[0].exposures,
    );
  });
  it("rejects incompatible or corrupt body/resource continuation state", () => {
    const { s } = fixture();
    expect(() =>
      editWorld(s, (cp) => {
        cp.versions.schema--;
      }),
    ).toThrow("Incompatible");
    expect(() =>
      editWorld(s, (cp) => {
        cp.adultPhysical.bodies[0].d = 2;
      }),
    ).toThrow("Invalid");
    expect(() =>
      editWorld(s, (cp) => {
        cp.adultPhysical.sites[0].anchor.demand = 1;
      }),
    ).toThrow("demand/backing");
  });
});

describe("experienced estimation and later learning", () => {
  it("learning cannot rewrite the completed prefix but increases later expression", () => {
    const { s, a, site } = fixture();
    s.diagnosticSelect(work(s, site));
    const initial = JSON.parse(s.checkpoint()).body.adultPhysical.segments[0]
      .rate;
    s.advanceTo(time(0.1));
    expect(s.personalReview(a).self.carried.stocks.food).toBeCloseTo(
      (initial * time(0.1)) / QUANTA,
      12,
    );
    const old = editWorld(s, (cp) => {
      cp.adultPhysical.bodies[0].mastery.Field = 0.5;
    });
    for (const sim of [s, old]) {
      const t = work(sim, site);
      t.taskId = "later-work";
      t.intentionId = "later-work";
      t.semanticKey = "later-work";
      t.objective = "later work";
      sim.diagnosticSelect(t);
    }
    expect(
      JSON.parse(s.checkpoint()).body.adultPhysical.segments[0].rate,
    ).toBeGreaterThan(
      JSON.parse(old.checkpoint()).body.adultPhysical.segments[0].rate,
    );
  });
  it("rate inference deduplicates provenance, combines in log space and ages toward its prior", async () => {
    const { EvidenceService } = await import("../src/evidence/service"),
      { counters } = await import("../src/kernel/counters");
    const e = new EvidenceService("rate", counters());
    e.register("a");
    e.observePerformance(
      "a",
      "gather",
      "food-patch",
      0.3,
      0.1,
      "original",
      0,
      1,
      1,
    );
    e.observePerformance(
      "a",
      "gather",
      "food-patch",
      0.3,
      0.1,
      "original",
      0,
      1,
      1,
    );
    const p = e.state.people[0]!;
    expect(Object.values(p.rateStatistics)[0]!.samples).toBe(1);
    expect(Object.keys(p.rateProvenance)).toHaveLength(1);
    e.observePerformance(
      "a",
      "gather",
      "food-patch",
      0.9,
      0.1,
      "independent",
      0,
      1,
      1,
    );
    expect(Object.values(p.rateStatistics)[0]!.samples).toBe(2);
    const contradictory = Object.values(p.rateProvenance);
    expect(contradictory).toHaveLength(2);
    const combined = Object.values(p.rateStatistics)[0]!;
    expect(combined.logSum).toBeCloseTo(
      contradictory.reduce((sum, x) => sum + x.weight * x.logRate, 0),
      12,
    );
    e.observePerformance(
      "a",
      "gather",
      "food-patch",
      0.6,
      0.1,
      "original",
      0,
      1,
      1,
    );
    expect(Object.values(p.rateStatistics)[0]!.samples).toBe(2);
    expect(Object.keys(p.rateProvenance)).toHaveLength(2);
    const self = {
      identity: "a",
      location: { x: 0.1, y: 0.1 },
      currentLeg: null,
      carried: { subject: "carried", stocks: {} },
      reservations: [],
    };
    const now = e.review(
        "a",
        0,
        { width: 2, height: 2, cellKm: 1, regionCells: 2 },
        self,
      ),
      later = e.review(
        "a",
        time(30),
        { width: 2, height: 2, cellKm: 1, regionCells: 2 },
        self,
      );
    expect(
      Math.abs(later.rateEstimate("gather", "food-patch")!.rate - 6),
    ).toBeLessThan(
      Math.abs(now.rateEstimate("gather", "food-patch")!.rate - 6),
    );
  });
});

it("catalogue extension adds no ordinary extraction lookup visits or personal acquisition", async () => {
  const { ExtractionIndex } = await import("../src/content/extraction"),
    { default: data } = await import("../src/content/extraction.json");
  let baseVisits = 0,
    expandedVisits = 0;
  const base = new ExtractionIndex(data),
    expanded = new ExtractionIndex({
      ...data,
      methods: [
        ...data.methods,
        ...Array.from({ length: 10000 }, (_, i) => ({
          ...data.methods[0]!,
          id: `irrelevant:${i}`,
        })),
      ],
    });
  expect(base.method("gather", () => baseVisits++)).toEqual(
    expanded.method("gather", () => expandedVisits++),
  );
  expect(baseVisits).toBe(1);
  expect(expandedVisits).toBe(1);
  const { s, a } = fixture();
  expect(s.personalReview(a).belief("method:irrelevant:1", "known")).toBeNull();
});

it("compulsory service is declared independently of paid work and changes only enjoyment decay", () => {
  const voluntary = fixture(),
    compulsory = fixture();
  voluntary.s.diagnosticSelect(work(voluntary.s, voluntary.site));
  const t = work(compulsory.s, compulsory.site);
  (t.steps[0] as Extract<Operation, { family: "Work" }>).compulsory = true;
  compulsory.s.diagnosticSelect(t);
  voluntary.s.advanceTo(time(1));
  compulsory.s.advanceTo(time(1));
  expect(compulsory.s.analystBody(compulsory.a)!.f).toBeLessThan(
    voluntary.s.analystBody(voluntary.a)!.f,
  );
  expect(compulsory.s.personalReview(compulsory.a).self.carried.stocks).toEqual(
    voluntary.s.personalReview(voluntary.a).self.carried.stocks,
  );
});
