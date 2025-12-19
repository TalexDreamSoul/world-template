import type { MapStructure } from "@miehoukingdom/world-interface";
import { nanoid } from "nanoid/non-secure";
import {
  AsyncTupleDatabase,
  AsyncTupleDatabaseClient,
  transactionalReadAsync,
  transactionalWrite,
  type SchemaSubspace,
} from "tuple-database";
import { IndexedDbTupleStorage } from "./utils/IndexedDbTupleStorage.ts";

export namespace PlayerSchema {
  export type Player = {
    id: string;
    name: string;
    description: string;
    sprites?: {
      texture: ArrayBuffer;
      w: number;
      h: number;
    };
  };
  export const list = transactionalReadAsync<PlayerSchema>()(async (tx) => {
    const raw = await tx.scan({ prefix: ["id"] });
    return raw.map((x) => x.value);
  });

  export const get = transactionalReadAsync<PlayerSchema>()(async (
    tx,
    id: string,
  ) => {
    return await tx.get(["id", id]);
  });

  export const set = transactionalWrite<PlayerSchema>()((
    tx,
    player: Player,
  ) => {
    tx.set(["id", player.id], player);
  });

  export const remove = transactionalWrite<PlayerSchema>()((tx, id: string) => {
    tx.remove(["id", id]);
  });
}

export type PlayerSchema = {
  key: ["id", string];
  value: PlayerSchema.Player;
};

export namespace MapSchema {
  export type MapManifest = MapStructure & {
    name: string;
    version: 2;
    entityDefinitions: Record<
      string,
      {
        x: number;
        y: number;
        w: number;
        h: number;
        pivotX: number;
        pivotY: number;
      }
    >;
    entities: {
      x: number;
      y: number;
      id: string;
      type: string;
      props?: Record<string, unknown>;
    }[];
  };
  export type Map = {
    manifest: MapManifest;
    background: ArrayBuffer;
    preview: ArrayBuffer;
    entities: ArrayBuffer;
  };

  export const list = transactionalReadAsync<MapSchema>()(async (tx) => {
    const raw = await tx.scan({ prefix: ["id"] });
    return raw.map((x) => ({
      id: x.key[1],
      value: x.value,
    }));
  });

  export const get = transactionalReadAsync<MapSchema>()(async (
    tx,
    id: string,
  ) => {
    return await tx.get(["id", id]);
  });

  export const insertNew = transactionalWrite<MapSchema>()((tx, map: Map) => {
    const id = nanoid();
    tx.set(["id", id as string], map);
    return id;
  });

  export const remove = transactionalWrite<MapSchema>()((tx, id: string) => {
    tx.remove(["id", id]);
  });
}

export type MapSchema = {
  key: ["id", string];
  value: MapSchema.Map;
};

export namespace ScriptSchema {
  export type Script = {
    id: string;
    content: string;
  };

  export const list = transactionalReadAsync<ScriptSchema>()(async (tx) => {
    const raw = await tx.scan({ prefix: ["id"] });
    return raw.map((x) => x.value);
  });

  export const newScript = transactionalWrite<ScriptSchema>()((
    tx,
    content: string,
  ) => {
    const id = nanoid();
    tx.set(["id", id], { id, content });
    return id;
  });

  export const remove = transactionalWrite<ScriptSchema>()((tx, id: string) => {
    tx.remove(["id", id]);
  });
}

export type ScriptSchema = {
  key: ["id", string];
  value: ScriptSchema.Script;
};

export type Schema =
  | SchemaSubspace<["player"], PlayerSchema>
  | SchemaSubspace<["map"], MapSchema>
  | SchemaSubspace<["script"], ScriptSchema>;

export const db = new AsyncTupleDatabaseClient<Schema>(
  new AsyncTupleDatabase(new IndexedDbTupleStorage("playground")),
);
