// DTOs only. Presentation and measurement may import this file, never world.
export interface PointView {
  readonly x: number;
  readonly y: number;
}
export interface LegView {
  readonly from: PointView;
  readonly to: PointView;
  readonly cell: number;
  readonly start: number;
  readonly end: number;
  readonly speedKmPerSd: number;
}
export interface ActorView {
  readonly key: string;
  readonly label: string;
  readonly position: PointView;
  readonly leg: LegView | null;
  readonly motionStatus: string;
  readonly paidTravelSd: number;
  readonly cargoCu: number;
  readonly inputs: Readonly<{
    ability: number;
    condition: number;
    wound: number;
    fatigue: number;
    nominalCargoCu: number;
    loadCu: number;
  }> | null;
  readonly container: string;
  readonly body: Readonly<{
    c: number;
    w: number;
    d: number;
    f: number;
    intake: number;
    mastery: Record<string, number>;
    practice: Record<string, number>;
    capability: Record<string, number>;
  }> | null;
}
export interface ContainerView {
  readonly key: string;
  readonly kind: string;
  readonly position: PointView;
  readonly custodian: string | null;
  readonly capacityCu: number;
  readonly stocks: Readonly<Record<string, number>>;
}
export interface ReservationView {
  readonly key: string;
  readonly actor: string;
  readonly container: string;

  readonly good: string;
  readonly remaining: number;
  readonly expires: number;
  readonly status: string;
}
export interface TerrainView {
  readonly width: number;
  readonly height: number;
  readonly cellKm: number;
  readonly version: number;
  readonly kind: readonly number[];
  readonly colors: readonly number[];
}
export interface Snapshot {
  readonly personalLenses: readonly unknown[];
  readonly time: number;
  readonly seed: string;
  readonly hash: string;
  readonly eventHash: string;
  readonly fixture: string;
  readonly actors: readonly ActorView[];
  readonly containers: readonly ContainerView[];
  readonly reservations: readonly ReservationView[];
  readonly history: readonly {
    key: string;
    at: number;
    kind: string;
    subject: string;
  }[];
  readonly terrain?: TerrainView;
  readonly counters: Readonly<Record<string, number>>;
  readonly reconciliation: {
    readonly ok: boolean;
    readonly errors: readonly string[];
    readonly totals: Readonly<
      Record<string, { sources: number; sinks: number; stock: number }>
    >;
  };
}
export type Command =
  | { id: number; kind: "create"; seed: string }
  | {
      id: number;
      kind:
        | "create-evidence"
        | "create-body"
        | "create-autonomous"
        | "create-exploration";
      seed: string;
    }
  | {
      id: number;
      kind: "task-interrupt" | "task-resume" | "task-abandon";
      actor: string;
    }
  | { id: number; kind: "advance"; time: number }
  | { id: number; kind: "snapshot"; terrain?: boolean }
  | { id: number; kind: "checkpoint" }
  | { id: number; kind: "restore"; checkpoint: string }
  | { id: number; kind: "diagnostic-move"; actor: string; target: PointView }
  | {
      id: number;
      kind: "diagnostic-transfer";
      actor: string;
      from: string;
      to: string;
      good: string;
      quantity: number;
    }
  | {
      id: number;
      kind: "diagnostic-consume";
      actor: string;
      from: string;
      good: string;
      quantity: number;
    }
  | {
      id: number;
      kind: "diagnostic-reserve";
      actor: string;
      from: string;
      good: string;
      quantity: number;
      durationSd: number;
    }
  | {
      id: number;
      kind: "diagnostic-release";
      actor: string;
      reservation: string;
    };
export type Response =
  | { id: number; ok: true; snapshot?: Snapshot; checkpoint?: string }
  | { id: number; ok: false; error: string };
