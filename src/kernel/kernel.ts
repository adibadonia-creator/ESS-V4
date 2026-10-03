import { Heap } from "./heap";
import { compareKey, digest } from "./canonical";
import { Identities, type IdentityState, type Key } from "./identity";
import { checkTime, type Time } from "./time";
import type { Counters } from "./counters";
export const PHASE = {
  close: 0,
  settle: 1,
  harm: 2,
  lifeCourse: 3,
  observe: 4,
  commit: 5,
  fertility: 6,
  decide: 7,
} as const;
export type Phase = (typeof PHASE)[keyof typeof PHASE];
export interface Event<T> {
  handle: number;
  key: Key;
  subject: Key;
  at: Time;
  phase: Phase;
  generation: number;
  payload: T;
}
export interface KernelState<T> {
  now: Time;
  phase: -1 | Phase;
  ids: IdentityState;
  generations: Record<Key, number>;
  queue: Event<T>[];
  history: HistoryRecord[];
  historyHash: string;
}
export interface HistoryRecord {
  key: Key;
  at: Time;
  phase: -1 | Phase;
  kind: string;
  subject: Key;
  detail: unknown;
}
export function compareEvents<T>(a: Event<T>, b: Event<T>): number {
  return a.at - b.at || a.phase - b.phase || compareKey(a.key, b.key);
}
export class Kernel<T> {
  readonly state: KernelState<T>;
  readonly ids: Identities;
  readonly heap: Heap<Event<T>>;
  private boundary = true;
  constructor(
    readonly counters: Counters,
    state?: KernelState<T>,
  ) {
    this.state = state ?? {
      now: 0,
      phase: -1,
      ids: { nextHandle: 1, ordinals: {}, keys: [] },
      generations: {},
      queue: [],
      history: [],
      historyHash: digest([]),
    };
    this.ids = new Identities(this.state.ids);
    this.heap = new Heap(compareEvents, this.state.queue);
  }
  get committed(): boolean {
    return (
      this.boundary &&
      (!this.heap.peek() || this.heap.peek()!.at > this.state.now)
    );
  }
  generation(subject: Key): number {
    return this.state.generations[subject] ?? 0;
  }
  invalidate(subject: Key): void {
    const next = this.generation(subject) + 1;
    if (!Number.isSafeInteger(next)) throw new Error("Generation exhaustion");
    this.state.generations[subject] = next;
    // Bounded engineering compaction, no causal record deletion.
    if (this.heap.items.length > 256) {
      const valid = this.heap.items.filter(
        (e) => e.generation === this.generation(e.subject),
      );
      if (valid.length * 2 < this.heap.items.length) {
        this.heap.items.length = 0;
        for (const e of valid) this.heap.push(e);
        this.counters.heapCompactions++;
      }
    }
  }
  schedule(subject: Key, at: Time, phase: Phase, payload: T): Event<T> {
    checkTime(at);
    if (
      !Number.isInteger(phase) ||
      phase < 0 ||
      phase > 7 ||
      at < this.state.now
    )
      throw new Error("Invalid event time/phase");
    // Generated same-time work must be in a strictly later phase. Reject rather
    // than quietly minting infinitely many next-quantum cycles.
    if (!this.boundary && at === this.state.now && phase <= this.state.phase)
      throw new Error("Zero-time cycle or phase regression");
    const id = this.ids.allocate("event", subject);
    const e = {
      ...id,
      subject,
      at,
      phase,
      generation: this.generation(subject),
      payload,
    };
    this.heap.push(e);
    this.counters.heapPushes++;
    return e;
  }
  advance(target: Time, execute: (e: Event<T>) => void): void {
    checkTime(target);
    if (target < this.state.now || !this.boundary)
      throw new Error("Invalid advance");
    try {
      while (this.heap.peek() && this.heap.peek()!.at <= target) {
        const at = this.heap.peek()!.at;
        this.state.now = at;
        this.state.phase = -1;
        this.boundary = false;
        while (this.heap.peek()?.at === at) {
          const e = this.heap.pop()!;
          this.counters.heapPops++;
          if (e.generation !== this.generation(e.subject)) {
            this.counters.staleEvents++;
            continue;
          }
          this.state.phase = e.phase;
          execute(e);
          this.counters.events++;
        }
        this.state.phase = -1;
        this.boundary = true;
      }
      this.state.now = target;
    } catch (error) {
      this.boundary = false;
      throw error;
    }
  }
  record(kind: string, subject: Key, detail: unknown): HistoryRecord {
    const record = {
      key: this.ids.allocate("history", subject).key,
      at: this.state.now,
      phase: this.state.phase,
      kind,
      subject,
      detail: JSON.parse(JSON.stringify(detail)) as unknown,
    };
    const next = digest([this.state.historyHash, record]);
    this.state.history.push(record);
    this.state.historyHash = next;
    return record;
  }
}
