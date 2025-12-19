import { PlayerSchema } from "../../../db.ts";
import { PlayerAvatar } from "../../common/ui/PlayerAvatar.tsx";

export function PlayerListItem({
  player,
  onClick,
}: {
  player: PlayerSchema.Player;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-ctp-surface0 hover:bg-ctp-surface1 flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors"
    >
      <div className="flex items-center gap-3">
        <PlayerAvatar player={player} />
        <div className="min-w-0 flex-1">
          <div className="text-ctp-text truncate text-sm font-medium">
            {player.name}
          </div>
          {player.description && (
            <div className="text-ctp-subtext1 truncate text-xs">
              {player.description}
            </div>
          )}
          <div className="text-ctp-overlay0 font-mono text-xs">{player.id}</div>
        </div>
      </div>
      <span className="text-ctp-subtext0 text-xs">编辑</span>
    </button>
  );
}
