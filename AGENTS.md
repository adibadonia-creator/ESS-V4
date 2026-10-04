# Authority and boundaries

Read `docs/spec/REVISION_4_0.md` completely before implementation. It is the sole normative specification. Older documents, V1 and V2 are references only.

Preserve substrate / laws / content boundaries and the single writers in §5. Minds may never import authoritative world state. Presentation and measurement may never mutate causal state. Content may not contain executable behavioural control flow. The simulation core has no DOM, renderer, wall clock, filesystem or network dependency.

Level-III architecture changes require an ADR under the specification's §46.4 (the original work order calls this §43.3). Routine implementation choices need no ADR. Scientific values may not be tuned merely to obtain pleasing behaviour.

Keep slices real, compact, deterministic, headless and visible. Run boundary checks, typecheck, invariant tests and production build. Report scope and limitations accurately; Pack 0A is not Pack-0 completion and does not pass §43's proof. Never merge the implementation PR unless separately instructed.

Apply `docs/COMPUTATIONAL_SCALING_AND_STATE_DISCIPLINE.md` as mandatory engineering guidance subordinate to Revision 4.0. Every substantial implementation PR must include its §9 Computational/state contract, declare growth dimensions and state lifecycles, and run the relevant deterministic structural growth probes; timings alone do not certify scaling.
