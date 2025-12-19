import type { ScriptMetadata } from "@miehoukingdom/world-interface";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAsyncTupleDatabase } from "tuple-database/useAsyncTupleDatabase";
import { db, PlayerSchema, type MapSchema } from "../../db.ts";
import { useEmitter, useEmitterMap } from "../../utils/events.ts";
import { parseScriptMetadata } from "../../utils/parseScriptMetadata.ts";
import { useSubspace } from "../../utils/useSubspace.ts";
import type { PlayerInit } from "../types.ts";
import {
  createEventLogStore,
  useEventLogSubscription,
  type EventLogStore,
} from "./eventLog/index.ts";
import type {
  PlayerSyncInfo,
  RendererEventMap,
  SandboxContextValue,
} from "./types.ts";
import { useSandboxBackend } from "./useSandboxBackend.ts";

const SandboxContext = createContext<SandboxContextValue | null>(null);

export type SandboxProviderProps = {
  map: MapSchema.Map;
  script: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraOptions?: any;
  children: React.ReactNode;
};

/**
 * Sandbox 状态提供者
 * 管理玩家选择、后端通信和 tick 控制
 */
export function SandboxProvider({
  map,
  script,
  extraOptions,
  children,
}: SandboxProviderProps) {
  // 解析脚本元数据
  const metadata = useMemo<ScriptMetadata>(
    () => parseScriptMetadata(script),
    [script],
  );

  // 已选角色状态：playerId -> PlayerInit 配置
  const [selectedPlayers, setSelectedPlayers] = useState<
    Record<string, PlayerInit>
  >({});

  // 从数据库加载所有可用角色
  const playerSubspace = useSubspace(db, "player");
  const allPlayers = useAsyncTupleDatabase(
    playerSubspace,
    PlayerSchema.list,
    [],
  );

  // 计算已选玩家对象数组
  const selectedPlayerObjects = useMemo(
    () =>
      allPlayers?.filter((p) => Object.keys(selectedPlayers).includes(p.id)) ??
      [],
    [allPlayers, selectedPlayers],
  );

  // 后端管理
  // 提前创建 emitters，使得渲染和后端共享同一个事件通道
  const playerSync = useEmitter<PlayerSyncInfo>();
  const platformEvents =
    useEmitterMap<
      import("@miehoukingdom/world-interface").ScriptPlatformEventMap
    >();

  const { autoTick, setAutoTick, manualTick, syncPlayers, saveSnapshot } =
    useSandboxBackend({
      script,
      mapManifest: map.manifest,
      playerSyncEmitter: playerSync,
      platformEmitter: platformEvents,
      extraOptions,
    });

  // 当选中角色变化时同步到后端
  useEffect(() => {
    syncPlayers(selectedPlayers);
  }, [selectedPlayers, syncPlayers]);

  // 添加角色（带配置）
  const addPlayer = useCallback(
    (player: PlayerSchema.Player, config: PlayerInit) => {
      setSelectedPlayers((prev) => ({
        ...prev,
        [player.id]: config,
      }));
    },
    [],
  );

  // 移除角色
  const removePlayer = useCallback((playerId: string) => {
    setSelectedPlayers((prev) => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
  }, []);

  // 更新角色配置
  const updatePlayerConfig = useCallback(
    (playerId: string, config: PlayerInit) => {
      setSelectedPlayers((prev) => ({
        ...prev,
        [playerId]: config,
      }));
    },
    [],
  );

  const rendererEvents = useEmitterMap<RendererEventMap>();

  // 事件日志 store（使用 useRef 确保在 Provider 生命周期内保持稳定）
  const eventLogStoreRef = useRef<EventLogStore | null>(null);
  if (!eventLogStoreRef.current) {
    eventLogStoreRef.current = createEventLogStore();
  }
  const eventLogStore = eventLogStoreRef.current;

  // 订阅平台事件到日志 store
  useEventLogSubscription(platformEvents, eventLogStore);

  const contextValue = useMemo<SandboxContextValue>(
    () => ({
      map,
      script,
      metadata,
      allPlayers,
      selectedPlayers,
      selectedPlayerObjects,
      autoTick,
      setAutoTick,
      manualTick,
      saveSnapshot,
      addPlayer,
      removePlayer,
      updatePlayerConfig,
      playerSync,
      platformEvents,
      rendererEvents,
      eventLogStore,
    }),
    [
      map,
      script,
      metadata,
      allPlayers,
      selectedPlayers,
      selectedPlayerObjects,
      autoTick,
      setAutoTick,
      manualTick,
      saveSnapshot,
      addPlayer,
      removePlayer,
      updatePlayerConfig,
      playerSync,
      platformEvents,
      rendererEvents,
      eventLogStore,
    ],
  );

  return (
    <SandboxContext.Provider value={contextValue}>
      {children}
    </SandboxContext.Provider>
  );
}

/**
 * 获取 Sandbox 上下文的 hook
 * @throws 如果在 SandboxProvider 外部使用
 */
export function useSandboxContext(): SandboxContextValue {
  const context = useContext(SandboxContext);
  if (!context) {
    throw new Error("useSandboxContext must be used within a SandboxProvider");
  }
  return context;
}
