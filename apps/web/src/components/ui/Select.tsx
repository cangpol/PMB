import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

/**
 * Komponen Pilihan (Select Dropdown) PMB UPT
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", error, children, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          disabled={disabled}
          aria-invalid={error ? "true" : undefined}
          className={`w-full appearance-none rounded-xl border bg-putih py-2.5 pl-3.5 pr-10 text-sm text-biru-950 transition-all duration-200 outline-none
            ${
              error
                ? "border-biru-600 ring-1 ring-biru-600 bg-biru-50/20"
                : "border-biru-200 hover:border-biru-500 focus:border-biru-600 focus:ring-2 focus:ring-biru-600/20"
            }
            disabled:bg-biru-50 disabled:text-biru-700/60 disabled:cursor-not-allowed
            ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-biru-600">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    );
  },
);

Select.displayName = "Select";
