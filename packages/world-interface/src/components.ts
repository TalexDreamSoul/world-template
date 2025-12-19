import { component } from "@codehz/ecs";
import type { Direction } from "./types.ts";

/**
 * Realtime information of a player. (used for renderer only)
 */
export interface PlayerInfo {
  x: number;
  y: number;
  direction: Direction;
  move?: { current: number; total: number };
  status?: PlayerStatus;
}

export type BasePlayerStatus = "thinking" | "wondering" | "speaking" | "tip";

export type CustomPlayerStatus = {
  url: string;
  w: number;
  h: number;
  frames: [number, number][];
  framerate: number;
  pivotX: number;
  pivotY: number;
};

export type PlayerStatus = BasePlayerStatus | CustomPlayerStatus;

export type BasePlayerStatusMap = {
  [K in BasePlayerStatus]: CustomPlayerStatus;
};

export const PlayerStatus =
  /* @__PURE__ */ component<PlayerStatus>("PlayerStatus");
export const PlayerInfo = /* @__PURE__ */ component<PlayerInfo>("PlayerInfo");
export const PlayerId = /* @__PURE__ */ component<string>("PlayerId");
