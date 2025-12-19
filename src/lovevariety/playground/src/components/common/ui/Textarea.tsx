import React from "react";

interface TextareaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange"
> {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
  countFormatter?: (current: number, max?: number) => string;
  counterClassName?: string;
  className?: string;
  required?: boolean;
}

export function Textarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  showCount = true,
  countFormatter,
  counterClassName = "",
  className = "",
  required = false,
  disabled,
  ...rest
}: TextareaProps) {
  const current = value.length;
  return (
    <>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        required={required}
        className={`border-ctp-surface0 focus:border-ctp-mauve focus:ring-ctp-mauve mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none ${className}`}
        {...rest}
      />
      {showCount && (
        <div
          className={`text-ctp-subtext0 mt-1 text-xs ${counterClassName}`}
          aria-live="polite"
        >
          {countFormatter
            ? countFormatter(current, maxLength)
            : `${current}${maxLength ? `/${maxLength}` : ""}`}
        </div>
      )}
    </>
  );
}
