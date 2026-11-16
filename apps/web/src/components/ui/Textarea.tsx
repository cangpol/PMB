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
        className={`w-full rounded-xl border bg-putih p-3.5 text-sm text-biru-950 placeholder:text-slate-500 transition-[border-color,box-shadow,background-color] duration-200 outline-none
          ${
            error
              ? "border-rose-600 ring-1 ring-rose-600/40 bg-rose-50/40 focus:ring-2 focus:ring-rose-600/30"
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
