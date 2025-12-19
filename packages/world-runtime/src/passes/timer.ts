import { relation, type World, type Query } from "@codehz/ecs";
import type { SyncPass } from "@codehz/pipeline";
import { Timeout, Timer } from "../components.ts";

/**
 * 计时器处理过程
 * 
 * 负责管理游戏中的计时器系统。该过程会：
 * - 查询所有具有Timer关系的实体及其关联的计时器数据
 * - 每个tick递减所有活跃计时器的计数
 * - 当计时器计数到达0时，移除对应的Timer关系并生成Timeout事件
 * 
 * Timer和Timeout使用关系模式支持多个不同类型的计时器同时作用于同一实体。
 */
export class TimerPass implements SyncPass {
  private query: Query;

  constructor(private world: World) {
    this.query = world.createQuery([relation(Timer, "*")]);
  }

  run(): void {
    this.query.forEach([relation(Timer, "*")], (entity, timers) => {
      timers.forEach(([type, remaining]) => {
        if (remaining > 0) {
          this.world.set(entity, relation(Timer, type), remaining - 1);
        } else {
          this.world.remove(entity, relation(Timer, type));
          this.world.set(entity, relation(Timeout, type));
        }
      });
    });
  }
}
