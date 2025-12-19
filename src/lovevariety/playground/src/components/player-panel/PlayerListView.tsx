import {
  AutoTransition,
  Button,
  HeightTransition,
  SpritePreview,
} from "../common/index.ts";
import type { PlayerListViewProps } from "./types";

export function PlayerListView({
  selectedPlayers,
  onRemovePlayer,
  onConfigClick,
  onAddClick,
}: PlayerListViewProps) {
  return (
    <AutoTransition as="div">
      <div className="text-ctp-text mb-2 flex items-center justify-between text-sm font-medium">
        <span>场上角色 ({selectedPlayers.length})</span>
        <Button size="sm" variant="ghost" onClick={onAddClick}>
          + 添加
        </Button>
      </div>

      {selectedPlayers.length === 0 ? (
        <div className="text-ctp-subtext1 py-4 text-center text-sm">
          暂无角色，点击添加
        </div>
      ) : (
        <HeightTransition className="max-h-64 overflow-y-auto">
          <AutoTransition as="div" className="space-y-2">
            {selectedPlayers.map((player) => (
              <div
                key={player.id}
                className="bg-ctp-surface2 flex items-center gap-2 rounded-lg p-2"
              >
                {/* 头像 */}
                {player.sprites ? (
                  <SpritePreview
                    buffer={player.sprites.texture}
                    mime="image/png"
                    frameW={player.sprites.w}
                    frameH={player.sprites.h}
                    className="size-8 rounded"
                    alt={`${player.name} 头像`}
                  />
                ) : (
                  <div className="bg-ctp-subtext1 text-ctp-crust flex size-8 items-center justify-center rounded text-sm font-medium">
                    {player.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                )}

                {/* 名称 */}
                <span className="text-ctp-text flex-1 truncate text-sm">
                  {player.name}
                </span>

                {/* 配置按钮 */}
                <button
                  onClick={() => onConfigClick(player.id)}
                  className="text-ctp-subtext0 hover:text-ctp-mauve p-1 transition-colors"
                  aria-label="配置角色"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>

                {/* 移除按钮 */}
                <button
                  onClick={() => onRemovePlayer(player.id)}
                  className="text-ctp-subtext0 hover:text-ctp-red p-1 transition-colors"
                  aria-label="移除角色"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </AutoTransition>
        </HeightTransition>
      )}
    </AutoTransition>
  );
}
