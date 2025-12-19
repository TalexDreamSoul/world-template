import type { ScriptMetadata } from "@miehoukingdom/world-interface";
import type { PlayerSchema } from "../../db";
import type { PlayerInit } from "../types.ts";

export type FloatingPlayerPanelProps = {
  allPlayers: PlayerSchema.Player[] | undefined;
  selectedPlayers: PlayerSchema.Player[];
  metadata: ScriptMetadata;
  playerConfigs: Record<string, PlayerInit>;
  onAddPlayer: (player: PlayerSchema.Player, config: PlayerInit) => void;
  onRemovePlayer: (playerId: string) => void;
  onUpdateConfig: (playerId: string, config: PlayerInit) => void;
};

export type PanelView =
  | "list"
  | "add"
  | "config-before-add"
  | "config-existing";

export type PlayerListViewProps = {
  selectedPlayers: PlayerSchema.Player[];
  onRemovePlayer: (playerId: string) => void;
  onConfigClick: (playerId: string) => void;
  onAddClick: () => void;
};

export type AddPlayerViewProps = {
  availablePlayers: PlayerSchema.Player[];
  onSelectPlayer: (player: PlayerSchema.Player) => void;
  onBack: () => void;
};

export type PlayerSelectViewProps = {
  availablePlayers: PlayerSchema.Player[];
  onSelectPlayer: (player: PlayerSchema.Player) => void;
  onBack: () => void;
  onManage: () => void;
};

export type PlayerManageViewProps = {
  players: PlayerSchema.Player[] | undefined;
  onBack: () => void;
  onEdit: (player: PlayerSchema.Player) => void;
  onAdd: () => void;
};

export type PlayerFormViewProps = {
  mode: "add" | "edit";
  player?: PlayerSchema.Player | null;
  onBack: () => void;
};

export type ConfigBeforeAddViewProps = {
  player: PlayerSchema.Player;
  metadata: ScriptMetadata;
  onConfirm: (config: PlayerInit) => void;
  onCancel: () => void;
};

export type ConfigExistingViewProps = {
  playerId: string;
  selectedPlayers: PlayerSchema.Player[];
  metadata: ScriptMetadata;
  config: PlayerInit;
  onUpdateConfig: (config: PlayerInit) => void;
  onBack: () => void;
};
