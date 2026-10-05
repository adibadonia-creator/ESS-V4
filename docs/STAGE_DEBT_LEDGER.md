# ESS V4 — Stage Debt Ledger

This is the persistent debt register for Revision 4 development.

## Operating rule

Rush construction continues unless a finding is a genuine stage-blocking architectural or causal failure. Real but non-blocking deficiencies are recorded here and carried to the current stage's correction/adoption run.

Every implementation PR must:
- append newly discovered debt;
- update affected existing entries with new evidence;
- never delete an entry unless it is resolved and its acceptance condition is met;
- distinguish BLOCKER, STAGE DEBT, and OBSERVATION;
- preserve the evidence needed for the stage-end architecture/correction pass.

At each stage boundary, the complete ledger is handed to a capable reasoning model together with Revision 4 and the current repository. That model should seek the smallest coherent set of fixes that resolves multiple debt items at once. The resulting correction plan is then implemented in one concentrated stage-end run where possible.

## Status definitions

- **BLOCKER** — continuing would build on a fundamentally invalid causal/architectural foundation. Fix immediately.
- **STAGE DEBT** — demonstrated deficiency that should be corrected before the stage is certified, but does not prevent continued construction.
- **OBSERVATION** — suspicious or suboptimal behavior not yet demonstrated to violate a contract.

---

# Stage I debt

## S1-D001 — Exploration cognition is too eager before final agenda admission

- **Status:** STAGE DEBT
- **Introduced / observed:** Pack 0C3A / PR #6
- **Area:** mind / agenda / exploration / effort accounting
- **Primary files:** `src/mind/review.ts`, `src/mind/exploration.ts`
- **Revision-4 contract affected:** §17.2 agenda and fair admission; §17.1 shared effort account; §17.8 complexity contract
- **Symptom:** `Mind.deliberate()` invokes `explorationOptions()` before the ordinary agenda is assembled. That path can already perform frontier footprint reads, personal route search, EVSI, T1 binding and instrumental estimation even if the exploration opportunity is not ultimately admitted for substantive comparison.
- **Why this matters:** Revision 4 intends cheap/fair admission before expensive binding/forecast/nested estimation. The implementation remains bounded by the same 600-EU account and does not scale with irrelevant catalogue growth, so this is not currently a blocker, but it likely inflates ordinary review work and weakens the intended attention architecture.
- **Evidence:** Pack 0C3A ordinary 8/32 panels rose to about 251 EU/person/SD from about 82 EU/person/SD in Pack 0C2, while per-review maxima remained under 600. Irrelevant-content probes remained flat.
- **Suspected underlying cause:** exploration opportunity construction currently combines cheap nomination and expensive evaluation in one function.
- **Potential shared root:** may overlap with future project/standing-objective admission and should be solved by a general staged-admission boundary rather than an exploration-specific patch.
- **Why deferred:** capability correctness, hidden-world isolation and effort ceilings remain intact; Stage I is still being built and the upcoming project machinery will exercise the same admission boundary.
- **Resolution acceptance:** ordinary reviews that do not admit inquiry/trial must not pay full inquiry route/EVSI/binding work; fairness/cursors still guarantee eventual consideration; all nested work remains inside the same review account; no protected exploration slot or quota is introduced.

## S1-D002 — Frontier inquiry uses actor-current terrain instead of frontier-local personal terrain context

- **Status:** STAGE DEBT
- **Introduced / observed:** Pack 0C3A / PR #6
- **Area:** evidence / occupancy inference / inquiry valuation
- **Primary file:** `src/mind/exploration.ts`
- **Revision-4 contract affected:** §11.4 occupancy inference; §13 inquiry/EVSI semantics
- **Symptom:** frontier inquiry currently selects the occupancy terrain class from the actor's current cell when valuing a candidate frontier.
- **Why this matters:** a person standing on grass but considering a frontier adjacent to personally observed forest can value the frontier using the wrong personal occupancy posterior. Revision 4 intends inquiry estimates to depend on personally known terrain around the frontier, never hidden truth.
- **Evidence:** direct code inspection of the Pack 0C3A branch showed `ground` derived from `review.cell(cell(review.self.location))`.
- **Suspected underlying cause:** simplified Stage-I inquiry estimator used current-cell context as a shortcut.
- **Potential shared root:** future frontier/project targeting may benefit from one bounded personal local-context estimator.
- **Why deferred:** hidden terrain still does not leak and inquiry remains causal/paid; this is a local model-fidelity defect, not a foundation-breaking oracle.
- **Resolution acceptance:** inquiry valuation uses a bounded frontier-local mixture/estimate derived only from personally observed nearby terrain; paired worlds differing only in unseen terrain remain identical until evidence differs.

## S1-D003 — Stage-I performance is substantially above provisional engineering targets

- **Status:** STAGE DEBT
- **Introduced / observed:** Pack 0C3A / PR #6
- **Area:** performance / cognition / evidence / checkpointing
- **Revision-4 contract affected:** §40.4 instrumentation; §40.5 engineering targets; §43 P6
- **Symptom:** Pack 0C3A diagnostic advancement was materially slower than the provisional Stage-I target.
- **Evidence:** 8 adults ~72.87 ms median / 109.32 ms p95 per SD; 32 adults ~193.70 ms median / 281.06 ms p95 per SD on the recorded CI/probe machine. Revision 4 provisional target for tens of people is 15/30 ms median/p95 on a named reference machine.
- **Important qualification:** these are diagnostic single-run timings on a specific machine and not final Stage-I certification.
- **Suspected underlying causes:** increased review EU, evidence/frontier processing, route/EVSI work, checkpoint/state costs, plus pre-existing archive/projection overhead.
- **Why deferred:** no evidence of unbounded catalogue-dependent cognition; Stage-I gate is the proper place for profile-driven representation/algorithm fixes.
- **Resolution acceptance:** Stage-I gate profiles cost by causal workload, fixes clear accidental representation/algorithm bottlenecks without deleting causal distinctions, and reports 32/96 plus bounded ~400 probes against a named machine.

## S1-D004 — Checkpoint and resident continuation state are large

- **Status:** STAGE DEBT
- **Introduced / observed:** pre-0C through Pack 0C3A; materially visible in PR #6
- **Area:** persistence / evidence / geography / provenance / diagnostics
- **Revision-4 contract affected:** §40 data architecture; §43 P6; continuation-sufficient checkpoint doctrine
- **Symptom:** diagnostic checkpoints have grown large relative to current population size.
- **Evidence:** Pack 0C3A recorded ~7.49 MB for 8 adults and ~16.47 MB for 32 adults. Receipts already note resident exact provenance/geography/history/diagnostic state.
- **Suspected underlying cause:** continuation state, cold audit/provenance backing and forensic/diagnostic traces are not yet fully separated by lifecycle/representation.
- **Potential shared root:** may be resolved together with Stage-I state-discipline/performance work rather than by deleting evidence.
- **Why deferred:** persistence is deterministic and correct; no current evidence of causal loss or invalid restore.
- **Resolution acceptance:** identify hot continuation state vs cold/archive/diagnostic material; reduce accidental duplication/copying while preserving exact replay, provenance needed for causality, observer inertness and save/restore semantics.

---

# Stage II debt

_None yet._

# Stage III debt

_None yet._

# Stage IV debt

_None yet._
