import React from "react";

export interface RadioProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

/**
 * Komponen Tombol Pilihan Opsi (Radio Button) PMB UPT
 */
export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  (
    { className = "", label, description, disabled, id, checked, ...props },
    ref,
  ) => {
    const inputId =
      id ||
      (label
        ? `radio-${String(label).toLowerCase().replace(/\s+/g, "-")}`
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
            type="radio"
            disabled={disabled}
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <div className="w-5 h-5 rounded-full border border-biru-200 bg-putih transition-all duration-200 peer-checked:border-biru-700 peer-focus-visible:ring-2 peer-focus-visible:ring-biru-600 peer-focus-visible:ring-offset-2 flex items-center justify-center shadow-soft-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-biru-700 opacity-0 peer-checked:opacity-100 transition-opacity" />
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

Radio.displayName = "Radio";
