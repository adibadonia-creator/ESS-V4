import { math } from "../kernel/numerics";
import { QUANTA } from "../kernel/time";
import { get, immutable, type Tree } from "../kernel/index";
import { geometryCell, type GeographyVersion } from "./geography";
import type {
  Evidence,
  ExactSelf,
  MapProfile,
  RouteBelief,
  TraversalPrior,
} from "./types";
import type { Counters } from "../kernel/counters";
export type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
export interface ReadCursor {
  after: string;
}
export interface Page<T> {
  entries: readonly T[];
  next: ReadCursor | null;
}
// Each posting is its own persistent index. Unrelated postings are never visited.
export interface PersonalIndexes {
  beliefs: Tree<Evidence>;
  postings: Tree<Tree<Evidence>>;
  routes: Tree<RouteBelief>;
}
import { range } from "../kernel/index";
export const readKey = (subject: string, property: string, context?: string) =>
  JSON.stringify([subject, property, context ?? null]);
export const postingKey = (property: string, region?: string) =>
  JSON.stringify([property, region ?? null]);
export class PersonalReview {
  readonly self: DeepReadonly<ExactSelf>;
  readonly profile: MapProfile;
  constructor(
    readonly owner: string,
    readonly time: number,
    profile: MapProfile,
    ownState: ExactSelf,
    private indexes: PersonalIndexes,
    private geographyVersion: GeographyVersion,
    private counts: Counters,
  ) {
    this.self = immutable(ownState);
    this.profile = immutable({ ...profile });
    Object.freeze(this.indexes);
    Object.freeze(this);
  }
  get geographyId(): string {
    return this.geographyVersion.id;
  }
  private visit = () => {
    this.counts.personalReadEntriesVisited++;
  };
  belief(
    subject: string,
    property: string,
    context?: string,
  ): DeepReadonly<Evidence> | null {
    return get(
      this.indexes.beliefs,
      readKey(subject, property, context),
      this.visit,
    );
  }
  rateEstimate(method: string, context: string) {
    const e = this.belief("self", `rate:${method}:${context}`);
    if (!e || typeof e.value !== "object" || e.value === null) return null;
    const v = e.value as Record<string, number>,
      decay = math.exp(-(this.time - v.anchorAt!) / QUANTA / 3),
      weight = v.weight! * decay;
    return immutable({
      rate: math.exp(
        (v.logSum! * decay + v.priorWeight! * math.log(v.priorRate!)) /
          (weight + v.priorWeight!),
      ),
      logVariance: 1 / (weight + v.priorWeight!),
      samples: v.samples!,
      observedAt: e.observedAt,
    });
  }
  version(subject: string, property: string, context?: string): number {
    return this.belief(subject, property, context)?.version ?? 0;
  }
  places(
    property: string,
    limit: number,
    cursor: ReadCursor | null = null,
    region?: string,
  ): Page<DeepReadonly<Evidence>> {
    if (!Number.isSafeInteger(limit) || limit < 0)
      throw Error("Invalid personal read limit");
    if (limit === 0) return immutable({ entries: [], next: null });
    const posting = get(
      this.indexes.postings,
      postingKey(property, region),
      this.visit,
    );
    if (!posting) return immutable({ entries: [], next: null });
    const rows = range(
      posting,
      cursor?.after ?? "",
      "\uffff",
      limit + 1,
      this.visit,
    );
    const more = rows.length > limit;
    const selected = rows.slice(0, limit);
    return immutable({
      entries: selected.map((x) => x.value),
      next: more && selected.length ? { after: selected.at(-1)!.key } : null,
    });
  }
  methods(
    effect: string,
    limit: number,
    cursor: ReadCursor | null = null,
  ): Page<DeepReadonly<Evidence>> {
    return this.places(`method-effect:${effect}`, limit, cursor);
  }
  route(subject: string): DeepReadonly<RouteBelief> | null {
    return get(this.indexes.routes, subject, this.visit);
  }
  cell(cell: number) {
    return geometryCell(this.geographyVersion, cell, () => {
      this.counts.personalReadPagesVisited++;
    });
  }
  traversalPrior(): TraversalPrior {
    const e = this.belief("prior:unseen-terrain", "speed-factor");
    if (!e) throw Error("No declared personal traversal prior");
    return immutable({
      speedFactor: e.value as number,
      uncertainty: e.uncertainty,
      version: e.version,
      provenance: e.provenance,
    });
  }
}
