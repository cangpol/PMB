import * as React from "react";

interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  registerTrigger: (node: HTMLButtonElement | null) => void;
  registerContent: (node: HTMLDivElement | null) => void;
  closeAndFocusTrigger: () => void;
  focusFirstItem: () => void;
  getContentItems: () => HTMLElement[];
}

const DropdownContext = React.createContext<DropdownContextType | null>(null);

export interface DropdownMenuProps {
  children: React.ReactNode;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerNodeRef = React.useRef<HTMLButtonElement | null>(null);
  const contentNodeRef = React.useRef<HTMLDivElement | null>(null);

  const registerTrigger = React.useCallback(
    (node: HTMLButtonElement | null) => {
      triggerNodeRef.current = node;
    },
    [],
  );

  const registerContent = React.useCallback((node: HTMLDivElement | null) => {
    contentNodeRef.current = node;
  }, []);

  const closeAndFocusTrigger = React.useCallback(() => {
    setIsOpen(false);
    triggerNodeRef.current?.focus();
  }, []);

  const focusFirstItem = React.useCallback(() => {
    const first = contentNodeRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"])',
    );
    first?.focus();
  }, []);

  const getContentItems = React.useCallback(() => {
    return Array.from(
      contentNodeRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ) ?? [],
    );
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerNodeRef.current &&
        !triggerNodeRef.current.contains(event.target as Node) &&
        contentNodeRef.current &&
        !contentNodeRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerNodeRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const value = React.useMemo(
    () => ({
      isOpen,
      setIsOpen,
      registerTrigger,
      registerContent,
      closeAndFocusTrigger,
      focusFirstItem,
      getContentItems,
    }),
    [
      isOpen,
      registerTrigger,
      registerContent,
      closeAndFocusTrigger,
      focusFirstItem,
      getContentItems,
    ],
  );

  return (
    <DropdownContext.Provider value={value}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownContext.Provider>
  );
};

export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ onClick, children, className = "", ...props }, ref) => {
  const context = React.useContext(DropdownContext);
  if (!context)
    throw new Error("DropdownMenuTrigger must be within DropdownMenu");

  const handleRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      context.registerTrigger(node);
      if (typeof ref === "function") ref(node);
      else if (ref)
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current =
          node;
    },
    [context, ref],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      context.setIsOpen(true);
      setTimeout(() => {
        context.focusFirstItem();
      }, 0);
    }
  };

  return (
    <button
      ref={handleRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={context.isOpen}
      onClick={(e) => {
        context.setIsOpen((prev) => !prev);
        onClick?.(e);
      }}
      onKeyDown={handleKeyDown}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "right";
}

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(({ align = "right", className = "", children, ...props }, ref) => {
  const context = React.useContext(DropdownContext);
  if (!context)
    throw new Error("DropdownMenuContent must be within DropdownMenu");

  const handleRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      context.registerContent(node);
      if (typeof ref === "function") ref(node);
      else if (ref)
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [context, ref],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!context.isOpen) return;

    const items = context.getContentItems();
    const activeIndex = items.indexOf(document.activeElement as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex =
        activeIndex === -1 || activeIndex === items.length - 1
          ? 0
          : activeIndex + 1;
      items[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
      items[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Tab") {
      context.setIsOpen(false);
    }
  };

  if (!context.isOpen) return null;

  return (
    <div
      ref={handleRef}
      role="menu"
      aria-orientation="vertical"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={`absolute z-50 mt-2 min-w-[12rem] origin-top rounded-xl border border-biru-200 bg-putih p-1.5 shadow-soft-lg animate-in fade-in-80 zoom-in-95 focus:outline-none ${
        align === "right" ? "right-0" : "left-0"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuContent.displayName = "DropdownMenuContent";

export interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean;
}

export const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps
>(({ className = "", inset, disabled, onClick, children, ...props }, ref) => {
  const context = React.useContext(DropdownContext);

  return (
    <button
      ref={ref}
      role="menuitem"
      type="button"
      tabIndex={-1}
      disabled={disabled}
      aria-disabled={disabled}
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
        context?.closeAndFocusTrigger();
      }}
      className={`relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-biru-900 outline-none transition-colors hover:bg-biru-50 hover:text-biru-950 focus:bg-biru-100 focus:text-biru-950 disabled:pointer-events-none disabled:opacity-40 ${
        inset ? "pl-8" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={`-mx-1.5 my-1 h-px bg-biru-100 ${className}`}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-biru-700 ${className}`}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";
