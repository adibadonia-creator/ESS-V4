import { canonical, hash128 } from "./canonical";
export type Key = string;
export interface Identity {
  handle: number;
  key: Key;
}
export interface IdentityState {
  nextHandle: number;
  ordinals: Record<string, number>;
  keys: Key[];
}
export function lineage(kind: string, parent: Key, ordinal: number): Key {
  if (!kind || !Number.isSafeInteger(ordinal) || ordinal < 0)
    throw new Error("Invalid lineage");
  return hash128(canonical(["lineage-v1", kind, parent, ordinal]));
}
export class Identities {
  readonly state: IdentityState;
  private used: Set<Key>;
  constructor(
    state: IdentityState = { nextHandle: 1, ordinals: {}, keys: [] },
  ) {
    this.state = state;
    this.used = new Set(state.keys);
  }
  allocate(kind: string, parent: Key, explicitOrdinal?: number): Identity {
    const tag = canonical([kind, parent]);
    const ordinal = explicitOrdinal ?? this.state.ordinals[tag] ?? 0;
    const key = lineage(kind, parent, ordinal);
    if (this.used.has(key) || this.state.nextHandle >= Number.MAX_SAFE_INTEGER)
      throw new Error("Identity collision/reuse or exhaustion");
    const handle = this.state.nextHandle++;
    this.state.ordinals[tag] = Math.max(
      ordinal + 1,
      this.state.ordinals[tag] ?? 0,
    );
    this.state.keys.push(key);
    this.used.add(key);
    return { handle, key };
  }
}
