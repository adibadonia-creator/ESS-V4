import data from "./physical.json";
// Declared cultural compatibility contains no output or successful-schema ID.
export const EXPLORATION = Object.freeze(data.exploration);
export const COMPATIBLE_OPERATIONS = Object.freeze(
  data.compatibleOperations.map((o) => Object.freeze(o)),
);
export const OPERATION_INDEX = new Map(
  COMPATIBLE_OPERATIONS.map((o) => [o.id, o]),
);
export const MATERIAL_KIND_INDEX = new Map(
  data.materialKinds.map((k) => [k.id, k]),
);
export const MATERIAL_KINDS = Object.freeze(
  data.materialKinds.map((k) => Object.freeze(k)),
);
