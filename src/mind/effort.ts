import type { Counters } from "../kernel/counters";
import type { EffortAccount } from "../kernel/effort";
import { canonical } from "../kernel/canonical";
export function openReview(actor: string, at: number): EffortAccount {
  return {
    key: canonical([actor, "review", at]),
    actor,
    kind: "review",
    openedAt: at,
    allowance: 600,
    spent: 0,
    routeExpansions: 0,
    prepaidExpansions: 0,
    expansionsPerEu: 64,
  };
}
export class ReviewEffort {
  nodes = 0;
  constructor(
    readonly account: EffortAccount,
    readonly counts: Counters,
  ) {}
  spend(
    kind:
      | "descriptor"
      | "retrieval"
      | "binding"
      | "forecast"
      | "trial"
      | "information",
    amount = 1,
  ): boolean {
    const cost =
      kind === "binding" ? 4 * amount : kind === "trial" ? 3 * amount : amount;
    if (
      this.account.spent + cost > this.account.allowance ||
      (kind === "binding" && this.nodes + amount > 12)
    )
      return false;
    this.account.spent += cost;
    this.counts[`${kind}Eu`] += cost;
    this.counts.reviewEuTotal += cost;
    if (kind === "binding") {
      this.nodes += amount;
      this.counts.bindingNodes += amount;
    }
    return true;
  }
}
