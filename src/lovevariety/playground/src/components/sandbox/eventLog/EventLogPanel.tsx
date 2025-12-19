import { useState } from "react";
import { useTupleDatabase } from "tuple-database/useTupleDatabase";
import type { TransitionPlugin } from "../../common/animations/AutoTransition.tsx";
import {
  AutoTransition,
  HeightTransition,
  WidthTransition,
} from "../../common/index.ts";
import {
  getActiveCount,
  listEntries,
  type ConversationMessage,
  type EventLogEntry,
  type EventLogStore,
} from "./types.ts";

/**
 * 事件日志面板组件 Props
 */
export type EventLogPanelProps = {
  store: EventLogStore;
};

/**
 * 格式化时间戳为可读字符串
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

/**
 * 计算持续时间
 */
function formatDuration(startTime: number, endTime?: number): string {
  if (!endTime) return "...";
  const duration = endTime - startTime;
  if (duration < 1000) return `${duration}ms`;
  return `${(duration / 1000).toFixed(2)}s`;
}

/**
 * 获取事件类别的显示颜色
 */
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    thinking: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    conversation: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return colors[category] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

/**
 * 获取事件阶段的图标
 */
function getPhaseIcon(phase?: string): string {
  if (phase === "start")
    return "icon-[solar--menu-dots-bold-duotone] animate-pulse";
  if (phase === "end")
    return "icon-[solar--check-circle-bold-duotone] text-ctp-mauve";
  if (phase === "update") return "icon-[solar--chat-round-unread-bold-duotone]";
  return "icon-[solar--question-circle-bold-duotone]";
}

/**
 * 单个事件日志条目组件
 */
function EventLogItem({ entry }: { entry: EventLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isActive = entry.phase === "start";
  const hasMessages = entry.messages && entry.messages.length > 0;

  return (
    <HeightTransition
      className={`relative overflow-clip rounded-r-sm border-l-2 ${
        isActive
          ? "border-ctp-mauve-400 bg-ctp-mauve-500/10"
          : "border-ctp-surface1 hover:bg-ctp-surface2/5"
      }`}
    >
      <AutoTransition as="div" className="py-1 pl-2 text-xs">
        <AutoTransition
          as="div"
          className="flex cursor-pointer items-center gap-2 pr-2 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <span className={getPhaseIcon(entry.phase)}></span>
          <span className="text-ctp-subtext1 font-mono">
            {formatTime(entry.startTime)}
          </span>
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] ${getCategoryColor(entry.category)}`}
          >
            {entry.category}
          </span>
          {entry.correlationId && (
            <span className="text-ctp-subtext1 truncate">
              {entry.correlationId}
            </span>
          )}
          {/* 显示玩家信息 */}
          {entry.playerIds && entry.playerIds.length > 0 && (
            <span className="text-ctp-subtext0 text-[10px]">
              👥 {entry.playerIds.length}
            </span>
          )}
          {/* 显示消息数量 */}
          {hasMessages && (
            <span className="text-ctp-subtext0 text-[10px]">
              💬 {entry.messages!.length}
            </span>
          )}
          {entry.endTime && (
            <span className="text-ctp-subtext1 ml-auto">
              {formatDuration(entry.startTime, entry.endTime)}
            </span>
          )}
        </AutoTransition>

        {expanded && (
          <div className="text-ctp-subtext1 mt-1 space-y-2 pl-4">
            {/* 显示参与玩家列表 */}
            {entry.playerIds && entry.playerIds.length > 0 && (
              <div className="text-[10px]">
                <span className="text-ctp-subtext0">参与者: </span>
                <span className="text-ctp-text">
                  {entry.playerIds.join(", ")}
                </span>
              </div>
            )}

            {/* 显示对话消息历史 */}
            {hasMessages && (
              <div className="space-y-1">
                <span className="text-ctp-subtext0 text-[10px]">消息记录:</span>
                <div className="bg-ctp-mantle/30 space-y-1 rounded p-1">
                  {entry.messages!.map((msg, idx) => (
                    <ConversationMessageItem key={idx} message={msg} />
                  ))}
                </div>
              </div>
            )}

            {/* 显示原始数据 */}
            <pre className="bg-ctp-mantle/30 rounded p-1 text-[10px] break-all whitespace-pre-wrap">
              {JSON.stringify(entry.data, null, 2)}
            </pre>
          </div>
        )}
      </AutoTransition>
    </HeightTransition>
  );
}

/**
 * 对话消息条目组件
 */
function ConversationMessageItem({
  message,
}: {
  message: ConversationMessage;
}) {
  return (
    <div className="border-ctp-surface2 border-l pl-2 text-[10px]">
      <div className="flex items-center gap-1">
        <span className="text-ctp-subtext0 font-mono">
          {formatTime(message.timestamp)}
        </span>
        <span className="text-ctp-mauve">{message.source ?? "系统"}</span>
      </div>
      <div className="text-ctp-text pl-2 whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}

/**
 * 事件日志面板组件
 * 在右下角显示为可折叠的浮动面板
 */
export function EventLogPanel({ store }: EventLogPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  // 使用 useTupleDatabase hook 实现响应式查询
  const entries = useTupleDatabase(store.db, listEntries, []);
  const activeCount = useTupleDatabase(store.db, getActiveCount, []);

  return (
    <AutoTransition
      as="div"
      className="absolute right-4 bottom-4 z-50"
      transition={PanelTransition}
    >
      {/* 折叠按钮 */}
      <WidthTransition
        className={`relative overflow-hidden rounded-lg transition-all duration-200 ${
          isOpen
            ? "bg-ctp-base text-ctp-text"
            : "bg-ctp-base/90 text-ctp-subtext0 hover:bg-ctp-base hover:text-ctp-text"
        } ${activeCount > 0 ? "ring-ctp-mauve/50 ring-2" : ""}`}
      >
        <AutoTransition
          as="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-nowrap shadow-lg"
        >
          <span className="text-sm">📋</span>
          <span className="text-sm">事件日志</span>
          {entries.length > 0 && (
            <span
              key={entries.length}
              className="bg-ctp-mauve-800 text-ctp-mauve-50 rounded-full px-1.5 py-0.5 text-xs"
            >
              {entries.length}
            </span>
          )}
          {activeCount > 0 && (
            <span className="bg-ctp-mauve h-2 w-2 animate-pulse rounded-full" />
          )}
        </AutoTransition>
      </WidthTransition>

      {/* 展开后的面板 */}
      {isOpen && (
        <div className="border-ctp-surface2 bg-ctp-surface0/95 absolute right-0 bottom-full mb-2 flex max-h-96 w-lg max-w-[calc(100vw-2rem)] flex-col overflow-x-clip overflow-y-scroll rounded-lg border shadow-xl backdrop-blur">
          {/* 面板头部 */}
          <div className="border-ctp-surface2 bg-ctp-surface1 sticky top-0 z-10 flex items-center justify-between border-b px-3 py-2">
            <span className="text-ctp-text text-sm font-medium">事件日志</span>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <span className="text-ctp-mauve text-xs">
                  {activeCount} 进行中
                </span>
              )}
              <button
                onClick={() => store.clearEvents()}
                className="text-ctp-subtext1 hover:bg-ctp-text/10 hover:text-ctp-text rounded px-1.5 py-0.5 text-xs"
                title="清空日志"
              >
                清空
              </button>
            </div>
          </div>

          {/* 日志列表 */}
          <HeightTransition>
            <AutoTransition
              as="div"
              className="flex-1 space-y-1 overflow-y-auto p-2"
            >
              {entries.length === 0 ? (
                <div className="text-ctp-subtext1 py-4 text-center text-xs">
                  暂无事件
                </div>
              ) : (
                entries.map((entry) => (
                  <EventLogItem key={entry.id} entry={entry as EventLogEntry} />
                ))
              )}
            </AutoTransition>
          </HeightTransition>
        </div>
      )}
    </AutoTransition>
  );
}

const PanelTransition: TransitionPlugin = {
  enter(el) {
    return el.animate(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 250, easing: "ease-out" },
    );
  },
  exit(el) {
    return el.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(10px)" },
      ],
      { duration: 250, easing: "ease-in" },
    );
  },
};
