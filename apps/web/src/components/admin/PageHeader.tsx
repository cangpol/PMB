import * as React from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  tag?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  tag,
  actions,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-200 ${className}`}
    >
      <div>
        {tag && (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-100 text-biru-800 mb-1">
            {tag}
          </span>
        )}
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-biru-700 font-sans mt-0.5 max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
