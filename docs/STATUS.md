# Pack 0B — evidence boundary and task runtime

Based on merged Pack 0A, `main` at `2933d30868ad5ae202f90d7ecf2df6979b662af4` (PR #1). Implementation branch: `pack0b-evidence-task-runtime`; one draft PR, no merge. [Revision 4.0](spec/REVISION_4_0.md) remains the sole authority and was read completely before implementation. **Pack 0 and §43's architectural proof remain incomplete. No autonomous choosing or Pack 0C is implemented.** The accepted physical substrate and its 48 tests remain; the historical implementation/reuse/performance receipt is preserved in [PACK0A](PACK0A.md).

## Evidence and information boundary

`src/evidence` is the sole personal-knowledge writer. One dated record schema supplies owner, personal subject, property/value, observation/receipt times, modality, original provenance, context, reliability, uncertainty, volatility, optional expiry, pinned status and version. Terrain, sites, people, routes, exact self facts and founding methods use that same lifecycle. Duplicate delivery of the same provenance/value is inert. Delivered evidence alone changes personal versions; reads never refresh memory, sample or query remote truth.

```
Authoritative world → physically filtered local perception packet → evidence writer
Evidence + permitted exact self + public map profile → detached PersonalView
PersonalView → personal route frontier / selected task runtime → selected physical prefix
World law validates that prefix → observable result / evidence → Continue or repair required
Analyst snapshot → presentation only
```

This describes write/read capabilities, not a truth router hidden behind a facade. Evidence/runtime/future mind cannot import world, runners, presentation or measurement. Future mind cannot import the evidence writer. Pure-core platform/global, randomness/math, content and read-side AST checks remain enforced, and core compilation has no DOM types. Truth-side routing remains available only to the separate Pack-0A diagnostic path. Personal actors reject those legacy diagnostic movement/goods/input commands.

Physically bounded perception uses continuous position, 0.6-km ordinary sight, terrain occlusion, qualified raster footprints and local spatial buckets. Routine attention accepts at most 12 observations/person/calendar SD; local surveys count as one qualified observation, with their per-cell properties delivered as evidence. Keyed detection and remote stock uncertainty use Philox and the numerical adapter; observed zero is categorical zero. Directed/mandatory operation, route and contact observations bypass the cap. Public raster sight-entry boundaries and actual site sight/contact circle entries are scheduled along movement, independently of renderer frames. Occluded site-entry events neither deliver evidence nor consume routine attention. No all-world search is used to gather a person's current percepts.

Personal subjects are assigned on perception; authoritative references remain internal execution capabilities. `PersonalView` returns remembered sparse cells/coverage, derived personal connected regions and witnessed crossings, dated routes, known place/person properties, methods, evidence and exact permitted own identity/location/leg/carried goods/reservations. It contains no hidden stock/terrain, other private state, scheduler or queue. Successful own transfers also deliver exact self stock updates; inspection is inert.

## Personal routing

`src/runtime/routing.ts` owns a separate sparse, persisted search over personal geography. Established routes first use coarse adjacency between personally witnessed connected regions, then eight-neighbour cell refinement within the selected corridor. Diagonals require both corner cells to be personally passable. Exploratory routes use the explicitly selected public prior for unseen cells; they read no authoritative geometry, components, portals or truth-route status.

Frontiers contain discovered keyed nodes and heaps, personal sparse knowledge and optional regional corridor. There are no per-person full-raster route arrays. The diagnostic authorisation bounds work at 64 expansions/EU; each host resume is additionally bounded by its engineering slice. Exhaustion retains an unresolved frontier and reports `route not established`, without proving unreachability. All computation occurs at the same simulated instant. Selected neighbouring physical prefixes execute through the accepted movement law. A newly observable remaining-path blocker delivers evidence, settles/stops the paid prefix and reports `route blocked here`, without revealing unseen alternatives. The regional corridor is a deterministic approximation, not a global least-cost claim.

## One runtime for selected intentions

`src/runtime` accepts explicitly diagnostic, already-selected intentions. Its one task persists intention/task identity, canonical semantic identity, objective, known method, explicit bindings, at most 12 ordered steps, cursor/status, personal belief dependencies, reservations, authorisation/spending, located progress, route frontier and interruption state. It has no objective generator, option comparison, operation planner or binder.

Real end-to-end families:

- **Move:** personal route → selected adjacent prefix → paid continuous physical movement.
- **Transfer:** paid handling interval → local physical ledger transfer, limited to the actor's own custody/endowment, with backed reservations and conservation.
- **Attend:** paid scoped local survey → qualified dated observation.

Work, Recover and Engage are typed normative families and fail explicitly with `not-yet-implemented law`; no fabricated law succeeds. Invalid route bindings are rejected before budgets/reservations/history are committed.

Lifecycle: selection → ready/routing → running → paid prefix/located progress → step completion → **Continue** into the next bound step, or done. An observed physical failure, changed relevant personal version or exhausted budget produces blocked/repair-required. Interruption settles once, cancels scoped future work and suspends; resumption retains the unpaid suffix/frontier. Abandonment releases unused goods. Repairable blocked tasks retain potentially useful reservations until abandonment or declared expiry; unsupported-law failure and completion release unused reservations. No replacement target/objective is chosen.

Semantic authorisation is derived from actor/objective/method/bindings/ordered steps, rather than diagnostic labels or new IDs. Its persistent spent budget and completed cursor survive retry, and changed authorisation for the same semantic task is rejected. Goods commitments use existing physical backing. A single retained task per actor and one active scheduled interval provide exclusive time allocation; no future time or expected harvest is borrowed. Prefixes settle actual elapsed Move/Attend/Transfer time, split totals across calendar SDs and reject overlap or totals above one SD. Staggered representative closure pays the current prefix without resetting the task. Time exhaustion is checked before launching another prefix, including exhaustion exactly at a completed Move-prefix boundary. No fatigue/enjoyment physiology is inferred.

The browser/default and `--pack0b` CLI fixture use limited founding knowledge, **Transfer → exploratory Move → Attend**: 0.5 food from the local own cache to carried goods, a public relative eight-cell destination, then a paid survey. The chosen destination never comes from a truth search. Flat diagnostic fixtures additionally prove Move → Attend, cross-day attention, local hidden surprise, version staleness, interruption and custody refusal. These fixtures prove knowing/executing, not choosing; some canonical exploratory tasks correctly block on observed terrain.

## Checkpoints and verification

Checkpoint schema **3** includes evidence/provenance versions and internal links, sparse personal map/coverage/routes, task frontiers/cursors/status/progress, semantic budgets, physical reservations, paid activity prefixes and pending perception/operation events. Derived read indexes are reconstructed. Earlier schema/source/profile saves are explicitly rejected; no epistemic history is fabricated. Restore validates version reconciliation, sparse geometry, task/reservation references, non-overlapping paid prefixes and semantic spent totals. Personal-lens ordering is canonical after restore.

Verification on 2026-10-04, Linux x64, Node 24.19.0, TypeScript 5.9.3:

- `npm run check`: dependency/content/numerical boundaries, typecheck, **77 Vitest tests** (48 retained + 29 Pack-0B), pure core compilation and production build pass.
- Paired hidden blockage, remote stock/location, irrelevant terrain and occluded-site fixtures keep evidence/geography/personal routing/bound task output identical until actual perception. Hidden mutations do not change personal versions; a relevant observed change can require repair, unrelated evidence does not. Personal execution performs **zero truth-route searches**.
- Radius/occlusion, unknown versus observed zero, swept site entry without renderer frames, routine cap, directed bypass, deduplicated version delivery, pure reads, custody/backing/conservation and no renewal under renamed IDs/labels pass.
- Exact checkpoint continuation passes during unfinished local/coarse routing, active Move, between steps, suspended/blocked state and active goods reservation. Corrupt evidence versions, duplicated paid prefixes and reset spent budgets are rejected.
- One versus 65,536-expansion host slices, repeated runs, alternate stepping, observer reads and save/restore produce equal causal/history output. Continue counters advance; autonomous-deliberation count is **zero**.
- **2 production Playwright tests pass**: real module worker equals Node, covering both accepted physical and personal-task scenarios, active movement/reservations, interruption/resumption, checkpoint restore, alternate partitions, observer reads, numerical/random vectors and frame delays. Pixi/WebGL UI and paused Personal Lens open/close pass without page exceptions; the automated screenshot was inspected by Codex. No human review receipt is claimed. Local testing uses the existing optional bundled Chromium 153; CI installs normal Playwright Chromium.
- CLI checkpoint at **0.03 SD** includes active Move and blocked tasks. Restore to **1 SD** exactly matches the complete uninterrupted exported summary, with conservation true. Final hashes are recorded alongside the measurements below.
- GitHub Actions runs `npm ci`, `npm run check` and the production Playwright gate on push/PR. Its final head-specific receipt belongs on the draft PR; a pending remote check is not represented as passed in this file.

Reproduce:

```sh
npm ci
npm run check
npx playwright install --with-deps chromium
npm run test:browser
npm run headless -- --pack0b --seed spine --until .03 --checkpoint /tmp/pack0b.json
npm run headless -- --restore /tmp/pack0b.json --until 1
npm run headless -- --pack0b --seed spine --until 1
npm run benchmark -- --pack0b
npm run benchmark -- --pack0b --probe32
```

## Measured execution costs

[Raw five-run measurements](pack0b-benchmark.json), seed `spine`, canonical 256×192 raster, 24 finite sites, selected tasks until 1 SD, AMD EPYC 9V74. Each population's five repetitions have identical hashes, checkpoint sizes and counters. These are machine-specific engineering observations, **not §40.5's full-population performance gate or §43's proof**. No comparison against the old route-to-site fixture is claimed: the workload, perception/history and hash-cache state differ.

| Median operation, ms | 8 people | 32-person probe |
| --- | ---: | ---: |
| World/raster/regions creation | 862.84 | 874.17 |
| Limited knowledge + task selection | 17.59 | 65.63 |
| Causal advancement to 1 SD | 38.06 | 155.08 |
| JSON checkpoint | 196.57 | 338.21 |
| First causal hash (includes terrain digest) | 126.45 | 197.02 |
| All personal lenses, without causal hashing | 10.46 | 44.12 |
| Detached analyst + personal snapshot, warm terrain digest | 34.88 | 135.00 |

| Counter / persistence | 8 people | 32-person probe |
| --- | ---: | ---: |
| Perception candidates | 589 | 2,941 |
| Accepted routine observations | 96 | 373 |
| Evidence updates | 1,207 | 5,271 |
| Personal searches / expansions | 8 / 149 | 32 / 494 |
| Personal regional expansions (exploratory benchmark) | 0 | 0 |
| Truth-route searches | 0 | 0 |
| Step starts / completions | 20 / 16 | 82 / 68 |
| Continue / repair-required transitions | 12 / 4 | 50 / 14 |
| Autonomous deliberations | 0 | 0 |
| Processed events | 540 | 2,206 |
| Personal-view projections | 40 | 160 |
| Checkpoint bytes | 5,608,888 | 8,825,974 |

Regional guidance is separately exercised by established-routing tests; these exploratory fixtures do not use it. Four/eight and fourteen/thirty-two tasks stop at locally observed blockages; this is a diagnostic result, not a success-rate or behavioural calibration target. The 8-person causal hash is `ba81852956bb9fed6d1a82b5334e8623`; the 32-person hash is `2ce46c6772a415029d04689e1dd00f6b` for the source identity in the raw receipt. Counters/timing are non-causal.

## Reuse, limits and deliberate deferrals

Pack-0B perception/provenance and known-map/resumable personal routing are **REIMPLEMENT FROM CONCEPT**, with fresh records/services over the accepted Pack-0A law; no old evidence facade or dedicated exploration subsystem was copied. Old decision/exploration controllers and monolithic world/planner classes remain **RETIRE**. The retained numerical/kernel/physical reuse is documented in PACK0A. No Level-III constitutional change, new operation family or scientific calibration was introduced; no ADR is needed.

Engineering costs remain material: detached lens/snapshot serialization and complete JSON saves copy accumulated evidence, history and terrain. Full-raster terrain dominates initial storage; epistemic records grow with delivered observations. Long-run evidence compression/archive and memory eviction/pinning policy are deferred; records carry the schema's pinned/expiry fields but this short slice retains history instead of inventing a forgetting policy. Regional summaries are derived from sparse seen cells on projection, not cached. Host route draining is synchronous in the current CLI/worker, with explicit bounded resume available; no asynchronous host scheduler or optimal-path guarantee is claimed. Corruption hashes are replay identifiers, not authentication.

Deliberately deferred: autonomous drives/objectives/deliberation, bounded binding/repair, utility/risk/information-value comparisons, held decision error/incumbency, full method mastery/learning/body physiology/hazards, tools/capital valuation, ecological renewal/animals, social reports/messengers/agreements/claims/relationships, reproduction/households/institutions/combat/markets and the remaining Pack-0 generativity proof. Report/inference modalities are representable but no social evidence is fabricated. The two founding diagnostic methods are declared knowledge, not a learned population repertoire.

No unresolved leakage, conservation, paid-time or replay falsifier was observed in this gate. Pack 0C must retain the narrow PersonalView/execution ports and consume the explicit repair-required boundary; it must not use analyst/world registries or renew semantic budgets. Larger/longer workloads need memory/archive and projection performance work before claiming the architectural-proof performance target. Pack 0B is an execution boundary receipt, not Pack-0 completion.
