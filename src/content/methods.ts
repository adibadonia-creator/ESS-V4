import data from "./physical.json";
import { RECIPES, type RecipeIndex } from "./recipes";
export interface MethodEntry {
  id: string;
  effects: string[];
  inputs: string[];
  schema?: MethodSchema;
}
// A declarative means pattern. Numeric durations are learned/cultural method
// parameters; physical expression remains in the extraction law table.
export interface MethodSchema {
  target: "self" | "owned" | "site";
  targetProperty?: string;
  targetValue?: string;
  prerequisites: { effect: string; good: string; consumes: boolean; quantity?: number }[];
  operation: "consume" | "extract" | "recover" | "material" | "make";
  law: string;
  good?: string;
  mode?: "rest" | "leisure";
  durationSd: number;
  rateContext?: string;
  cheapCost: number;
  locality: "known-local-or-route";
}
// Startup compilation only. Installing a record never acquires it for a person.
export class MethodIndex {
  private targetProperties = new Set<string>();
  isTargetProperty(property: string): boolean {
    return this.targetProperties.has(property);
  }
  private byId = new Map<string, MethodEntry>();
  private byEffect = new Map<string, MethodEntry[]>();
  private byInput = new Map<string, MethodEntry[]>();
  constructor(entries: readonly MethodEntry[], readonly recipes:RecipeIndex=RECIPES) {
    for (const entry of entries) {
      if (this.byId.has(entry.id)) throw Error("Duplicate method content");
      if (
        entry.schema &&
        (!Number.isFinite(entry.schema.cheapCost) ||
          entry.schema.cheapCost < 0 ||
          !Number.isFinite(entry.schema.durationSd) ||
          entry.schema.durationSd <= 0)
      )
        throw Error("Invalid declarative method parameters");
      const schema = entry.schema
        ? (JSON.parse(JSON.stringify(entry.schema)) as MethodSchema)
        : undefined;
      if (schema) {
        for (const p of schema.prerequisites) Object.freeze(p);
        Object.freeze(schema.prerequisites);
        Object.freeze(schema);
      }
      const e = Object.freeze({
        id: entry.id,
        effects: [...entry.effects],
        inputs: [...entry.inputs],
        ...(schema ? { schema } : {}),
      });
      Object.freeze(e.effects);
      Object.freeze(e.inputs);
      this.byId.set(e.id, e);
      if (e.schema?.targetProperty)
        this.targetProperties.add(e.schema.targetProperty);
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
export const METHOD_INDEX = new MethodIndex(data.methods as MethodEntry[]);
