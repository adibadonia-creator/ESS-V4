// PORT WITH SIMPLIFICATION: V1 scheduler push/pop. Mutable; no array copying,
// insertion-order tie-breaking, cancellation lists or world dependencies.
export class Heap<T> {
  readonly items: T[];
  constructor(
    private compare: (a: T, b: T) => number,
    items: T[] = [],
    heapify = true,
  ) {
    this.items = items;
    if (heapify)
      for (let i = Math.floor(items.length / 2) - 1; i >= 0; i--) this.down(i);
  }
  peek(): T | undefined {
    return this.items[0];
  }
  push(v: T): void {
    let i = this.items.push(v) - 1;
    while (i > 0) {
      const p = (i - 1) >>> 1;
      if (this.compare(this.items[p]!, v) <= 0) break;
      this.items[i] = this.items[p]!;
      i = p;
    }
    this.items[i] = v;
  }
  pop(): T | undefined {
    const first = this.items[0],
      last = this.items.pop();
    if (this.items.length && last !== undefined) {
      this.items[0] = last;
      this.down(0);
    }
    return first;
  }
  private down(i: number): void {
    const value = this.items[i]!;
    while (true) {
      const l = i * 2 + 1,
        r = l + 1;
      if (l >= this.items.length) break;
      const c =
        r < this.items.length &&
        this.compare(this.items[r]!, this.items[l]!) < 0
          ? r
          : l;
      if (this.compare(value, this.items[c]!) <= 0) break;
      this.items[i] = this.items[c]!;
      i = c;
    }
    this.items[i] = value;
  }
}
