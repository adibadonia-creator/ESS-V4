# ESS V4 — Computational Scaling and State Discipline

**Engineering implementation and review contract · 4 October 2026**  
**Authority:** Emergent Social Simulation — Revision 4.0. This document is subordinate to that specification.  
**Scope:** representation, execution cost, persistence, measurement and a read-only audit. This task modifies no repository and implements no Pack 0C. Recommendations preserve the scientific model and existing architecture.

## 1. Executive conclusion

**Preserve the targeted Pack-0B corrections, then complete a small computational-state retrofit before building autonomous Pack 0C cognition on these interfaces. Do not restart the foundation.**

The corrections anticipated by the supplied prompt are already visible in draft PR #2 at `f8c671cf5057ce33cfbb0e66396a3ab2426ec9e6`. They fix the most obvious evidence accumulation: 32 discretionary places, scope-owned pins, compact current records, sparse map cells and shared survey provenance. The supplied STATUS is an earlier receipt. Its statement that memory eviction is deferred no longer describes the inspected branch.

Three remaining boundaries make “land the fixes and proceed unchanged” unsafe:

1. **Execution still searches historical state.** Completed tasks remain in `RuntimeState.tasks`; current-task lookup copies and reverses that entire array. Paid prefixes and old day totals accumulate, and starting/resuming a timed step filters prior prefixes. A fresh diagnostic at fixed local geography retained 256 complete tasks and 256 prefixes after 256 completed episodes, with no live task. This is avoidable history-dependent work on the continuation path.
2. **The personal read interface is a bulk inspector, not yet an indexed cognitive read interface.** `EvidenceService.view()` copies current evidence and all remembered cells, reconstructs all personal regions, then clones the resulting view again. Runtime selection and route startup call it. Feeding every future review through this interface would make cognition grow with total remembered geography and pinned records before its effort account even starts.
3. **A purported engineering cutoff has a causal consequence.** Personal routing’s 4,096-expansion computation boundary can set a task to `blocked` and append `task-repair-required`. Host slice size is separately invariant, but that does not make the total cutoff engineering. Revision 4 §§8.3, 17.1 and 17.7 require cognitive route work to use the shared causal effort account. A lower-level search may return unresolved; an engineering limit alone must not become personal failure, spend, lost opportunity or a new review.

The smallest pre-0C retrofit therefore covers **current task/paid-state indexing and lifecycle, narrow indexed personal reads with versioned geography, active self-reservation access, and an explicit host-versus-cognitive routing boundary**. Preserve exact retry spend, original semantic identity, genuine suspended work, physical progress and the existing information boundary. Do not delete the records that enforce those properties.

Broader archive separation, identity-registry growth, transaction reconciliation, full-state hashing and publication must be corrected **before the Pack-0 architectural proof/performance gate**, with an earlier gate on the first repeated autonomous-work fixture. Typed terrain arrays, sparse route frontiers, local perception, the single ledger, keyed randomness and the seven-organ ownership structure are sound foundations. Binary checkpoint packaging, more elaborate region algorithms and native kernels are not pre-0C prerequisites.

**There is no demonstrated unavoidable Level I–III computational contradiction.** There are real lower bounds: remembered map coverage, learned repertoires, permanent pedigree, durable precedent, actual obligations and actual interactions can grow. Revision 4 never promises constant total memory or constant dense-case cost. It requires that unrelated history, catalogue entries and geography do not automatically enter ordinary work. The doctrine below makes that distinction executable.

### Evidence boundary for this report

- Accepted Pack 0A: `main` at `2933d30868ad5ae202f90d7ecf2df6979b662af4`.
- Inspected Pack 0B: `pack0b-evidence-task-runtime` at `f8c671cf5057ce33cfbb0e66396a3ab2426ec9e6`, draft [PR #2](https://github.com/adibadonia-creator/ESS-V4/pull/2).
- Repository and attached Revision 4.0 are byte-identical: SHA-256 `d9c1c63060e9a2cbf56a1e4fe4ace994f21c24b74d21c5f24e27610322b59882`.
- Source inspection and small diagnostic probes are direct findings. Published performance and full-suite receipts are attributed to the repository; this audit did not rerun the full test suite, certify a browser or produce a new P6 benchmark.
- No branch, PR, specification or source file was modified. Findings apply to those commits, not to any unseen concurrent follow-up.

## 2. Computational invariants derived from Revision 4

This contract translates existing requirements into engineering gates. Its MUSTs bind implementation conformance under Revision 4; they introduce no new scientific parameter or behavioural policy.

| Invariant | Required engineering consequence | Authority |
| --- | --- | --- |
| Seven organs and single writers | Indexes and caches stay under the owning organ; there is no new state-management organ or alternate controller | §§5, 45.2 |
| Same causal history across host conditions | Wall clock, frame rate, cache residency, worker scheduling and serialization batches cannot enter event order, knowledge, draws or authorization | §§3.5, 6, 39–40 |
| One finite, paid activity ledger | Current accumulators and paid cursors replace history rescans; closing a representative interval never resets a task or refunds spend | §§9, 16 |
| Belief-only cognition | Private target indexes contain personally known records; truth indexes never become a shortcut for binding or forecasting | §§7, 8, 11 |
| Shared cognitive budget | All nested binding, forecasts, EVSI, option-capital, people and routing work debit the same review account | §17 |
| Continuation is cheap | No agenda construction, full-map projection, lifetime-prefix scan or new option comparison in a valid Continue | §§9.6, 17.8 |
| Finite backing and independent assent | One authoritative quantity; claims, custody, reservations and debts remain separate; cache misses cannot manufacture backing or consent | §§3, 20, 26 |
| Bounded discretionary memory, persistent necessity | Apply the specified memory policy; preserve pins, posterior contributions, map coverage and durable precedent | §§11.6, 25 |
| Honest incompleteness | Deferred search is not impossibility; censored work is not negative evidence; technical exhaustion pauses with a checkpoint | §§3.5, 15, 17.6 |
| Continuation-sufficient saves | Persist all future-relevant anchors, held inputs, cursors, provenance, semantic spending and dependencies, including external causal backing needed to resume | §6.5 |
| Compact permanent history | Append new facts once; aggregate routine flows where sufficient; never reconstruct live state from lifetime history on ordinary events | §§6.5, 40 |
| No performance through scientific loss | Keep canonical scale, individual agents, locality, paid movement, uncertainty, heterogeneity, scientific variables and coefficients | §§1–3, 38–40 |

**Representation equivalence has two tests.** First, compare canonical logical state and subsequent causal events, not incidental object layout or file bytes. Second, under the certified numerical profile, prove the same arithmetic and semantic order. Mathematically equivalent floating-point expressions are not automatically replay-equivalent. A new reduction order, quantized terrain value, approximation, planner truncation or changed candidate order is not a free class-E optimisation.

A changed source/schema stamp legitimately changes a diagnostic hash. Cross-implementation equivalence tests must compare version-normalized logical state and event records under an explicitly declared compatibility test, while preserving real source/version metadata. Never strip metadata to mislabel an old save as a new baseline.

## 3. Scaling vocabulary and allowed growth shapes

### 3.1 Variables

All costs refer to a stated interval, normally one SD, and a named workload. Separate stocks from flows.

| Symbol | Meaning |
| --- | --- |
| `N`, `X` | Living people; living exposure `∫ N(t) dt` in person-SD |
| `C`, `ΔC` | World cells; genuinely changed cells |
| `Q` | Pending valid events, with stale entries reported separately |
| `E`, `e` | Cumulative processed causal events; events in the measured interval |
| `R`, `r` | Current directed ties/relations; ties actually touched in the interval |
| `O`, `o` | Live obligations/commitments; due or otherwise affected records |
| `A`, `F` | Active/retained tasks and route searches; total discovered route-frontier nodes/heap entries |
| `H`, `h` | Required archived historical records; new records written in the interval |
| `K` | Immutable content entries, distinguishing global catalogue from personal repertoire |
| `D`, `L` | Local physical/social density; actual spatial/visibility candidates returned |
| `V = Σ Vᵢ`, `Y` | Personally remembered geographic cells/property-specific coverage; total retained route/path geometry entries |
| `P`, `J` | Live projects; their active frontier/alternative records |
| `S`, `G` | Storages/sites/structures; occupied stock/claim/item/reservation records, not all possible good slots |
| `M`, `U` | Personal methods and other retained epistemic records; required pins/mandatory personal records |
| `Z` | Exact future-relevant compact summaries: precedent, dedup/accountability keys, purpose-spend records, reproductive sets |
| `W`, `B` | Reviews in the interval; shared EU budget of the relevant review/repair |
| `T` | Elapsed simulated history, used only where a cause of growth is explicitly stated |

Body anchors and fixed-size biological vectors contribute `O(N)`. Animals, messages, members and immutable pedigree nodes are separately counted where introduced; they are not hidden in a supposedly constant per-person cost. `D` here means density; Revision 4 §40.1 uses that letter for due records, represented here by `o`.

### 3.2 Reference cost envelope

For an implemented workload, a useful decomposition is:

`hot memory = O(C + N + Q + G + R + O + A + F + V + Y + M + U + J + Zresident + derived working set)`.

`SD work = O(N + e log Q + touched physical state + local visibility/contact work + Σreview(B + index overhead + affected mandatory records) + charged route work + h)`.

This is a decomposition, not a universal tight bound. Search heaps add their logarithmic factors; visibility includes local ray/cell work; dense interaction and large immutable-reference lookups have explicit terms. Archive-backed causal records contribute to durable storage and demand paging even when absent from the resident set. Every PR must refine the terms it touches.

A compact checkpoint costs current logical state plus required referenced causal records and manifests. A self-contained export may additionally cost all retained history. **Do not call that full export a constant-size checkpoint.**

### 3.3 Legitimate and accidental products

| Shape | Legitimate cause | Avoidable mistake |
| --- | --- | --- |
| `O(C)` | Shared physical raster, generation, occasional complete world export | Scanning it for a local percept or mind target query |
| `O(Vᵢ)`, eventually `O(C)` per person | A person really witnessed the whole world; coverage is expressly non-evictable | Allocating full-raster route arrays for every actor before they know or search it |
| `O(NC)` worst-case memory | Every person independently retains differently dated whole-world maps | Copying truth terrain into each mind; cloning all maps at each wake |
| `O(R)` and possibly `O(N²)` | Every directed tie is actually relevant and retained under the model; distinct mandatory relations are genuinely dense | Allocating potential-pair tables or recalculating every possible attraction/kin pair |
| Dense local work | A real event has many witnesses, recipients, opponents or competing claimants | Testing distant pairs or constructing a conversation graph merely because people share a crowd |
| `O(H)` durable storage | Pedigree, consequential transitions, genetic archives and irreducible accountability | Re-hashing, cloning or scanning `H` on every event, personal read or frame |
| `O(K)` | Content validation/compilation once per version; actual known repertoire can grow | Scanning all content to nominate methods or padding each inventory/posterior with every catalogue entry |
| `O(Z)` causal backing | Exact distinct partners, cooldowns, provenance membership and durable semantic attempts | Retaining entire evidence/task objects when a sufficient summary or exact key suffices |

No policy here caps population, legitimate pins, genealogical history or geographic knowledge to make a benchmark pass. A technical limit is an explicit halt boundary, not forgetting, refusal, death or a missed birth.

## 4. Canonical state-lifecycle taxonomy

“Cold” means access frequency and representation, not permission to forget. Distinguish **cold scientific archive** from **cold causal backing**: a pedigree ancestor used by the kin law or an old purpose-spend record used on retry is still causal even if paged off the hot heap.

| Category | Owner and lifetime | Duplication rule | Persistence and causal hashing |
| --- | --- | --- | --- |
| A. Authoritative hot causal state | Relevant single writer; until the physical/process obligation ends | One writable truth. Secondary views contain references or derivations, never independently spendable quantities | Persist and logically hash; include anchors, held inputs, residuals, leases, ordinals and paid cursors |
| B. Personal hot epistemic state | Evidence service, with mind/runtime-owned decision state kept distinct; specified forgetting/pinning/lapse lifetimes | Share immutable payload only when all epistemic metadata agrees; actor versions, dates, recognition and policy state stay personal | Persist/hash everything affecting future decisions, including coverage, cursors, uncertainty and precedent |
| C1. Cold consequential archive | Kernel/history channel with law-attributed facts; permanent when §6.5/§38 requires | One append-only logical record; references and optional indexed projections allowed | Integrity-check chunks; maintain a canonical semantic history commitment. Physical compression/chunk boundaries do not change causal history |
| C2. Cold causal backing | Original owner, accessed by exact key for a specific cause; until demonstrably irrelevant under the model | No destructive archive eviction. Resident cache is disposable; backing is not | Required save dependency, hashed logically; missing backing prevents exact continuation |
| D. Derived indexes | Owning organ; rebuilt after restore or updated with owned writes | Duplicate keys/pointers permitted with declared fanout; no independently authoritative values | Rebuild by default. Optional accelerator section is validated/discardable and outside causal hash |
| E. Derived caches | Owning organ; host capacity/eviction policy | Can be absent. A miss computes the same answer with the same virtual cognitive charges and order | Omit by default. If retained for faster load, not authoritative and not causally hashed |
| F. Generated/static state | World/content; seed, generator, configuration and numerical version | One shared immutable base; mutated values held by the world; no actor truth aliases | Persist materialized base or exact recipe plus digest and mutations. Hash resolved logical values/identity, not storage packaging |
| G. Checkpoint representation | Kernel coordinates a committed cut across owners | A serializer/manifest, not an extra live world | Contains A/B, references or copies of required C2/F, history head, compatibility manifest; excludes cheap D/E |
| H. Presentation/snapshot state | Presentation/measurement; requested publication/window | Detached bounded DTOs or immutable projection buffers; no writable alias to causal arrays | Outside causal hash. UI state saved separately; measurement records required by science remain retained through C1 |

### Lifecycle rules

Every new schema declares: writer, creation cause, mutation cause, readers, invalidation/version, termination condition, compaction proof, archive fate, and checkpoint role. “Never deleted” is not a sufficient lifecycle; say whether it remains in ordinary scans or becomes addressable backing.

A derived structure must name its complete dependencies. A terrain cache invalidates on relevant world mutation; a personal cache invalidates on delivered personal evidence and relevant self-state, never hidden terrain changes. A cache must not choose a different path, candidate, tie-break, effort charge or wake because it was warm.

Store pins as **owner-scoped references/reasons**, with reverse membership/refcounts where useful. Ending one task removes its pin reason, not another project's or dependant's protection. Report unique pinned records and pin edges separately. Limits on discretionary memory are class P, not cache capacities.

Forgetting is a causal transition governed by salience, recency and use. A UI read cannot count as use. It removes action-accessible detailed beliefs and their target-index entries; it preserves specified posterior contributions, coverage, durable precedent and responsibilities. Archive data never silently repopulates forgotten candidate targets.

## 5. Representation discipline within the seven organs

The goods ledger is a World service; personal routing is a runtime/binder service over Evidence; bodies and ecology are World laws. These are not additional organs. The following matrix is the minimum declaration for each domain.

### 5.1 State and work matrix

In this table, checkpoint means the **continuation payload**, with archive/backing references when necessary. Whole portable exports are separately metered.

| Organ/domain | Hot state | Work per SD or affected operation | Checkpoint | Archive growth | Must not scale automatically with |
| --- | --- | --- | --- | --- | --- |
| Kernel | Valid queue, scope generations, live identity metadata, active parent ordinals, current history commitment | `e log Q` plus touched payload and amortized stale compaction | Queue semantics, clock, keys/ordinals, archive cursor; no routine-history copy | New consequential records and chosen replay journal | `E` per pop/append; all issued IDs in every hash |
| World raster/regions | Shared `O(C)` fields plus mutation state | Local work; declared `ΔC` repair or exceptional global rebuild | Exact base identity plus deltas, or base snapshot | Actual landscape transitions required for history | `N` copies of terrain; `C` per local event |
| Bodies/ecology | `O(N + sites + animals + active work)` anchors and residuals | Closures, actual activity/input boundaries, extraction/contention, spawn/threshold events | Anchors, held inputs, interval integrals, residual hazards | Birth/death/genetics and required outcomes; routine flows aggregated | Elapsed ticks, inactive site sweeps |
| Goods | Located containers plus occupied balances/items and live backing/leases | Touched lots, claimants, ancestor chain, local contention; full current reconciliation at declared checks | Current stock/backing, anchors, sufficient accounting and exact dedup backing | Transfers and consequential claims; routine flow summaries | `S×K` sparse inventories, all old reservations, all transactions per read |
| Evidence | Current beliefs; bounded discretionary state plus `V + Y + M + U + Z` | Delivered facts/footprint and affected indexes; policy eviction of affected subjects | Current epistemic state and future-relevant backing | Consequential original observations and transmissions; optional raw diagnostics | Routine observation count in every view; all geography per review |
| Personal routing | Search frontier `F`, selected path, referenced personal map version | Charged expansions, heap operations, affected personal-region maintenance | Resumable semantic frontier and its pinned map dependencies | Consequential route discoveries/blockages; compressed past paths where needed | Full raster per search; all previous routes on startup |
| Mind | Account state, agenda/method/trial cursors, incumbent, wake state, held-error identity, bounded projects and use summaries | `B + indexed overhead + genuinely affected mandatory records` per review | All future-relevant decision state | Bounded diagnostic trace window plus aggregates; required learned/attempt precedent | `K`, all people, all history or all map cells per wake |
| Task runtime | Current task plus required suspended state, suffix, paid cursors, live authorization spend | Affected dependencies and next operation; separately budgeted repair/routing | Current execution and exact compact retry/purpose records | Completed task facts/prefixes, not execution objects in current table | Number of completed tasks/prefixes per Continue |
| Social protocol | Actual ties, commitments, proposals/messages, memberships, cases, recognition audiences | Due/affected records, delivered recipients and actual interaction density | Open obligations/leases and terms; known projections remain personal | Permanent recognition/household/institution transitions and accountability | Possible pairs; every member’s private state per group action |
| Presentation/measurement | Viewport DTOs, selected lenses, bounded trace display, incremental reducers | Changed/visible entities, requested detail, new metric input; offline queries separately billed | UI/reducer checkpoints separate from causal state | Scientific event snapshots and requested analytical outputs | Whole causal state or lifetime history per frame |

### 5.2 Kernel

Use a mutable binary heap ordered by integer time, phase and semantic key. Generation tokens belong to narrow semantic process scopes, such as motion or a particular lease. Cancelled heap entries may remain briefly, but stale/live counts and compaction scans must be measured. A compaction threshold must bound amortized overhead: do not scan an entire heap on every cancellation merely to discover that it does not need rebuilding. Heapify in linear time when rebuilding. Preserve valid-event order and never emit a causal event solely to compact.

Keep storage handles separate from semantic keys. A monotonically increasing next-handle scalar does not require keeping a hot vector of every historical event key. Preserve parent-local ordinals, uniqueness checks and the ability to reject replayed transactions. Move immutable allocation provenance to keyed backing where appropriate; retain live keys in a direct index. Do not replace an exact collision/duplicate check with a probabilistic filter. A Bloom filter may accelerate negatives only when positives are checked exactly and never cause a false causal rejection.

Event and history ordinals themselves need lifecycle analysis: a long-lived person's counters are small; counters for millions of ended ephemeral parents can grow even after their records are archived. Move the latter with their immutable parent/tombstone, unless a live retry can address them. Never reuse the parent or reset an ordinal to save space.

A history append adds only the new compact payload, advances its commitment, and updates relevant reducers. The accumulated history must not be an input recursively serialized for every new append, ordinary event or snapshot. Bounded trace rings are non-causal; keeping more traces must not increase task-history retention.

Separate three digests: **logical current causal state**, **ordered causal-history commitment**, and **file/chunk integrity checksum**. Their roles differ. Engineering repacking may change file hashes while preserving the first two. At the current scale, compute a full current-state hash at explicit test/save boundaries; do not require a complex incremental hash tree until profiling warrants it. Either approach must omit derived caches and transport packaging without omitting causal summaries.

### 5.3 World, terrain, bodies and ecology

Keep canonical terrain in shared typed arrays. Categorical masks may use exact integer encodings; floating fields keep their certified binary64 values. Do not halve precision merely because a map looks unchanged. Object-per-cell terrain is inappropriate for hot whole-raster fields. Sparse semantic records remain appropriate for sites, animals, structures and work-in-progress.

Generation may traverse the full raster and use global flood/drainage work. This is a one-world initialization cost. A local percept uses spatial buckets plus actual sight/occlusion cells. Distinguish a larger extent at the same cell size from finer resolution: the latter genuinely increases cells intersecting the same sight footprint and is numerical/scenario change, not a free scaling comparison.

Truth regions belong to physical execution/perception. Personal region topology is built only from known connectivity. Version them independently. Global region rebuilding after occasional passability edits is acceptable initially with a named counter; switch to affected-component rebuilding when measured mutation frequency requires it. Merely changing region tessellation can change an approximate corridor path. Such a setting is engineering only if the selected causal path/result remains identical; otherwise it is P/N and requires versioned treatment under §47.7.

Bodies keep analytic anchors and held inputs, representative-interval integrals and residual hazards. Store actual care, practice and positive-time integrals in the child/person's current interval. Archive closed intervals as required; do not replay all feeding or practice events at every closure. Checkpoint the anchor, not a read-materialized replacement anchor.

Resource renewal uses one stock anchor and law parameters per resource, plus current demand and scheduled genuine boundaries. Unused sites do not tick. Animals are finite individuals: per-habitat reserve, keyed spawn recipe and living membership are distinct; dead prey biomass moves once to a carcass. Sparse active work stores progress, consumed inputs, held quality draw and contributor sums. A real increase in animals, sites, contributors or contention is legitimate work; it is not permission to scan all of them for every actor.

### 5.4 Goods ledger

Use a semantic-key container table, a sparse good-to-balance map per container, separate item records, and separate claims/reservations/debts. A balance has one writer and one physical location chain. A reserved amount is a restriction on backing, never another lot that enters conservation totals. Keep historical disputed claims without counting them as spendable stock.

Required indexes as consumers appear: container by key; carried container by actor; active leases by actor and by `(container, good)`; leases by expiry; claims by backing and beneficiary; nested children by parent. Remove terminal leases from **active** indexes when they end. Their audit records may persist. Known balances at remote owned stores belong to Evidence and cannot be refreshed from these truth indexes.

Compile `goodById` once. Hot transactions must not use `goods.find()` over the entire catalogue. Load/capacity checks traverse occupied contents and actual container ancestry; cached subtree load is legal only if every relevant mutation invalidates it and reductions preserve numerical semantics. Detect container cycles without globally traversing unrelated storage.

Maintain accounting sufficient for per-container and global reconciliation: opening/checkpoint balances, sources, sinks and transfers since the reconciled boundary, plus cumulative counters where required. A daily full reconciliation can inspect every current occupied balance as §44.1 requires; it need not rescan every lifetime transaction or every catalogue good for every empty container. Retain an independent archived transaction audit/replay path to detect reducer mistakes. Do not let a single erroneous writer “verify” itself through identically wrong counters alone.

Exactly-once transactions need an exact applied identity or causally closed high-water/interval representation. Global event time alone is insufficient for delayed, reordered or forked requests. Compaction is legal only after proving no valid old request can be mistaken for a new spend. Duplicate checks can use keyed cold backing without granting minds access to it.

### 5.5 Evidence and personal memory

#### Current beliefs are not observation logs

Separate these physical representations under one evidence writer:

- **Current belief slots:** subject/property/context, estimate or category, observation/receipt dates, uncertainty, volatility, provenance references and version.
- **Personal identity and access:** personal handles and private execution capabilities; reverse indexes without exporting world handles. Exact lifetime recognition needed by a law is preserved separately from forgotten actionable place details.
- **Survey/map pages:** coverage and best detection, dated observed geometry and personal topology; no full `Evidence` object for every repeated cell sighting.
- **Inference/precedent state:** posterior parameters, contextual attempts and frustrations, reliability anchors, distinct-credit membership and mandatory history summaries.
- **Cold evidence/provenance:** original consequential facts and transmission lineage, addressed explicitly for accountable updates or analysis, never searched by a mind as a hidden memory.

A single latest record per key is sufficient only when the model defines replacement. It is **not** a general replacement for independent-sample combination, repeated-provenance handling or coexisting contradictory reports in §11.4. A safe API makes the reducer semantics explicit before the first inference consumer uses it.

#### Compact geographic representation

Allocate sparse chunks/pages only when first observed; inside a populated chunk use compact masks/typed fields when occupancy makes that cheaper. Preserve the exact observed terrain, passability, expected speed, date/version and required survey metadata. Unknown cells use absence, not a copy of truth. Store footprint shape/detection once per qualified survey or in losslessly equivalent pages, with references from the cells that still need it. Reclaim superseded unreferenced routine payloads only after all inference, task and provenance dependencies are satisfied.

Maintain best detection **per surveyed property/resource scope**, as §11.4 requires. One undifferentiated terrain-detection scalar cannot stand in for every resource-kind survey once occupancy inference exists. For an overlapping survey, add only `cell area × max(0, new detection − previous best)` to the relevant effective-area statistic. Forgetting a named empty site cannot erase this contribution or rediscover the same site as new posterior evidence.

Coverage and posteriors are not subject to the 32-place cap. `Vᵢ` can reach `C`. Use chunk sharing only for identical epistemic payloads, with copy-on-write and independent dates/versions where they differ. Equality of true terrain is insufficient grounds for sharing a belief.

#### Provenance and exact summary limits

Key a delivered contribution by original observation identity and the applicable version/context, not by delivery ID or just `(subject, property)`. The sequence observation A, independent B, forwarded A must not count A twice or erase B merely because A arrived last. A revised original observation replaces its previous contribution; retransmission preserves original age. Sources' verified-correct/checked counts update only on personally verifiable evidence, once.

For a reducer whose law supports it, keep sufficient weighted sums and normalization anchors instead of all routine samples. For example, a common exponential age factor permits factoring time from weighted log-space sums. This is a design candidate, **not a license to change reduction order**: retain the declared numerical semantics or explicitly version/certify a new reducer. Arbitrary contexts, differing variances, revised provenance and unresolved contradictions may require separate contribution records. Those are genuine necessary state.

An exact membership test for an arbitrary set of previously credited original observations cannot generally use fixed-size memory. Likewise, arbitrary future revision of any previous contribution cannot be supported by one total without identifying the old contribution. Keep compact exact membership/contribution backing where required; promote only affected keys. Probabilistic dedup that drops a new observation or credits an old one is scientifically lossy. The archive can be cold, but any membership consulted by an update is causal backing and belongs in continuation integrity.

#### Bounds, pins and forgetting

The baseline discretionary limits are **32 places, 40 ties, 48 attempts** (§47.4), with 12 routine observations per person/calendar SD. Do not interpret 12 as a cap on directed consequential observations. Pins cover current intentions/projects, liabilities/disputes, dependants/carers, reproductive history, held claims/offices/institutional records and in-use methods (§11.6). More required pins mean real processing burden, not permission to exceed an unmetered cognitive loop.

Eviction removes candidate access and detailed actionable belief. It must preserve the specific durable precedent the specification names: semantic attempt descriptor/outcome/count/last time; required relationship aggregates; coarse negative-region summaries; posterior/coverage; and exact reproductive history where applicable. A remembered partner set or pair cooldown is not discretionary tie detail. Stable rediscovery/accountability must not depend on whether a verbose old belief remained resident.

There is no finite arbitrary cap on all precedent or all repertoire in Revision 4. Treat context and semantic-descriptor growth as `Z`/`M`; use sparse keys and exact summaries. Do not round a decayed nonzero causal value to zero without an authorized numerical/policy rule. Report these dimensions separately from the discretionary plateau.

#### Personal read contract

Provide an immutable logical snapshot **per actual deliberation** using narrow evidence-owned readers or persistent immutable pages. Interface examples are `getBelief(personalKey)`, `knownPlaces(kind, region, cursor, limit)`, `methods(effect, cursor, limit)`, `dueKnownObligations(window, cursor)` and `geography(page/version)`. These are capabilities over personal state, not arbitrary callbacks into the world.

Index maintenance occurs on evidence insertion, meaningful use, eviction or other owned causal transitions. Reading is pure. A snapshot pins the versions it consults so all options share premises; the host may yield without letting another event mutate those premises mid-review. Serialize only selected projections for the UI. A bulk `PersonalView` remains a useful inspector/export, but must not be the hidden mandatory prelude to every reconsideration.

### 5.6 Personal routing

A search retains discovered nodes, heap, closed state, parent links, selected corridor/path and its personal knowledge/prior dependencies. Its cost is `O(F)` plus referenced known geography, not preallocated `O(C)` arrays. Across resumes it can genuinely explore many cells; bounded work per call is not a bound on lifetime frontier memory. Report cumulative search size, compact abandoned optional searches under existing planning semantics, and pause on a technical limit rather than discarding necessary unresolved work.

Do not copy every remembered cell into each new search. Bind to an immutable/versioned personal map page set and retain changed old pages while an active search needs them. At Pack-0 scales a carefully owned version reference plus affected dependency records may suffice. A reconstructed cache must read the same dated page content after restore. Snapshot retention is measurable state; release it when no task/search references it.

Remembered routes are epistemic records, distinct from disposable computed-path caches. Canonicalize genuinely equivalent route records and share immutable path segments; preserve distinct remembered alternatives, blockage/status evidence and required dates. Revision 4 supplies no arbitrary route-memory cap. Count retained path geometry as `Y`; if it grows through actual distinct route knowledge, index it without scanning or copying it on every local query.

Maintain personal regions incrementally or cache by the relevant delivered-geometry version. Refinement visits the selected personal corridor. Exploratory unknown cells use the actor's declared cultural/learned prior with uncertainty. Truth-side components, shortest distances and unseen portals are not valid caches for personal planning.

Cache an exact route/estimate only under its full personal dependency key: endpoint, geometry versions, prior, relevant movement assumptions, algorithm/numerical identity and canonical tie-break. Cache hits must not alter EU consumed or what is considered under the budget. If an algorithm historically stops after a prescribed number of logical expansions, a warm cache must preserve that bounded algorithm's semantics rather than reveal a more complete answer for free.

Reuse heap wrappers across host resumes. Heapifying the full retained frontier on every one-expansion host slice can turn otherwise bounded work into `O(number of slices × frontier size)`. Lazy stale heap entries need measured compaction; skipped entries count as host work even if they are not new semantic cell expansions.

An exhausted known-graph search can prove no path **within that remembered graph and declared search domain**. A failed approximate corridor alone does not prove global disconnection. Exhaustion of a work account proves neither. Preserve these distinct result types.

### 5.7 Mind: protect Pack 0C before it exists

The shared account bounds semantic cognition, not implementation mistakes around it. An `O(K)` scan before charging the first returned candidate still violates §17.3.

**Compile and maintain indexes.** Global content validation/effect/signature compilation may cost `K` once. Each person's repertoire index contains only acquired methods, keyed by produced effect and accepted input-property class. Known targets are indexed by resource/service, personal region and applicable conditions. Trial sources come from perceived property classes, observations, anomalies, suggestions and aspirations. World recipe triggers are separately indexed by operation/property specificity and preserve exact first-match ordering; their existence is not exposed as trial nomination.

**Do not scan an entire posting list to return six candidates.** Maintain deterministic cursors and cheap-order indexes with localized invalidation. A changing context may require charged candidate pre-estimates; when exact “best cheap method” requires examining a genuinely large eligible set, declare and solve that access cost rather than hiding it in an uncharged sort. For each cheap pre-estimate, declare its ranking fields and reverse dependency set: update ordered effect/region postings when those fields change, and keep the least-recently-considered method order separately. Queries can then merge the relevant ordered postings without re-sorting the catalogue. If arbitrary query-dependent scoring prevents an exact bounded best-method retrieval, do not promise constant access or substitute a different shortlist silently: demonstrate the case and resolve the estimator/index contract before merging, using §46.4 if Level III must change. This report identifies no such unavoidable case in the current implementation. Fairness state survives load, expiry and insertion, and guarantees consideration under the specification's finite stable eligible-set condition. It never forces choice.

The baseline provides 24 descriptors, at most six fully compared options including the incumbent, two urgent drives, three offers, two trial candidates, three aspirations, 600 EU per review, 80 EU for safety and 40 EU for repair. It does **not** establish a separate generic fixed “methods per objective” scientific constant: ordinary bounded method admission plus the fairness cursor operates within those existing accounts. A new cap would be P and must not be invented here.

**Bound work per review, not total project depth.** Preserve three retained projects/person, 12 active nodes/project, two alternatives/node, six stored optional branches and 16 node expansions/review. Long serial prerequisites progress through compact milestones across reviews. Completed branches reduce to outcomes/reasons and necessary semantic attempt summaries, not an ever-growing search tree. Genuine commitments and physical progress survive compaction.

**Forecast from one snapshot.** Hold the continuation reference separately with all live obligations. Estimate only changed consequences and the shared premises needed by compared options. Use six base blocks plus up to four inserted meaningful boundaries, the common 3/12/60-SD horizon class and specified completion tails. Do not allocate a world copy or simulate other minds. Held error is keyed by canonical option/epoch/block, applied once to changed consequences. Retain required draws or their exact generating identities and epoch state, not a lifetime table of all discarded hypothetical options.

**Nested calculations share budget.** EVSI's three outcome classes and option-capital binder calls debit the caller's account; hypothetical branches are small belief overlays. They cannot acquire targets, reserve goods, update real memory or mint another account. Capital estimates use one differential service ledger and a bounded personal service-use summary, including credible cold-start opportunities and aspirations. Do not keep one valuation cache for every global good. Double-counted output or “free cached EU” is not an optimisation.

**Wake and trace discipline.** Coalesce causes at one timestamp, persist threshold armed state/signatures, keep the 2-SD staggered epoch and eight ordinary reviews/person/SD, and preserve safety semantics. Continue does not deliberate. A newly selected route computation is an explicit charged phase, not a route search hidden inside cheap Continue. A compact diagnostic record describes admitted/deferred items, reference, comparisons, winner, evidence and envelope. Its display retention is engineering; necessary cursors, spend and precedent remain causal independently of the trace.

**Reflective work is ordinary cognitive work.** Reconsidering a method, livelihood, knowledge question or project is an objective through the same agenda/account. There is no background reflective controller that scans all unused recipes or all old failures.

### 5.8 Task runtime

Use direct `currentTaskByActor`, `taskById` for retained tasks, and an indexed set/queue of actively routing tasks. Ordinary access must not copy/reverse/search a global historical array. One person executes one interval at a time. Preserve required suspended intention state for safety/maintenance under the common lifecycle; “one current task” must not delete a suspended purpose mandated by §16.6.

Keep the ordered bounded suffix, current operation's total settled amount, paid-through cursor, binding revision, dependency versions, reservation references, current route state and world progress references. Closed paid prefixes move to history/reducers once all current interval and retry checks have sufficient state. `start()` and `resume()` read an accumulated per-step settled total, not a filter over lifetime prefixes. Each calendar/representative interval keeps exactly the accumulators still needed by its law; their boundaries are different and must not be conflated.

Archive terminal task objects; retain compact semantic authorization records with original descriptor, authorized/spent time and goods, completion status and necessary binding/step history. A retried purpose must locate that record by exact key. Do not use an LRU TTL to renew spend. New genuine selection authority belongs to the mind under the model, not a new task ID. If exact old retry validation needs growing backing, classify it as `Z` and use indexed cold storage; the active task table must still plateau.

Physical work-in-progress belongs to World. Runtime `progress` is references/sufficient current facts, not a second owned stock or a permanent duplicate of all past output. Repair retains sunk cost, goods and semantic identity, observes its allowance and escalates changes of meaning. Budget/lease expiry and abandonment have separate lifetimes from obligations.

### 5.9 Social protocol, relationships and institutions

Keep directed ties only when actual evidence/relations create them. Store lazy decay anchors, sparse dated performance samples and specified permanent precedent. The 40 discretionary-tie bound does not apply to mandatory counterparties, carers or institutional roles. Pair kin classification is computed only for a relevant adult pair, using depth-three shared and depth-six direct ancestry (§30.4), and cached sparsely. This bounded pedigree query is not an all-pairs kin table.

Index obligations by due time and affected party/project/backing. Recurring terms keep their schedule and next occurrence; never pre-expand an infinite future calendar. Actual due conflicts and deliveries are processed, not every obligation at every review. A person with many affected obligations has real cost, and unmet duties remain real.

Proposals retain exact versions, assents, leases and expiries. Messages retain original provenance, channel, sender/recipient and physical delivery status. Closed routine envelopes can compact; breaches, continuing duties and accountability cannot vanish with their task. A physical messenger is a person/task, not a global notification broadcast.

Groups and institutions are sparse memberships, role holdings, acceptance/recognition edges, assets, liabilities and due cases. Do not instantiate every potential member pair. An audience of size `m` costs at least its actual delivery/recognition work; a record existing does not notify `N` people. Institutions have no mind. A successor's projection is acquired through paid handover/reports, not copying the predecessor's private knowledge or installing the entire truth record.

### 5.10 Presentation and measurement

Publish a detached projection at committed boundaries. Default world packets carry changed actor/stock/structure records and required motion anchors; terrain transmits once then changed chunks. Selected-person detail is requested separately. A bounded complete current-entity snapshot can remain acceptable at small `N`, but never includes every personal map, task prefix and old reservation by default.

The renderer interpolates paid motion anchors without requesting causal updates for each sprite/frame. Dropped or delayed frames may drop projection work, not causal events. Do not freeze or deep-clone authoritative state; selectively copy DTO fields or use buffers owned by the projection. Never transfer a typed-array buffer that remains authoritative in the worker.

Run scientific metric reducers on committed event facts independently of display publication, so throttling cannot miss births, care or obligations. Keep fixed-size/windowed summaries where sufficient; write immutable event-time snapshots and pedigree/genetic records required by §38. An analyst's long-history query is an explicitly metered offline/on-demand scan, not routine simulation work. Exact cohort quantiles/lineage analyses may require archived rows; do not silently substitute lossy sketches for required exact metrics.

## 6. Causal budgets versus engineering budgets

### 6.1 Classification by effect

| Quantity | Classification and meaning | Exhaustion/completion |
| --- | --- | --- |
| Simulated elapsed time | Paid time in integer quanta under laws; not CPU runtime | Settle actual elapsed work at genuine boundaries |
| Actor-authorized time/goods/exposure | Causal envelope and semantic spend | Stop/escalate under its terms; do not renew on retry |
| Review, repair, attention, memory and agenda limits | P; route unit accounting and block/rounding semantics N | Record causal deferral/selection according to §17 |
| Logical route expansions charged to cognition | N cost of one EU per 64 cell expansions, within the applicable causal account | Save incomplete frontier; no unreachability claim |
| Host expansion slice | E only when it partitions the same admitted logical work | Yield and resume without time, belief, task failure or new causal identities |
| Cache capacity/eviction | E only if cold and warm execution make the same semantic computation and charges | Recompute the same result; no changed candidate availability |
| Worker yield, serialization batch, output cadence | E | Host scheduling/transport only; preserve committed causal cut |
| Technical memory/disk/queue ceiling | Capacity boundary, not actor policy | Pause, preserve continuation, report capacity; never erase duty or suppress life |
| Approximate search beam, different corridor or earlier result acceptance | P/N if it can change route, consideration or outcome | Version explicitly; cannot masquerade as host tuning |

A bound is not engineering because it is measured in expansions rather than SD. The test is whether changing it changes causal history under identical C/S/P/N inputs. Conversely, no arbitrary conversion of EU to biological elapsed time is introduced here: §17 defines cognitive accounting; paid operations advance time through their laws.

### 6.2 Three distinct unresolved states

1. **Host yield:** more of the already admitted computation remains. The actor has not failed or learned anything. Resume at the same causal point before admitting later causal work that would change the computation's premises. UI may display “computing” outside personal state.
2. **Causal account exhaustion:** the actor's authorized cognitive work is spent. Return computationally deferred under the mind/runtime contract; preserve frontier, assumptions, account debit and wake/reopening state. A later legitimate review/repair may authorize more. Renaming a task or a host resume cannot open an account.
3. **Technical resource exhaustion:** the host cannot continue safely. Pause the world at a continuation-sufficient boundary. If computation is unfinished, persist that pending continuation or restart it deterministically from a saved committed base without publishing partial effects. Do not let later events run while merely dropping the blocked host job.

No case proves physical impossibility. A true exhaustion of the declared known search graph is a fourth, epistemic result, and must name its assumptions.

### 6.3 Pack-0A archetype and current residual risk

Pack 0A once advanced simulated time to schedule additional route CPU work. Corrected code drains/resumes the same computation without a route continuation event, preserving launch order and simulated start time. Keep that fix.

Pack 0B correctly separates host slice size from a total “computation” boundary, but `TaskRuntime.resumeRouting()` converts the latter into `block()`, which records a repair-required transition. A 1-versus-65,536 **slice** test proves only slice invariance. It does not prove that the total 4,096 cutoff is E, nor that future cognition can resume it under the required account. `continuePersonalComputation()` currently renews the low-level computation range; it is not a causal authorization ledger.

For pre-0C integration, expose a low-level resumable iterator and return logical expansion counts. Attach it to the existing P/N effort semantics at the mind/authorized-repair boundary. A host ceiling yields beneath that layer, and cannot call the causal block/repair path. Do not “fix” the issue by retaining arbitrary free expansion grants or by inventing a new scientific route budget. This is an implementation conformance correction, not an unavoidable architecture contradiction.

### 6.4 Standard invariance test

From the same committed checkpoint and causal inputs, execute with host slices `{1, small, 65536}`, cold/warm/zero optional caches, varied yielding, interrupted serialization, delayed frames and headless/browser hosts in a certified profile. Keep the same logical account, candidate order and comparison result.

Assert equality of:

- committed causal state and history, including start times and paid cursors;
- personal versions, views, wakes and deferrals;
- selected bindings/envelopes and original semantic spend;
- logical expansions/EU, held outcomes and relevant queue ordering;
- resumed frontier/result after a mid-search save.

Permit differences only in host resumes, elapsed wall time, transport bytes, cache hits, allocation counts and observer counters. If the logical bounded computation intentionally differs because P/N changed, label a sensitivity experiment rather than declaring an E failure. Separately test E **total cutoffs** and cache hits; comparing slice sizes alone misses them.

## 7. Long-run checkpoint, archive and save/load strategy

### 7.1 Decision: hybrid portable base plus exact deltas

**Use a hybrid design.** Keep human-readable JSON checkpoints during the small Pack-0 development slices while exposing their byte categories. Before the architectural proof, separate live continuation from growing journals. Introduce exact binary typed-array world sections when measured full-terrain JSON cost justifies the narrow serializer. Support a seed/version regeneration path as an optimization, but retain a portable lossless world base as the default durable export/fallback. Do not depend solely on seed+delta.

Reasons:

- Terrain is reproducible only with the exact generator, content/configuration, numerical profile and code behavior. A seed alone is not a world.
- Generation has nontrivial global cost; making every quick resume regenerate the world may trade smaller saves for slow load.
- Mutation density can approach `C`; an ever-longer mutation event list is not a compact current-world representation.
- Binary arrays preserve exact scalar values and avoid decimal-number JSON expansion; they do not require a database, WASM or a new simulation architecture.
- A portable materialized base keeps old results inspectable when an old generator cannot run. Exact replay still needs its compatible engine/profile; portable bytes do not imply cross-version causal compatibility.

Store base identity, dimensions, units, endianness, field types, generator/source/content/configuration/numerical hashes and a digest of resolved fields. The delta is the **latest current override per changed field/cell**, with appropriate deletion/tombstone semantics, not every previous edit. Keep required terrain transition history separately. A periodic engineering rebase writes the current fields as a new base and empties deltas at a committed boundary; old checkpoints continue to reference their own bases. Rebase cannot change observed personal maps, mutation epochs or logical terrain identity.

Changing encoding is E only when decoded values, ordering, algorithm results and continuation remain exact. Recomputing derived drainage/regions must reproduce the required current law state; if a supposedly generated field has been independently mutated or is used with a different update history, persist it rather than pretending regeneration suffices.

### 7.2 Storage layers

| Layer | Representation | Retention and access |
| --- | --- | --- |
| Hot continuation | Mutable owned tables/arrays; current analytic anchors, tasks, beliefs, obligations and active world objects | Ordinary event access, no lifetime replay |
| Cold causal backing | Compact exact keyed records for pedigree, required provenance/partner sets, semantic retries, durable precedent | Direct lookup for a specific legitimate cause; bounded resident cache; preserved across saves |
| Consequential history | Ordered append-only chunks, one canonical record schema per fact family, stable semantic IDs | Permanent records required by §§6.5/38; indexed by subject/time/event kind for analysts |
| Routine-flow summaries | Per interval/container/person/law sums and sufficient descriptors in declared deterministic order | Preserve scientific required attribution/integrals; optional raw drill-down in journal |
| Replay inputs/journal | Seed/profile/build plus external commands/interventions and verification checkpoints; optional detailed event transcript | Replay from compatible base/input sequence; consequences are not necessarily sufficient as an input journal |
| Compact checkpoint | Manifest + current owned state + required backing roots + archive head + world base/deltas | Every 12 SD by §47.7 default and explicit saves at committed boundaries |
| Projection/metrics | Bounded display buffers; reducers and required event-time measurement snapshots | Separate observer save; historical analysis reads archives, not display caches |

Only optional raw diagnostics may be discarded under a trace policy. “Optional archival chunks” means optional detailed traces or optional packaging/export choices, **not** optional retention of births, deaths, true parents, recognitions, care, estates, ownership/control transitions, institution history or required alleles. Compression is lossless for retained source records. A history digest is an integrity witness, not a substitute for the records.

A periodic checkpoint can reference immutable earlier chunks without recopying them. A portable save bundles or resolves every required dependency, with a declared list of optional analysis data. If it cannot obtain mandatory backing, it cannot promise exact continuation. Keeping every checkpoint forever also costs `number of checkpoints × live-state size` unless shared immutable sections/deltas or a declared retention policy reduce duplication. A rolling window is not deletion of required history or explicit user saves.

### 7.3 Minimal Pack-0 implementation path

Start with plain in-memory append segments, a small manifest and host-owned append/read adapters in the existing runners. The pure core emits owned facts/checkpoint data and consumes validated restore data; it does not import filesystem/database/clock APIs. Node and browser can use different host storage mechanisms with the same logical format and continuation. This is not speculative distributed storage.

For Pack 0, JSON remains appropriate for configuration, content, manifests, sparse records and diagnostics. Compact array/binary sections are appropriate for dense terrain and, later, high-volume immutable records where actual bytes justify them. Keep a lossless JSON inspection/export tool and schema documentation. Do not build a generic database query language or migrate hot person columns solely for stylistic uniformity.

### 7.4 Checkpoint protocol

1. Choose a fully committed causal boundary. Finish the timestamp's phases; do not publish a partially settled world.
2. Capture a consistent continuation: clock, valid queue semantics, scope generations, semantic ordinals, current physical/epistemic/decision state, pending host computation needed to resume, exact backing dependencies and history head. Preserve anchors, not newly materialized law states.
3. Seal immutable archive sections and encode current sections once. Batching may pause the owner or use immutable versioned pages; it may not serialize a mix of two times.
4. Write blobs/chunks, verify lengths/checksums, then publish the manifest last. An interrupted write leaves the previous checkpoint valid.
5. Validate model/schema/source/content/RNG/numerical/runtime/generator identities; validate conservation, references, time ledgers, reservations, versions and spent totals before resuming.
6. Rebuild derived indexes deterministically. If an optional cache fails verification, discard it, not its source state.
7. Resume under the same certified profile and compare a subsequent event window with uninterrupted execution. Unsupported compatibility is rejected or explicitly migrated/forked; no fabricated historical facts.

Do not assume `JSON.stringify().length` is UTF-8 bytes. Use actual encoded bytes, and separately report transient serializer peak memory, retained heap/RSS, allocated/copied bytes and load time.

### 7.5 Genealogy, reproduction and memory across generations

Archive a compact immutable person node with true parents, both alleles of all seven factors, markers, birth/death data and required measurement snapshots. Keep enough exact indexed ancestry backing for the kin law's bounded-depth queries; never retain every dead person's hot body, tasks and whole private map merely to answer a pedigree query.

Durable F partner sets, last pair-completion times, established household episode counts/frictions and causal care/recognition records remain accessible while needed. Decaying encounter satiation can use its exact law-supported accumulator, but the distinct-partner set cannot be replaced by a mere count when later repeat/new status matters. An estate retains liabilities and recognized heirs independently of the dead actor's cognition. Required social accountability survives the death or task termination that generated it.

This yields small current execution state and growing **compact** historical/causal backing. It cannot yield bounded total storage for an unbounded number of births, distinct partners and institutional transitions without losing required information. Pause before exhausting technical capacity; never silently approximate those records.

## 8. Growth-shape benchmark and regression suite

### 8.1 Measurement rules

Measure both **semantic work** and **implementation work**. EU alone cannot detect a full-map clone performed before a charged retrieval. Add counters at actual loops/allocation boundaries:

- valid/stale queue size, pushes/pops, generation scopes, compaction entries scanned;
- events, reviews by tier/cause/drop reason, EU by class, candidates returned **and visited**, bindings, forecast blocks, outcome classes;
- local buckets/candidates, visibility cells/rays, actual contacts/recipients;
- terrain bytes, remembered cells/pages, geometry rebuild cells, route nodes/heap entries/pushes/pops/stale pops and heapifications;
- current/terminal tasks, paid-prefix rows visited, active semantic spend and cold retry records;
- discretionary and pinned records/edges, distinct provenance membership, survey references, known methods, precedent contexts;
- active/terminal reservations, touched balances, transaction-history rows visited, content lookup entries visited;
- live-state, archive, generated base, delta, index/cache and projection bytes; copied/serialized bytes; peak allocation;
- observer requests, published entities, selected lenses, full hashes and hash input bytes.

Counters are non-causal, never draw randomness and never select behavior. Record source/configuration hashes, seed, machine, runtime/profile, warmup, repetitions, density, starting/ending population, births/deaths, living exposure and actual workload. Fixed-density scaling and crowded scaling are separate fixtures. Count zero **for implemented absent work**; unimplemented cognitive/social mechanisms are “not yet modelled,” not measured zeros proving cheap mature behavior.

### 8.2 Standard probe matrix

Acceptance below is structural. Exact deterministic counts are preferred where the controlled fixture warrants them; do not invent a universal millisecond threshold beyond §40.5.

| Axis / controlled fixture | Counters and expected shape | Acceptance / failure signal |
| --- | --- | --- |
| Population: 8 → 32 → 96 → 400 | Tile/extend independent local neighborhoods at fixed density, same local opportunities; record `e`, `L`, `o`, `r`, `W`, `X` | Work per matched local cause stays stable apart from declared index/heap overhead; no pairs or global-list visits. World initialization reported separately |
| World extent at fixed local situation | Same cell size, focal observed geometry, prior, local entities/target and search work; add only distant extent | No per-person allocation proportional to new `C`; local percept/read/candidate counts unchanged. Shared raster initialization/save may grow |
| Remembered geography | Give the focal actor larger legitimately observed distant maps while holding local question fixed | Ordinary belief/agenda lookup visits only its index results. Personal topology rebuild/copy count does not equal all `Vᵢ` per read. A deliberate whole-map export may |
| Historical time | Run repeated paid local work at SD checkpoints such as 1/12/120; fixed geography/duties/content; separately compare identical current state with different archived histories | Discretionary state plateaus; current task/interval state plateaus; cost per Continue and read independent of completed episodes. `H`/required `Z` growth separately allowed |
| Content catalogue | Baseline, +100 unused goods/recipes/templates, and 10× irrelevant catalogue as §43 P5 requires | Same personal repertoire, candidate choices, logical EU, relevant retrieval/trigger visits and physical behavior; only initialization/global content metadata differs |
| Relevant repertoire | More genuinely learned methods in same effect class | Fairness still reaches every eligible method under finite stable conditions; bounded comparisons, no hidden full-list presort per wake; no content-specific exclusion |
| Local density | Hold global `N` fixed, spread versus crowded; count local candidates, qualified visibility and actual obligations/contacts | Increased cost attributable to `L`, actual affected records and visibility. No automatic all-pairs conversation/attraction table; preserve consequential observations |
| Obligations/pins | Add distant unrelated obligations, then add genuinely due focal obligations/pins | Unrelated records do not enter focal processing; affected work scales honestly. All pins/duties survive; capacity pause if necessary |
| Route resume | Same search with slices 1/large, near/far targets, unresolved barrier, growing already-seen geography | Same logical result/EU; no full-raster per-route arrays; frontier allocation follows discovered work; no repeated full heapify per tiny slice |
| Checkpoint decomposition | Save with growing `C`, `N`, active tasks, `V`, archive history and mutations varied separately | Byte components explain growth; no full archive in every rolling continuation; no redundant derived fields; exact active-state round trip |
| Observer/projector | No observer; selected lens; all lenses explicitly requested; delayed frames; varied snapshot cadence | Same causal history; no default all-person map export; projection bytes depend on requested/changed data, not `H` |
| Archive/cache/chunking | Cold/warm caches, small/large chunks, rebase or compressed/plain packaging | Same canonical logical state/history and continuation. I/O count may change; actor evidence/time cannot |
| Semantic replay/compaction | Retry same purpose under new labels after archive compaction and reload; duplicate report A/B/A; closed reservation lookup | No renewed spend, duplicate credit, paid-prefix replay, forgotten duty or changed original observation age |

For local and population fixtures, isolate geometry effects. Enlarging a procedurally generated world can change drainage and local geography; simply using the same seed at another size does not guarantee the same local situation. Use an explicitly controlled diagnostic fixture or prove its focal equivalence. Population scaling at fixed density may require a larger configured world; report the `C` term separately. Such probes supplement, never replace, the canonical-world gate.

For irrelevant-content tests, whole-run hashes may include the intentionally changed content/configuration identity. Compare the focal logical history/decisions after accounting for that declared input metadata; demand exact equality of unchanged choices, personal knowledge and relevant work. Adding **relevant** physical possibilities is not an irrelevant-content test.

### 8.3 Concrete pass assertions

- With fixed current local beliefs and no added pins, retain no more than 32 discretionary places, 40 discretionary ties and 48 discretionary attempts when those modules exist. Check the **number of places**, not the number of property records. Expected archive growth is not a memory-policy failure.
- With 256 closed episodes and zero current tasks, `currentTaskByActor` has no completed execution objects. A retry may consult its exact compact semantic record, but an unrelated Continue visits zero prior episodes.
- After adding unrelated records, assert `candidateEntriesVisited`, `worldCellsReadByMind`, `terminalTaskRowsVisited` and `archivedTransactionRowsVisited` stay at their expected controlled values. Do not rely solely on elapsed time ratios.
- Perturb UI cadence/cache capacity/host slices; all causal results remain equal. Test total engineering-limit exhaustion separately from host slicing.
- Repeated same-provenance delivery is inert even after intervening independent evidence; forgetting and restore do not create duplicate success credit or fresh occupancy optimism.
- Query current active backing after many closed leases; active-reservation scan length follows current leases, not their lifetime count.
- Scale checkpoint sections independently and report changes. A deliberate full archive export is allowed to grow linearly with `H`, but an ordinary current-state hash/read is not.

### 8.4 Wall-clock gates retained from §40.5

| Workload | Median per SD | 95th percentile per SD |
| --- | ---: | ---: |
| Tens of people | 15 ms | 30 ms |
| 96 with dependants and obligations | 120 ms | 250 ms |
| 400 with logistics and conflict | 500 ms | 1,000 ms |

These provisional engineering targets require a named reference machine and representative causal workload before becoming a pass criterion. Retain 30–60 FPS normal view and sustained 10× playback goals for representative mature worlds. A short diagnostic without cognition or obligations cannot certify the mature target, even when it is faster. Run cheap structural regressions per relevant PR, bounded multi-axis probes at foundation boundaries, P6 at the Adoption Gate, and later workload-specific tests as the real laws arrive. Do not run a new multi-generation campaign for a simple index change.

## 9. Mandatory PR complexity contract

Paste the following into every substantial implementation PR. Fill one row per new or materially changed subsystem. A blank or “small” entry is not a declaration. Use the existing §41 extension answers rather than a second architecture essay.

```markdown
### Computational/state contract (Revision 4.0 subordinate)

Workload and commit/configuration: …
| Subsystem / owner | Hot state | Work per SD / event / review | Continuation bytes | Archive/backing growth |
| --- | --- | --- | --- | --- |
| … | O(…); current cardinalities … | O(…); touched records … | O(…) | O(…); required retention … |

- Growth drivers: N / C / local density / K / V / O / elapsed history; distinguish actual affected records from possible records.
- Lifecycle/bounds: creation → updates → pin/evict/compact → terminal/archive; cite P/N values; explain irreducible growth and capacity pause.
- Indexes/caches: lookup keys, update/invalidation writer, cold/warm equivalence, rebuild cost, duplication and maximum retained working set.
- Dense/worst case: …; no ordinary-loop scan of …
- Causality: engineering parameters changed …; can any alter candidates, EU, time, knowledge, ordering or outcomes? If yes, classify/version as P/N/S rather than E.
- Persistence: anchors, paid/retry spend, held draws, provenance, required backing and migration/rejection behavior; no lost accountability.
- Probes: exact fixtures/axes, before → after counters and byte categories; machine/timing if measured; tests not run and why.
- Evidence: implemented / locally tested / CI receipt / visually inspected / scientifically investigated / deferred, stated separately.
```

A representation-only PR should preserve causal logical behavior and describe any source/hash-format change explicitly. A law/content PR may legitimately change outcomes; it still owes the growth declaration and invariant tests. Changes to Level III follow §46.4; this template cannot grant an exemption.

## 10. Forbidden-pattern catalogue

“Forbidden” means the unjustified form described, not a ban on genuine dense causal workloads or explicit offline exports.

| Pattern | Preferred alternative / proof obligation |
| --- | --- |
| Full-world arrays per agent/search allocated regardless of observations | Shared truth arrays; sparse/chunked personal state; discovered frontier only |
| Routine lifetime evidence log in hot cognition | Current belief reducer + required provenance/precedent backing + cold archive |
| Full history copy/hash on append | Append one record; streaming history commitment; explicit current-state hash boundaries |
| Potential-pair tables/scans for ties, attraction, kin or collisions | Actual directed ties, local spatial candidates, relevant-pair pedigree queries |
| Mind scans world for sources or counterparties | Personal target/method indexes and legitimate evidence |
| All catalogue entries checked at each wake | Compiled indexes and personal repertoire postings with bounded charged retrieval |
| `return first k` after an unbounded scan/sort | Deterministic indexed order/cursor, incremental eligibility updates, explicit access counters |
| Recursive recipe/supplier/coalition enumeration | Bounded persistent frontier and shared effort account; no lifetime tree growth |
| Nested estimators opening fresh budgets | Caller-owned account passed through EVSI, capital, routes and counterparty estimates |
| World clones or simulated other minds in forecasting | Small shared belief snapshot, typed consequences, bounded hypothetical overlays |
| Full causal-state clone/freeze for presentation | Detached selected DTOs/deltas, immutable projection-owned buffers |
| All personal lenses embedded in every ordinary frame packet | Selected lens on demand; explicit all-lens analyst export separately metered |
| JSON encode/decode used as routine hot copy primitive | Typed record construction, immutable pages, direct owned mutation and narrow projection |
| Multiple independently authoritative quantities | Ledger stock once, claims/reservations/debts referencing backing |
| Cache residency changes route, shortlist, EU, or knowledge | Semantically identical cold/warm computation and charges; otherwise classify policy |
| Host work advances simulated time or emits personal failure | Host-only yield at unchanged causal point; causal-account exhaustion handled separately |
| Fixed engineering cutoff silently truncates cognition | Preserve admitted computation or explicit P/N deferral; technical exhaustion pauses |
| One persistence/controller per behavior | Generic intention/envelope/task with typed operation and law state |
| Content callbacks select people, score options or query truth | Declarative typed content plus narrow law adapters; mechanical lint |
| Linear global entity/task/storage search in ordinary access | Direct primary/reverse index under the state owner |
| Current stock/reservation query scans lifetime transactions/leases | Active backing index; current accounting reducers; archived forensic replay |
| Every finished paid prefix retained as execution input | Current operation paid total + cursor + interval accumulators + exact retry summary |
| Derived indexes serialized as authoritative by default | Rebuild; optional verified accelerator section outside causal hash |
| Same observation independently grows evidence, history, map and view logs | One original record/payload, explicit references, sufficient reducers, bounded projections |
| Cloning total remembered map into every selected route | Pinned immutable personal map version/pages and sparse frontier |
| Cache/trace eviction deletes causal belief or semantic spend | Separate class-E working set from class-P memory and mandatory backing |
| Fixed planner-depth cutoff | Bounded work/frontier per review, arbitrarily long serial progress across reviews |
| “Expired” treated as “unaccountable” | Drop freshness/active index membership, retain required liability/provenance |
| Every issued ID permanently duplicated in hot arrays and sets | Live uniqueness index plus exact archived issuance/parent-ordinal discipline |
| Checkpoint regeneration silently uses today's generator | Version-pinned exact base or reject/explicitly migrate; portable base fallback |
| Float quantization/changed reduction order sold as storage-only change | Lossless encoding or explicit N change and numerical conformance |
| Preserving speed by shrinking world/population, skipping bodies or removing uncertainty | Correct representation/algorithm; report irreducible load or capacity pause |

## 11. Current ESS-V4 repository audit

### 11.1 Method and source pins

The audit read the supplied prompt, Revision 4.0, the supplied STATUS, repository authority file, relevant source and tests, current STATUS, Pack-0A receipt, and Pack-0B performance receipt. The repository was inspected in a detached local checkout of the exact draft head. A diff against merged main confirmed that the kernel, identity, terrain and truth-route implementations discussed below are inherited unchanged from Pack 0A; the goods diff adds the own-custody execution basis.

Primary repository references:

- [Accepted Pack-0A tree](https://github.com/adibadonia-creator/ESS-V4/tree/2933d30868ad5ae202f90d7ecf2df6979b662af4).
- [Inspected Pack-0B tree](https://github.com/adibadonia-creator/ESS-V4/tree/f8c671cf5057ce33cfbb0e66396a3ab2426ec9e6).
- [Current STATUS](https://github.com/adibadonia-creator/ESS-V4/blob/f8c671cf5057ce33cfbb0e66396a3ab2426ec9e6/docs/STATUS.md), [Pack-0A receipt](https://github.com/adibadonia-creator/ESS-V4/blob/f8c671cf5057ce33cfbb0e66396a3ab2426ec9e6/docs/PACK0A.md), [raw Pack-0B benchmark](https://github.com/adibadonia-creator/ESS-V4/blob/f8c671cf5057ce33cfbb0e66396a3ab2426ec9e6/docs/pack0b-benchmark.json).
- [Memory correction tests](https://github.com/adibadonia-creator/ESS-V4/blob/f8c671cf5057ce33cfbb0e66396a3ab2426ec9e6/tests/memory-correction.test.ts) and [evidence/runtime tests](https://github.com/adibadonia-creator/ESS-V4/blob/f8c671cf5057ce33cfbb0e66396a3ab2426ec9e6/tests/evidence-runtime.test.ts).

Source paths and symbol names below refer to this pinned tree. The observations distinguish implemented foundations from incomplete future semantics. No claim that absent physiology, full posterior inference or social reports “fail” their future production tests is made.

### 11.2 Disposition by subsystem

| Subsystem and source | Observed representation / cost | Disposition and action |
| --- | --- | --- |
| Terrain: `src/world/terrain.ts:Terrain, generateTerrain` | Shared typed arrays: kind/passable/opaque bytes, Float64 fields and Int32 drainage. Generation uses global field/flood work. No actor terrain copy | **GOOD AS FOUNDATION.** Keep causal raster/numerics. Generation is `C`-dependent by design |
| Truth regions/mutations: `terrain.ts:buildRegions`, `simulation.ts` terrain mutation path | Derived regional graph; global rebuild after relevant edits; affected movement dependencies narrow | **GOOD WITH LOCAL OPTIMISATION.** Count rebuilds/changed cells; incremental components only if frequency warrants it |
| Truth routing: `src/world/routing.ts:SearchState, heapFor` | Sparse node dictionaries, heaps and corridor; region/heap/corridor caches; no full-raster arrays per search | **GOOD AS FOUNDATION.** Preserve separation from minds and host-slice invariant |
| Local perception: `world/perception.ts:visibleTerrain`, `world/spatial.ts:SpatialIndex` | Sight-window raster traversal and local spatial buckets, swept circle/geometry boundaries | **GOOD AS FOUNDATION.** Keep physical detection/occlusion. Ray/candidate allocation is **DEFER UNTIL PROFILED**, without weakening perception |
| Kernel event heap: `kernel/kernel.ts:advance, invalidate`, `kernel/heap.ts` | Mutable ordered heap and narrow generations. `invalidate()` filters the entire heap whenever size exceeds 256, even if no compaction follows; rebuild reinserts valid entries | **GOOD WITH LOCAL OPTIMISATION.** Preserve mechanism; before proof, meter stale scans and avoid repeated `O(Q)` invalidation scans under cancellation load |
| History and identity: `kernel/kernel.ts:record`, `kernel/identity.ts:allocate` | Append is local and advances a rolling digest. Whole history stays resident; every allocation key is retained both in `ids.keys` and `used`; parent ordinal tables also persist | **REFACTOR BEFORE PACK-0 PROOF.** Preserve append/key semantics; separate archive and exact issuance backing. No evidence of copy-on-append, so do not rewrite the event heap/history API wholesale |
| Goods core: `world/goods.ts:GoodsLedger` | Keyed container/reservation maps, sparse stocks and nested-child index. Single writer and finite backing. Claims/debts and full later laws are deferred | **GOOD AS FOUNDATION.** Add future goods meanings through this ledger, not parallel quantities |
| Goods active queries: `goods.ts:indexReservation, reserved, good`; `simulation.ts:exactSelf` | `held` retains terminal leases; `reserved()` traverses them. `exactSelf()` filters all reservations for one actor. `good()` scans global goods by ID | **REFACTOR BEFORE PACK 0C** for active actor/lot indexes and compiled good lookup consumed by personal exact-self/binding. Archive disposition follows proof gate; do not erase lease accountability |
| Goods reconciliation/transaction archive: `goods.ts:reconciliation, validate` | Replays every transaction, then loops every container × every content good. `seen` grows with transactions; prepared-write revision uses transaction-array length | **REFACTOR BEFORE PACK-0 PROOF.** Current balances/accounting checkpoint plus journal and exact dedup; independent monotone revision counter before moving transaction chunks |
| Current place evidence: `evidence/service.ts:deliver, enforceMemory` | One current record per belief key, bounded discretionary places, scoped pins, compact regional forgetting precedent; old current values replaced | **GOOD AS FOUNDATION for the current direct-evidence slice.** Preserve correction. Do not claim it implements §11.4 multi-sample/report inference |
| Evidence access/pinning indexes: `handle, subjectFor, deliver, isPinned` | Reverse-link lookup scans keys; replacement uses `findIndex`; pin tests repeatedly scan records/pin arrays and parse belief keys | **GOOD WITH LOCAL OPTIMISATION**, included in pre-0C narrow-read work where encountered. Required pins can grow, so “only 32 places” cannot justify every scan |
| Personal map: `PersonEvidence.cells, coverage, mapObservations` | Sparse object maps; shared survey metadata reference counts; coverage retained; no permanent verbose Evidence per cell | **GOOD WITH LOCAL OPTIMISATION.** Keep semantics. Typed chunk conversion is optional until measured; property-specific coverage/inference must arrive with its first cognitive consumer |
| Full personal projection: `EvidenceService.view` | Copies/sorts all `Vᵢ`, rebuilds connected personal regions, clones evidence, constructs multiple record lists, then clones entire result | **REFACTOR BEFORE PACK 0C.** Keep bulk inspector; add indexed immutable cognitive reads and cached/incremental geometry versions. No bulk map construction before every review |
| Personal search: `runtime/routing.ts:beginPersonalSearch, resumePersonalSearch` | Sparse frontier, but copies/indexes all known cells and region membership per search; creates/heapifies wrappers on every resume | **REFACTOR BEFORE PACK 0C** at its map/account interface. Reuse pinned personal map version and heap wrapper; preserve traversal prior and epistemic corridor rules |
| Personal route computation cutoff: same file; `runtime.ts:resumeRouting, block` | Hard total boundary from `ROUTE_ENGINEERING`, persisted in search; exhaustion becomes task blockage and causal history | **REFACTOR BEFORE PACK 0C.** Separate pure host yield from P/N effort-account deferral. Existing slice tests do not resolve classification |
| Runtime execution model: `runtime/types.ts:Task`, `runtime.ts:installBoundRepair` | Generic selected-intention task, max 12 steps, cumulative semantic budgets, reservations, paid prefixes and retained repair revision | **GOOD AS FOUNDATION.** Preserve authorization, repair and exactly-once semantics; no new behavior-specific runtime |
| Runtime state lifecycle: `runtime.ts:task, select, start, resume, activity, projection` | Completed tasks retained with `push`; copies/reverses whole task table; filters old prefixes to recover current spend; old totals, progress and budgets persist | **REFACTOR BEFORE PACK 0C.** Current task and per-step paid summaries, indexed semantic backing, terminal archive. This is not solved by the place-memory correction |
| Remembered route lifecycle: `evidence/service.ts:route`; `runtime.ts` route evidence key | Routes keyed by task semantic identity and cursor; new purposes can append route records indefinitely; no independent route-memory compaction path shown | **REFACTOR BEFORE PACK 0C** for canonical route identity/current access and lifetime classification. Preserve required observed paths; do not invent an arbitrary route-forgetting cap |
| Snapshot/projection: `simulation.ts:snapshot, personalLens`; `runners/session.ts` | Every normal snapshot includes all personal lenses, full causal hash, all reservations and full ledger reconciliation; actor-carried lookup uses per-actor `find`; result recursively frozen | **REFACTOR BEFORE PACK-0 PROOF.** Selected/on-demand lenses, narrow DTOs, indexed carried lookup, current accounting; stop history-dependent publication before first long autonomous probe |
| Checkpoint/restore/hash: `simulation.ts:saveRecord, checkpoint, causalHash, validateSaved` | All terrain fields converted to arrays; entire kernel/history/IDs, goods transactions, evidence/runtime serialized; warm terrain digest cached, but other history remains hashed. Restore checks live keys using repeated `ids.keys.includes` | **REFACTOR BEFORE PACK-0 PROOF.** Split continuation/archive, avoid restore `live×historical IDs` search, keep strong validation. Exact binary world packaging is **GOOD WITH LOCAL OPTIMISATION**, not an immediate format rewrite |
| Browser/Node ownership: `runners/worker.ts, session.ts` | One session/core and single worker owner; synchronous route draining; renderer interpolates snapshot anchors | **GOOD AS FOUNDATION.** Cooperative host yielding before responsiveness gate; no causal reordering or multithreaded world rewrite |
| Future Mind/social/biological optimization | Not implemented in the inspected slice | **DEFER UNTIL PROFILED** for physical layout/kernel tuning; apply the index, ownership and lifecycle contract at first implementation, not after a failed mature benchmark |

### 11.3 Direct diagnostic evidence

**Runtime-history probe.** On Node 24.19.0, a read-only import of the existing flat-world fixture ran one actor through distinct, already-selected diagnostic Attend episodes. Each episode paid 0.001 SD and advanced the host to the next 0.002-SD point. The objective names differ so these are separate closed purposes, not attempts to bypass same-purpose spending. This is a structural lifecycle probe, not autonomous behavior or a mature population benchmark.

| Completed episodes | Live tasks | Retained task objects | Retained paid prefixes | Retained semantic budgets | Current Evidence / map cells | Runtime JSON UTF-8 bytes |
| ---: | ---: | ---: | ---: | ---: | --- | ---: |
| 8 | 0 | 8 | 8 | 8 | 12 / 96 | 8,181 |
| 32 | 0 | 32 | 32 | 32 | 12 / 96 | 32,414 |
| 96 | 0 | 96 | 96 | 96 | 12 / 96 | 97,151 |
| 256 | 0 | 256 | 256 | 256 | 12 / 96 | 259,695 |

At the last point, 768 kernel history records and 1,035 identity keys were retained. Those counts do not themselves prove illegal history: history and exact semantic budgets can need retention. The defect is retaining full execution objects and traversing historical arrays for current access. The source establishes the traversal even where the latest task is at the end: `[...tasks]` already copies the entire table before `reverse().find()` can stop. Timed-step restart also scans prior prefixes. The evidence/map plateau confirms this is independent of the corrected place-memory leak.

**Engineering-cutoff counterexample.** A matched one-actor Move on the same flat fixture changed only the stored total cutoff initialized from `routeExpansionsPerComputation`, using diagnostic values 1 and 4,096. Both used a 65,536 host slice. This is an intentional diagnostic perturbation of that field, not a supported baseline configuration or repository edit.

| Stored computation cutoff | Simulated time after host draining | Task state | Expanded cells | New repair-required records |
| ---: | ---: | --- | ---: | ---: |
| 1 | 0 | blocked: engineering computation exhausted | 1 | 1 |
| 4,096 | 0 | running | 23 | 0 |

Therefore the total cutoff controls a causal task transition, despite both runs consuming no simulated time during computation. The invariant violation is the **classification/boundary**, not failure to find a path in too few expansions. Keep legitimate actor-level bounded search; connect it to P/N instead of treating an E cutoff as an actor outcome.

**Provenance extension probe.** Directly delivering report A, independent report B, then forwarded A for the same subject/property produces three accepted updates and one retained record in the current `deliver()` implementation. This confirms “one current dedup entry” does not establish full provenance-aware inference. No social-report/success-credit implementation is present, so this is an extension-readiness limit rather than a claim of observed duplicate attraction credit. Implement exact original-provenance handling and contradiction/sample semantics before those consumers, without restoring the old unlimited hot evidence log.

The probes produced identical structural output through Node's TypeScript transform loader and the project's tsx 4.21.0 version. They do not certify the project's browser numerical profile or substitute for its test suite.

A minimal reproduction of the runtime and cutoff probes, using existing exported diagnostic APIs, follows. Run outside the source tree with `node --import tsx` and adjust the import path to the read-only checkout; no production source edit is required.

```js
import { flatWorld, task, attend, move, time } from './ESS-V4/tests/pack0b-fixture.ts';
const sim = flatWorld('state-growth');
const actor = sim.actorKeys()[0];
sim.enablePersonal(actor);
for (let i = 0; i < 256; i++) {
  const selected = task(sim, [attend(time(.001))], String(i));
  selected.objective = 'diagnostic episode ' + i;
  sim.diagnosticSelect(selected);
  sim.advanceTo(sim.kernel.state.now + time(.002));
  if ([7, 31, 95, 255].includes(i)) {
    const r = sim.runtime.state;
    console.log(i + 1, r.tasks.length, r.activity[0].prefixes.length,
      Object.keys(r.budgets).length, Buffer.byteLength(JSON.stringify(r)));
  }
}
for (const cutoff of [1, 4096]) {
  const s = flatWorld('engineering-bound');
  s.diagnosticSelect(task(s, [move(2.55)]));
  s.runtime.state.tasks[0].route.computationEnd = cutoff; // diagnostic only
  while (s.resumePersonalRouting(65536)) {}
  const t = s.runtime.state.tasks[0];
  console.log(cutoff, s.kernel.state.now, t.status, t.failure,
    t.route.expansions,
    s.kernel.state.history.filter(e => e.kind === 'task-repair-required').length);
}
```

### 11.4 What the existing measurements establish

The repository's corrected five-run receipt uses the canonical 256×192 raster, 24 diagnostic sites, seed `spine`, 8/32 actors and selected tasks through 1 SD on an AMD EPYC 9V74, Linux x64, Node 24.19.0. These are **published implementation measurements**, not new measurements made by this audit.

| Metric | 8 before | 8 corrected | 32 before | 32 corrected |
| --- | ---: | ---: | ---: | ---: |
| Advance median ms | 38.06 | 44.18 | 155.08 | 162.99 |
| Checkpoint median ms | 196.57 | 187.65 | 338.21 | 223.97 |
| Checkpoint bytes as reported | 5,608,888 | 5,064,290 | 8,825,974 | 6,442,538 |
| Retained Evidence objects | 1,207 | 104 | 5,271 | 426 |
| Personal-state bytes as reported | 787,906 | 231,828 | 3,469,145 | 1,031,501 |
| All personal lenses median ms, excluding causal hash | 10.46 | 4.50 | 44.12 | 17.18 |
| Processed events | 540 | 540 | 2,206 | 2,206 |

The local evidence compression is substantial; advancement did not improve. The receipt's 12-SD attention probe holds Evidence/map/provenance at 108/754/59 after its first SD while updates increase. Its separate 144-place churn fixture reaches 32 discretionary places and then stays there. Neither probe repeatedly selects hundreds of independent tasks, so neither disproves the runtime-history finding above.

The published sampled CPU breakdown attributes approximately 62% to evidence delivery/memory/personal reads, 15% to visibility/perception, 7% to event/history hashing and 1% to personal routing. These are limited inclusive groups from a three-advancement sampling probe; encoding/hash and clone costs overlap them. They justify investigating evidence/projection allocation before native routing work, not promising a particular speedup.

The corrected STATUS/PR reports 87 Vitest tests and two production Playwright tests passing, with head-specific CI links on PR #2. This audit uses those as receipts, not independent rerun claims. Correctness receipts at small scope and a current-memory plateau do not certify long-run computational structure or §43's proof.

## 12. Recommended retrofit sequence

### 12.1 Dedicated retrofit decision

**Yes: a bounded representation/interface retrofit is warranted before Pack 0C.** Let the targeted Pack-0B work be reviewed and preserved first; it should not be discarded or reimplemented. Its merge is outside this audit's authorization. Then perform the work below on the accepted base before the mind begins using these paths. It is one coherent boundary correction, not another scientific design stage.

The reason is structural dependency, not that the current 32-person timing misses a provisional number: Pack 0C would repeatedly exercise bulk personal reads and current-task lookups and could adopt a history-changing engineering cutoff as part of its decision lifecycle. Once those become the mind's API, later fixes become harder and risk changing semantics.

### 12.2 Pre-0C minimum scope

| Order | Scope | Exact acceptance |
| --- | --- | --- |
| 1 | Preserve corrected evidence writer, pins, personal routes and repair authority; add structural counters | Existing direct-memory, isolation, repair-spend and continuation cases still pass; no discarded correction |
| 2 | Separate current execution from completed task/prefix history | Direct current-task/active-routing access; per-operation paid total and cursor; closed prefixes leave active scans. The repeated-episode probe plateaus in active execution bytes; exact retries retain prior spend/completion through restore |
| 3 | Introduce narrow personal read/index interface and reusable personal geography versions | No ordinary cognitive read builds the full map/regions or clones all evidence; larger distant remembered geography leaves local lookup work unchanged; all options share one immutable personal snapshot |
| 4 | Index active self backing and route dependencies | Exact-self reservations visit only the actor's relevant records; `goodById` does not scan `K`; search shares/pins its personal map version, not copies the full map; heap reuse removes per-slice full heapification |
| 5 | Correct routing budget boundary | Host work exhaustion yields only; specified P/N cognition governs actor-level deferral. No new “free computation” grants or simulated CPU time. Small/large host slices and cache states preserve logical results, spend and event history |
| 6 | Freeze the interface with focused regressions | Repeated task history, remembered-map scaling, irrelevant catalogue, hidden-world, host-limit, duplicate/retry, and active-search save/restore tests pass; record counts and remaining proof-gate work |

Do not implement a mind merely to perform this retrofit. A diagnostic account adapter can exercise the specified charging/deferral contract without generating objectives or making choices. Full policy consumers arrive in 0C. Do not invent a fresh autonomous routing allowance to fill a missing integration decision; resolve it within §§8/17 and the versioned profile.

Archiving here may initially mean an append-only in-memory segment plus a current-state/backing index. That already removes historical traversal from current access without a database. It is not sufficient for unlimited resident storage; the proof-gate work below completes that separation.

### 12.3 Before first prolonged autonomous run and Pack-0 proof

Once the narrow interfaces pass, Pack 0C may proceed under this doctrine. Its **first repeated autonomous-work fixture** must run the history/content/world/observer structural probes. If ordinary step/read cost still depends on completed history, fix it before expanding the workload. Do not postpone all performance discipline to the end of Pack 0.

Before the Adoption Gate/P6, complete:

- current-state versus archive separation for kernel history, transaction history, exact identity/dedup backing and old activity;
- current ledger accounting/reconciliation without lifetime replay in ordinary snapshots/SD checks;
- checkpoint section/byte accounting, required archive references and exact restore, including independent validation of historical backing;
- publication without all personal lenses, lifetime hashes or reconciliation rescans; selected lens and incremental/current DTOs;
- amortized queue stale compaction and restore lookup validation;
- safe host yielding with no causal event interleaving across an unfinished admitted computation;
- tens/96/400 P6 probes, including fixed-density and crowded cases, on the actual implemented causal workload.

If exact binary terrain storage is needed to meet measured checkpoint/load targets, add that narrow codec with round-trip vectors. Otherwise defer it. Do not make WASM, distributed stores, generic ECS migration, a new database or intra-world multithreading part of this gate.

### 12.4 Preservation and migration

Use a schema bump and explicit incompatible-save rejection where exact migration is not supplied, following the current repository convention. A migration may compact execution records only after deriving and validating the same paid totals, semantic budgets, provenance and dependencies; it cannot fabricate missing source history. Keep before/after fixtures and raw counters. Format changes alone must not require scientific recalibration.

These changes normally preserve Level III ownership and existing semantics. If implementation reveals that a new general service/boundary or a changed causal policy is necessary, follow §46.4 with evidence and prospective consumers. Do not silently add it under the word “optimisation.” The engineering-cutoff finding can be corrected by restoring the existing effort/yield distinction; it does not require redefining bounded rationality.

## 13. Pack-0C readiness criteria

Pack 0C may start autonomous cognition after the following are demonstrated, not merely promised:

1. **Authority pinned:** accepted main and corrected Pack-0B commit recorded; Revision 4.0 unchanged; current scope explicitly says knowing/executing versus choosing.
2. **Personal reads:** mind-facing access is evidence-only, immutable per review and indexed. Full-map inspector generation is not the read primitive. Hidden remote mutations leave personal data, invalidation and wake channels unchanged.
3. **Method/target index entry points:** effect/property/resource/region/cursor APIs permit bounded, fair retrieval without global content or world scans. First 0C consumers add the relevant inference semantics; they do not treat current latest-value storage as complete §11.4 inference.
4. **Current execution:** task and active-route retrieval do not inspect completed task history; paid work survives interruption/repair/load through current sufficient state and exact purpose backing.
5. **Backing access:** carried goods and active reservations are indexed; no copied quantities become independent authority; no expired lease table is an implicit lifetime scan for each mind read.
6. **Routing:** personal map/prior ownership, sparse frontier and deterministic order retained; host yield is distinct from causal account exhaustion and never publishes a repair failure by itself.
7. **Restore:** active search, running operation, suspended task, repaired suffix, required pins and semantic spend restore exactly, including compacted-prefix cases.
8. **Provenance consumers:** no new Bayesian estimate, report credit or occupancy update ships without distinct-original evidence, overlap/rediscovery and contradiction tests. This is a first-consumer gate, not a requirement to implement all later social reports before 0C.
9. **Regression shape:** controlled repeated-episode and remembered-geography probes expose no inherited history/map prelude in ordinary access. +100 irrelevant content entries do not increase relevant runtime lookup visits; 0C adds full per-review P5 assertions as soon as reviews exist.
10. **Remaining compute gate explicit:** archives, identity growth, publication and full 96/400 proof remain open with named acceptance. No claim of a mature performance gate based on 8/32 preselected tasks.

These are focused implementation tests. They do not ask for another speculative architecture audit or a complete foundation rewrite before work can continue.

## 14. Later-pack stress test and changed scaling boundaries

| Later capability | Legitimate added state/work | Boundary that prevents another foundational rewrite |
| --- | --- | --- |
| More recipes, tools, unknown techniques | Global content compile; actual learned methods, held tools and executed recipe work | Indexed triggers versus personal repertoire stay separate; generic tasks/ledger; no per-wake `K` scan |
| Fishing, predators and dangerous prey | Finite sites/animals, pursuit opportunities, local contacts and hazard processes | Local spatial query, lazy stocks/hazards, one contest interface; no global prey/person pairing |
| Many sparse ties and gatherings | Actual directed evidence/ties, pinned counterparts and qualified local witnesses | Tie/role/service indexes and personal attention policy; no complete conversation graph |
| Proposals and obligations | Live versions, actual responses, leases, messages, due occurrences | Due/party/backing indexes; expiration and accountability separated; every nested comparison uses the same account |
| Shared assets and custody | More claim shares, custodians, reservations and nested containers | One physical ledger, claim-backed references, direct affected-claim reconciliation |
| Reports and messengers | Actual delivered message records and original-provenance contributions | Exact dedup backing and contextual reducers; no universal inbox or archive-to-mind shortcut |
| Households and recurring support | Real bond episodes, duties, counterparties and delivered-service windows | Responsibilities outlive tasks; rolling sufficient fulfillment summaries and permanent episode events |
| Pregnancies, children and care | Per-person biology, hidden opportunity/episode state, care edges and childhood integrals | Analytic anchors and canonical closures; no per-tick fetuses or replay of a childhood feeding log |
| Pedigrees and multigenerational history | Total births/alleles/lineage records grow even at fixed living `N` | Immutable indexed pedigree backing; bounded relevant-pair ancestry query; deceased hot state retires |
| Death and estates | Actual liabilities, heirs, located assets and vacancy processes | By-deceased/beneficiary/backing indexes, paid settlement; distant knowledge changes only through evidence |
| Patronage and offices | Actual role/member/delegation edges, due remittances and recognition audiences | No group brain, no title-based shortcuts; procedural work by individual role holders |
| Territory and logistics | Real responders, shipments, guarded anchors, route dependencies | Physical control resolved locally; influence overlay computed separately for display/analysis |
| War and mass movement | High local density, contention, participants, arrivals, injuries and supply | Aggregate only law-supported sums in fixed order; individuals retain positions, supply, time, risk and assent. Dense cost is reported, never capped away |
| Strategic projects | Real stages across many reviews, bounded active frontier and necessary milestone/attempt summaries | No lifetime depth limit, no on-disk combinatorial search tree, no capital counterfactual budget multiplication |
| Institutional succession/writing | Long-lived cases and record versions; real transfer/read/copy work | Truth records distinct from each holder's dated projection; paid handover, located information artefacts and exact archive links |
| Long-run scientific analysis | Cohorts, censored intervals, event-time snapshots, lineage dependence and selection data | Measurement reducers plus addressable archive; expensive historical query does not enter simulation/renderer loop |

### Genuine scale transitions

**Stage II: social density and communication.** Actual local encounters, messages, ties, due agreements and provenance become major terms. Test sparse and crowded cases separately. A spatial index does not remove unavoidable output cost when a directed consequential event has many real recipients; it removes irrelevant searches.

**Stage III: elapsed generations independent of living population.** A stable `N` no longer bounds total persons born, genotype records, households, estates or ancestry. Complete archive-backed continuation and pedigree lookup before the three-generation gate. Make resident memory and total durable bytes separate metrics.

**Stage IV: many affected obligations, supplied force and territorial analysis.** An office with many true duties and a battle with many participants have real workload. Incremental due/member indexes avoid unrelated scans, but cannot delete a genuine affected set. A display influence computation may legitimately touch many responders and regions; compute/cache it as analyst work, never as an authoritative ownership field that actors read.

**A future richer physical law may add new spatial fields or processes.** Vehicles, disease or area effects can change geometry/contact workload. The extension must declare those growth dimensions and preserve existing owners. That is a new law's real cost, not evidence that all future content needs a new mind, runtime or persistence architecture.

## 15. Reviewer checklist for future implementation prompts

```text
Follow Revision 4.0 as the sole authority. Apply the computational/state contract.

[ ] Every new record names its single writer, readers, growth driver, lifetime,
    pin/eviction/compaction rule and checkpoint/archive fate.
[ ] Current execution reads current indexed state, not old tasks/events/prefixes.
[ ] A local cause touches local/affected records; no possible-pair or world scan.
[ ] Personal reads and routing use dated personal knowledge, never truth indexes.
[ ] Irrelevant catalogue growth adds no ordinary candidate/review work.
[ ] Nested estimates share EU; fairness/cursors survive bounds and restore.
[ ] Continue does only affected dependencies and the next authorized operation.
[ ] P/N limits are causal; E slices/caches/yields cannot change time or outcomes.
[ ] Forgetting removes actionable details but preserves specified pins, coverage,
    posterior contributions, precedent, reproductive history and responsibilities.
[ ] Original provenance deduplicates across intervening observations/retellings.
[ ] Quantities/backing have one authority; closed reservations leave active scans.
[ ] Paid cursors, held outcomes and original-purpose spend survive retry/repair.
[ ] Checkpoints preserve anchors and all required backing; caches are rebuildable.
[ ] Ordinary projections/hashes do not serialize lifetime history or every mind.
[ ] Growth probes report visits, copies, state/byte categories and living exposure.
[ ] Real dense cost is explained; no science, population or locality is weakened.
[ ] Claims separate source inspection, tests, receipts and unimplemented systems.
[ ] Level-III change, if actually necessary, follows §46.4 rather than a hidden patch.
```

**Adoption boundary:** this document adds an engineering review discipline and explicit representation obligations derived from Revision 4.0. It grants no authority to change scientific coefficients, causal memory/effort policy, the seven organs, consent, conservation, personal knowledge or the roadmap. Correct code is retained; avoidable growth is removed at the smallest boundary that owns it.
