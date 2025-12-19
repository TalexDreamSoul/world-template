import { nanoid } from "nanoid/non-secure";
import { useCallback, useEffect } from "react";
import { db, PlayerSchema } from "../../db.ts";
import { useSubspace } from "../../utils/useSubspace.ts";
import {
  AutoTransition,
  Button,
  Input,
  Label,
  SpriteEditor,
  Textarea,
  useConfirm,
} from "../common/index.ts";
import { ViewHeader } from "../common/ui/ViewHeader.tsx";
import usePlayerForm from "../hooks/usePlayerForm.ts";
import type { PlayerFormViewProps } from "./types";

export function PlayerFormView({ mode, player, onBack }: PlayerFormViewProps) {
  const form = usePlayerForm();
  const confirm = useConfirm();
  const subspace = useSubspace(db, "player");

  useEffect(() => {
    if (mode === "add") {
      form.initForAdd();
    } else if (mode === "edit" && player) {
      form.initForEdit(player);
    }
  }, [mode, player]);

  const handleSubmit = useCallback(() => {
    const name = form.state.name.trim();
    if (!name) return;
    const description = form.state.description.trim();

    const { sprite } = form.state;
    const playerData: PlayerSchema.Player = {
      id:
        form.state.mode === "edit" && form.state.player
          ? form.state.player.id
          : nanoid(),
      name,
      description,
    };

    if (
      sprite.enabled &&
      sprite.buffer &&
      sprite.w &&
      sprite.h &&
      !sprite.error
    ) {
      playerData.sprites = {
        texture: sprite.buffer,
        w: sprite.w,
        h: sprite.h,
      };
    }

    PlayerSchema.set(subspace, playerData);
    form.reset();
    onBack();
  }, [form, subspace, onBack]);

  const handleDelete = useCallback(async () => {
    if (form.state.mode !== "edit" || !form.state.player) return;

    const confirmed = await confirm({
      title: `确定要删除角色 "${form.state.player.name}" 吗？`,
      message: "此操作不可撤销。",
      confirmLabel: "删除",
      cancelLabel: "取消",
      danger: true,
    });
    if (!confirmed) return;

    PlayerSchema.remove(subspace, form.state.player.id);
    form.reset();
    onBack();
  }, [form, subspace, onBack, confirm]);

  const isEditMode = form.state.mode === "edit";
  const hasExistingSprite = isEditMode && Boolean(form.state.player?.sprites);

  return (
    <div key="form">
      <ViewHeader
        title={isEditMode ? "编辑角色" : "添加角色"}
        onBack={() => {
          form.reset();
          onBack();
        }}
      />
      <AutoTransition
        as="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="playerName">角色名称</Label>
          <Input
            id="playerName"
            value={form.state.name}
            onChange={form.setName}
            placeholder="输入角色名称"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="playerDescription">角色介绍</Label>
          <Textarea
            id="playerDescription"
            value={form.state.description}
            onChange={form.setDescription}
            rows={3}
            placeholder="简短介绍角色（可选），最多 512 字符"
          />
        </div>

        <SpriteEditor
          id="spriteFile"
          sprite={form.state.sprite}
          onEnabledChange={form.setSpriteEnabled}
          onFileChange={form.handleFileChange}
          onRemove={form.removeSprite}
          showRemoveButton={hasExistingSprite}
        />

        <div className="flex items-center justify-between pt-2">
          {isEditMode ? (
            <Button type="button" onClick={handleDelete} variant="danger">
              删除
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                form.reset();
                onBack();
              }}
              variant="secondary"
            >
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={!form.isValid}>
              {isEditMode ? "保存" : "添加"}
            </Button>
          </div>
        </div>
      </AutoTransition>
    </div>
  );
}

export default PlayerFormView;
