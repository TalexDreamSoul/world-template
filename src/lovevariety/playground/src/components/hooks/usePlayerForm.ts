import { useCallback, useState } from "react";
import type { PlayerSchema } from "../../db.ts";
import { initialSpriteState } from "../common/index.ts";
import type { SpriteState } from "../common/ui/SpriteEditor.tsx";

// 表单状态类型
export interface FormState {
  mode: "add" | "edit";
  player: PlayerSchema.Player | null;
  name: string;
  description: string;
  sprite: SpriteState;
}

export const MAX_DESCRIPTION_LENGTH = 512;

export const initialFormState: FormState = {
  mode: "add",
  player: null,
  name: "",
  description: "",
  sprite: initialSpriteState,
};

export function usePlayerForm() {
  const [state, setState] = useState<FormState>(initialFormState);

  const reset = useCallback(() => setState(initialFormState), []);

  const setName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, name }));
  }, []);

  const setDescription = useCallback((description: string) => {
    setState((prev) => ({ ...prev, description }));
  }, []);

  const setSpriteEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, sprite: { ...prev.sprite, enabled } }));
  }, []);

  const handleFileChange = useCallback(async (file: File | null) => {
    if (!file) {
      setState((prev) => ({
        ...prev,
        sprite: {
          ...prev.sprite,
          buffer: null,
          mime: null,
          w: null,
          h: null,
          error: null,
        },
      }));
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const mime = file.type || "image/png";
      const img = new Image();
      const objectUrl = URL.createObjectURL(new Blob([buffer], { type: mime }));

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const { naturalWidth, naturalHeight } = img;
        if (naturalWidth % 4 !== 0 || naturalHeight % 4 !== 0) {
          setState((prev) => ({
            ...prev,
            sprite: {
              ...prev.sprite,
              buffer,
              mime,
              w: null,
              h: null,
              error: "图像宽度/高度需要是 4 的倍数（4x4 精灵表）",
            },
          }));
        } else {
          setState((prev) => ({
            ...prev,
            sprite: {
              ...prev.sprite,
              buffer,
              mime,
              w: naturalWidth / 4,
              h: naturalHeight / 4,
              error: null,
            },
          }));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setState((prev) => ({
          ...prev,
          sprite: {
            ...prev.sprite,
            buffer: null,
            mime: null,
            w: null,
            h: null,
            error: "无法加载图像",
          },
        }));
      };

      img.src = objectUrl;
    } catch {
      setState((prev) => ({
        ...prev,
        sprite: {
          ...prev.sprite,
          buffer: null,
          mime: null,
          w: null,
          h: null,
          error: "处理文件时出错",
        },
      }));
    }
  }, []);

  const initForAdd = useCallback(() => {
    setState({ ...initialFormState, mode: "add" });
  }, []);

  const initForEdit = useCallback((player: PlayerSchema.Player) => {
    setState({
      mode: "edit",
      player,
      name: player.name,
      description: player.description ?? "",
      sprite: {
        enabled: Boolean(player.sprites),
        buffer: player.sprites?.texture ?? null,
        mime: player.sprites ? "image/png" : null,
        w: player.sprites?.w ?? null,
        h: player.sprites?.h ?? null,
        error: null,
      },
    });
  }, []);

  const removeSprite = useCallback(() => {
    setState((prev) => ({ ...prev, sprite: initialSpriteState }));
  }, []);

  const isSpriteValid = state.sprite.enabled
    ? Boolean(
        state.sprite.buffer &&
        state.sprite.w &&
        state.sprite.h &&
        !state.sprite.error,
      )
    : true;

  const isDescriptionValid =
    state.description.trim().length <= MAX_DESCRIPTION_LENGTH;
  const isValid =
    state.name.trim().length > 0 && isSpriteValid && isDescriptionValid;

  return {
    state,
    reset,
    setName,
    setDescription,
    setSpriteEnabled,
    handleFileChange,
    initForAdd,
    initForEdit,
    removeSprite,
    isValid,
  };
}

export default usePlayerForm;
