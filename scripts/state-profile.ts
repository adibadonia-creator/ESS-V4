// Diagnostic sampling excludes construction, checkpoints, and observer exports.
import fs from "node:fs";
import os from "node:os";
import { Session } from "node:inspector/promises";
import { PhysicalSimulation } from "../src/runners/simulation";
import { resolveConfig } from "../src/content/profile";
import { launchEvidenceFixture } from "../src/runners/evidenceFixture";
import { time } from "../src/kernel/time";
import { versions } from "../src/kernel/versions";
const session = new Session();
session.connect();
await session.post("Profiler.enable");
await session.post("Profiler.setSamplingInterval", { interval: 500 });
const samples: Record<string, number> = {},
  leaves: Record<string, number> = {};
let total = 0,
  excluded = 0,
  usable = 0;
for (let run = 0; run < 3; run++) {
  const sim = new PhysicalSimulation(
    "spine",
    resolveConfig({}, { actors: 32 }),
  );
  launchEvidenceFixture(sim);
  await session.post("Profiler.start");
  sim.advanceTo(time(1));
  const { profile } = await session.post("Profiler.stop");
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const parents = new Map<number, number>();
  for (const n of profile.nodes)
    for (const child of n.children ?? []) parents.set(child, n.id);
  for (const id of profile.samples ?? []) {
    total++;
    const leaf = nodes.get(id)!;
    if (
      !leaf.callFrame.url.includes("/ESS-V4/src/") ||
      leaf.callFrame.url.includes("/kernel/numerics")
    ) {
      excluded++;
      continue;
    }
    usable++;
    const path = leaf.callFrame.url.split("/ESS-V4/")[1]!;
    const name = `${path}:${leaf.callFrame.functionName || "(anonymous)"}`;
    leaves[name] = (leaves[name] ?? 0) + 1;
    const stack: string[] = [];
    let next: number | undefined = id;
    while (next !== undefined) {
      stack.push(nodes.get(next)!.callFrame.url);
      next = parents.get(next);
    }
    for (const [label, pattern] of Object.entries({
      evidence: "/src/evidence/",
      perception: "/src/world/perception",
      runtime: "/src/runtime/runtime",
      routing: "/src/runtime/routing",
      canonical: "/src/kernel/canonical",
      kernel: "/src/kernel/kernel",
      goods: "/src/world/goods",
    }))
      if (stack.some((url) => url.includes(pattern)))
        samples[label] = (samples[label] ?? 0) + 1;
  }
}
session.disconnect();
fs.writeFileSync(
  "docs/pre0c-profile.json",
  JSON.stringify(
    {
      fixture:
        "spine, canonical raster, 32 shells, 24 sites, three advancements 0→1 SD only",
      methodology:
        "V8 CPU sampling at 500us; excludes construction/checkpoint/export; usable denominator is src leaf samples excluding inspector/GC/native/unattributed/numerics wrapper; inclusive groups overlap; sampling estimates, not exact accounting",
      versions,
      runtime: process.version,
      machine: os.cpus()[0]?.model,
      total,
      excluded,
      usable,
      inclusiveSamples: samples,
      inclusivePercent: Object.fromEntries(
        Object.entries(samples).map(([k, v]) => [
          k,
          Math.round((1000 * v) / usable) / 10,
        ]),
      ),
      topLeaves: Object.entries(leaves)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25),
    },
    null,
    2,
  ) + "\n",
);
