import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import type { UserRole } from "../../types";
import { dashboardPeran } from "./akses";

/**
 * Ke halaman login. Halaman asal hanya diingat bila sesi memang belum ada;
 * setelah pengguna keluar, pengguna berikutnya selalu mulai dari dashboard-nya.
 */
const KeLogin: React.FC = () => {
  const { baruLogout } = useAuth();
  const location = useLocation();
  return (
    <Navigate
      to="/login"
      replace
      state={baruLogout ? undefined : { from: location }}
    />
  );
};

interface RequireAuthProps {
  children?: React.ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-biru-200 border-t-biru-700" />
          <p className="text-sm font-medium text-biru-800">
            Memverifikasi sesi Anda...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <KeLogin />;
  }

  return <>{children}</>;
};

interface RequireRoleProps {
  allowedRoles: UserRole[];
  children?: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-biru-200 border-t-biru-700" />
          <p className="text-sm font-medium text-biru-800">
            Memeriksa hak akses peran...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <KeLogin />;
  }

  const hasAccess =
    user.role === "super_admin" || allowedRoles.includes(user.role as UserRole);

  if (!hasAccess) {
    // Jangan tampilkan apa pun tentang halaman yang bukan hak peran ini;
    // langsung kembalikan ke dashboard miliknya.
    return <Navigate to={dashboardPeran(user.role)} replace />;
  }

  return <>{children}</>;
};
