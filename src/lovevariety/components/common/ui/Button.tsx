import React from "react";

type Variant = "primary" | "danger" | "secondary" | "ghost";
type Size = "sm" | "md";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const baseClasses =
  "inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2";

const variantClasses: Record<Variant, string> = {
  primary:
    "text-ctp-mantle transition-all bg-ctp-mauve-400 hover:bg-ctp-mauve focus:ring-ctp-mauve-500",
  danger:
    "text-ctp-mantle transition-all bg-ctp-red-600 hover:bg-ctp-red-700 focus:ring-ctp-red-500",
  secondary:
    "text-ctp-mantle transition-all bg-ctp-lavender-200 hover:bg-ctp-lavender-50 focus:ring-ctp-lavender-500",
  ghost:
    "bg-transparent transition-all text-ctp-text hover:bg-ctp-surface0 focus:ring-ctp-mauve",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const classes =
    `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`.trim();

  return (
    <button className={classes} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
