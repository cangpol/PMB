import * as React from "react";
import { User } from "lucide-react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ size = "md", className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative inline-flex shrink-0 overflow-hidden rounded-full border border-biru-200 bg-biru-100 ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Avatar.displayName = "Avatar";

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  onLoadingStatusChange?: (status: "loading" | "loaded" | "error") => void;
}

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ src, alt = "Avatar", className = "", onError, onLoad, ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    if (!src || hasError) {
      return null;
    }

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={`h-full w-full object-cover ${className}`}
        onError={(e) => {
          setHasError(true);
          onError?.(e);
        }}
        onLoad={onLoad}
        {...props}
      />
    );
  },
);
AvatarImage.displayName = "AvatarImage";

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  initials?: string;
}

export const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  AvatarFallbackProps
>(({ initials, className = "", children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`flex h-full w-full items-center justify-center font-medium uppercase text-biru-900 bg-biru-100 ${className}`}
      {...props}
    >
      {initials
        ? initials.slice(0, 2)
        : (children ?? <User className="h-1/2 w-1/2 text-biru-700" />)}
    </div>
  );
});
AvatarFallback.displayName = "AvatarFallback";
