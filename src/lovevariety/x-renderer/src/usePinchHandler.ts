import { debounce } from "es-toolkit";
import { useEffect, type RefObject } from "react";
import { withAbort } from "./abort.ts";
import { useLatestValue } from "./useLatestValue.ts";
import wetzls from "./wetzls.ts";

export type PinchEvent = {
  dx: number;
  dy: number;
  scale: number;
  x: number;
  y: number;
  source: "mouse" | "touch" | "wheel";
};

export type ClickEvent = {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  dx: number;
  dy: number;
  distance: number;
  duration: number; // ms
  source: "mouse" | "touch";
  button?: number;
};

export type UsePinchOptions<T extends HTMLElement = HTMLElement> = {
  ref: RefObject<T | null>;
  pinch: (e: PinchEvent) => void;
  click?: (e: ClickEvent) => void;
  end?: () => void;
  disabled?: boolean;
  clickOptions?: {
    maxDuration?: number;
    maxDistance?: number;
    preventDefault?: boolean;
  };
};

/**
 * Hook for attaching pinch handlers to an element ref.
 * It keeps the handlers always referencing the latest callbacks without re-attaching listeners.
 *
 * Usage:
 * usePinchHandler({ ref, pinch: (e) => {}, end: () => {}, disabled: false });
 */
export function usePinchHandler<T extends HTMLElement = HTMLElement>(
  options: UsePinchOptions<T>,
) {
  const { ref, disabled } = options;
  const handlersRef = useLatestValue({
    pinch: options.pinch,
    click: options.click,
    end: options.end,
  });

  useEffect(() => {
    const element = ref?.current ?? null;
    if (disabled || !element) return;

    const unsub = withAbort((signal) => {
      const DEFAULT_CLICK_MAX_DURATION_MS = 250;
      const DEFAULT_CLICK_MAX_DISTANCE_PX = 8;
      const { clickOptions } = options;
      const maxDuration =
        clickOptions?.maxDuration ?? DEFAULT_CLICK_MAX_DURATION_MS;
      const maxDistance =
        clickOptions?.maxDistance ?? DEFAULT_CLICK_MAX_DISTANCE_PX;

      const preventDefault = clickOptions?.preventDefault ?? false;

      let mousedownStart: {
        x: number;
        y: number;
        t: number;
        button: number;
      } | null = null;
      let lastMousePos: { x: number; y: number } | null = null;
      let mousemoved = false; // indicates a drag/pan (beyond threshold)
      let mouseMovedBeyondClickThreshold = false;
      element.addEventListener(
        "mousedown",
        (e: MouseEvent) => {
          if (e.button === 0) {
            if (preventDefault) e.preventDefault();
            const t = Date.now();
            mousedownStart = {
              x: e.clientX,
              y: e.clientY,
              t,
              button: e.button,
            };
            lastMousePos = { x: e.clientX, y: e.clientY };
            mousemoved = false;
            mouseMovedBeyondClickThreshold = false;
          }
        },
        { passive: !preventDefault, signal },
      );
      document.addEventListener(
        "mousemove",
        (e: MouseEvent) => {
          if (mousedownStart && lastMousePos) {
            handlersRef.current?.pinch({
              dx: e.clientX - lastMousePos.x,
              dy: e.clientY - lastMousePos.y,
              x: e.clientX,
              y: e.clientY,
              scale: 1,
              source: "mouse",
            });
            const dxFromStart = e.clientX - mousedownStart.x;
            const dyFromStart = e.clientY - mousedownStart.y;
            const dist = Math.hypot(dxFromStart, dyFromStart);
            if (dist > maxDistance) {
              mouseMovedBeyondClickThreshold = true;
            }
            lastMousePos.x = e.clientX;
            lastMousePos.y = e.clientY;
            // if movement goes beyond the click threshold, mark as a drag/pan
            if (mouseMovedBeyondClickThreshold) mousemoved = true;
          }
        },
        { passive: !preventDefault, signal },
      );
      document.addEventListener(
        "mouseup",
        (e: MouseEvent) => {
          if (e.button === 0) {
            const now = Date.now();
            if (mousedownStart) {
              const dxFromStart = e.clientX - mousedownStart.x;
              const dyFromStart = e.clientY - mousedownStart.y;
              const dist = Math.hypot(dxFromStart, dyFromStart);
              const duration = now - mousedownStart.t;
              // click if small movement and short duration
              if (
                !mouseMovedBeyondClickThreshold &&
                duration <= maxDuration &&
                dist <= maxDistance
              ) {
                const base = element.getBoundingClientRect();
                handlersRef.current?.click?.({
                  dx: dxFromStart,
                  dy: dyFromStart,
                  distance: dist,
                  duration,
                  x: e.clientX - base.x,
                  y: e.clientY - base.y,
                  clientX: e.clientX,
                  clientY: e.clientY,
                  source: "mouse",
                  button: e.button,
                });
              }
            }
            mousedownStart = null;
            lastMousePos = null;
            if (mousemoved) handlersRef.current?.end?.();
            mousemoved = false;
            mouseMovedBeyondClickThreshold = false;
          }
        },
        { passive: !preventDefault, signal },
      );
      document.addEventListener(
        "mouseleave",
        () => {
          // mouseleave does not always have button, but if left while dragging we should end
          mousedownStart = null;
          lastMousePos = null;
          if (mousemoved) handlersRef.current?.end?.();
          mousemoved = false;
          mouseMovedBeyondClickThreshold = false;
        },
        { passive: !preventDefault, signal },
      );
      const delayEnd = debounce(() => handlersRef.current?.end?.(), 100);
      element.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          const base = element.getBoundingClientRect();
          const clientX = (e as WheelEvent).clientX;
          const clientY = (e as WheelEvent).clientY;
          if ((e as WheelEvent).ctrlKey) {
            handlersRef.current?.pinch({
              dx: 0,
              dy: 0,
              x: clientX - base.x,
              y: clientY - base.y,
              scale: Math.exp((e as WheelEvent).deltaY * -0.01),
              source: "wheel",
            });
          } else {
            handlersRef.current?.pinch({
              dx: -(e as WheelEvent).deltaX,
              dy: -(e as WheelEvent).deltaY,
              x: clientX - base.x,
              y: clientY - base.y,
              scale: 1,
              source: "wheel",
            });
          }
          delayEnd();
        },
        { signal },
      );

      let lastTouches: Touch[] = [];
      let singleTouchStart: { x: number; y: number; t: number } | null = null;
      let touchMovedBeyondClickThreshold = false;
      element.addEventListener(
        "touchstart",
        (e: TouchEvent) => {
          lastTouches = [...e.touches];
          if (e.touches.length === 1) {
            const t = Date.now();
            const firstTouch = e.touches[0];
            if (firstTouch) {
              singleTouchStart = {
                x: firstTouch.clientX,
                y: firstTouch.clientY,
                t,
              };
            }
            touchMovedBeyondClickThreshold = false;
            if (preventDefault) e.preventDefault();
          } else {
            singleTouchStart = null;
          }
        },
        { passive: !preventDefault, signal },
      );
      document.addEventListener(
        "touchend",
        (e: TouchEvent) => {
          // e.touches is a live list of remaining touches
          lastTouches = [...e.touches];
          if (lastTouches.length === 0) {
            // If we had a single touch start and it did not move beyond threshold and duration is short, it's a click
            if (singleTouchStart) {
              const now = Date.now();
              const duration = now - singleTouchStart.t;
              if (!touchMovedBeyondClickThreshold && duration <= maxDuration) {
                const base = element.getBoundingClientRect();
                handlersRef.current?.click?.({
                  dx: 0,
                  dy: 0,
                  distance: 0,
                  duration,
                  x: singleTouchStart.x - base.x,
                  y: singleTouchStart.y - base.y,
                  clientX: singleTouchStart.x,
                  clientY: singleTouchStart.y,
                  source: "touch",
                });
              }
            }
            handlersRef.current?.end?.();
          }
          singleTouchStart = null;
          touchMovedBeyondClickThreshold = false;
        },
        { passive: !preventDefault, signal },
      );
      document.addEventListener(
        "touchcancel",
        (e: TouchEvent) => {
          lastTouches = [...e.touches];
          if (lastTouches.length === 0) {
            handlersRef.current?.end?.();
          }
          singleTouchStart = null;
          touchMovedBeyondClickThreshold = false;
        },
        { passive: !preventDefault, signal },
      );
      document.addEventListener(
        "touchmove",
        (e: TouchEvent) => {
          const base = element.getBoundingClientRect();
          const currentTouches = [...e.touches];
          try {
            if (lastTouches.length === 0) {
              return;
            }
            const lastCenter = touchCenter(lastTouches);
            const currentCenter = touchCenter(currentTouches);
            let scale = 1;
            if (currentTouches.length > 1 && lastTouches.length > 1) {
              const lastRadius = wetzls(
                lastTouches.map((t) => ({ x: t.clientX, y: t.clientY })),
              ).r;
              const currentRadius = wetzls(
                currentTouches.map((t) => ({ x: t.clientX, y: t.clientY })),
              ).r;
              scale = currentRadius / lastRadius;
            }
            // If we have a singleTouchStart, check whether this is a small move
            if (singleTouchStart && currentTouches.length === 1) {
              const first = currentTouches[0];
              if (first) {
                const dxFromStart = first.clientX - singleTouchStart.x;
                const dyFromStart = first.clientY - singleTouchStart.y;
                const dist = Math.hypot(dxFromStart, dyFromStart);
                if (dist > maxDistance) {
                  touchMovedBeyondClickThreshold = true;
                }
              }
            }
            handlersRef.current?.pinch({
              dx: currentCenter[0] - lastCenter[0],
              dy: currentCenter[1] - lastCenter[1],
              scale,
              x: currentCenter[0] - base.x,
              y: currentCenter[1] - base.y,
              source: "touch",
            });
          } finally {
            lastTouches = currentTouches;
          }
        },
        { passive: !preventDefault, signal },
      );
    });

    return unsub;
  }, [ref, disabled, handlersRef]);
}

export default usePinchHandler;

function touchCenter(list: Touch[]): [number, number] {
  const sum = list.reduce<[number, number]>(
    (prev, curr) => [curr.clientX + prev[0], curr.clientY + prev[1]],
    [0, 0],
  );
  return [sum[0] / list.length, sum[1] / list.length];
}
