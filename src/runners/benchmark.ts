import { performance } from "node:perf_hooks";
import os from "node:os";
import { PhysicalSimulation } from "../world/simulation";
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
  snapshotMs: number;
  checkpointBytes: number;
  hash: string;
  counters: Record<string, number>;
};
const rows: Row[] = [];
for (let run = 0; run < 5; run++) {
  const start = performance.now(),
    sim = new PhysicalSimulation("spine"),
    generated = performance.now();
  launchPhysicalFixture(sim);
  const launch = performance.now();
  sim.advanceTo(time(1));
  const advanced = performance.now();
  const cp = sim.checkpoint(),
    saved = performance.now();
  const hash = sim.causalHash(),
    hashed = performance.now();
  sim.snapshot();
  const projected = performance.now();
  rows.push({
    generateMs: generated - start,
    fixtureMs: launch - generated,
    advanceMs: advanced - launch,
    checkpointMs: saved - advanced,
    hashMs: hashed - saved,
    snapshotMs: projected - hashed,
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
      fixture:
        "Pack0A physical diagnostic, canonical raster, 8 shells, 24 finite sites, until 1 SD; no biology/minds",
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
          "snapshotMs",
        ].map((k) => [k, median(k as keyof (typeof rows)[number])]),
      ),
      rows,
      ...(process.argv.includes("--storage-probe")
        ? { storageProbe: storageProbe() }
        : {}),
    },
    null,
    2,
  ),
);
