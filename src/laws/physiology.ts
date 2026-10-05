// Public held-input equations, Revision 4 §22. No body, world or evidence access.
import { math } from "../kernel/numerics";
export const clip = (x: number, low = 0, high = 1) =>
  Math.min(high, Math.max(low, x));
export function conditionTarget(n: number): number {
  return n <= 1 ? (2 * n * n) / (1 + n * n) : 1 + (0.2 * (n - 1)) / n;
}
export function conditionSegment(
  c: number,
  intake: number,
  requirement: number,
  duration: number,
) {
  const target = conditionTarget(intake / requirement),
    tau = target < c ? 0.35 : 0.7;
  return { c: target + (c - target) * math.exp(-duration / tau), target, tau };
}
// Exact integral of 4(1-c/.35)^2 over the part of one monotone exponential
// segment below .35, including entry AND recovery. No time stepping.
export function starvationHazard(
  c: number,
  target: number,
  tau: number,
  duration: number,
): number {
  if (duration <= 0) return 0;
  const end = target + (c - target) * math.exp(-duration / tau);
  if (Math.min(c, end) >= 0.35) return 0;
  let lo = 0,
    hi = duration;
  if ((c - 0.35) * (end - 0.35) < 0) {
    const crossing = -tau * math.log((0.35 - target) / (c - target));
    if (c >= 0.35) lo = crossing;
    else hi = crossing;
  }
  const a = 1 - target / 0.35,
    b = (c - target) / 0.35;
  const integral = (t: number) =>
    a * a * t +
    2 * a * b * tau * math.exp(-t / tau) -
    ((b * b * tau) / 2) * math.exp((-2 * t) / tau);
  return Math.max(0, 4 * (integral(hi) - integral(lo)));
}
export function fatigueClosure(
  d: number,
  duration: number,
  effort: number,
  rest: number,
): number {
  const target = clip(
    (0.3 + (0.12 * effort) / duration - rest / duration) / 0.2,
  );
  return target + (d - target) * math.exp(-duration / (target > d ? 1 : 0.5));
}
export function enjoymentClosure(
  f: number,
  duration: number,
  pleasant: number,
  compulsory: number,
): number {
  const v = Math.min(1, pleasant / duration / 0.12),
    rho = 0.08 + (0.12 * compulsory) / duration;
  const speed = 1.5 * v + rho,
    target = (1.5 * v) / speed;
  return target + (f - target) * math.exp(-speed * duration);
}
