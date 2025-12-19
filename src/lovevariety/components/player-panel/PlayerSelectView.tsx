import { Button } from "../common/index.ts";
import { ViewHeader } from "../common/ui/ViewHeader.tsx";
import { PlayerSelectCard } from "./components/index.ts";
import type { PlayerSelectViewProps } from "./types";

export function PlayerSelectView({
  availablePlayers,
  onSelectPlayer,
  onBack,
  onManage,
}: PlayerSelectViewProps) {
  return (
    <div key="select">
      <ViewHeader
        title="选择角色"
        onBack={onBack}
        rightAction={
          <Button variant="ghost" size="sm" onClick={onManage}>
            管理
          </Button>
        }
      />
      {availablePlayers.length === 0 ? (
        <div className="text-ctp-subtext1 py-4 text-center text-sm">
          没有更多可添加的角色
        </div>
      ) : (
        <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
          {availablePlayers.map((player) => (
            <PlayerSelectCard
              key={player.id}
              player={player}
              onClick={() => onSelectPlayer(player)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PlayerSelectView;
