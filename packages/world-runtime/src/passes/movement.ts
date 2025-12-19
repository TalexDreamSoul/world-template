import type { Query, World } from "@codehz/ecs";
import type { SyncPass } from "@codehz/pipeline";
import { Move, Position } from "../components.ts";
import type { GridGeometry } from "../geometry.ts";

/**
 * 移动处理过程
 * 
 * 负责执行实体的运动。该过程会：
 * - 查询所有具有Move组件的实体
 * - 每个tick递减剩余移动tick数
 * - 当剩余tick数到达1时，更新实体的Position组件为目标位置并移除Move组件
 * - 否则继续递减tick数
 * 
 * 这个过程与寻路系统配合，实现实体的逐步移动动画。
 */
export class MovementPass implements SyncPass {
  private query: Query;

  constructor(
    private world: World,
    private geometry: GridGeometry,
  ) {
    this.query = world.createQuery([Move]);
  }

  run(): void {
    this.query.forEach([Move], (entity, move) => {
      const remainingTicks = move.remainingTicks - 1;

      if (remainingTicks <= 1) {
        // 移动位置
        const newPos = this.geometry.fromIndex(move.targetIdx);
        this.world.set(entity, Position, newPos);
        this.world.remove(entity, Move);
      } else {
        this.world.set(entity, Move, { ...move, remainingTicks });
      }
    });
  }
}
