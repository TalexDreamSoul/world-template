import type { plugins } from "@miehoukingdom/world-interface";

/**
 * 玩家初始化配置，合并所有插件的初始化字段
 * 使用 Partial 使所有字段都是可选的
 */
export type PlayerInit = Partial<
  plugins.fixed.PluginInit & plugins.team.PluginInit
>;
