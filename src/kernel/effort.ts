// Revision 4 §§17/47: account is causal; host slicing is not.
export type EffortKind = "review" | "safety" | "repair";
export interface EffortAccount {
  key: string;
  actor: string;
  kind: EffortKind;
  openedAt: number;
  allowance: number;
  spent: number;
  routeExpansions: number;
  prepaidExpansions: number;
  expansionsPerEu: number;
}
export function routeAllowance(a: EffortAccount): number {
  return a.prepaidExpansions + (a.allowance - a.spent) * a.expansionsPerEu;
}
export function chargeRoute(a: EffortAccount, expansions: number): void {
  if (
    !Number.isSafeInteger(expansions) ||
    expansions < 0 ||
    expansions > routeAllowance(a)
  )
    throw Error("Cognitive effort overrun");
  const required = Math.max(0, expansions - a.prepaidExpansions);
  const cost = Math.ceil(required / a.expansionsPerEu);
  a.spent += cost;
  a.prepaidExpansions += cost * a.expansionsPerEu - expansions;
  a.routeExpansions += expansions;
}
