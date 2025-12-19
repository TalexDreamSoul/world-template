interface InputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  required?: boolean;
  className?: string;
  type?: string;
}

export function Input({
  value,
  onChange,
  disabled = false,
  placeholder,
  id,
  required = false,
  className = "",
  type = "text",
}: InputProps) {
  return (
    <input
      type={type}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`border-ctp-surface1 focus:border-ctp-mauve focus:ring-ctp-mauve mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none ${className}`}
      required={required}
    />
  );
}
