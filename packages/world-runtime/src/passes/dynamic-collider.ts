import type { Query, World } from "@codehz/ecs";
import type { SyncPass } from "@codehz/pipeline";
import { DynamicCollider, Move, Position } from "../components.ts";
import type { GridMap } from "../map.ts";
import { BitSet } from "../utils/bit-set.ts";

/**
 * 动态碰撞体处理过程
 * 
 * 负责追踪具有DynamicCollider组件的实体的位置，并维护一个碰撞位集合。
 * 该过程会：
 * - 扫描所有静止的动态碰撞体，将其所在位置标记为碰撞
 * - 扫描所有正在移动的动态碰撞体，将其目标位置也标记为碰撞
 * 
 * 输出结果包含一个BitSet，表示网格中所有被占据的位置，供其他系统（如寻路）使用。
 */
export class DynamicColliderPass
  implements SyncPass<void, { colliders: BitSet }>
{
  public colliders: BitSet = new BitSet(0);
  private simpleQuery: Query;
  private movingQuery: Query;

  constructor(
    private world: World,
    private map: GridMap,
  ) {
    this.simpleQuery = this.world.createQuery([DynamicCollider, Position]);
    this.movingQuery = this.world.createQuery([DynamicCollider, Move]);
  }

  run(): { colliders: BitSet } {
    if (
      this.colliders.length ===
      this.map.geometry.width * this.map.geometry.height
    ) {
      this.colliders.reset();
    } else {
      this.colliders = new BitSet(
        this.map.geometry.width * this.map.geometry.height,
      );
    }
    // 处理静止的动态碰撞体，将其所在位置标记为碰撞
    this.simpleQuery.forEach([Position], (_entity, pos) => {
      this.setCollidedTiles(pos);
    });
    // 处理正在移动的动态碰撞体，将其目标位置也标记为碰撞
    this.movingQuery.forEach([Move], (_entity, move) => {
      this.setCollidedTiles(move.targetIdx);
    });
    return { colliders: this.colliders };
  }

  private setCollidedTiles(pos: Position | number): void {
    if (typeof pos === "number") {
      this.colliders.set(pos);
      return;
    }
    const { x, y } = pos;
    if (this.map.geometry.inBounds(x, y)) {
      const idx = this.map.geometry.toIndex(x, y);
      this.colliders.set(idx);
    }
  }
}
