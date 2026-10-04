import { EvidenceService } from "../evidence/service";
import { counters } from "../kernel/counters";
import { time } from "../kernel/time";
import { PhysicalSimulation } from "../world/simulation";
import { launchEvidenceFixture } from "./evidenceFixture";
// Diagnostic observations and preselected paid attention, never an autonomous review.
export function memoryProbe(days = 12) {
  const sim = new PhysicalSimulation("spine");
  launchEvidenceFixture(sim);
  sim.advanceTo(time(1));
  for (const actor of sim.actorKeys()) {
    sim.diagnosticTaskAbandon(actor);
    sim.diagnosticSelect({
      actor,
      intentionId: "memory-probe:" + actor,
      taskId: "memory-probe-task:" + actor,
      semanticKey: "paid-memory-probe",
      objective: "diagnostic long-lived local attention",
      method: "contact",
      bindings: {},
      dependsOn: [],
      reserve: [],
      authorised: { time: time(days), goods: {} },
      source: "diagnostic-selected-intention",
      steps: Array.from({ length: days }, () => ({
        family: "Attend" as const,
        duration: time(1),
        scope: "local-survey" as const,
      })),
    });
  }
  const paidRows = [];
  for (let day = 1; day <= days; day++) {
    for (let q = 1; q <= 12; q++) {
      sim.advanceTo(time(day + q / 16));
      for (const actor of sim.actorKeys()) sim.diagnosticObserve(actor, false);
    }
    sim.advanceTo(time(day + 1));
    const state = JSON.parse(sim.checkpoint()).body;
    paidRows.push({
      elapsedSd: day,
      retainedEvidence: state.evidence.people.reduce(
        (n: number, p: any) => n + p.records.length,
        0,
      ),
      places: state.evidence.people.map(
        (p: any) => Object.keys(p.memory.places).length,
      ),
      mapCells: state.evidence.people.reduce(
        (n: number, p: any) => n + Object.keys(p.cells).length,
        0,
      ),
      mapObservations: state.evidence.people.reduce(
        (n: number, p: any) => n + Object.keys(p.mapObservations).length,
        0,
      ),
      personalBytes: JSON.stringify(state.evidence).length,
      evidenceUpdates: sim.counters.evidenceUpdates,
      kernelHistoryRecords: state.kernel.history.length,
    });
  }
  // Isolated evidence-writer stress: 144 distinct delivered visible-place observations.
  // Physical non-deletion is independently tested against an actual 80-site world.
  const e = new EvidenceService("memory-churn", counters());
  e.register("diagnostic-observer");
  const churnRows = [];
  for (let day = 0; day < days; day++) {
    e.observe(
      "diagnostic-observer",
      {
        terrain: [],
        facts: Array.from({ length: 12 }, (_, i) => ({
          reference: `visible-place:${day * 12 + i}`,
          kind: "site" as const,
          position: { x: i * 0.02, y: 0 },
          properties: [
            {
              property: "stock:food",
              value: 0,
              volatility: "fast" as const,
              uncertainty: 0,
            },
          ],
          detection: 1,
        })),
        footprint: { cells: [], duration: 0 },
      },
      time(day),
      "declared visible-place memory stress",
    );
    const p = e.state.people[0]!;
    churnRows.push({
      elapsedSd: day + 1,
      retainedEvidence: p.records.length,
      places: Object.keys(p.memory.places).length,
      retainedDedupKeys: Object.keys(p.delivered).length,
      evictions: p.memory.evictions,
    });
  }
  return {
    description:
      "12 SD: eight actors in one paid 12-step Attend task with routine observations; separate visible-packet writer churn fixture; not a population performance proof",
    paidAttention: paidRows,
    discretionaryChurn: churnRows,
    finalHash: sim.causalHash(),
  };
}
