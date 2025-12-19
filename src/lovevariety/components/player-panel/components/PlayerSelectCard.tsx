import { PlayerSchema } from "../../../db.ts";
import { PlayerAvatar } from "../../common/ui/PlayerAvatar.tsx";

export function PlayerSelectCard({
  player,
  onClick,
}: {
  player: PlayerSchema.Player;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-ctp-surface2 hover:border-ctp-mauve flex flex-col items-center rounded-lg border-2 border-transparent p-2 transition-colors"
    >
      <PlayerAvatar player={player} size="small" />
      <span className="text-ctp-text mt-1 w-full truncate text-center text-xs">
        {player.name}
      </span>
    </button>
  );
}
