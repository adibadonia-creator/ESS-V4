import type { PersonalSearch } from "./routing";
import type { PersonalView, Point, ExactSelf } from "../evidence/types";
export type Operation =
  | {
      family: "Move";
      target: Point;
      exploratory: boolean;
    }
  | { family: "Attend"; duration: number; scope: "local-survey" }
  | {
      family: "Transfer";
      duration: number;
      from: string;
      to: string;
      good: string;
      quantity: number;
      basis: "own-custody";
    }
  | { family: "Work" | "Recover" | "Engage"; law: string; duration: number };
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
  dependsOn: { key: string; version: number }[];
  // Only explicitly preauthorised, personally known substitutions may be installed.
  repairScope?: { moveTargets: Point[]; bindings: Record<string, string[]> };
  authorised: Budget;
  reserve: {
    subject: string;
    good: string;
    quantity: number;
    expires: number;
  }[];
  source: "diagnostic-selected-intention";
}
export interface ActiveOperation {
  family: Operation["family"];
  start: number;
  paidThrough: number;
  end: number | null;
}
export interface Task extends SelectedIntention {
  bindingRevision: number;
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
  budgets: Record<
    string,
    { authorised: Budget; spent: Budget; descriptor: string }
  >;
  activity: ActivityState[];
}
// Runtime can read beliefs and exact own state, and execute real operations. No truth queries.
export interface RuntimePort {
  pin(task: Task): void;
  unpin(task: Task): void;
  now(): number;
  personal(actor: string): PersonalView;
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
