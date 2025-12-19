import {
  getComponentNameById,
  relation,
  type ComponentId,
  type EntityId,
  type World,
} from "@codehz/ecs";
import { Task, TaskCompleted } from "./components.ts";

/**
 * 任务管理器，用于管理实体的异步任务(如 AI 调用等)
 *
 * 请在 Pass 构造函数中初始化此类，并在需要时调用其方法来启动和停止任务。
 */
export class TaskManager {
  private tasks = new Map<EntityId, AbortController>();
  private world!: World;
  /**
   * 任务管理器构造函数
   *
   * @param target 任务目标组件 ID
   * @param name 任务名称（用于日志记录）
   */
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private target: EntityId<any>,
    private name = getComponentNameById(target as ComponentId)!,
  ) {}

  /**
   * 初始化任务管理器，设置世界钩子以监听任务组件的添加和移除
   *
   * @param world 世界实例
   * @param warn 可选的警告日志函数
   * @param log 可选的普通日志函数
   */
  init(
    world: World,
    warn?: (msg: string) => void,
    log?: (msg: string) => void,
  ) {
    this.world = world;
    world.hook(relation(Task, this.target), {
      on_init: (entity) => {
        if (!this.tasks.has(entity)) {
          // Sanity check: Task component added without starting a task
          // It may happen during world recovering from snapshot
          world.remove(entity, relation(Task, this.target));
          warn?.(
            `Task component for ${this.name} added to entity ${entity} without starting a task. Removed it.`,
          );
        }
      },
      on_remove: (entity) => {
        log?.(`${this.name} task for entity ${entity} completed or aborted.`);
        const controller = this.tasks.get(entity);
        if (controller) {
          controller.abort();
          this.tasks.delete(entity);
        }
      },
    });
  }

  /**
   * 获取任务的相关组件 ID，用于在查询中排除已完成或正在进行的任务的实体，或者用于清除任务组件
   */
  get components() {
    return [relation(Task, this.target), relation(TaskCompleted, this.target)];
  }

  /**
   * 获取任务的组件类型
   */
  get taskComponent() {
    return relation(Task, this.target);
  }

  /**
   * 获取任务完成的组件类型
   */
  get completedComponent() {
    return relation(TaskCompleted, this.target);
  }

  /**
   * 启动任务，为实体添加任务组件并返回控制任务的对象
   * @param entity 实体 ID
   * @returns 任务控制对象，包含中止信号和完成回调
   */
  start(entity: EntityId) {
    const abortController = new AbortController();
    this.tasks.set(entity, abortController);
    this.world.set(entity, relation(Task, this.target));
    return {
      signal: abortController.signal,
      complete: () => {
        if (!this.tasks.has(entity)) {
          return;
        }
        this.world.remove(entity, relation(Task, this.target));
        this.world.set(entity, relation(TaskCompleted, this.target));
        this.world.sync();
        this.tasks.delete(entity);
      },
    };
  }

  /**
   * 停止任务，为实体移除任务组件
   * @param entity 实体 ID
   */
  stop(entity: EntityId) {
    this.world.remove(entity, this.target);
    this.world.remove(entity, relation(Task, this.target));
    this.world.remove(entity, relation(TaskCompleted, this.target));
  }
}
