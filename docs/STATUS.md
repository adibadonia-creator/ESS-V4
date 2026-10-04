# Pack 0A — deterministic physical spine

Implemented on `pack0a-deterministic-physical-spine`; draft PR only. Revision 4.0 is adopted verbatim on clean `main`; no V1/V2 Git history was imported. **Pack 0 is not yet complete. The architectural proof in §43 has not passed.**

## Exact scope

- Pure mutable TypeScript kernel: integer 2^-20 SD timestamps, upward future rounding, overflow rejection, non-reused dense handles and 128-bit semantic lineage keys, eight causal phases, mutable heap, generation cancellation/compaction, keyed Philox4x32-10, versioned numerical adapter, canonical state/history hashes and append-only consequential records. Dense handles never order events or key draws.
- Authoritative physical services: canonical 256×192 raster at 0.10 km/cell, seeded warped fields and acyclic priority-flood drainage, water/ford/cliff passability, weighted terrain, connected components, 3.2 km bounded regions and actual portals, local spatial buckets, continuous person-shell positions and finite typed sites.
- Physical ledger: custody/location/carrier/nested containers, capacities, finite backing, reservation/lease expiry, diagnostic transfers (including deposit/withdrawal), declared source/sink transactions, atomic validation/commit and per-container/global reconciliation. Reservations are restrictions on existing stock. No social claims or property-recognition law exists.
- Bounded regional A* selects a corridor through actual portal-connected clusters. Weighted eight-neighbour A* refines executable geometry within that corridor, with Euclidean diagonals/no corner cutting and conservative line-of-sight pulling. Sparse discovered-node tables and persisted heaps resume exactly. Components prove disconnection; exhaustion remains unresolved. Engineering slices run at the same causal time, outside the event heap.
- Movement integrates terrain cell by cell with held diagnostic ability/condition/wound/fatigue/load inputs and integer future cell-boundary closures. Reads materialise positions without changing anchors. Load/input changes and interruptions settle the paid prefix first. Local moving-shell radius crossings are predicted geometrically; raster closures expose physical movement boundaries.
- Complete committed-boundary checkpoints include the physical records, anchors/cursors, routes, goods/backing/reservations, queued events, semantic ordinals, history, configuration/seed/time/phase and version/source/content identities. Schema 2 records sparse routing and corner dependencies; older schema/source saves are explicitly rejected. Checksums, version mismatches and invalid records are rejected. Recorded configuration forks retain their parent checkpoint and intervention and settle active motion.
- Node runner and one dedicated module Web Worker use the same core. Pixi/WebGL renders terrain/sites/shells and interpolates worker-issued legs; DOM play/pause/speed, camera, selection/inspection, diagnostic movement/goods and save/load controls operate on detached readonly projections. Measurement reducers accept projections only; counters are excluded from causal state/hashes.

The seed `spine` scenario is an **eight-shell diagnostic execution fixture**, with 24 finite sites and preselected movement targets. It is not the canonical biological founder population and is never represented as emergent deliberation. Diagnostic coefficients, generator engineering values and inventory endowments are explicit in `src/content/physical.json`; they have not been calibrated to obtain pleasing behaviour.

## Package map

| Module | Existing responsibility |
| --- | --- |
| `src/kernel` | General substrate: time, identity, RNG/math, heap/phases, persistence identities, counters |
| `src/content` | Immutable authored physical records and resolved configuration |
| `src/world` | Terrain/regions, routing, spatial index, movement, goods; physical slice owner coordinating these narrow writers |
| `src/projection`, `src/measurement` | Detached readonly DTO contracts and inert reducers |
| `src/runners` | Shared command session, diagnostic fixture, Node CLI/benchmark and dedicated worker |
| `src/presentation` | Pixi/WebGL and DOM; no authoritative-world imports |
| `tests`, `scripts` | Invariant suite, real browser gate, source stamp and AST dependency checks |

There are no placeholder mind/evidence/task/social organs. Core compilation has no DOM/platform types; AST checks prohibit platform globals, external dependencies and unadapted causal transcendental calls. Read-side imports are restricted, substrate cannot import world/content, and content cannot depend on runtime services or contain executable control constructs.

## Actual selective reuse

Latest merged reference mains inspected: V2 `f7235628618fb94ec4abdc305f6a7c300eaff7f0`, V1 `ba33153734b5f3cc47330b5c049f4ce86a8dedd6`. Each source was inspected separately; neither source tree was copied.

| V4 module | Source | Disposition and retained verification |
| --- | --- | --- |
| `kernel/numerics.ts` | V2 `src/core/numerics.ts` | **PORT** fixed-order polynomial exp/log/log1p/expm1/tanh/pow machinery; added finite-input guards and versioned that change. Accuracy, small-increment precision and invalid-input tests; exact Node/browser numerical vectors. No survival controller. |
| `kernel/time.ts`, `canonical.ts` | V2 `src/core/primitives.ts` | **PORT WITH SIMPLIFICATION** integer time/FNV primitive; explicit overflow checks, canonical records and four domain-separated avalanche lanes for 128-bit digests. Rounding, overflow, sorted-hash and lineage-independence tests. V2's keyed-draw scheme was replaced by a new Philox adapter with primary Random123 KAT vectors. |
| `kernel/heap.ts`, scheduler mechanics | V1 `src/simulation/kernel/scheduler.ts` | **PORT WITH SIMPLIFICATION** heap mechanics into a mutable general heap. V4 phases, semantic ties, generation invalidation and zero-time guards are implemented here; immutable queue rebuilding and controller/insertion-order coupling removed. Phase/tie/stale/cycle/ID tests. |
| `world/terrain.ts` | V2 `src/core/landscape.ts`, `tests/landscape.test.mjs` | **PORT WITH SIMPLIFICATION** value-noise/warped-field and priority-flood drainage approach; canonical dimensions, typed rasters and heap flood replace repeated queue sorting. New region/portal representation. Repeatability, acyclic-drainage, connectivity and traversability invariants retained. |
| `world/goods.ts` | V1 `src/simulation/economy/physical.ts` | **REIMPLEMENT FROM CONCEPT** finite goods, custody, storage and transactional reconciliation; fresh mutable service and lease backing. No V1 controller/claim-law code imported. Conservation, reservation, partial release, locality, exactly-once debit, failed/stale commit and nested-capacity tests. |

Philox vectors are checked against [Random123's primary known-answer file](https://github.com/DEShawResearch/random123/blob/main/tests/kat_vectors). Routing/movement, shared session, renderer and checkpoint owner are new implementations from Revision 4's contracts. Old decision/exploration/survival controllers, funding/continuation architecture, controller tests, controller persistence and calibration gates are retired.

## Targeted pre-merge corrections

1. **Host computation versus causal time.** `progressRoute` performs one bounded slice and leaves unresolved work in the existing route-request table. It schedules no `route` event. `resumeRouting()` performs one further slice without advancing the clock; `advanceTo()` drains these bounded slices before causal advancement. Diagnostic requests complete earlier requests in command order, and the fixture/session drain the final request before publishing movement. Host yielding between explicit slices is possible. No computational slice consumes actor time or event/history identities. The E work-slice size remains in checksum-protected checkpoint configuration metadata and is excluded from causal configuration hashing. This is separate from the future personal P/N effort account.
2. **Sparse persistence.** Each discovered cell/region has one coordinate-keyed `{g, parent, closed}` record. Only frontier heaps, discovered nodes and the selected corridor are persisted. Numeric semantic coordinate ties, sorted regional neighbours and canonical record keys fix order. Runtime heaps/corridor sets are derived caches and reconstructed after load; region rasters and maximum terrain speed are shared world indexes. Neither begin nor resume allocates full-raster arrays per search.
3. **Hierarchy used.** Bounded A* on portal-derived regional adjacency uses deterministic cluster-centre distances to select a corridor. Local cell A* is constrained to its connected clusters, checks actual eight-neighbour passability and diagonal guards, and supplies string-pulled cell-integrated movement legs. The coarse frontier is discarded after corridor selection. This is truth-side diagnostic execution; no mind or personal geography is supplied.
4. **Narrow generations.** Leg predictions and contact validity use `digest(["physical-motion", actorKey])`. Load/input changes, interruptions and configuration re-anchors invalidate this movement scope, never the person key. The general kernel remains unchanged. A diagnostic future event with the person as subject still executes after stale motion is cancelled.
5. **Exact terrain dependencies.** Remaining positive-length segment cells and explicit zero-length diagonal corner guards are the geometry dependencies. Blocking one interrupts the settled paid prefix; blocking a neighbouring unused cell leaves its leg and generation untouched. A speed change in the current cell re-anchors it; future cell speeds are read at genuine cell boundaries. Regions are still rebuilt globally.

These repair existing Revision-4 contracts at their local implementation boundary. No organ, operation family, causal policy or scientific value was added or changed; no Level-III constitutional change/ADR is required. Pack 0B has not begun.

## Verification performed

2026-10-04, Linux x64, Node 24.19.0, TypeScript 5.9.3:

- `npm run check`: AST import/content/numerical boundaries **pass**; typecheck **pass**; **48 Vitest tests pass**; pure core compilation and Vite production build **pass**. This includes the complete original suite plus the correction invariants.
- Explicit engineering invariant: otherwise identical worlds with **1 versus 65,536 expansions per host slice** have equal launch-time causal hashes, full histories/history digests, final causal hashes, actor output and expansion counts. Both start movement at quantum **0**; no causal route event exists. Each explicit one-expansion resume consumes at most one coarse/cell expansion and no paid time.
- Sparse state test: after two cell expansions on 32×24 and 256×192 maps, at most 14 discovered records and fewer than 2,500 serialized bytes; no world-sized `g`, `parent` or `closed` arrays. Coarse and local frontiers restored between slices end with the exact uninterrupted search state, path, costs and expansion counts. Whole simulation checkpoints at both unresolved stages round-trip exactly and give identical causal continuation.
- Comparative routing cases: long multi-region route, a narrow portal through a wall, proven disconnected components and one-expansion resumptions. Cell refinement stays inside the selected corridor, uses actual traversable edges, and its pulled continuous geometry remains traversable. A raster-only diagnostic comparator documents the expansion reduction in the bottleneck fixture; no global-optimality claim is made for the hierarchy.
- Generation test cancels stale motion completion while an unrelated diagnostic event concerning the same actor remains valid and executes. Terrain pairs cover a blocked used cell, a blocked adjacent unused cell, and a blocked zero-length diagonal corner guard. Version-stale unresolved searches revalidate rather than becoming falsely unreachable.
- `npm run test:browser`: **2 production Playwright tests pass**, Chromium 153. Real module worker equals Node across initial/active/end hashes, goods, active movement/reservations/future events, exact checkpoint restoration, alternate step partitions, observer reads and frame delays. Philox and numerical vectors match. Pixi/WebGL, selection/camera/counters, step and play/pause pass without page exceptions/overlay; the automated screenshot was inspected by Codex. No new human visual-review receipt is claimed.
- CLI active-leg checkpoint at **0.0001 SD** → restore → **1 SD** equals uninterrupted CLI, including the complete exported summary: causal hash `48a013e5d51cbcbd23628040875da0c0`, history hash `aeb86828fe3477569caaa37b75213fd3`, conservation true. The baseline history digest is unchanged on this short fixture; the state digest changes with source/schema/scoped event identities.
- GitHub Actions on the existing branch enforces `npm ci`, the full check and production Playwright gate. Its live head-specific outcome is attached to [draft PR #1](https://github.com/adibadonia-creator/ESS-V4/pull/1); completion requires those checks to pass. The restricted local environment uses the existing optional bundled Chromium with matching SwiftShader/font files; normal CI uses Playwright's installed Chromium.

Reproduce: `npm ci && npm run check`; then `npx playwright install --with-deps chromium && npm run test:browser`. CLI: `npm run headless -- --seed spine --until 0.0001 --checkpoint /tmp/pack0a.json`, `npm run headless -- --restore /tmp/pack0a.json --until 1`, and compare with `npm run headless -- --seed spine --until 1`.

## Measured baseline

[Raw five-run baseline and previous measurements](baseline.json), `npm run benchmark -- --storage-probe`: unchanged seed `spine`, canonical raster, eight shells/24 sites, preselected movement to 1 SD; AMD EPYC 9V74, Linux x64, Node 24.19.0. Five current repetitions have identical hashes/counters. Previous values are the published baseline at `039f75e52daf82ab03f4e24deb749929208c7d68`; timings are machine-specific observations, not a promised speedup.

| Operation | Before median ms | After median ms |
| --- | ---: | ---: |
| World/raster/regions/fixture records creation | 996.90 | 839.37 |
| Route computation/diagnostic movement launch | 149.78 | 103.62 |
| Sparse physical advancement to 1 SD | 3.38 | 2.48 |
| Full JSON checkpoint | 195.62 | 163.54 |
| Causal hash after checkpoint | 1.90 | 1.75 |
| Detached snapshot/reconciliation | 2.22 | 1.72 |

| Work/persistence | Before | After |
| --- | ---: | ---: |
| Route searches | 8 | 8 |
| Cell route expansions | 1,627 | 1,608 |
| Regional route expansions | 0 | 12 |
| Total bounded route expansions | 1,627 | 1,620 |
| 1-SD checkpoint bytes | 4,704,503 | 4,704,662 |
| First unresolved route search bytes (separate 0-SD probe) | 393,608 | 678 |
| Full checkpoint bytes in that unresolved probe | 5,051,614 | 4,658,395 |
| Per-search full-world array slots in that probe | 147,456 | 0 |

The separate probe uses the same canonical terrain/actor/site fixture, first actor's nearest selected site, budget 1, saved after one expansion at 0 SD. It is run after, and excluded from, the five timed runs. Its new search contains six discovered local nodes. The old code was measured from the existing head in an isolated read-only archive, without creating a branch. Persistent search size falls **99.83%** for this frontier. The ordinary 1-SD checkpoint **increases by 159 bytes**: no unresolved searches exist at that boundary, so it cannot demonstrate removal of their arrays. Its ~4.70 MB is primarily the unchanged full terrain fields; the small increase retains necessary motion scope/corner metadata. No terrain compression or checkpoint redesign was introduced.

Per canonical run, unchanged: 231 processed events/heap pushes/pops, 32 source transactions, 229 local spatial queries and 96 projected entities over two snapshots. The near-site canonical routes span few regions, so the large bottleneck test, rather than this baseline, discriminates the hierarchy. Counters and wall-clock timing are engineering measurements. This finite journey/idle fixture is **not** the full §40.5 target or autonomous-population performance evidence.

## Boundaries, limitations and next slice

The engineering-budget/time defect violated partition invariance and was corrected at the routing continuation boundary. The remaining corrections preserve the existing architectural contracts; no Level-III constitutional change or ADR is required. The work-order section numbers differ from the supplied document: this implementation follows the supplied text (kernel §6, presentation §39, compute §40, roadmap §42, proof §43, validation §44, build/reuse §45, ADR §46.4 and registry §47).

Deliberately deferred: evidence, personal geography/known-map and belief-side routing, minds/deliberation/drives/arbitration/inquiry, generic task binding/runtime/effort economics, tools/mastery/learning, body physiology and representative body closures, ecological renewal/animals, social agreements/claims/relationships, reproduction/households/institutions/combat/markets, and the generativity/proof test. No results from these absent organs are claimed.

Engineering limits: the regional corridor is a deterministic coarse approximation, not a globally least-cost guarantee; local weighted refinement and passability are exact within it. Host draining is synchronous in the current Node/session worker; callers can yield between `resumeRouting()` slices, but no asynchronous host-yield scheduler was added. Personal effort policy is still absent and must not be confused with this engineering slice bound. Terrain changes rebuild the regional world index globally; unresolved searches revalidate against its version, and incremental rebuilding remains future performance work. Full JSON terrain fields dominate complete checkpoints. Swept shell-radius and raster boundaries are present; full terrain sight-footprint, occlusion, site perception/evidence and portal observation delivery belong to the evidence slice. History currently retains individual physical records; long-run flow aggregation/archive policy remains future work. JSON checksums/hashes are deterministic non-cryptographic corruption/replay identifiers, not security authentication. Cross-engine/platform certification is limited to the gate; persisted schema/source/profile mismatches are rejected rather than converted. Forks do not migrate goods, terrain profiles or generators.

Recommended next: **Pack 0B — evidence and personal-view isolation plus the generic task-runtime execution boundary**, building real perception/known-map, paid effort/continuation and mind-facing personal views over these services, then the bounded mind/task proof slice. Personal routing must use witnessed/reported geography and P/N effort accounting; the diagnostic truth corridor/status must never be wired into mind-facing estimates, notifications or wakes. Schema-2/source-matching saves are required. Pack 0 completion and architectural proof remain outstanding; no Pack 0B work was performed in this correction.
