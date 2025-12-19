import { proxy } from "valtio";
import { useInit } from "./useInit.ts";

export type Proxied<T> = { value: T };

/**
 * Creates a proxied version of the initial value using a proxy mechanism.
 * This function initializes a proxy object that wraps the provided initial value,
 * allowing for reactive or observable behavior.
 *
 * @template T - The type of the initial value.
 * @param initial - The initial value to be proxied.
 * @returns A proxied object containing the initial value.
 */
export function useProxied<T>(initial: T) {
  return useInit(() => proxy<Proxied<T>>({ value: initial }));
}
