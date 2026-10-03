# Emergent Social Simulation — V4

A clean implementation of [Revision 4.0](docs/spec/REVISION_4_0.md), the sole normative specification. Earlier ESS repositories are selective references only.

Requires Node 24+. Run `npm ci`, `npm run check`, and `npm run dev`.

Pack 0A's diagnostic physical fixture runs through the same core in Node and a dedicated browser worker. It demonstrates execution, not autonomous choice. Pack 0 and the architectural proof are not complete; see [STATUS](docs/STATUS.md).

Headless: `npm run headless -- --seed spine --until 1 --checkpoint /tmp/spine.checkpoint.json`.
Restore: `npm run headless -- --restore /tmp/spine.checkpoint.json --until 2`.
Benchmark: `npm run benchmark`.

The browser offers play/pause/speed, entity inspection, diagnostic movement and goods operations, and save/restore. Rendering interpolates worker-issued leg anchors; panels cannot write causal state.
