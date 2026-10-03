import { performance } from "node:perf_hooks";
import os from "node:os";
import { PhysicalSimulation } from "../world/simulation";
import { launchPhysicalFixture } from "./fixture";
import { time } from "../kernel/time";
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
    },
    null,
    2,
  ),
);
