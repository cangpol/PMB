import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
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
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-600 focus-visible:ring-offset-2 focus-visible:ring-offset-putih";

    const variantStyles = {
      primary:
        "bg-biru-700 hover:bg-biru-800 active:bg-biru-900 text-putih shadow-soft-sm hover:shadow-soft-md border border-biru-800",
      secondary:
        "bg-biru-100 hover:bg-biru-200 active:bg-biru-300 text-biru-950 border border-biru-200",
      outline:
        "bg-putih hover:bg-biru-50 active:bg-biru-100 text-biru-950 border border-biru-200 hover:border-biru-500 shadow-soft-sm",
      ghost: "bg-transparent hover:bg-biru-50 active:bg-biru-100 text-biru-900",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs gap-1.5",
      md: "px-4 py-2 text-sm gap-2",
      lg: "px-6 py-3 text-base gap-2.5",
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
