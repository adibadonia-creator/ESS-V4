// Persistent ordered index. Writes copy only a balanced root-to-leaf path.
// Immutable roots make review premises and geography versions cheap to pin.
export type Tree<T> = Readonly<{
  key: string;
  value: T;
  left: Tree<T>;
  right: Tree<T>;
  height: number;
}> | null;
const height = <T>(t: Tree<T>) => t?.height ?? 0;
function node<T>(
  key: string,
  value: T,
  left: Tree<T>,
  right: Tree<T>,
): Tree<T> {
  return Object.freeze({
    key,
    value,
    left,
    right,
    height: 1 + Math.max(height(left), height(right)),
  });
}
function balance<T>(
  key: string,
  value: T,
  left: Tree<T>,
  right: Tree<T>,
): Tree<T> {
  if (height(left) - height(right) > 1) {
    const l = left!;
    if (height(l.left) >= height(l.right))
      return node(l.key, l.value, l.left, node(key, value, l.right, right));
    const m = l.right!;
    return node(
      m.key,
      m.value,
      node(l.key, l.value, l.left, m.left),
      node(key, value, m.right, right),
    );
  }
  if (height(right) - height(left) > 1) {
    const r = right!;
    if (height(r.right) >= height(r.left))
      return node(r.key, r.value, node(key, value, left, r.left), r.right);
    const m = r.left!;
    return node(
      m.key,
      m.value,
      node(key, value, left, m.left),
      node(r.key, r.value, m.right, r.right),
    );
  }
  return node(key, value, left, right);
}
export function put<T>(t: Tree<T>, key: string, value: T): Tree<T> {
  if (!t) return node(key, value, null, null);
  if (key === t.key) return node(key, value, t.left, t.right);
  return key < t.key
    ? balance(t.key, t.value, put(t.left, key, value), t.right)
    : balance(t.key, t.value, t.left, put(t.right, key, value));
}
export function drop<T>(t: Tree<T>, key: string): Tree<T> {
  if (!t) return null;
  if (key < t.key) return balance(t.key, t.value, drop(t.left, key), t.right);
  if (key > t.key) return balance(t.key, t.value, t.left, drop(t.right, key));
  if (!t.left) return t.right;
  if (!t.right) return t.left;
  let successor = t.right;
  while (successor.left) successor = successor.left;
  return balance(
    successor.key,
    successor.value,
    t.left,
    drop(t.right, successor.key),
  );
}
export function get<T>(
  t: Tree<T>,
  key: string,
  visit: () => void = () => {},
): T | null {
  while (t) {
    visit();
    if (key === t.key) return t.value;
    t = key < t.key ? t.left : t.right;
  }
  return null;
}
export function range<T>(
  t: Tree<T>,
  lower: string,
  upper: string,
  limit: number,
  visit: () => void = () => {},
): { key: string; value: T }[] {
  if (!Number.isSafeInteger(limit) || limit < 0)
    throw Error("Invalid indexed read limit");
  const out: { key: string; value: T }[] = [];
  function walk(n: Tree<T>): void {
    if (!n || out.length >= limit) return;
    visit();
    if (n.key > lower) walk(n.left);
    if (out.length < limit && n.key > lower && n.key < upper)
      out.push({ key: n.key, value: n.value });
    if (n.key < upper) walk(n.right);
  }
  walk(t);
  return out;
}
export function entries<T>(t: Tree<T>): T[] {
  return range(t, "", "\uffff", Number.MAX_SAFE_INTEGER).map((x) => x.value);
}
// Cold restore validation: a persisted accelerator must preserve ordered lookup.
export function validateTree<T>(t: Tree<T>, keyOf: (value: T) => string): void {
  function walk(n: Tree<T>, lower: string, upper: string): number {
    if (!n) return 0;
    if (n.key <= lower || n.key >= upper || n.key !== keyOf(n.value))
      throw Error("Invalid persisted index key/order");
    const left = walk(n.left, lower, n.key),
      right = walk(n.right, n.key, upper);
    if (n.height !== 1 + Math.max(left, right) || Math.abs(left - right) > 1)
      throw Error("Invalid persisted index balance");
    return n.height;
  }
  walk(t, "", "\uffff");
}
// Storage/hash normal form: an accelerator's tree shape is not causal identity.
export function canonicalTree<T>(t: Tree<T>): Tree<T> {
  const rows = range(t, "", "\uffff", Number.MAX_SAFE_INTEGER);
  function build(start: number, end: number): Tree<T> {
    if (start === end) return null;
    const middle = (start + end) >>> 1,
      row = rows[middle]!;
    return node(
      row.key,
      row.value,
      build(start, middle),
      build(middle + 1, end),
    );
  }
  return build(0, rows.length);
}
export function immutable<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) immutable(child);
    Object.freeze(value);
  }
  return value;
}
