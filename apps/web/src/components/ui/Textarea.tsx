import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

/**
 * Komponen Area Teks Aksesibel PMB UPT
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        className={`w-full rounded-xl border bg-putih p-3.5 text-sm text-biru-950 placeholder:text-biru-500/80 transition-all duration-200 outline-none
          ${
            error
              ? "border-biru-600 ring-1 ring-biru-600 bg-biru-50/20"
              : "border-biru-200 hover:border-biru-500 focus:border-biru-600 focus:ring-2 focus:ring-biru-600/20"
          }
          disabled:bg-biru-50 disabled:text-biru-700/60 disabled:cursor-not-allowed
          ${className}`}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
