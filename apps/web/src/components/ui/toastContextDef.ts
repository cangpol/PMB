import { createContext } from "react";

export type ToastType =
  "success" | "error" | "info" | "berhasil" | "peringatan" | "gagal" | "netral";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  variant?: ToastType;
}

export interface ToastContextType {
  toast: (opts: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined,
);
