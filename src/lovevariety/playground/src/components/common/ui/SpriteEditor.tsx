import { memo } from "react";
import { Button } from "./Button.tsx";
import { Label } from "./Label.tsx";
import { SpritePreview } from "./SpritePreview.tsx";
import { Toggle } from "./Toggle.tsx";

export interface SpriteState {
  enabled: boolean;
  buffer: ArrayBuffer | null;
  mime: string | null;
  w: number | null;
  h: number | null;
  error: string | null;
}

export const initialSpriteState: SpriteState = {
  enabled: false,
  buffer: null,
  mime: null,
  w: null,
  h: null,
  error: null,
};

export const SpriteEditor = memo(function SpriteEditor({
  id,
  sprite,
  onEnabledChange,
  onFileChange,
  onRemove,
  showRemoveButton = false,
}: {
  id: string;
  sprite: SpriteState;
  onEnabledChange: (enabled: boolean) => void;
  onFileChange: (file: File | null) => void;
  onRemove?: () => void;
  showRemoveButton?: boolean;
}) {
  return (
    <>
      <div className="mb-4">
        <Toggle
          id={id}
          checked={sprite.enabled}
          onChange={onEnabledChange}
          label={"启用四方行走图（4x4）"}
        />
      </div>
      {sprite.enabled && (
        <div className="mb-4">
          <Label htmlFor={id}>选择行走图文件</Label>
          <input
            type="file"
            id={id}
            accept="image/*"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            className="border-ctp-surface0 focus:border-ctp-mauve focus:ring-ctp-mauborder-ctp-mauve mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none"
          />
          {sprite.buffer && (
            <div className="mt-2">
              <SpritePreview
                buffer={sprite.buffer}
                mime={sprite.mime ?? undefined}
                frameW={sprite.w ?? undefined}
                frameH={sprite.h ?? undefined}
                className="border-ctp-surface0 h-20 w-20 rounded border object-contain"
                alt="行走图预览"
              />
            </div>
          )}
          {sprite.w && sprite.h && (
            <div className="text-ctp-subtext1 mt-1 text-sm">
              单帧尺寸: {sprite.w} x {sprite.h}（只读）
            </div>
          )}
          {sprite.error && (
            <div className="text-ctp-red mt-1 text-sm">{sprite.error}</div>
          )}
          {showRemoveButton && onRemove && (
            <Button
              type="button"
              onClick={onRemove}
              variant="secondary"
              className="mt-2 text-sm"
            >
              删除精灵图
            </Button>
          )}
        </div>
      )}
    </>
  );
});

export default SpriteEditor;
