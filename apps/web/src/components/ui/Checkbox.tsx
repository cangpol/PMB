import React from "react";
import { Check } from "lucide-react";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

/**
 * Komponen Kotak Centang (Checkbox) Aksesibel PMB UPT
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { className = "", label, description, disabled, id, checked, ...props },
    ref,
  ) => {
    const inputId =
      id ||
      (label
        ? `cb-${String(label).toLowerCase().replace(/\s+/g, "-")}`
        : undefined);

    return (
      <label
        htmlFor={inputId}
        className={`inline-flex items-start gap-3 select-none ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            id={inputId}
            ref={ref}
            type="checkbox"
            disabled={disabled}
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <div className="w-5 h-5 rounded-md border border-biru-200 bg-putih transition-all duration-200 peer-checked:bg-biru-700 peer-checked:border-biru-700 peer-focus-visible:ring-2 peer-focus-visible:ring-biru-600 peer-focus-visible:ring-offset-2 flex items-center justify-center text-putih shadow-soft-sm">
            <Check className="w-3.5 h-3.5 stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>
        {(label || description) && (
          <div className="space-y-0.5 text-left">
            {label && (
              <span className="text-sm font-medium text-biru-950 block">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-biru-700 block">{description}</span>
            )}
          </div>
        )}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
