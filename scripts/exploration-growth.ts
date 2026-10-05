import fs from "node:fs";
import { cognition, profile } from "../tests/exploration-fixture";
import content from "../src/content/physical.json";
import { MethodIndex } from "../src/content/methods";
import { explorationOptions } from "../src/mind/exploration";
import { openReview, ReviewEffort } from "../src/mind/effort";
import { versions } from "../src/kernel/versions";
const keys = [
  "personalReadEntriesVisited",
  "personalReadPagesVisited",
  "personalRouteCellsConsulted",
  "contentEntriesVisited",
  "trialCandidates",
  "inquiryClasses",
] as const;
function review(catalogue?: MethodIndex) {
  const h = cognition(catalogue ? { catalogue } : {}),
    before = { ...h.counts };
  const trace = h.deliberate();
  return {
    eu: trace.effort.spent,
    selected: trace.selected?.method,
    counters: Object.fromEntries(keys.map((k) => [k, h.counts[k] - before[k]])),
  };
}
const catalogue = new MethodIndex([
  ...(content.methods as any[]),
  ...Array.from({ length: 10000 }, (_, i) => ({
    id: `unknown-${i}`,
    effects: ["have:edged-flake"],
    inputs: ["property:glassy"],
  })),
]);
const unknown = { baseline: review(), added10000: review(catalogue) };
if (JSON.stringify(unknown.baseline) !== JSON.stringify(unknown.added10000))
  throw Error("Irrelevant catalogue scaling regression");
const personal = [];
for (const sources of [8, 128, 10000]) {
  const h = cognition({ inquiry: false });
  for (let i = 1; i < sources; i++) {
    const subject = `material-${i}`;
    h.e.fact(
      h.actor,
      subject,
      "location",
      h.self.location,
      0,
      "controlled perceived material",
    );
    h.e.fact(
      h.actor,
      subject,
      "material-kind",
      "glassy-stone",
      0,
      "controlled perceived material",
    );
    h.e.fact(
      h.actor,
      subject,
      "perceptible-properties",
      "hard,glassy",
      0,
      "controlled perceived material",
    );
    h.e.fact(
      h.actor,
      subject,
      "stock:stone",
      12,
      0,
      "controlled perceived material",
    );
  }
  const before = { ...h.counts },
    meter = new ReviewEffort(openReview(h.actor, 0), h.counts);
  const options = explorationOptions(h.review(), h.state, meter);
  const row = {
    sources,
    candidates: options.length,
    eu: meter.account.spent,
    counters: Object.fromEntries(keys.map((k) => [k, h.counts[k] - before[k]])),
    causalEvidenceBytes: Buffer.byteLength(JSON.stringify(h.e.state)),
  };
  if (row.candidates > 2 || row.eu > 600)
    throw Error("Unbounded personal trial generation");
  personal.push(row);
}
const report = {
  versions,
  profile,
  workload:
    "Controlled indexed cognition. Global unobserved successful schemas versus genuinely accumulated compatible personal sources. Startup/writer construction and state bytes are separate from review work.",
  unknown,
  personal,
  physicalGrowthProof:
    "tests/exploration.test.ts separately pairs 10,000 hidden physical materials/sites, goods, and material kinds; traces and review counters remain equal.",
};
fs.writeFileSync(
  "docs/PACK0C3A_STRUCTURAL_GROWTH.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
