/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PlayerInit } from "../types";

/**
 * Safely read a key from PlayerInit
 */
export function getPluginValue<T = unknown>(
  init: PlayerInit,
  key: string,
): T | undefined {
  return (init as any)[key];
}

/**
 * Return a new PlayerInit with the given key set to value (or removed if undefined)
 */
export function setPluginValue<T = unknown>(
  init: PlayerInit,
  key: string,
  value: T | undefined,
): PlayerInit {
  if (value === undefined) {
    // remove the key
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [key]: _removed, ...rest } = init as any;
    return rest as PlayerInit;
  }
  return { ...(init as any), [key]: value } as PlayerInit;
}

/**
 * Remove plugin key from PlayerInit. Useful if plugin config is optional and disabled.
 */
export function removePluginKey(init: PlayerInit, key: string): PlayerInit {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [key]: _removed, ...rest } = init as any;
  return rest as PlayerInit;
}
