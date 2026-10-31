import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context";
import { ToastProvider } from "@/components/ui/Toast";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { RequireRole } from "@/components/auth/RouteGuards";
import { StyleguidePage } from "./pages/dev/StyleguidePage";

// Halaman Publik
import { HomePage } from "./pages/public/HomePage";
import { ProdiPage } from "./pages/public/ProdiPage";
import { BiayaJalurPage } from "./pages/public/BiayaJalurPage";
import { PengumumanPage } from "./pages/public/PengumumanPage";
import { LoginPage } from "./pages/public/LoginPage";
import { RegisterPage } from "./pages/public/RegisterPage";
import { VerifyEmailPage } from "./pages/public/VerifyEmailPage";
import { ForgotPasswordPage } from "./pages/public/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/public/ResetPasswordPage";

// Portal Calon Mahasiswa
import { PortalLayout } from "./pages/portal/PortalLayout";
import { DashboardCalon } from "./pages/portal/DashboardCalon";
import { FormPendaftaranPage } from "./pages/portal/FormPendaftaranPage";
import { UploadBerkasPage } from "./pages/portal/UploadBerkasPage";
import { PembayaranPage } from "./pages/portal/PembayaranPage";
import { UjianCbtPage } from "./pages/portal/UjianCbtPage";
import { HasilKelulusanPage } from "./pages/portal/HasilKelulusanPage";

// Portal Administrasi PMB
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { VerifikasiBerkasPage } from "./pages/admin/VerifikasiBerkasPage";
import { VerifikasiKeuanganPage } from "./pages/admin/VerifikasiKeuanganPage";
import { SeleksiKelulusanPage } from "./pages/admin/SeleksiKelulusanPage";
import { MasterDataPage } from "./pages/admin/MasterDataPage";

// Konfigurasi PMB Admin (Khusus admin_pmb & super_admin)
import { TahunGelombangPage } from "./pages/admin/konfigurasi/TahunGelombangPage";
import { FakultasProdiPage } from "./pages/admin/konfigurasi/FakultasProdiPage";
import { JalurMasukPage } from "./pages/admin/konfigurasi/JalurMasukPage";
import { BiayaMatriksPage } from "./pages/admin/konfigurasi/BiayaMatriksPage";
import { VoucherPage } from "./pages/admin/konfigurasi/VoucherPage";
import { PengaturanPmbPage } from "./pages/admin/konfigurasi/PengaturanPmbPage";
import { FormBuilderPage } from "./pages/admin/konfigurasi/FormBuilderPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Rute Publik Terpadu dengan PublicLayout Resmi */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/prodi" element={<ProdiPage />} />
                <Route path="/biaya" element={<BiayaJalurPage />} />
                <Route path="/pengumuman" element={<PengumumanPage />} />
              </Route>

              {/* Rute Autentikasi dengan AuthLayout Premium Berwibawa */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route
                  path="/forgot-password"
                  element={<ForgotPasswordPage />}
                />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Route>

              {/* Rute Dev: Styleguide (Hanya Aktif di Mode Dev) */}
              {import.meta.env.DEV && (
                <Route path="/styleguide" element={<StyleguidePage />} />
              )}

              {/* Portal Calon Mahasiswa (Dilindungi RBAC: calon_mahasiswa & super_admin) */}
              <Route
                path="/portal"
                element={
                  <RequireRole
                    allowedRoles={["calon_mahasiswa", "super_admin"]}
                  >
                    <PortalLayout />
                  </RequireRole>
                }
              >
                <Route
                  index
                  element={<Navigate to="/portal/dashboard" replace />}
                />
                <Route path="dashboard" element={<DashboardCalon />} />
                <Route path="formulir" element={<FormPendaftaranPage />} />
                <Route path="berkas" element={<UploadBerkasPage />} />
                <Route path="pembayaran" element={<PembayaranPage />} />
                <Route path="ujian" element={<UjianCbtPage />} />
                <Route path="hasil" element={<HasilKelulusanPage />} />
              </Route>

              {/* Portal Administrasi & Verifikasi (Dilindungi RBAC: peran operasional internal) */}
              <Route
                path="/admin"
                element={
                  <RequireRole
                    allowedRoles={[
                      "admin_pmb",
                      "super_admin",
                      "keuangan",
                      "asesor_rpl",
                      "pengawas_ujian",
                    ]}
                  >
                    <AdminLayout />
                  </RequireRole>
                }
              >
                <Route
                  index
                  element={<Navigate to="/admin/dashboard" replace />}
                />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="berkas" element={<VerifikasiBerkasPage />} />
                <Route path="keuangan" element={<VerifikasiKeuanganPage />} />
                <Route path="seleksi" element={<SeleksiKelulusanPage />} />
                <Route path="master" element={<MasterDataPage />} />

                {/* Sub-modul Konfigurasi PMB: Khusus Admin PMB & Super Admin */}
                <Route
                  path="konfigurasi"
                  element={
                    <RequireRole allowedRoles={["admin_pmb", "super_admin"]}>
                      <Outlet />
                    </RequireRole>
                  }
                >
                  <Route
                    index
                    element={
                      <Navigate to="/admin/konfigurasi/gelombang" replace />
                    }
                  />
                  <Route path="gelombang" element={<TahunGelombangPage />} />
                  <Route path="prodi" element={<FakultasProdiPage />} />
                  <Route path="jalur" element={<JalurMasukPage />} />
                  <Route path="biaya" element={<BiayaMatriksPage />} />
                  <Route path="vouchers" element={<VoucherPage />} />
                  <Route path="form-builder" element={<FormBuilderPage />} />
                  <Route path="pengaturan" element={<PengaturanPmbPage />} />
                </Route>
              </Route>

              {/* Fallback Rute */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
