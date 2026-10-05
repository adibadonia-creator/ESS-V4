import { describe, expect, it } from "vitest";
import { canonical, digest } from "../src/kernel/canonical";
import { counters } from "../src/kernel/counters";
import { chargeRoute, routeAllowance } from "../src/kernel/effort";
import { EvidenceService, clone } from "../src/evidence/service";
import { GoodsLedger } from "../src/world/goods";
import { PhysicalSimulation } from "../src/runners/simulation";
import { MethodIndex } from "../src/content/methods";
import { resolveConfig } from "../src/content/profile";
import {
  beginPersonalSearch,
  resumePersonalSearch,
} from "../src/runtime/routing";
import { geometryCell } from "../src/evidence/geography";
import type { ExactSelf, PerceptionPacket } from "../src/evidence/types";
import {
  flatWorld,
  task,
  move,
  attend,
  time,
  editWorld,
  execution,
} from "./pack0b-fixture";

const self: ExactSelf = {
  identity: "a",
  location: { x: 0.25, y: 0.25 },
  currentLeg: null,
  carried: { subject: "own", stocks: { food: 1 } },
  reservations: [],
};
const profile = { width: 256, height: 192, cellKm: 0.1, regionCells: 32 };
function packet(start: number, count: number): PerceptionPacket {
  return {
    terrain: Array.from({ length: count }, (_, i) => ({
      cell: start + i,
      terrain: 0,
      passable: true,
      speed: 1,
      detection: 1,
    })),
    facts: [],
    footprint: {
      duration: 1,
      cells: Array.from({ length: count }, (_, i) => ({
        cell: start + i,
        detection: 1,
      })),
    },
  };
}
function personal() {
  const counts = counters(),
    e = new EvidenceService("growth", counts);
  e.register("a");
  e.foundMethods("a", ["contact", "exchange"], 0);
  e.foundTraversalPrior(
    "a",
    { speedFactor: 0.7, uncertainty: 1, context: "public" },
    0,
  );
  e.fact("a", "local", "location", { x: 0.25, y: 0.25 }, 0, "local");
  e.fact("a", "local", "stock:food", 4, 0, "local");
  e.observe("a", packet(0, 8), 0, "local survey", true);
  return { e, counts };
}
export function episodeCurve(count = 512) {
  const sim = flatWorld("episode-growth"),
    actor = sim.actorKeys()[0]!;
  const rows: Record<string, number>[] = [];
  for (let i = 0; i < count; i++) {
    const t = task(sim, [attend(time(0.001))], String(i));
    t.objective = `independent paid episode ${i}`;
    sim.diagnosticSelect(t);
    sim.advanceTo(sim.kernel.state.now + time(0.002));
    if ([8, 32, 96, 256, 512].includes(i + 1)) {
      const before = sim.counters.terminalTaskRowsVisited,
        current = sim.currentExecution(actor);
      const r = JSON.parse(sim.checkpoint()).body.runtime;
      rows.push({
        episodes: i + 1,
        activeTasks: r.tasks.length,
        terminalTasks: r.terminal.length,
        activePrefixes: r.activity.reduce(
          (n: number, a: any) => n + a.prefixes.length,
          0,
        ),
        paidArchive: r.paidArchive.length,
        retryKeys: Object.keys(r.retry).length,
        currentVisits: sim.counters.terminalTaskRowsVisited - before,
        hotBytes: Buffer.byteLength(
          JSON.stringify({ tasks: r.tasks, activity: r.activity }),
        ),
        archiveBytes: Buffer.byteLength(
          JSON.stringify({ terminal: r.terminal, paid: r.paidArchive }),
        ),
        totalBytes: Buffer.byteLength(JSON.stringify(r)),
      });
      if (current.task !== null) throw Error("Terminal task on current path");
    }
  }
  return { sim, rows };
}
describe("Pre-0C structural state and read contract", () => {
  it("unfinished archived routing retains retry premises through restore; malformed index, heap and effort backing is rejected", () => {
    const a = flatWorld("archived-route"),
      t = task(a, [move(2.55)]);
    a.diagnosticSelect(t);
    a.resumePersonalRouting(1);
    const mutate = (edit: (s: any) => void) => () => editWorld(a, edit);
    expect(
      mutate((s) => {
        s.evidence.pinnedGeography[0].cells.key = "bad";
      }),
    ).toThrow("index");
    expect(
      mutate((s) => {
        s.runtime.tasks[0].route.open[0].f = -100;
        s.runtime.tasks[0].route.open.push({ cell: 0, g: 0, f: -200 });
      }),
    ).toThrow("heap");
    expect(
      mutate((s) => {
        Object.values(s.runtime.effort).forEach(
          (e: any) => (e.prepaidExpansions = 64),
        );
      }),
    ).toThrow("effort");
    a.diagnosticTaskAbandon(t.actor);
    const b = PhysicalSimulation.restore(a.checkpoint());
    a.diagnosticSelect({ ...t, taskId: "retry after archival" });
    b.diagnosticSelect({ ...t, taskId: "retry after archival" });
    while (a.resumePersonalRouting(1)) {}
    while (b.resumePersonalRouting(65536)) {}
    a.advanceTo(time(0.2));
    b.advanceTo(time(0.2));
    expect(a.causalHash()).toBe(b.causalHash());
    expect(execution(a).task.status).toBe("done");
  });
  it("512 independent tasks leave no terminal execution or paid rows in the hot path; exact retry survives restore", () => {
    const { sim, rows } = episodeCurve(),
      actor = sim.actorKeys()[0]!;
    for (const row of rows) {
      expect(row.activeTasks).toBe(0);
      expect(row.activePrefixes).toBe(0);
      expect(row.currentVisits).toBe(0);
      expect(row.retryKeys).toBe(row.episodes);
    }
    expect(
      Math.max(...rows.map((r) => r.hotBytes!)) -
        Math.min(...rows.map((r) => r.hotBytes!)),
    ).toBeLessThan(300);
    const b = PhysicalSimulation.restore(sim.checkpoint());
    expect(b.currentExecution(actor)).toEqual(sim.currentExecution(actor));
    const t = task(sim, [attend(time(0.001))], "new label");
    t.objective = "independent paid episode 0";
    const spent = Object.values(
      JSON.parse(sim.checkpoint()).body.runtime.budgets,
    ).reduce((n: number, b: any) => n + b.spent.time, 0);
    sim.diagnosticSelect(t);
    b.diagnosticSelect(t);
    sim.advanceTo(time(1.2));
    b.advanceTo(time(1.2));
    expect(sim.causalHash()).toBe(b.causalHash());
    expect(
      Object.values(JSON.parse(sim.checkpoint()).body.runtime.budgets).reduce(
        (n: number, b: any) => n + b.spent.time,
        0,
      ),
    ).toBe(spent);
    expect(() =>
      sim.diagnosticSelect({
        ...t,
        taskId: "another label",
        authorised: { time: time(99), goods: { food: 1 } },
      }),
    ).toThrow("authorisation");
  });
  it("local evidence queries do not visit distant geography; snapshot premises remain immutable and cursor retrieval stays bounded", () => {
    const { e, counts } = personal(),
      old = e.review("a", 0, profile, self),
      expected = old.belief("local", "stock:food");
    const visits: number[] = [];
    for (const n of [0, 1000, 5000, 12000]) {
      if (n)
        e.observe("a", packet(4096, n), n, "legitimate distant survey", true);
      const review = e.review("a", n, profile, self),
        before = counts.personalReadEntriesVisited;
      expect(review.belief("local", "stock:food")).toEqual(expected);
      expect(review.places("stock:food", 2, null, "0,0").entries).toEqual([
        expected,
      ]);
      visits.push(counts.personalReadEntriesVisited - before);
      expect(review.cell(2)).toEqual(old.cell(2));
    }
    expect(new Set(visits).size).toBe(1);
    e.fact(
      "a",
      "local",
      "stock:food",
      0,
      13000,
      "new delivered empty observation",
    );
    expect(old.belief("local", "stock:food")?.value).toBe(4);
    expect(
      e.review("a", 13000, profile, self).belief("local", "stock:food")?.value,
    ).toBe(0);
    expect(() => {
      (old.self.carried.stocks as any).food = 99;
    }).toThrow();
    expect(() => {
      (expected as any).value = 99;
    }).toThrow();
    for (let i = 0; i < 100; i++)
      e.fact("a", `source:${i}`, "stock:wood", 1, 13000, "known source");
    const review = e.review("a", 13000, profile, self);
    let cursor = null as import("../src/evidence/read").ReadCursor | null,
      seen: string[] = [];
    do {
      const page = review.places("stock:wood", 6, cursor);
      seen.push(...page.entries.map((x) => x.subject));
      cursor = page.next;
    } while (cursor);
    expect(new Set(seen).size).toBe(100);
  });
  it("location updates move only the subject's posting and eviction never revives actionable details", () => {
    const { e } = personal();
    const old = e.review("a", 0, profile, self);
    e.fact("a", "local", "location", { x: 12, y: 12 }, 1, "moved and observed");
    expect(
      e.review("a", 1, profile, self).places("stock:food", 6, null, "0,0")
        .entries,
    ).toEqual([]);
    expect(
      e.review("a", 1, profile, self).places("stock:food", 6, null, "3,3")
        .entries.length,
    ).toBe(1);
    expect(old.places("stock:food", 6, null, "0,0").entries.length).toBe(1);
  });
  it("personal searches pin old delivered geography, share pages, restore exact premises and do not reheapify on one-expansion resumes", () => {
    const { e, counts } = personal();
    const v = e.pinGeography("a", "search");
    const s = beginPersonalSearch(
      profile,
      [],
      0,
      100,
      true,
      { speedFactor: 0.7, uncertainty: 1, version: 1, provenance: "public" },
      counts,
      [],
      v,
    );
    resumePersonalSearch(s, 1, counts, 64, v);
    const old = geometryCell(v, 2)!;
    const changed = packet(2, 1);
    changed.terrain[0]!.passable = false;
    changed.terrain[0]!.speed = 0;
    e.observe("a", changed, 1, "observed change", true);
    expect(e.review("a", 1, profile, self).cell(2)!.passable).toBe(false);
    expect(geometryCell(e.geography(v.id), 2)).toEqual(old);
    const restored = new EvidenceService(
        "growth",
        counters(),
        clone(e.persisted()),
      ),
      t = clone(s);
    while (
      resumePersonalSearch(s, 1, counts, 10000, e.geography(v.id)) ===
      "unresolved"
    ) {}
    while (
      resumePersonalSearch(
        t,
        65536,
        counters(),
        10000,
        restored.geography(v.id),
      ) === "unresolved"
    ) {}
    expect(t).toEqual(s);
    expect(counts.personalRouteHeapRebuilds).toBe(0);
    expect(counts.personalGeographyCopied).toBe(0);
    e.unpinGeography("search");
    expect(e.state.pinnedGeography).toEqual([]);
  });
  it("same physical paths used by 100 distinct purposes retain two canonical routes and full journey history", () => {
    const sim = flatWorld("route-reuse");
    const actor = sim.actorKeys()[0]!;
    for (let i = 0; i < 100; i++) {
      const t = task(sim, [move(i % 2 ? 0.35 : 0.85)], String(i));
      t.objective = `independent journey ${i}`;
      sim.diagnosticSelect(t);
      sim.advanceTo(sim.kernel.state.now + time(0.02));
      expect(sim.currentExecution(actor).task).toBeNull();
    }
    const p = sim.personalView(actor);
    expect(p.routes.length).toBe(2);
    expect(p.evidence.filter((e) => e.property === "route-status").length).toBe(
      2,
    );
    expect(
      sim.kernel.state.history.filter(
        (e) => e.kind === "personal-journey-observed",
      ).length,
    ).toBe(100);
    const b = PhysicalSimulation.restore(sim.checkpoint());
    expect(b.personalView(actor)).toEqual(p);
  });
  it("active backing ignores 1000 closed leases and 128 irrelevant goods, including restore", () => {
    const base = clone(resolveConfig()),
      grown = clone(base);
    for (let i = 0; i < 128; i++)
      grown.goods.push({ id: `unused:${i}`, bulk: 1, divisible: true });
    const counts = counters(),
      l = new GoodsLedger(grown, () => ({ x: 0, y: 0 }), counts);
    l.add({
      key: "carry",
      handle: 1,
      kind: "carried",
      location: { kind: "carrier", actor: "a" },
      custodian: "a",
      capacityCu: 10,
      stocks: {},
    });
    l.transact("opening", 0, {
      kind: "source",
      source: "initial-endowment",
      to: "carry",
      good: "food",
      quantity: 8,
    });
    l.transact("active", 0, {
      kind: "reserve",
      actor: "a",
      from: "carry",
      good: "food",
      quantity: 1,
      expires: 100,
    });
    const visit = () => {
      const start = counts.reservationRecordsVisited,
        cat = counts.contentEntriesVisited;
      const result = [
        l.available("carry", "food"),
        l.activeReservations("a").map((r) => r.key),
        l.load("carry"),
      ];
      return {
        result,
        visits: counts.reservationRecordsVisited - start,
        goods: counts.contentEntriesVisited - cat,
      };
    };
    const before = visit();
    for (let i = 0; i < 1000; i++) {
      l.transact(`r${i}`, 0, {
        kind: "reserve",
        actor: "b",
        from: "carry",
        good: "food",
        quantity: 1,
        expires: 1,
      });
      l.transact(
        `end${i}`,
        1,
        i % 2
          ? { kind: "release", actor: "b", reservation: `r${i}` }
          : { kind: "expire", reservation: `r${i}` },
      );
    }
    expect(visit()).toEqual(before);
    const restored = new GoodsLedger(
      grown,
      () => ({ x: 0, y: 0 }),
      counters(),
      clone(l.state),
    );
    expect(restored.available("carry", "food")).toBe(7);
    expect(restored.activeReservations("a").length).toBe(1);
    expect(restored.activeReservations("b")).toEqual([]);
  });
  it("compiled content lookup visits the same posting after 128 irrelevant entries; private repertoire gains nothing", () => {
    const relevant = { id: "known", effects: ["food"], inputs: ["wood"] },
      extra = Array.from({ length: 128 }, (_, i) => ({
        id: `irrelevant:${i}`,
        effects: ["elsewhere"],
        inputs: ["absent"],
      }));
    const a = new MethodIndex([relevant]),
      b = new MethodIndex([relevant, ...extra]);
    let av = 0,
      bv = 0;
    expect(a.query("effect", "food", null, 6, () => av++)).toEqual(
      b.query("effect", "food", null, 6, () => bv++),
    );
    expect(av).toBe(1);
    expect(bv).toBe(1);
    const { e } = personal();
    expect(e.review("a", 0, profile, self).methods("food", 6).entries).toEqual(
      [],
    );
    expect(
      e.review("a", 0, profile, self).methods("contact", 6).entries.length,
    ).toBe(1);
  });
  it("host 1/65536 slicing preserves frontier, spend, time, task and history; no host total cutoff remains", () => {
    const a = flatWorld("host-bound"),
      b = flatWorld("host-bound"),
      t = task(a, [move(2.55)]);
    b.enablePersonal(t.actor);
    a.diagnosticSelect(t);
    b.diagnosticSelect(t);
    while (a.resumePersonalRouting(1)) {}
    while (b.resumePersonalRouting(65536)) {}
    expect(a.causalHash()).toBe(b.causalHash());
    expect(a.currentExecution(t.actor)).toEqual(b.currentExecution(t.actor));
    expect(a.kernel.state.history).toEqual(b.kernel.state.history);
    expect(a.kernel.state.now).toBe(0);
    expect(a.counters.personalRouteHeapRebuilds).toBe(0);
    expect(a.counters.personalRouteHostResumes).toBeGreaterThan(
      b.counters.personalRouteHostResumes,
    );
    a.advanceTo(time(0.2));
    b.advanceTo(time(0.2));
    expect(a.causalHash()).toBe(b.causalHash());
  });
  it("shared causal effort defers without evidence/failure and cannot renew by host resume, renaming, interruption or reload", () => {
    const a = flatWorld("account-bound"),
      t = task(a, [move(2.55)]);
    a.diagnosticRouteEffort(t.actor, "review", 600);
    a.diagnosticSelect(t);
    const before = a.personalView(t.actor);
    while (a.resumePersonalRouting(1)) {}
    expect(a.currentExecution(t.actor).task!.route!.deferred).toBe(true);
    expect(a.currentExecution(t.actor).task!.failure).toBeNull();
    expect(a.personalView(t.actor)).toEqual(before);
    expect(
      a.kernel.state.history.filter((e) => e.kind === "task-repair-required"),
    ).toEqual([]);
    const cp = a.checkpoint();
    for (let i = 0; i < 10; i++)
      expect(a.resumePersonalRouting(65536)).toBe(false);
    expect(a.checkpoint()).toBe(cp);
    a.diagnosticRouteEffort(t.actor, "review");
    expect(a.checkpoint()).toBe(cp);
    const b = PhysicalSimulation.restore(cp);
    a.diagnosticTaskInterrupt(t.actor);
    b.diagnosticTaskInterrupt(t.actor);
    a.diagnosticTaskResume(t.actor);
    b.diagnosticTaskResume(t.actor);
    expect(a.resumePersonalRouting()).toBe(false);
    expect(b.resumePersonalRouting()).toBe(false);
    expect(() => a.diagnosticSelect({ ...t, taskId: "renamed" })).toThrow(
      "existing task",
    );
    a.advanceTo(time(2));
    b.advanceTo(time(2));
    a.diagnosticRouteEffort(t.actor, "review");
    b.diagnosticRouteEffort(t.actor, "review");
    while (a.resumePersonalRouting(1)) {}
    while (b.resumePersonalRouting(65536)) {}
    a.advanceTo(time(2.2));
    b.advanceTo(time(2.2));
    expect(a.causalHash()).toBe(b.causalHash());
    expect(execution(a).task.status).toBe("done");
  });
  it("shared account charges across partial blocks; known graph exhaustion is distinct from deferral", () => {
    const account = {
      key: "a",
      actor: "a",
      kind: "repair" as const,
      openedAt: 0,
      allowance: 40,
      spent: 39,
      routeExpansions: 0,
      prepaidExpansions: 0,
      expansionsPerEu: 64,
    };
    chargeRoute(account, 1);
    expect(account.spent).toBe(40);
    expect(routeAllowance(account)).toBe(63);
    chargeRoute(account, 63);
    expect(routeAllowance(account)).toBe(0);
    expect(() => chargeRoute(account, 1)).toThrow();
    const { e, counts } = personal(),
      v = e.pinGeography("a", "s");
    const s = beginPersonalSearch(
      profile,
      [],
      0,
      100,
      false,
      { speedFactor: 1, uncertainty: 0, version: 1, provenance: "public" },
      counts,
      [],
      v,
    );
    expect(resumePersonalSearch(s, 65536, counts, 0, v)).toBe("deferred");
    expect(s.status).toBe("unresolved");
    expect(resumePersonalSearch(s, 65536, counts, 600 * 64, v)).toBe(
      "unreachable",
    );
  });
  it("hidden remote edits, larger extent and observer reads cannot refresh a personal review or route premises", () => {
    const a = flatWorld("hidden-read"),
      actor = a.actorKeys()[0]!;
    a.enablePersonal(actor);
    const b = editWorld(a, (s) => {
      s.terrain.speed[31 + 17 * 32] = 0.2;
      s.terrain.version++;
    });
    expect(
      a.personalReview(actor).belief("prior:unseen-terrain", "speed-factor"),
    ).toEqual(
      b.personalReview(actor).belief("prior:unseen-terrain", "speed-factor"),
    );
    const before = a.causalHash();
    for (let i = 0; i < 20; i++) {
      a.personalReview(actor).places("stock:food", 6);
      a.personalLens(actor);
      a.currentExecution(actor);
    }
    expect(a.causalHash()).toBe(before);
    const { e, counts } = personal();
    const small = e.review("a", 0, profile, self);
    const start = counts.personalReadEntriesVisited;
    const result = small.places("stock:food", 6);
    const visited = counts.personalReadEntriesVisited - start;
    const large = e.review(
        "a",
        0,
        { ...profile, width: 1024, height: 1024 },
        self,
      ),
      next = counts.personalReadEntriesVisited;
    expect(large.places("stock:food", 6)).toEqual(result);
    expect(counts.personalReadEntriesVisited - next).toBe(visited);
  });
});
