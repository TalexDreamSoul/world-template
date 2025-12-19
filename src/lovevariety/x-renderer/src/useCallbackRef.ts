import { useMemo, type RefObject } from "react";
import { useEventHandler } from "./useEventHandler.ts";

export function useCallbackRef<T>(callback: (current: T) => () => void) {
  const handler = useEventHandler(callback);
  return useMemo(() => {
    let current: T | null = null;
    let cleanup: () => void = () => undefined;
    return {
      get current() {
        return current;
      },
      set current(value: T | null) {
        current = value;
        if (value == null) {
          cleanup();
        } else {
          cleanup = handler(value);
        }
      },
    } as RefObject<T | null>;
  }, []);
}
