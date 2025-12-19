import type { Move } from "./components.ts";
import type { GridGeometry } from "./geometry.ts";
import { Direction, TileType, type Area, type Portal } from "./types.ts";

export class GridMap {
  readonly geometry: GridGeometry;
  tiles: TileType[]; // 1D array for tile types
  portals: Portal[];

  /**
   * 每个格子的岛 ID 映射（长度 = width * height）：
   * -1 表示该格子是障碍（不可通行），非负整数表示所属的 island 索引。
   * 通过这个数组可以快速判断两个格子是否属于同一岛屿以及定位格子所属的岛。
   *
   * 访问示例：
   * const island = islandIndex[tileIdx];
   */
  islandIndex: Int16Array; // -1 for obstacles, other numbers for island indices

  /**
   * 每个岛屿的所有传送点（入口）列表，key为岛屿ID，value为所有portal.from的index数组。
   */
  islandPortalEntries: Map<number, number[]>;

  /**
   * 每个岛屿的所有传送点（出口）列表，key为岛屿ID，value为所有portal.to的index数组。
   */
  islandPortalExits: Map<number, number[]>;

  /**
   * 缓存每个portal终点(to)到同一岛屿内其他portal起点(from)的最小cost。
   */
  portalDistances: Map<number, Map<number, number>>;

  /**
   * 缓存每个portal出发，到达每个其他portal的最短cost和路径（传送门序列）。
   */
  portalPaths: Map<number, Map<number, { cost: number; path: number[] }>>;

  /**
   * 缓存每个portal起始点(from)对应的portal列表（可能有多个，由于方向）。
   */
  portalsByFrom: Map<number, Portal[]>;

  /**
   * 存储所有区域定义。
   */
  areas: Area[];

  /**
   * 每个格子所属的区域索引（长度 = width * height）：
   * -1 表示该格子不属于任何区域，非负整数表示所属的 area 索引。
   * 多个区域重叠时，以最后一个区域为准。
   *
   * 访问示例：
   * const areaIdx = areaIndex[tileIdx];
   * const area = areaIdx >= 0 ? areas[areaIdx] : null;
   */
  areaIndex: Int16Array;

  /**
   * 区域名称到区域索引的快速查找映射。
   */
  areasByName: Map<string, number>;

  constructor(
    geometry: GridGeometry,
    tiles: TileType[],
    portals: Portal[] = [],
    areas: Area[] = [],
  ) {
    this.geometry = geometry;
    this.tiles = tiles;
    this.portals = portals;

    const islands = computeIslands(
      tiles,
      (index) => this.isObstacle(index),
      geometry,
    );
    this.islandIndex = precomputeIslandIds(tiles, islands);
    const { islandPortalEntries, islandPortalExits } = precomputeIslandPortals(
      this.islandIndex,
      portals,
    );
    this.islandPortalEntries = islandPortalEntries;
    this.islandPortalExits = islandPortalExits;
    this.portalDistances = computePortalDistances(
      portals,
      this.islandIndex,
      tiles.length,
      (start: number, goal: number) =>
        aStar(
          start,
          goal,
          this.geometry,
          (idx) => this.isObstacle(idx),
          (idx) => this.getCost(idx),
          this.portals,
        ),
    );
    this.portalPaths = computePortalPaths(this.portals, this.portalDistances);
    this.portalsByFrom = precomputePortalsByFrom(this.portals);

    // 初始化区域索引
    this.areas = areas;
    this.areaIndex = precomputeAreaIndex(tiles.length, areas);
    this.areasByName = precomputeAreasByName(areas);
  }

  /**
   * Check if a tile at the given index is an obstacle.
   */
  isObstacle(index: number): boolean {
    return this.tiles[index] === TileType.Obstacle;
  }

  /**
   * Get the movement cost for a tile at the given index.
   * Obstacles have infinite cost, normal tiles cost 10, fast tiles cost 7.
   */
  getCost(index: number): number {
    const type = this.tiles[index];
    switch (type) {
      case TileType.Obstacle:
        return Infinity;
      case TileType.Normal:
        return 10;
      case TileType.Fast:
        return 7;
      default:
        return Infinity;
    }
  }

  getNeighbors(index: number, entryDirection?: Direction): number[] {
    const neighbors: number[] = [];
    const { x, y } = this.geometry.fromIndex(index);

    // Adjacent tiles (up, down, left, right)
    const dirs: [number, number][] = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];
    const adjacent: number[] = [];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (
        nx >= 0 &&
        nx < this.geometry.width &&
        ny >= 0 &&
        ny < this.geometry.height
      ) {
        const nIndex = ny * this.geometry.width + nx;
        if (!this.isObstacle(nIndex)) {
          adjacent.push(nIndex);
          neighbors.push(nIndex);
        }
      }
    }

    // Portals: if any adjacent tile is portal.from and direction matches, include portal.to
    for (const adj of adjacent) {
      const portalsAtAdj = this.portalsByFrom.get(adj);
      if (portalsAtAdj) {
        for (const portal of portalsAtAdj) {
          if (
            portal.direction === undefined ||
            portal.direction === entryDirection ||
            entryDirection === undefined
          ) {
            neighbors.push(portal.to);
          }
        }
      }
    }

    return neighbors;
  }

  /**
   * 计算任意两个点的估计距离，用于寻路算法。
   */
  estimateDistance(from: number, to: number): number {
    const islandA = this.islandIndex[from];
    const islandB = this.islandIndex[to];
    if (islandA === -1 || islandB === -1) return Infinity; // 障碍物

    // 计算曼哈顿距离
    const { x: x1, y: y1 } = this.geometry.fromIndex(from);
    const { x: x2, y: y2 } = this.geometry.fromIndex(to);
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  /**
   * 获取指定格子所属的区域。
   * @param index 格子的一维索引
   * @returns 所属的区域，如果不属于任何区域则返回 null
   */
  getAreaAt(index: number): Area | null {
    const areaIdx = this.areaIndex[index];
    if (areaIdx === undefined || areaIdx < 0) return null;
    return this.areas[areaIdx] ?? null;
  }

  /**
   * 根据名称获取区域。
   * @param name 区域名称
   * @returns 对应的区域，如果不存在则返回 null
   */
  getAreaByName(name: string): Area | null {
    const idx = this.areasByName.get(name);
    if (idx === undefined) return null;
    return this.areas[idx] ?? null;
  }

  /**
   * 判断指定格子是否在某个区域内。
   * @param index 格子的一维索引
   * @param areaName 区域名称
   * @returns 是否在该区域内
   */
  isInArea(index: number, areaName: string): boolean {
    const areaIdx = this.areasByName.get(areaName);
    if (areaIdx === undefined) return false;
    return this.areaIndex[index] === areaIdx;
  }

  generateMove(
    fromIdx: number,
    direction: Direction,
    checkDynamicObstacle?: (idx: number) => boolean,
  ): Move | null {
    // Calculate new position based on direction
    const fromPos = this.geometry.fromIndex(fromIdx);
    let nx = fromPos.x;
    let ny = fromPos.y;

    switch (direction) {
      case Direction.Up:
        ny -= 1;
        break;
      case Direction.Down:
        ny += 1;
        break;
      case Direction.Left:
        nx -= 1;
        break;
      case Direction.Right:
        nx += 1;
        break;
    }

    // Check bounds
    if (!this.geometry.inBounds(nx, ny)) {
      return null;
    }

    const adjacentIdx = this.geometry.toIndex(nx, ny);

    if (
      this.isObstacle(adjacentIdx) ||
      (checkDynamicObstacle?.(adjacentIdx) ?? false)
    ) {
      return null;
    }

    // Check if adjacentIdx is a portal.from (teleport when arriving at the portal)
    const portalsAtAdj = this.portalsByFrom.get(adjacentIdx);
    if (portalsAtAdj) {
      for (const portal of portalsAtAdj) {
        if (portal.direction === undefined || portal.direction === direction) {
          if (
            portal.to < 0 ||
            portal.to >= this.geometry.width * this.geometry.height
          ) {
            return null; // Invalid portal
          }
          const cost = this.getCost(adjacentIdx);
          if (!Number.isFinite(cost)) {
            return null;
          }
          return {
            totalTicks: cost,
            remainingTicks: cost,
            targetIdx: portal.to,
            targetPosition: {
              x: this.geometry.fromIndex(portal.to).x,
              y: this.geometry.fromIndex(portal.to).y,
            },
          };
        }
      }
    }

    // Otherwise, normal move to adjacent tile
    const cost = this.getCost(adjacentIdx);
    if (!Number.isFinite(cost)) {
      return null;
    }
    return {
      totalTicks: cost,
      remainingTicks: cost,
      targetIdx: adjacentIdx,
      targetPosition: { x: nx, y: ny },
    };
  }
}

function computeIslands(
  tiles: TileType[],
  isObstacle: (index: number) => boolean,
  geometry: GridGeometry,
): number[][] {
  const visited = new Set<number>();
  const islands: number[][] = [];

  for (let i = 0; i < tiles.length; i++) {
    if (!visited.has(i) && !isObstacle(i)) {
      const island: number[] = [];
      floodFill(
        i,
        visited,
        island,
        geometry.width,
        geometry.height,
        isObstacle,
        geometry,
      );
      islands.push(island);
    }
  }

  return islands;
}

function floodFill(
  index: number,
  visited: Set<number>,
  island: number[],
  width: number,
  height: number,
  isObstacle: (index: number) => boolean,
  geometry: GridGeometry,
): void {
  if (visited.has(index) || isObstacle(index)) return;
  visited.add(index);
  island.push(index);

  const { x, y } = geometry.fromIndex(index);
  const dirs: [number, number][] = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const nIndex = ny * width + nx;
      floodFill(nIndex, visited, island, width, height, isObstacle, geometry);
    }
  }
}

function precomputeIslandIds(
  tiles: TileType[],
  islands: number[][],
): Int16Array {
  const islandIds = new Int16Array(tiles.length).fill(-1);

  islands.forEach((island, islandIdx) => {
    for (const index of island) {
      islandIds[index] = islandIdx;
    }
  });

  return islandIds;
}

/**
 * 预计算每个岛屿的所有传送点（入口）和（出口）列表
 * @param islandIndex 岛屿索引数组
 * @param portals 传送点列表
 * @param islandPortalEntries 岛屿入口映射
 * @param islandPortalExits 岛屿出口映射
 */
function precomputeIslandPortals(islandIndex: Int16Array, portals: Portal[]) {
  const islandPortalEntries: Map<number, number[]> = new Map();
  const islandPortalExits: Map<number, number[]> = new Map();

  for (const [idx, portal] of portals.entries()) {
    // 入口（from）
    const entryIsland = islandIndex[portal.from];
    if (entryIsland !== undefined && entryIsland !== -1) {
      if (!islandPortalEntries.has(entryIsland)) {
        islandPortalEntries.set(entryIsland, []);
      }
      islandPortalEntries.get(entryIsland)!.push(idx);
    }
    // 出口（to）
    const exitIsland = islandIndex[portal.to];
    if (exitIsland !== undefined && exitIsland !== -1) {
      if (!islandPortalExits.has(exitIsland)) {
        islandPortalExits.set(exitIsland, []);
      }
      islandPortalExits.get(exitIsland)!.push(idx);
    }
  }

  return { islandPortalEntries, islandPortalExits };
}

function computePortalDistances(
  portals: Portal[],
  islandIndex: Int16Array,
  tilesLength: number,
  aStar: (start: number, goal: number) => number | null,
): Map<number, Map<number, number>> {
  const distances = new Map<number, Map<number, number>>();
  for (const portal of portals) {
    const to = portal.to;
    if (to < 0 || to >= tilesLength) continue;
    const island = islandIndex[to];
    if (island === -1) continue;
    const distMap = new Map<number, number>();
    for (const otherPortal of portals) {
      if (otherPortal.from < 0 || otherPortal.from >= tilesLength) continue;
      if (otherPortal !== portal && islandIndex[otherPortal.from] === island) {
        const cost = aStar(to, otherPortal.from);
        if (cost !== null) {
          distMap.set(otherPortal.from, cost);
        }
      }
    }
    if (distMap.size > 0) {
      distances.set(to, distMap);
    }
  }
  return distances;
}

function aStar(
  start: number,
  goal: number,
  geometry: GridGeometry,
  isObstacle: (idx: number) => boolean,
  getCost: (idx: number) => number,
  portals: Portal[],
): number | null {
  if (
    start < 0 ||
    start >= geometry.width * geometry.height ||
    goal < 0 ||
    goal >= geometry.width * geometry.height
  )
    return null;
  if (isObstacle(start) || isObstacle(goal)) return null;

  const openSet = new Set<number>();
  openSet.add(start);
  const closedSet = new Set<number>();
  const gScore = new Map<number, number>();
  gScore.set(start, 0);
  const fScore = new Map<number, number>();
  fScore.set(
    start,
    Math.abs(geometry.fromIndex(start).x - geometry.fromIndex(goal).x) +
      Math.abs(geometry.fromIndex(start).y - geometry.fromIndex(goal).y),
  );

  let iterations = 0;
  while (openSet.size > 0) {
    iterations++;
    if (iterations > 10000) {
      return null;
    }

    // Find node with lowest fScore
    let current = -1;
    let lowest = Infinity;
    for (const node of openSet) {
      const f = fScore.get(node) || Infinity;
      if (f < lowest) {
        lowest = f;
        current = node;
      }
    }

    if (current < 0 || current >= geometry.width * geometry.height) {
      openSet.delete(current);
      continue;
    }

    if (current === goal) {
      return gScore.get(current)!;
    }

    openSet.delete(current);
    closedSet.add(current);

    // Try all directions
    const dirTriples: [number, number, Direction][] = [
      [0, 1, Direction.Down],
      [0, -1, Direction.Up],
      [1, 0, Direction.Right],
      [-1, 0, Direction.Left],
    ];
    for (const [dx, dy, direction] of dirTriples) {
      const nx = geometry.fromIndex(current).x + dx;
      const ny = geometry.fromIndex(current).y + dy;
      if (nx >= 0 && nx < geometry.width && ny >= 0 && ny < geometry.height) {
        const neighbor = geometry.toIndex(nx, ny);
        if (
          isObstacle(neighbor) ||
          (neighbor != goal &&
            portals.some(
              (p) =>
                p.from === neighbor &&
                (p.direction === undefined || p.direction === direction),
            )) ||
          closedSet.has(neighbor)
        )
          continue;
        const cost = getCost(neighbor);
        const tentativeG = gScore.get(current)! + cost;
        if (tentativeG < (gScore.get(neighbor) || Infinity)) {
          gScore.set(neighbor, tentativeG);
          fScore.set(
            neighbor,
            tentativeG +
              Math.abs(
                geometry.fromIndex(neighbor).x - geometry.fromIndex(goal).x,
              ) +
              Math.abs(
                geometry.fromIndex(neighbor).y - geometry.fromIndex(goal).y,
              ),
          );
          openSet.add(neighbor);
        }
      }
    }
  }
  return null;
}

function computePortalPaths(
  portals: Portal[],
  portalDistances: Map<number, Map<number, number>>,
): Map<number, Map<number, { cost: number; path: number[] }>> {
  const n = portals.length;
  const dist: number[][] = Array.from({ length: n }, () =>
    Array(n).fill(Infinity),
  );
  const path: number[][][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => [] as number[]),
  );

  // 初始化：对角线为0，路径为自己
  for (let i = 0; i < n; i++) {
    dist[i]![i] = 0;
    path[i]![i] = [i];
  }

  // 初始化直接连接：从i到j，如果i.to和j.from在有距离
  for (let i = 0; i < n; i++) {
    const to = portals[i]!.to;
    const distMap = portalDistances.get(to);
    if (!distMap) continue;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const from = portals[j]!.from;
      if (distMap.has(from)) {
        const cost = distMap.get(from)!;
        dist[i]![j] = cost;
        path[i]![j] = [i, j];
      }
    }
  }

  // Floyd-Warshall算法更新最短路径
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const dik = dist[i]![k]!;
        const dkj = dist[k]![j]!;
        const dij = dist[i]![j]!;
        if (dik + dkj < dij) {
          dist[i]![j] = dik + dkj;
          // 合并路径：path[i][k] + path[k][j]，但去掉重复的k
          path[i]![j] = [...path[i]![k]!, ...path[k]![j]!.slice(1)];
        }
      }
    }
  }

  // 构建结果Map
  const result = new Map<
    number,
    Map<number, { cost: number; path: number[] }>
  >();
  for (let i = 0; i < n; i++) {
    const map = new Map<number, { cost: number; path: number[] }>();
    for (let j = 0; j < n; j++) {
      const dval = dist[i]![j]!;
      if (dval < Infinity) {
        const pval = path[i]![j]!;
        map.set(j, { cost: dval, path: pval });
      }
    }
    result.set(i, map);
  }
  return result;
}

function precomputePortalsByFrom(portals: Portal[]): Map<number, Portal[]> {
  const map = new Map<number, Portal[]>();
  for (const portal of portals) {
    if (!map.has(portal.from)) {
      map.set(portal.from, []);
    }
    map.get(portal.from)!.push(portal);
  }
  return map;
}

/**
 * 预计算每个格子所属的区域索引。
 * 按顺序遍历区域，后定义的区域会覆盖先定义的（多区域重叠时以最后一个为准）。
 * @param tilesLength 格子总数
 * @param areas 区域列表
 * @returns 每个格子对应的区域索引数组，-1 表示不属于任何区域
 */
function precomputeAreaIndex(tilesLength: number, areas: Area[]): Int16Array {
  const areaIndex = new Int16Array(tilesLength).fill(-1);

  for (let areaIdx = 0; areaIdx < areas.length; areaIdx++) {
    const area = areas[areaIdx]!;
    for (const cellIdx of area.cells) {
      if (cellIdx >= 0 && cellIdx < tilesLength) {
        areaIndex[cellIdx] = areaIdx;
      }
    }
  }

  return areaIndex;
}

/**
 * 预计算区域名称到索引的映射。
 * 如果存在重名区域，后定义的会覆盖先定义的。
 * @param areas 区域列表
 * @returns 名称到索引的映射
 */
function precomputeAreasByName(areas: Area[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < areas.length; i++) {
    map.set(areas[i]!.name, i);
  }
  return map;
}
