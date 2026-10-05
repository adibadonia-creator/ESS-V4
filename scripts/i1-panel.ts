import fs from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { createMaterialFixture } from "../src/runners/materialFixture";
import { PhysicalSimulation } from "../src/runners/simulation";
import { QUANTA } from "../src/kernel/time";
import { versions } from "../src/kernel/versions";
const panels = [];
for (const seed of ["material-life", "material-life-b", "material-life-c"]) {
  const sim = createMaterialFixture(seed),
    choices: Record<string, number> = {},
    seen = new Set<string>(),
    times: number[] = [],
    samples = [];
  for (let i = 1; i <= 40; i++) {
    const at = Math.round(i * 0.05 * QUANTA),
      start = performance.now();
    sim.advanceTo(at);
    times.push(performance.now() - start);
    for (const actor of sim.actorKeys())
      for (const t of sim.decisionPanel(actor)?.traces ?? []) {
        const key = actor + ":" + t.at + ":" + t.epoch + ":" + t.signature;
        if (seen.has(key)) continue;
        seen.add(key);
        const method = t.selected?.method ?? "continue";
        choices[method] = (choices[method] ?? 0) + 1;
      }
    if (i % 10 === 0) {
      const snapshot = sim.snapshot(),
        material = sim.materialSnapshot(),
        body = JSON.parse(sim.checkpoint()).body;
      samples.push({
        sd: i * 0.05,
        conservation: snapshot.reconciliation.ok,
        condition: snapshot.actors.map((a) => a.body?.c),
        items: material.items.map((i) => ({
          kind: i.kind,
          durability: i.durability,
        })),
        completedWork: material.work.filter((w) => w.complete).length,
        locatedWork: material.work.filter((w) => !w.complete).length,
        liveProjects: body.mind.reduce(
          (n: number, m: any) =>
            n +
            (m.projects ?? []).filter(
              (p: any) => !["complete", "abandoned"].includes(p.status),
            ).length,
          0,
        ),
        tasks: body.runtime.tasks.map((t: any) => ({
          method: t.method,
          status: t.status,
          cursor: t.cursor,
        })),
        checkpointBytes: Buffer.byteLength(sim.checkpoint()),
      });
    }
  }
  const checkpoint = sim.checkpoint(),
    restored = PhysicalSimulation.restore(checkpoint),
    before = sim.causalHash();
  sim.snapshot();
  sim.materialSnapshot();
  for (const a of sim.actorKeys()) sim.decisionPanel(a);
  const observerInert = before === sim.causalHash();
  sim.advanceTo(Math.round(2.1 * QUANTA));
  restored.advanceTo(Math.round(2.1 * QUANTA));
  const body = JSON.parse(sim.checkpoint()).body;
  panels.push({
    seed,
    actors: 4,
    sd: 2,
    selectedMethods: choices,
    samples,
    advanceMs: {
      total: times.reduce((a, b) => a + b, 0),
      max: Math.max(...times),
    },
    observerInert,
    activeRestoreEqual: sim.causalHash() === restored.causalHash(),
    effortWithinAllowance: Object.values(body.runtime.effort).every(
      (e: any) => e.spent <= e.allowance,
    ),
    repairs: Object.values(
      sim.kernel.state.history
        .filter((e) => e.kind === "bounded-repair-result")
        .reduce(
          (
            out: Record<
              string,
              {
                installed: boolean;
                reason: string;
                count: number;
                maxEu: number;
              }
            >,
            e,
          ) => {
            const d = e.detail as {
                installed: boolean;
                reason: string;
                effort: { spent: number };
              },
              key = String(d.installed) + ":" + d.reason;
            const row = (out[key] ??= {
              installed: d.installed,
              reason: d.reason,
              count: 0,
              maxEu: 0,
            });
            row.count++;
            row.maxEu = Math.max(row.maxEu, d.effort.spent);
            return out;
          },
          {},
        ),
    ),
    counters: Object.fromEntries(
      Object.entries(sim.counters).filter(([key]) =>
        [
          "reviewEuTotal",
          "routeEu",
          "bindingEu",
          "forecastEu",
          "personalReadEntriesVisited",
          "methodsConsidered",
          "repairRequiredTransitions",
          "taskInterruptions",
          "autonomousIntentionsCommitted",
          "workSettlements",
          "consumptionSettlements",
        ].includes(key),
      ),
    ),
  });
}
const receipt = {
  scope:
    "Three seeds, four adults, two SD; declared founding prehistory/endowments/observations, no selected actions. Diagnostic natural panel, no behavioral quotas or performance certification.",
  runtime: process.version,
  machine: os.cpus()[0]?.model,
  versions,
  panels,
};
fs.writeFileSync(
  process.argv[2] ?? "docs/STAGE_I1_NATURAL_PANEL.json",
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    panels.map((p) => ({
      seed: p.seed,
      choices: p.selectedMethods,
      restore: p.activeRestoreEqual,
      conservation: p.samples.every((s) => s.conservation),
      advanceMs: p.advanceMs,
    })),
    null,
    2,
  ),
);
