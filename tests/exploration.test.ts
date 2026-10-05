import { describe, expect, it } from "vitest";
import { EvidenceService, clone } from "../src/evidence/service";
import type { ExactSelf, Value, PerceptionPacket } from "../src/evidence/types";
import { counters } from "../src/kernel/counters";
import { canonical, digest } from "../src/kernel/canonical";
import { QUANTA, time } from "../src/kernel/time";
import { Mind } from "../src/mind/review";
import { Binder } from "../src/mind/binder";
import { openReview, ReviewEffort } from "../src/mind/effort";
import {
  explorationOptions,
  explorationWeight,
  inquiryValue,
  trialInstrumentalValue,
} from "../src/mind/exploration";
import { forecast } from "../src/mind/forecast";
import { feasibility } from "../src/mind/arbiter";
import { METHOD_INDEX, MethodIndex } from "../src/content/methods";
import { PhysicalSimulation } from "../src/runners/simulation";
import { flatWorld, editWorld } from "./pack0b-fixture";
import { pleasantWeight } from "../src/laws/enjoyment";
import {
  cognition,
  trialWorld,
  experiment,
  profile,
} from "./exploration-fixture";
describe("Pack 0C3A personal exploration", () => {
  it("uses three bounded EVSI classes and cannot create backing", () => {
    const h = cognition(),
      meter = new ReviewEffort(openReview(h.actor, 0), h.counts);
    const v = inquiryValue(h.review(), meter, 0, 0.5, 0.1)!;
    expect(v.value).toBeGreaterThan(0);
    expect(v.probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(h.counts.inquiryClasses).toBe(3);
    const o = explorationOptions(h.review(), h.state, meter).find(
      (o) => o.objective.kind === "knows",
    )!;
    expect(o.informationValue).toBeGreaterThan(0);
    expect(o.goods).toEqual({});
    expect(o.steps.filter((s) => s.family === "Work")).toEqual([]);
    expect(meter.account.spent).toBeLessThanOrEqual(600);
  });
  it("compares affordable T1 and inquiry through the existing arbiter", () => {
    const h = cognition();
    const t = h.deliberate();
    expect(t.compared.some((x) => x.option.method === "try-compatible")).toBe(
      true,
    );
    expect(t.compared.some((x) => x.option.method === "inquire")).toBe(true);
    expect(t.effort.spent).toBeLessThanOrEqual(600);
    expect(
      t.selected?.steps.some(
        (s) => s.family === "Attend" && s.experiment?.form === "inquiry",
      ),
    ).toBe(true);
  });
  it("never constructs a trial without an eligible held hammer", () => {
    const h = cognition({ hammer: 0 });
    const options = explorationOptions(
      h.review(),
      h.state,
      new ReviewEffort(openReview(h.actor, 0), h.counts),
    );
    expect(options.filter((o) => o.method === "try-compatible")).toHaveLength(
      0,
    );
  });
  it("empty qualified observation lowers the local posterior without double counting overlap", () => {
    const h = cognition(),
      before = h.review().belief("occupancy", "food-patch:0")!.value as Record<
        string,
        number
      >;
    const packet: PerceptionPacket = {
      terrain: [
        { cell: 300, terrain: 0, passable: true, speed: 1, detection: 1 },
      ],
      facts: [],
      resourceClasses: ["food-patch"],
      footprint: { duration: time(0.12), cells: [{ cell: 300, detection: 1 }] },
    };
    h.e.observe(h.actor, packet, 1, "paid empty search", true);
    const a = h.e
      .review(h.actor, 1, profile, h.self)
      .belief("occupancy", "food-patch:0")!.value as Record<string, number>;
    h.e.observe(h.actor, packet, 2, "overlapping empty search", true);
    const b = h.e
      .review(h.actor, 2, profile, h.self)
      .belief("occupancy", "food-patch:0")!.value;
    expect(a.beta!).toBeGreaterThan(before.beta!);
    expect(a.alpha! / a.beta!).toBeLessThan(before.alpha! / before.beta!);
    expect(b).toEqual(a);
  });
  it("process value is the family enjoyment law and declines with familiarity and contextual frustration", () => {
    expect(pleasantWeight(0.3, 1.5, 0, 0)).toBeCloseTo(0.75);
    expect(pleasantWeight(0.3, 1.5, 3, 0)).toBeLessThan(0.75);
    const h = cognition(),
      before = explorationWeight(h.review(), experiment);
    h.e.observeExploration(h.actor, experiment, 0, "observed-failure");
    expect(explorationWeight(h.review(), experiment)).toBeLessThan(before);
    expect(
      explorationWeight(h.review(), {
        ...experiment,
        form: "inquiry",
        operation: "survey",
        targetKind: "food-patch:0",
      }),
    ).toBe(before);
    const c = h.review().belief("exploration", "T1:strike:glassy-stone")!
      .value as Record<string, number>;
    expect(c.alpha).toBe(1);
    expect(c.beta).toBe(5);
    const broad = h.review().belief("exploration", "T1:strike:*")!
      .value as Record<string, number>;
    expect(broad.beta).toBe(4.25);
  });
  it("installs provisional knowledge only after observed success and exposes it to ordinary binding", () => {
    const h = cognition();
    expect(h.review().methods("have:edged-flake", 2).entries).toHaveLength(0);
    h.e.observeExploration(
      h.actor,
      {
        ...experiment,
        success: true,
        method: "edge-flaking",
        good: "edged-flake",
        yield: 0.5,
      },
      0,
      "paid-observed-success",
    );
    expect(h.review().belief("method:edge-flaking", "confidence")!.value).toBe(
      0.4,
    );
    expect(h.review().belief("method:edge-flaking", "known")!.modality).toBe(
      "trial",
    );
    const binder = new Binder(
      h.review(),
      h.state,
      new ReviewEffort(openReview(h.actor, 0), h.counts),
    );
    const methods = binder.admission("have:edged-flake");
    expect(methods.map((m) => m.id)).toContain("edge-flaking");
    expect(
      binder.bind(
        { kind: "have", good: "edged-flake", place: "own", quantity: 0.5 },
        methods[0]!,
      ).status,
    ).toBe("executable");
    h.e.register("unobserving-person");
    expect(
      h.e
        .review("unobserving-person", 0, profile, {
          ...h.self,
          identity: "unobserving-person",
        })
        .methods("have:edged-flake", 2).entries,
    ).toHaveLength(0);
  });
  it("exhaustion defers instead of declaring an opportunity impossible", () => {
    const h = cognition(),
      account = openReview(h.actor, 0);
    account.spent = 599;
    const meter = new ReviewEffort(account, h.counts);
    expect(inquiryValue(h.review(), meter, 0, 0.5, 0.1)).toBeNull();
    expect(account.spent).toBe(600);
  });
  it("actual optional reserve rejects curiosity without prior food", () => {
    const h = cognition({ food: 0.2 }),
      o = explorationOptions(
        h.review(),
        h.state,
        new ReviewEffort(openReview(h.actor, 0), h.counts),
      ).find((o) => o.method === "try-compatible")!;
    const c = forecast(
      h.review(),
      o,
      new ReviewEffort(openReview(h.actor, 0), h.counts),
    )!;
    expect(
      feasibility(
        h.review(),
        {
          option: o,
          consequences: c,
          feasible: true,
          gate: null,
          riskPass: true,
          value: 0,
          error: 0,
          errors: [],
        },
        false,
      ),
    ).toContain("reserve");
  });
  it("hidden schema worlds make identical first decisions and diverge only after paid observation", () => {
    const a = trialWorld("paired-schema", true),
      b = trialWorld("paired-schema", false);
    a.sim.advanceTo(1);
    b.sim.advanceTo(1);
    expect(a.sim.decisionPanel(a.actor)).toEqual(b.sim.decisionPanel(b.actor));
    const selected = a.sim.decisionPanel(a.actor)!.traces.at(-1)!;
    expect(
      selected.selected?.steps.some(
        (s) => s.family === "Work" && s.experiment?.form === "T1",
      ),
    ).toBe(true);
    a.sim.advanceTo(time(0.02));
    b.sim.advanceTo(time(0.02));
    expect(a.sim.decisionPanel(a.actor)).toEqual(b.sim.decisionPanel(b.actor));
    expect(a.sim.personalLens(a.actor)).toEqual(b.sim.personalLens(b.actor));
    expect(
      a.sim.personalReview(a.actor).belief("method:edge-flaking", "known"),
    ).toBeNull();
    a.sim.advanceTo(time(0.05));
    b.sim.advanceTo(time(0.05));
    expect(a.sim.snapshot().reconciliation.ok).toBe(true);
    expect(b.sim.snapshot().reconciliation.ok).toBe(true);
    expect(
      a.sim.personalReview(a.actor).belief("method:edge-flaking", "known")
        ?.value,
    ).toBe(true);
    expect(
      a.sim.personalReview(a.actor).belief("method:edge-flaking", "confidence")
        ?.value,
    ).toBe(0.4);
    expect(
      b.sim.personalReview(b.actor).belief("method:edge-flaking", "known"),
    ).toBeNull();
    expect(
      a.sim.personalReview(a.actor).self.carried.stocks["edged-flake"],
    ).toBe(0.5);
    expect(
      b.sim.personalReview(b.actor).self.carried.stocks["edged-flake"] ?? 0,
    ).toBe(0);
    expect(
      a.sim.personalReview(a.actor).methods("have:edged-flake", 2).entries,
    ).toHaveLength(1);
  });
  it("adequate livelihood permits a cheap safe inquiry under satiated leisure", () => {
    const h = cognition({ rate: 2, trial: false }),
      t = h.deliberate();
    expect(
      t.selected?.steps.some(
        (s) => s.family === "Attend" && s.experiment?.form === "inquiry",
      ),
    ).toBe(true);
    const base = t.compared.find((x) =>
      x.option.steps.some((s) => s.family === "Attend"),
    )!;
    const expensive = clone(base);
    expensive.option.optionalDuration = time(0.26);
    expect(feasibility(h.review(), expensive, false)).toContain("ceiling");
  });
  it("matched expensive trials decline under the same ordinary envelope", () => {
    const h = cognition(),
      o = explorationOptions(
        h.review(),
        h.state,
        new ReviewEffort(openReview(h.actor, 0), h.counts),
      ).find((o) => o.method === "try-compatible")!;
    o.optionalDuration = time(0.26);
    o.duration = time(0.26);
    for (const s of o.steps) if (s.family === "Work") s.duration = time(0.26);
    const c = forecast(
      h.review(),
      o,
      new ReviewEffort(openReview(h.actor, 0), h.counts),
    )!;
    expect(
      feasibility(
        h.review(),
        {
          option: o,
          consequences: c,
          feasible: true,
          gate: null,
          riskPass: true,
          value: 0,
          error: 0,
          errors: [],
        },
        false,
      ),
    ).toContain("ceiling");
  });
  it("unchanged failed T1 is suppressed and relevant new properties reopen it", () => {
    const h = cognition();
    const options = () =>
      explorationOptions(
        h.review(),
        h.state,
        new ReviewEffort(openReview(h.actor, 0), h.counts),
      );
    const o = options().find((o) => o.method === "try-compatible")!;
    const work = o.steps.find((s) => s.family === "Work")!;
    if (work.family !== "Work") throw Error("missing trial");
    h.e.observeExploration(
      h.actor,
      {
        ...work.experiment!,
        paid: time(0.25),
        completed: true,
        success: false,
      },
      0,
      "paid-failure",
    );
    expect(options().some((o) => o.method === "try-compatible")).toBe(false);
    h.e.fact(
      h.actor,
      "material",
      "perceptible-properties",
      "hard,glassy,rough",
      0,
      "new relevant property",
    );
    expect(options().some((o) => o.method === "try-compatible")).toBe(true);
  });
  it("hidden placement leaves nomination, routes, wake stream and choices identical", () => {
    const a = flatWorld("placement-pair"),
      b = editWorld(a, (s) => {
        for (const c of s.goods.containers.filter(
          (c: any) => c.kind === "site",
        ))
          c.location.point = { x: 2.65, y: 1.55 };
      });
    for (const sim of [a, b]) {
      const actor = sim.actorKeys()[0]!;
      sim.diagnosticFoundAdult(actor, "M", {
        capability: {
          B: 1,
          A: 1,
          C: 1,
          P: 1,
          displayPotential: 1,
          efficiency: 1,
        },
        mastery: {
          Field: 0.5,
          Fight: 0.5,
          Make: 0.5,
          Organise: 0.5,
          Social: 0.5,
        },
        initial: { condition: 1, fatigue: 0.1, enjoyment: 0, satiation: 8 },
      });
      sim.enableAutonomous(actor, { p: 0, rT: 0, aT: 0 });
      sim.requestReview(actor, "periodic");
    }
    const actor = a.actorKeys()[0]!;
    for (const q of [1, time(0.02), time(0.05)]) {
      a.advanceTo(q);
      b.advanceTo(q);
      expect(a.decisionPanel(actor)).toEqual(b.decisionPanel(actor));
      expect(a.personalLens(actor)).toEqual(b.personalLens(actor));
    }
    expect(
      a
        .decisionPanel(actor)!
        .traces.some((t) =>
          t.compared.some((x) => x.option.method === "inquire"),
        ),
    ).toBe(true);
    expect(a.counters.reviewWakesExecuted).toBe(b.counters.reviewWakesExecuted);
    expect(a.counters.reviewWakesRequested).toBe(
      b.counters.reviewWakesRequested,
    );
  });
  it("paid trial and all causal cognition survive active save, observer reads and partitions", () => {
    const { sim, actor } = trialWorld("paired-schema", true);
    sim.advanceTo(time(0.015));
    const saved = sim.checkpoint(),
      restored = PhysicalSimulation.restore(saved);
    expect(restored.causalHash()).toBe(sim.causalHash());
    sim.advanceTo(time(0.5));
    for (const q of [0.02, 0.025, 0.04, 0.1, 0.3, 0.5]) {
      restored.advanceTo(time(q));
      const hash = restored.causalHash();
      restored.snapshot();
      restored.personalLens(actor);
      restored.decisionPanel(actor);
      expect(restored.causalHash()).toBe(hash);
    }
    expect(restored.causalHash()).toBe(sim.causalHash());
    expect(restored.personalLens(actor)).toEqual(sim.personalLens(actor));
    expect(
      restored.personalReview(actor).belief("method:edge-flaking", "known")
        ?.value,
    ).toBe(true);
    const again = PhysicalSimulation.restore(restored.checkpoint());
    expect(again.causalHash()).toBe(restored.causalHash());
    const body = JSON.parse(again.checkpoint()).body;
    expect(body.evidence.people[0].exploration).toEqual(
      JSON.parse(sim.checkpoint()).body.evidence.people[0].exploration,
    );
    expect(body.mind[0].trialCursor).toEqual(
      JSON.parse(sim.checkpoint()).body.mind[0].trialCursor,
    );
    expect(again.snapshot().reconciliation.ok).toBe(true);
  });
  it("instrumental potential uses only represented service and the declared relative gain", () => {
    const h = cognition(),
      meter = () => new ReviewEffort(openReview(h.actor, 0), h.counts);
    expect(trialInstrumentalValue(h.review(), "strike", 0.2, meter())).toBe(0);
    h.e.fact(
      h.actor,
      "self",
      "service-use:strike",
      { discountedService: 4, improvementCap: 0.5 },
      0,
      "personally represented paid service",
      "inference",
    );
    expect(
      trialInstrumentalValue(h.review(), "strike", 0.2, meter()),
    ).toBeCloseTo(0.1);
  });
  it("10,000 unobserved physical materials and hidden sites do not increase review work", () => {
    const a = flatWorld("growth-pair"),
      b = editWorld(a, (s) => {
        for (let i = 0; i < 10000; i++) {
          s.config.goods.push({ id: `unused-${i}`, bulk: 1, divisible: true });
          s.config.materialKinds.push({
            id: `unused-material-${i}`,
            perceptible: ["hard", "glassy"],
            revealed: [],
          });
        }
        s.configurationHash = digest(s.config);
      });
    for (let i = 0; i < 10000; i++)
      b.diagnosticResource(
        "stone-deposit",
        { x: 2.75, y: 1.55 },
        12,
        "glassy-stone",
      );
    for (const sim of [a, b]) {
      const actor = sim.actorKeys()[0]!;
      sim.enableAutonomous(actor, { p: 0, rT: 0, aT: 0 });
      sim.requestReview(actor, "periodic");
      sim.advanceTo(1);
    }
    const actor = a.actorKeys()[0]!;
    expect(a.decisionPanel(actor)).toEqual(b.decisionPanel(actor));
    for (const key of [
      "reviewEuTotal",
      "personalReadEntriesVisited",
      "personalReadPagesVisited",
      "methodRecordsConsulted",
      "trialCandidates",
      "routeExpansions",
    ] as const)
      expect(a.counters[key]).toBe(b.counters[key]);
    expect(a.counters.reviewEuTotal).toBeLessThanOrEqual(600);
  });
  it("optional ceilings also apply when an inquiry follows another ordinary end", () => {
    const h = cognition({ trial: false }),
      t = h.deliberate();
    const x = clone(
      t.compared.find((x) =>
        x.option.steps.some((s) => s.family === "Attend"),
      )!,
    );
    x.option.objective = { kind: "enjoyed", quantity: 0.12 };
    x.option.optionalDuration = time(0.26);
    expect(feasibility(h.review(), x, false)).toContain("ceiling");
  });
  it("two eligible personal trial sources are paged fairly without catalogue enumeration", () => {
    const h = cognition({ inquiry: false });
    for (let i = 0; i < 7; i++) {
      const id = `material-${i}`;
      h.e.fact(h.actor, id, "location", h.self.location, 0, "visible");
      h.e.fact(h.actor, id, "material-kind", "glassy-stone", 0, "visible");
      h.e.fact(
        h.actor,
        id,
        "perceptible-properties",
        "hard,glassy",
        0,
        "visible",
      );
      h.e.fact(h.actor, id, "stock:stone", 12, 0, "visible");
    }
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const before = h.counts.trialCandidates;
      const options = explorationOptions(
        h.review(),
        h.state,
        new ReviewEffort(openReview(h.actor, 0), h.counts),
      );
      expect(h.counts.trialCandidates - before).toBeLessThanOrEqual(2);
      for (const o of options)
        for (const s of o.steps)
          if (s.family === "Work" && s.site) seen.add(s.site);
    }
    expect(seen.size).toBe(8);
  });
  it("an empty inquiry reduces its contextual return and relevant new coverage reopens inquiry", () => {
    const h = cognition({ trial: false }),
      meter = () => new ReviewEffort(openReview(h.actor, 0), h.counts);
    const before = inquiryValue(h.review(), meter(), 0, 0.5, 0.1)!.value;
    const op = explorationOptions(h.review(), h.state, meter()).find(
      (o) => o.method === "inquire",
    )!;
    const attend = op.steps.find((s) => s.family === "Attend")!;
    if (attend.family !== "Attend") throw Error("missing inquiry");
    const weight = explorationWeight(h.review(), attend.experiment!);
    h.e.observeExploration(
      h.actor,
      {
        ...attend.experiment!,
        paid: time(0.12),
        completed: true,
        success: false,
      },
      0,
      "paid empty inquiry",
    );
    h.e.observe(
      h.actor,
      {
        terrain: Array.from({ length: 20 }, (_, i) => ({
          cell: 300 + i,
          terrain: 0,
          passable: true,
          speed: 1,
          detection: 1,
        })),
        facts: [],
        resourceClasses: ["food-patch"],
        footprint: { duration: time(0.12), cells: [] },
      },
      1,
      "new paid empty coverage",
      true,
    );
    const r = h.e.review(h.actor, 1, profile, h.self);
    expect(inquiryValue(r, meter(), 0, 0.5, 0.1)!.value).toBeLessThan(before);
    expect(explorationWeight(r, attend.experiment!)).toBeLessThan(weight);
    expect(
      explorationOptions(r, h.state, meter()).some(
        (o) => o.method === "inquire" && o.status === "executable",
      ),
    ).toBe(true);
  });
  it("an autonomous inquiry really pays travel and survey despite finding nothing", () => {
    const sim = flatWorld("placement-pair"),
      actor = sim.actorKeys()[0]!,
      cache = sim
        .snapshot()
        .containers.find((c) => c.kind === "cache" && c.custodian === actor)!;
    sim.diagnosticGoods({
      kind: "source",
      source: "initial-endowment",
      to: cache.key,
      good: "food",
      quantity: 6,
    });
    sim.diagnosticFoundAdult(actor, "M", {
      capability: {
        B: 1,
        A: 1,
        C: 1,
        P: 1,
        displayPotential: 1,
        efficiency: 1,
      },
      mastery: {
        Field: 0.5,
        Fight: 0.5,
        Make: 0.5,
        Organise: 0.5,
        Social: 0.5,
      },
      initial: { condition: 1, fatigue: 0.1, enjoyment: 0, satiation: 8 },
    });
    sim.enableAutonomous(actor, { p: 0, rT: 0, aT: 0 });
    sim.requestReview(actor, "periodic");
    sim.advanceTo(1);
    const selected = sim.decisionPanel(actor)!.traces.at(-1)!.selected!;
    expect(selected.method).toBe("inquire");
    const attend = selected.steps.find((s) => s.family === "Attend")!;
    if (attend.family !== "Attend") throw Error("no inquiry");
    sim.advanceTo(time(0.004));
    const saved = sim.checkpoint(),
      restored = PhysicalSimulation.restore(saved);
    sim.advanceTo(time(0.5));
    restored.advanceTo(time(0.5));
    expect(restored.causalHash()).toBe(sim.causalHash());
    const outcome = sim
      .personalReview(actor)
      .belief(attend.experiment!.descriptor, "outcome")!
      .value as typeof experiment;
    expect(outcome.completed).toBe(true);
    expect(outcome.success).toBe(false);
    const summary = sim
      .personalReview(actor)
      .belief("exploration", attend.experiment!.descriptor)!.value as Record<
      string,
      number
    >;
    expect(summary.paid!).toBeGreaterThan(time(0.12));
    expect(summary.paid!).toBeLessThanOrEqual(time(0.25));
    expect(sim.currentExecution(actor).task!.cursor).toBe(3);
    expect(sim.snapshot().reconciliation.ok).toBe(true);
  });
  it("failed trial frustration and summaries survive restore without renewed spend", () => {
    const { sim, actor } = trialWorld("paired-schema", false);
    sim.advanceTo(time(0.05));
    const restored = PhysicalSimulation.restore(sim.checkpoint());
    expect(restored.personalLens(actor)).toEqual(sim.personalLens(actor));
    const summary = restored
      .personalReview(actor)
      .belief("exploration", "T1:strike:glassy-stone")!.value as Record<
      string,
      number
    >;
    expect(summary.beta).toBe(5);
    expect(summary.failures).toBe(1);
    expect(summary.paid).toBe(time(0.03));
    expect(
      restored.personalReview(actor).belief("method:edge-flaking", "known"),
    ).toBeNull();
  });
  it("a newly learned method supports freshly authorised ordinary physical use", () => {
    const { sim, actor } = trialWorld("paired-schema", true);
    sim.advanceTo(time(0.05));
    sim.diagnosticTaskAbandon(actor);
    const r = sim.personalReview(actor),
      state = clone(sim.decisionPanel(actor)!);
    const binder = new Binder(
      r,
      state,
      new ReviewEffort(openReview(actor, time(0.05)), counters()),
    );
    const method = binder.admission("have:edged-flake")[0]!;
    const bound = binder.bind(
      { kind: "have", good: "edged-flake", place: "own", quantity: 1 },
      method,
    );
    expect(bound.status).toBe("executable");
    expect(bound.steps.every((s) => !("experiment" in s && s.experiment))).toBe(
      true,
    );
    sim.diagnosticSelect({
      actor,
      intentionId: "fresh-ordinary-use",
      taskId: "fresh-ordinary-use",
      semanticKey: bound.key,
      objective: "have edged-flake",
      method: method.id,
      bindings: bound.bindings,
      steps: bound.steps,
      dependsOn: [],
      authorised: { time: time(0.03), goods: { stone: 1 } },
      reserve: [],
      source: "diagnostic-selected-intention",
    });
    sim.advanceTo(time(0.085));
    expect(
      sim.personalReview(actor).self.carried.stocks["edged-flake"],
    ).toBeCloseTo(0.5 + 0.7 + 0.3 * 0.4);
    expect(
      sim.personalReview(actor).belief("method:edge-flaking", "confidence")!
        .value,
    ).toBeCloseTo(0.64);
    expect(sim.snapshot().reconciliation.ok).toBe(true);
  });
  it("a retained inquiry frontier is explicitly computationally deferred on shared effort exhaustion", () => {
    const h = cognition({ trial: false }),
      account = openReview(h.actor, 0);
    account.spent = 595;
    const options = explorationOptions(
      h.review(),
      h.state,
      new ReviewEffort(account, h.counts),
    );
    expect(options.some((o) => o.status === "computationally-deferred")).toBe(
      true,
    );
    expect(
      options.some((o) => o.status === "impossible-under-personal-assumptions"),
    ).toBe(false);
    expect(account.spent).toBe(600);
  });
  it("forgetting and reobserving a target cannot reset its trial precedent or occupancy count", () => {
    const h = cognition({ inquiry: false });
    const packet = (refs: string[]): PerceptionPacket => ({
      terrain: [],
      resourceClasses: ["stone-deposit"],
      facts: refs.map((reference) => ({
        reference,
        kind: "site",
        position: h.self.location,
        detection: 1,
        properties: [
          {
            property: "resource-kind",
            value: "stone-deposit",
            uncertainty: 0,
            volatility: "slow",
          },
          {
            property: "material-kind",
            value: "glassy-stone",
            uncertainty: 0,
            volatility: "fixed",
          },
          {
            property: "perceptible-properties",
            value: "hard,glassy",
            uncertainty: 0,
            volatility: "fixed",
          },
          {
            property: "stock:stone",
            value: 12,
            uncertainty: 0,
            volatility: "slow",
          },
        ],
      })),
      footprint: { duration: 1, cells: [] },
    });
    h.e.observe(
      h.actor,
      packet(["original-material"]),
      0,
      "first direct observation",
      true,
    );
    const first = h.e.subjectFor(h.actor, "original-material")!;
    const descriptor = `T1:strike:${first}:glassy-stone`;
    h.e.observeExploration(
      h.actor,
      {
        ...experiment,
        descriptor,
        paid: time(0.03),
        evidenceVersion: parseInt(
          digest(["glassy-stone", ["hard", "glassy"], "strike"]).slice(0, 8),
          16,
        ),
      },
      0,
      "failed paid original attempt",
    );
    h.e.observe(
      h.actor,
      packet(Array.from({ length: 40 }, (_, i) => `new-site-${i}`)),
      1,
      "later dense observations",
      true,
    );
    expect(h.e.subjectFor(h.actor, "original-material")).toBeNull();
    const before = h.e
      .review(h.actor, 1, profile, h.self)
      .belief("occupancy", "stone-deposit:0")!.value;
    h.e.observe(
      h.actor,
      packet(["original-material"]),
      2,
      "direct reobservation",
      true,
    );
    const second = h.e.subjectFor(h.actor, "original-material")!;
    expect(second).not.toBe(first);
    const r = h.e.review(h.actor, 2, profile, h.self);
    expect(r.belief(second, "attempt-identity")!.value).toBe(first);
    expect(r.belief("occupancy", "stone-deposit:0")!.value).toEqual(before);
    const copy = clone(h.e.state);
    const restored = new EvidenceService(
      "exploration-proof",
      counters(),
      copy,
      undefined,
      0.8,
      METHOD_INDEX,
      profile,
    );
    expect(
      restored
        .review(h.actor, 2, profile, h.self)
        .belief("exploration", descriptor)!.value,
    ).toEqual(r.belief("exploration", descriptor)!.value);
  });
  it("irrelevant successful global methods do not change personal nomination or choice", () => {
    const added = Array.from({ length: 10000 }, (_, i) => ({
      id: `unknown-${i}`,
      effects: ["have:edged-flake"],
      inputs: ["property:glassy"],
    }));
    const a = cognition(),
      b = cognition({
        catalogue: new MethodIndex([
          ...JSON.parse(JSON.stringify(awaitContent())),
          ...added,
        ]),
      });
    expect(a.deliberate()).toEqual(b.deliberate());
    expect(a.counts.personalReadEntriesVisited).toBe(
      b.counts.personalReadEntriesVisited,
    );
  });
});
import content from "../src/content/physical.json";
function awaitContent() {
  return content.methods;
}
