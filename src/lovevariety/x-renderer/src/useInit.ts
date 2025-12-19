import { useRef } from "react";

const Marker = Symbol();

export function useInit<Fn extends (...args: unknown[]) => unknown>(
  fn: Fn,
  ...params: Parameters<Fn>
): ReturnType<Fn> {
  const ref = useRef<typeof Marker | ReturnType<Fn>>(Marker);
  if (ref.current === Marker) {
    ref.current = fn(...params) as ReturnType<Fn>;
  }
  return ref.current as ReturnType<Fn>;
}
