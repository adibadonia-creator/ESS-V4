# Pack 0A — deterministic physical spine

Implemented on `pack0a-deterministic-physical-spine`; draft PR only. Revision 4.0 is adopted verbatim on clean `main`; no V1/V2 Git history was imported. **Pack 0 is not yet complete. The architectural proof in §43 has not passed.**

## Exact scope

- Pure mutable TypeScript kernel: integer 2^-20 SD timestamps, upward future rounding, overflow rejection, non-reused dense handles and 128-bit semantic lineage keys, eight causal phases, mutable heap, generation cancellation/compaction, keyed Philox4x32-10, versioned numerical adapter, canonical state/history hashes and append-only consequential records. Dense handles never order events or key draws.
- Authoritative physical services: canonical 256×192 raster at 0.10 km/cell, seeded warped fields and acyclic priority-flood drainage, water/ford/cliff passability, weighted terrain, connected components, 3.2 km bounded regions and actual portals, local spatial buckets, continuous person-shell positions and finite typed sites.
- Physical ledger: custody/location/carrier/nested containers, capacities, finite backing, reservation/lease expiry, diagnostic transfers (including deposit/withdrawal), declared source/sink transactions, atomic validation/commit and per-container/global reconciliation. Reservations are restrictions on existing stock. No social claims or property-recognition law exists.
- Weighted eight-neighbour A*, Euclidean diagonals/no corner cutting, deterministic expansion budgets, resumable frontiers and explicit unresolved/unreachable/invalidated outcomes. Components prove impossibility; portals provide the physical corridor representation. Conservative line-of-sight string pulling produces executable continuous segments.
- Movement integrates terrain cell by cell with held diagnostic ability/condition/wound/fatigue/load inputs and integer future cell-boundary closures. Reads materialise positions without changing anchors. Load/input changes and interruptions settle the paid prefix first. Local moving-shell radius crossings are predicted geometrically; raster closures expose physical movement boundaries.
- Complete committed-boundary checkpoints include the physical records, anchors/cursors, routes, goods/backing/reservations, queued events, semantic ordinals, history, configuration/seed/time/phase and version/source/content identities. Checksums, version mismatches and invalid records are rejected. Recorded configuration forks retain their parent checkpoint and intervention and settle active motion.
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

## Verification performed

2026-10-03, Linux x64, Node 24.19.0, TypeScript 5.9.3:

- `npm run check`: AST boundaries **pass**; typecheck **pass**; **37 Vitest invariants pass**; core compilation and Vite production build **pass**.
- Production Playwright gate: **2 tests pass** using Chromium 153. Real module worker equals Node across initial world, goods operations, active movement/reservation/future-event checkpoint, uninterrupted continuation, restore, differently partitioned advancement, observer reads and animation-frame delays. Numerical and Philox vectors match exactly. This certifies the tested profile/fixture, not every engine/platform.
- Real Pixi/WebGL page loads; terrain/sites/shells render; selection, counters, zoom, step and play/pause work; paused inspector/camera changes preserve causal hash; no page exceptions or Vite error overlay. Screenshot visually inspected.
- CLI active-leg checkpoint at 0.0001 SD → restore → 1 SD equals uninterrupted CLI: causal hash `a729512b8cd6e50d2709d0d6cdb93a81`, history hash `aeb86828fe3477569caaa37b75213fd3`; conservation true.
- Unit coverage includes phase/semantic tie ordering, zero-time rejection, stale generations, identity non-reuse, timestamp exhaustion, numerical/RNG reference checks, drainage and region portals, weighted diagonal geometry, blocked corners, bounded/resumed/invalidation routing, continuous paid motion, old-load settlement, immutable observer copies, failed-transaction inertness, active and pending-route saves, incompatible/tampered checkpoints and recorded forks.
- GitHub workflow runs checks and the production browser gate. Local cloud-browser loopback access was blocked; the repository's automated production browser tests completed instead. The restricted local environment needed manual decompression/font configuration of the optional bundled Chromium; normal CI uses Playwright's installed Chromium.

Reproduce: `npm ci && npm run check`; then `npx playwright install --with-deps chromium && npm run test:browser`. For a manual browser-worker gate: `npm run verify:browser && npm run dev`, open `/verify.html`. The generated Node reference is ignored and regenerated from the same source/profile before production browser tests.

## Measured baseline

[Raw five-run baseline](baseline.json), `npm run benchmark`: seed `spine`, canonical raster, eight shells/24 sites, movement fixture to 1 SD; AMD EPYC 9V74, Linux x64, Node 24.19.0. Five repetitions have identical causal hashes/counters.

| Operation | Median milliseconds |
| --- | ---: |
| World/raster/regions/fixture records creation | 996.90 |
| Launch preselected routes/movement | 149.78 |
| Advance sparse physical events to 1 SD | 3.38 |
| Full JSON checkpoint | 195.62 |
| Causal hash after checkpoint | 1.90 |
| Detached snapshot/reconciliation | 2.22 |

Per run: 231 processed events, 231 heap pushes/pops, 32 source transactions, 8 route searches / 1627 expansions, 229 local spatial queries; 96 projected entities across two snapshots. Checkpoint: **4,704,503 bytes**. Counters and wall-clock timings are engineering measurements only. This mostly finite journey followed by idle time establishes a small baseline, **not** the full §40.5 performance target or a multi-year autonomous-population benchmark. Initial generation/full checkpoints remain comparatively expensive; no speculative optimization was introduced.

## Boundaries, limitations and next slice

No Level-II/III contradiction, causal falsifier or architecture change was discovered; no ADR is required. The work-order section numbers differ from the supplied document: this implementation follows the supplied text (kernel §6, presentation §39, compute §40, roadmap §42, proof §43, validation §44, build/reuse §45, ADR §46.4 and registry §47).

Deliberately deferred: evidence, personal geography/known-map and belief-side routing, minds/deliberation/drives/arbitration/inquiry, generic task binding/runtime/effort economics, tools/mastery/learning, body physiology and representative body closures, ecological renewal/animals, social agreements/claims/relationships, reproduction/households/institutions/combat/markets, and the generativity/proof test. No results from these absent organs are claimed.

Engineering limits: A* uses global connectivity and weighted cell search; hierarchical portal-guided optimization is not implemented. The diagnostic route budget resumes one quantum later and has no personal effort law yet. Terrain changes conservatively invalidate motion whose remaining raster neighbourhood is affected and rebuild regions globally; incremental invalidation remains future performance work. Swept shell-radius and raster boundaries are present; full terrain sight-footprint, occlusion, site perception/evidence and portal observation delivery belong to the evidence slice. History currently retains individual physical records; long-run flow aggregation/archive policy remains future work. JSON checksums/hashes are deterministic non-cryptographic corruption/replay identifiers, not security authentication. Cross-engine/platform certification is limited to the gate; persisted schema/source/profile mismatches are rejected rather than converted. Forks do not migrate goods, terrain profiles or generators.

Recommended next: **Pack 0B — evidence and personal-view isolation plus the generic task-runtime execution boundary**, building real perception/known-map, paid effort/continuation and mind-facing personal views over these services, then the bounded mind/task proof slice. There is no discovered blocker to starting it. Pack 0 completion and architectural proof remain outstanding.
