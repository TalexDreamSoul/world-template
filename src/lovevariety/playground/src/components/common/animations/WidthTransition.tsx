import { Slot } from "@radix-ui/react-slot";
import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ElementType,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * Props shared by all `WidthTransition` variants.
 */
type WidthTransitionBaseProps<T extends ElementType | undefined> = {
  as?: T;
  children: ReactNode;
  initialWidth?: number;
  ref?: ForwardedRef<ComponentRef<"div">>;
  className?: string;
  duration?: number;
  delay?: number;
  easing?: string;
  disconnected?: boolean;
};

type WidthTransitionProps<T extends ElementType | undefined> =
  T extends ElementType
    ? WidthTransitionBaseProps<T> &
        Omit<ComponentPropsWithoutRef<T>, keyof WidthTransitionBaseProps<T>> & {
          children?: ReactNode;
        }
    : WidthTransitionBaseProps<T> & { children: ReactElement };

/**
 * WidthTransition animates its parent's width when the content
 * (the inner container) changes size.
 */
export function WidthTransition<T extends ElementType | undefined>({
  as,
  initialWidth,
  children,
  ref,
  className,
  duration = 250,
  delay = 0,
  easing = "cubic-bezier(0.445, 0.05, 0.55, 0.95)",
  disconnected,
  ...rest
}: WidthTransitionProps<T>) {
  const Component = as ?? Slot;
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const parent = container.current!.parentElement as HTMLDivElement;
    const initial = parent.offsetWidth;
    let animation = parent.animate(
      { width: [`${initial}px`, `${initial}px`] },
      { duration: 0, fill: "forwards" },
    );
    let innerAnimation = false;
    parent.addEventListener("widthTransitionStart", (e) => {
      if (disconnected) e.stopPropagation();
      if (e.target === parent) return;
      innerAnimation = true;
      if (animation.playState === "finished") animation.cancel();
    });
    parent.addEventListener("widthTransitionEnd", (e) => {
      if (disconnected) e.stopPropagation();
      if (e.target === parent) return;
      innerAnimation = false;
      animateWidth();
    });
    function animateWidth() {
      const current = parent.offsetWidth;
      const target =
        container.current!.offsetWidth + current - parent.clientWidth;
      animation.cancel();
      if (current === target) {
        animation = parent.animate(
          { width: [`${current}px`, `${current}px`] },
          { duration: 0, fill: "forwards" },
        );
        return;
      }
      parent.dispatchEvent(
        new CustomEvent("widthTransitionStart", { bubbles: true }),
      );
      animation = parent.animate(
        { width: [`${current}px`, `${target}px`] },
        {
          fill: "both",
          ...(current !== target && {
            duration,
            delay,
            easing,
          }),
        },
      );
      animation.addEventListener("finish", () => {
        parent.dispatchEvent(
          new CustomEvent("widthTransitionEnd", { bubbles: true }),
        );
      });
    }
    const observer = new ResizeObserver(() => {
      if (innerAnimation) return;
      animateWidth();
    });
    observer.observe(container.current!, { box: "content-box" });
    return () => {
      observer.disconnect();
    };
  }, [delay, duration, easing, disconnected]);
  return (
    <div className={className} ref={ref} style={{ width: initialWidth }}>
      <Component {...rest} ref={container}>
        {children}
      </Component>
    </div>
  );
}
