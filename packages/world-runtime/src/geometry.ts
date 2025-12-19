import { Direction } from "./types.ts";

export class GridGeometry {
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * Convert (x, y) coordinates to 1D index.
   */
  toIndex(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new Error(
        `Coordinates (${x}, ${y}) out of bounds for grid ${this.width}x${this.height}`,
      );
    }
    return y * this.width + x;
  }

  /**
   * Convert 1D index to (x, y) coordinates.
   */
  fromIndex(index: number): { x: number; y: number } {
    if (index < 0 || index >= this.width * this.height) {
      throw new Error(
        `Index ${index} out of bounds for grid ${this.width}x${this.height}`,
      );
    }
    return { x: index % this.width, y: Math.floor(index / this.width) };
  }

  /**
   * Return true if (x,y) is inside the grid bounds.
   */
  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * Get the direction from one tile to an adjacent tile.
   * Returns undefined if the tiles are not adjacent.
   */
  getDirection(fromIndex: number, toIndex: number): Direction | undefined {
    const { x: fx, y: fy } = this.fromIndex(fromIndex);
    const { x: tx, y: ty } = this.fromIndex(toIndex);

    const dx = tx - fx;
    const dy = ty - fy;

    if (dx === 0 && dy === 1) return Direction.Down;
    if (dx === 0 && dy === -1) return Direction.Up;
    if (dx === 1 && dy === 0) return Direction.Right;
    if (dx === -1 && dy === 0) return Direction.Left;

    return undefined; // not adjacent
  }
}
