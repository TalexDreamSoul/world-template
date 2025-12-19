import type {
  PlayerInfo,
  ScriptMetadata,
  ScriptPlatformEventMap,
} from "@miehoukingdom/world-interface";
import type { MapSchema, PlayerSchema } from "../../db.ts";
import type { Emitter, EmitterMap } from "../../utils/events.ts";
import type { PlayerInit } from "../types.ts";
import type { EventLogStore } from "./eventLog/index.ts";

/**
 * Sandbox 组件的 Props
 */
export type ScriptSandboxProps = {
  map: MapSchema.Map;
  script: string;
};

/**
 * 玩家同步信息（与 world-renderer 的 syncPlayerInfo 兼容）
 */
export type PlayerSyncInfo = Record<string, PlayerInfo>;

/**
 * 玩家同步订阅回调
 */
// PlayerSyncCallback: removed in favor of using the Emitter API's subscribe types

/**
 * Renderer 事件映射类型
 */
export type RendererEventMap = {
  playerClicked: { playerId: string };
};

/**
 * Sandbox 上下文值类型
 */
export type SandboxContextValue = {
  // 地图信息
  map: MapSchema.Map;
  script: string;
  metadata: ScriptMetadata;

  // 玩家状态
  allPlayers: PlayerSchema.Player[] | undefined;
  selectedPlayers: Record<string, PlayerInit>;
  selectedPlayerObjects: PlayerSchema.Player[];

  // 后端与 tick 控制
  autoTick: boolean;
  setAutoTick: (value: boolean) => void;
  manualTick: () => Promise<void>;
  saveSnapshot: () => Promise<Uint8Array | null>;

  // 玩家管理方法
  addPlayer: (player: PlayerSchema.Player, config: PlayerInit) => void;
  removePlayer: (playerId: string) => void;
  updatePlayerConfig: (playerId: string, config: PlayerInit) => void;

  // 玩家同步事件发射器（供 Renderer 使用）
  playerSync: Emitter<PlayerSyncInfo>;
  // 后端平台事件发射器（供 Renderer 或 UI 使用）
  platformEvents: EmitterMap<ScriptPlatformEventMap>;
  rendererEvents: EmitterMap<RendererEventMap>;

  // 事件日志 store（使用 tuple-database 管理状态）
  eventLogStore: EventLogStore;
};
