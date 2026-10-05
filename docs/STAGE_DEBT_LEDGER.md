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

- **I.1 update:** the same eager exploration nomination remains; new capital/project consumers did not resolve this admission boundary. Acceptance remains unmet.

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

- **I.1 update:** the modest four-adult/two-SD panel records host timings on AMD EPYC 9V74; these are not per-SD 32/96 benchmarks and do not meet this acceptance criterion. See `STAGE_I1_NATURAL_PANEL.json`; no large campaign was run.

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

- **I.1 update:** new projects, located work/items and retained repair/safety audit add resident state. Four-adult two-SD checkpoints remain material; the new panel reports bytes directly. Closed project roots retire from hot admission but remain cold resident. Acceptance remains unmet.

## S1-D005 — Capital and completion estimates compress future service calendars

- **Status:** STAGE DEBT
- **Introduced / observed:** Stage I.1 / PR #7
- **Subsystem / primary files:** mind forecasting/capital/projects; `src/mind/{capital,forecast,projects}.ts`
- **Revision-4 contract:** §§14–15 differential capital services, completion tails; §17 shared bounded estimation
- **Symptom / importance:** personal rates, evidenced use/opportunities, acquisition cost and wear inform ordinary consequences, but transport/setup/repair/displacement/demand/survival-keep calendars are compressed. Future nourishment uses a bounded continuation approximation, and the project tail uses a 24-SD discount and zero additional residual-cost field. This can misrank investments and distant residual services.
- **Evidence:** `capitalOptions`, `futureFood`/`futureSource` and `ProjectFrontier.completion`; positive/zero-use autonomous tool tests, physical cache and P2 tests prove capability, not full calendar fidelity.
- **Suspected root / shared root:** bounded first consumer forecasts mix nomination, binding and future continuation; overlaps D001 and D006.
- **Why deferred:** estimates remain personal and EU-bounded; future services cannot fund selected inputs or reserve gates; actual physics stays finite.
- **Resolution acceptance:** paired with/without-capital calendars account once for actual expected use, wear, transport/setup/repair, displaced alternatives and survival keep; completion benefit occurs at its estimated date with residual costs and the person's discount. Preserve the existing negative and hidden-world cases.

## S1-D006 — Project renewal and cold lifecycle representation need broader correction

- **Status:** STAGE DEBT
- **Introduced / observed:** Stage I.1 / PR #7
- **Subsystem / primary files:** retained cognition; `src/mind/{projects,review,types}.ts`
- **Revision-4 contract:** §15 persistent frontiers, RenewalConditions and attempts; §§17.8/40 state discipline
- **Symptom / importance:** two hot roots advance fairly and terminal roots retire, but cold frame/dependency/root histories remain resident. Relevant focus-method beliefs are checked; general dependency renewal, alternative producer branches, resumable root attempt summaries and bounded compaction are less complete than §15. A serial/complementary path is supported, not a universal planner.
- **Evidence:** 13-stage physical completion, 24-stage ordinary-review leaf admission and 220-link restored traversal pass; `frames.push`, dependency receipts and `closedProjects` show actual-history growth. Closed-slot blockage was fixed in this PR.
- **Suspected root / shared root:** frontier and audit receipts share resident representation; overlaps D004 and D005.
- **Why deferred:** hot admission/traversal is bounded, no lifetime depth ceiling or subset explosion, no free outputs; deep validation/index rebuild is confined to restore.
- **Resolution acceptance:** relevant dependency revisions renew only affected frontier work, viable producer alternatives receive fair consideration, closed/abandoned attempts compact/archive without deleting semantic spend or WIP provenance, and hot cost stays independent of closed history.

## S1-D007 — Material/access/quality breadth exceeds the first physical consumers

- **Status:** STAGE DEBT
- **Introduced / observed:** Stage I.1 / PR #7
- **Subsystem / primary files:** material objects/custody/quality; `src/world/{material,adultPhysical}.ts`, `src/mind/binder.ts`
- **Revision-4 contract:** §§19/22 located making, contributors, access and quality; §40 causal object lifecycle
- **Symptom / importance:** located WIP is maker-owned; workshop/contributor access and quality-preparation candidate comparison are narrow. Quality targets/preparation are represented physically, but the ordinary binder mainly nominates the baseline. Aggregate goods and individual same-kind items lack a fully general destruction/identity selection contract, although effects require actual held stock and transfers carry item custody.
- **Evidence:** default target/preparation, actor/recipe/location WIP keys and same-kind transfer selection in these files; changed-input and held-quality tests pass. Missing breadth can misrepresent advanced material consumers.
- **Suspected root / shared root:** first own-custody consumer with aggregate goods and keyed items; overlaps D006 and future I.2 rights integration.
- **Why deferred:** required own-making/tool/cache/P2 consumers work with actual input/time/output; no other person's access is fabricated.
- **Resolution acceptance:** contributor/access/workshop receipts and selectable quality/preparation use the same Binder/runtime; per-item transfer/destruction preserves identity/effects; lifecycle compaction retains needed provenance and exact restore.

## S1-D008 — Predator exposure uses a discrete local approximation

- **Status:** STAGE DEBT
- **Introduced / observed:** Stage I.1 / PR #7
- **Subsystem / primary files:** animal exposure; `src/world/danger.ts`, `src/runners/simulation.ts`
- **Revision-4 contract:** §37 animal movement/exposure; §§7/16 anchored hazard and paid engagement
- **Symptom / importance:** 0.1-SD local movement samples endpoint distance and an approximate exposure integral. One nearest living target and retained pursuit hazard are causal, but contact timing for moving paths is not a complete analytic sweep. This can alter encounter/harm timing.
- **Evidence:** `DangerLaw.tick`; directional contest/injury, hidden predator, paid defence/WIP resume and multiple natural seed harm/flight replays pass. It is minimal Stage-I danger, not full hunting ecology.
- **Suspected root / shared root:** discrete first animal consumer; overlaps movement boundary settlement D011.
- **Why deferred:** physical ownership, local evidence, held exposure, actual harm and bounded human safety are preserved; no omniscient human threat controller.
- **Resolution acceptance:** moving exposure/contact thresholds settle against anchored trajectories without observation/host-partition dependence, retain held hazards correctly through pursuit changes and death, and preserve safety/purpose replay proofs.

## S1-D009 — Flight from located WIP needs a general envelope-safe return/resume proof

- **Status:** STAGE DEBT
- **Introduced / observed:** Stage I.1 / PR #7
- **Subsystem / primary files:** safety/runtime/located work; `src/runtime/runtime.ts`, `src/mind/{review,binder}.ts`, `src/world/material.ts`
- **Revision-4 contract:** §§15–16 selected purpose, located milestones and suspension
- **Symptom / importance:** recovery-purpose flight resumes, and same-place defence resumes actual manufacture. After flight displaces a person, immediately resuming the old located Work can block until ordinary Binder routes back using own dated WIP evidence. A general return-and-resume inside the original remaining envelope has not been proved.
- **Evidence:** danger recovery and defence-manufacture tests; Binder WIP-location routing and MaterialLaw location checks. An unchanged semantic purpose alone does not confer remote work access.
- **Suspected root / shared root:** primitive cursor suspension versus located frontier renewal; overlaps D006/D007.
- **Why deferred:** access is rejected honestly and the original spend/WIP remains; required valid-purpose resumption works. No teleportation, input refund or fresh budget.
- **Resolution acceptance:** a displaced ordinary making purpose returns through personally known safe routing, retains time/goods/cursor/quality/backing and completes or explicitly reconsiders when the original envelope cannot fund return.

## S1-D010 — Standing maintenance and active-flow transactions need broader integration

- **Status:** STAGE DEBT
- **Introduced / observed:** Stage I.1 / PR #7
- **Subsystem / primary files:** body/storage/forecast funding; `src/mind/maintenance.ts`, `src/world/{storage,adultPhysical}.ts`, `src/runners/simulation.ts`
- **Revision-4 contract:** §§16/20–22 paid standing allocation, finite food and concurrent custody
- **Symptom / importance:** backed nourishment covers selected Work/Move without an explicit meal plan. It is not a full standing rest/food policy. Selected output and indexed coworker settlements flush streams, but arbitrary external diagnostic writes during an active flow do not share a general flush contract. Other-person concurrent transactions await I.2.
- **Evidence:** concurrent extraction/nourishment, exact-instant flow closure and P2 consumption tests; `StorageLaw.touch`/selected settlement paths. Future reserve admission also primarily uses food backing rather than every nutritional good.
- **Suspected root / shared root:** operation-owned streams and transaction-owned anchors; overlaps D005 and social rights integration.
- **Why deferred:** existing authorised paths conserve and replay; future forecast allocation mints no physical goods/time. Unsupported external concurrency is not a claimed capability.
- **Resolution acceptance:** all relevant physical debits/credits flush/reanchor the single stream and rights backing consistently; standing allocation includes represented nutritional alternatives and rest without a controller, duplicate time or future funding.

## S1-D011 — Resolved phase, movement-arrival and spoilage-backing failures

- **Status:** OBSERVATION — resolved in Stage I.1 / PR #7; formerly causal blockers
- **Subsystem / primary files:** kernel adapters and finite goods; `src/runners/simulation.ts`, `src/world/goods.ts`
- **Revision-4 contract:** §§5/7/16 single ownership, phase order and finite reservation backing; §43 non-social P5
- **Symptom / importance:** extended natural runs could schedule harm in the same harm phase, or deliver an old movement-arrival event after interruption started another motion. P2 fish decay could leave outstanding reservations above surviving stock. These caused exceptions or failed reconciliation and were fixed immediately.
- **Evidence / resolution:** harm is queued in a later quantum when its phase has passed or equals the current phase; arrivals carry exact motion/generation and require its arrival state; actual local spoilage shortfall reduces indexed claims proportionally and records spoiled backing. New natural-seed and P2 active-restore regressions pass; the three-seed panel conserves/replays.
- **Suspected root / shared root:** deferred physical events/claims did not carry sufficient causal lifecycle checks; relates D008/D010.
- **Why deferred:** not deferred; retain this record for stage-end review.
- **Resolution acceptance:** original failing seeds and tight food backing run without phase/ownership errors, claims never exceed physical stock, and active restore/partitions/observer reads agree. Met by the added tests and final natural panel.

## S1-D012 — Resolved project completion and exact replay defects

- **Status:** OBSERVATION — resolved in Stage I.1 / PR #7; formerly causal blockers
- **Subsystem / primary files:** recipe compilation, projects, material settlement; `src/content/recipes.ts`, `src/mind/{projects,review,binder}.ts`, `src/world/adultPhysical.ts`
- **Revision-4 contract:** §§7/15/22 exact replay, paid prerequisites and real completion
- **Symptom / importance:** canonical restore reordered recipe input transactions; consumed leaf outputs could be remade instead of advancing the actual ancestor milestone; fractional batch input funding undercounted indivisible outputs; a short making prefix could be treated as completed despite remaining WIP. Exact-instant interruption also formerly left a food flow open. False completion/replay loss would invalidate the proof.
- **Evidence / resolution:** sorted compiled recipe inputs, recorded actual project milestone, exact own-stock root receipt, integer batch funding, blocked unfinished making and unconditional flow closure correct these defects. Material-life replay, 13-stage physical completion, short-prefix noncompletion, held WIP/quality and coflow tests pass.
- **Suspected root / shared root:** planned operation receipts and actual material lifecycle needed a shared completion/settlement boundary; overlaps D006/D010.
- **Why deferred:** not deferred; retain the findings and regressions.
- **Resolution acceptance:** deterministic transaction order across restore, no consumed-leaf remaking or unfunded batch, no project completion before actual output, no leaked zero-time flow. Met by the decisive regressions; broader lifecycle fidelity remains D006/D007.


---

# Stage II debt

_None yet._

# Stage III debt

_None yet._

# Stage IV debt

_None yet._
