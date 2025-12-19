import { useCallback, useInsertionEffect, useRef } from "react";

/**
 * A React hook that creates a stable event handler function, ensuring that asynchronous callbacks
 * are not executed concurrently. If the callback returns a Promise, subsequent calls are blocked
 * until the Promise resolves or rejects, preventing overlapping executions.
 *
 * @template Args - The argument types of the callback function.
 * @template Result - The return type of the callback function.
 * @param callback - The callback function to be wrapped and executed with concurrency control.
 * @returns A stable function that can be used as an event handler, with built-in locking for async operations.
 */
export function useEventHandler<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): typeof callback {
  const latestRef = useRef<typeof callback>(
    shouldNotBeInvokedBeforeMount as typeof callback,
  );
  const lockRef = useRef(false);
  useInsertionEffect(() => {
    latestRef.current = callback;
  }, [callback]);
  return useCallback<typeof callback>((...args) => {
    if (lockRef.current) return null as never;
    const fn = latestRef.current;
    const ret = fn(...args);
    if (ret instanceof Promise) {
      lockRef.current = true;
      ret.finally(() => (lockRef.current = false));
      return ret;
    }
    return ret;
  }, []);
}

function shouldNotBeInvokedBeforeMount() {
  throw new Error(
    "foxact: the stablized handler cannot be invoked before the component has mounted.",
  );
}
