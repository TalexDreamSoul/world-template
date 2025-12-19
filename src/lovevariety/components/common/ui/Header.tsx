import React from "react";
import { BackButton } from "./BackButton.tsx";

interface HeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  back?: true;
  sticky?: boolean;
  shadow?: boolean;
  transparent?: boolean;
  compact?: boolean;
  className?: string;
}

export function Header({
  title,
  subtitle,
  left,
  right,
  back,
  sticky = true,
  shadow = true,
  transparent = false,
  compact = false,
  className = "",
}: HeaderProps) {
  const renderLeft = () => {
    if (left) return left;
    if (back === true) return <BackButton />;
    return null;
  };

  const containerClasses = [
    "mx-auto max-w-6xl px-4 py-3 flex items-center justify-between",
    compact ? "px-2 py-2" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const wrapperClasses = [
    sticky ? "sticky top-0 z-10" : "",
    shadow ? "border-b border-ctp-surface1 shadow-sm" : "",
    transparent ? "bg-transparent" : "bg-ctp-surface0",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClasses}>
      <div className={containerClasses}>
        <div className="flex items-center gap-4">
          {renderLeft()}
          {(title || subtitle) && (
            <div>
              {title && (
                <h1
                  className={`text-ctp-text font-semibold ${
                    compact ? "text-base" : "text-lg"
                  }`}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p
                  className={`text-gray-500 ${compact ? "text-xs" : "text-sm"}`}
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
        {right && <div>{right}</div>}
      </div>
    </div>
  );
}
