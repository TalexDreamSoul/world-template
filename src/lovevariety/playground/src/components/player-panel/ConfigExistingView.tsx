import { Button, SpritePreview } from "../common/index.ts";
import { ViewHeader } from "../common/ui/ViewHeader.tsx";
import { PlayerConfig } from "./PlayerConfig.tsx";
import type { ConfigExistingViewProps } from "./types";

export function ConfigExistingView({
  playerId,
  selectedPlayers,
  metadata,
  config,
  onUpdateConfig,
  onBack,
}: ConfigExistingViewProps) {
  const player = selectedPlayers.find((p) => p.id === playerId);
  if (!player) {
    return (
      <div>
        <button
          onClick={onBack}
          className="text-ctp-subtext0 hover:text-ctp-text p-1"
        >
          ← 返回
        </button>
        <div className="text-ctp-subtext1 py-4 text-center text-sm">
          角色不存在
        </div>
      </div>
    );
  }

  return (
    <div>
      <ViewHeader onBack={onBack} title={`配置: ${player.name}`} />

      {/* 角色信息 */}
      <div className="bg-ctp-surface1 mb-3 flex items-center gap-3 rounded-lg p-2">
        {player.sprites ? (
          <SpritePreview
            buffer={player.sprites.texture}
            mime="image/png"
            frameW={player.sprites.w}
            frameH={player.sprites.h}
            className="size-12 rounded"
            alt={`${player.name} 头像`}
          />
        ) : (
          <div className="bg-ctp-subtext1 text-ctp-crust flex size-12 items-center justify-center rounded text-lg font-medium">
            {player.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
        )}
        <div className="flex-1">
          <div className="text-ctp-text text-sm font-medium">{player.name}</div>
          <div className="text-ctp-subtext1 text-xs">
            {player.description || "无描述"}
          </div>
        </div>
      </div>

      {/* 配置项 */}
      <PlayerConfig
        metadata={metadata}
        value={config}
        onChange={onUpdateConfig}
      />

      {/* 返回按钮 */}
      <Button variant="secondary" size="sm" className="w-full" onClick={onBack}>
        返回列表
      </Button>
    </div>
  );
}
