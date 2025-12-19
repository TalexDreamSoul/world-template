import { Button } from "../common/index.ts";
import { ViewHeader } from "../common/ui/ViewHeader.tsx";
import { PlayerListItem } from "./components/index.ts";
import type { PlayerManageViewProps } from "./types";

export function PlayerManageView({
  players,
  onBack,
  onEdit,
  onAdd,
}: PlayerManageViewProps) {
  return (
    <div key="manage">
      <ViewHeader
        title="管理角色"
        onBack={onBack}
        rightAction={
          <Button
            variant="ghost"
            size="sm"
            onClick={onAdd}
            aria-label="添加角色"
          >
            添加
          </Button>
        }
      />
      <p className="text-ctp-subtext0 mb-3 text-sm">
        点击角色进行编辑，或添加新角色
      </p>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {players === undefined ? (
          <div className="text-ctp-subtext1 py-4 text-center text-sm">
            加载中...
          </div>
        ) : (
          <>
            {players.map((player) => (
              <PlayerListItem
                key={player.id}
                player={player}
                onClick={() => onEdit(player)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default PlayerManageView;
