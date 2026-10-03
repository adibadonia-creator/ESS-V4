// Fixed binary64 operation order. Certification is bounded to the gate's runtimes.
// Native pow differs in the last bit between our Node and browser V8 builds.
export const MATH_PROFILE = "binary64-polynomial-survival-v1-finite-guard";
const LN2 = 0.6931471805599453;
function exp(x: number): number {
  if (!Number.isFinite(x)) throw Error("Nonfinite causal exponential");
  if (x === 0) return 1;
  if (x < -745) return 0;
  if (x > 709) throw Error("Causal exponential overflow");
  const k = Math.floor(x / LN2 + 0.5),
    r = x - k * LN2;
  let term = 1,
    sum = 1;
  for (let i = 1; i <= 18; i++) {
    term *= r / i;
    sum += term;
  }
  return sum * 2 ** k;
}
function log(x: number): number {
  if (x === 1) return 0;
  if (!(x > 0) || !Number.isFinite(x)) throw Error("Invalid causal logarithm");
  let m = x,
    k = 0;
  while (m >= 1.4142135623730951) {
    m *= 0.5;
    k++;
  }
  while (m < 0.7071067811865476) {
    m *= 2;
    k--;
  }
  const z = (m - 1) / (m + 1),
    square = z * z;
  let term = z,
    sum = z;
  for (let i = 3; i <= 61; i += 2) {
    term *= square;
    sum += term / i;
  }
  return k * LN2 + 2 * sum;
}
function log1p(x: number): number {
  if (x === 0) return 0;
  if (x <= -1 || !Number.isFinite(x)) throw Error("Invalid causal log1p");
  if (Math.abs(x) > 0.5) return log(1 + x);
  const z = x / (2 + x),
    square = z * z;
  let term = z,
    sum = z;
  for (let i = 3; i <= 61; i += 2) {
    term *= square;
    sum += term / i;
  }
  return 2 * sum;
}
function expm1(x: number): number {
  if (!Number.isFinite(x)) throw Error("Nonfinite causal expm1");
  if (Math.abs(x) > 0.5) return exp(x) - 1;
  let term = x,
    sum = x;
  for (let i = 2; i <= 18; i++) {
    term *= x / i;
    sum += term;
  }
  return sum;
}
function tanh(x: number): number {
  if (!Number.isFinite(x)) throw Error("Nonfinite causal tanh");
  if (x >= 20) return 1;
  if (x <= -20) return -1;
  const e = exp(2 * x);
  return (e - 1) / (e + 1);
}
export const math = Object.freeze({
  exp,
  log,
  log1p,
  expm1,
  tanh,
  pow: (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y))
      throw Error("Nonfinite causal power");
    return x === 0 && y > 0 ? 0 : exp(y * log(x));
  },
  sqrt: (x: number) => {
    if (!Number.isFinite(x) || x < 0) throw Error("Invalid causal square root");
    return Math.sqrt(x);
  },
});
