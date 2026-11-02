import React, { Suspense, lazy } from "react";
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

// =============================================================================
// ROUTE-LEVEL CODE SPLITTING (REACT.LAZY)
// =============================================================================

// Public Pages
const HomePage = lazy(() =>
  import("./pages/public/HomePage").then((m) => ({ default: m.HomePage })),
);
const JalurMasukPage = lazy(() =>
  import("./pages/public/JalurMasukPage").then((m) => ({
    default: m.JalurMasukPage,
  })),
);
const ProdiPage = lazy(() =>
  import("./pages/public/ProdiPage").then((m) => ({ default: m.ProdiPage })),
);
const ProdiBandingkanPage = lazy(() =>
  import("./pages/public/ProdiBandingkanPage").then((m) => ({
    default: m.ProdiBandingkanPage,
  })),
);
const ProdiDetailPage = lazy(() =>
  import("./pages/public/ProdiDetailPage").then((m) => ({
    default: m.ProdiDetailPage,
  })),
);
const BiayaJalurPage = lazy(() =>
  import("./pages/public/BiayaJalurPage").then((m) => ({
    default: m.BiayaJalurPage,
  })),
);
const JadwalSeleksiPage = lazy(() =>
  import("./pages/public/JadwalSeleksiPage").then((m) => ({
    default: m.JadwalSeleksiPage,
  })),
);
const PengumumanPage = lazy(() =>
  import("./pages/public/PengumumanPage").then((m) => ({
    default: m.PengumumanPage,
  })),
);
const PengumumanDetailPage = lazy(() =>
  import("./pages/public/PengumumanDetailPage").then((m) => ({
    default: m.PengumumanDetailPage,
  })),
);
const FaqPage = lazy(() =>
  import("./pages/public/FaqPage").then((m) => ({ default: m.FaqPage })),
);
const KontakPage = lazy(() =>
  import("./pages/public/KontakPage").then((m) => ({ default: m.KontakPage })),
);
const SyaratKetentuanPage = lazy(() =>
  import("./pages/public/SyaratKetentuanPage").then((m) => ({
    default: m.SyaratKetentuanPage,
  })),
);
const KebijakanPrivasiPage = lazy(() =>
  import("./pages/public/KebijakanPrivasiPage").then((m) => ({
    default: m.KebijakanPrivasiPage,
  })),
);

// Auth Pages
const LoginPage = lazy(() =>
  import("./pages/public/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("./pages/public/RegisterPage").then((m) => ({
    default: m.RegisterPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("./pages/public/VerifyEmailPage").then((m) => ({
    default: m.VerifyEmailPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/public/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/public/ResetPasswordPage").then((m) => ({
    default: m.ResetPasswordPage,
  })),
);

// Dev Pages
const StyleguidePage = lazy(() =>
  import("./pages/dev/StyleguidePage").then((m) => ({
    default: m.StyleguidePage,
  })),
);

// Portal Calon Mahasiswa
const PortalLayout = lazy(() =>
  import("./pages/portal/PortalLayout").then((m) => ({
    default: m.PortalLayout,
  })),
);
const DashboardCalon = lazy(() =>
  import("./pages/portal/DashboardCalon").then((m) => ({
    default: m.DashboardCalon,
  })),
);
const FormPendaftaranPage = lazy(() =>
  import("./pages/portal/FormPendaftaranPage").then((m) => ({
    default: m.FormPendaftaranPage,
  })),
);
const FormulirRplPage = lazy(() =>
  import("./pages/portal/FormulirRplPage").then((m) => ({
    default: m.FormulirRplPage,
  })),
);
const UploadBerkasPage = lazy(() =>
  import("./pages/portal/UploadBerkasPage").then((m) => ({
    default: m.UploadBerkasPage,
  })),
);
const PembayaranPage = lazy(() =>
  import("./pages/portal/PembayaranPage").then((m) => ({
    default: m.PembayaranPage,
  })),
);
const UjianCbtPage = lazy(() =>
  import("./pages/portal/UjianCbtPage").then((m) => ({
    default: m.UjianCbtPage,
  })),
);
const HasilKelulusanPage = lazy(() =>
  import("./pages/portal/HasilKelulusanPage").then((m) => ({
    default: m.HasilKelulusanPage,
  })),
);
const DaftarUlangPage = lazy(() =>
  import("./pages/portal/DaftarUlangPage").then((m) => ({
    default: m.DaftarUlangPage,
  })),
);

// Portal Admin
const AdminLayout = lazy(() =>
  import("./pages/admin/AdminLayout").then((m) => ({
    default: m.AdminLayout,
  })),
);
const AdminDashboard = lazy(() =>
  import("./pages/admin/AdminDashboard").then((m) => ({
    default: m.AdminDashboard,
  })),
);
const VerifikasiBerkasPage = lazy(() =>
  import("./pages/admin/VerifikasiBerkasPage").then((m) => ({
    default: m.VerifikasiBerkasPage,
  })),
);
const VerifikasiKeuanganPage = lazy(() =>
  import("./pages/admin/VerifikasiKeuanganPage").then((m) => ({
    default: m.VerifikasiKeuanganPage,
  })),
);
const SeleksiKelulusanPage = lazy(() =>
  import("./pages/admin/SeleksiKelulusanPage").then((m) => ({
    default: m.SeleksiKelulusanPage,
  })),
);
const VerifikasiDaftarUlangPage = lazy(() =>
  import("./pages/admin/VerifikasiDaftarUlangPage").then((m) => ({
    default: m.VerifikasiDaftarUlangPage,
  })),
);
const MasterDataPage = lazy(() =>
  import("./pages/admin/MasterDataPage").then((m) => ({
    default: m.MasterDataPage,
  })),
);
const PendaftaranOfflinePage = lazy(() =>
  import("./pages/admin/PendaftaranOfflinePage").then((m) => ({
    default: m.PendaftaranOfflinePage,
  })),
);

// CMS Admin Pages
const KelolaBeritaPage = lazy(() =>
  import("./pages/admin/cms/KelolaBeritaPage").then((m) => ({
    default: m.KelolaBeritaPage,
  })),
);
const EditorBeritaPage = lazy(() =>
  import("./pages/admin/cms/EditorBeritaPage").then((m) => ({
    default: m.EditorBeritaPage,
  })),
);
const KelolaBannerPage = lazy(() =>
  import("./pages/admin/cms/KelolaBannerPage").then((m) => ({
    default: m.KelolaBannerPage,
  })),
);
const KelolaFaqPage = lazy(() =>
  import("./pages/admin/cms/KelolaFaqPage").then((m) => ({
    default: m.KelolaFaqPage,
  })),
);
const KelolaHalamanPage = lazy(() =>
  import("./pages/admin/cms/KelolaHalamanPage").then((m) => ({
    default: m.KelolaHalamanPage,
  })),
);

// CBT Admin Pages
const BankSoalPage = lazy(() =>
  import("./pages/admin/cbt/BankSoalPage").then((m) => ({
    default: m.BankSoalPage,
  })),
);
const JadwalSesiPage = lazy(() =>
  import("./pages/admin/cbt/JadwalSesiPage").then((m) => ({
    default: m.JadwalSesiPage,
  })),
);
const PresensiCbtPage = lazy(() =>
  import("./pages/admin/cbt/PresensiCbtPage").then((m) => ({
    default: m.PresensiCbtPage,
  })),
);
const MonitorLiveCbtPage = lazy(() =>
  import("./pages/admin/cbt/MonitorLiveCbtPage").then((m) => ({
    default: m.MonitorLiveCbtPage,
  })),
);

// RPL Admin Pages
const KelolaRplAdminPage = lazy(() =>
  import("./pages/admin/rpl/KelolaRplAdminPage").then((m) => ({
    default: m.KelolaRplAdminPage,
  })),
);
const PenilaianRplPage = lazy(() =>
  import("./pages/admin/rpl/PenilaianRplPage").then((m) => ({
    default: m.PenilaianRplPage,
  })),
);
const KelolaMataKuliahRplPage = lazy(() =>
  import("./pages/admin/rpl/KelolaMataKuliahRplPage").then((m) => ({
    default: m.KelolaMataKuliahRplPage,
  })),
);

// Konfigurasi Admin Pages
const TahunGelombangPage = lazy(() =>
  import("./pages/admin/konfigurasi/TahunGelombangPage").then((m) => ({
    default: m.TahunGelombangPage,
  })),
);
const FakultasProdiPage = lazy(() =>
  import("./pages/admin/konfigurasi/FakultasProdiPage").then((m) => ({
    default: m.FakultasProdiPage,
  })),
);
const JalurMasukConfigPage = lazy(() =>
  import("./pages/admin/konfigurasi/JalurMasukPage").then((m) => ({
    default: m.JalurMasukPage,
  })),
);
const BiayaMatriksPage = lazy(() =>
  import("./pages/admin/konfigurasi/BiayaMatriksPage").then((m) => ({
    default: m.BiayaMatriksPage,
  })),
);
const VoucherPage = lazy(() =>
  import("./pages/admin/konfigurasi/VoucherPage").then((m) => ({
    default: m.VoucherPage,
  })),
);
const PengaturanPmbPage = lazy(() =>
  import("./pages/admin/konfigurasi/PengaturanPmbPage").then((m) => ({
    default: m.PengaturanPmbPage,
  })),
);
const FormBuilderPage = lazy(() =>
  import("./pages/admin/konfigurasi/FormBuilderPage").then((m) => ({
    default: m.FormBuilderPage,
  })),
);

// Fallback Loading Screen yang Halus & Ringan
const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 p-8">
    <div className="w-8 h-8 rounded-full border-3 border-biru-200 border-t-biru-800 animate-spin" />
    <span className="text-xs text-biru-700 font-medium font-sans">
      Memuat halaman...
    </span>
  </div>
);

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
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                {/* Rute Publik Terpadu dengan PublicLayout Resmi */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/jalur-masuk" element={<JalurMasukPage />} />
                  <Route path="/program-studi" element={<ProdiPage />} />
                  <Route
                    path="/program-studi/bandingkan"
                    element={<ProdiBandingkanPage />}
                  />
                  <Route
                    path="/program-studi/:slug"
                    element={<ProdiDetailPage />}
                  />
                  {/* Kompatibilitas Tautan Lama */}
                  <Route path="/prodi" element={<ProdiPage />} />
                  <Route path="/prodi/:id" element={<ProdiDetailPage />} />
                  <Route path="/biaya" element={<BiayaJalurPage />} />
                  <Route path="/jadwal" element={<JadwalSeleksiPage />} />
                  <Route path="/pengumuman" element={<PengumumanPage />} />
                  <Route
                    path="/pengumuman/:slug"
                    element={<PengumumanDetailPage />}
                  />
                  <Route
                    path="/cek-kelulusan"
                    element={<HasilKelulusanPage />}
                  />
                  <Route path="/faq" element={<FaqPage />} />
                  <Route path="/kontak" element={<KontakPage />} />
                  <Route
                    path="/syarat-ketentuan"
                    element={<SyaratKetentuanPage />}
                  />
                  <Route
                    path="/kebijakan-privasi"
                    element={<KebijakanPrivasiPage />}
                  />
                </Route>

                {/* Rute Autentikasi dengan AuthLayout Premium */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route
                    path="/forgot-password"
                    element={<ForgotPasswordPage />}
                  />
                  <Route
                    path="/reset-password"
                    element={<ResetPasswordPage />}
                  />
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
                  <Route path="rpl" element={<FormulirRplPage />} />
                  <Route path="berkas" element={<UploadBerkasPage />} />
                  <Route path="pembayaran" element={<PembayaranPage />} />
                  <Route path="ujian" element={<UjianCbtPage />} />
                  <Route path="hasil" element={<HasilKelulusanPage />} />
                  <Route path="daftar-ulang" element={<DaftarUlangPage />} />
                </Route>

                {/* Portal Administrasi & Verifikasi */}
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
                  <Route
                    path="pendaftaran-offline"
                    element={
                      <RequireRole allowedRoles={["admin_pmb", "super_admin"]}>
                        <PendaftaranOfflinePage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="berkas"
                    element={
                      <RequireRole allowedRoles={["admin_pmb", "super_admin"]}>
                        <VerifikasiBerkasPage />
                      </RequireRole>
                    }
                  />
                  <Route path="keuangan" element={<VerifikasiKeuanganPage />} />
                  <Route path="seleksi" element={<SeleksiKelulusanPage />} />
                  <Route
                    path="daftar-ulang"
                    element={<VerifikasiDaftarUlangPage />}
                  />
                  <Route path="master" element={<MasterDataPage />} />

                  {/* Sub-modul CMS & Konten Publik: Khusus Admin PMB & Super Admin */}
                  <Route
                    path="cms"
                    element={
                      <RequireRole allowedRoles={["admin_pmb", "super_admin"]}>
                        <Outlet />
                      </RequireRole>
                    }
                  >
                    <Route
                      index
                      element={<Navigate to="/admin/cms/berita" replace />}
                    />
                    <Route path="berita" element={<KelolaBeritaPage />} />
                    <Route path="berita/:id" element={<EditorBeritaPage />} />
                    <Route path="banner" element={<KelolaBannerPage />} />
                    <Route path="faq" element={<KelolaFaqPage />} />
                    <Route path="halaman" element={<KelolaHalamanPage />} />
                  </Route>

                  {/* Sub-modul CBT & Presensi: Pengawas, Admin PMB, Super Admin */}
                  <Route
                    path="cbt"
                    element={
                      <RequireRole
                        allowedRoles={[
                          "pengawas_ujian",
                          "admin_pmb",
                          "super_admin",
                        ]}
                      >
                        <Outlet />
                      </RequireRole>
                    }
                  >
                    <Route
                      index
                      element={<Navigate to="/admin/cbt/sesi" replace />}
                    />
                    <Route path="bank-soal" element={<BankSoalPage />} />
                    <Route path="sesi" element={<JadwalSesiPage />} />
                    <Route path="presensi" element={<PresensiCbtPage />} />
                    <Route
                      path="monitor/:id"
                      element={<MonitorLiveCbtPage />}
                    />
                  </Route>

                  {/* Sub-modul RPL: Asesor RPL, Admin PMB, Super Admin */}
                  <Route
                    path="rpl"
                    element={
                      <RequireRole
                        allowedRoles={[
                          "asesor_rpl",
                          "admin_pmb",
                          "super_admin",
                        ]}
                      >
                        <Outlet />
                      </RequireRole>
                    }
                  >
                    <Route index element={<KelolaRplAdminPage />} />
                    <Route
                      path="penilaian/:id"
                      element={<PenilaianRplPage />}
                    />
                    <Route
                      path="mata-kuliah"
                      element={
                        <RequireRole
                          allowedRoles={["admin_pmb", "super_admin"]}
                        >
                          <KelolaMataKuliahRplPage />
                        </RequireRole>
                      }
                    />
                  </Route>

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
                    <Route path="jalur" element={<JalurMasukConfigPage />} />
                    <Route path="biaya" element={<BiayaMatriksPage />} />
                    <Route path="vouchers" element={<VoucherPage />} />
                    <Route path="form-builder" element={<FormBuilderPage />} />
                    <Route path="pengaturan" element={<PengaturanPmbPage />} />
                  </Route>
                </Route>

                {/* Fallback Rute */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
