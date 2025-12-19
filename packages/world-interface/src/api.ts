import type { JSONSchema } from "@codehz/ts-json-schema";
import type { PlayerInfo } from "./components.ts";

export interface ScriptTickResult {
  players: Record<string, PlayerInfo>;
}

export interface ScriptApi<PlayerInit> {
  /**
   * 设置角色列表，可以在运行时调用，更改当前角色列表
   */
  setupPlayers(players: Record<string, PlayerInit>): void;
  /**
   * 执行一帧世界逻辑，返回当前的世界状态
   */
  tick(): ScriptTickResult;
  /**
   * 保存当前世界状态，返回序列化数据
   */
  save?(): Uint8Array;
}

export interface MapStructure {
  width: number;
  height: number;
  tiles: number[];
  spawnPoints: { x: number; y: number }[];
  portals: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    direction: "up" | "down" | "left" | "right" | "none";
  }[];
  areas: {
    name: string;
    description: string;
    cells: { x: number; y: number }[];
  }[];
}

export interface ScriptPlatformEventMap {
  "thinking:start": {
    /** 玩家 ID */
    playerId: string;
    /** 思考内容 */
    content: string;
  };
  "thinking:end": {
    /** 玩家 ID */
    playerId: string;
  };

  /** 对话开始事件，包含对话 ID 和参与玩家列表 */
  "conversation:start": {
    /**
     * 对话 ID，用于后续更新和结束对话
     */
    conversationId: string;
    /**
     * 参与对话的玩家 ID 列表
     */
    playerIds: string[];
  };
  /** 对话更新事件，表示有新的消息 */
  "conversation:update": {
    /** 对话 ID */
    conversationId: string;
    /**
     * 消息来源玩家 ID（如果有的话）
     * 没有则表示系统消息（如旁白）
     */
    source?: string;
    /** 消息内容，暂定为纯文本 */
    content: string;
  };
  /** 对话结束事件，表示对话已结束 */
  "conversation:end": {
    /** 对话 ID */
    conversationId: string;
  };
}

export interface ScriptPlatform {
  emitEvent<K extends keyof ScriptPlatformEventMap>(
    event: K,
    data: ScriptPlatformEventMap[K],
  ): void;
}

export interface ScriptInitOptions<ExtraOptions = void> {
  /**
   * 加载已保存的数据，如果有的话
   */
  savedData?: Uint8Array;
  /**
   * 地图结构数据
   */
  structure: MapStructure;
  /**
   * 运行脚本的平台接口
   */
  platform: ScriptPlatform;
  /**
   * 额外的初始化选项
   */
  extraOptions: ExtraOptions;
}

declare const __PlayerInitExtension: unique symbol;

export interface Plugin<T> {
  [__PlayerInitExtension]?: T;
  name: string;
}

type MergePlayerInit<plugins extends Plugin<unknown>[]> =
  // When no plugins are provided, return an empty object type instead of `never`.
  // Otherwise, produce a union of all plugin PlayerInit types.
  plugins extends []
    ? {}
    : {
        [K in keyof plugins]: plugins[K] extends Plugin<infer T> ? T : never;
      }[number];

/**
 * Script metadata describes a script entry point but excludes the runtime `create` function.
 * This is useful for serializing a short manifest embedded into JavaScript files (e.g. via
 * //{"name":"xxx","description":"xxx","plugins":[]}).
 */
export interface ScriptMetadata<
  Plugins extends Plugin<unknown>[] = Plugin<unknown>[],
> {
  name: string;
  description: string;
  plugins: Plugins;
  extra?: JSONSchema;
}

export interface ScriptEntrypoint<
  Plugins extends Plugin<unknown>[] = [],
  ExtraOptions = void,
> extends ScriptMetadata<Plugins> {
  /**
   * 创建一个新的世界实例
   */
  create(
    options: ScriptInitOptions<ExtraOptions>,
  ): ScriptApi<MergePlayerInit<Plugins>>;
}

export function defineScriptEntrypoint<Plugins extends Plugin<unknown>[] = []>(
  name: string,
  description: string,
  ...plugins: Plugins
): <ExtraOptions = void>(
  create: (
    options: ScriptInitOptions<ExtraOptions>,
  ) => ScriptApi<MergePlayerInit<Plugins>>,
) => ScriptEntrypoint<Plugins, ExtraOptions> {
  return (create) => ({
    name,
    description,
    plugins,
    create,
  });
}
