# Emergent Social Simulation — V4

An implementation of [Revision 4.0](docs/spec/REVISION_4_0.md), the sole normative specification. Requires Node 24+.

Pack 0A supplies the accepted deterministic physical spine. Pack 0B adds dated evidence, physically bounded perception, sparse personal geography/routing and one runtime for explicitly selected diagnostic tasks. Real **Move, Transfer and Attend** execute through physical laws with persistent paid time, budgets, reservations and progress. **Pack 0 and its architectural proof remain incomplete; autonomous choosing is deferred.** See [STATUS](docs/STATUS.md) for scope, verification, reuse, limits and [measurements](docs/pack0b-benchmark.json).

```sh
npm ci
npm run check
npm run dev
npm run headless -- --pack0b --seed spine --until .03 --checkpoint /tmp/pack0b.json
npm run headless -- --restore /tmp/pack0b.json --until 1
npm run benchmark -- --pack0b
npm run benchmark -- --pack0b --probe32
```

The browser opens an eight-person diagnostic **Transfer → exploratory Move → Attend** fixture. The analyst map is labelled separately from each person's **Personal Lens**: dark unseen ground, remembered terrain/places/routes, dated evidence, bound task/step, progress, budgets and observable failure. Tasks can be interrupted, resumed or abandoned; save/load continues the same causal state. Inspection and rendering are inert. `headless` without `--pack0b` retains the original physical diagnostic fixture; personal actors use the generic runtime.

Production browser verification:

```sh
npx playwright install --with-deps chromium
npm run test:browser
```

The real browser worker is compared with Node across physical and evidence/runtime fixtures, active checkpoints, interruptions/resumption, paid goods/time, observer reads, stepping and frame delays. CI runs the full checks and production browser tests. For the manual parity page, run `npm run verify:browser`, then `npm run dev` and open `/verify.html`.
