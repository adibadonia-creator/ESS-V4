import { math } from "../kernel/numerics";
import { QUANTA } from "../kernel/time";
import {
  conditionTarget,
  fatigueClosure,
  enjoymentClosure,
} from "../laws/physiology";
export { conditionTarget } from "../laws/physiology";

export const DOMAINS = [
  "Field",
  "Fight",
  "Make",
  "Organise",
  "Social",
] as const;
export type Domain = (typeof DOMAINS)[number];
export type Masteries = Record<Domain, number>;
// Stage III supplies these resolved values; physiology never reads genes/development.
export interface AdultCapability {
  B: number;
  A: number;
  C: number;
  P: number;
  displayPotential: number;
  efficiency: number;
}
export interface BodyAnchor {
  at: number;
  c: number;
  w: number;
  intake: number;
  requirement: number;
  target: number;
  tau: number;
  healing: number;
}
export interface Body {
  actor: string;
  class: "M" | "F";
  birth: number;
  alive: boolean;
  capability: AdultCapability;
  mastery: Masteries;
  practice: Masteries;
  anchor: BodyAnchor;
  d: number;
  f: number;
  interval: {
    start: number;
    effort: number;
    rest: number;
    pleasant: number;
    compulsory: number;
    leisure: number;
  };
  lastLeisure: string | null;
  satiation: number;
  exposures: Record<string, { at: number; count: number }>;
}
export const zeroMasteries = (): Masteries => ({
  Field: 0,
  Fight: 0,
  Make: 0,
  Organise: 0,
  Social: 0,
});
export const clip = (x: number, low = 0, high = 1) =>
  Math.min(high, Math.max(low, x));
export function quietRequirement(b: Body) {
  const x = b.capability;
  return (
    ((b.class === "F" ? 0.85 : 1) *
      (0.45 +
        0.25 * x.B * x.B +
        0.08 * x.A * x.A +
        0.12 * x.C * x.C +
        0.1 * x.P * x.P +
        0.05 * Math.max(0, x.displayPotential - 1) ** 2)) /
    x.efficiency
  );
}
export function requirement(
  b: Body,
  load: number,
  wound: number,
  exposure = 0,
) {
  return (
    quietRequirement(b) +
    (b.class === "F" ? 0.85 : 1) *
      (b.capability.efficiency ** 2 * load + 0.3 * wound) +
    exposure
  );
}
export function materialiseBody(b: Body, at: number) {
  if (at < b.anchor.at) throw Error("Body anchor regression");
  const a = b.anchor,
    dt = (at - a.at) / QUANTA;
  return {
    c: a.target + (a.c - a.target) * math.exp(-dt / a.tau),
    w: Math.max(0, a.w - a.healing * dt),
    d: b.d,
    f: b.f,
    intake: a.intake,
  };
}
export function reanchorBody(
  b: Body,
  at: number,
  load: number,
  intake: number,
  exposure = 0,
) {
  const v = materialiseBody(b, at),
    r = requirement(b, load, v.w, exposure),
    n = intake / r,
    target = conditionTarget(n);
  b.anchor = {
    at,
    c: v.c,
    w: v.w,
    intake,
    requirement: r,
    target,
    tau: target < v.c ? 0.35 : 0.7,
    healing: Math.min(n, 1) / 2,
  };
}
export function adultBody(actor: string, class_: "M" | "F" = "M"): Body {
  const b: Body = {
    actor,
    class: class_,
    birth: -300 * QUANTA,
    alive: true,
    capability: { B: 1, A: 1, C: 1, P: 1, displayPotential: 1, efficiency: 1 },
    mastery: { Field: 0.5, Fight: 0.5, Make: 0.5, Organise: 0.5, Social: 0.5 },
    practice: zeroMasteries(),
    anchor: {
      at: 0,
      c: 1,
      w: 0,
      intake: 0,
      requirement: 1,
      target: 0,
      tau: 0.35,
      healing: 0,
    },
    d: 0.15,
    f: 0.65,
    interval: {
      start: 0,
      effort: 0,
      rest: 0,
      pleasant: 0,
      compulsory: 0,
      leisure: 0,
    },
    lastLeisure: null,
    satiation: 0,
    exposures: {},
  };
  b.anchor.requirement = quietRequirement(b);
  return b;
}
const WEIGHTS: Record<Domain, number[]> = {
  Field: [0.1, 0.3, 0.5, 0.1],
  Fight: [0.2, 0.4, 0.3, 0.1],
  Make: [0, 0.25, 0.65, 0.1],
  Organise: [0, 0.05, 0.5, 0.45],
  Social: [0, 0, 0.3, 0.7],
};
export function competence(b: Body, k: Domain) {
  const xs = [b.capability.B, b.capability.A, b.capability.C, b.capability.P];
  return (
    (math.exp(WEIGHTS[k].reduce((s, w, i) => s + w * math.log(xs[i]!), 0)) *
      (0.12 + 0.88 * b.mastery[k])) /
    0.56
  );
}
export function ability(
  b: Body,
  weights: Record<string, number>,
  fRatio: number,
) {
  let sum = 0;
  for (const [name, weight] of Object.entries(weights)) {
    const v =
      name in b.capability
        ? b.capability[name as "B" | "A" | "C" | "P"]
        : competence(b, name as Domain);
    sum += weight * math.log(v);
  }
  return math.exp(sum) * (b.class === "F" ? fRatio : 1);
}
export function cargoNominal(b: Body) {
  return 1.5 * b.capability.B * (b.class === "F" ? 0.6 : 1);
}
export function travelAbility(b: Body) {
  return ability(b, { A: 0.25, Field: 0.5, Organise: 0.25 }, 0.65);
}
export function leisureWeight(b: Body, descriptor: string, at: number) {
  const e = b.exposures[descriptor],
    n = e ? e.count * math.exp(-(at - e.at) / QUANTA / 36) : 0;
  return (1 + (0.2 * 3) / (n + 3)) / (1 + 0.5 * b.satiation);
}
export function exposeLeisure(b: Body, descriptor: string, at: number) {
  const e = b.exposures[descriptor];
  b.exposures[descriptor] = {
    at,
    count: 1 + (e ? e.count * math.exp(-(at - e.at) / QUANTA / 36) : 0),
  };
}
export function accumulateBody(
  b: Body,
  dt: number,
  effort: number,
  rest: boolean,
  pleasant: number,
  compulsory: boolean,
) {
  b.interval.effort += effort * dt;
  if (rest) b.interval.rest += dt;
  b.interval.pleasant += pleasant * dt;
  if (pleasant > 0) b.interval.leisure += dt;
  if (compulsory) b.interval.compulsory += dt;
}
export function closeBody(b: Body, at: number) {
  const i = b.interval,
    duration = at - i.start;
  if (duration <= 0) throw Error("Duplicate representative closure");
  const dt = duration / QUANTA;
  b.d = fatigueClosure(b.d, dt, i.effort / QUANTA, i.rest / QUANTA);
  b.f = enjoymentClosure(b.f, dt, i.pleasant / QUANTA, i.compulsory / QUANTA);
  const decay = math.exp(-dt / 3);
  b.satiation =
    b.satiation * decay + (i.leisure / duration / 0.12) * (1 - decay);
  b.interval = {
    start: at,
    effort: 0,
    rest: 0,
    pleasant: 0,
    compulsory: 0,
    leisure: 0,
  };
}
const TRANSFER: [Domain, Domain, number][] = [
  ["Field", "Fight", 0.5],
  ["Field", "Make", 0.2],
  ["Fight", "Organise", 0.3],
  ["Make", "Organise", 0.3],
  ["Organise", "Social", 0.4],
];
export function learningRates(
  b: Body,
  c: number,
  w: number,
  shares: Partial<Masteries>,
  useful: number,
): Masteries {
  const rates = zeroMasteries();
  for (const k of DOMAINS) {
    let transfer = 1;
    for (const [a, z, t] of TRANSFER)
      if (a === k) transfer += 0.3 * t * b.mastery[z];
      else if (z === k) transfer += 0.3 * t * b.mastery[a];
    rates[k] =
      ((shares[k] ?? 0) *
        math.sqrt(Math.min(c, 1)) *
        math.pow(1 - w, 0.25) *
        (0.75 + 0.25 * useful) *
        transfer) /
      12;
  }
  return rates;
}
export function learn(
  b: Body,
  rates: Masteries,
  shares: Partial<Masteries>,
  dt: number,
) {
  for (const k of DOMAINS) {
    b.mastery[k] = 1 - 1 / (1 / (1 - b.mastery[k]) + rates[k] * dt);
    b.practice[k] += (shares[k] ?? 0) * dt;
  }
}
export function validateBody(b: Body) {
  if (
    ![b.birth, b.anchor.at, b.interval.start].every(Number.isSafeInteger) ||
    !["M", "F"].includes(b.class) ||
    !b.alive
  )
    throw Error("Invalid adult body identity");
  for (const x of Object.values(b.capability))
    if (!Number.isFinite(x) || x <= 0) throw Error("Invalid adult capability");
  for (const k of DOMAINS)
    if (!(b.mastery[k] >= 0 && b.mastery[k] < 1) || !(b.practice[k] >= 0))
      throw Error("Invalid mastery");
  for (const x of [
    b.anchor.c,
    b.anchor.w,
    b.d,
    b.f,
    b.satiation,
    ...Object.values(b.interval),
  ])
    if (!Number.isFinite(x) || x < 0) throw Error("Invalid body anchor");
}

export function validateBodyAt(b: Body, now: number) {
  validateBody(b);
  if (
    b.birth > now - 216 * QUANTA ||
    b.anchor.at > now ||
    b.interval.start > now ||
    b.anchor.c > 1.2 ||
    b.anchor.w > 1 ||
    b.d > 1 ||
    b.f > 1
  )
    throw Error("Invalid adult body range/time");
  for (const x of [
    b.anchor.intake,
    b.anchor.requirement,
    b.anchor.target,
    b.anchor.tau,
    b.anchor.healing,
    ...Object.values(b.practice),
  ])
    if (!Number.isFinite(x) || x < 0) throw Error("Invalid physiology inputs");
  if (
    b.anchor.requirement <= 0 ||
    b.anchor.tau <= 0 ||
    b.anchor.target > 1.2 ||
    b.anchor.healing > 0.5
  )
    throw Error("Invalid physiology target");
  for (const e of Object.values(b.exposures))
    if (
      !Number.isSafeInteger(e.at) ||
      e.at > now ||
      e.count < 0 ||
      !Number.isFinite(e.count)
    )
      throw Error("Invalid familiarity anchor");
}
