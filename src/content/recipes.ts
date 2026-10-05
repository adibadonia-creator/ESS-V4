import data from "./recipes.json";
export interface Recipe {
  id: string;
  inputs: Record<string, number>;
  work: number;
  output: string;
  bulk: number;
  effect: { kind: string; scope: string; coefficient: number };
}
export class RecipeIndex {
  private rows = new Map<string, Recipe>();
  constructor(entries: readonly Recipe[] = data as unknown as Recipe[]) {
    for (const r of entries) {
      if (this.rows.has(r.id) || r.work <= 0 || !Number.isFinite(r.work) || Object.values(r.inputs).some(q => q <= 0 || !Number.isFinite(q))) throw Error("Invalid recipe");
      this.rows.set(r.id, Object.freeze({ ...r, inputs: Object.freeze({ ...r.inputs }), effect: Object.freeze({ ...r.effect }) }));
    }
  }
  get(id: string) { return this.rows.get(id) ?? null; }
}
export const RECIPES = new RecipeIndex();
