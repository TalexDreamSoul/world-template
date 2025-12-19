import type { ScriptPlatformEventMap } from "@miehoukingdom/world-interface";
import {
  InMemoryTupleStorage,
  transactionalReadWrite,
  transactionalWrite,
  TupleDatabase,
  TupleDatabaseClient,
} from "tuple-database";
import {
  clearAllEvents,
  extractCorrelationId,
  extractPlayerIds,
  getActiveEventKey,
  parseEventType,
  type ConversationMessage,
  type EventLogEntry,
  type EventLogSchema,
  type EventLogStore,
} from "./types.ts";

let nextId = 0;

/**
 * 生成唯一的事件 ID
 */
function generateEventId(): string {
  return `evt-${Date.now()}-${nextId++}`;
}

/**
 * 从事件数据中提取 playerId（单玩家）
 */
function extractPlayerId(data: Record<string, unknown>): string | undefined {
  return data.playerId as string | undefined;
}

/**
 * 内部：插入事件条目到所有索引
 */
const insertEntry = transactionalWrite<EventLogSchema>()((
  tx,
  entry: EventLogEntry,
) => {
  // 主索引
  tx.set(["events", { startTime: entry.startTime }, { id: entry.id }], entry);

  // 单 playerId 索引
  if (entry.playerId) {
    tx.set(
      [
        "byPlayer",
        { playerId: entry.playerId },
        { startTime: entry.startTime },
        { id: entry.id },
      ],
      null,
    );
  }

  // 多 playerIds 索引（如 conversation）
  if (entry.playerIds) {
    for (const playerId of entry.playerIds) {
      tx.set(
        [
          "byPlayer",
          { playerId },
          { startTime: entry.startTime },
          { id: entry.id },
        ],
        null,
      );
    }
  }

  // 类别索引
  tx.set(
    [
      "byCategory",
      { category: entry.category },
      { startTime: entry.startTime },
      { id: entry.id },
    ],
    null,
  );
});

/**
 * 内部：更新事件条目（仅主索引）
 */
const updateEntry = transactionalWrite<EventLogSchema>()((
  tx,
  startTime: number,
  id: string,
  entry: EventLogEntry,
) => {
  tx.set(["events", { startTime }, { id }], entry);
});

/**
 * 内部：添加事件（处理 start/end/update 配对逻辑）
 */
const addEventInternal = transactionalReadWrite<EventLogSchema>()((
  tx,
  eventType: keyof ScriptPlatformEventMap,
  data: ScriptPlatformEventMap[keyof ScriptPlatformEventMap],
) => {
  const now = Date.now();
  const { category, phase } = parseEventType(eventType);
  const correlationId = extractCorrelationId(
    category,
    data as Record<string, unknown>,
  );
  const playerId = extractPlayerId(data as Record<string, unknown>);
  const playerIds = extractPlayerIds(data as Record<string, unknown>);
  const activeKey = getActiveEventKey(category, correlationId);

  if (phase === "end") {
    // 尝试找到对应的 start 事件并更新其 endTime
    const activeInfo = tx.get(["activeInfo", { activeKey }]);
    if (activeInfo) {
      // 使用存储的 startTime 快速定位条目
      const existingEntry = tx.get([
        "events",
        { startTime: activeInfo.startTime },
        { id: activeInfo.id },
      ]);
      if (existingEntry) {
        const updatedEntry: EventLogEntry = {
          ...existingEntry,
          phase: "end",
          endTime: now,
        };
        updateEntry(tx, activeInfo.startTime, activeInfo.id, updatedEntry);
      }
      tx.remove(["active", { activeKey }]);
      tx.remove(["activeInfo", { activeKey }]);
    } else {
      // 即使找不到配对的 start 事件，也记录 end 事件
      const entry: EventLogEntry = {
        id: generateEventId(),
        eventType,
        category,
        phase,
        startTime: now,
        data,
        correlationId,
        playerId,
        playerIds,
      };
      insertEntry(tx, entry);
    }
  } else if (phase === "update") {
    // 处理 update 事件（如 conversation:update）
    // 将更新内容累积到对应的 start 事件中
    const activeInfo = tx.get(["activeInfo", { activeKey }]);
    if (activeInfo) {
      const existingEntry = tx.get([
        "events",
        { startTime: activeInfo.startTime },
        { id: activeInfo.id },
      ]);
      if (existingEntry && existingEntry.category === "conversation") {
        // 提取消息信息
        const updateData =
          data as ScriptPlatformEventMap["conversation:update"];
        const newMessage: ConversationMessage = {
          timestamp: now,
          source: updateData.source,
          content: updateData.content,
        };
        // 累积消息到 messages 数组
        const updatedEntry: EventLogEntry = {
          ...existingEntry,
          messages: [...(existingEntry.messages ?? []), newMessage],
        };
        updateEntry(tx, activeInfo.startTime, activeInfo.id, updatedEntry);
        return;
      }
    }
    // 如果找不到对应的活动事件，作为独立事件记录
    const entry: EventLogEntry = {
      id: generateEventId(),
      eventType,
      category,
      phase,
      startTime: now,
      data,
      correlationId,
      playerId,
    };
    insertEntry(tx, entry);
  } else if (phase === "start") {
    // 创建新的 start 事件
    const entryId = generateEventId();

    // 对于 conversation:start，初始化 messages 数组和 playerIds
    const isConversation = category === "conversation";
    const entry: EventLogEntry = {
      id: entryId,
      eventType,
      category,
      phase,
      startTime: now,
      data,
      correlationId,
      playerId,
      playerIds,
      ...(isConversation ? { messages: [] } : {}),
    };
    insertEntry(tx, entry);
    tx.set(["active", { activeKey }], entryId);
    tx.set(["activeInfo", { activeKey }], { id: entryId, startTime: now });
  } else {
    // 独立事件或无阶段事件
    const entry: EventLogEntry = {
      id: generateEventId(),
      eventType,
      category,
      phase,
      startTime: now,
      data,
      correlationId,
      playerId,
      playerIds,
    };
    insertEntry(tx, entry);
  }
});

/**
 * 创建事件日志 Store
 * 使用 tuple-database 的同步内存存储进行状态管理
 *
 * 设计说明：
 * - 每个 SandboxProvider 实例创建独立的 store，确保状态不逃逸出 context 边界
 * - 使用 tuple-database 的索引支持按时间、playerId、类别查询
 * - 使用 active 索引追踪正在进行的事件，支持 start/end 配对
 * - 使用 useTupleDatabase hook 实现响应式更新
 */
export function createEventLogStore(): EventLogStore {
  // 创建同步内存数据库
  const storage = new InMemoryTupleStorage();
  const tupleDb = new TupleDatabase(storage);
  const db = new TupleDatabaseClient<EventLogSchema>(tupleDb);

  function addEvent(
    eventType: keyof ScriptPlatformEventMap,
    data: ScriptPlatformEventMap[keyof ScriptPlatformEventMap],
  ): void {
    addEventInternal(db, eventType, data);
  }

  function clearEvents(): void {
    clearAllEvents(db);
  }

  return {
    db,
    addEvent,
    clearEvents,
  };
}
