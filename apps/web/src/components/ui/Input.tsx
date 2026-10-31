import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Komponen Input Teks Aksesibel PMB UPT
 * Mematuhi token warna biru & putih dengan penanganan fokus tampak.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-biru-600 pointer-events-none shrink-0 flex items-center justify-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          aria-invalid={error ? "true" : undefined}
          className={`w-full rounded-xl border bg-putih py-2.5 text-sm text-biru-950 placeholder:text-biru-500/80 transition-all duration-200 outline-none
            ${leftIcon ? "pl-10" : "pl-3.5"}
            ${rightIcon ? "pr-10" : "pr-3.5"}
            ${
              error
                ? "border-biru-600 ring-1 ring-biru-600 bg-biru-50/20"
                : "border-biru-200 hover:border-biru-500 focus:border-biru-600 focus:ring-2 focus:ring-biru-600/20"
            }
            disabled:bg-biru-50 disabled:text-biru-700/60 disabled:cursor-not-allowed
            ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-biru-600 pointer-events-none shrink-0 flex items-center justify-center">
            {rightIcon}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
