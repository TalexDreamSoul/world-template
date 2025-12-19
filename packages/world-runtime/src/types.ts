export enum TileType {
  Obstacle = 0,
  Normal = 1,
  Fast = 2,
}

export enum Direction {
  Up = 0,
  Down = 1,
  Left = 2,
  Right = 3,
}

export interface Portal {
  from: number; // 1D index
  to: number; // 1D index
  direction?: Direction; // optional restriction on entry direction
}

export interface Area {
  name: string;
  description?: string;
  cells: number[]; // 1D indices
}
