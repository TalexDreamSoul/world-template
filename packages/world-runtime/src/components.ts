import { component } from "@codehz/ecs";
import type { Direction } from "./types.ts";

export interface Position {
  x: number;
  y: number;
}
export interface Move {
  totalTicks: number;
  remainingTicks: number;
  targetIdx: number;
  targetPosition: Position;
}

export interface GoalPathfinding {
  targetIndex: number; // 目标瓦片索引
  retryCount: number; // 已重试次数
  maxRetries: number; // 最大重试次数
}

// StraightWalk 组件接口
export interface StraightWalk {
  direction: Direction;
  remainingDistance: number;
}

// PathPlan 组件接口 - 存储当前的路径计划
export interface PathPlan {
  targetIndex: number; // 目标瓦片索引
  path: Direction[]; // 路径的方向序列（如用正确的方向进入传送门则会在到达后触发传送）
  nextActionIndex: number; // 下一个动作在 path 中的索引
}

export const Position = component<Position>("Position");
export const FaceDirection = component<Direction>("FaceDirection");
export const Pending = component("Pending");
export const DynamicCollider = component("DynamicCollider");
export const Move = component<Move>("Move");
export const StraightWalk = component<StraightWalk>("StraightWalk");
export const PathPlan = component<PathPlan>("PathPlan");
export const GoalPathfinding = component<GoalPathfinding>("GoalPathfinding");
export const Timer = component<number>("Timer");
export const Timeout = component<void>("Timeout");

export const Task = component("Task");
export const TaskCompleted = component("TaskCompleted");
