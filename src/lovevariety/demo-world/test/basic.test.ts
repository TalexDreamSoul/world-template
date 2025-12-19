/**
 * @file AI 行为循环完整测试
 *
 * 测试目标：验证 AI 行为循环的完整流程
 * 1. 空闲玩家 → 触发 Thinking Task（模拟 API 请求延迟）
 * 2. Task 完成 → 设置随机 Timer（等待几个 tick）
 * 3. Timer 超时 → 触发随机游走（StraightWalk）
 * 4. 直线走完 → 再次回到空闲状态，开始新的 Thinking 循环
 */

import { relation } from "@codehz/ecs";
import { Assertions, WorldFixture } from "@codehz/ecs/testing";
import { createPipeline } from "@codehz/pipeline";
import type { ScriptPlatform } from "@miehoukingdom/world-interface";
import { PlayerId, PlayerStatus } from "@miehoukingdom/world-interface";
import {
  Direction,
  DynamicColliderPass,
  FaceDirection,
  GridGeometry,
  GridMap,
  Move,
  MovementPass,
  PendingPass,
  Position,
  StraightWalk,
  StraightWalkPass,
  Task,
  TaskCompleted,
  TileType,
  Timeout,
  Timer,
  TimerPass,
} from "@miehoukingdom/world-runtime";
import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { PlayerInited, Thinking } from "../src/components.ts";
import { InitPlayerPass } from "../src/passes/InitPlayerPass.ts";
import { SimpleAIPass } from "../src/passes/SimpleAIPass.ts";

/**
 * 创建一个 mock 的 ScriptPlatform
 */
function createMockPlatform(): ScriptPlatform & {
  events: Array<{ type: string; data: unknown }>;
} {
  const events: Array<{ type: string; data: unknown }> = [];
  return {
    events,
    emitEvent(type: string, data: unknown) {
      events.push({ type, data });
    },
  };
}

/**
 * 创建一个简单的测试地图（10x10 全地面）
 */
function createTestMap() {
  const geometry = new GridGeometry(10, 10);
  // 所有格子都是 Normal（可通行）
  const tiles = new Array(100).fill(TileType.Normal);
  const map = new GridMap(geometry, tiles, [], []);
  return { geometry, map };
}

/**
 * 用于测试的可控延迟执行器
 */
// 现在使用 bun:test 的 jest fake timers，移除自定义延迟执行器

describe("AI 行为循环测试", () => {
  let fixture: WorldFixture;
  let geometry: GridGeometry;
  let map: GridMap;
  let platform: ReturnType<typeof createMockPlatform>;
  // 使用 Bun fake timers 替代自定义延迟执行器
  let pipeline: () => void;

  /**
   * 确定性随机：总是返回数组第一个元素
   */
  const deterministicRandomSelect = <T>(arr: readonly T[]): T => arr[0]!;
  /**
   * 确定性随机：总是返回最小值
   */
  const deterministicRandomInt = (min: number, _max: number): number => min;

  beforeEach(() => {
    fixture = new WorldFixture();
    const testMap = createTestMap();
    geometry = testMap.geometry;
    map = testMap.map;
    platform = createMockPlatform();
    // 启用 fake timers，使 setTimeout 可用 jest 控制
    jest.useFakeTimers();

    // 构建测试 pipeline
    pipeline = createPipeline()
      .addPass(new PendingPass(fixture.world))
      .addPass(new TimerPass(fixture.world))
      .addPass(new DynamicColliderPass(fixture.world, map))
      .addPass(new MovementPass(fixture.world, geometry))
      .addPass(new StraightWalkPass(fixture.world, map))
      .addPass(
        new InitPlayerPass(fixture.world, {
          spawnPoints: [{ x: 5, y: 5 }],
          randomSelect: deterministicRandomSelect,
        }),
      )
      .addPass(
        new SimpleAIPass(fixture.world, platform, {
          thinkingDelayMs: 100, // 使用较短的延迟
          minWaitTicks: 3, // 使用较短的等待时间便于测试
          maxWaitTicks: 5,
          minWalkDistance: 2,
          maxWalkDistance: 3,
          randomSelect: deterministicRandomSelect,
          randomInt: deterministicRandomInt,
          // 不注入 delay，使用默认的 setTimeout（由 jest fake timers 控制）
        }),
      )
      .addPass(() => fixture.world.sync())
      .build();
  });

  test("新玩家应该被正确初始化", () => {
    // 创建一个未初始化的玩家实体
    const player = fixture.spawn().with(PlayerId, "test-player-1").build();

    // 运行 pipeline
    pipeline();

    // 验证玩家已被初始化
    expect(Assertions.hasComponent(fixture.world, player, PlayerInited)).toBe(
      true,
    );
    expect(Assertions.hasComponent(fixture.world, player, Position)).toBe(true);
    expect(Assertions.getComponent(fixture.world, player, Position)).toEqual({
      x: 5,
      y: 5,
    });
    afterEach(() => {
      jest.useRealTimers();
    });
  });

  test("空闲玩家应该开始 Thinking 任务", () => {
    // 创建并初始化玩家
    const player = fixture.spawn().with(PlayerId, "test-player-1").build();

    pipeline(); // 初始化玩家
    pipeline(); // 触发 Thinking（需要第二个 tick 因为 PlayerInited 在上一个 tick 设置）

    // 验证玩家进入 Thinking 状态
    expect(Assertions.hasComponent(fixture.world, player, Thinking)).toBe(true);
    expect(
      Assertions.hasComponent(fixture.world, player, relation(Task, Thinking)),
    ).toBe(true);
    expect(Assertions.getComponent(fixture.world, player, PlayerStatus)).toBe(
      "thinking",
    );

    // 验证延迟定时器已被调度
    expect(jest.getTimerCount()).toBe(1);
  });

  test("Task 完成后应该设置 Timer 等待", () => {
    // 创建并初始化玩家
    const player = fixture.spawn().with(PlayerId, "test-player-1").build();

    pipeline(); // 初始化玩家
    pipeline(); // 触发 Thinking

    // 模拟 Task 完成（推进定时器时间）
    jest.advanceTimersByTime(100);

    // 再次运行 pipeline 处理 TaskCompleted
    pipeline();

    // 验证 Task 已完成
    expect(
      Assertions.hasComponent(
        fixture.world,
        player,
        relation(TaskCompleted, Thinking),
      ),
    ).toBe(true);

    // 验证状态变为 tip 并设置了 Timer
    expect(Assertions.getComponent(fixture.world, player, PlayerStatus)).toBe(
      "tip",
    );
    expect(
      Assertions.hasComponent(fixture.world, player, relation(Timer, Thinking)),
    ).toBe(true);

    // 验证 Timer 值（使用确定性随机，应该是 minWaitTicks = 3）
    const timerValue = Assertions.getComponent(
      fixture.world,
      player,
      relation(Timer, Thinking),
    );
    expect(timerValue).toBe(3);

    // 验证平台事件
    expect(platform.events.length).toBe(1);
    expect(platform.events[0]!.type).toBe("thinking:start");
  });

  test("Timer 超时后应该触发随机游走", () => {
    // 创建并初始化玩家
    const player = fixture.spawn().with(PlayerId, "test-player-1").build();

    pipeline(); // 初始化玩家
    pipeline(); // 触发 Thinking
    jest.advanceTimersByTime(100); // 完成 Task
    pipeline(); // 处理 TaskCompleted，设置 Timer = 3

    // Timer 倒计时: 初始值 3，每个 tick 减 1，到 0 时触发 Timeout
    // tick 1: 3 -> 2
    // tick 2: 2 -> 1
    // tick 3: 1 -> 0
    // tick 4: 0 -> Timeout
    pipeline(); // Timer: 3 -> 2
    pipeline(); // Timer: 2 -> 1
    pipeline(); // Timer: 1 -> 0
    pipeline(); // Timer: 0 -> Timeout

    // 验证 Timeout 被触发
    expect(
      Assertions.hasComponent(
        fixture.world,
        player,
        relation(Timeout, Thinking),
      ),
    ).toBe(true);

    // 再运行一次处理 Timeout
    pipeline();

    // 验证 Thinking 状态被清理
    expect(Assertions.hasComponent(fixture.world, player, Thinking)).toBe(
      false,
    );
    expect(
      Assertions.hasComponent(
        fixture.world,
        player,
        relation(Timeout, Thinking),
      ),
    ).toBe(false);

    // 验证开始了 StraightWalk
    expect(Assertions.hasComponent(fixture.world, player, StraightWalk)).toBe(
      true,
    );
    const walk = Assertions.getComponent(fixture.world, player, StraightWalk);
    expect(walk).toEqual({
      direction: Direction.Up, // 确定性随机选择第一个方向
      remainingDistance: 2, // 确定性随机选择最小距离
    });

    // 验证 thinking:end 事件
    const endEvent = platform.events.find((e) => e.type === "thinking:end");
    expect(endEvent).toBeDefined();
  });

  test("直线走完后应该再次触发 Thinking 循环", () => {
    // 创建并初始化玩家
    const player = fixture.spawn().with(PlayerId, "test-player-1").build();

    // 第一轮：初始化 -> Thinking -> Task 完成 -> Timer -> Timeout -> StraightWalk
    pipeline(); // 初始化玩家
    pipeline(); // 触发 Thinking
    jest.advanceTimersByTime(100); // 完成 Task
    pipeline(); // 处理 TaskCompleted，设置 Timer = 3
    pipeline(); // Timer: 3 -> 2
    pipeline(); // Timer: 2 -> 1
    pipeline(); // Timer: 1 -> 0
    pipeline(); // Timer: 0 -> Timeout
    pipeline(); // 处理 Timeout，开始 StraightWalk (distance=2)

    // 验证 StraightWalk 开始
    expect(Assertions.hasComponent(fixture.world, player, StraightWalk)).toBe(
      true,
    );

    // StraightWalk 需要移动 2 步，每步需要多个 tick 来完成 Move
    // 完成所有移动
    for (let tick = 0; tick < 50; tick++) {
      pipeline();
      if (
        !Assertions.hasComponent(fixture.world, player, StraightWalk) &&
        !Assertions.hasComponent(fixture.world, player, Move)
      ) {
        break;
      }
    }

    expect(Assertions.hasComponent(fixture.world, player, StraightWalk)).toBe(
      false,
    );
    expect(Assertions.hasComponent(fixture.world, player, Move)).toBe(false);

    // 玩家现在应该再次变为空闲，触发新的 Thinking
    pipeline();

    // 验证新的 Thinking 循环开始
    expect(Assertions.hasComponent(fixture.world, player, Thinking)).toBe(true);
    expect(
      Assertions.hasComponent(fixture.world, player, relation(Task, Thinking)),
    ).toBe(true);
    expect(Assertions.getComponent(fixture.world, player, PlayerStatus)).toBe(
      "thinking",
    );

    // 新的延迟回调被添加
    expect(jest.getTimerCount()).toBe(1);
  });

  test("完整的多轮 AI 行为循环", () => {
    // 创建并初始化玩家
    const player = fixture.spawn().with(PlayerId, "test-player-1").build();

    pipeline(); // 初始化玩家

    // 运行两轮完整的 AI 循环
    for (let round = 0; round < 2; round++) {
      // Phase 1: 空闲 -> Thinking
      pipeline();
      expect(Assertions.hasComponent(fixture.world, player, Thinking)).toBe(
        true,
      );

      // Phase 2: 完成 Task
      jest.advanceTimersByTime(100);
      pipeline();
      expect(
        Assertions.hasComponent(
          fixture.world,
          player,
          relation(Timer, Thinking),
        ),
      ).toBe(true);

      // Phase 3: 等待 Timer 超时 (需要 4 个 tick: 3->2->1->0->Timeout)
      for (let tick = 0; tick < 4; tick++) {
        pipeline();
      }
      // 处理 Timeout
      pipeline();
      expect(Assertions.hasComponent(fixture.world, player, StraightWalk)).toBe(
        true,
      );

      // Phase 4: 完成 StraightWalk
      for (let tick = 0; tick < 50; tick++) {
        pipeline();
        if (
          !Assertions.hasComponent(fixture.world, player, StraightWalk) &&
          !Assertions.hasComponent(fixture.world, player, Move)
        ) {
          break;
        }
      }

      // 验证 StraightWalk 完成
      expect(Assertions.hasComponent(fixture.world, player, StraightWalk)).toBe(
        false,
      );
      expect(Assertions.hasComponent(fixture.world, player, Move)).toBe(false);
    }

    // 验证两轮都触发了正确的事件
    const thinkingStartEvents = platform.events.filter(
      (e) => e.type === "thinking:start",
    );
    const thinkingEndEvents = platform.events.filter(
      (e) => e.type === "thinking:end",
    );
    expect(thinkingStartEvents.length).toBe(2);
    expect(thinkingEndEvents.length).toBe(2);
  });
});

describe("InitPlayerPass 单元测试", () => {
  let fixture: WorldFixture;

  beforeEach(() => {
    fixture = new WorldFixture();
  });

  test("应该为新玩家设置正确的出生点", () => {
    const spawnPoints = [{ x: 3, y: 7 }];
    const pass = new InitPlayerPass(fixture.world, {
      spawnPoints,
      randomSelect: <T>(arr: readonly T[]) => arr[0]!,
    });

    const player = fixture.spawn().with(PlayerId, "player-1").build();

    pass.run();
    fixture.sync();

    const pos = Assertions.getComponent(fixture.world, player, Position);
    expect(pos).toEqual({ x: 3, y: 7 });
  });

  test("应该标记玩家为已初始化", () => {
    const pass = new InitPlayerPass(fixture.world, {
      spawnPoints: [{ x: 0, y: 0 }],
      randomSelect: <T>(arr: readonly T[]) => arr[0]!,
    });

    const player = fixture.spawn().with(PlayerId, "player-1").build();

    pass.run();
    fixture.sync();

    expect(Assertions.hasComponent(fixture.world, player, PlayerInited)).toBe(
      true,
    );
  });

  test("不应该重复初始化已初始化的玩家", () => {
    const pass = new InitPlayerPass(fixture.world, {
      spawnPoints: [
        { x: 0, y: 0 },
        { x: 9, y: 9 },
      ],
      randomSelect: <T>(arr: readonly T[]) => arr[arr.length - 1]!, // 选择最后一个
    });

    const player = fixture
      .spawn()
      .with(PlayerId, "player-1")
      .withTag(PlayerInited)
      .with(Position, { x: 1, y: 1 })
      .build();

    pass.run();
    fixture.sync();

    // 位置不应该改变
    const pos = Assertions.getComponent(fixture.world, player, Position);
    expect(pos).toEqual({ x: 1, y: 1 });
  });
});

describe("SimpleAIPass 状态转换测试", () => {
  let fixture: WorldFixture;
  let platform: ReturnType<typeof createMockPlatform>;

  beforeEach(() => {
    fixture = new WorldFixture();
    platform = createMockPlatform();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test("空闲玩家应该触发 Thinking", () => {
    const pass = new SimpleAIPass(fixture.world, platform, {
      randomSelect: <T>(arr: readonly T[]) => arr[0]!,
      randomInt: (min) => min,
    });

    const player = fixture
      .spawn()
      .with(PlayerId, "player-1")
      .withTag(PlayerInited)
      .with(Position, { x: 5, y: 5 })
      .with(FaceDirection, Direction.Down)
      .build();

    pass.run();
    fixture.sync();

    expect(Assertions.hasComponent(fixture.world, player, Thinking)).toBe(true);
    expect(Assertions.getComponent(fixture.world, player, PlayerStatus)).toBe(
      "thinking",
    );
  });

  test("正在移动的玩家不应该触发 Thinking", () => {
    const pass = new SimpleAIPass(fixture.world, platform, {
      randomSelect: <T>(arr: readonly T[]) => arr[0]!,
      randomInt: (min) => min,
    });

    const player = fixture
      .spawn()
      .with(PlayerId, "player-1")
      .withTag(PlayerInited)
      .with(Position, { x: 5, y: 5 })
      .with(FaceDirection, Direction.Down)
      .with(Move, {
        totalTicks: 10,
        remainingTicks: 5,
        targetIdx: 0,
        targetPosition: { x: 5, y: 4 },
      })
      .build();

    pass.run();
    fixture.sync();

    expect(Assertions.hasComponent(fixture.world, player, Thinking)).toBe(
      false,
    );
  });

  test("正在 StraightWalk 的玩家不应该触发 Thinking", () => {
    const pass = new SimpleAIPass(fixture.world, platform, {
      randomSelect: <T>(arr: readonly T[]) => arr[0]!,
      randomInt: (min) => min,
    });

    const player = fixture
      .spawn()
      .with(PlayerId, "player-1")
      .withTag(PlayerInited)
      .with(Position, { x: 5, y: 5 })
      .with(FaceDirection, Direction.Down)
      .with(StraightWalk, { direction: Direction.Up, remainingDistance: 3 })
      .build();

    pass.run();
    fixture.sync();

    expect(Assertions.hasComponent(fixture.world, player, Thinking)).toBe(
      false,
    );
  });
});
