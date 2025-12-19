import { forwardRef } from "react";

interface ToggleProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ id, checked, onChange, label, className, disabled, ...rest }, ref) => {
    return (
      <label className={`flex items-center space-x-3 ${className ?? ""}`}>
        {/* visually-hidden input maintains accessible semantics */}
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
          aria-checked={checked}
          disabled={disabled}
          ref={ref}
          {...rest}
        />
        <span
          className={`peer-focus:ring-ctp-mauve-300 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out peer-focus:ring-2 peer-focus:ring-offset-1 ${
            disabled ? "cursor-not-allowed opacity-50" : ""
          } ${checked ? "bg-ctp-mauve" : "bg-ctp-surface1"}`}
          aria-hidden="true"
        >
          <span
            className={`bg-ctp-mauve-50 pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition-transform duration-200 ease-in-out ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
        {label && (
          <span className="text-ctp-text text-sm select-none">{label}</span>
        )}
      </label>
    );
  },
);

Toggle.displayName = "Toggle";

export { Toggle };
