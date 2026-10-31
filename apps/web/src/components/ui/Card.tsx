import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outline" | "subtle";
}

/**
 * Komponen Kartu Kontainer (Card) PMB UPT
 * Radius 16px (rounded-2xl) dengan bayangan lembut bernuansa biru.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", variant = "default", children, ...props }, ref) => {
    const variantStyles = {
      default: "bg-putih border border-biru-200 shadow-soft-sm",
      elevated: "bg-putih border border-biru-100 shadow-soft-lg",
      outline: "bg-putih border-2 border-biru-200",
      subtle: "bg-biru-50/60 border border-biru-100",
    };

    return (
      <div
        ref={ref}
        className={`rounded-2xl transition-all duration-200 text-biru-950 ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`p-6 pb-4 border-b border-biru-100/70 space-y-1.5 ${className}`}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = "", ...props }, ref) => (
  <h3
    ref={ref}
    className={`font-serif text-xl sm:text-2xl font-bold tracking-tight text-biru-950 ${className}`}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = "", ...props }, ref) => (
  <p
    ref={ref}
    className={`text-xs sm:text-sm text-biru-800/90 leading-relaxed font-light ${className}`}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div ref={ref} className={`p-6 ${className}`} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`p-6 pt-4 border-t border-biru-100/70 flex items-center justify-between ${className}`}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
