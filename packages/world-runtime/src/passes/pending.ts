import { relation, type Query, type World } from "@codehz/ecs";
import type { SyncPass } from "@codehz/pipeline";
import { FaceDirection, Pending, Move } from "../components.ts";

/**
 * 待决处理过程
 * 
 * 负责处理待决的面向方向。该过程会：
 * - 查询所有具有Pending和FaceDirection关系但无Move组件的实体
 * - 将待决的FaceDirection关系转换为实际的FaceDirection组件
 * - 移除Pending关系
 * 
 * 这个过程确保在实体未移动时才能改变朝向，避免与移动操作冲突。
 */
export class PendingPass implements SyncPass {
  private query: Query;

  constructor(private world: World) {
    this.query = this.world.createQuery([relation(Pending, FaceDirection)], {
      negativeComponentTypes: [Move],
    });
  }

  run(): void {
    this.query.forEach(
      [relation(Pending, FaceDirection)],
      (entity, pending_face_direction) => {
        this.world.set(entity, FaceDirection, pending_face_direction);
        this.world.remove(entity, relation(Pending, FaceDirection));
      },
    );
  }
}
