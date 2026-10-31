import React from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import type { UserRole } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface RequireAuthProps {
  children?: React.ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

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
    return <Navigate to="/login" state={{ from: location }} replace />;
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
  const location = useLocation();

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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasAccess =
    user.role === "super_admin" || allowedRoles.includes(user.role as UserRole);

  if (!hasAccess) {
    const defaultDashboard =
      user.role === "calon_mahasiswa"
        ? "/portal/dashboard"
        : "/admin/dashboard";

    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-biru-200 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-biru-50 text-biru-900 border border-biru-200">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-biru-950 mb-2">
            Akses Ditolak
          </h2>
          <p className="text-sm text-biru-800 mb-6 leading-relaxed">
            Akun Anda dengan peran{" "}
            <span className="font-semibold text-biru-900 capitalize">
              {user.role.replace(/_/g, " ")}
            </span>{" "}
            tidak memiliki izin untuk mengakses halaman ini.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={defaultDashboard}>
              <Button variant="primary" className="w-full sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Dashboard Anda
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
