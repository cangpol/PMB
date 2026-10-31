import React, { useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import {
  ToastContext,
  type ToastItem,
  type ToastType,
} from "./toastContextDef";

export type { ToastItem, ToastType };

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, type, variant }: Omit<ToastItem, "id">) => {
      const resolvedType = variant || type || "info";
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      setToasts((prev) => [
        ...prev,
        { id, title, description, type: resolvedType, variant: resolvedType },
      ]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      {/* Toast Viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto rounded-xl border border-biru-200 bg-putih p-4 shadow-soft-lg flex items-start gap-3 text-biru-950 animate-slide-up"
          >
            <div className="shrink-0 mt-0.5">
              {(t.type === "success" || t.type === "berhasil") && (
                <CheckCircle2 className="w-4 h-4 text-biru-700" />
              )}
              {(t.type === "error" ||
                t.type === "gagal" ||
                t.type === "peringatan") && (
                <AlertCircle className="w-4 h-4 text-biru-600" />
              )}
              {(t.type === "info" || t.type === "netral") && (
                <Info className="w-4 h-4 text-biru-700" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-semibold text-sm text-biru-950 leading-snug">
                {t.title}
              </h5>
              {t.description && (
                <p className="text-xs text-biru-700 mt-1 leading-relaxed">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Tutup notifikasi"
              onClick={() => removeToast(t.id)}
              className="text-biru-700 hover:text-biru-950 p-1 rounded-md cursor-pointer hover:bg-biru-50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
