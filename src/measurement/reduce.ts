import type { Snapshot } from "../projection/types";
// Read-only reducers accept detached DTOs, never authoritative state/services.
export function summarize(s: Snapshot) {
  return {
    seed: s.seed,
    timeSd: s.time / 2 ** 20,
    hash: s.hash,
    eventHash: s.eventHash,
    actors: s.actors.length,
    moving: s.actors.filter((a) => a.motionStatus === "moving").length,
    paidTravelSd: s.actors.reduce((n, a) => n + a.paidTravelSd, 0),
    conservation: s.reconciliation.ok,
    goods: s.reconciliation.totals,
  };
}
