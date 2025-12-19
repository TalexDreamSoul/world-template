/**
 * Minimal binary min-heap priority queue for numeric priorities.
 * Keys are numbers (node indices). Stable for our A* use-case.
 */
export class MinHeap {
  private heap: { key: number; priority: number }[] = [];
  private keyToIndex: Map<number, number> = new Map();

  get size(): number {
    return this.heap.length;
  }

  push(key: number, priority: number): void {
    if (this.keyToIndex.has(key)) return; // Already in heap
    this.heap.push({ key, priority });
    const idx = this.heap.length - 1;
    this.keyToIndex.set(key, idx);
    this.siftUp(idx);
  }

  pop(): { key: number; priority: number } | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0]!;
    this.keyToIndex.delete(top.key);
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.keyToIndex.set(last.key, 0);
      this.siftDown(0);
    }
    return top;
  }

  contains(key: number): boolean {
    return this.keyToIndex.has(key);
  }

  decreasePriority(key: number, newPriority: number): void {
    const idx = this.keyToIndex.get(key);
    if (idx === undefined) {
      this.push(key, newPriority);
      return;
    }
    if (newPriority < this.heap[idx]!.priority) {
      this.heap[idx]!.priority = newPriority;
      this.siftUp(idx);
    }
  }

  private siftUp(idx: number): void {
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (this.heap[parent]!.priority <= this.heap[idx]!.priority) break;
      this.swap(parent, idx);
      idx = parent;
    }
  }

  private siftDown(idx: number): void {
    const len = this.heap.length;
    while (true) {
      const left = idx * 2 + 1;
      const right = idx * 2 + 2;
      let smallest = idx;
      if (
        left < len &&
        this.heap[left]!.priority < this.heap[smallest]!.priority
      )
        smallest = left;
      if (
        right < len &&
        this.heap[right]!.priority < this.heap[smallest]!.priority
      )
        smallest = right;
      if (smallest === idx) break;
      this.swap(idx, smallest);
      idx = smallest;
    }
  }

  private swap(a: number, b: number): void {
    const tmp = this.heap[a]!;
    this.heap[a] = this.heap[b]!;
    this.heap[b] = tmp;
    this.keyToIndex.set(this.heap[a]!.key, a);
    this.keyToIndex.set(this.heap[b]!.key, b);
  }
}

export default MinHeap;
