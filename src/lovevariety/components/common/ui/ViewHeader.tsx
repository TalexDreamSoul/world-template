import { BackIcon } from "./BackIcon.tsx";

export function ViewHeader({
  title,
  onBack,
  rightAction,
}: {
  title: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex min-h-8 items-center gap-2">
      <button
        onClick={onBack}
        className="text-ctp-subtext0 hover:text-ctp-text p-1 transition-colors"
        aria-label="返回"
      >
        <BackIcon />
      </button>
      <span className="text-ctp-text text-sm font-medium">{title}</span>
      {rightAction && <div className="ml-auto">{rightAction}</div>}
    </div>
  );
}
