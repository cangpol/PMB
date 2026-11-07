import { useContext } from "react";
import { DialogContext } from "./dialogContextDef";

/** Popup konfirmasi/alasan/hasil yang rapi; pengganti alert, confirm, dan prompt bawaan browser. */
export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx)
    throw new Error("useDialog harus digunakan di dalam DialogProvider");
  return ctx;
};
