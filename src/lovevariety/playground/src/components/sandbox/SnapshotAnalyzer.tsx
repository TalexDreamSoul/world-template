import { useCallback, useMemo, useState } from "react";
import type { PlayerSchema } from "../../db.ts";
import {
  AutoTransition,
  Button,
  HeightTransition,
  Toggle,
} from "../common/index.ts";
import { renderInlinePreview } from "../common/ui/InlineJsonPreview.tsx";
import { PlayerAvatar } from "../common/ui/PlayerAvatar.tsx";

// ============ 类型定义 ============

/**
 * 玩家信息类型（从数据库获取）
 */
export type PlayerInfo = PlayerSchema.Player;

/**
 * 序列化的组件
 */
export type SerializedComponent = {
  type:
    | number
    | string
    | {
        component: string;
        target: number | string;
      };
  value: unknown;
};

/**
 * 序列化的实体
 */
export type SerializedEntity = {
  id: number;
  components: SerializedComponent[];
};

/**
 * 序列化的世界
 */
export type SerializedWorld = {
  version: number;
  entityManager: unknown;
  entities: SerializedEntity[];
};

// ============ 工具函数 ============

/**
 * 解析 Uint8Array 为 SerializedWorld
 */
function parseSnapshot(data: Uint8Array): SerializedWorld | null {
  try {
    const text = new TextDecoder().decode(data);
    const parsed = JSON.parse(text);
    // 基本类型检查
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      "entities" in parsed &&
      Array.isArray(parsed.entities)
    ) {
      return parsed as SerializedWorld;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 格式化组件类型为可读字符串
 */
function formatComponentType(type: SerializedComponent["type"]): string {
  if (typeof type === "string") {
    return type;
  }
  if (typeof type === "number") {
    return `#${type}`;
  }
  // 关系组件
  const targetStr =
    typeof type.target === "number" ? `Entity(${type.target})` : type.target;
  return `${type.component} → ${targetStr}`;
}

/**
 * 检查组件类型是否匹配
 */
function componentTypeMatches(
  type: SerializedComponent["type"],
  name: string,
): boolean {
  if (typeof type === "string") {
    return type === name;
  }
  if (typeof type === "object") {
    return type.component === name;
  }
  return false;
}

/**
 * 格式化 JSON 值，处理特殊情况
 */
function formatValue(value: unknown): React.ReactNode {
  if (value === null) return <span className="text-ctp-overlay1">null</span>;
  if (value === undefined)
    return <span className="text-ctp-overlay1">undefined</span>;

  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-ctp-green" : "text-ctp-red"}>
        {value ? "true" : "false"}
      </span>
    );
  }

  if (typeof value === "number") {
    return <span className="text-ctp-peach">{value}</span>;
  }

  if (typeof value === "string") {
    return <span className="text-ctp-green">"{value}"</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-ctp-overlay1">[]</span>;
    }
    const inline = renderInlinePreview(value);
    if (inline) return inline;
    return <span className="text-ctp-blue">Array[{value.length}]</span>;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return <span className="text-ctp-overlay1">{"{}"}</span>;
    }
    const inline = renderInlinePreview(value);
    if (inline) return inline;
    return (
      <span className="text-ctp-yellow">
        Object{"{"}
        {keys.length}
        {"}"}
      </span>
    );
  }

  return String(value);
}

// ============ 子组件 ============

/**
 * 组件值的详细展示（支持展开/折叠）
 */
function ComponentValueView({ value }: { value: unknown }) {
  const [expanded, setExpanded] = useState(false);

  if (value === null || value === undefined) {
    return formatValue(value);
  }

  if (typeof value !== "object") {
    return formatValue(value);
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? value.map((v, i) => [i, v] as const)
    : Object.entries(value);

  if (entries.length === 0) {
    return formatValue(value);
  }

  return (
    <HeightTransition>
      <AutoTransition as="div" className="relative flex flex-col font-mono">
        <button
          className="text-ctp-blue hover:text-ctp-sapphire flex min-h-5 items-center gap-1 text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <span
            className="icon-[solar--alt-arrow-right-bold] inline-block transition-transform"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          />
          {renderInlinePreview(value) ??
            (isArray
              ? `Array[${entries.length}]`
              : `Object{${entries.length}}`)}
        </button>
        {expanded && (
          <div className="border-ctp-overlay0 mt-1 ml-4 border-l pl-2">
            {entries.map(([key, val]) => (
              <div key={String(key)} className="flex gap-2 py-0.5">
                <span className="text-ctp-subtext0 shrink-0">
                  {isArray ? `[${key}]` : key}:
                </span>
                <ComponentValueView value={val} />
              </div>
            ))}
          </div>
        )}
      </AutoTransition>
    </HeightTransition>
  );
}

/**
 * 单个组件的展示
 */
function ComponentView({ component }: { component: SerializedComponent }) {
  const typeStr = formatComponentType(component.type);
  const isRelation = typeof component.type === "object";
  const isTag = component.value === undefined;

  return (
    <div className="border-ctp-surface2 bg-ctp-surface0 rounded border p-2">
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-sm font-semibold ${isRelation ? "text-ctp-mauve" : "text-ctp-blue"}`}
        >
          {typeStr}
        </span>
        {isRelation && (
          <span className="bg-ctp-mauve/20 text-ctp-mauve rounded px-1 text-xs">
            关系
          </span>
        )}
        {isTag && (
          <span className="bg-ctp-teal/20 text-ctp-teal rounded px-1 text-xs">
            标记
          </span>
        )}
      </div>
      {!isTag && (
        <div className="mt-1 text-sm">
          <ComponentValueView value={component.value} />
        </div>
      )}
    </div>
  );
}

/**
 * 实体详情面板
 */
function EntityDetailPanel({
  entity,
  playerMap,
}: {
  entity: SerializedEntity;
  playerMap: Map<string, PlayerInfo>;
}) {
  const { playerId, playerInfo } = useMemo(() => {
    const playerIdComp = entity.components.find((c) =>
      componentTypeMatches(c.type, "PlayerId"),
    );
    const value = playerIdComp?.value;
    const playerId = typeof value === "string" ? value : undefined;
    const playerInfo = playerId ? playerMap.get(playerId) : undefined;
    return { playerId, playerInfo };
  }, [entity, playerMap]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-ctp-surface2 bg-ctp-mantle flex items-center gap-2 border-b p-3">
        {playerInfo && <PlayerAvatar player={playerInfo} size="small" />}
        <span className="text-ctp-text font-semibold">实体 #{entity.id}</span>
        {playerInfo && (
          <span className="text-ctp-green font-medium">{playerInfo.name}</span>
        )}
        {playerId && !playerInfo && (
          <span className="bg-ctp-green/20 text-ctp-green rounded px-2 py-0.5 text-xs">
            玩家 {playerId}
          </span>
        )}
        <span className="text-ctp-subtext0 text-sm">
          {entity.components.length} 个组件
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-2">
          {entity.components.map((comp, idx) => (
            <ComponentView key={idx} component={comp} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 实体列表项
 */
function EntityListItem({
  entity,
  isSelected,
  playerMap,
  onClick,
}: {
  entity: SerializedEntity;
  isSelected: boolean;
  playerMap: Map<string, PlayerInfo>;
  onClick: () => void;
}) {
  const { playerId, playerInfo, componentTypes } = useMemo(() => {
    let playerId: string | undefined;
    const types: string[] = [];

    for (const comp of entity.components) {
      const typeStr = formatComponentType(comp.type);
      types.push(typeStr);
      if (
        componentTypeMatches(comp.type, "PlayerId") &&
        typeof comp.value === "string"
      ) {
        playerId = comp.value;
      }
    }

    const playerInfo = playerId ? playerMap.get(playerId) : undefined;

    return { playerId, playerInfo, componentTypes: types };
  }, [entity, playerMap]);

  return (
    <button
      className={`w-full rounded p-2 text-left transition-colors ${
        isSelected
          ? "bg-ctp-mauve/20 border-ctp-mauve border"
          : "bg-ctp-surface0 hover:bg-ctp-surface1 border border-transparent"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {playerInfo && <PlayerAvatar player={playerInfo} size="small" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-ctp-text font-mono text-sm font-semibold">
              #{entity.id}
            </span>
            {playerInfo && (
              <span className="text-ctp-green truncate text-xs font-medium">
                {playerInfo.name}
              </span>
            )}
            {playerId && !playerInfo && (
              <span className="bg-ctp-green/20 text-ctp-green rounded px-1.5 py-0.5 text-xs">
                P:{playerId}
              </span>
            )}
            <span className="text-ctp-subtext0 text-xs">
              {entity.components.length} 组件
            </span>
          </div>
          <div className="text-ctp-subtext1 mt-1 truncate text-xs">
            {componentTypes.slice(0, 4).join(", ")}
            {componentTypes.length > 4 && ` +${componentTypes.length - 4}`}
          </div>
        </div>
      </div>
    </button>
  );
}

// ============ 筛选器组件 ============

type FilterState = {
  searchText: string;
  playerOnly: boolean;
  componentFilter: string;
};

function FilterPanel({
  filter,
  onFilterChange,
  availableComponents,
}: {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  availableComponents: string[];
}) {
  return (
    <div className="border-ctp-surface2 bg-ctp-mantle flex flex-wrap items-center gap-2 border-b p-2">
      <input
        type="text"
        placeholder="搜索实体 ID..."
        className="bg-ctp-surface0 border-ctp-surface2 text-ctp-text placeholder:text-ctp-overlay0 rounded border px-2 py-1 text-sm"
        value={filter.searchText}
        onChange={(e) =>
          onFilterChange({ ...filter, searchText: e.target.value })
        }
      />
      <Toggle
        label="仅玩家实体"
        checked={filter.playerOnly}
        onChange={(checked) =>
          onFilterChange({ ...filter, playerOnly: checked })
        }
        className="text-ctp-subtext0"
      />
      <select
        className="bg-ctp-surface0 border-ctp-surface2 text-ctp-text rounded border px-2 py-1 text-sm"
        value={filter.componentFilter}
        onChange={(e) =>
          onFilterChange({ ...filter, componentFilter: e.target.value })
        }
      >
        <option value="">全部组件</option>
        {availableComponents.map((comp) => (
          <option key={comp} value={comp}>
            {comp}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============ 主组件 ============

export type SnapshotAnalyzerProps = {
  data: Uint8Array;
  players?: PlayerInfo[];
  onDownload?: () => void;
  onClose?: () => void;
};

/**
 * 快照分析器组件
 *
 * 用于解析和展示 ECS 世界快照数据
 */
export function SnapshotAnalyzer({
  data,
  players = [],
  onDownload,
  onClose,
}: SnapshotAnalyzerProps) {
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterState>({
    searchText: "",
    playerOnly: false,
    componentFilter: "",
  });

  // 构建 PlayerId -> PlayerInfo 映射
  const playerMap = useMemo(() => {
    const map = new Map<string, PlayerInfo>();
    for (const player of players) {
      map.set(player.id, player);
    }
    return map;
  }, [players]);

  // 解析快照数据
  const world = useMemo(() => parseSnapshot(data), [data]);

  // 提取所有可用的组件类型（用于筛选器）
  const availableComponents = useMemo(() => {
    if (!world) return [];
    const componentSet = new Set<string>();
    for (const entity of world.entities) {
      for (const comp of entity.components) {
        if (typeof comp.type === "string") {
          componentSet.add(comp.type);
        } else if (typeof comp.type === "object") {
          componentSet.add(comp.type.component);
        }
      }
    }
    return Array.from(componentSet).sort();
  }, [world]);

  // 筛选后的实体列表
  const filteredEntities = useMemo(() => {
    if (!world) return [];

    return world.entities.filter((entity) => {
      // 搜索文本筛选
      if (filter.searchText) {
        const searchId = parseInt(filter.searchText, 10);
        if (!isNaN(searchId) && entity.id !== searchId) {
          return false;
        } else if (isNaN(searchId)) {
          // 如果不是数字，尝试匹配组件类型
          const hasMatchingComponent = entity.components.some((comp) => {
            const typeStr = formatComponentType(comp.type);
            return typeStr
              .toLowerCase()
              .includes(filter.searchText.toLowerCase());
          });
          if (!hasMatchingComponent) return false;
        }
      }

      // 仅玩家实体筛选
      if (filter.playerOnly) {
        const hasPlayerId = entity.components.some((c) =>
          componentTypeMatches(c.type, "PlayerId"),
        );
        if (!hasPlayerId) return false;
      }

      // 组件类型筛选
      if (filter.componentFilter) {
        const hasComponent = entity.components.some((c) => {
          if (typeof c.type === "string") {
            return c.type === filter.componentFilter;
          }
          if (typeof c.type === "object") {
            return c.type.component === filter.componentFilter;
          }
          return false;
        });
        if (!hasComponent) return false;
      }

      return true;
    });
  }, [world, filter]);

  // 当前选中的实体
  const selectedEntity = useMemo(
    () =>
      selectedEntityId !== null
        ? (world?.entities.find((e) => e.id === selectedEntityId) ?? null)
        : null,
    [world, selectedEntityId],
  );

  // 处理实体选择
  const handleSelectEntity = useCallback((id: number) => {
    setSelectedEntityId((prev) => (prev === id ? null : id));
  }, []);

  // 解析失败
  if (!world) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-ctp-red">
          无法解析快照数据。数据可能不是有效的 JSON 格式，或者结构不符合预期。
        </p>
        <p className="text-ctp-subtext0 text-sm">
          快照大小: {data.byteLength} 字节
        </p>
        <div className="flex justify-end gap-2">
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              关闭
            </Button>
          )}
          {onDownload && (
            <Button variant="primary" onClick={onDownload}>
              下载原始数据
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 摘要信息 */}
      <div className="text-ctp-subtext0 flex flex-wrap items-center gap-4 text-sm">
        <span>版本: {world.version}</span>
        <span>实体数量: {world.entities.length}</span>
        <span>快照大小: {data.byteLength} 字节</span>
      </div>

      {/* 主内容区 */}
      <div className="border-ctp-surface2 flex h-[60vh] max-h-[600px] min-h-[300px] overflow-hidden rounded border">
        {/* 左侧：实体列表 */}
        <div className="border-ctp-surface2 flex w-72 shrink-0 flex-col border-r">
          <FilterPanel
            filter={filter}
            onFilterChange={setFilter}
            availableComponents={availableComponents}
          />
          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex flex-col gap-1">
              {filteredEntities.length > 0 ? (
                filteredEntities.map((entity) => (
                  <EntityListItem
                    key={entity.id}
                    entity={entity}
                    isSelected={selectedEntityId === entity.id}
                    playerMap={playerMap}
                    onClick={() => handleSelectEntity(entity.id)}
                  />
                ))
              ) : (
                <p className="text-ctp-overlay1 p-2 text-center text-sm">
                  没有匹配的实体
                </p>
              )}
            </div>
          </div>
          <div className="border-ctp-surface2 text-ctp-subtext0 border-t p-2 text-xs">
            显示 {filteredEntities.length} / {world.entities.length} 实体
          </div>
        </div>

        {/* 右侧：实体详情 */}
        <AutoTransition as="div" className="bg-ctp-base flex-1">
          {selectedEntity ? (
            <EntityDetailPanel
              key={selectedEntity.id}
              entity={selectedEntity}
              playerMap={playerMap}
            />
          ) : (
            <div className="text-ctp-overlay1 flex h-full items-center justify-center">
              <p>选择一个实体查看详情</p>
            </div>
          )}
        </AutoTransition>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2">
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        )}
        {onDownload && (
          <Button variant="primary" onClick={onDownload}>
            下载到本地
          </Button>
        )}
      </div>
    </div>
  );
}
