import { HASH_VERSION } from "./canonical";
import { RNG_VERSION } from "./random";
import { MATH_PROFILE } from "./numerics";
import { SOURCE_HASH, SPEC_HASH } from "./buildStamp";
export const versions = Object.freeze({
  model: "ESS-4.0-pack0a",
  schema: 2,
  source: SOURCE_HASH,
  spec: SPEC_HASH,
  rng: RNG_VERSION,
  numerical: MATH_PROFILE,
  hash: HASH_VERSION,
  runtime: "binary64-js-certified-v1",
  generator: "warped-fields-priority-flood-v1",
});
