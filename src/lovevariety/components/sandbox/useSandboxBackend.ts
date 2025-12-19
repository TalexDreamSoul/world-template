import type {
  MapStructure,
  ScriptPlatformEventMap,
} from "@miehoukingdom/world-interface";
import { useCallback, useEffect, useRef, useState } from "react";
import { launch } from "../../script-worker/launch.ts";
import { PlatformWrapper } from "../../script-worker/wrapper.ts";
import type { Emitter, EmitterMap } from "../../utils/events.ts";
import type { PlayerInit } from "../types.ts";
import type { PlayerSyncInfo } from "./types.ts";

export type UseSandboxBackendOptions = {
  script: string;
  mapManifest: MapStructure;
  playerSyncEmitter: Emitter<PlayerSyncInfo>;
  platformEmitter: EmitterMap<ScriptPlatformEventMap>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraOptions?: any;
};

export type UseSandboxBackendResult = {
  autoTick: boolean;
  setAutoTick: (value: boolean) => void;
  manualTick: () => Promise<void>;
  syncPlayers: (players: Record<string, PlayerInit>) => void;
  saveSnapshot: () => Promise<Uint8Array | null>;
};

/**
 * 管理 Sandbox 后端生命周期和 tick 逻辑的 hook
 */
export function useSandboxBackend({
  script,
  mapManifest,
  playerSyncEmitter,
  platformEmitter,
  extraOptions,
}: UseSandboxBackendOptions): UseSandboxBackendResult {
  // 后端引用
  const backendRef = useRef<ReturnType<
    ReturnType<typeof launch>["create"]
  > | null>(null);

  // 自动 tick 控制
  const [autoTick, setAutoTick] = useState(true);
  const isTickingRef = useRef(false);

  // 使用注入的玩家同步事件发射器 & 平台事件发射器

  // 初始化后端
  useEffect(() => {
    const entrypoint = launch(script);
    const backend = entrypoint.create({
      structure: mapManifest,
      platform: new PlatformWrapper({
        emitEvent: platformEmitter.emit,
      }),
      extraOptions,
    });
    backendRef.current = backend;
    return () => {
      backend[Symbol.dispose]();
      backendRef.current = null;
    };
  }, [script, mapManifest, platformEmitter]);

  // 自动 tick effect
  useEffect(() => {
    if (!autoTick) return;
    if (!backendRef.current) return;
    const handler = setInterval(() => {
      backendRef.current?.tick().then(({ players }) => {
        playerSyncEmitter.emit(players);
      });
    }, 100);
    return () => clearInterval(handler);
  }, [autoTick, script, mapManifest, playerSyncEmitter.emit]);

  // 手动触发一次 tick
  const manualTick = useCallback(async () => {
    if (autoTick) return;
    const backend = backendRef.current;
    if (!backend || isTickingRef.current) return;
    isTickingRef.current = true;
    try {
      const { players } = await backend.tick();
      playerSyncEmitter.emit(players);
    } finally {
      isTickingRef.current = false;
    }
  }, [autoTick, playerSyncEmitter.emit]);

  // 同步玩家配置到后端
  const syncPlayers = useCallback((players: Record<string, PlayerInit>) => {
    if (backendRef.current) {
      backendRef.current.setupPlayers(players);
    }
  }, []);

  // 保存快照
  const saveSnapshot = useCallback(async (): Promise<Uint8Array | null> => {
    const backend = backendRef.current;
    if (!backend?.save) return null;
    const saveFn = backend.save as () => Uint8Array | Promise<Uint8Array>;
    return saveFn();
  }, []);

  return {
    autoTick,
    setAutoTick,
    manualTick,
    syncPlayers,
    saveSnapshot,
  };
}
