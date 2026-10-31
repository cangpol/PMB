import React, { useState, useEffect, useCallback } from "react";
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
    const data = await fetchApi<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setUser(data);
    return data;
  };

  const register = async (regData: RegisterRequest): Promise<AuthResponse> => {
    const data = await fetchApi<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(regData),
    });
    setUser(data);
    return data;
  };

  const logout = async (): Promise<void> => {
    try {
      await fetchApi("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  };

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
        verifyEmail,
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
