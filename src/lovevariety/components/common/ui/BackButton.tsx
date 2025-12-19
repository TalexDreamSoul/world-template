import { useSetAtom } from "jotai";
import { appStateAtom } from "../../../contexts.ts";

export function BackButton({ floating = false }: { floating?: boolean }) {
  const setAppState = useSetAtom(appStateAtom);

  const baseProps = {
    onClick: () => setAppState({ type: "home" }),
    title: "返回",
    "aria-label": "返回",
  } as const;

  if (floating) {
    // Floating circular button (good for overlays / small screens)
    return (
      <button
        {...baseProps}
        className="border-ctp-surface1 bg-ctp-surface0 text-ctp-text focus:ring-ctp-mauve-400 fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition-transform hover:scale-105 hover:shadow-lg focus:ring-2 focus:outline-none"
      >
        <span aria-hidden>←</span>
      </button>
    );
  }

  // Inline/backbar button (good for headers and toolbars)
  return (
    <button
      {...baseProps}
      className="text-ctp-text hover:bg-ctp-mauve hover:text-ctp-mantle focus:ring-ctp-mauve-400 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
    >
      <span aria-hidden className="text-base">
        ←
      </span>
      <span>返回</span>
    </button>
  );
}
