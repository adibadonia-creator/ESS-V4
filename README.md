# Emergent Social Simulation — V4

A clean implementation of [Revision 4.0](docs/spec/REVISION_4_0.md), the sole normative specification. Earlier ESS repositories are selective references only.

Requires Node 24+. Run `npm ci`, `npm run check`, then `npm run dev` and open the printed local URL.

Pack 0A is a real deterministic physical slice: terrain, finite goods/reservations, navigation, continuous paid movement, checkpoints and the same pure core in Node and a dedicated browser worker. The eight-shell **diagnostic execution fixture** demonstrates physical execution. **Pack 0 and the architectural proof are not complete.** See [STATUS](docs/STATUS.md) for scope, reuse, validation, limitations and [measured baseline](docs/baseline.json).

```sh
npm run headless -- --seed spine --until 0.0001 --checkpoint /tmp/spine.checkpoint.json
npm run headless -- --restore /tmp/spine.checkpoint.json --until 1
npm run benchmark
```

The browser provides Pixi/WebGL terrain/resources/shells, play/pause/speed, camera and entity inspection, diagnostic movement/goods operations and save/load. Operations validate physical locality; failed requests report errors without changing causal state. Shells move only when the fixture or an explicit diagnostic command launches movement. Rendering interpolates worker-issued leg anchors; panels cannot write authoritative state.

Production browser verification:

```sh
npx playwright install --with-deps chromium
npm run test:browser
```

The gate compares a real browser worker with Node, including goods, an active checkpoint, observer reads, stepping and frame delays; it also checks the visible app. For the manual gate, run `npm run verify:browser`, then `npm run dev` and open `/verify.html`. References are generated from the same source/version and remain local. CI runs both invariant and browser gates.
