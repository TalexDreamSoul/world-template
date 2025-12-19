import { type EntityId, type Query, type World } from "@codehz/ecs";
import {
  PlayerId,
  PlayerStatus,
  type PlayerInfo,
  type ScriptApi,
  type ScriptTickResult,
} from "@miehoukingdom/world-interface";
import { FaceDirection, Move, Position } from "@miehoukingdom/world-runtime";

const encoder = new TextEncoder();

export class EcsWorkerApi<PlayerInit> implements ScriptApi<PlayerInit> {
  #players: Query;
  #exports: Query;
  #lastMove: Map<EntityId, number> = new Map();
  constructor(
    private world: World,
    private pipeline: () => unknown,
  ) {
    this.#players = world.createQuery([PlayerId]);
    this.#exports = world.createQuery([PlayerId, Position, FaceDirection]);
  }
  setupPlayers(players: Record<string, PlayerInit>): void {
    const existsingPlayers = new Map<string, EntityId>();
    this.#players.forEach([PlayerId], (entity, id) => {
      existsingPlayers.set(id, entity);
    });
    for (const playerId in players) {
      if (!existsingPlayers.has(playerId)) {
        const entity = this.world.new();
        this.world.set(entity, PlayerId, playerId);
      } else {
        existsingPlayers.delete(playerId);
      }
    }
    for (const entity of existsingPlayers.values()) {
      this.world.delete(entity);
    }
    this.world.sync();
  }
  tick(): ScriptTickResult {
    this.pipeline();
    const players: Record<string, PlayerInfo> = {};
    const moving = new Map<EntityId, number>();
    this.#exports.forEach(
      [
        PlayerId,
        Position,
        FaceDirection,
        { optional: Move },
        { optional: PlayerStatus },
      ],
      (entity, id, pos, dir, move, status) => {
        let moveState: { current: number; total: number } | undefined;
        if (move) {
          moveState = {
            current: move.value.totalTicks - move.value.remainingTicks,
            total: move.value.totalTicks,
          };
          moving.set(entity, move.value.totalTicks);
        } else if (this.#lastMove.has(entity)) {
          const last = this.#lastMove.get(entity)!;
          moveState = {
            current: -1,
            total: last,
          };
        }
        players[id] = {
          x: pos.x,
          y: pos.y,
          direction: dir as 0 | 1 | 2 | 3,
          move: moveState,
          status: status?.value,
        };
      },
    );
    this.#lastMove = moving;
    return { players };
  }

  save(): Uint8Array {
    const data = this.world.serialize();
    return encoder.encode(JSON.stringify(data));
  }
}
