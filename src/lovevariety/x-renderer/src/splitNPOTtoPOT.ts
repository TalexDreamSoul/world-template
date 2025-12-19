// 定义输入参数接口
export interface TextureSplitParams {
  width: number; // 输入纹理的宽度
  height: number; // 输入纹理的高度
  maxSize: number; // 最大纹理尺寸（如 1024）
  minSize: number; // 最小纹理尺寸（如 256）
  overlap: number; // 左侧上侧重叠像素数 （最小值）
}

// 定义输出的纹理分片信息
export interface TextureTile {
  x: number; // 分片在原纹理中的 x 坐标
  y: number; // 分片在原纹理中的 y 坐标
  textureWidth: number; // 裁剪的纹理宽度 （一定为 POT）
  textureHeight: number; // 裁剪的纹理高度 （一定为 POT）
  effective: number; // 有效面积（总面积 - overlap浪费的面积 - overflow浪费的面积）
}

// 工具函数：获取大于等于n的最近POT值
function getNextPOT(n: number): number {
  let pot = 1;
  while (pot < n) {
    pot *= 2;
  }
  return pot;
}

// 主算法：将 NPOT 纹理分割为 POT 纹理
export function splitNPOTtoPOT(params: TextureSplitParams): TextureTile[] {
  const { width, height, maxSize, minSize, overlap } = params;
  const tiles: TextureTile[] = [];

  // 验证输入参数
  if (
    minSize < 1 ||
    maxSize < minSize ||
    overlap < 0 ||
    width < 1 ||
    height < 1
  ) {
    return [];
  }

  // 获取可能的POT尺寸
  const possibleSizes: number[] = [];
  let size = minSize;
  while (size <= maxSize) {
    possibleSizes.push(size);
    size *= 2;
  }
  if (!possibleSizes.length) {
    return [];
  }

  // 当前处理的坐标
  let currentX = 0;
  let currentY = 0;

  while (currentY < height) {
    currentX = 0;
    while (currentX < width) {
      // 计算剩余宽度和高度
      const remainingWidth = width - currentX;
      const remainingHeight = height - currentY;

      // 找到合适的分片尺寸
      let bestTile: TextureTile | null = null;
      let minWastedArea = Infinity;

      for (const tileSize of possibleSizes) {
        if (tileSize < minSize) continue;

        // 计算实际需要的纹理尺寸（考虑overlap）
        const effectiveX = currentX === 0 ? 0 : overlap;
        const effectiveY = currentY === 0 ? 0 : overlap;
        const tileWidth = getNextPOT(remainingWidth + effectiveX);
        const tileHeight = getNextPOT(remainingHeight + effectiveY);

        // 确保纹理尺寸在范围内
        if (tileWidth > maxSize || tileHeight > maxSize) continue;

        // 计算有效面积和浪费面积
        const totalArea = tileWidth * tileHeight;
        const effectiveWidth = Math.min(tileWidth - effectiveX, remainingWidth);
        const effectiveHeight = Math.min(
          tileHeight - effectiveY,
          remainingHeight,
        );
        const effectiveArea = effectiveWidth * effectiveHeight;
        const wastedArea = totalArea - effectiveArea;

        // 更新最佳分片
        if (wastedArea < minWastedArea) {
          minWastedArea = wastedArea;
          bestTile = {
            x: currentX - effectiveX,
            y: currentY - effectiveY,
            textureWidth: tileWidth,
            textureHeight: tileHeight,
            effective: effectiveArea,
          };
        }
      }

      // 如果没有找到合适的分片，使用最大尺寸
      if (!bestTile) {
        const tileWidth = Math.min(maxSize, getNextPOT(remainingWidth));
        const tileHeight = Math.min(maxSize, getNextPOT(remainingHeight));
        const effectiveX = currentX === 0 ? 0 : overlap;
        const effectiveY = currentY === 0 ? 0 : overlap;
        const effectiveWidth = Math.min(tileWidth - effectiveX, remainingWidth);
        const effectiveHeight = Math.min(
          tileHeight - effectiveY,
          remainingHeight,
        );
        bestTile = {
          x: currentX - effectiveX,
          y: currentY - effectiveY,
          textureWidth: tileWidth,
          textureHeight: tileHeight,
          effective: effectiveWidth * effectiveHeight,
        };
      }

      tiles.push(bestTile);
      currentX += bestTile.textureWidth - (currentX === 0 ? 0 : overlap);
    }
    currentY +=
      tiles[tiles.length - 1]!.textureHeight - (currentY === 0 ? 0 : overlap);
  }

  return tiles;
}
