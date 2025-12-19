import type { Plugin } from "../api.ts";

export type PluginInit = {
  team: number;
};

export interface PluginInterface extends Plugin<PluginInit> {
  teams: Team[];
}

export type Team = {
  name: string;
  color: string;
  base: number;
  multiplier: number;
};

export function create(...teams: Team[]): PluginInterface {
  return { name: "team", teams };
}
