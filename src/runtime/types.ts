import type { PersonalReview } from "../evidence/read";
import type { GeographyVersion } from "../evidence/geography";
import type { EffortAccount } from "../kernel/effort";
import type { PersonalSearch } from "./routing";
import type { PersonalView, Point, ExactSelf } from "../evidence/types";
export type Operation =
  | {
      family: "Move";
      target: Point;
      exploratory: boolean;
      experiment?: import("../evidence/types").ExplorationOutcome;
    }
  | {
      family: "Attend";
      duration: number;
      scope: "local-survey";
      experiment?: import("../evidence/types").ExplorationOutcome;
    }
  | {
      family: "Transfer";
      duration: number;
      from: string;
      to: string;
      good: string;
      quantity: number;
      basis: "own-custody";
      use?: "consume";
    }
  | {
      family: "Work";
      law: string;
      duration: number;
      site?: string;
      compulsory?: boolean;
      qualityTarget?: number;
      preparation?: number;
      experiment?: import("../evidence/types").ExplorationOutcome;
    }
  | {
      family: "Recover";
      law: string;
      duration: number;
      mode?: "rest" | "leisure";
    }
  | { family: "Engage"; law: string; duration: number };
export interface Budget {
  time: number;
  goods: Record<string, number>;
}
export interface SelectedIntention {
  intentionId: string;
  taskId: string;
  semanticKey: string;
  actor: string;
  objective: string;
  method: string;
  bindings: Record<string, string>;
  steps: Operation[];
  dependsOn: { key: string; version: number; valueFingerprint?: string }[];
  // Only explicitly preauthorised, personally known substitutions may be installed.
  repairScope?: { moveTargets: Point[]; bindings: Record<string, string[]> };
  authorised: Budget;
  reserve: {
    subject: string;
    good: string;
    quantity: number;
    expires: number;
  }[];
  source: string;
  effortAccount?: string;
  preparedRoutes?: Record<number, PersonalSearch>;
  envelope?: {
    purpose: string;
    end: {
      kind: string;
      quantity: number;
      service?: string;
      good?: string;
      place?: string;
      question?: string;
      context?: string;
    };
    targets: string[];
    quantity: { estimate: number; low: number; high: number };
    riskCeiling: number;
    locationBasis: string;
    rightsBasis: "own-custody-and-public-extraction";
    stop: string[];
    escalation: string[];
    reviewAccount: string;
  };
}
export interface ActiveOperation {
  family: Operation["family"];
  start: number;
  paidThrough: number;
  end: number | null;
}
export interface Task extends SelectedIntention {
  bindingRevision: number;
  paidForStep: number;
  physicalStepOutput: number;
  cursor: number;
  status:
    | "ready"
    | "routing"
    | "running"
    | "suspended"
    | "blocked"
    | "done"
    | "failed"
    | "abandoned";
  reservations: { key: string; subject: string; good: string }[];
  progress: {
    kind: string;
    location: Point;
    at: number;
    quantity?: number;
    good?: string;
  }[];
  active: ActiveOperation | null;
  route: PersonalSearch | null;
  routeCursor: number;
  failure: string | null;
  interruption: { at: number; reason: string } | null;
}
export interface ActivityState {
  actor: string;
  closedThrough: number;
  lastPaidEnd: number;
  totals: Record<number, Record<string, number>>;
  prefixes: {
    semanticKey: string;
    revision: number;
    cursor: number;
    category: string;
    start: number;
    end: number;
  }[];
}
export interface RuntimeState {
  tasks: Task[];
  terminal: Task[];
  retry: Record<string, number>;
  purpose: Record<string, string>;
  issuedTaskIds: Record<string, boolean>;
  latestTerminal: Record<string, number>;
  paidArchive: (ActivityState["prefixes"][number] & { actor: string })[];
  activityArchive: {
    actor: string;
    day: number;
    totals: Record<string, number>;
  }[];
  effort: Record<string, EffortAccount>;
  currentEffort: Record<string, string>;
  reviewAuthorizations: Record<string, string>;
  budgets: Record<
    string,
    { authorised: Budget; spent: Budget; descriptor: string }
  >;
  activity: ActivityState[];
}
// Runtime can read beliefs and exact own state, and execute real operations. No truth queries.
export interface RuntimePort {
  beginPhysical(
    task: Task,
    step: Operation,
    remaining: number,
  ): { ok: true; end: number } | { ok: false; observed: string };
  endPhysical(
    task: Task,
    final: boolean,
  ): {
    quantity: number;
    good?: string;
    reason?: string;
    costs?: Record<string, number>;
    ownWrites?: { key: string; before: number; after: number }[];
  };
  paidPhysical(task: Task, start: number, end: number): void;
  physicalClosure(actor: string): void;
  pin(task: Task): void;
  unpin(task: Task): void;
  now(): number;
  personal(actor: string): PersonalReview;
  pinGeography(actor: string, scope: string): GeographyVersion;
  geography(id: string): GeographyVersion;
  pinGeographyVersion(id: string, scope: string): void;
  unpinGeography(scope: string): void;
  exactSelf(actor: string): ExactSelf;
  blockedCells(actor: string, cells: number[]): boolean;
  version(actor: string, key: string): number;
  startPrefix(
    actor: string,
    target: Point,
  ): { ok: true; end: number } | { ok: false; observed: string };
  stopMove(actor: string): void;
  observe(actor: string, duration: number): void;
  schedule(task: Task, at: number, kind: "operation" | "budget"): void;
  cancel(task: Task): void;
  transfer(
    task: Task,
    step: Extract<Operation, { family: "Transfer" }>,
    reservation?: string,
  ): { ok: true } | { ok: false; observed: string };
  reserve(
    actor: string,
    subject: string,
    good: string,
    quantity: number,
    expires: number,
  ): string;
  release(actor: string, key: string): void;
  routeEvidence(
    actor: string,
    subject: string,
    cells: number[],
    status: "established" | "blocked",
    at: number,
  ): void;
  record(kind: string, actor: string, detail: unknown): void;
}

// An already-authorised suffix supplied by a future binder; this runtime chooses nothing.
export interface BoundRepair {
  semanticKey: string;
  objective: string;
  bindings: Record<string, string>;
  steps: Operation[];
  dependsOn: { key: string; version: number }[];
}
