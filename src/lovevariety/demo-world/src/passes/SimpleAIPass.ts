/**
 * @file SimpleAIPass: 演示型 AI 行为 Pass
 */

import { Query, relation, World } from "@codehz/ecs";
import type { SyncPass } from "@codehz/pipeline";
import {
  PlayerId,
  PlayerStatus,
  type ScriptPlatform,
} from "@miehoukingdom/world-interface";
import {
  Direction,
  GoalPathfinding,
  Move,
  PathPlan,
  StraightWalk,
  Task,
  TaskCompleted,
  TaskManager,
  Timeout,
  Timer,
} from "@miehoukingdom/world-runtime";
import { PlayerInited, Thinking } from "../components.ts";
import {
  randomInt as defaultRandomInt,
  randomSelect as defaultRandomSelect,
} from "../random.ts";

/**
 * 随机函数类型定义
 */
export type RandomSelectFn = <T>(array: readonly T[]) => T;
export type RandomIntFn = (min: number, max: number) => number;

/**
 * SimpleAIPass 配置选项
 */
export interface SimpleAIPassOptions {
  /**
   * 思考延迟时间（毫秒），默认 1000ms
   *
   * @default 1000
   */
  thinkingDelayMs?: number;
  /**
   * 最小等待 ticks
   *
   * @default 30
   */
  minWaitTicks?: number;
  /**
   * 最大等待 ticks
   *
   * @default 100
   */
  maxWaitTicks?: number;
  /**
   * 最小行走距离
   *
   * @default 5
   */
  minWalkDistance?: number;
  /**
   * 最大行走距离
   *
   * @default 10
   */
  maxWalkDistance?: number;
  /**
   * 可选的随机选择函数（用于测试注入）
   *
   * @ignore
   */
  randomSelect?: RandomSelectFn;
  /**
   * 可选的随机整数函数（用于测试注入）
   *
   * @ignore
   */
  randomInt?: RandomIntFn;
}

/**
 * SimpleAIPass
 *
 * 演示型的 AI 行为 Pass：该 Pass 负责将"空闲"玩家实体进入思考（Thinking）状态，
 * 创建并完成 Task，开启计时器（Timer），以及在 Timeout 后触发随机行走（StraightWalk）。
 *
 * 处理流程：
 *  1) noActionQuery：检测空闲玩家，创建 Task 并进入 Thinking
 *  2) startThinkingQuery：Task 完成后为玩家设置 Timer（进入等待 ticks）并发出 `thinking:start` 事件
 *  3) timeoutQuery：Timer 到期（Timeout），清理 Thinking 相关状态并随机触发短期直走行为
 */
export class SimpleAIPass implements SyncPass {
  private noActionQuery: Query;
  private startThinkingQuery: Query;
  private timeoutQuery: Query;
  private tasks = new TaskManager(Thinking);

  private thinkingDelayMs: number;
  private minWaitTicks: number;
  private maxWaitTicks: number;
  private minWalkDistance: number;
  private maxWalkDistance: number;
  private randomSelect: RandomSelectFn;
  private randomInt: RandomIntFn;
  // 使用内建 setTimeout

  constructor(
    private world: World,
    platform: ScriptPlatform | undefined,
    options: SimpleAIPassOptions = {},
  ) {
    // SB 宿主有可能不给 platform，兜个空壳防止 emitEvent 崩
    this.platform = platform ?? ({
      emitEvent: () => {
        /* noop */
      },
    } as ScriptPlatform);
    this.thinkingDelayMs = options.thinkingDelayMs ?? 1000;
    this.minWaitTicks = options.minWaitTicks ?? 30;
    this.maxWaitTicks = options.maxWaitTicks ?? 100;
    this.minWalkDistance = options.minWalkDistance ?? 5;
    this.maxWalkDistance = options.maxWalkDistance ?? 10;
    this.randomSelect = options.randomSelect ?? defaultRandomSelect;
    this.randomInt = options.randomInt ?? defaultRandomInt;

    this.tasks.init(world, console.warn, console.log);

    // noActionQuery: 用于查找当前"空闲"的玩家实体
    this.noActionQuery = world.createQuery([PlayerInited, PlayerId], {
      negativeComponentTypes: [
        Move,
        StraightWalk,
        PathPlan,
        GoalPathfinding,
        Thinking,
      ],
    });

    // startThinkingQuery: 检测那些已经进入 Thinking 且 Task 已完成的玩家
    this.startThinkingQuery = world.createQuery(
      [PlayerId, Thinking, relation(TaskCompleted, Thinking)],
      {
        negativeComponentTypes: [
          relation(Timer, Thinking),
          relation(Timeout, Thinking),
        ],
      },
    );

    // timeoutQuery: 用于检测那些在 Thinking 状态下且已触发 Timeout 的玩家
    this.timeoutQuery = world.createQuery([
      Thinking,
      PlayerId,
      relation(Timeout, Thinking),
    ]);
  }

  run() {
    // Step A: for entities that currently have no actions, start Thinking
    this.noActionQuery.forEach([], (entity) => {
      this.world.set(entity, Thinking);
      this.world.set(entity, PlayerStatus, "thinking");
      const task = this.tasks.start(entity);
      // 使用 setTimeout 模拟思考延迟
      setTimeout(() => {
        task.complete();
      }, this.thinkingDelayMs);
    });

    // Step B: Task 已完成且仍处于 Thinking，转入 tip 状态并设置 Timer
    this.startThinkingQuery.forEach([PlayerId], (entity, playerId) => {
      this.world.set(entity, PlayerStatus, "tip");
      const ticks = this.randomInt(this.minWaitTicks, this.maxWaitTicks);
      this.world.set(entity, relation(Timer, Thinking), ticks);
    this.platform.emitEvent("thinking:start", {
      playerId,
      content: `正在思考下一步行动... (${ticks} ticks)`,
    });
    });

    // Step C: entities that hit Timeout
    this.timeoutQuery.forEach([PlayerId], (entity, playerId) => {
      this.world.remove(entity, PlayerStatus);
      this.world.remove(entity, Thinking);
      this.world.remove(entity, relation(Task, Thinking));
      this.world.remove(entity, relation(TaskCompleted, Thinking));
      this.world.remove(entity, relation(Timeout, Thinking));
    this.platform.emitEvent("thinking:end", {
      playerId,
    });

      const newDirection = this.randomSelect([
        Direction.Up,
        Direction.Down,
        Direction.Left,
        Direction.Right,
      ]);
      // 启动一个短暂的直走行为
      this.world.set(entity, StraightWalk, {
        direction: newDirection,
        remainingDistance: this.randomInt(
          this.minWalkDistance,
          this.maxWalkDistance,
        ),
      });
    });
  }
}
