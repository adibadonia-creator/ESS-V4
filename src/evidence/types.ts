// Mind-safe values: no authoritative handles, registries or scheduler references.
export interface Point {
  x: number;
  y: number;
}
export interface MapProfile {
  width: number;
  height: number;
  cellKm: number;
  regionCells: number;
}
export interface SeenCell {
  cell: number;
  terrain: number;
  passable: boolean;
  speed: number;
  detection: number;
}
export interface Footprint {
  cells: { cell: number; detection: number }[];
  duration: number;
}
export type Value =
  | string
  | number
  | boolean
  | null
  | Point
  | SeenCell[]
  | Record<string, number>
  | ExplorationOutcome;
export interface Evidence {
  owner: string;
  subject: string;
  property: string;
  value: Value;
  observedAt: number;
  receivedAt: number;
  modality: "direct" | "self" | "trial" | "report" | "record" | "inference";
  provenance: string;
  context: string;
  reliability: number;
  uncertainty: number;
  volatilityClass: "fixed" | "slow" | "fast";
  expiry: number | null;
  pinned: boolean;
  version: number;
  footprint?: Footprint;
}
export interface CellBelief extends SeenCell {
  provenance: string;
  observedAt: number;
  version: number;
}
export interface RouteBelief {
  subject: string;
  cells: number[];
  status: "established" | "blocked" | "deferred" | "unknown";
  observedAt: number;
  version: number;
}
export interface ExactSelf {
  identity: string;
  location: Point;
  currentLeg: { from: Point; to: Point; start: number; end: number } | null;
  carried: { subject: string; stocks: Record<string, number> };
  reservations: {
    key: string;
    good: string;
    remaining: number;
    expires: number;
    status: string;
  }[];
}
export interface TraversalPrior {
  speedFactor: number;
  uncertainty: number;
  version: number;
  provenance: string;
}
// Scope-owned pins are declared by real consumers; no inferred obligations.
export interface MemoryPins {
  subjects: string[];
  beliefKeys: string[];
  targets: Point[];
  reason: "task" | "required-record";
}
export interface RegionPrecedent {
  forgottenPlaces: number;
  observedEmpty: number;
  lastAt: number;
}
export interface MapObservation {
  observedAt: number;
  receivedAt: number;
  provenance: string;
  context: string;
  modality: Evidence["modality"];
  reliability: number;
  uncertainty: number;
  duration: number;
  references: number;
}
export interface PersonalView {
  traversalPrior: TraversalPrior;
  mapObservations: Record<string, MapObservation>;
  memory: {
    discretionaryPlaces: number;
    pinnedPlaces: number;
    limit: number;
    evictions: number;
    precedent: { regionKm: number; regions: Record<string, RegionPrecedent> };
  };
  owner: string;
  time: number;
  profile: MapProfile;
  self: ExactSelf;
  geography: CellBelief[];
  regions: { id: number; cells: number[]; neighbors: number[] }[];
  routes: RouteBelief[];
  evidence: Evidence[];
  methods: Evidence[];
  places: Evidence[];
  people: Evidence[];
}
// Only physically filtered facts may be delivered through this contract.
export interface PerceptibleFact {
  reference: string;
  kind: "site" | "cache" | "person";
  position: Point;
  properties: {
    property: string;
    value: Value;
    volatility: Evidence["volatilityClass"];
    uncertainty: number;
  }[];
  detection: number;
}
export interface ExplorationOutcome {
  form: "T1" | "inquiry";
  operation: string;
  targetKind: string;
  descriptor: string;
  evidenceVersion: number;
  paid: number;
  completed: boolean;
  success: boolean;
  method?: string;
  good?: string;
  yield?: number;
}
export interface PerceptionPacket {
  resourceClasses?: string[];
  terrain: SeenCell[];
  facts: PerceptibleFact[];
  footprint: Footprint;
}
