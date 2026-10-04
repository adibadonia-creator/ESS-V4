import fs from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { PhysicalSimulation } from "../src/world/simulation";
import { resolveConfig } from "../src/content/profile";
import { launchBodyFixture } from "../src/runners/bodyFixture";
import { versions } from "../src/kernel/versions";
import { QUANTA, time } from "../src/kernel/time";
import { flatWorld, task } from "../tests/pack0b-fixture";
const median = (v: number[]) =>
  [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]!;
const rows = [];
for (const n of [8, 32]) {
  const advancement: number[] = [],
    checkpoint: number[] = [];
  let receipt: any;
  for (let repetition = 0; repetition < 3; repetition++) {
    const s = new PhysicalSimulation(
      "body-probe",
      resolveConfig({}, { actors: n, sites: n }),
    );
    launchBodyFixture(s);
    let t = performance.now();
    s.advanceTo(5 * QUANTA);
    advancement.push(performance.now() - t);
    t = performance.now();
    const text = s.checkpoint();
    checkpoint.push(performance.now() - t);
    const b = JSON.parse(text).body;
    if (!s.snapshot().reconciliation.ok || s.counters.autonomousDeliberations)
      throw Error("Invalid body probe");
    const restored = PhysicalSimulation.restore(text);
    if (restored.causalHash() !== s.causalHash())
      throw Error("Probe restore mismatch");
    receipt = {
      people: n,
      sd: 5,
      checkpointBytes: Buffer.byteLength(text),
      counters: { ...s.counters },
      bodyBytes: Buffer.byteLength(JSON.stringify(b.adultPhysical.bodies)),
      bodyBytesPerPerson:
        Buffer.byteLength(JSON.stringify(b.adultPhysical.bodies)) / n,
      activePhysicalSegments: b.adultPhysical.segments.length,
      resourceSites: b.adultPhysical.sites.length,
      resourceBytes: Buffer.byteLength(JSON.stringify(b.adultPhysical.sites)),
      rateContexts: b.evidence.people.reduce(
        (sum: number, p: any) => sum + Object.keys(p.rateStatistics).length,
        0,
      ),
      rateProvenanceRows: b.evidence.people.reduce(
        (sum: number, p: any) => sum + Object.keys(p.rateProvenance).length,
        0,
      ),
    };
  }
  rows.push({
    ...receipt,
    advancementMedianMs: median(advancement),
    checkpointMedianMs: median(checkpoint),
  });
}
const s = flatWorld("body-growth"),
  a = s.actorKeys()[0]!;
s.diagnosticFoundAdult(a);
const selected = task(
  s,
  [{ family: "Recover", law: "rest", mode: "rest", duration: time(121) }],
  "long rest",
  time(122),
);
selected.method = "recover";
s.diagnosticSelect(selected);
const growth = [];
for (const sd of [1, 12, 120]) {
  s.advanceTo(time(sd));
  const b = JSON.parse(s.checkpoint()).body;
  growth.push({
    sd,
    bodyRows: b.adultPhysical.bodies.length,
    bodyBytes: Buffer.byteLength(JSON.stringify(b.adultPhysical.bodies)),
    bodyFields: Object.keys(b.adultPhysical.bodies[0]).length,
    activeSegments: b.adultPhysical.segments.length,
    currentActivityPrefixes: b.runtime.activity[0].prefixes.length,
    closures: s.counters.representativeBodyClosures,
    consequentialHistoryRows: b.kernel.history.length,
    paidArchiveRows: b.runtime.paidArchive.length,
    resourceSites: b.adultPhysical.sites.length,
  });
}
const workWorld = flatWorld("body-work-growth"),
  worker = workWorld.actorKeys()[0]!;
workWorld.diagnosticFoundAdult(worker);
const resource = workWorld.diagnosticObserveResource(
  worker,
  workWorld.diagnosticResource(
    "food-patch",
    workWorld.personalReview(worker).self.location,
    24,
  ),
);
const workGrowth = [];
for (let episode = 1; episode <= 128; episode++) {
  const input = task(
    workWorld,
    [{ family: "Work", law: "gather", site: resource, duration: time(0.001) }],
    `paid-work:${episode}`,
    time(0.002),
  );
  input.objective = `paid work episode ${episode}`;
  input.method = "gather";
  workWorld.diagnosticSelect(input);
  workWorld.advanceTo(workWorld.kernel.state.now + time(0.001));
  if ([8, 32, 128].includes(episode)) {
    const b = JSON.parse(workWorld.checkpoint()).body;
    workGrowth.push({
      episodes: episode,
      bodyRows: b.adultPhysical.bodies.length,
      bodyFields: Object.keys(b.adultPhysical.bodies[0]).length,
      bodyBytes: Buffer.byteLength(JSON.stringify(b.adultPhysical.bodies)),
      activeSegments: b.adultPhysical.segments.length,
      resourceSites: b.adultPhysical.sites.length,
      currentRateContexts: Object.keys(b.evidence.people[0].rateStatistics)
        .length,
      archivedRateProvenanceRows: Object.keys(
        b.evidence.people[0].rateProvenance,
      ).length,
      terminalTaskRows: b.runtime.terminal.length,
      methodRecordsConsulted: workWorld.counters.methodRecordsConsulted,
    });
  }
}
const report = {
  profile:
    "controlled diagnostic Stage-I execution; not the Pack-0 performance gate",
  versions,
  machine: {
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model,
    node: process.version,
  },
  repetitions: 3,
  rows,
  growth,
  workGrowth,
};
fs.writeFileSync(
  "docs/PACK0C1_BODY_BENCHMARK.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
