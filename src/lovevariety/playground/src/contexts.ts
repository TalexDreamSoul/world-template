import { atom } from "jotai";
import type { MapSchema } from "./db.ts";

export type AppState =
  | { type: "home" }
  | { type: "script-runner"; script: string }
  | {
      type: "script-sandbox";
      script: string;
      map: MapSchema.Map;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extraOptions?: any;
    };
export const appStateAtom = atom<AppState>({ type: "home" });
