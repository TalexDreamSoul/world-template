import React from "react";

interface LabelProps {
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({
  htmlFor,
  className,
  children,
}) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-ctp-subtext0 block text-sm font-medium ${className || ""}`}
    >
      {children}
    </label>
  );
};
