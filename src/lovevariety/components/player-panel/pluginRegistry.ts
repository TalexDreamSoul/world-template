import type { Plugin, plugins } from "@miehoukingdom/world-interface";
import type { ComponentType } from "react";
import { FixedPluginConfig } from "./plugins/FixedPluginConfig.tsx";
import { TeamPluginConfig } from "./plugins/TeamPluginConfig.tsx";

/**
 * Generic PluginConfigProps, used by all plugin UI components
 */
export interface PluginConfigProps<T> {
  value: T | undefined;
  onChange: (value: T | undefined) => void;
}

export type PluginConfigComponent<T, Extra = {}> = ComponentType<
  PluginConfigProps<T> & Extra
>;

export type PluginConfigDescriptor = {
  /** The component that renders config UI */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: PluginConfigComponent<unknown, any>;
  /** The property key on PlayerInit for this plugin */
  key: string;
  /** Optional adapter to map the Plugin object to extra props for the component */
  mapPluginToProps?: (plugin: Plugin<unknown>) => Record<string, unknown>;
};

export const pluginConfigRegistry: Record<string, PluginConfigDescriptor> = {
  fixed: {
    Component: FixedPluginConfig as PluginConfigComponent<
      plugins.fixed.FixedProps,
      Record<string, never>
    >,
    key: "fixed",
  },
  team: {
    Component: TeamPluginConfig as PluginConfigComponent<
      number,
      { teams: plugins.team.Team[] }
    >,
    key: "team",
    mapPluginToProps: (plugin: Plugin<unknown>) => {
      const p = plugin as plugins.team.PluginInterface;
      return { teams: p.teams };
    },
  },
};

export function getPluginConfigDescriptor(
  pluginName: string,
): PluginConfigDescriptor | undefined {
  return pluginConfigRegistry[pluginName];
}
