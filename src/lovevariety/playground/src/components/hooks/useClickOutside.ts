import { useEffect, type RefObject } from "react";

/**
 * 监听点击元素外部事件的 Hook
 *
 * @param ref - 需要监听的元素引用
 * @param handler - 点击外部时的回调函数
 * @param enabled - 是否启用监听（默认 true）
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * useClickOutside(ref, () => setIsOpen(false), isOpen);
 * ```
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const onDown = (ev: MouseEvent) => {
      const el = ref.current;
      if (!el) return;

      const target = ev.target as Node | null;
      if (!target) return;

      // 如果点击的是 dialog 元素（或其内部），不触发回调
      // 这是因为 dialog 使用 showModal() 后会被放置在 top layer 中，
      // 不再是 ref 元素的后代，但逻辑上仍可能属于相关组件
      if (target instanceof Element && target.closest("dialog")) return;

      // 如果点击的是 popover 元素（或其内部），同样不触发回调
      // popover 也使用 top layer
      if (target instanceof Element && target.closest("[popover]")) return;

      // 点击在元素外部时触发回调
      if (!el.contains(target)) {
        handler();
      }
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, handler, enabled]);
}
