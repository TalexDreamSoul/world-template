import type { Query, World } from "@codehz/ecs";
import type { SyncPass } from "@codehz/pipeline";
import { FaceDirection, Move, PathPlan, Position } from "../components.ts";
import type { GridMap } from "../map.ts";
import type { BitSet } from "../utils/bit-set.ts";

/**
 * 计划执行处理过程
 * 
 * 负责执行预先生成的寻路计划。该过程会：
 * - 查询所有具有PathPlan和Position但无Move的实体
 * - 根据PathPlan中的方向序列，依次执行每一步的移动
 * - 为每一步生成Move组件和更新FaceDirection
 * - 更新碰撞位集合以反映实体的新目标位置
 * - 当计划完成后移除PathPlan组件
 * 
 * 输入参数包含一个可选的BitSet，表示动态碰撞体的位置，用于防止碰撞。
 */
export class PlanExecutionPass implements SyncPass<{ colliders?: BitSet }> {
  private query: Query;

  constructor(
    private world: World,
    private gridMap: GridMap,
  ) {
    this.query = world.createQuery([PathPlan, Position], {
      negativeComponentTypes: [Move],
    });
  }

  run({ colliders }: { colliders?: BitSet }): void {
    this.query.forEach([PathPlan, Position], (entity, pathPlan, position) => {
      if (pathPlan.nextActionIndex >= pathPlan.path.length) {
        this.world.remove(entity, PathPlan);
        return;
      }

      const currentIdx = this.gridMap.geometry.toIndex(position.x, position.y);
      let actionIdx = pathPlan.nextActionIndex;

      if (currentIdx === pathPlan.path[actionIdx]) {
        actionIdx++;
        if (actionIdx >= pathPlan.path.length) {
          this.world.remove(entity, PathPlan);
          return;
        }
      }

      const direction = pathPlan.path[actionIdx]!;

      const move = this.gridMap.generateMove(currentIdx, direction, (idx) => {
        if (colliders) {
          return colliders.has(idx);
        }
        return false;
      });

      if (move) {
        this.world.set(entity, Move, move);
        this.world.set(entity, FaceDirection, direction);
        if (colliders) {
          colliders.set(move.targetIdx);
        }
        this.world.set(entity, PathPlan, {
          ...pathPlan,
          nextActionIndex: actionIdx + 1,
        });
      } else {
        this.world.remove(entity, PathPlan);
      }
    });
  }
}
