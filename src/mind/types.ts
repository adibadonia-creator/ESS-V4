import type { DeepReadonly } from "../evidence/read";
import type { ExactSelf } from "../evidence/types";
import type { EffortAccount } from "../kernel/effort";
import type { PersonalSearch } from "../runtime/routing";
import type { Operation, SelectedIntention } from "../runtime/types";
export type Objective =
  | { kind: "service"; service: string; quantity: number }
  | { kind: "have"; good: string; quantity: number; place: string }
  | { kind: "recovered"; quantity: number }
  | { kind: "enjoyed"; quantity: number }
  | { kind: "knows"; question: string; quantity: number }
  | { kind: "tried"; context: string; quantity: number };
export const effectOf = (o: Objective) =>
  o.kind === "service"
    ? `service:${o.service}`
    : o.kind === "have"
      ? `have:${o.good}`
      : o.kind === "knows"
        ? `knows:${o.question}`
        : o.kind === "tried"
          ? `tried:${o.context}`
          : o.kind;
export type WakeCause = "periodic" | "food" | "rest" | "completion" | "failure";
export interface Dispositions {
  p: number;
  rT: number;
  aT: number;
}
export type BindingStatus =
  | "known-available"
  | "executable"
  | "epistemically-unresolved"
  | "computationally-deferred"
  | "unsupported"
  | "impossible-under-personal-assumptions";
export interface Dependency {
  subject: string;
  property: string;
  version: number;
}
export interface BoundOption {
  key: string;
  objective: Objective;
  method: string;
  steps: Operation[];
  dependencies: Dependency[];
  bindings: Record<string, string>;
  status: BindingStatus;
  reason: string;
  prerequisites: { effect: string; status: BindingStatus }[];
  routes: Record<number, PersonalSearch>;
  duration: number;
  goods: Record<string, number>;
  reference: boolean;
  informationValue?: number;
}
export interface ConsequenceBlock {
  start: number;
  end: number;
  materialService: number;
  materialLoss: number;
  dependantCoverage: number;
  enjoymentDeficit: number;
  processValue: number;
  relationshipExperience: number;
  encounterValue: number;
  severeHazard: number;
  condition: number;
  fatigue: number;
  enjoyment: number;
  foodRemaining: number;
}
export interface Consequences {
  horizon: number;
  blocks: ConsequenceBlock[];
  oneOff: number;
  severeHazard: number;
  severeProbability: number;
  commitments: { key: string; effect: string }[];
  assent: { actor: string; terms: string }[];
  tail: { value: number; error: number; reason: string };
}
export interface Compared {
  option: BoundOption;
  consequences: Consequences;
  feasible: boolean;
  gate: string | null;
  riskPass: boolean;
  value: number;
  error: number;
  errors: number[];
}
export interface DecisionTrace {
  actor: string;
  at: number;
  epoch: number;
  causes: WakeCause[];
  signature: string;
  effort: EffortAccount;
  drives: { objective: Objective; urgency: number; admitted: boolean }[];
  agenda: Objective[];
  methods: string[];
  bindings: BoundOption[];
  dependencies: Dependency[];
  premises: {
    self: DeepReadonly<ExactSelf>;
    geographyId: string;
    quietEstimate: number;
    ownedInputs: { subject: string; quantity: number; at: number }[];
  };
  evidence: {
    subject: string;
    property: string;
    version: number;
    observedAt: number;
    value: unknown;
  }[];
  compared: Compared[];
  winner: string;
  rejected: string | null;
  rule: "incumbent-margin" | "safe-response" | "least-harm";
  margin: number;
  selected: SelectedIntention | null;
  deferrals: string[];
}
export interface MindState {
  actor: string;
  dispositions: Dispositions;
  periodicAt: number;
  nextWake: number | null;
  pending: WakeCause[];
  foodArmed: boolean;
  restArmed: boolean;
  capDay: number;
  capCount: number;
  epoch: number;
  signatures: Partial<Record<WakeCause, string>>;
  trialCursor: string | null;
  agendaCursor: number;
  comparisonCursor: number;
  methodCursors: Record<string, string | null>;
  targetCursors: Record<string, string | null>;
  deferred: BoundOption[];
  traces: DecisionTrace[];
  admitted: number;
  consulted: Dependency[];
}
