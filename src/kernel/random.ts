import { canonical, hash128 } from "./canonical";
import type { Key } from "./identity";
export const RNG_VERSION = "philox4x32-10-semantic-v1";
type Words4 = [number, number, number, number];
function product(a: number, b: number): [number, number] {
  const a0 = a & 65535,
    a1 = a >>> 16,
    b0 = b & 65535,
    b1 = b >>> 16;
  const p0 = a0 * b0,
    p1 = a1 * b0,
    p2 = a0 * b1;
  const carry = (p0 >>> 16) + (p1 & 65535) + (p2 & 65535);
  return [
    (a1 * b1 + (p1 >>> 16) + (p2 >>> 16) + (carry >>> 16)) >>> 0,
    Math.imul(a, b) >>> 0,
  ];
}
export function philox(counter: Words4, key: [number, number]): Words4 {
  let c = [...counter] as Words4,
    k = [...key];
  for (let r = 0; r < 10; r++) {
    const [hi0, lo0] = product(0xd2511f53, c[0]),
      [hi1, lo1] = product(0xcd9e8d57, c[2]);
    c = [(hi1 ^ c[1] ^ k[0]!) >>> 0, lo1, (hi0 ^ c[3] ^ k[1]!) >>> 0, lo0];
    k = [(k[0]! + 0x9e3779b9) >>> 0, (k[1]! + 0xbb67ae85) >>> 0];
  }
  return c;
}
function words(text: string): Words4 {
  const h = hash128(text);
  return [0, 8, 16, 24].map((i) => parseInt(h.slice(i, i + 8), 16)) as Words4;
}
export function draw(
  seed: string,
  domain: string,
  keys: readonly Key[],
  ordinal = 0,
): number {
  if (!Number.isSafeInteger(ordinal) || ordinal < 0 || !domain)
    throw new Error("Invalid RNG key");
  const k = words(canonical([RNG_VERSION, seed]));
  const c = words(canonical([domain, keys, ordinal]));
  return (philox(c, [k[0], k[1]])[0] + 0.5) / 2 ** 32;
}
