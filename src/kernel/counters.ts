// Measurement only: never serialized into causal state or used by a law.
export interface Counters {
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
