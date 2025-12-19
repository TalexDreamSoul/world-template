import type { ScriptPlatformEventMap } from "@miehoukingdom/world-interface";
import { useEffect } from "react";
import type { EmitterMap } from "../../../utils/events.ts";
import type { EventLogStore } from "./types.ts";

/**
 * 已知的平台事件类型列表
 * 当 world-interface 添加新事件类型时，需要在此处更新
 *
 * 设计说明：
 * - 使用显式列表而非运行时反射，确保类型安全
 * - 支持 *:start/*:end 配对事件和独立事件（如 conversation:update）
 * - 未来扩展：可以从 ScriptPlatformEventMap 的 keys 自动推导
 */
const PLATFORM_EVENT_TYPES: (keyof ScriptPlatformEventMap)[] = [
  "thinking:start",
  "thinking:end",
  "conversation:start",
  "conversation:update",
  "conversation:end",
];

/**
 * 订阅所有平台事件并记录到日志 store
 *
 * @param platformEvents - 来自 SandboxContext 的平台事件发射器
 * @param eventLogStore - 事件日志 store 实例
 */
export function useEventLogSubscription(
  platformEvents: EmitterMap<ScriptPlatformEventMap>,
  eventLogStore: EventLogStore,
): void {
  useEffect(() => {
    // 订阅所有已知事件类型
    const unsubscribes = PLATFORM_EVENT_TYPES.map((eventType) =>
      platformEvents.subscribe(eventType, (data) => {
        eventLogStore.addEvent(eventType, data);
      }),
    );

    // 清理：取消所有订阅
    return () => {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    };
  }, [platformEvents, eventLogStore]);
}
