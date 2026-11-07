import React, { useEffect, useRef } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  AlurProvider,
  useAlurContext,
} from "@/components/pendaftaran/AlurStepper";
import { WAJIB_VERIFIKASI_EMAIL } from "@/components/auth/akses";

/** Muat ulang alur tiap pindah halaman agar kunci menu selalu terbaru. */
const SinkronAlur: React.FC = () => {
  const { pathname } = useLocation();
  const ctx = useAlurContext();
  const muatUlang = ctx?.muatUlang;
  const pertama = useRef(true);

  useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    muatUlang?.();
  }, [pathname, muatUlang]);

  return null;
};

export const PortalLayout: React.FC = () => {
  const { user } = useAuth();
  // Server juga menolak (EMAIL_BELUM_TERVERIFIKASI); ini mengarahkan calon ke halaman kode
  if (
    WAJIB_VERIFIKASI_EMAIL &&
    user?.role === "calon_mahasiswa" &&
    !user.is_email_verified
  ) {
    return <Navigate to="/verify-email" replace />;
  }
  return (
    <AlurProvider>
      <SinkronAlur />
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </AlurProvider>
  );
};
