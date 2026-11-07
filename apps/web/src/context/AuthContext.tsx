import React, { useState, useEffect, useCallback, useRef } from "react";
import type {
  AuthResponse,
  ChangePasswordRequest,
  GenericMessageResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from "../types";
import { fetchApi } from "../services/api";
import { AuthContext } from "./authContextDef";
import { useQueryClient } from "@tanstack/react-query";
import { bersihkanPenyimpananSesi } from "../components/auth/akses";
import { EVENT_SESI_BERAKHIR } from "../services/sesiEvent";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // true sejak pengguna menekan "Keluar", sampai ada login berikutnya
  const [baruLogout, setBaruLogout] = useState(false);
  const queryClient = useQueryClient();

  const refetchUser = useCallback(async (): Promise<AuthResponse | null> => {
    try {
      const data = await fetchApi<AuthResponse>("/api/auth/me");
      setUser(data);
      return data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchApi<AuthResponse>("/api/auth/me")
      .then((data) => {
        if (isMounted) setUser(data);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Pantau keabsahan sesi: sesi bisa habis (tidak dipakai/umur maksimum) atau
  // halaman dipulihkan dari cache browser lewat tombol Back setelah logout.
  const sudahMasuk = useRef(false);
  useEffect(() => {
    sudahMasuk.current = user !== null;
  }, [user]);

  useEffect(() => {
    let terakhirPeriksa = 0;
    // Jangan hapus cadangan jawaban CBT di sini: sesi habis saat ujian tidak boleh
    // menghilangkan jawaban yang sudah diisi.
    const akhiriSesi = () => {
      queryClient.clear();
      setUser(null);
    };
    const periksa = (paksa: boolean) => {
      if (!sudahMasuk.current) return;
      const kini = Date.now();
      if (!paksa && kini - terakhirPeriksa < 15000) return;
      terakhirPeriksa = kini;
      fetchApi<AuthResponse>("/api/auth/me")
        .then((data) =>
          setUser((lama) =>
            lama && JSON.stringify(lama) === JSON.stringify(data) ? lama : data,
          ),
        )
        .catch((err: { kode?: string }) => {
          // Hanya 401 yang mengakhiri sesi; gangguan jaringan tidak boleh mengeluarkan pengguna
          if (err?.kode === "TIDAK_TERAUTENTIKASI") akhiriSesi();
        });
    };
    const saatDipulihkan = (e: PageTransitionEvent) => {
      if (e.persisted) periksa(true);
    };
    const saatKembali = () => {
      if (document.visibilityState === "visible") periksa(false);
    };
    window.addEventListener(EVENT_SESI_BERAKHIR, akhiriSesi);
    window.addEventListener("pageshow", saatDipulihkan);
    window.addEventListener("focus", saatKembali);
    document.addEventListener("visibilitychange", saatKembali);
    return () => {
      window.removeEventListener(EVENT_SESI_BERAKHIR, akhiriSesi);
      window.removeEventListener("pageshow", saatDipulihkan);
      window.removeEventListener("focus", saatKembali);
      document.removeEventListener("visibilitychange", saatKembali);
    };
  }, [queryClient]);

  const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
    const data = await fetchApi<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setBaruLogout(false);
    setUser(data);
    return data;
  };

  const register = async (regData: RegisterRequest): Promise<AuthResponse> => {
    const data = await fetchApi<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(regData),
    });
    setBaruLogout(false);
    setUser(data);
    return data;
  };

  const logout = async (): Promise<void> => {
    try {
      await fetchApi("/api/auth/logout", { method: "POST" });
    } finally {
      // Jangan bawa apa pun ke pengguna berikutnya di browser yang sama
      setBaruLogout(true);
      queryClient.clear();
      bersihkanPenyimpananSesi();
      setUser(null);
    }
  };

  const kirimUlangKode = async (): Promise<GenericMessageResponse> =>
    fetchApi<GenericMessageResponse>("/api/auth/verify-email/kirim-ulang", {
      method: "POST",
    });

  const verifyEmail = async (
    data: VerifyEmailRequest,
  ): Promise<GenericMessageResponse> => {
    const res = await fetchApi<GenericMessageResponse>(
      "/api/auth/verify-email",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    await refetchUser();
    return res;
  };

  const forgotPassword = async (
    email: string,
  ): Promise<GenericMessageResponse> => {
    return fetchApi<GenericMessageResponse>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  };

  const resetPassword = async (
    data: ResetPasswordRequest,
  ): Promise<GenericMessageResponse> => {
    return fetchApi<GenericMessageResponse>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  };

  const changePassword = async (
    data: ChangePasswordRequest,
  ): Promise<GenericMessageResponse> => {
    return fetchApi<GenericMessageResponse>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        baruLogout,
        verifyEmail,
        kirimUlangKode,
        forgotPassword,
        resetPassword,
        changePassword,
        refetchUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
