import data from "./physical.json";
export interface MethodEntry {
  id: string;
  effects: string[];
  inputs: string[];
}
// Startup compilation only. Installing a record never acquires it for a person.
export class MethodIndex {
  private byId = new Map<string, MethodEntry>();
  private byEffect = new Map<string, MethodEntry[]>();
  private byInput = new Map<string, MethodEntry[]>();
  constructor(entries: readonly MethodEntry[]) {
    for (const entry of entries) {
      if (this.byId.has(entry.id)) throw Error("Duplicate method content");
      const e = Object.freeze({
        id: entry.id,
        effects: [...entry.effects],
        inputs: [...entry.inputs],
      });
      Object.freeze(e.effects);
      Object.freeze(e.inputs);
      this.byId.set(e.id, e);
      for (const effect of e.effects) this.add(this.byEffect, effect, e);
      for (const input of e.inputs) this.add(this.byInput, input, e);
    }
    for (const posting of [...this.byEffect.values(), ...this.byInput.values()])
      posting.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  private add(index: Map<string, MethodEntry[]>, key: string, e: MethodEntry) {
    const rows = index.get(key) ?? [];
    rows.push(e);
    index.set(key, rows);
  }
  get(id: string): MethodEntry | null {
    return this.byId.get(id) ?? null;
  }
  query(
    dimension: "effect" | "input",
    key: string,
    after: string | null,
    limit: number,
    visit: () => void = () => {},
  ) {
    if (!Number.isSafeInteger(limit) || limit < 0)
      throw Error("Invalid content read limit");
    const posting =
      (dimension === "effect" ? this.byEffect : this.byInput).get(key) ?? [];
    let low = 0,
      high = posting.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (after !== null && posting[mid]!.id <= after) low = mid + 1;
      else high = mid;
    }
    const entries = posting.slice(low, low + limit);
    for (const _ of entries) visit();
    return {
      entries,
      next:
        low + limit < posting.length && entries.length
          ? entries.at(-1)!.id
          : null,
    };
  }
}
export const METHOD_INDEX = new MethodIndex(data.methods);
