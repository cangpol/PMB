import * as React from "react";
import { type LucideIcon, Inbox } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className = "",
  children,
}) => {
  const resolvedAction =
    action ||
    (actionLabel && onAction
      ? { label: actionLabel, onClick: onAction }
      : undefined);

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-biru-200 bg-biru-50/50 p-8 text-center sm:p-12 ${className}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-biru-100 text-biru-800 shadow-soft-sm">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>

      <h3 className="mt-4 font-serif text-lg font-semibold text-biru-950 sm:text-xl">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm text-biru-700 sm:text-base">
        {description}
      </p>

      {resolvedAction && (
        <div className="mt-6">
          <Button variant="primary" onClick={resolvedAction.onClick}>
            {resolvedAction.label}
          </Button>
        </div>
      )}

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
};
