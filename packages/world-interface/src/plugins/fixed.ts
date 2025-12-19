import type { Direction } from "@miehoukingdom/world-runtime";
import type { Plugin } from "../api.ts";

export type FixedProps = {
  x: number;
  y: number;
  direction: Direction;
};

export type PluginInit = {
  fixed?: FixedProps;
};

export interface PluginInterface extends Plugin<PluginInit> {}

export function create(): PluginInterface {
  return { name: "fixed" };
}
