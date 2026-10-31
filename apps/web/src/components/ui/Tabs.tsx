import React, { createContext, useContext, useState } from "react";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (val: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (val: string) => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * Komponen Tab Navigasi Aksesibel PMB UPT
 * Mendukung navigasi keyboard: ArrowLeft / ArrowRight, Home, End.
 */
export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  className = "",
  children,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = value !== undefined ? value : internalValue;

  const setActiveTab = (val: string) => {
    if (value === undefined) setInternalValue(val);
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={`w-full space-y-4 ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

export const TabsList: React.FC<TabsListProps> = ({
  className = "",
  children,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const list = e.currentTarget;
    const triggers = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
    );
    const index = triggers.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = (index + 1) % triggers.length;
      triggers[next].focus();
      triggers[next].click();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = (index - 1 + triggers.length) % triggers.length;
      triggers[prev].focus();
      triggers[prev].click();
    } else if (e.key === "Home") {
      e.preventDefault();
      triggers[0].focus();
      triggers[0].click();
    } else if (e.key === "End") {
      e.preventDefault();
      triggers[triggers.length - 1].focus();
      triggers[triggers.length - 1].click();
    }
  };

  return (
    <div
      role="tablist"
      onKeyDown={handleKeyDown}
      className={`inline-flex items-center gap-1.5 p-1 bg-biru-50/80 border border-biru-200 rounded-xl max-w-full overflow-x-auto ${className}`}
    >
      {children}
    </div>
  );
};

export interface TabsTriggerProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  disabled = false,
  className = "",
  children,
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger harus digunakan di dalam Tabs");

  const isActive = context.activeTab === value;

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => context.setActiveTab(value)}
      className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-600 ${
        isActive
          ? "bg-biru-700 text-putih shadow-soft-sm"
          : "text-biru-900 hover:text-biru-950 hover:bg-biru-100/60"
      } ${className}`}
    >
      {children}
    </button>
  );
};

export interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  className = "",
  children,
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent harus digunakan di dalam Tabs");

  if (context.activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={`focus-visible:outline-none animate-fade-in ${className}`}
    >
      {children}
    </div>
  );
};
