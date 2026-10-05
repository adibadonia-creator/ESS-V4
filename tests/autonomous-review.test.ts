import { describe, it, expect } from "vitest";
import { EvidenceService, clone } from "../src/evidence/service";
import { counters } from "../src/kernel/counters";
import { canonical, digest } from "../src/kernel/canonical";
import { QUANTA, time } from "../src/kernel/time";
import { math } from "../src/kernel/numerics";
import {
  MethodIndex,
  METHOD_INDEX,
  type MethodEntry,
} from "../src/content/methods";
import content from "../src/content/physical.json";
import { Mind, continuation } from "../src/mind/review";
import { Binder, optionKey } from "../src/mind/binder";
import { openReview, ReviewEffort } from "../src/mind/effort";
import { forecast } from "../src/mind/forecast";
import {
  arbitrate,
  heldErrors,
  preference,
  feasibility,
} from "../src/mind/arbiter";
import { drives, bodySignals } from "../src/mind/signals";
import { conditionSegment, starvationHazard } from "../src/laws/physiology";
import { PhysicalSimulation } from "../src/runners/simulation";
import { launchAutonomousFixture } from "../src/runners/autonomousFixture";
import { resolveConfig } from "../src/content/profile";
import type { BoundOption, Compared, Dispositions } from "../src/mind/types";
import type { Value } from "../src/evidence/types";
import type { Task } from "../src/runtime/types";
import { editWorld, flatWorld } from "./pack0b-fixture";
const precision = { denominator: () => 1 };
const profile = { width: 32, height: 18, cellKm: 0.1, regionCells: 8 };
function harness(
  options: {
    food?: number;
    c?: number;
    d?: number;
    f?: number;
    seed?: string;
    catalogue?: MethodIndex;
    methods?: string[];
  } = {},
) {
  const seed = options.seed ?? "review-proof",
    actor = digest(["focal", seed]),
    counts = counters();
  const catalogue = options.catalogue ?? METHOD_INDEX;
  const e = new EvidenceService(
    seed,
    counts,
    undefined,
    undefined,
    0.8,
    catalogue,
  );
  e.register(actor);
  e.foundMethods(
    actor,
    options.methods ?? ["consume", "rest", "leisure", "gather"],
    0,
  );
  e.foundTraversalPrior(
    actor,
    { speedFactor: 1, uncertainty: 1, context: "public" },
    0,
  );
  const point = { x: 0.35, y: 0.85 },
    self = {
      identity: actor,
      location: point,
      currentLeg: null,
      carried: { subject: "own", stocks: { food: 0 } },
      reservations: [],
    };
  e.fact(actor, "cache", "location", point, 0, "own local receipt", "self");
  e.fact(
    actor,
    "cache",
    "own-local-stocks",
    { food: options.food ?? 4 },
    0,
    "own local receipt",
    "self",
  );
  e.fact(actor, "patch", "location", point, 0, "direct observation");
  e.fact(
    actor,
    "patch",
    "resource-kind",
    "food-patch",
    0,
    "direct observation",
  );
  e.fact(actor, "patch", "stock:food", 24, 0, "direct observation");
  e.fact(
    actor,
    "self",
    "body-experience",
    {
      class: "M",
      condition: options.c ?? 1,
      fatigue: options.d ?? 0.15,
      enjoyment: options.f ?? 0.65,
      wounds: 0,
      intake: 0,
      activityLoad: 0,
      satiation: 0,
      familiarity: {},
      intervalStart: 0,
      effortSd: 0,
      restSd: 0,
      pleasantSd: 0,
      compulsorySd: 0,
      leisureSd: 0,
    } as unknown as Value,
    0,
    "own experience",
    "self",
  );
  const k = 3 + 32 * 8;
  e.observe(
    actor,
    {
      terrain: [
        { cell: k, terrain: 0, passable: true, speed: 1, detection: 1 },
      ],
      facts: [],
      footprint: { duration: 0, cells: [{ cell: k, detection: 1 }] },
    },
    0,
    "local observation",
    true,
  );
  const mind = new Mind(seed, counts, [], catalogue),
    state = mind.found(actor, 0, { p: 0, rT: 0, aT: 0 });
  const review = (at = 0) => e.review(actor, at, profile, self);
  const decide = (
    execution: { task: Task | null; budget: any } = {
      task: null,
      budget: null,
    },
    at = 0,
  ) => {
    mind.request(actor, "periodic", at);
    const admission = mind.admit(review(at), execution)!;
    return mind.deliberate(review(at), execution, admission, precision);
  };
  return { actor, counts, e, mind, state, review, decide, self };
}
function incumbent(h: ReturnType<typeof harness>, work = 0.1) {
  const steps: Task["steps"] = [
    { family: "Work", law: "gather", site: "patch", duration: time(work) },
    {
      family: "Transfer",
      from: "cache",
      to: "cache",
      good: "food",
      quantity: 3,
      duration: time(3 / 1.1),
      basis: "own-custody",
      use: "consume",
    },
  ];
  const t = {
    actor: h.actor,
    semanticKey: "paid incumbent",
    taskId: "incumbent",
    intentionId: "incumbent",
    objective: "existing acquired food end",
    method: "gather",
    steps,
    bindings: { target: "patch" },
    dependsOn: [],
    authorised: { time: time(4), goods: { food: 3 } },
    reserve: [],
    source: "bounded-personal-review",
    cursor: 0,
    status: "running",
    paidForStep: 0,
    physicalStepOutput: 0,
    bindingRevision: 0,
    reservations: [],
    progress: [],
    active: null,
    route: null,
    routeCursor: 0,
    failure: null,
    interruption: null,
    envelope: {
      purpose: "existing acquired food end",
      end: { kind: "have", good: "food", place: "own", quantity: work * 6 },
      targets: ["patch"],
      quantity: { estimate: work * 6, low: work * 4.5, high: work * 7.5 },
      riskCeiling: 0.12,
      locationBasis: "known local",
      rightsBasis: "own-custody-and-public-extraction",
      stop: ["end reached"],
      escalation: ["invalid assumption"],
      reviewAccount: "existing review",
    },
  } as Task;
  return {
    task: t,
    budget: { authorised: t.authorised, spent: { time: 0, goods: {} } },
  };
}
function simulation(seed = "autonomous-proof", adults = 1) {
  const s = new PhysicalSimulation(
    seed,
    resolveConfig(
      { width: 32, height: 18, regionCells: 8 },
      { actors: adults, sites: 3 },
    ),
  );
  launchAutonomousFixture(s);
  return s;
}
describe("Pack 0C2 one bounded personal mind", () => {
  it("nominates typed ends independently from means; founding dispositions are keyed, independent and immutable", () => {
    const h = harness();
    const objectives = drives(h.review()).map((d) => d.objective);
    expect(objectives.map((o) => o.kind)).toEqual([
      "service",
      "recovered",
      "enjoyed",
    ]);
    expect(canonical(objectives)).not.toMatch(/consume|gather|Recover|Work/);
    const a = new Mind("prefs", counters()),
      b = new Mind("prefs", counters());
    expect(a.found("person", 0)).toEqual(b.found("person", 0));
    const d = a.person("person")!.dispositions;
    expect(new Set(Object.values(d)).size).toBe(3);
    expect(() => {
      d.p = 1;
    }).toThrow();
    expect(a.person("person")!.periodicAt).toBeGreaterThan(0);
    expect(a.person("person")!.periodicAt).toBeLessThan(2 * QUANTA);
  });
  it("chooses existing food through the risk gate without a diagnostic task", () => {
    const h = harness({ c: 0.2 });
    const t = h.decide();
    expect(t.selected?.source).toBe("bounded-personal-review");
    expect(t.selected?.steps[0]?.family).toBe("Transfer");
    expect(t.rule).toBe("safe-response");
    expect(t.compared[0]!.option.reference).toBe(true);
    expect(t.compared.find((x) => x.option.key === t.winner)?.riskPass).toBe(
      true,
    );
    expect(t.evidence.some((e) => e.subject === "cache")).toBe(true);
    expect(t.evidence.some((e) => e.property === "body-experience")).toBe(true);
    expect(t.premises.quietEstimate).toBe(1);
  });
  it("binds required food to a personally known producer and later consumption", () => {
    const h = harness({ food: 0 }),
      t = h.decide();
    expect(t.selected?.steps.map((s) => s.family)).toEqual([
      "Work",
      "Transfer",
    ]);
    expect(t.selected?.bindings).toMatchObject({ "target:0": "patch" });
    expect(
      t.bindings.find((b) => b.method === "consume")!.prerequisites,
    ).toContainEqual({ effect: "have:food", status: "executable" });
  });
  it("values leisure deficit relief through the same consequences and does not award a high-enjoyment action bonus", () => {
    const low = harness({ f: 0.05 }),
      high = harness({ f: 0.95 });
    const lt = low.decide(incumbent(low)),
      ht = high.decide(incumbent(high));
    const value = (t: typeof lt) => {
      const x = t.compared.find(
        (x) => x.option.method === "leisure" && !x.option.reference,
      )!;
      return (
        preference(
          x.consequences,
          t.compared[0]!.consequences,
          { p: 0, rT: 0, aT: 0 },
          1,
          x.errors.map(() => 0),
        ) - x.consequences.tail.error
      );
    };
    expect(value(lt)).toBeGreaterThan(0.05);
    expect(value(ht)).toBeLessThan(0.05);
    expect(lt.selected?.method).toBe("leisure");
  });
  it("can choose recovery over a productive incumbent from fatigue consequences with food backing", () => {
    const h = harness({ d: 0.9, f: 0.99, seed: "rest-proof" }),
      execution = incumbent(h);
    execution.task.steps = [
      {
        family: "Transfer",
        from: "cache",
        to: "cache",
        good: "food",
        quantity: 1,
        duration: time(1 / 1.1),
        basis: "own-custody",
        use: "consume",
      },
      { family: "Work", law: "gather", site: "patch", duration: time(0.3) },
      {
        family: "Transfer",
        from: "cache",
        to: "cache",
        good: "food",
        quantity: 2,
        duration: time(2 / 1.1),
        basis: "own-custody",
        use: "consume",
      },
    ];
    const t = h.decide(execution);
    const r = t.compared.find(
      (x) => x.option.method === "rest" && !x.option.reference,
    )!;
    expect(r.feasible).toBe(true);
    expect(r.riskPass).toBe(true);
    expect(r.consequences.blocks.at(-1)!.fatigue).toBeLessThan(
      t.compared[0]!.consequences.blocks.at(-1)!.fatigue,
    );
    expect(t.selected?.method).toBe("rest");
  });
  it("marginal alternatives retain continuation; unsafe reference bypasses margin; none safe uses least harm before value", () => {
    const h = harness(),
      t = h.decide(),
      ref = clone(t.compared[0]!);
    ref.feasible = true;
    ref.riskPass = true;
    ref.value = 0;
    const alternative = clone(ref);
    alternative.option.reference = false;
    alternative.option.key = "alt";
    alternative.value = 0.05;
    expect(arbitrate([ref, alternative], 0.12).winner).toBe(ref);
    alternative.value = 0.050001;
    expect(arbitrate([ref, alternative], 0.12).winner).toBe(alternative);
    ref.riskPass = false;
    alternative.value = -4;
    expect(arbitrate([ref, alternative], 0.12).rule).toBe("safe-response");
    alternative.riskPass = false;
    ref.consequences.severeHazard = 2;
    alternative.consequences.severeHazard = 1;
    expect(arbitrate([ref, alternative], 0.12).winner).toBe(alternative);
  });
  it("subtracts sunk paid prefixes and physical consumed quantity from continuation", () => {
    const h = harness(),
      execution = incumbent(h, 1),
      task = execution.task;
    task.cursor = 1;
    task.paidForStep = time(0.5);
    execution.budget.spent.time = time(1.5);
    const ref = continuation(h.review(), execution),
      step = ref.steps[0]!;
    expect(step.family).toBe("Transfer");
    if (step.family === "Transfer")
      expect(step.quantity).toBeCloseTo(3 * (1 - time(0.5) / time(3 / 1.1)));
    expect(ref.duration).toBe(time(2.5));
  });
  it("keeps analytic starvation entry/recovery and equivalent three-SD hazard correct", () => {
    const duration = 0.8,
      seg = conditionSegment(1, 0, 1, duration);
    const exact = starvationHazard(1, seg.target, seg.tau, duration);
    let numeric = 0;
    for (let i = 0; i < 10000; i++) {
      const c = conditionSegment(1, 0, 1, (duration * (i + 0.5)) / 10000).c;
      numeric += (4 * (Math.max(0, 0.35 - c) / 0.35) ** 2 * duration) / 10000;
    }
    expect(exact).toBeCloseTo(numeric, 7);
    const recovery = conditionSegment(0.1, 1.1, 1, 0.8);
    expect(
      starvationHazard(0.1, recovery.target, recovery.tau, 0.8),
    ).toBeGreaterThan(0);
    const h = harness({ food: 0, c: 0 }),
      o = continuation(h.review(), { task: null, budget: null });
    const c = forecast(
      h.review(),
      o,
      new ReviewEffort(openReview(h.actor, 0), h.counts),
    )!;
    expect(c.severeProbability).toBeCloseTo(-math.expm1(-12));
    expect(c.blocks).toHaveLength(6);
    expect(
      c.blocks.every(
        (b) =>
          b.dependantCoverage === 0 &&
          b.relationshipExperience === 0 &&
          b.encounterValue === 0,
      ),
    ).toBe(true);
    expect(c.assent).toEqual([]);
    expect(c.commitments).toEqual([]);
  });
  it("does not let future output fund an earlier input, inaccessible backing, stale assumptions or unknown routes", () => {
    const h = harness({ food: 0 }),
      t = h.decide(),
      x = clone(t.compared.find((x) => x.option.method === "consume")!);
    expect(x.feasible).toBe(true);
    x.option.steps.reverse();
    expect(feasibility(h.review(), x, true)).toContain("backing");
    x.option.steps.reverse();
    x.option.dependencies.push({
      subject: "never",
      property: "seen",
      version: 1,
    });
    expect(feasibility(h.review(), x, true)).toContain("stale");
    x.option.dependencies.pop();
    x.option.steps.unshift({
      family: "Move",
      target: { x: 2, y: 1 },
      exploratory: false,
    });
    expect(feasibility(h.review(), x, true)).toContain("route");
    x.option.steps.shift();
    const consume = x.option.steps.find((s) => s.family === "Transfer")!;
    if (consume.family === "Transfer") consume.from = "hidden";
    expect(feasibility(h.review(), x, true)).toContain("inaccessible");
  });
  it("holds keyed errors across reevaluation, labels and restore; exact capacity affects precision only", () => {
    const h = harness(),
      t = h.decide(),
      x = t.compared[1]!;
    const first = heldErrors(
      "proof",
      h.actor,
      x.option.key,
      0,
      x.consequences,
      0,
      precision,
    );
    expect(
      heldErrors(
        "proof",
        h.actor,
        x.option.key,
        0,
        x.consequences,
        0,
        precision,
      ),
    ).toEqual(first);
    const renamed = clone(x.option);
    renamed.method = "another label";
    expect(optionKey(renamed)).toBe(optionKey(x.option));
    expect(
      heldErrors("proof", h.actor, x.option.key, 0, x.consequences, 0, {
        denominator: () => 2,
      }),
    ).toEqual(first.map((x) => x / 2));
    expect(
      heldErrors(
        "proof",
        h.actor,
        x.option.key,
        0,
        x.consequences,
        null,
        precision,
      ),
    ).toEqual(first.map((x) => x * 2));
    expect(canonical(h.review().belief("self", "body-experience"))).not.toMatch(
      /capability|mastery|efficiency/,
    );
    const restored = new Mind("review-proof", counters(), clone(h.mind.state));
    expect(restored.person(h.actor)!.traces).toEqual(h.state.traces);
  });
  it("one 600-EU account bounds nesting and preserves computation deferral", () => {
    const h = harness(),
      view = h.review();
    h.mind.request(h.actor, "periodic", 0);
    const admission = h.mind.admit(view, { task: null, budget: null })!;
    // Earlier work in this admitted account leaves ten EU; nested work must not reopen it.
    admission.account.spent = 590;
    const t = h.mind.deliberate(
      view,
      { task: null, budget: null },
      admission,
      precision,
    );
    expect(t.effort.spent).toBeLessThanOrEqual(600);
    expect(t.effort.key).toBe(admission.account.key);
    expect(
      t.bindings.some((o) => o.status === "computationally-deferred"),
    ).toBe(true);
    expect(t.compared).toHaveLength(1);
    expect(t.selected).toBeNull();
    expect(t.compared[0]!.option.reference).toBe(true);
    expect(
      t.bindings.every(
        (o) => o.status !== "impossible-under-personal-assumptions",
      ),
    ).toBe(true);
  });
  it("personal route planning shares EU and retains a deferred frontier across reviews", () => {
    const h = harness({ food: 0 });
    h.e.fact(
      h.actor,
      "patch",
      "location",
      { x: 2.95, y: 0.85 },
      0,
      "genuine observed destination",
    );
    const terrain = Array.from({ length: 32 }, (_, cell) => ({
      cell: cell + 32 * 8,
      terrain: 0,
      passable: true,
      speed: 1,
      detection: 1,
    }));
    h.e.observe(
      h.actor,
      {
        terrain,
        facts: [],
        footprint: {
          duration: 0,
          cells: terrain.map((c) => ({ cell: c.cell, detection: 1 })),
        },
      },
      0,
      "genuine corridor survey",
      true,
    );
    const account = openReview(h.actor, 0),
      meter = new ReviewEffort(account, h.counts);
    meter.spend("retrieval", 599 - 4 - 1); // leaves exactly one EU after the root and target.
    const binder = new Binder(h.review(), h.state, meter);
    const option = binder.bind(
      { kind: "have", good: "food", quantity: 1, place: "own" },
      METHOD_INDEX.get("gather")!,
    );
    // The shared remainder covers this short route; no independent route account appears.
    expect(account.spent).toBeLessThanOrEqual(600);
    expect(option.routes[0]?.effortAccount).toBe(account.key);
    expect(h.counts.routeEu).toBeGreaterThan(0);
    const blockedAccount = openReview(h.actor, 0);
    blockedAccount.spent = 595;
    const deferred = new Binder(
      h.review(),
      h.state,
      new ReviewEffort(blockedAccount, h.counts),
    ).bind(
      { kind: "have", good: "food", quantity: 1, place: "own" },
      METHOD_INDEX.get("gather")!,
    );
    expect(deferred.status).toBe("computationally-deferred");
    expect(deferred.routes[0]?.status).toBe("unresolved");
    h.state.deferred = [clone(deferred)];
    const resumed = new Binder(
      h.review(),
      h.state,
      new ReviewEffort(openReview(h.actor, 2 * QUANTA), h.counts),
    ).bind(
      { kind: "have", good: "food", quantity: 1, place: "own" },
      METHOD_INDEX.get("gather")!,
    );
    expect(resumed.status).toBe("executable");
    expect(resumed.routes[0]?.status).toBe("found");
  });
  it("rejects cycles, retains unsupported means and never learns an installed-but-unknown method", () => {
    const consume = clone(METHOD_INDEX.get("consume")!);
    consume.schema!.prerequisites[0]!.effect = "service:nourishment";
    const catalogue = new MethodIndex([
      consume,
      ...(content.methods as MethodEntry[]).filter((m) => m.id !== "consume"),
    ]);
    const h = harness({ catalogue }),
      b = new Binder(
        h.review(),
        h.state,
        new ReviewEffort(openReview(h.actor, 0), h.counts),
        catalogue,
      );
    expect(
      b.bind({ kind: "service", service: "nourishment", quantity: 3 }, consume)
        .reason,
    ).toContain("cyclic");
    expect(
      b.bind(
        { kind: "enjoyed", quantity: 1 },
        { id: "unsupported", effects: ["enjoyed"], inputs: [] },
      ).status,
    ).toBe("unsupported");
    const unknown = harness({ methods: ["rest", "leisure"] });
    expect(unknown.decide().methods).not.toContain("consume");
  });
  it("indexed fair method admission reaches every eligible means, while irrelevant catalogue growth leaves work and choice unchanged", () => {
    const extras = Array.from({ length: 10000 }, (_, i) => ({
      id: `irrelevant:${i}`,
      effects: [`unrelated:${i}`],
      inputs: [`unused:${i}`],
    }));
    const a = harness(),
      b = harness({
        catalogue: new MethodIndex([
          ...(content.methods as MethodEntry[]),
          ...extras,
        ]),
      });
    expect(b.decide()).toEqual(a.decide());
    expect(b.counts.personalReadEntriesVisited).toBe(
      a.counts.personalReadEntriesVisited,
    );
    const variants = Array.from({ length: 9 }, (_, i) => ({
      ...clone(METHOD_INDEX.get("leisure")!),
      id: `leisure:${i}`,
    }));
    const c = harness({
        catalogue: new MethodIndex(variants),
        methods: variants.map((m) => m.id),
      }),
      seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const binder = new Binder(
        c.review(),
        c.state,
        new ReviewEffort(openReview(c.actor, 0), c.counts),
        new MethodIndex(variants),
      );
      binder.admission("enjoyed").forEach((m) => seen.add(m.id));
    }
    expect(seen.size).toBe(9);
  });
  it("owned input postings admit bounded fair pages and retain their cursor across restore", () => {
    const h = harness({ food: 0 });
    for (let i = 0; i < 6; i++) {
      h.e.fact(
        h.actor,
        `cache:${i}`,
        "location",
        h.self.location,
        0,
        "own receipt",
        "self",
      );
      h.e.fact(
        h.actor,
        `cache:${i}`,
        "own-local-stocks",
        { food: 1 },
        0,
        "own receipt",
        "self",
      );
    }
    h.e.fact(h.actor, "unowned", "stock:food", 100, 0, "observation");
    const seen = new Set<string>();
    const first = h.decide();
    expect(first.premises.ownedInputs.length).toBeLessThanOrEqual(5);
    first.premises.ownedInputs.forEach((l) => {
      if (l.quantity > 0) seen.add(l.subject);
    });
    const restored = new Mind("review-proof", counters(), clone(h.mind.state));
    expect(restored.person(h.actor)!.targetCursors).toEqual(
      h.state.targetCursors,
    );
    const second = h.decide(undefined, 2 * QUANTA);
    expect(second.premises.ownedInputs.length).toBeLessThanOrEqual(5);
    second.premises.ownedInputs.forEach((l) => {
      if (l.quantity > 0) seen.add(l.subject);
    });
    expect(seen.size).toBe(6);
    expect(seen.has("unowned")).toBe(false);
  });
  it("wake edges coalesce, same-state triggers drop, cap defers and a real changed feature reopens review", () => {
    const h = harness({ food: 0, d: 0.6 });
    expect(h.mind.thresholds(h.review())).toEqual(["food", "rest"]);
    expect(h.mind.thresholds(h.review())).toEqual([]);
    h.mind.request(h.actor, "food", 0);
    h.mind.request(h.actor, "rest", 0);
    h.mind.request(h.actor, "rest", 0);
    expect(h.state.pending).toEqual(["food", "rest"]);
    expect(h.counts.reviewWakesCoalesced).toBe(2);
    expect(
      h.mind.admit(h.review(), { task: null, budget: null })?.causes,
    ).toEqual(["food", "rest"]);
    h.mind.request(h.actor, "food", 0);
    expect(h.mind.admit(h.review(), { task: null, budget: null })).toBeNull();
    h.state.capCount = 8;
    h.mind.request(h.actor, "failure", 0);
    expect(h.mind.admit(h.review(), { task: null, budget: null })).toBeNull();
    expect(h.counts.wakeCapDeferrals).toBe(1);
    expect(h.state.pending).toContain("failure");
    expect(h.state.nextWake).toBe(h.state.periodicAt);
    h.state.capCount = 0;
    expect(
      h.mind.admit(h.review(), { task: null, budget: null }),
    ).not.toBeNull();
    h.e.fact(
      h.actor,
      "cache",
      "own-local-stocks",
      { food: 4 },
      0,
      "own delivered change",
      "self",
    );
    expect(h.mind.thresholds(h.review())).toEqual([]);
    h.e.fact(
      h.actor,
      "cache",
      "own-local-stocks",
      { food: 0 },
      0,
      "own delivered change",
      "self",
    );
    expect(h.mind.thresholds(h.review())).toEqual(["food"]);
  });
  it("updates quiet requirement only from ordinary prior and own experienced intake/condition", () => {
    const h = harness();
    expect(h.review().quietRequirement()).toBe(1);
    const old = clone(
      h.review().belief("self", "body-experience")!.value,
    ) as Record<string, any>;
    h.e.fact(
      h.actor,
      "self",
      "body-experience",
      { ...old, intake: 1.1, activityLoad: 0.1 },
      0,
      "own paid context",
      "self",
    );
    const c = conditionSegment(1, 1.1, 1.4, 0.7).c;
    h.e.fact(
      h.actor,
      "self",
      "body-experience",
      { ...old, condition: c, intake: 1.1, activityLoad: 0.1 },
      time(0.7),
      "own experience",
      "self",
    );
    expect(h.review(time(0.7)).quietRequirement()).toBeCloseTo(1.15, 6);
  });
  it("autonomous runtime executes the exact sealed envelope, completes steps cheaply and checkpoints active execution", () => {
    const a = simulation(),
      actor = a.actorKeys()[0]!;
    a.advanceTo(time(0.01));
    const trace = a.decisionPanel(actor)!.traces.at(-1)!,
      task = a.currentExecution(actor).task!;
    expect(task.source).toBe("bounded-personal-review");
    expect(task.steps).toEqual(trace.selected!.steps);
    const before = a.counters.autonomousDeliberations,
      eu = a.counters.reviewEuTotal;
    // A closure and valid prefix do not construct a new agenda by themselves.
    a.advanceTo(time(0.02));
    expect(a.counters.autonomousDeliberations).toBe(before);
    expect(a.counters.reviewEuTotal).toBe(eu);
    const cp = a.checkpoint(),
      b = PhysicalSimulation.restore(cp);
    a.advanceTo(time(8));
    for (let q = time(0.02); q < time(8); q += time(0.071)) b.advanceTo(q);
    b.advanceTo(time(8));
    expect(a.causalHash()).toBe(b.causalHash());
    expect(a.decisionPanel(actor)).toEqual(b.decisionPanel(actor));
    expect(a.counters.continueTransitions).toBeGreaterThan(0);
    expect(
      a.counters.completionWakes + a.counters.failureWakes,
    ).toBeGreaterThan(0);
    expect(a.snapshot().reconciliation.ok).toBe(true);
  });
  it("pending wakes, threshold flags and fairness state survive restore; panel reads and no-op events are inert", () => {
    const a = simulation("pending"),
      actor = a.actorKeys()[0]!;
    a.requestReview(actor, "failure");
    const b = PhysicalSimulation.restore(a.checkpoint()),
      hash = a.causalHash();
    for (let i = 0; i < 20; i++) {
      a.decisionPanel(actor);
      a.personalLens(actor);
      a.snapshot();
    }
    expect(a.causalHash()).toBe(hash);
    a.advanceTo(time(2));
    b.advanceTo(time(2));
    expect(a.causalHash()).toBe(b.causalHash());
    const c = PhysicalSimulation.restore(b.checkpoint());
    c.kernel.schedule(actor, time(2.1), 4, { kind: "diagnostic", actor });
    b.advanceTo(time(3));
    c.advanceTo(time(3));
    expect(c.decisionPanel(actor)).toEqual(b.decisionPanel(actor));
    expect(c.currentExecution(actor)).toEqual(b.currentExecution(actor));
  });
  it("paired hidden worlds retain the entire mind trace/wake stream until information differs", () => {
    const a = simulation("hidden"),
      actor = a.actorKeys()[0]!;
    const b = editWorld(a, (s) => {
      const site = s.adultPhysical.sites[0];
      site.anchor.stock = 1;
      site.capacity = 24;
    });
    // Only compare before either person works the altered patch. Existing own food is the decisive backing.
    const beforeA = {
        periodic: a.counters.periodicWakes,
        threshold: a.counters.thresholdWakes,
      },
      beforeB = {
        periodic: b.counters.periodicWakes,
        threshold: b.counters.thresholdWakes,
      };
    a.advanceTo(time(0.01));
    b.advanceTo(time(0.01));
    expect(a.personalReview(actor).self).toEqual(b.personalReview(actor).self);
    expect(a.decisionPanel(actor)).toEqual(b.decisionPanel(actor));
    expect(a.counters.periodicWakes - beforeA.periodic).toBe(
      b.counters.periodicWakes - beforeB.periodic,
    );
    expect(a.counters.thresholdWakes - beforeA.threshold).toBe(
      b.counters.thresholdWakes - beforeB.threshold,
    );
    const hidden = editWorld(a, (s) => {
      const actor2 = s.actors[0];
      actor2.label = "analyst-only label";
    });
    expect(hidden.decisionPanel(actor)).toEqual(a.decisionPanel(actor));
  });
  it("unexperienced true capability cannot supply a perfect productivity forecast", () => {
    const a = simulation("opaque"),
      actor = a.actorKeys()[0]!;
    const b = editWorld(a, (s) => {
      s.adultPhysical.bodies[0].capability.B = 1.7;
      s.adultPhysical.bodies[0].mastery.Field = 0.9;
    });
    a.advanceTo(1);
    b.advanceTo(1);
    expect(
      a
        .decisionPanel(actor)!
        .traces.at(-1)!
        .compared.map((x) => x.consequences),
    ).toEqual(
      b
        .decisionPanel(actor)!
        .traces.at(-1)!
        .compared.map((x) => x.consequences),
    );
    expect(a.decisionPanel(actor)!.traces.at(-1)!.winner).toBe(
      b.decisionPanel(actor)!.traces.at(-1)!.winner,
    );
  });
  it("a renamed task cannot renew sealed review authority and corrupted mind backing is rejected", () => {
    const s = simulation("sealed"),
      actor = s.actorKeys()[0]!;
    s.advanceTo(time(0.01));
    const selected = clone(s.decisionPanel(actor)!.traces.at(-1)!.selected!);
    expect(() =>
      s.diagnosticSelect({
        ...selected,
        source: "diagnostic-selected-intention",
        taskId: "renamed",
      }),
    ).toThrow("review envelope");
    const cp = JSON.parse(s.checkpoint());
    cp.body.mind[0].dispositions.p = 5;
    expect(() =>
      PhysicalSimulation.restore(
        canonical({ body: cp.body, checksum: digest(cp.body) }),
      ),
    ).toThrow("cognitive");
  });
  it("different people use identical code and can select different means from legitimate personal conditions", () => {
    const food = harness({ c: 0.2, f: 0.95 }),
      leisure = harness({ c: 1, f: 0.05 });
    const a = food.decide(),
      b = leisure.decide(incumbent(leisure));
    expect(a.selected?.method).toBe("consume");
    expect(b.selected?.method).toBe("leisure");
    expect(food.state.dispositions).toEqual(leisure.state.dispositions);
  });
});
