import fs from "node:fs";
import { flatWorld, task, attend, time } from "../tests/pack0b-fixture";
const sim = flatWorld("continuation-cheap"),
  actor = sim.actorKeys()[0]!;
sim.diagnosticFoundAdult(actor);
const selected = task(
  sim,
  [attend(time(0.001)), attend(time(0.001)), attend(time(0.001))],
  "stable-prefix",
);
sim.diagnosticSelect(selected);
sim.enableAutonomous(actor);
if (sim.decisionPanel(actor)!.periodicAt <= time(0.003))
  throw Error("Probe overlaps a periodic wake");
const fields = [
  "autonomousDeliberations",
  "agendaAdmitted",
  "methodsConsidered",
  "forecastBlocks",
  "reviewEuTotal",
  "runtimeStepCompletions",
  "continueTransitions",
  "completionWakes",
] as const;
const read = () =>
  Object.fromEntries(fields.map((k) => [k, sim.counters[k]])) as Record<
    (typeof fields)[number],
    number
  >;
const before = read();
sim.advanceTo(time(0.0025));
const stable = read();
for (const k of fields.slice(0, 5))
  if (stable[k] !== before[k]) throw Error("Valid prefix reopened full review");
if (stable.runtimeStepCompletions - before.runtimeStepCompletions !== 2)
  throw Error("Probe did not advance two steps");
sim.advanceTo(3 * time(0.001));
const completed = read();
if (
  completed.completionWakes - stable.completionWakes !== 1 ||
  completed.autonomousDeliberations - stable.autonomousDeliberations !== 1
)
  throw Error("Completion did not reopen mind");
const receipt = {
  profile:
    "Runtime source-neutral Continue regression: explicit stable three-step execution fixture with an autonomous cognitive owner. No diagnostic selection occurs after founding. Case A is two valid step transitions; Case B is real task completion.",
  before,
  stable,
  completed,
  stableFullReviewEuDelta: stable.reviewEuTotal - before.reviewEuTotal,
  completionFullReviewEuDelta: completed.reviewEuTotal - stable.reviewEuTotal,
};
fs.writeFileSync(
  "docs/PACK0C2_CHEAP_PATH.json",
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(JSON.stringify(receipt, null, 2));
