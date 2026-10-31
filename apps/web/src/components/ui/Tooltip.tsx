import * as React from "react";

interface TooltipContextType {
  isVisible: boolean;
  showTooltip: () => void;
  hideTooltip: () => void;
  tooltipId: string;
}

const TooltipContext = React.createContext<TooltipContextType | null>(null);

export interface TooltipProps {
  children: React.ReactNode;
  delayDuration?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  delayDuration = 200,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = React.useId();

  const showTooltip = React.useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayDuration);
  }, [delayDuration]);

  const hideTooltip = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <TooltipContext.Provider
      value={{ isVisible, showTooltip, hideTooltip, tooltipId }}
    >
      <div className="relative inline-flex items-center">{children}</div>
    </TooltipContext.Provider>
  );
};

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
}

export const TooltipTrigger = React.forwardRef<
  HTMLSpanElement,
  TooltipTriggerProps
>(
  (
    {
      children,
      className = "",
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const context = React.useContext(TooltipContext);
    if (!context) throw new Error("TooltipTrigger must be within Tooltip");

    return (
      <span
        ref={ref}
        tabIndex={0}
        aria-describedby={context.isVisible ? context.tooltipId : undefined}
        onMouseEnter={(e) => {
          context.showTooltip();
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          context.hideTooltip();
          onMouseLeave?.(e);
        }}
        onFocus={(e) => {
          context.showTooltip();
          onFocus?.(e);
        }}
        onBlur={(e) => {
          context.hideTooltip();
          onBlur?.(e);
        }}
        className={`inline-flex items-center cursor-default outline-none focus-visible:ring-2 focus-visible:ring-biru-500 rounded ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  },
);
TooltipTrigger.displayName = "TooltipTrigger";

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom";
}

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  TooltipContentProps
>(({ side = "top", className = "", children, ...props }, ref) => {
  const context = React.useContext(TooltipContext);
  if (!context) throw new Error("TooltipContent must be within Tooltip");

  if (!context.isVisible) return null;

  const positionClasses =
    side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
      : "top-full left-1/2 -translate-x-1/2 mt-2";

  return (
    <div
      ref={ref}
      id={context.tooltipId}
      role="tooltip"
      className={`absolute z-50 whitespace-nowrap rounded-lg bg-biru-950 px-3 py-1.5 text-xs font-medium text-putih shadow-soft-md animate-in fade-in-50 zoom-in-95 pointer-events-none ${positionClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
TooltipContent.displayName = "TooltipContent";
