import fs from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { flatWorld, task, attend, move, time } from "../tests/pack0b-fixture";
import { EvidenceService } from "../src/evidence/service";
import { counters } from "../src/kernel/counters";
import { GoodsLedger } from "../src/world/goods";
import { resolveConfig } from "../src/content/profile";
import { MethodIndex } from "../src/content/methods";
import { versions } from "../src/kernel/versions";
import { PhysicalSimulation } from "../src/runners/simulation";
const sim = flatWorld("episode-growth"),
  actor = sim.actorKeys()[0]!;
const episodes = [];
for (let i = 0; i < 512; i++) {
  const selected = task(sim, [attend(time(0.001))], String(i));
  selected.objective = `independent paid episode ${i}`;
  sim.diagnosticSelect(selected);
  sim.advanceTo(sim.kernel.state.now + time(0.002));
  if ([8, 32, 96, 256, 512].includes(i + 1)) {
    const before = sim.counters.terminalTaskRowsVisited,
      current = sim.currentExecution(actor),
      r = JSON.parse(sim.checkpoint()).body.runtime;
    episodes.push({
      episodes: i + 1,
      activeTasks: r.tasks.length,
      terminalTasks: r.terminal.length,
      activePrefixes: r.activity.reduce(
        (n: number, a: any) => n + a.prefixes.length,
        0,
      ),
      paidArchive: r.paidArchive.length,
      retryRecords: Object.keys(r.retry).length,
      terminalRowsVisited: sim.counters.terminalTaskRowsVisited - before,
      hotBytes: Buffer.byteLength(
        JSON.stringify({ tasks: r.tasks, activity: r.activity }),
      ),
      archiveBytes: Buffer.byteLength(
        JSON.stringify({ terminal: r.terminal, paid: r.paidArchive }),
      ),
      backingBytes: Buffer.byteLength(
        JSON.stringify({
          budgets: r.budgets,
          retry: r.retry,
          purpose: r.purpose,
          issued: r.issuedTaskIds,
          latest: r.latestTerminal,
          effort: r.effort,
          currentEffort: r.currentEffort,
        }),
      ),
      currentTask: current.task,
    });
  }
}
const restored = PhysicalSimulation.restore(sim.checkpoint());
const count = counters(),
  e = new EvidenceService("growth", count);
e.register("a");
e.foundMethods("a", ["contact", "exchange"], 0);
e.foundTraversalPrior(
  "a",
  { speedFactor: 0.7, uncertainty: 1, context: "public" },
  0,
);
e.fact("a", "local", "location", { x: 0.25, y: 0.25 }, 0, "local");
e.fact("a", "local", "stock:food", 4, 0, "local");
const self = {
    identity: "a",
    location: { x: 0.25, y: 0.25 },
    currentLeg: null,
    carried: { subject: "own", stocks: { food: 1 } },
    reservations: [],
  },
  profile = { width: 256, height: 192, cellKm: 0.1, regionCells: 32 };
const localCells = Array.from({ length: 8 }, (_, cell) => ({
  cell,
  terrain: 0,
  passable: true,
  speed: 1,
  detection: 1,
}));
e.observe(
  "a",
  {
    terrain: localCells,
    facts: [],
    footprint: {
      duration: 1,
      cells: localCells.map((c) => ({ cell: c.cell, detection: 1 })),
    },
  },
  0,
  "local survey",
  true,
);
const geography = [];
for (const n of [0, 1000, 5000, 12000]) {
  if (n) {
    const cells = Array.from({ length: n }, (_, i) => ({
      cell: 4096 + i,
      terrain: 0,
      passable: true,
      speed: 1,
      detection: 1,
    }));
    e.observe(
      "a",
      {
        terrain: cells,
        facts: [],
        footprint: {
          duration: 1,
          cells: cells.map((c) => ({ cell: c.cell, detection: 1 })),
        },
      },
      n,
      "legitimate delivered distant survey",
      true,
    );
  }
  const before = count.personalReadEntriesVisited,
    map = count.personalReadPagesVisited,
    start = performance.now(),
    review = e.review("a", n, profile, self);
  const belief = review.belief("local", "stock:food"),
    places = review.places("stock:food", 6, null, "0,0");
  geography.push({
    rememberedCells: Object.keys(e.state.people[0]!.cells).length,
    beliefValue: belief?.value,
    places: places.entries.length,
    entriesVisited: count.personalReadEntriesVisited - before,
    mapPagesVisited: count.personalReadPagesVisited - map,
    fullInspectorCalls: count.personalViewProjections,
    lookupMs: performance.now() - start,
  });
}
const routeSim = flatWorld("route-reuse"),
  routes = [];
for (let i = 0; i < 100; i++) {
  const t = task(routeSim, [move(i % 2 ? 0.35 : 0.85)], String(i));
  t.objective = `independent journey ${i}`;
  routeSim.diagnosticSelect(t);
  routeSim.advanceTo(routeSim.kernel.state.now + time(0.02));
  if ([8, 32, 100].includes(i + 1)) {
    const v = routeSim.personalView(routeSim.actorKeys()[0]!);
    routes.push({
      journeys: i + 1,
      canonicalRoutes: v.routes.length,
      routeEvidence: v.evidence.filter((e) => e.property === "route-status")
        .length,
      journeyFacts: routeSim.kernel.state.history.filter(
        (e) => e.kind === "personal-journey-observed",
      ).length,
    });
  }
}
const gc = counters(),
  config = JSON.parse(JSON.stringify(resolveConfig()));
for (let i = 0; i < 128; i++)
  config.goods.push({ id: `unused:${i}`, bulk: 1, divisible: true });
const ledger = new GoodsLedger(config, () => ({ x: 0, y: 0 }), gc);
ledger.add({
  key: "carry",
  handle: 1,
  kind: "carried",
  location: { kind: "carrier", actor: "a" },
  custodian: "a",
  capacityCu: 10,
  stocks: {},
});
ledger.transact("opening", 0, {
  kind: "source",
  source: "initial-endowment",
  to: "carry",
  good: "food",
  quantity: 8,
});
ledger.transact("active", 0, {
  kind: "reserve",
  actor: "a",
  from: "carry",
  good: "food",
  quantity: 1,
  expires: 100,
});
const reservations = [];
for (let i = 0; i <= 1000; i++) {
  if ([0, 100, 1000].includes(i)) {
    const before = gc.reservationRecordsVisited,
      goods = gc.contentEntriesVisited;
    const available = ledger.available("carry", "food"),
      active = ledger.activeReservations("a").length,
      load = ledger.load("carry");
    reservations.push({
      closed: i,
      total: ledger.state.reservations.length,
      active,
      available,
      load,
      visits: gc.reservationRecordsVisited - before,
      goodsVisited: gc.contentEntriesVisited - goods,
      totalGoods: config.goods.length,
    });
  }
  if (i < 1000) {
    ledger.transact(`r${i}`, 0, {
      kind: "reserve",
      actor: "b",
      from: "carry",
      good: "food",
      quantity: 1,
      expires: 1,
    });
    ledger.transact(
      `end${i}`,
      1,
      i % 2
        ? { kind: "release", actor: "b", reservation: `r${i}` }
        : { kind: "expire", reservation: `r${i}` },
    );
  }
}
const content = [0, 128].map((n) => {
  let visits = 0;
  const index = new MethodIndex([
    { id: "known", effects: ["food"], inputs: ["wood"] },
    ...Array.from({ length: n }, (_, i) => ({
      id: `unused:${i}`,
      effects: ["unrelated"],
      inputs: ["absent"],
    })),
  ]);
  return {
    entries: n + 1,
    query: index.query("effect", "food", null, 6, () => visits++),
    visits,
  };
});
const host = [1, 65536].map((slice) => {
  const a = flatWorld("host-bound"),
    t = task(a, [move(2.55)]);
  a.diagnosticSelect(t);
  while (a.resumePersonalRouting(slice)) {}
  const r = JSON.parse(a.checkpoint()).body.runtime;
  return {
    slice,
    time: a.kernel.state.now,
    hash: a.causalHash(),
    task: a.currentExecution(t.actor).task,
    effort: r.effort,
    counters: a.counters,
  };
});
const receipt = {
  fixture:
    "Deterministic structural diagnostics, not autonomous cognition or Pack-0 performance proof",
  versions,
  runtime: process.version,
  machine: os.cpus()[0]?.model,
  episodes,
  restoreHashEqual: sim.causalHash() === restored.causalHash(),
  geography,
  routes,
  reservations,
  content,
  host,
};
fs.writeFileSync(
  process.argv[2] ?? "docs/pre0c-growth.json",
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      episodes,
      geography,
      routes,
      reservations,
      content,
      hostEqual: host[0]!.hash === host[1]!.hash,
    },
    null,
    2,
  ),
);
