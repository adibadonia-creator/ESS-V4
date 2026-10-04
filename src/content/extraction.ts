import data from "./extraction.json";
export interface ExtractionMethod {
  id: string;
  siteKind: string;
  good: string;
  referenceRate: number;
  weights: Partial<
    Record<
      "B" | "A" | "Field" | "Fight" | "Make" | "Organise" | "Social",
      number
    >
  >;
  classRatio: number;
  conditionExponent: number;
  woundExponent: number;
  fatiguePenalty: number;
  load: number;
  effort: number;
  practice: Partial<
    Record<"Field" | "Fight" | "Make" | "Organise" | "Social", number>
  >;
}
export type ResourceDefinition = (typeof data.resources)[number];
// Catalogue-sized compilation occurs once; selected execution is a keyed lookup.
export class ExtractionIndex {
  private methods = new Map<string, ExtractionMethod>();
  private resources = new Map<string, ResourceDefinition>();
  constructor(
    catalogue: {
      resources: readonly ResourceDefinition[];
      methods: readonly ExtractionMethod[];
    } = data,
  ) {
    for (const r of catalogue.resources) {
      if (this.resources.has(r.id) || r.capacity <= 0 || r.renewal < 0)
        throw Error("Invalid resource content");
      this.resources.set(r.id, Object.freeze({ ...r }));
    }
    for (const m of catalogue.methods) {
      const shares = Object.values(m.practice).filter(
          (x): x is number => typeof x === "number",
        ),
        weights = Object.values(m.weights).filter(
          (x): x is number => typeof x === "number",
        );
      if (
        this.methods.has(m.id) ||
        !this.resources.has(m.siteKind) ||
        Math.abs(weights.reduce((a, b) => a + b, 0) - 1) > 1e-12 ||
        shares.reduce((a, b) => a + b, 0) > 1 + 1e-12 ||
        m.referenceRate <= 0 ||
        [...shares, ...weights].some((x) => !Number.isFinite(x) || x < 0)
      )
        throw Error("Invalid extraction content");
      this.methods.set(
        m.id,
        Object.freeze({
          ...m,
          weights: Object.freeze({ ...m.weights }),
          practice: Object.freeze({ ...m.practice }),
        }),
      );
    }
  }
  method(id: string, visit: () => void = () => {}): ExtractionMethod | null {
    visit();
    return this.methods.get(id) ?? null;
  }
  resource(id: string): ResourceDefinition | null {
    return this.resources.get(id) ?? null;
  }
}
export const EXTRACTION_INDEX = new ExtractionIndex();
