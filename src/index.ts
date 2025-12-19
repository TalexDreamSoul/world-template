/**
 * @file demo-world: 简单 AI 演示 (虚假思考+随机行走+Task 示范)
 *
 * 文件职责：
 * - 构建一个演示所需的 world、map、以及 pipeline
 * - 提供两个 demo pass：InitPlayerPass 与 SimpleAIPass
 * - 通过 EcsWorkerApi 将运行时接口导出给主应用/worker
 *
 * 设计要点：
 * - 这个 demo 旨在展示如何使用 TaskManager、Timer 与简单的决策树（Thinking）来驱动角色行为
 * - pipeline 按顺序组合多个 pass，确保渲染/碰撞/路径/运动在正确顺序下发生
 */

import { Query, relation, World } from "@codehz/ecs";
import { createPipeline, type SyncPass } from "@codehz/pipeline";
import {
  defineScriptEntrypoint,
  PlayerId,
  PlayerStatus,
  type MapStructure,
  type ScriptInitOptions,
  type ScriptPlatform,
} from "@miehoukingdom/world-interface";
import {
  Direction,
  DynamicCollider,
  DynamicColliderPass,
  FaceDirection,
  GoalPathfinding,
  GridGeometry,
  GridMap,
  Move,
  MovementPass,
  PathFindingPass,
  PathPlan,
  PendingPass,
  PlanExecutionPass,
  Position,
  StraightWalk,
  StraightWalkPass,
  Task,
  TaskCompleted,
  TaskManager,
  Timeout,
  Timer,
  TimerPass,
  type Area,
  type Portal,
} from "@miehoukingdom/world-runtime";
import { EcsWorkerApi } from "./api.ts";
import { PlayerInited, Thinking } from "./components.ts";
import { randomInt, randomSelect } from "./random.ts";

/**
 * InitPlayerPass
 *
 * 一个负责初始化新玩家实体的同步 Pass。
 * 该 Pass 会查找所有带有 `PlayerId` 且没有 `PlayerInited` 标记的实体，
 * 并为它们分配出生位置、朝向、碰撞器等初始组件。
 *
 * @implements {SyncPass}
 */
class InitPlayerPass implements SyncPass {
  query: Query;
  /**
   * 构造函数
   * @param {World} world ECS 世界实例，用于对实体进行读写操作
   * @param {{x:number,y:number}[]} [spawnPoints=[]] 出生点列表，用于随机分配玩家出生位置
   */
  constructor(
    private world: World,
    private spawnPoints: { x: number; y: number }[] = [],
  ) {
    this.query = world.createQuery([PlayerId], {
      negativeComponentTypes: [PlayerInited],
    });
  }
  /**
   * run
   *
   * 遍历匹配查询找到未初始化的玩家实体并设置其初始组件：
   * - Position: 随机出生点
   * - FaceDirection: 随机朝向
   * - DynamicCollider: 启用动态碰撞
   * - PlayerInited: 标记实体已初始化，避免重复初始化
   */
  run() {
    this.query.forEach([], (entity) => {
      const point = randomSelect(this.spawnPoints);
      const direction = randomSelect([
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

/**
 * SimpleAIPass
 *
 * 演示型的 AI 行为 Pass：该 Pass 负责将“空闲”玩家实体进入思考（Thinking）状态，
 * 创建并完成 Task，开启计时器（Timer），以及在 Timeout 后触发随机行走（StraightWalk）。
 *
 * 处理流程：
 *  1) noActionQuery：检测空闲玩家，创建 Task 并进入 Thinking
 *  2) startThinkingQuery：Task 完成后为玩家设置 Timer（进入等待 ticks）并发出 `thinking:start` 事件
 *  3) timeoutQuery：Timer 到期（Timeout），清理 Thinking 相关状态并随机触发短期直走行为
 *
 * @implements {SyncPass}
 */
class SimpleAIPass implements SyncPass {
  noActionQuery: Query;
  startThinkingQuery: Query;
  timeoutQuery: Query;
  tasks = new TaskManager(Thinking);

  /**
   * 构造函数
   * @param {World} world 世界实例
   * @param {ScriptPlatform} platform 平台接口（用于发送事件等）
   */
  constructor(
    private world: World,
    private platform: ScriptPlatform,
  ) {
    this.tasks.init(world, console.warn, console.log);
    // noActionQuery: 用于查找当前“空闲”（无正在执行动作/计划/思考）的玩家实体。
    // 具体含义：
    // - 要求实体具备 `PlayerInited` 与 `PlayerId`（即已初始化并代表玩家）
    // - 但必须没有以下任何组件：
    //   * 移动相关：Move / StraightWalk（表示实体正处于移动中）
    //   * 路径相关：PathPlan / GoalPathfinding（表示实体正在做路径规划或有导航目标）
    //   * 思考相关：Thinking（当前处于思考状态）
    // 这样能确保：该查询只会匹配那些真正“空闲”的玩家（没有移动/计划/思考/任务/计时器等），
    // 因此我们可以安全地为其启动 Thinking 流程并创建 Task。
    this.noActionQuery = world.createQuery([PlayerInited, PlayerId], {
      negativeComponentTypes: [
        Move,
        StraightWalk,
        PathPlan,
        GoalPathfinding,
        Thinking,
      ],
    });
    // startThinkingQuery: 检测那些已经进入 Thinking 且 Task 已完成，但尚未进入 Timer/Timeout 阶段的玩家
    // 逻辑解释：
    // - 匹配条件包含 `Thinking` 与 `relation(TaskCompleted, Thinking)`：表示这个玩家刚刚完成了思考任务
    // - 负条件 `relation(Timer, Thinking)` 与 `relation(Timeout, Thinking)` 确保我们只为没有计时器的玩家创建 Timer
    // 这个查询通常用于将玩家的状态从 TaskCompleted 转入等待（Timer）以模拟思考过程中的延迟（ticks）
    this.startThinkingQuery = world.createQuery(
      [PlayerId, Thinking, relation(TaskCompleted, Thinking)],
      {
        negativeComponentTypes: [
          relation(Timer, Thinking),
          relation(Timeout, Thinking),
        ],
      },
    );
    // timeoutQuery: 用于检测那些在 Thinking 状态下且已触发 Timeout（即等待计时器到达并被转换为 Timeout）的玩家
    // 当这个查询匹配时，表明该玩家的思考等待阶段已结束，我们应该清理思考状态并执行后续动作（例如随机行走）
    this.timeoutQuery = world.createQuery([
      Thinking,
      PlayerId,
      relation(Timeout, Thinking),
    ]);
  }
  run() {
    // Step A: for entities that currently have no actions, start Thinking
    // - 将实体标记为 Thinking
    // - 创建并开始一个 Task，代表 AI 正在处理决策
    this.noActionQuery.forEach([], (entity) => {
      this.world.set(entity, Thinking);
      this.world.set(entity, PlayerStatus, "thinking");
      const task = this.tasks.start(entity);
      // Simulate thinking time with a timeout
      setTimeout(() => {
        task.complete();
      }, 1000);
    });
    // Step B: for entities whose Task 已完成且仍处于 Thinking（没有 Timer/Timeout），
    //         我们转入 tip 状态并为它设置一个 Timer（ticks 表示等待时长）
    this.startThinkingQuery.forEach([PlayerId], (entity, playerId) => {
      this.world.set(entity, PlayerStatus, "tip");
      const ticks = randomInt(30, 100);
      this.world.set(entity, relation(Timer, Thinking), ticks);
      this.platform.emitEvent("thinking:start", {
        playerId,
        content: `正在思考下一步行动... (${ticks} ticks)`,
      });
    });
    // Step C: entities that hit Timeout（Timer 的超时条件）
    // - 清理所有与 Thinking 相关的组件
    // - 通知平台思考结束
    // - 随机发起一个短期直走行为作为“思考后的行动”
    this.timeoutQuery.forEach([PlayerId], (entity, playerId) => {
      this.world.remove(entity, PlayerStatus);
      this.world.remove(entity, Thinking);
      this.world.remove(entity, relation(Task, Thinking));
      this.world.remove(entity, relation(TaskCompleted, Thinking));
      this.world.remove(entity, relation(Timeout, Thinking));
      this.platform.emitEvent("thinking:end", {
        playerId,
      });

      const newDirection = randomSelect([
        Direction.Up,
        Direction.Down,
        Direction.Left,
        Direction.Right,
      ]);
      // 启动一个短暂的直走行为（remainingDistance 为随机数），作为思考后的动作
      this.world.set(entity, StraightWalk, {
        direction: newDirection,
        remainingDistance: randomInt(5, 10),
      });
    });
  }
}

const decoder = new TextDecoder();
const noopPlatform: ScriptPlatform = {
  emitEvent() {},
};

function create({
  savedData,
  structure,
  platform,
}: ScriptInitOptions<void>) {
  // create: 入口函数，用于根据给定的初始化选项构建并返回一个可供 Worker 或 UI 使用的 runtime API
  // 参数说明：
  // - savedData: 如果提供表示这是从持久化的世界快照恢复
  // - structure: 地图、区域和入口点等地图结构定义
  // - platform: 平台接口（用于发送事件）
  const safePlatform = platform ?? noopPlatform;
  const geometry = new GridGeometry(structure.width, structure.height);
  const map = new GridMap(
    geometry,
    structure.tiles,
    structure.portals.map(transformPortalData(geometry)),
    structure.areas.map(transformAreaData(geometry)),
  );
  const world = new World(
    savedData ? JSON.parse(decoder.decode(savedData)) : undefined,
  );
  // world: ECS 实例。可以选择传入 JSON 来恢复之前的状态，便于快速重放或持久化
  const pipeline = createPipeline()
    // pipeline: 按照顺序向 world 添加各种 pass，确保状态按期望方式更新
    // 1) PendingPass: 处理任何排队或延迟执行的任务（例如计划的能力）
    .addPass(new PendingPass(world))
    // 2) TimerPass: 更新系统内部计时器，供 AI、制裁器等使用
    .addPass(new TimerPass(world))
    // 3) Collision: 首先运行碰撞检测以保证在移动之前处理碰撞逻辑
    .addPass(new DynamicColliderPass(world, map))
    // 4) Movement/Path-Finding: 更新移动相关的实体位置与路径计算
    .addPass(new MovementPass(world, geometry))
    .addPass(new PathFindingPass(world, map))
    .addPass(new PlanExecutionPass(world, map))
    // 5) StraightWalkPass: 专用于直线移动行为的处理
    .addPass(new StraightWalkPass(world, map))
    // 6) Gameplay/demo passes: 初始化玩家与 AI 行为（依赖以上基础系统）
    .addPass(new InitPlayerPass(world, structure.spawnPoints))
    .addPass(new SimpleAIPass(world, safePlatform))
    // 7) Finally, sync ECS changes
    .addPass(() => world.sync())
    .build();
  const api = new EcsWorkerApi(world, pipeline);
  return api;
}

// 使用 defineScriptEntrypoint 将此 demo 注册为一个可在运行时加载的脚本
// 第一个参数是用户可见的脚本名，第二个参数为脚本描述，create 函数用于创建运行时 api
export default defineScriptEntrypoint(
  "简单AI演示 (虚假思考+随机行走+Task示例)",
  "演示具有简单随机AI行为的多个角色在地图中移动。",
)(create);

function transformAreaData(
  geometry: GridGeometry,
): (area: MapStructure["areas"][number]) => Area {
  // 将地图结构定义中的区域数据转换为 GridGeometry 上定义的 Area（index 数组）
  // - 原始 area 里通常包含坐标 (x, y)，这里将其转换为对应的格子索引以供渲染/碰撞使用
  return (area) => ({
    name: area.name,
    description: area.description,
    cells: area.cells.map((cell) => geometry.toIndex(cell.x, cell.y)),
  });
}

function transformPortalData(
  geometry: GridGeometry,
): (portal: MapStructure["portals"][number]) => Portal {
  // 将 portal 的从/到坐标转换为 index，并将 direction 字符串映射为 Direction 枚举
  // portals 通常用于传送或进入特定区域，这里做必要的几何映射
  return (p) => ({
    from: geometry.toIndex(p.from.x, p.from.y),
    to: geometry.toIndex(p.to.x, p.to.y),
    direction: mapDirectionToEnum(p),
  });
}

function mapDirectionToEnum(p: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  direction: "up" | "down" | "left" | "right" | "none";
}): Direction | undefined {
  // 将 portal 描述中的方向字符串安全地映射为 Direction 枚举，若为 'none' 则返回 undefined
  return p.direction === "up"
    ? Direction.Up
    : p.direction === "down"
      ? Direction.Down
      : p.direction === "left"
        ? Direction.Left
        : p.direction === "right"
          ? Direction.Right
          : undefined;
}
