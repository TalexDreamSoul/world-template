// Small typed event emitter utilities.
// Provides createEmitter (standalone) and useEmitter (hook wrapper)
import { useRef } from "react";

export type Callback<T> = (payload: T) => void | Promise<void>;

export interface Emitter<T> {
  subscribe(cb: Callback<T>): () => void;
  once(cb: Callback<T>): () => void;
  emit(payload: T): void;
  clear(): void;
  size(): number;
}

export function createEmitter<T>(): Emitter<T> {
  const listeners = new Set<Callback<T>>();

  function subscribe(cb: Callback<T>): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function once(cb: Callback<T>): () => void {
    const wrapped: Callback<T> = (payload) => {
      try {
        cb(payload);
      } finally {
        listeners.delete(wrapped);
      }
    };
    listeners.add(wrapped);
    return () => listeners.delete(wrapped);
  }

  function emit(payload: T) {
    // snapshot iteration to avoid issues if handlers mutate listeners during emit
    const snapshot = Array.from(listeners);
    for (const cb of snapshot) {
      try {
        cb(payload);
      } catch (e) {
        // swallow by default; consumers can handle their errors
        console.error("Emitter listener error:", e);
      }
    }
  }

  function clear() {
    listeners.clear();
  }

  function size() {
    return listeners.size;
  }

  return { subscribe, once, emit, clear, size };
}

// Hook wrapper for use inside React components/hooks
export function useEmitter<T>() {
  const ref = useRef<Emitter<T> | null>(null);
  if (!ref.current) ref.current = createEmitter<T>();
  return ref.current as Emitter<T>;
}

// Map-based emitter for multiple named events
export type EmitterMap<M extends object> = {
  subscribe<K extends keyof M>(event: K, cb: Callback<M[K]>): () => void;
  once<K extends keyof M>(event: K, cb: Callback<M[K]>): () => void;
  emit<K extends keyof M>(event: K, payload: M[K]): void;
  clear(event?: keyof M): void;
  size(event?: keyof M): number;
};

export function createEmitterMap<M extends object>(): EmitterMap<M> {
  const map = new Map<keyof M, Set<Callback<unknown>>>();

  function ensureSet<K extends keyof M>(event: K) {
    let s = map.get(event);
    if (!s) {
      s = new Set();
      map.set(event, s);
    }
    return s as Set<Callback<M[K]>>;
  }

  function subscribe<K extends keyof M>(event: K, cb: Callback<M[K]>) {
    ensureSet(event).add(cb as Callback<M[K]>);
    return () =>
      (map.get(event) as Set<Callback<M[K]>>)!.delete(cb as Callback<M[K]>);
  }

  function once<K extends keyof M>(event: K, cb: Callback<M[K]>) {
    const wrapped: Callback<M[K]> = (payload) => {
      try {
        cb(payload);
      } finally {
        (map.get(event) as Set<Callback<M[K]>>)!.delete(wrapped);
      }
    };
    ensureSet(event).add(wrapped);
    return () => (map.get(event) as Set<Callback<M[K]>>)!.delete(wrapped);
  }

  function emit<K extends keyof M>(event: K, payload: M[K]) {
    const set = map.get(event);
    if (!set) return;
    const snapshot = Array.from(set) as Callback<M[K]>[];
    for (const cb of snapshot) {
      try {
        cb(payload);
      } catch (e) {
        console.error("EmitterMap listener error:", e);
      }
    }
  }

  function clear(event?: keyof M) {
    if (event === undefined) return map.clear();
    map.delete(event);
  }

  function size(event?: keyof M) {
    if (event === undefined)
      return Array.from(map.values()).reduce((acc, s) => acc + s.size, 0);
    const s = map.get(event);
    return s ? s.size : 0;
  }

  return { subscribe, once, emit, clear, size } as EmitterMap<M>;
}

export function useEmitterMap<M extends object>() {
  const ref = useRef<EmitterMap<M> | null>(null);
  if (!ref.current) ref.current = createEmitterMap<M>();
  return ref.current as EmitterMap<M>;
}
