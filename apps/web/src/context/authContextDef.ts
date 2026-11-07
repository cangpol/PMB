import { createContext } from "react";
import type {
  AuthResponse,
  ChangePasswordRequest,
  GenericMessageResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from "../types";

export interface AuthContextType {
  user: AuthResponse | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  /** Sesi berakhir karena pengguna keluar (bukan karena belum login). */
  baruLogout: boolean;
  verifyEmail: (data: VerifyEmailRequest) => Promise<GenericMessageResponse>;
  /** Minta kode verifikasi email baru (dibatasi jeda & kuota per jam). */
  kirimUlangKode: () => Promise<GenericMessageResponse>;
  forgotPassword: (email: string) => Promise<GenericMessageResponse>;
  resetPassword: (
    data: ResetPasswordRequest,
  ) => Promise<GenericMessageResponse>;
  changePassword: (
    data: ChangePasswordRequest,
  ) => Promise<GenericMessageResponse>;
  refetchUser: () => Promise<AuthResponse | null>;
  setUser: React.Dispatch<React.SetStateAction<AuthResponse | null>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
