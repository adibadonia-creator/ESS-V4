import data from "./recipes.json";
export interface Recipe {
  id: string;
  inputs: Record<string, number>;
  work: number;
  output: string;
  bulk: number;
  effect: {
    kind: string;
    scope: string;
    coefficient: number;
    forceCoefficient?: number;
  };
}
export class RecipeIndex {
  private rows = new Map<string, Recipe>();
  constructor(entries: readonly Recipe[] = data as unknown as Recipe[]) {
    for (const r of entries) {
      if (
        this.rows.has(r.id) ||
        r.work <= 0 ||
        !Number.isFinite(r.work) ||
        !r.output ||
        !Number.isFinite(r.bulk) ||
        r.bulk < 0 ||
        !Number.isFinite(r.effect.coefficient) ||
        r.effect.coefficient < 0 ||
        Object.values(r.inputs).some((q) => q <= 0 || !Number.isFinite(q))
      )
        throw Error("Invalid recipe");
      this.rows.set(
        r.id,
        Object.freeze({
          ...r,
          inputs: Object.freeze(
            Object.fromEntries(
              Object.entries(r.inputs).sort(([a], [b]) =>
                a < b ? -1 : a > b ? 1 : 0,
              ),
            ),
          ),
          effect: Object.freeze({ ...r.effect }),
        }),
      );
    }
  }
  get(id: string) {
    return this.rows.get(id) ?? null;
  }
}
export const RECIPES = new RecipeIndex();
