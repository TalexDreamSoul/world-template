import { type DependencyList, useEffect } from "react";

export function withAbort(fn: (signal: AbortSignal) => unknown) {
  const controller = new AbortController();
  fn(controller.signal);
  return () => controller.abort();
}

export function useAbortableEffect(
  handler: (signal: AbortSignal) => unknown,
  dependencies: DependencyList = [],
) {
  useEffect(() => withAbort(handler), dependencies);
}
