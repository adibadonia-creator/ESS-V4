import fs from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { PhysicalSimulation } from "../src/runners/simulation";
import { resolveConfig } from "../src/content/profile";
import { launchAutonomousFixture } from "../src/runners/autonomousFixture";
import { QUANTA } from "../src/kernel/time";
import { versions } from "../src/kernel/versions";
import type { DecisionTrace } from "../src/mind/types";
const percentile = (v: number[], p: number) =>
  [...v].sort((a, b) => a - b)[
    Math.min(v.length - 1, Math.ceil(v.length * p) - 1)
  ]!;
const bytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v));
const rows = [];
let forensic: DecisionTrace | null = null;
for (const adults of [8, 32]) {
  const advancement: number[] = [],
    checkpoint: number[] = [];
  let row: any;
  for (let repetition = 0; repetition < 3; repetition++) {
    const sim = new PhysicalSimulation(
      "autonomous-panel",
      resolveConfig({}, { actors: adults, sites: adults }),
    );
    launchAutonomousFixture(sim);
    const traces = new Map<string, DecisionTrace>();
    const selected: Record<string, number> = {},
      retained: Record<string, number> = {};
    for (let day = 1; day <= 8; day++) {
      let elapsed = 0;
      for (let eighth = 1; eighth <= 8; eighth++) {
        let start = performance.now();
        sim.advanceTo((day - 1) * QUANTA + (eighth * QUANTA) / 8);
        elapsed += performance.now() - start;
        for (const actor of sim.actorKeys())
          for (const trace of sim.decisionPanel(actor)!.traces)
            traces.set(`${actor}:${trace.at}`, trace);
      }
      advancement.push(elapsed);
    }
    if (traces.size !== sim.counters.reviewWakesExecuted)
      throw Error("Panel trace collection missed a review");
    for (const trace of traces.values()) {
      const chosen = trace.selected?.method ?? "continuation";
      selected[chosen] = (selected[chosen] ?? 0) + 1;
      retained[trace.rule] = (retained[trace.rule] ?? 0) + 1;
      if (!forensic && trace.selected?.method === "consume") forensic = trace;
    }
    const start = performance.now(),
      text = sim.checkpoint();
    checkpoint.push(performance.now() - start);
    const saved = JSON.parse(text).body;
    const restored = PhysicalSimulation.restore(text);
    if (
      restored.causalHash() !== sim.causalHash() ||
      !sim.snapshot().reconciliation.ok
    )
      throw Error("Panel replay/conservation failure");
    const traceBytes = saved.mind.reduce(
      (sum: number, m: any) => sum + bytes(m.traces),
      0,
    );
    const hotBytes = saved.mind.reduce((sum: number, m: any) => {
      const { traces: _trace, ...hot } = m;
      return sum + bytes(hot);
    }, 0);
    const denominator = adults * 8;
    row = {
      adults,
      sd: 8,
      hash: sim.causalHash(),
      checkpointBytes: bytes(JSON.parse(text)),
      mindHotBytesPerPerson: hotBytes / adults,
      traceBytesPerPerson: traceBytes / adults,
      reviewsPerPersonSd: sim.counters.reviewWakesExecuted / denominator,
      euPerPersonSd: sim.counters.reviewEuTotal / denominator,
      selected,
      arbitrationRules: retained,
      counters: { ...sim.counters },
      bodyAtEnd: sim
        .actorKeys()
        .map((actor) => ({ actor, body: sim.analystBody(actor) })),
      traceSummaries: [...traces.values()]
        .sort((a, b) => a.at - b.at || a.actor.localeCompare(b.actor))
        .map((t) => ({
          actor: t.actor,
          atSd: t.at / QUANTA,
          causes: t.causes,
          method: t.selected?.method ?? "continuation",
          rule: t.rule,
          eu: t.effort.spent,
          winner: t.winner,
          rejected: t.rejected,
          margin: t.margin,
          alternatives: t.compared.map((x) => ({
            method: x.option.method,
            reference: x.option.reference,
            value: x.value,
            error: x.error,
            severeProbability: x.consequences.severeProbability,
            gate: x.gate,
          })),
          steps:
            t.selected?.steps.map((s) =>
              s.family === "Work" || s.family === "Recover"
                ? `${s.family}:${s.law}`
                : s.family,
            ) ?? [],
        })),
    };
  }
  rows.push({
    ...row,
    advancementPerSdMedianMs: percentile(advancement, 0.5),
    advancementPerSdP95Ms: percentile(advancement, 0.95),
    checkpointMedianMs: percentile(checkpoint, 0.5),
    checkpointP95Ms: percentile(checkpoint, 0.95),
  });
}
const report = {
  profile:
    "Controlled 8/32 autonomous adults, canonical raster, eight SD, three repetitions. Founding observation only; no selected tasks or action quota. Timing excludes observer trace publication. Not final Pack-0 performance certification.",
  versions,
  machine: {
    node: process.version,
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model,
  },
  rows,
};
fs.writeFileSync(
  "docs/PACK0C2_AUTONOMOUS_PANEL.json",
  JSON.stringify(report, null, 2) + "\n",
);
fs.writeFileSync(
  "docs/PACK0C2_DECISION_TRACE.json",
  JSON.stringify(forensic, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    rows.map(({ traceSummaries: _traces, bodyAtEnd: _body, ...row }) => row),
    null,
    2,
  ),
);
