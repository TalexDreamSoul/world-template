import { useCallback, useState } from "react";
import { Button, SpritePreview } from "../common/index.ts";
import { ViewHeader } from "../common/ui/ViewHeader.tsx";
import type { PlayerInit } from "../types.ts";
import { PlayerConfig } from "./PlayerConfig.tsx";
import type { ConfigBeforeAddViewProps } from "./types";

export function ConfigBeforeAddView({
  player,
  metadata,
  onConfirm,
  onCancel,
}: ConfigBeforeAddViewProps) {
  // 本地配置状态，添加时才提交
  const [config, setConfig] = useState<PlayerInit>({});

  const handleConfirm = useCallback(() => {
    onConfirm(config);
  }, [config, onConfirm]);

  return (
    <div>
      <ViewHeader onBack={onCancel} title={`配置: ${player.name}`} />

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
      <PlayerConfig metadata={metadata} value={config} onChange={setConfig} />

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={onCancel}
        >
          取消
        </Button>
        <Button size="sm" className="flex-1" onClick={handleConfirm}>
          添加角色
        </Button>
      </div>
    </div>
  );
}
