import React, { createContext, useContext, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export interface DialogProps {
  open?: boolean;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  open: controlledOpen,
  isOpen,
  defaultOpen = false,
  onOpenChange,
  onClose,
  children,
}) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const resolvedOpen =
    controlledOpen !== undefined
      ? controlledOpen
      : isOpen !== undefined
        ? isOpen
        : internalOpen;

  const handleOpenChange = (val: boolean) => {
    if (controlledOpen === undefined && isOpen === undefined) {
      setInternalOpen(val);
    }
    onOpenChange?.(val);
    if (!val) {
      onClose?.();
    }
  };

  return (
    <DialogContext.Provider
      value={{ open: resolvedOpen, onOpenChange: handleOpenChange }}
    >
      {children}
    </DialogContext.Provider>
  );
};

export const DialogTrigger: React.FC<{
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}> = ({ children }) => {
  const context = useContext(DialogContext);
  if (!context) throw new Error("DialogTrigger harus berada di dalam Dialog");

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

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const DialogContent: React.FC<DialogContentProps> = ({
  className = "",
  children,
  ...props
}) => {
  const context = useContext(DialogContext);
  if (!context) throw new Error("DialogContent harus berada di dalam Dialog");

  const contentRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && context.open) {
        context.onOpenChange(false);
      }

      if (e.key === "Tab" && context.open && contentRef.current) {
        const focusables = Array.from(
          contentRef.current.querySelectorAll<HTMLElement>(
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
      // Fokuskan elemen pertama yang dapat difokuskan di dalam dialog
      const focusable = contentRef.current?.querySelector<HTMLElement>(
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-biru-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => context.onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Dialog Surface */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full max-w-lg rounded-2xl bg-putih border border-biru-200 p-6 shadow-soft-xl text-biru-950 transition-all transform animate-scale-up ${className}`}
        {...props}
      >
        <button
          type="button"
          aria-label="Tutup dialog"
          onClick={() => context.onOpenChange(false)}
          className="absolute right-4 top-4 p-1 rounded-lg text-biru-700 hover:text-biru-950 hover:bg-biru-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-600 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
};

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  ...props
}) => (
  <div
    className={`space-y-1.5 pb-4 border-b border-biru-100 ${className}`}
    {...props}
  />
);

export const DialogTitle: React.FC<
  React.HTMLAttributes<HTMLHeadingElement>
> = ({ className = "", ...props }) => (
  <h2
    className={`font-serif text-xl sm:text-2xl font-bold text-biru-950 ${className}`}
    {...props}
  />
);

export const DialogDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className = "", ...props }) => (
  <p
    className={`text-xs sm:text-sm text-biru-800 font-light leading-relaxed ${className}`}
    {...props}
  />
);

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  ...props
}) => (
  <div
    className={`pt-4 border-t border-biru-100 flex items-center justify-end gap-3 ${className}`}
    {...props}
  />
);
