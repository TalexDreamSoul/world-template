import type { Query, World } from "@codehz/ecs";
import type { SyncPass } from "@codehz/pipeline";
import { GoalPathfinding, PathPlan, Position } from "../components.ts";
import type { GridMap } from "../map.ts";
import { Direction } from "../types.ts";
import type { BitSet } from "../utils/bit-set.ts";
import MinHeap from "../utils/min-heap.ts";

/**
 * 寻路处理过程
 * 
 * 使用A*算法实现两层寻路系统：
 * - 低层寻路：在同一岛屿内（连通区域）进行细粒度寻路
 * - 高层寻路：在不同岛屿间使用传送门连接
 * 
 * 该过程会：
 * - 查询所有具有Position和GoalPathfinding组件但无PathPlan的实体
 * - 根据当前位置和目标位置计算路径
 * - 生成PathPlan组件供PlanExecutionPass执行
 * - 支持动态碰撞体检查，避免与正在移动的实体碰撞
 * 
 * 输入参数包含一个可选的BitSet，表示所有被占据的网格位置。
 */
export class PathFindingPass implements SyncPass<{ colliders?: BitSet }> {
  private query: Query;

  constructor(
    private world: World,
    private map: GridMap,
  ) {
    this.query = world.createQuery([Position, GoalPathfinding], {
      negativeComponentTypes: [PathPlan],
    });
  }

  run({ colliders }: { colliders?: BitSet }): void {
    this.query.forEach(
      [Position, GoalPathfinding],
      (entity, position, goal) => {
        const currentIndex = this.map.geometry.toIndex(position.x, position.y);

        if (currentIndex === goal.targetIndex) {
          this.world.remove(entity, GoalPathfinding);
          return;
        }

        const generatedPlan = this.generatePlan(
          currentIndex,
          goal.targetIndex,
          colliders,
        );
        if (generatedPlan) {
          this.world.set(entity, PathPlan, generatedPlan);
          this.world.set(entity, GoalPathfinding, { ...goal, retryCount: 0 });
        } else if (goal.retryCount < goal.maxRetries) {
          this.world.set(entity, GoalPathfinding, {
            ...goal,
            retryCount: goal.retryCount + 1,
          });
        } else {
          this.world.remove(entity, GoalPathfinding);
        }
      },
    );
  }

  private generatePlan(
    startIndex: number,
    targetIndex: number,
    colliders?: BitSet,
  ): PathPlan | null {
    const startIsland = this.map.islandIndex[startIndex]!;
    const goalIsland = this.map.islandIndex[targetIndex]!;
    if (startIsland === -1 || goalIsland === -1) return null; // 障碍物

    const dynamicCheck = (idx: number) => colliders?.has(idx) ?? false;

    if (startIsland === goalIsland) {
      // 同一岛屿，低层寻路
      const path = this.lowLevelPathfind(startIndex, targetIndex, dynamicCheck);
      if (path?.length) {
        const target = this.simulatePath(startIndex, path);
        return { targetIndex: target, path, nextActionIndex: 0 };
      }
      const dir = this.getDirectionTowards(startIndex, targetIndex);
      if (dir) {
        const move = this.map.generateMove(startIndex, dir, dynamicCheck);
        if (move) {
          return {
            targetIndex: move.targetIdx,
            path: [dir],
            nextActionIndex: 0,
          };
        }
      }
    } else {
      // 不同岛屿，高层寻路
      const portalSequence = this.highLevelPathfind(startIsland, goalIsland);
      if (!portalSequence || portalSequence.length === 0) return null;
      const firstPortalIdx = portalSequence[0]!;
      const firstPortal = this.map.portals[firstPortalIdx]!;
      const pathToPortal = this.lowLevelPathfind(
        startIndex,
        firstPortal.from,
        dynamicCheck,
      );
      if (pathToPortal?.length) {
        return { targetIndex, path: pathToPortal, nextActionIndex: 0 };
      }
      const dir = this.getDirectionTowards(startIndex, firstPortal.from);
      if (dir) {
        const move = this.map.generateMove(startIndex, dir, dynamicCheck);
        if (move) {
          return { targetIndex, path: [dir], nextActionIndex: 0 };
        }
      }
    }
    return null;
  }

  private lowLevelPathfind(
    startIndex: number,
    goalIndex: number,
    dynamicCheck: (idx: number) => boolean,
  ): Direction[] | null {
    const cameFrom = new Map<number, number>();
    const gScore = new Map<number, number>();
    gScore.set(startIndex, 0);
    const fScore = new Map<number, number>();
    fScore.set(startIndex, this.map.estimateDistance(startIndex, goalIndex));

    const openSet = new MinHeap();
    openSet.push(startIndex, fScore.get(startIndex)!);
    const closedSet = new Set<number>();

    let bestNode = -1;
    let bestF = Infinity;

    const DYNAMIC_OBSTACLE_NEAR_THRESHOLD = 1;
    const DYNAMIC_OBSTACLE_BASE_EXTRA_COST = 20;

    while (openSet.size > 0) {
      const popped = openSet.pop()!;
      const current = popped.key;
      if (current !== startIndex && fScore.get(current)! < bestF) {
        bestNode = current;
        bestF = fScore.get(current)!;
      }
      if (current === goalIndex) {
        return this.reconstructPath(cameFrom, current, startIndex);
      }
      closedSet.add(current);
      const neighbors = this.map.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (closedSet.has(neighbor) || this.map.isObstacle(neighbor)) continue;
        let extraCost = 0;
        if (dynamicCheck(neighbor)) {
          const dist = this.map.estimateDistance(neighbor, goalIndex);
          if (dist <= DYNAMIC_OBSTACLE_NEAR_THRESHOLD) {
            continue;
          } else {
            extraCost =
              DYNAMIC_OBSTACLE_BASE_EXTRA_COST *
              (DYNAMIC_OBSTACLE_NEAR_THRESHOLD / dist);
          }
        }
        const tentativeG =
          gScore.get(current)! + this.map.getCost(neighbor) + extraCost;
        if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeG);
          fScore.set(
            neighbor,
            tentativeG + this.map.estimateDistance(neighbor, goalIndex),
          );
          openSet.decreasePriority(neighbor, fScore.get(neighbor)!);
        }
      }
    }
    if (bestNode !== -1 && bestNode !== startIndex) {
      return this.reconstructPath(cameFrom, bestNode, startIndex);
    }
    return null;
  }

  private highLevelPathfind(
    startIsland: number,
    goalIsland: number,
  ): number[] | null {
    let bestPath: number[] | null = null;
    let minCost = Infinity;
    const startPortals = this.map.islandPortalEntries.get(startIsland) ?? [];
    const goalPortals = this.map.islandPortalExits.get(goalIsland) ?? [];
    for (const startPortalIdx of startPortals) {
      const pathsFromStart = this.map.portalPaths.get(startPortalIdx);
      if (!pathsFromStart) continue;
      for (const goalPortalIdx of goalPortals) {
        const pathInfo = pathsFromStart.get(goalPortalIdx);
        if (pathInfo && pathInfo.cost < minCost) {
          minCost = pathInfo.cost;
          bestPath = pathInfo.path;
        }
      }
    }
    return bestPath;
  }

  private simulatePath(start: number, path: Direction[]): number {
    let current = start;
    for (const dir of path) {
      const move = this.map.generateMove(current, dir);
      if (!move) break;
      current = move.targetIdx;
    }
    return current;
  }

  private reconstructPath(
    cameFrom: Map<number, number>,
    current: number,
    start: number,
  ): Direction[] {
    const path: Direction[] = [];
    while (current !== start) {
      const prev = cameFrom.get(current);
      if (!prev) break;
      const { x: cx, y: cy } = this.map.geometry.fromIndex(current);
      const { x: px, y: py } = this.map.geometry.fromIndex(prev);
      let dir: Direction;
      if (cx === px) {
        dir = cy > py ? Direction.Down : Direction.Up;
      } else {
        dir = cx > px ? Direction.Right : Direction.Left;
      }
      path.unshift(dir);
      current = prev;
    }
    return path;
  }

  private getDirectionTowards(
    startIndex: number,
    targetIndex: number,
  ): Direction | null {
    const startPos = this.map.geometry.fromIndex(startIndex);
    const targetPos = this.map.geometry.fromIndex(targetIndex);
    const dx = targetPos.x - startPos.x;
    const dy = targetPos.y - startPos.y;
    if (dx === 0 && dy === 0) return null;
    return dx === 0
      ? dy > 0
        ? Direction.Down
        : Direction.Up
      : dx > 0
        ? Direction.Right
        : Direction.Left;
  }
}
