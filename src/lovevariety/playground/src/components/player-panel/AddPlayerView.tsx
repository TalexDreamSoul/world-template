// nanoid is used by PlayerFormView; removed from parent
import { useCallback, useState } from "react";
import { useAsyncTupleDatabase } from "tuple-database/useAsyncTupleDatabase";
import { db, PlayerSchema } from "../../db.ts";
import { useSubspace } from "../../utils/useSubspace.ts";
// ViewHeader used in child view components
import PlayerFormView from "./PlayerFormView.tsx";
import PlayerManageView from "./PlayerManageView.tsx";
import PlayerSelectView from "./PlayerSelectView.tsx";
// usePlayerForm is used by PlayerFormView directly
// child views import the small components (PlayerSelectCard, PlayerListItem)
import type { AddPlayerViewProps } from "./types";

type InternalView = "select" | "manage" | "form";

export function AddPlayerView({
  availablePlayers,
  onSelectPlayer,
  onBack,
}: AddPlayerViewProps) {
  const subspace = useSubspace(db, "player");
  const players = useAsyncTupleDatabase(subspace, PlayerSchema.list, []);
  const [editingPlayer, setEditingPlayer] =
    useState<PlayerSchema.Player | null>(null);
  const [internalView, setInternalView] = useState<InternalView>("select");

  const goToManage = useCallback(() => {
    setInternalView("manage");
  }, []);

  const goToSelect = useCallback(() => {
    setEditingPlayer(null);
    setInternalView("select");
  }, []);

  const goToAddForm = useCallback(() => {
    setEditingPlayer(null);
    setInternalView("form");
  }, []);

  const goToEditForm = useCallback((player: PlayerSchema.Player) => {
    setEditingPlayer(player);
    setInternalView("form");
  }, []);

  const goBackFromForm = useCallback(() => {
    setEditingPlayer(null);
    setInternalView("manage");
  }, []);

  const isEditMode = Boolean(editingPlayer);

  return (
    <>
      {/* 选择角色视图 */}
      {internalView === "select" && (
        <div key="select">
          <PlayerSelectView
            availablePlayers={availablePlayers}
            onSelectPlayer={onSelectPlayer}
            onBack={onBack}
            onManage={goToManage}
          />
        </div>
      )}

      {/* 管理角色视图 */}
      {internalView === "manage" && (
        <div key="manage">
          <PlayerManageView
            players={players}
            onBack={goToSelect}
            onEdit={goToEditForm}
            onAdd={goToAddForm}
          />
        </div>
      )}

      {/* 添加/编辑角色表单视图 */}
      {internalView === "form" && (
        <div key="form">
          <PlayerFormView
            mode={isEditMode ? "edit" : "add"}
            player={editingPlayer ?? undefined}
            onBack={goBackFromForm}
          />
        </div>
      )}
    </>
  );
}
