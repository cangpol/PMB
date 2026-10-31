import { useContext } from "react";
import { AuthContext, type AuthContextType } from "./authContextDef";

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
};
