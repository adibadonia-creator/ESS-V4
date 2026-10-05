import { memoryProbe } from "./memoryProbe";
import { performance } from "node:perf_hooks";
import os from "node:os";
import { PhysicalSimulation } from "../runners/simulation";
import { launchEvidenceFixture } from "./evidenceFixture";
import { launchPhysicalFixture } from "./fixture";
import { time } from "../kernel/time";
import { resolveConfig } from "../content/profile";
import type { SearchState } from "../world/routing";
type Row = {
  generateMs: number;
  fixtureMs: number;
  advanceMs: number;
  checkpointMs: number;
  hashMs: number;
  personalProjectionMs: number;
  snapshotMs: number;
  checkpointBytes: number;
  hash: string;
  retainedEvidence: number;
  rememberedPlaces: number[];
  discretionaryPlaces: number[];
  pinnedPlaces: number[];
  personalBytes: number;
  mapObservations: number;
  counters: Record<string, number>;
  runtimeState: Record<string, number>;
  narrowReadMs: number | null;
  geographyCells: number;
};
const pack0b = process.argv.includes("--pack0b"),
  probe32 = process.argv.includes("--probe32");
const rows: Row[] = [];
for (let run = 0; run < 5; run++) {
  const start = performance.now(),
    sim = new PhysicalSimulation(
      "spine",
      resolveConfig({}, probe32 ? { actors: 32 } : {}),
    ),
    generated = performance.now();
  if (pack0b) launchEvidenceFixture(sim);
  else launchPhysicalFixture(sim);
  const launch = performance.now();
  sim.advanceTo(time(1));
  const advanced = performance.now();
  const cp = sim.checkpoint(),
    saved = performance.now();
  const hash = sim.causalHash(),
    hashed = performance.now();
  const hasNarrow = typeof (sim as any).personalReview === "function";
  if (pack0b && hasNarrow)
    for (const actor of sim.actorKeys()) {
      const review = (sim as any).personalReview(actor);
      review.belief("prior:unseen-terrain", "speed-factor");
      review.methods("contact", 6);
    }
  const narrowRead = performance.now();
  if (pack0b) for (const actor of sim.actorKeys()) sim.personalLens(actor);
  const personalProjected = performance.now();
  sim.snapshot();
  const projected = performance.now();
  const body = JSON.parse(cp).body,
    runtime = body.runtime;
  const epistemic = body.evidence.people;
  rows.push({
    runtimeState: {
      currentTasks: runtime.tasks.filter(
        (t: any) => !["done", "failed", "abandoned"].includes(t.status),
      ).length,
      hotTableTasks: runtime.tasks.length,
      terminalTasks:
        runtime.terminal?.length ??
        runtime.tasks.filter((t: any) =>
          ["done", "failed", "abandoned"].includes(t.status),
        ).length,
      activePrefixes: runtime.activity.reduce(
        (n: number, a: any) => n + a.prefixes.length,
        0,
      ),
      archivedPrefixes: runtime.paidArchive?.length ?? 0,
      hotBytes: Buffer.byteLength(
        JSON.stringify({ tasks: runtime.tasks, activity: runtime.activity }),
      ),
      backingBytes: Buffer.byteLength(
        JSON.stringify({
          budgets: runtime.budgets,
          retry: runtime.retry ?? {},
          effort: runtime.effort ?? {},
        }),
      ),
      archiveBytes: Buffer.byteLength(
        JSON.stringify({
          terminal: runtime.terminal ?? [],
          paid: runtime.paidArchive ?? [],
          activity: runtime.activityArchive ?? [],
        }),
      ),
    },
    geographyCells: epistemic.reduce(
      (n: number, p: any) => n + Object.keys(p.cells).length,
      0,
    ),
    narrowReadMs: hasNarrow ? narrowRead - hashed : null,
    retainedEvidence: epistemic.reduce(
      (n: number, p: any) => n + p.records.length,
      0,
    ),
    rememberedPlaces: epistemic.map(
      (p: any) => Object.keys(p.memory.places).length,
    ),
    discretionaryPlaces: pack0b
      ? sim
          .actorKeys()
          .map((a) => sim.personalView(a).memory.discretionaryPlaces)
      : [],
    pinnedPlaces: pack0b
      ? sim.actorKeys().map((a) => sim.personalView(a).memory.pinnedPlaces)
      : [],
    personalBytes: Buffer.byteLength(JSON.stringify({ people: epistemic })),
    mapObservations: epistemic.reduce(
      (n: number, p: any) => n + Object.keys(p.mapObservations).length,
      0,
    ),
    generateMs: generated - start,
    fixtureMs: launch - generated,
    advanceMs: advanced - launch,
    checkpointMs: saved - advanced,
    hashMs: hashed - saved,
    personalProjectionMs: personalProjected - narrowRead,
    snapshotMs: projected - personalProjected,
    checkpointBytes: Buffer.byteLength(cp),
    hash,
    counters: { ...sim.counters },
  });
}
const median = (key: keyof (typeof rows)[number]) =>
  rows.map((r) => r[key] as number).sort((a, b) => a - b)[2];
// Separate persistence probe; never changes the five canonical timed runs.
function storageProbe() {
  const sim = new PhysicalSimulation(
    "spine",
    resolveConfig({}, { routeExpansionsPerResume: 1 }),
  );
  const snapshot = sim.snapshot(),
    actor = snapshot.actors[0]!;
  const target = snapshot.containers
    .filter((c) => c.kind === "site")
    .sort((a, b) => {
      const da =
          (a.position.x - actor.position.x) ** 2 +
          (a.position.y - actor.position.y) ** 2,
        db =
          (b.position.x - actor.position.x) ** 2 +
          (b.position.y - actor.position.y) ** 2;
      return da - db || (a.key < b.key ? -1 : 1);
    })[0]!;
  const status = sim.diagnosticMove(actor.key, target.position),
    checkpoint = sim.checkpoint();
  const search = (
    JSON.parse(checkpoint).body.routes[0] as { search: SearchState }
  ).search;
  const legacy = search as unknown as Record<string, unknown>;
  return {
    fixture:
      "Canonical spine raster, 8 shells/24 sites, first selected route after one expansion at 0 SD",
    status,
    checkpointBytes: Buffer.byteLength(checkpoint),
    searchBytes: Buffer.byteLength(JSON.stringify(search)),
    arraySlots: ["g", "parent", "closed"].reduce(
      (n, key) => n + (Array.isArray(legacy[key]) ? legacy[key].length : 0),
      0,
    ),
    discoveredLocal: Object.keys(search.nodes).length,
    discoveredRegional: search.regional
      ? Object.keys(search.regional.nodes).length
      : 0,
    routeExpansions: sim.counters.routeExpansions,
    routeRegionExpansions: sim.counters.routeRegionExpansions,
  };
}
console.log(
  JSON.stringify(
    {
      fixture: pack0b
        ? `Pack0B diagnostic selected-intention fixture, canonical raster, ${probe32 ? 32 : 8} shells, 24 sites, until 1 SD; knowledge/execution only; not the Pack0 performance gate`
        : "Pack0A physical diagnostic, canonical raster, 8 shells, 24 finite sites, until 1 SD; no biology/minds",
      runtime: process.version,
      machine: os.cpus()[0]?.model,
      platform: os.platform() + " " + os.arch(),
      repetitions: 5,
      medianMs: Object.fromEntries(
        [
          "generateMs",
          "fixtureMs",
          "advanceMs",
          "checkpointMs",
          "hashMs",
          "personalProjectionMs",
          "snapshotMs",
        ].map((k) => [k, median(k as keyof (typeof rows)[number])]),
      ),
      rows,
      ...(process.argv.includes("--memory-probe")
        ? { memoryProbe: memoryProbe() }
        : {}),
      ...(process.argv.includes("--storage-probe")
        ? { storageProbe: storageProbe() }
        : {}),
    },
    null,
    2,
  ),
);
