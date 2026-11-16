import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    "primary" | "secondary" | "outline" | "ghost" | "white" | "outline-white";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Komponen Tombol Utama Sistem PMB UPT
 * Mendukung varian primary, secondary, outline, dan ghost dengan palet token biru & putih eksklusif.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      className = "",
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out cursor-pointer active:scale-[0.98] motion-reduce:active:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-600 focus-visible:ring-offset-2 focus-visible:ring-offset-putih";

    const variantStyles = {
      primary:
        "bg-gradient-to-b from-biru-600 to-biru-700 hover:from-biru-700 hover:to-biru-800 active:from-biru-800 active:to-biru-900 text-putih shadow-soft-md hover:shadow-soft-lg border border-biru-800 disabled:not-aria-busy:bg-none disabled:not-aria-busy:bg-biru-100 disabled:not-aria-busy:text-biru-700 disabled:not-aria-busy:border-biru-200 disabled:not-aria-busy:shadow-none",
      secondary:
        "bg-biru-100 hover:bg-biru-200 active:bg-biru-300 text-biru-950 border border-biru-200 disabled:not-aria-busy:opacity-60",
      outline:
        "bg-putih hover:bg-biru-50 active:bg-biru-100 text-biru-950 border border-biru-200 hover:border-biru-500 shadow-soft-sm disabled:not-aria-busy:opacity-60",
      ghost:
        "bg-transparent hover:bg-biru-50 active:bg-biru-100 text-biru-900 disabled:not-aria-busy:opacity-60",
      white:
        "bg-putih hover:bg-biru-50 active:bg-biru-100 text-biru-900 border border-putih shadow-soft-md hover:-translate-y-0.5 active:translate-y-0 transition-transform font-bold disabled:not-aria-busy:opacity-60",
      "outline-white":
        "bg-transparent hover:bg-putih/10 active:bg-putih/20 text-putih border border-putih/50 hover:border-putih shadow-soft-sm font-semibold disabled:not-aria-busy:opacity-60",
    };

    const sizeStyles = {
      sm: "min-h-8 px-3 py-1.5 text-xs gap-1.5",
      md: "min-h-10 px-4 py-2 text-sm gap-2",
      lg: "min-h-12 px-6 py-3 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            <span>Memproses...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
