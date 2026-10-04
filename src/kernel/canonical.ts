export function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Nonfinite causal value");
    return JSON.stringify(value);
  }
  if (typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (ArrayBuffer.isView(value))
    return canonical(Array.from(value as unknown as ArrayLike<number>));
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(o)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonical(o[k]))
        .join(",") +
      "}"
    );
  }
  throw new Error("Unsupported causal value");
}
// PORT WITH SIMPLIFICATION of V2's FNV primitive. Four domain-separated lanes
// plus final avalanche form versioned 128-bit non-cryptographic identity/digests.
export function hash32(text: string, initial = 2166136261): number {
  let h = initial;
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h;
}
export const HASH_VERSION = "fnv4-avalanche-128-v1";
export function hash128(text: string): string {
  return [2166136261, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35]
    .map((s) => {
      let h = hash32(text, s);
      h ^= h >>> 16;
      h = Math.imul(h, 0x85ebca6b);
      h ^= h >>> 13;
      h = Math.imul(h, 0xc2b2ae35);
      h ^= h >>> 16;
      return (h >>> 0).toString(16).padStart(8, "0");
    })
    .join("");
}
export function digest(value: unknown): string {
  return hash128(canonical(value));
}
export function compareKey(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
