import { useCallback, useMemo, useRef, useState } from "react";
import type { PlayerSchema } from "../../db.ts";
import {
  AutoTransition,
  HeightTransition,
} from "../common/animations/index.ts";
import { useClickOutside } from "../hooks/useClickOutside.ts";
import type { PlayerInit } from "../types.ts";
import { AddPlayerView } from "./AddPlayerView.tsx";
import { ConfigBeforeAddView } from "./ConfigBeforeAddView.tsx";
import { ConfigExistingView } from "./ConfigExistingView.tsx";
import { FloatingPlayerPanelTransition } from "./PlayerHeaderPanelTransition.ts";
import { PlayerListView } from "./PlayerListView.tsx";
import type { FloatingPlayerPanelProps, PanelView } from "./types";

export function PlayerHeaderPanel({
  allPlayers,
  selectedPlayers,
  metadata,
  playerConfigs,
  onAddPlayer,
  onRemovePlayer,
  onUpdateConfig,
}: FloatingPlayerPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<PanelView>("list");
  const [pendingPlayer, setPendingPlayer] =
    useState<PlayerSchema.Player | null>(null);
  const [configPlayerId, setConfigPlayerId] = useState<string | null>(null);

  const availablePlayers = useMemo(
    () =>
      allPlayers?.filter(
        (p) => !selectedPlayers.some((sp) => sp.id === p.id),
      ) ?? [],
    [allPlayers, selectedPlayers],
  );

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const closePanel = useCallback(() => setIsOpen(false), []);
  useClickOutside(wrapperRef, closePanel, isOpen);

  const handleToggle = useCallback(() => setIsOpen((s) => !s), []);
  const handleAddClick = useCallback(() => setView("add"), []);
  const handleSelectPlayer = useCallback((player: PlayerSchema.Player) => {
    setPendingPlayer(player);
    setView("config-before-add");
  }, []);
  const handleConfirmAdd = useCallback(
    (config: PlayerInit) => {
      if (pendingPlayer) {
        onAddPlayer(pendingPlayer, config);
        setPendingPlayer(null);
        setView("list");
      }
    },
    [pendingPlayer, onAddPlayer],
  );
  const handleCancelAdd = useCallback(() => {
    setPendingPlayer(null);
    setView("add");
  }, []);
  const handleConfigExisting = useCallback((playerId: string) => {
    setConfigPlayerId(playerId);
    setView("config-existing");
  }, []);
  const handleBackToList = useCallback(() => {
    setView("list");
    setPendingPlayer(null);
    setConfigPlayerId(null);
  }, []);
  const handleUpdateExistingConfig = useCallback(
    (config: PlayerInit) => {
      if (configPlayerId) {
        onUpdateConfig(configPlayerId, config);
      }
    },
    [configPlayerId, onUpdateConfig],
  );

  return (
    <AutoTransition
      as="div"
      ref={wrapperRef}
      className="relative"
      transition={FloatingPlayerPanelTransition}
    >
      <div className="flex items-center gap-2">
        <button
          className="bg-ctp-surface1 hover:bg-ctp-surface2 relative inline-flex items-center gap-2 rounded px-3 py-1 text-sm"
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-label="展开角色面板"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
          >
            <path d="M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z" />
            <path d="M4 7a1 1 0 011 1v6a1 1 0 11-2 0V8a1 1 0 011-1z" />
            <path d="M16 7a1 1 0 011 1v6a1 1 0 11-2 0V8a1 1 0 011-1z" />
          </svg>
          <span className="text-ctp-text">角色</span>
          {selectedPlayers.length > 0 && (
            <span className="bg-ctp-red text-ctp-crust ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold">
              {selectedPlayers.length}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <HeightTransition className="border-ctp-surface2 bg-ctp-base absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-lg border shadow-lg">
          <AutoTransition as="div" className="p-5 pt-4">
            {view === "list" && (
              <PlayerListView
                selectedPlayers={selectedPlayers}
                onRemovePlayer={onRemovePlayer}
                onConfigClick={handleConfigExisting}
                onAddClick={handleAddClick}
              />
            )}
            {view === "add" && (
              <AddPlayerView
                availablePlayers={availablePlayers}
                onSelectPlayer={handleSelectPlayer}
                onBack={handleBackToList}
              />
            )}
            {view === "config-before-add" && pendingPlayer && (
              <ConfigBeforeAddView
                player={pendingPlayer}
                metadata={metadata}
                onConfirm={handleConfirmAdd}
                onCancel={handleCancelAdd}
              />
            )}
            {view === "config-existing" && configPlayerId && (
              <ConfigExistingView
                playerId={configPlayerId}
                selectedPlayers={selectedPlayers}
                metadata={metadata}
                config={playerConfigs[configPlayerId] ?? {}}
                onUpdateConfig={handleUpdateExistingConfig}
                onBack={handleBackToList}
              />
            )}
          </AutoTransition>
        </HeightTransition>
      )}
    </AutoTransition>
  );
}
