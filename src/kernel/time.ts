// PORT: ESS-V2 src/core/primitives.ts; V4 timestamps remain integer quanta.
export const QUANTA = 2 ** 20;
export type Time = number;
export function checkTime(q: number): void {
  if (!Number.isSafeInteger(q) || q < 0)
    throw new RangeError("Invalid timestamp quantum or overflow");
}
export function time(sd: number): Time {
  const q = Math.ceil(sd * QUANTA);
  if (!Number.isFinite(sd) || sd < 0)
    throw new RangeError("Invalid SD timestamp");
  checkTime(q);
  return q;
}
export function future(now: Time, durationSd: number): Time {
  checkTime(now);
  const delta = time(durationSd),
    result = now + delta;
  checkTime(result);
  return result;
}
export function sd(q: Time): number {
  checkTime(q);
  return q / QUANTA;
}
