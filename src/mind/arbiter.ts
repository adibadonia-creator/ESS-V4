import { math } from "../kernel/numerics";
import { normal } from "../kernel/random";
import { canonical, compareKey } from "../kernel/canonical";
import type { PersonalReview } from "../evidence/read";
import { ownedLots } from "./signals";
import { EXPLORATION, OPERATION_INDEX } from "../content/exploration";
import { RECIPES } from "../content/recipes";
import { EXTRACTION_INDEX } from "../content/extraction";
import { QUANTA } from "../kernel/time";
import type { Compared, Consequences, Dispositions } from "./types";
// The adapter owns the private precision factor. No hidden capacity is a belief.
export interface CognitivePrecision {
  denominator(): number;
}
export function heldErrors(
  seed: string,
  actor: string,
  descriptor: string,
  epoch: number,
  c: Consequences,
  age: number | null,
  precision: CognitivePrecision,
) {
  const denominator = Math.max(0.25, precision.denominator());
  return c.blocks.map((b, i) => {
    const factor = age === null ? 2 : 1 + age / (3 + age);
    return (
      (normal(seed, "forecast-held-error", [
        actor,
        descriptor,
        String(epoch),
        String(i),
      ]) *
        0.05 *
        (b.end - b.start) *
        factor) /
      denominator
    );
  });
}
export function preference(
  c: Consequences,
  ref: Consequences,
  disposition: Dispositions,
  quiet: number,
  errors: number[],
): number {
  const tau = 24 * math.pow(2, disposition.p),
    omega = 1 + 0.5 * disposition.aT;
  // Integrate both schedules over their common refinement; inserted boundaries
  // must not make common consequences score differently.
  const grid = [
    ...new Set([...c.blocks, ...ref.blocks].flatMap((b) => [b.start, b.end])),
  ].sort((a, b) => a - b);
  let value = 0;
  for (let i = 1; i < grid.length; i++) {
    const start = grid[i - 1]!,
      end = grid[i]!;
    const b = c.blocks.find(
      (b) => b.start <= start + 1e-12 && b.end >= end - 1e-12,
    )!;
    const r = ref.blocks.find(
      (b) => b.start <= start + 1e-12 && b.end >= end - 1e-12,
    )!;
    const flow =
      (b.materialService -
        r.materialService -
        b.materialLoss +
        r.materialLoss) /
        quiet +
      omega * 0.5 * (b.dependantCoverage - r.dependantCoverage) -
      0.8 * (b.enjoymentDeficit - r.enjoymentDeficit) +
      omega * 0.15 * (b.relationshipExperience - r.relationshipExperience);
    value += tau * (math.exp(-start / tau) - math.exp(-end / tau)) * flow;
  }
  return (
    value +
    math.exp(-c.horizon / tau) * (c.tail.value - ref.tail.value) +
    c.tail.error -
    ref.tail.error +
    errors.reduce((sum, x) => sum + x, 0) +
    c.blocks.reduce((sum, b) => sum + b.encounterValue, 0) -
    ref.blocks.reduce((sum, b) => sum + b.encounterValue, 0) -
    c.oneOff +
    ref.oneOff
  );
}
export function feasibility(
  review: PersonalReview,
  x: Compared,
  reserveExempt: boolean,
  lots = ownedLots(review, "food"),
): string | null {
  const o = x.option;
  if(o.capital && !o.capital.length)return "no personally evidenced instrumental service";
  if (o.status !== "executable" && o.status !== "known-available")
    return o.reason;
  if (
    o.dependencies.some(
      (d) => review.version(d.subject, d.property) !== d.version,
    )
  )
    return "stale required personal assumption";
  if (o.steps.length > 12)
    return "operation envelope exceeds supported bounded prefix";
  if (x.consequences.assent.length || x.consequences.commitments.length)
    return "unsupported assent or commitment requirement";
  const funds = new Map(lots.map((l) => [l.subject+":food", l.quantity]));
  for(const [good,q] of Object.entries(review.self.carried.stocks)) funds.set(review.self.carried.subject+":"+good,q);
  const funding=(subject:string,good:string)=>{
    const key=subject+":"+good;
    if(!funds.has(key))funds.set(key,Number((review.belief(subject,"own-local-stocks")?.value as Record<string,number>|undefined)?.[good]??0));
    return funds.get(key)!;
  };
  let location = { ...review.self.location };
  const spent: Record<string, number> = {};
  for (const [i, step] of o.steps.entries()) {
    if (step.family === "Move") {
      if (!o.routes[i] || o.routes[i]!.status !== "found")
        return "no personally established executable route";
      location = step.target;
    } else {
      if (!Number.isSafeInteger(step.duration) || step.duration <= 0)
        return "invalid paid-time prefix";
      if (step.family === "Transfer") {
        const local =
          step.from === review.self.carried.subject
            ? location
            : (review.belief(step.from, "location")?.value as
                { x: number; y: number } | undefined);
        if (
          !local ||
          (local.x - location.x) ** 2 + (local.y - location.y) ** 2 > 0.08 ** 2
        )
          return "personally believed backing inaccessible";
        if (
          step.basis !== "own-custody" ||
          funding(step.from,step.good) + 1e-9 < step.quantity
        )
          return "near-term goods lack prior accessible backing";
        funds.set(step.from+":"+step.good,funding(step.from,step.good)-step.quantity);
        if(step.use!=="consume")funds.set(step.to+":"+step.good,funding(step.to,step.good)+step.quantity);
        spent[step.good] = (spent[step.good] ?? 0) + step.quantity;
        if (spent[step.good]! > (o.goods[step.good] ?? 0) + 1e-9)
          return "unauthorised material spending";
      }
      if (step.family === "Work") {
        const recipe=RECIPES.get(step.law);
        if(recipe){
          if(review.belief(`method:${step.law}`,"known")?.value!==true)return "making method not personally established";
          for(const [good,q] of Object.entries(recipe.inputs)){
            if(funding(review.self.carried.subject,good)+1e-9<q)return "complementary input not previously funded";
            funds.set(review.self.carried.subject+":"+good,funding(review.self.carried.subject,good)-q);
            spent[good]=(spent[good]??0)+q;
            if(spent[good]!>(o.goods[good]??0)+1e-9)return "recipe input outside envelope";
          }
          funds.set(review.self.carried.subject+":"+recipe.output,funding(review.self.carried.subject,recipe.output)+1);
          continue;
        }
        if (OPERATION_INDEX.has(step.law)) {
          const operation = OPERATION_INDEX.get(step.law)!;
          const p = step.site
            ? (review.belief(step.site, "location")?.value as
                { x: number; y: number } | undefined)
            : undefined;
          if (
            !p ||
            (p.x - location.x) ** 2 + (p.y - location.y) ** 2 > 0.08 ** 2 ||
            Number(
              review.belief(step.site!, `stock:${operation.input}`)?.value ?? 0,
            ) < 1 ||
            Number(review.self.carried.stocks[operation.hammer] ?? 0) < 1 ||
            review.belief(`method:${o.method}`, "known")?.value !== true
          )
            return "personally established trial backing unavailable";
          if ((o.goods[operation.input] ?? 0) < 1)
            return "trial input outside envelope";
          continue;
        }
        const law = EXTRACTION_INDEX.method(step.law),
          p = step.site
            ? (review.belief(step.site, "location")?.value as
                { x: number; y: number } | undefined)
            : undefined;
        if (
          !law ||
          !p ||
          (p.x - location.x) ** 2 + (p.y - location.y) ** 2 > 0.08 ** 2 ||
          review.belief(`method:${step.law}`, "known")?.value !== true
        )
          return "current operation prerequisite not personally established";
        if(law.requiredItemScope){
          const prereqs=o.prerequisites.filter(p=>p.effect.startsWith("have:"));
          if(!prereqs.some(p=>funding(review.self.carried.subject,p.effect.slice(5))>=1))return "compatible input unavailable";
        }
        const stock = review.belief(step.site!, `stock:${law.good}`)?.value;
        const rate = review.rateEstimate(step.law, law.siteKind)?.rate ?? 0;
        if (typeof stock !== "number" || stock <= 0 || rate <= 0)
          return "known input unavailable";
        // Prospective output becomes a later input only after explicit paid Work.
        // It cannot back any earlier operation or the optional return reserve.
        funds.set(
          review.self.carried.subject+":"+law.good,
          funding(review.self.carried.subject,law.good) +
            Math.min(stock, (rate * step.duration) / QUANTA),
        );
      }
    }
  }
  if (
    !o.reference &&
    (o.optionalDuration !== undefined ||
      o.objective.kind === "knows" ||
      o.objective.kind === "tried")
  ) {
    // This ceiling covers the optional experiment prefix. An explicitly bound
    // ordinary continuation remains funded and assessed separately.
    const duration = (o.optionalDuration ?? o.duration) / QUANTA;
    if (duration > EXPLORATION.optionalTimeSd)
      return "optional inquiry/trial prefix ceiling exceeded";
    const experimentFoodCost = duration * review.quietRequirement();
    if (
      experimentFoodCost >
      EXPLORATION.optionalFoodSd * review.quietRequirement()
    )
      return "optional food ceiling exceeded";
  }
  if (!o.reference && (!reserveExempt || o.optionalDuration !== undefined)) {
    const last = x.consequences.blocks.at(-1)!;
    // This reserve counts ONLY existing owned accessible backing after spending,
    // never hoped-for output appearing in the forecast.
    const acquired = x.consequences.blocks.reduce(
      (sum, b) => sum + b.materialService * (b.end - b.start),
      0,
    );
    if (last.foodRemaining - acquired < 0.5 * review.quietRequirement())
      return "optional return reserve lacks existing backing";
  }
  return null;
}
export function arbitrate(options: Compared[], riskCeiling: number) {
  const reference = options[0]!;
  const legal = options.filter((x) => x.feasible);
  const passing = legal.filter((x) => x.riskPass);
  const byValue = (a: Compared, b: Compared) =>
    b.value - a.value || compareKey(a.option.key, b.option.key);
  let winner = reference,
    rule: "incumbent-margin" | "safe-response" | "least-harm" =
      "incumbent-margin";
  if (!reference.feasible || !reference.riskPass) {
    if (passing.length) {
      winner = [...passing].sort(byValue)[0]!;
      rule = "safe-response";
    } else if (legal.length) {
      winner = [...legal].sort(
        (a, b) =>
          a.consequences.severeHazard - b.consequences.severeHazard ||
          byValue(a, b),
      )[0]!;
      rule = "least-harm";
    }
  } else {
    const best = [...passing].sort(byValue)[0];
    if (best && best.value > reference.value + 0.05) winner = best;
  }
  const rejected =
    [...legal].filter((x) => x !== winner).sort(byValue)[0] ?? null;
  return {
    winner,
    rejected,
    rule,
    margin: winner.value - reference.value,
    riskCeiling,
  };
}
