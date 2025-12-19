import { useRef } from "react";
import type { Proxied } from "./proxied.ts";
import { useEventHandler } from "./useEventHandler.ts";

export type ViewportMode =
  | { type: "center" }
  | {
      type: "manual";
      dx: number;
      dy: number;
      scale: number;
      x: number;
      y: number;
    }
  | {
      type: "scale";
      scale: number;
      _target?: { x: number; y: number; scale: number };
    }
  | { type: "limit" }
  | { type: "tracking"; x: number; y: number };

type Padding = { top: number; left: number; right: number; bottom: number };

export interface ViewportParam {
  scale: number;
  x: number;
  y: number;
}

export interface ViewportParamEx extends ViewportParam {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * A React hook that manages a virtual viewport for rendering content within a container.
 * It handles scaling, positioning, and animation based on the specified mode, ensuring the content fits within the given constraints.
 *
 * @param width - The width of the content to be rendered in the viewport.
 * @param height - The height of the content to be rendered in the viewport.
 * @param padding - Padding around the content, with top, left, right, and bottom values.
 * @param mode - A proxied viewport mode that determines how the viewport behaves (e.g., center, scale, manual, limit, tracking).
 * @param minScale - The minimum allowed scale factor for the viewport.
 * @param preferScale - The preferred scale factor; defaults to minScale if not provided.
 * @param maxScale - The maximum allowed scale factor for the viewport.
 * @returns An event handler function that takes an object with container width, height, and frame number,
 *          and returns a tuple containing the extended viewport parameters and an object indicating scale and move changes.
 */
export function useVirtualViewport({
  width,
  height,
  padding,
  mode,
  minScale,
  preferScale = minScale,
  maxScale,
}: {
  width: number;
  height: number;
  padding: { top: number; left: number; right: number; bottom: number };
  mode: Proxied<ViewportMode>;
  minScale: number;
  preferScale?: number;
  maxScale: number;
}) {
  const lastParam = useRef<ViewportParam>(null);
  const lastFrame = useRef<number>(null);
  const lastFocus = useRef<{ x: number; y: number }>(null);
  return useEventHandler(
    ({
      width: containerWidth,
      height: containerHeight,
      frame,
    }: {
      width: number;
      height: number;
      frame: number;
    }): [ViewportParamEx, { scale: number; move: number }] => {
      if (mode.value.type === "manual") {
        lastFocus.current = { x: mode.value.x, y: mode.value.y };
      }
      const targetParam =
        mode.value.type === "center" || lastParam.current == null
          ? getCenterParam({
              containerWidth,
              containerHeight,
              padding,
              width,
              height,
              minScale: Math.max(minScale, preferScale),
              maxScale,
            })
          : mode.value.type === "scale"
            ? getScaleParam({
                containerWidth,
                containerHeight,
                padding,
                lastX: lastParam.current.x,
                lastY: lastParam.current.y,
                lastScale: lastParam.current.scale,
                minScale,
                maxScale,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mode: mode as any,
              })
            : mode.value.type === "manual"
              ? getManualParam({
                  lastX: lastParam.current.x,
                  lastY: lastParam.current.y,
                  lastScale: lastParam.current.scale,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  mode: mode as any,
                })
              : mode.value.type === "limit"
                ? getLimitParam({
                    containerWidth,
                    containerHeight,
                    width,
                    height,
                    padding,
                    minScale,
                    maxScale,
                    lastX: lastParam.current.x,
                    lastY: lastParam.current.y,
                    lastScale: lastParam.current.scale,
                    focusX: lastFocus.current?.x ?? containerWidth / 2,
                    focusY: lastFocus.current?.y ?? containerHeight / 2,
                  })
                : getTrackingParam({
                    containerWidth,
                    containerHeight,
                    padding,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    mode: mode as any,
                  });
      if (
        lastFrame.current == null ||
        lastParam.current == null ||
        mode.value.type === "manual"
      ) {
        lastFrame.current = frame;
        lastParam.current = targetParam;
        return [
          getExParam(targetParam, {
            containerWidth,
            containerHeight,
            width,
            height,
          }),
          { scale: 0, move: 0 },
        ];
      }
      const diff = frame - lastFrame.current;
      lastFrame.current = frame;
      const [morphed, changed] = morph(diff, lastParam.current, targetParam);
      if (!changed && mode.value.type === "scale") {
        mode.value = { type: "limit" };
      }
      return [
        getExParam((lastParam.current = morphed), {
          containerWidth,
          containerHeight,
          width,
          height,
        }),
        changed,
      ];
    },
  );
}

function getExParam(
  param: ViewportParam,
  {
    containerWidth,
    containerHeight,
    width,
    height,
  }: {
    containerWidth: number;
    containerHeight: number;
    width: number;
    height: number;
  },
): ViewportParamEx {
  return {
    ...param,
    minX: Math.max(0, -param.x / param.scale),
    maxX: Math.min(width, (containerWidth - param.x) / param.scale),
    minY: Math.max(0, -param.y / param.scale),
    maxY: Math.min(height, (containerHeight - param.y) / param.scale),
  };
}

function getCenterParam({
  containerWidth,
  containerHeight,
  width,
  height,
  minScale,
  maxScale,
  padding,
}: {
  containerWidth: number;
  containerHeight: number;
  width: number;
  height: number;
  minScale: number;
  maxScale: number;
  padding: Padding;
}): ViewportParam {
  const availableWidth = containerWidth - padding.left - padding.right;
  const availableHeight = containerHeight - padding.top - padding.bottom;
  let scaleX = 1,
    scaleY = 1;
  if (availableWidth > width) {
    scaleX = Math.min(maxScale, availableWidth / width);
  } else if (availableWidth < width) {
    scaleX = Math.max(minScale, availableWidth / width);
  }
  if (availableHeight > height) {
    scaleY = Math.min(maxScale, availableHeight / height);
  } else {
    scaleY = Math.max(minScale, availableHeight / height);
  }
  const scale = Math.min(scaleX, scaleY);
  return {
    scale,
    x: (availableWidth - scale * width) / 2 + padding.left,
    y: (availableHeight - scale * height) / 2 + padding.top,
  };
}

function getManualParam({
  lastX,
  lastY,
  lastScale,
  mode,
}: {
  lastX: number;
  lastY: number;
  lastScale: number;
  mode: Proxied<ViewportMode & { type: "manual" }>;
}): ViewportParam {
  const { dx, dy, scale, x, y } = mode.value;
  if (mode.value.dx !== 0 || mode.value.dy !== 0 || mode.value.scale !== 1)
    mode.value = {
      type: "manual",
      dx: 0,
      dy: 0,
      scale: 1,
      x,
      y,
    };
  return scale === 1
    ? {
        scale: lastScale,
        x: lastX + dx,
        y: lastY + dy,
      }
    : {
        scale: lastScale * scale,
        x: lerp(x, lastX, scale) + dx,
        y: lerp(y, lastY, scale) + dy,
      };
}

function getScaleParam({
  containerWidth,
  containerHeight,
  padding,
  lastX,
  lastY,
  lastScale,
  minScale,
  maxScale,
  mode,
}: {
  containerWidth: number;
  containerHeight: number;
  padding: Padding;
  lastX: number;
  lastY: number;
  lastScale: number;
  minScale: number;
  maxScale: number;
  mode: Proxied<ViewportMode & { type: "scale" }>;
}): ViewportParam {
  return (mode.value._target ??= (() => {
    const { scale } = mode.value;
    const targetScale = Math.max(
      minScale,
      Math.min(maxScale, scale * lastScale),
    );
    const centerX = containerWidth / 2 + padding.left;
    const centerY = containerHeight / 2 + padding.top;
    return {
      x: lerp(centerX, lastX, targetScale / lastScale),
      y: lerp(centerY, lastY, targetScale / lastScale),
      scale: targetScale,
    };
  })());
}

function getLimitParam({
  containerWidth,
  containerHeight,
  width,
  height,
  padding,
  minScale,
  maxScale,
  lastX,
  lastY,
  lastScale,
  focusX,
  focusY,
}: {
  containerWidth: number;
  containerHeight: number;
  width: number;
  height: number;
  padding: Padding;
  minScale: number;
  maxScale: number;
  lastX: number;
  lastY: number;
  lastScale: number;
  focusX: number;
  focusY: number;
}): ViewportParam {
  const availableWidth = containerWidth - padding.left - padding.right;
  const availableHeight = containerHeight - padding.top - padding.bottom;
  let targetScale = lastScale;
  if (lastScale < minScale) {
    targetScale = minScale;
  } else if (lastScale > maxScale) {
    targetScale = maxScale;
  }
  if (targetScale !== lastScale) {
    lastX = lerp(focusX, lastX, targetScale / lastScale);
    lastY = lerp(focusY, lastY, targetScale / lastScale);
    lastScale = targetScale;
  }
  if (width * lastScale > availableWidth) {
    if (lastX > padding.left) {
      lastX = padding.left;
    } else if (lastX + width * lastScale - padding.left < availableWidth) {
      lastX = padding.left + availableWidth - width * lastScale;
    }
  } else {
    lastX = padding.left + (availableWidth - width * lastScale) / 2;
  }
  if (height * lastScale > availableHeight) {
    if (lastY > padding.top) {
      lastY = padding.top;
    } else if (lastY + height * lastScale - padding.top < availableHeight) {
      lastY = padding.top + availableHeight - height * lastScale;
    }
  } else {
    lastY = padding.top + (availableHeight - height * lastScale) / 2;
  }
  return {
    x: lastX,
    y: lastY,
    scale: lastScale,
  };
}

function getTrackingParam({
  containerWidth,
  containerHeight,
  padding,
  mode,
}: {
  containerWidth: number;
  containerHeight: number;
  padding: Padding;
  mode: Proxied<ViewportMode & { type: "tracking" }>;
}): ViewportParam {
  const availableWidth = containerWidth - padding.left - padding.right;
  const availableHeight = containerHeight - padding.top - padding.bottom;
  return {
    scale: 2,
    x: availableWidth / 2 + padding.left - mode.value.x * 2,
    y: availableHeight / 2 + padding.top - mode.value.y * 2,
  };
}

function morph(
  diff: number,
  last: ViewportParam,
  target: ViewportParam,
): [ViewportParam, { scale: number; move: number }] {
  const scale = interp(last.scale, target.scale, diff, 0.005, 0.0001);
  const x = interp(last.x, target.x, diff, 0.005, 0.05);
  const y = interp(last.y, target.y, diff, 0.005, 0.05);
  return [
    { scale, x, y },
    {
      scale: Math.abs(Math.log(scale / target.scale)),
      move: (Math.abs(x - target.x) ** 2 + Math.abs(y - target.y) ** 2) ** 0.5,
    },
  ];
}

function interp(
  a: number,
  b: number,
  delta: number,
  rate: number,
  min: number,
): number {
  return Math.abs(a - b) < min ? b : lerp(a, b, 1 - Math.exp(-delta * rate));
}

function lerp(a: number, b: number, rate: number) {
  return a + (b - a) * rate;
}
