import type { Plugin, ScriptMetadata } from "@miehoukingdom/world-interface";
import { useCallback } from "react";
import { AutoTransition } from "../common/index.ts";
import type { PlayerInit } from "../types.ts";
import { getPluginConfigDescriptor } from "./pluginRegistry.ts";
import { getPluginValue, setPluginValue } from "./pluginUtils.ts";

export interface PlayerConfigProps {
  /**
   * 脚本元数据，包含插件列表
   */
  metadata: ScriptMetadata;
  /**
   * 当前玩家的配置值
   */
  value: PlayerInit;
  /**
   * 配置变更回调
   */
  onChange: (value: PlayerInit) => void;
}

export function PlayerConfig({ metadata, value, onChange }: PlayerConfigProps) {
  const pluginsList = metadata.plugins;

  // 没有插件时显示空状态
  if (pluginsList.length === 0) {
    return (
      <div className="text-ctp-subtext1 border-ctp-surface2 mb-3 rounded-lg border border-dashed py-6 text-center text-sm">
        暂无配置项
      </div>
    );
  }

  return (
    <AutoTransition as="div" className="mb-3 space-y-2">
      {pluginsList.map((plugin) => {
        const descriptor = getPluginConfigDescriptor(plugin.name);
        if (!descriptor) {
          return (
            <div
              key={plugin.name}
              className="text-ctp-subtext0 bg-ctp-surface0 rounded-lg p-3 text-sm"
            >
              未知插件: {plugin.name}
            </div>
          );
        }

        const pluginKey = descriptor.key;
        const pluginValue = getPluginValue(value, pluginKey);
        const boundOnChange = useCallback(
          (v: unknown) => {
            onChange(setPluginValue(value, pluginKey, v as unknown));
          },
          [value, onChange, pluginKey],
        );

        const Component = descriptor.Component as React.ComponentType<
          Record<string, unknown>
        >;
        const extraProps = descriptor.mapPluginToProps
          ? descriptor.mapPluginToProps(plugin as Plugin<unknown>)
          : ({} as Record<string, unknown>);

        return (
          <Component
            key={`plugin-${plugin.name}`}
            value={pluginValue}
            onChange={boundOnChange}
            {...extraProps}
          />
        );
      })}
    </AutoTransition>
  );
}
