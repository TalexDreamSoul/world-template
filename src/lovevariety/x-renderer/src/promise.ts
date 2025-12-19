/**
 * Represents a promise that includes its current state.
 * This type extends PromiseWithResolvers and adds a state property
 * that indicates whether the promise is pending, fulfilled, or rejected.
 * @template T The type of the value that the promise resolves to.
 */
export type PromiseWithState<T> = PromiseWithResolvers<T> &
  (
    | {
        state: "pending";
      }
    | {
        state: "fulfilled";
        value: T;
      }
    | {
        state: "rejected";
        error: unknown;
      }
  );

/**
 * Creates a promise cache that memoizes asynchronous operations based on input keys.
 * The cache stores {@link PromiseWithState} instances to avoid redundant computations.
 *
 * @template T - The type of the resolved value from the promise.
 * @template R - The type of the input key used for caching.
 * @param resolve - A function that takes an input of type `R` and returns a `Promise<T>`.
 * @returns An object that is both a function and has additional properties:
 * - The main function `(input: R) => PromiseWithState<T>` retrieves or creates a cached promise for the given input.
 * - `async: (input: R) => T | null` - A synchronous function that returns the resolved value if the promise is fulfilled, otherwise `null`.
 * - `clear: (input: R) => void` - A function to remove the cached entry for the given input.
 *
 * @example
 * ```typescript
 * const cachedResolve = createPromiseCache<number, string>((key) => fetchData(key));
 * const promise = cachedResolve("key1"); // Creates and caches the promise
 * const value = cachedResolve.async("key1"); // Returns null if not yet fulfilled
 * cachedResolve.clear("key1"); // Clears the cache for "key1"
 * ```
 */
export function createPromiseCache<T, R>(resolve: (input: R) => Promise<T>) {
  const cache = new Map<R, PromiseWithState<T>>();
  function fn(input: R): PromiseWithState<T> {
    let promise = cache.get(input);
    if (!promise) {
      promise = createPromiseWithState<T>();
      promise.resolve(resolve(input));
      cache.set(input, promise);
    }
    return promise;
  }
  function async(input: R): T | null {
    const promise = fn(input);
    return promise.state === "fulfilled" ? promise.value : null;
  }
  function clear(input: R) {
    cache.delete(input);
  }
  return Object.assign(fn, {
    async: Object.assign(async, { clear }),
    clear,
  });
}

/**
 * Creates a cached promise resolver that manages promises with state, allowing for automatic retry on rejection after a specified delay.
 *
 * This function returns a caching mechanism that stores promises based on input keys. If a promise for a given input is pending or fulfilled,
 * it returns the existing promise. If rejected, it schedules a reset to create a new promise after the `resetReject` delay.
 *
 * The returned function also includes an `async` getter property that synchronously returns the resolved value if the promise is fulfilled,
 * or `null` otherwise.
 *
 * @template R - The type of the resolved value of the promise.
 * @template T - The type of the input key used for caching.
 * @param resolver - A function that takes the input and a `PromiseWithState<R>` instance, and resolves or rejects the promise.
 * @param resetReject - The delay in milliseconds before resetting a rejected promise. Defaults to 1000ms.
 * @returns A function that takes an input `T` and returns a `PromiseWithState<R>`. The returned object also has an `async` property
 *          that is a getter returning a function `(input: T) => R | null`.
 *
 * @example
 * ```typescript
 * const cachedResolver = createPromiseCacheWithResolver<number, string>(
 *   (input, promise) => {
 *     // Simulate async operation
 *     setTimeout(() => {
 *       if (input === 'success') {
 *         promise.resolve(42);
 *       } else {
 *         promise.reject(new Error('Failed'));
 *       }
 *     }, 100);
 *   },
 *   2000
 * );
 *
 * const promise1 = cachedResolver('success'); // Creates and caches a new promise
 * const promise2 = cachedResolver('success'); // Returns the cached promise
 *
 * // Using the async getter
 * const value = cachedResolver.async('success'); // Returns 42 if fulfilled, null otherwise
 * ```
 */
export function createPromiseCacheWithResolver<R, T>(
  resolver: (input: T, promise: PromiseWithState<R>) => void,
  resetReject: number = 1000,
) {
  const cache = new Map<
    T,
    { pws: PromiseWithState<R>; resetTimer?: ReturnType<typeof setTimeout> }
  >();

  function fn(input: T): PromiseWithState<R> {
    let entry = cache.get(input);
    if (!entry) {
      const pws = createPromiseWithState<R>();
      resolver(input, pws);
      entry = { pws };
      cache.set(input, entry);
      return pws;
    }

    const { pws, resetTimer } = entry;
    if (pws.state === "pending" || pws.state === "fulfilled") {
      return pws;
    }

    // state is rejected
    if (!resetTimer) {
      const timer = setTimeout(() => {
        const newPws = createPromiseWithState<R>();
        resolver(input, newPws);
        entry!.pws = newPws;
        entry!.resetTimer = undefined;
      }, resetReject);
      entry.resetTimer = timer;
    }

    return pws;
  }
  return Object.assign(fn, {
    get async() {
      return (input: T) => {
        const promise = fn(input);
        return promise.state === "fulfilled" ? promise.value : null;
      };
    },
  });
}

/**
 * Creates a promise along with its resolvers and attaches a state property that tracks
 * the promise's status ("pending", "fulfilled", or "rejected"). The state is updated
 * automatically when the promise resolves or rejects, and the resolved value or rejection
 * error is stored in the `value` or `error` property, respectively.
 *
 * @template T - The type of the value that the promise resolves to.
 * @returns {PromiseWithState<T>} An object containing the promise, its resolve and reject
 * functions, the current state, and optionally the resolved value or rejection error.
 */
export function createPromiseWithState<T>(): PromiseWithState<T> {
  const resolvers = Promise.withResolvers<T>();
  const ret: PromiseWithResolvers<T> & {
    state: "pending" | "fulfilled" | "rejected";
    value?: T;
    error?: unknown;
  } = {
    ...resolvers,
    state: "pending",
  };
  resolvers.promise.then(
    (value) => {
      ret.state = "fulfilled";
      ret.value = value;
    },
    (error) => {
      ret.state = "rejected";
      ret.error = error;
    },
  );
  return ret as PromiseWithState<T>;
}
