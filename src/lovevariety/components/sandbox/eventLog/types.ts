import type { ScriptPlatformEventMap } from "@miehoukingdom/world-interface";
import {
  transactionalRead,
  transactionalReadWrite,
  type TupleDatabaseClientApi,
} from "tuple-database";

/**
 * 对话消息条目
 */
export type ConversationMessage = {
  /** 消息时间戳 */
  timestamp: number;
  /** 发言玩家 ID（undefined 表示系统/旁白消息） */
  source?: string;
  /** 消息内容 */
  content: string;
};

/**
 * 事件日志条目的基本结构
 * 支持 start/end 配对事件和独立事件
 */
export type EventLogEntry = {
  /** 唯一标识符 */
  id: string;
  /** 事件类型（完整的事件名，如 "thinking:start"） */
  eventType: keyof ScriptPlatformEventMap;
  /** 事件类别（如 "thinking", "conversation"） */
  category: string;
  /** 事件阶段（"start", "end", "update", 或 undefined 表示独立事件） */
  phase?: string;
  /** 事件开始时间戳 */
  startTime: number;
  /** 事件结束时间戳（仅对配对事件有效） */
  endTime?: number;
  /** 事件数据 */
  data: ScriptPlatformEventMap[keyof ScriptPlatformEventMap];
  /** 关联 ID（用于关联 start/end 事件，如 playerId 或 conversationId） */
  correlationId?: string;
  /** 关联的 player ID（用于按玩家筛选事件，单玩家事件如 thinking） */
  playerId?: string;
  /** 关联的 player ID 列表（用于多玩家事件如 conversation） */
  playerIds?: string[];
  /** 对话消息历史（仅用于 conversation 类型） */
  messages?: ConversationMessage[];
};

/**
 * tuple-database Schema 定义
 * 使用多个索引支持不同的查询模式
 */
export type EventLogSchema =
  | {
      /** 主索引：按时间戳排序的事件条目 */
      key: ["events", { startTime: number }, { id: string }];
      value: EventLogEntry;
    }
  | {
      /** 按 playerId 索引：支持按玩家筛选事件 */
      key: [
        "byPlayer",
        { playerId: string },
        { startTime: number },
        { id: string },
      ];
      value: null;
    }
  | {
      /** 按类别索引：支持按事件类别筛选 */
      key: [
        "byCategory",
        { category: string },
        { startTime: number },
        { id: string },
      ];
      value: null;
    }
  | {
      /** 活动事件映射：追踪正在进行中的 start 事件 */
      key: ["active", { activeKey: string }];
      value: string;
    }
  | {
      /** 活动事件完整信息：存储活动事件的 startTime 用于快速查找 */
      key: ["activeInfo", { activeKey: string }];
      value: { id: string; startTime: number };
    };

/**
 * 事件日志 Store 的接口
 */
export type EventLogStore = {
  /** tuple-database 客户端 */
  db: TupleDatabaseClientApi<EventLogSchema>;
  /** 添加新事件 */
  addEvent: (
    eventType: keyof ScriptPlatformEventMap,
    data: ScriptPlatformEventMap[keyof ScriptPlatformEventMap],
  ) => void;
  /** 清空所有日志 */
  clearEvents: () => void;
};

// ============================================================================
// 查询函数（用于 useTupleDatabase hook）
// ============================================================================

/**
 * 获取所有事件（按时间顺序）
 */
export const listEntries = transactionalRead<EventLogSchema>()((tx) => {
  return tx.scan({ prefix: ["events"] }).map(({ value }) => value);
});

/**
 * 获取活动事件数量
 */
export const getActiveCount = transactionalRead<EventLogSchema>()((tx) => {
  return tx.scan({ prefix: ["active"] }).length;
});

/**
 * 按 playerId 获取事件
 */
export const listEntriesByPlayer = transactionalRead<EventLogSchema>()((
  tx,
  playerId: string,
) => {
  const playerKeys = tx.scan({
    prefix: ["byPlayer", { playerId }],
  });
  const entries: EventLogEntry[] = [];
  for (const { key } of playerKeys) {
    const [, , { startTime }, { id }] = key;
    const result = tx.get(["events", { startTime }, { id }]);
    if (result) {
      entries.push(result);
    }
  }
  return entries;
});

/**
 * 清空所有日志
 */
export const clearAllEvents = transactionalReadWrite<EventLogSchema>()((tx) => {
  for (const { key } of tx.scan({ prefix: ["events"] })) {
    tx.remove(key);
  }
  for (const { key } of tx.scan({ prefix: ["byPlayer"] })) {
    tx.remove(key);
  }
  for (const { key } of tx.scan({ prefix: ["byCategory"] })) {
    tx.remove(key);
  }
  for (const { key } of tx.scan({ prefix: ["active"] })) {
    tx.remove(key);
  }
  for (const { key } of tx.scan({ prefix: ["activeInfo"] })) {
    tx.remove(key);
  }
});

/**
 * 解析事件类型，提取类别和阶段
 * 支持 "category:phase" 格式（如 "thinking:start"）
 */
export function parseEventType(eventType: string): {
  category: string;
  phase?: string;
} {
  const parts = eventType.split(":");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { category: parts[0], phase: parts[1] };
  }
  return { category: eventType };
}

/**
 * 从事件数据中提取关联 ID
 * 用于关联 start/end 事件对
 */
export function extractCorrelationId(
  category: string,
  data: Record<string, unknown>,
): string | undefined {
  // 根据事件类别提取关联 ID
  switch (category) {
    case "thinking":
      return data.playerId as string | undefined;
    case "conversation":
      return data.conversationId as string | undefined;
    default:
      // 尝试通用的 ID 字段
      return (data.id ?? data.playerId ?? data.conversationId) as
        | string
        | undefined;
  }
}

/**
 * 从事件数据中提取 playerIds 数组（用于多玩家事件）
 */
export function extractPlayerIds(
  data: Record<string, unknown>,
): string[] | undefined {
  const playerIds = data.playerIds;
  if (
    Array.isArray(playerIds) &&
    playerIds.every((id) => typeof id === "string")
  ) {
    return playerIds as string[];
  }
  return undefined;
}

/**
 * 生成活动事件的唯一键
 */
export function getActiveEventKey(
  category: string,
  correlationId?: string,
): string {
  return correlationId ? `${category}:${correlationId}` : category;
}
