// Measurement only: never serialized into causal state or used by a law.
export interface Counters {
  perceptionCandidateChecks: number;
  routineObservations: number;
  evidenceUpdates: number;
  personalRouteRegionExpansions: number;
  personalRouteSearches: number;
  personalRouteExpansions: number;
  runtimeStepStarts: number;
  runtimeStepCompletions: number;
  continueTransitions: number;
  repairRequiredTransitions: number;
  taskInterruptions: number;
  personalViewProjections: number;
  autonomousDeliberations: number;
  events: number;
  staleEvents: number;
  heapPushes: number;
  heapPops: number;
  heapCompactions: number;
  transactionCommits: number;
  transactionRejections: number;
  routeSearches: number;
  routeExpansions: number;
  routeRegionExpansions: number;
  spatialQueries: number;
  projectionEntities: number;
  checkpoints: number;
  checkpointBytes: number;
}
export function counters(): Counters {
  return {
    perceptionCandidateChecks: 0,
    routineObservations: 0,
    evidenceUpdates: 0,
    personalRouteRegionExpansions: 0,
    personalRouteSearches: 0,
    personalRouteExpansions: 0,
    runtimeStepStarts: 0,
    runtimeStepCompletions: 0,
    continueTransitions: 0,
    repairRequiredTransitions: 0,
    taskInterruptions: 0,
    personalViewProjections: 0,
    autonomousDeliberations: 0,
    events: 0,
    staleEvents: 0,
    heapPushes: 0,
    heapPops: 0,
    heapCompactions: 0,
    transactionCommits: 0,
    transactionRejections: 0,
    routeSearches: 0,
    routeExpansions: 0,
    routeRegionExpansions: 0,
    spatialQueries: 0,
    projectionEntities: 0,
    checkpoints: 0,
    checkpointBytes: 0,
  };
}
