import type { PersonalReview } from "../evidence/read";
import { conditionSegment } from "../laws/physiology";
import { QUANTA } from "../kernel/time";
import type { Objective } from "./types";
export function bodySignals(review: PersonalReview) {
  const e = review.belief("self", "body-experience");
  if (!e || typeof e.value !== "object")
    throw Error("Autonomous review lacks experienced body");
  const b = e.value as Record<string, unknown>;
  const quiet = review.quietRequirement(),
    classFactor = b.class === "F" ? 0.85 : 1;
  const condition = conditionSegment(
    Number(b.condition),
    Number(b.intake),
    quiet +
      classFactor * (Number(b.activityLoad ?? 0) + 0.3 * Number(b.wounds)),
    (review.time - e.observedAt) / QUANTA,
  ).c;
  return {
    condition,
    fatigue: Number(b.fatigue),
    enjoyment: Number(b.enjoyment),
    intake: Number(b.intake),
    wounds: Number(b.wounds),
    quiet,
    classFactor,
    satiation: Number(b.satiation),
    familiarity: b.familiarity as Record<string, { at: number; count: number }>,
    intervalStart: Number(b.intervalStart),
    effortSd: Number(b.effortSd ?? 0),
    restSd: Number(b.restSd ?? 0),
    pleasantSd: Number(b.pleasantSd ?? 0),
    compulsorySd: Number(b.compulsorySd ?? 0),
    leisureSd: Number(b.leisureSd ?? 0),
    observedAt: e.observedAt,
    activityLoad: Number(b.activityLoad ?? 0),
  };
}
export function ownedLotsPage(
  review: PersonalReview,
  good: string,
  limit = 4,
  after: string | null = null,
) {
  const out = [
    {
      subject: review.self.carried.subject,
      quantity: review.self.carried.stocks[good] ?? 0,
      at: review.time,
    },
  ];
  let page = review.places(
    `owned-good:${good}`,
    limit,
    after ? { after } : null,
  );
  if (!page.entries.length && after)
    page = review.places(`owned-good:${good}`, limit);
  for (const e of page.entries) {
    const p = review.belief(e.subject, "location")?.value as
      { x: number; y: number } | undefined;
    if (
      p &&
      (p.x - review.self.location.x) ** 2 +
        (p.y - review.self.location.y) ** 2 <=
        0.08 ** 2
    )
      out.push({
        subject: e.subject,
        quantity: (e.value as Record<string, number>)[good] ?? 0,
        at: e.observedAt,
      });
  }
  return { lots: out, next: page.next?.after ?? null };
}
export function ownedLots(review: PersonalReview, good: string, limit = 4) {
  return ownedLotsPage(review, good, limit).lots;
}
export function drives(
  review: PersonalReview,
  lots = ownedLots(review, "food"),
) {
  const b = bodySignals(review),
    owned = lots.reduce((s, l) => s + l.quantity, 0),
    coverage = owned / b.quiet;
  return [
    {
      objective: {
        kind: "service",
        service: "nourishment",
        quantity: 3 * b.quiet,
      } as Objective,
      urgency: Math.max(
        1 / (1 + coverage),
        1 - Math.min(1, b.condition),
        1 - Math.min(1, b.intake / b.quiet),
      ),
    },
    {
      objective: { kind: "recovered", quantity: 0.3 } as Objective,
      urgency: b.fatigue,
    },
    {
      objective: { kind: "enjoyed", quantity: 0.12 } as Objective,
      urgency: (1 - b.enjoyment) ** 2 / (1 + 0.5 * b.satiation),
    },
  ];
}
