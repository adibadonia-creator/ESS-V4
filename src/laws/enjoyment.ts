import { math } from "../kernel/numerics";
// General family law, §22.6; novelty has no independent reward.
export function pleasantWeight(
  weight: number,
  sensitivity: number,
  count: number,
  satiation: number,
  failures = 0,
) {
  const unfamiliarity = 3 / (count + 3),
    frustration = failures / (failures + 2);
  return (
    (weight * (1 + sensitivity * unfamiliarity * (1 - frustration))) /
    (1 + 0.5 * satiation)
  );
}
export function decayed(
  count: number,
  from: number,
  to: number,
  period: number,
) {
  return count * math.exp(-(to - from) / period);
}
