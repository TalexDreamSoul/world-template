import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-ctp-surface0 rounded-lg p-6 shadow ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function CardTitle({ children, action }: CardTitleProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-ctp-text text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}
