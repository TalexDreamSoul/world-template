import { PlayerSchema } from "../../../db.ts";
import { SpritePreview } from "./SpritePreview.tsx";

export function PlayerAvatar({
  player,
  size = "medium",
}: {
  player: PlayerSchema.Player;
  size?: "small" | "medium";
}) {
  const sizeClass = size === "small" ? "size-10" : "size-10";
  if (player.sprites) {
    return (
      <SpritePreview
        buffer={player.sprites.texture}
        mime="image/png"
        frameW={player.sprites.w}
        frameH={player.sprites.h}
        className={`${sizeClass} rounded-lg`}
        alt={`${player.name} 头像`}
      />
    );
  }
  return (
    <div
      className={`bg-ctp-surface2 text-ctp-subtext0 flex ${sizeClass} items-center justify-center rounded-lg text-sm font-medium`}
    >
      {player.name?.charAt(0).toUpperCase() ?? "?"}
    </div>
  );
}
