import { RECIPES } from "../content/recipes";
import { EXTRACTION_INDEX } from "../content/extraction";
import { nutrition } from "../content/goods";
import { math } from "../kernel/numerics";
import { QUANTA } from "../kernel/time";
import type { PersonalReview } from "../evidence/read";
import type { BoundOption } from "./types";
import type { ReviewEffort } from "./effort";
import type { Binder } from "./binder";
// A dated service difference, never an intrinsic asset utility or liquidation bonus.
export function capitalOptions(
  review: PersonalReview,
  binder: Binder,
  meter: ReviewEffort,
): BoundOption[] {
  const out: BoundOption[] = [];
  for (const method of binder.admission("service:capital")) {
    const recipe = method.schema ? binder.recipes.get(method.schema.law) : null;
    if (!recipe || !meter.spend("descriptor")) continue;
    const option = binder.bind(
      { kind: "have", good: recipe.output, quantity: 1, place: "carried" },
      method,
    );
    if (option.status !== "executable") {
      out.push(option);
      continue;
    }
    const start = option.duration / QUANTA,
      end = 12;
    let benefit = 0;
    if (recipe.effect.kind === "rate") {
      if (!meter.spend("retrieval")) break;
      const history = review.places("service-use", 2).entries;
      const known = review
        .methods("service:nourishment", 2)
        .entries.flatMap((e) => {
          const m = binder.method(e.subject.slice(7));
          return (
            m?.schema?.prerequisites.flatMap(
              (input) => review.methods(input.effect, 1).entries,
            ) ?? []
          );
        });
      const records = [
        ...new Map([...known, ...history].map((e) => [e.subject, e])).values(),
      ].slice(0, 2);
      for (const record of records) {
        if (!meter.spend("information")) break;
        const use =
          record.property === "service-use"
            ? (record.value as Record<string, number>)
            : null;
        const law = EXTRACTION_INDEX.method(record.subject.slice(7));
        if (!law || nutrition(law.good) <= 0) continue;
        const known = review.places(
          `class:resource-kind:${JSON.stringify(law.siteKind)}`,
          2,
        );
        if (
          !known.entries.some(
            (e) =>
              Number(
                review.belief(e.subject, `stock:${law.good}`)?.value ?? 0,
              ) > 0,
          )
        )
          continue;
        const rate = review.rateEstimate(law.id, law.siteKind)?.rate ?? 0;
        const duty = use
          ? Math.min(
              1,
              use.workSd! / Math.max(1, (review.time - use.since!) / QUANTA),
            )
          : Math.min(0.4, review.quietRequirement() / Math.max(1e-12, rate));
        const rows = review.belief("self", "items")?.value as unknown as
          | {
              quality: number;
              durability: number;
              effect: { scope: string; coefficient: number };
            }[]
          | undefined;
        const existing = Math.max(
          0,
          ...(rows ?? [])
            .filter((i) => i.effect.scope === recipe.effect.scope)
            .map((i) => i.effect.coefficient * i.quality * i.durability),
        );
        const incremental = Math.max(
          0,
          recipe.effect.coefficient * 0.85 - existing,
        );
        const wear = Math.max(0, 1 - (0.04 * duty * (end - start)) / 2);
        benefit += rate * duty * incremental * wear * nutrition(law.good);
        option.valuationDependencies = (
          option.valuationDependencies ?? []
        ).concat([
          {
            subject: record.subject,
            property: record.property,
            version: record.version,
          },
        ]);
      }
    } else if (recipe.effect.kind === "storage") {
      if (!meter.spend("information")) break;
      const good = recipe.effect.scope;
      const carried = Math.max(
        0,
        (review.self.carried.stocks[good] ?? 0) -
          review.quietRequirement() * (start + 0.5),
      );
      const existing = review.places("kind", 4).entries.some((e) => {
        const point = review.belief(e.subject, "location")?.value as
          { x: number; y: number } | undefined;
        return (
          e.value === "cache" &&
          review.belief(e.subject, "own-local-stocks") &&
          point &&
          (point.x - review.self.location.x) ** 2 +
            (point.y - review.self.location.y) ** 2 <=
            0.08 ** 2
        );
      });
      if (!existing && end > start && nutrition(good) > 0) {
        const quantity = Math.min(12, carried),
          useAt = quantity / (2 * review.quietRequirement());
        benefit =
          (quantity *
            (math.exp(-recipe.effect.coefficient * useAt) -
              math.exp(-0.35 * useAt))) /
          (end - start);
        if (quantity > 0) {
          const output = option.steps.findIndex(
            (s) => s.family === "Work" && s.law === recipe.id,
          );
          option.steps.push({
            family: "Transfer",
            from: review.self.carried.subject,
            to: `$output:${output}`,
            good,
            quantity,
            basis: "own-custody",
            duration: Math.ceil(0.02 * QUANTA),
          });
          option.goods[good] = (option.goods[good] ?? 0) + quantity;
          option.duration += Math.ceil(0.02 * QUANTA);
          const meal = Math.min(quantity, 3 * review.quietRequirement()),
            duration = Math.ceil(
              (meal / (review.quietRequirement() + 0.1)) * QUANTA,
            );
          option.steps.push({
            family: "Transfer",
            from: `$output:${output}`,
            to: `$output:${output}`,
            good,
            quantity: meal,
            basis: "own-custody",
            use: "consume",
            duration,
          });
          option.duration += duration;
          option.goods[good] += meal;
        }
      }
    } else if (recipe.effect.kind === "access") {
      // Hypothetical capability only affects a bounded ordinary binder call.
      // The same review account pays the nested call; no physical stock is minted.
      const consumers = review.places(`method-input:have:${recipe.output}`, 1);
      for (const known of consumers.entries) {
        if (!meter.spend("information")) break;
        const consumer = binder.method(known.subject.slice(7));
        const good = consumer?.schema?.good,
          law = consumer?.schema
            ? EXTRACTION_INDEX.method(consumer.schema.law)
            : null;
        if (!consumer || !good || !law || nutrition(good) <= 0) continue;
        const withAsset = binder
          .counterfactual(recipe.output)
          .bind(
            {
              kind: "have",
              good,
              quantity: review.quietRequirement() * 3,
              place: "carried",
            },
            consumer,
          );
        if (withAsset.status !== "executable") continue;
        const sites = review.places(
          `class:resource-kind:${JSON.stringify(law.siteKind)}`,
          2,
        );
        const stock = sites.entries.reduce(
          (q, e) =>
            Math.max(
              q,
              Number(review.belief(e.subject, `stock:${good}`)?.value ?? 0),
            ),
          0,
        );
        const rate = review.rateEstimate(law.id, law.siteKind)?.rate ?? 0;
        let displaced = 0;
        for (const use of review.places("service-use", 2).entries) {
          const other = EXTRACTION_INDEX.method(use.subject.slice(7));
          if (!other || nutrition(other.good) <= 0) continue;
          const history = use.value as Record<string, number>;
          displaced +=
            Math.min(
              1,
              history.workSd! /
                Math.max(1, (review.time - history.since!) / QUANTA),
            ) *
            (review.rateEstimate(other.id, other.siteKind)?.rate ?? 0) *
            nutrition(other.good);
        }
        const candidate = Math.min(
          review.quietRequirement(),
          stock / Math.max(0.001, end - start),
          rate * 0.4,
        );
        benefit = Math.max(benefit, candidate - displaced);
        option.valuationDependencies = (
          option.valuationDependencies ?? []
        ).concat(withAsset.dependencies);
      }
    }
    option.capital =
      benefit > 0 && end > start
        ? [
            {
              start,
              end,
              materialService: benefit,
              provenance: `personal dated service difference:${recipe.id}`,
            },
          ]
        : [];
    option.reason =
      benefit > 0
        ? "paid acquisition with personally evidenced future service difference"
        : "no personally evidenced future service benefit";
    out.push(option);
  }
  return out;
}

// Cheap nomination is separate from paid acquisition/nested estimation. Every
// lookup has a fixed page bound; unknown access is not a standing opportunity.
export function capitalCue(
  review: PersonalReview,
  catalogue: import("../content/methods").MethodIndex,
) {
  for (const e of review.methods("service:capital", 2).entries) {
    const method = catalogue.get(e.subject.slice(7)),
      recipe = method?.schema ? catalogue.recipes.get(method.schema.law) : null;
    if (!recipe || !method?.schema) continue;
    if (recipe.effect.kind === "storage") {
      const existing = review.places("kind", 4).entries.some((e) => {
        const point = review.belief(e.subject, "location")?.value as
          { x: number; y: number } | undefined;
        return (
          e.value === "cache" &&
          review.belief(e.subject, "own-local-stocks") &&
          point &&
          (point.x - review.self.location.x) ** 2 +
            (point.y - review.self.location.y) ** 2 <=
            0.08 ** 2
        );
      });
      if (
        !existing &&
        (review.self.carried.stocks[recipe.effect.scope] ?? 0) >
          0.5 * review.quietRequirement()
      )
        return true;
      continue;
    }
    const funded = method.schema.prerequisites.every((input) => {
      if (
        (review.self.carried.stocks[input.good] ?? 0) >= (input.quantity ?? 1)
      )
        return true;
      const producer = review.bestMethod(input.effect),
        schema = producer
          ? catalogue.get(producer.subject.slice(7))?.schema
          : null;
      return (
        schema?.targetProperty &&
        review.places(
          `class:${schema.targetProperty}:${JSON.stringify(schema.targetValue)}`,
          1,
        ).entries.length > 0
      );
    });
    if (!funded) continue;
    if (
      review
        .places("service-use", 1)
        .entries.some(
          (e) => Number((e.value as Record<string, number>).workSd) > 0,
        )
    )
      return true;
    const uses =
      recipe.effect.kind === "access"
        ? review.places(`method-input:have:${recipe.output}`, 1).entries
        : review.methods("service:nourishment", 2).entries.flatMap((e) => {
            const m = catalogue.get(e.subject.slice(7));
            return (
              m?.schema?.prerequisites.flatMap(
                (p) => review.methods(p.effect, 1).entries,
              ) ?? []
            );
          });
    if (
      uses.some((e) => {
        const law = EXTRACTION_INDEX.method(e.subject.slice(7));
        return (
          law &&
          nutrition(law.good) > 0 &&
          review
            .places(`class:resource-kind:${JSON.stringify(law.siteKind)}`, 1)
            .entries.some(
              (site) =>
                Number(
                  review.belief(site.subject, `stock:${law.good}`)?.value ?? 0,
                ) > 0,
            )
        );
      })
    )
      return true;
  }
  return false;
}
