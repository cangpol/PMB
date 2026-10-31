import React, { createContext, useContext, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface DrawerContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: "left" | "right" | "bottom";
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export interface DrawerProps {
  open?: boolean;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  position?: "left" | "right" | "bottom";
  side?: "left" | "right" | "bottom";
  title?: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  open: controlledOpen,
  isOpen,
  defaultOpen = false,
  onOpenChange,
  onClose,
  position = "right",
  side,
  title,
  children,
}) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const resolvedOpen =
    controlledOpen !== undefined
      ? controlledOpen
      : isOpen !== undefined
        ? isOpen
        : internalOpen;
  const resolvedPosition = side || position;

  const handleOpenChange = (val: boolean) => {
    if (controlledOpen === undefined && isOpen === undefined) {
      setInternalOpen(val);
    }
    onOpenChange?.(val);
    if (!val) {
      onClose?.();
    }
  };

  const isDirectContent =
    React.isValidElement(children) && children.type === DrawerContent;

  return (
    <DrawerContext.Provider
      value={{
        open: resolvedOpen,
        onOpenChange: handleOpenChange,
        position: resolvedPosition,
      }}
    >
      {isDirectContent ? (
        children
      ) : (
        <DrawerContent>
          {title && (
            <div className="mb-4 border-b border-biru-100 pb-3">
              <h3 className="font-serif text-lg font-semibold text-biru-950">
                {title}
              </h3>
            </div>
          )}
          {children}
        </DrawerContent>
      )}
    </DrawerContext.Provider>
  );
};

export const DrawerTrigger: React.FC<{
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}> = ({ children }) => {
  const context = useContext(DrawerContext);
  if (!context) throw new Error("DrawerTrigger harus berada di dalam Drawer");

  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      (
        children.props.onClick as
          React.MouseEventHandler<HTMLElement> | undefined
      )?.(e);
      context.onOpenChange(true);
    },
  });
};

export interface DrawerContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const DrawerContent: React.FC<DrawerContentProps> = ({
  className = "",
  children,
  ...props
}) => {
  const context = useContext(DrawerContext);
  if (!context) throw new Error("DrawerContent harus berada di dalam Drawer");

  const drawerRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && context.open) {
        context.onOpenChange(false);
      }

      if (e.key === "Tab" && context.open && drawerRef.current) {
        const focusables = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter(
          (el) =>
            !el.hasAttribute("disabled") &&
            el.getAttribute("aria-hidden") !== "true",
        );

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    if (context.open) {
      lastActiveRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      const focusable = drawerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    } else {
      document.body.style.overflow = "";
      if (lastActiveRef.current) {
        lastActiveRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [context.open, context]);

  if (!context.open) return null;

  const positionStyles = {
    right:
      "inset-y-0 right-0 w-full sm:max-w-md border-l border-biru-200 animate-slide-left",
    left: "inset-y-0 left-0 w-full sm:max-w-md border-r border-biru-200 animate-slide-right",
    bottom:
      "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t border-biru-200 animate-slide-up",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-biru-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => context.onOpenChange(false)}
        aria-hidden="true"
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        className={`fixed bg-putih p-6 shadow-soft-xl z-10 flex flex-col justify-between overflow-y-auto ${positionStyles[context.position]} ${className}`}
        {...props}
      >
        <button
          type="button"
          aria-label="Tutup panel"
          onClick={() => context.onOpenChange(false)}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-biru-700 hover:text-biru-950 hover:bg-biru-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-600 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
};
