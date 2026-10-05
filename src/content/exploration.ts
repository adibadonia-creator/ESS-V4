import data from "./physical.json";
// Declared cultural compatibility contains no output or successful-schema ID.
export const EXPLORATION = Object.freeze(data.exploration);
export const COMPATIBLE_OPERATIONS = Object.freeze(
  data.compatibleOperations.map((o) => Object.freeze(o)),
);
export const MATERIAL_KINDS = Object.freeze(
  data.materialKinds.map((k) => Object.freeze(k)),
);
