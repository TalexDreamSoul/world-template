/**
 * @file InitPlayerPass: 初始化新玩家实体的 Pass
 */

import { Query, World } from "@codehz/ecs";
import type { SyncPass } from "@codehz/pipeline";
import { PlayerId } from "@miehoukingdom/world-interface";
import {
  Direction,
  DynamicCollider,
  FaceDirection,
  Position,
} from "@miehoukingdom/world-runtime";
import { PlayerInited } from "../components.ts";
import { randomSelect as defaultRandomSelect } from "../random.ts";

/**
 * 随机选择函数的类型定义
 */
export type RandomSelectFn = <T>(array: readonly T[]) => T;

/**
 * InitPlayerPass 配置选项
 */
export interface InitPlayerPassOptions {
  /** 出生点列表 */
  spawnPoints?: { x: number; y: number }[];
  /** 可选的随机选择函数（用于测试注入） */
  randomSelect?: RandomSelectFn;
}

/**
 * InitPlayerPass
 *
 * 一个负责初始化新玩家实体的同步 Pass。
 * 该 Pass 会查找所有带有 `PlayerId` 且没有 `PlayerInited` 标记的实体，
 * 并为它们分配出生位置、朝向、碰撞器等初始组件。
 */
export class InitPlayerPass implements SyncPass {
  private query: Query;
  private spawnPoints: { x: number; y: number }[];
  private randomSelect: RandomSelectFn;

  constructor(
    private world: World,
    options: InitPlayerPassOptions = {},
  ) {
    this.spawnPoints = options.spawnPoints ?? [{ x: 0, y: 0 }];
    this.randomSelect = options.randomSelect ?? defaultRandomSelect;
    this.query = world.createQuery([PlayerId], {
      negativeComponentTypes: [PlayerInited],
    });
  }

  /**
   * 遍历匹配查询找到未初始化的玩家实体并设置其初始组件
   */
  run() {
    this.query.forEach([], (entity) => {
      const point = this.randomSelect(this.spawnPoints);
      const direction = this.randomSelect([
        Direction.Up,
        Direction.Down,
        Direction.Left,
        Direction.Right,
      ]);
      this.world.set(entity, Position, { x: point.x, y: point.y });
      this.world.set(entity, FaceDirection, direction);
      this.world.set(entity, DynamicCollider);
      this.world.set(entity, PlayerInited);
    });
  }
}
