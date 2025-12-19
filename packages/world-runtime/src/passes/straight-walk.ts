import type { Query, World } from "@codehz/ecs";
import type { SyncPass } from "@codehz/pipeline";
import { FaceDirection, Move, Position, StraightWalk } from "../components.ts";
import type { GridMap } from "../map.ts";
import type { BitSet } from "../utils/bit-set.ts";

/**
 * 直线行走处理过程
 * 
 * 负责执行直线方向的连续行走。该过程会：
 * - 查询所有具有Position和StraightWalk但无Move的实体
 * - 每个tick沿着指定方向移动一格
 * - 递减StraightWalk中的剩余距离计数
 * - 当剩余距离为0时移除StraightWalk组件
 * - 支持动态碰撞体检查，如果前方有障碍立即停止
 * 
 * 这个过程用于实现简单的直线移动，例如自动巡逻行为。
 */
export class StraightWalkPass implements SyncPass<{ colliders?: BitSet }> {
  private query: Query;

  constructor(
    private world: World,
    private gridMap: GridMap,
  ) {
    this.query = world.createQuery([Position, StraightWalk], {
      negativeComponentTypes: [Move],
    });
  }

  run({ colliders }: { colliders?: BitSet }): void {
    this.query.forEach(
      [Position, StraightWalk],
      (entity, pos, straightWalk) => {
        const currentIdx = this.gridMap.geometry.toIndex(pos.x, pos.y);

        let newRemainingDistance = straightWalk.remainingDistance;

        if (straightWalk.remainingDistance > 0) {
          const move = this.gridMap.generateMove(
            currentIdx,
            straightWalk.direction,
            (idx) => {
              if (colliders) {
                return colliders.has(idx);
              }
              return false;
            },
          );
          if (move) {
            this.world.set(entity, Move, move);
            this.world.set(entity, FaceDirection, straightWalk.direction);
            if (colliders) {
              colliders.set(move.targetIdx);
            }
            newRemainingDistance--;
            this.world.set(entity, StraightWalk, {
              ...straightWalk,
              remainingDistance: newRemainingDistance,
            });
            return;
          }
        }
        this.world.remove(entity, StraightWalk);
      },
    );
  }
}
