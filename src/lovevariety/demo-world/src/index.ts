/**
 * @file demo-world: 简单 AI 演示 (虚假思考+随机行走+Task 示范)
 *
 * 文件职责：
 * - 构建一个演示所需的 world、map、以及 pipeline
 * - 通过 EcsWorkerApi 将运行时接口导出给主应用/worker
 *
 * 设计要点：
 * - 这个 demo 旨在展示如何使用 TaskManager、Timer 与简单的决策树（Thinking）来驱动角色行为
 * - pipeline 按顺序组合多个 pass，确保渲染/碰撞/路径/运动在正确顺序下发生
 */

import { World } from "@codehz/ecs";
import { createPipeline } from "@codehz/pipeline";
import {
  defineScriptEntrypoint,
  type MapStructure,
  type ScriptInitOptions,
} from "@miehoukingdom/world-interface";
import {
  Direction,
  DynamicColliderPass,
  GridGeometry,
  GridMap,
  MovementPass,
  PathFindingPass,
  PendingPass,
  PlanExecutionPass,
  StraightWalkPass,
  TimerPass,
  type Area,
  type Portal,
} from "@miehoukingdom/world-runtime";
import { EcsWorkerApi } from "./api.ts";
import {
  InitPlayerPass,
  SimpleAIPass,
  type SimpleAIPassOptions,
} from "./passes/index.ts";

const decoder = new TextDecoder();
const makeEntrypoint: typeof defineScriptEntrypoint =
  defineScriptEntrypoint ??
  ((name, description, ...plugins) =>
    (create) => ({
      name,
      description,
      plugins,
      create,
    }));

function create({
  savedData,
  structure,
  platform,
  extraOptions,
}: ScriptInitOptions<{
  /**
   * SimpleAIPass 配置选项
   */
  aiOptions?: SimpleAIPassOptions;
}>) {
  // 宿主可能不传 extraOptions，这里兜底默认值
  const aiOptions = extraOptions?.aiOptions ?? {};
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
  const pipeline = createPipeline()
    .addPass(new PendingPass(world))
    .addPass(new TimerPass(world))
    .addPass(new DynamicColliderPass(world, map))
    .addPass(new MovementPass(world, geometry))
    .addPass(new PathFindingPass(world, map))
    .addPass(new PlanExecutionPass(world, map))
    .addPass(new StraightWalkPass(world, map))
    .addPass(new InitPlayerPass(world, { spawnPoints: structure.spawnPoints }))
    .addPass(new SimpleAIPass(world, platform, aiOptions))
    .addPass(() => world.sync())
    .build();
  const api = new EcsWorkerApi(world, pipeline);
  return api;
}

export default makeEntrypoint(
  "简单AI演示 (虚假思考+随机行走+Task示例)",
  "演示具有简单随机AI行为的多个角色在地图中移动。",
)(create);

function transformAreaData(
  geometry: GridGeometry,
): (area: MapStructure["areas"][number]) => Area {
  return (area) => ({
    name: area.name,
    description: area.description,
    cells: area.cells.map((cell) => geometry.toIndex(cell.x, cell.y)),
  });
}

function transformPortalData(
  geometry: GridGeometry,
): (portal: MapStructure["portals"][number]) => Portal {
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
