import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileCheck2,
  CreditCard,
  GraduationCap,
  Calendar,
  BookOpen,
  Compass,
  Coins,
  Ticket,
  Sliders,
  Layers,
  LogOut,
  Shield,
  UserPlus,
  Tv,
  UserCheck,
  HelpCircle,
  FileText,
  Image,
  FileCode,
} from "lucide-react";
import { useAuth } from "@/context";
import logoPlaceholder from "../../assets/logo-placeholder.svg";

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const operasionalItems = [
    {
      label: "Dashboard Eksekutif",
      path: "/admin/dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: "Pendaftaran Offline Loket",
      path: "/admin/pendaftaran-offline",
      icon: <UserPlus className="w-4 h-4" />,
    },
    {
      label: "Verifikasi Berkas PMB",
      path: "/admin/berkas",
      icon: <FileCheck2 className="w-4 h-4" />,
    },
    {
      label: "Verifikasi Keuangan",
      path: "/admin/keuangan",
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      label: "Seleksi Kelulusan",
      path: "/admin/seleksi",
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      label: "Verifikasi Daftar Ulang",
      path: "/admin/daftar-ulang",
      icon: <FileCheck2 className="w-4 h-4" />,
    },
  ];

  const cbtItems = [
    {
      label: "Jadwal & Sesi CBT",
      path: "/admin/cbt/sesi",
      icon: <Tv className="w-4 h-4" />,
    },
    {
      label: "Meja Presensi Pengawas",
      path: "/admin/cbt/presensi",
      icon: <UserCheck className="w-4 h-4" />,
    },
    {
      label: "Bank Soal CBT",
      path: "/admin/cbt/bank-soal",
      icon: <HelpCircle className="w-4 h-4" />,
    },
  ];

  const rplItems = [
    {
      label: "Evaluasi & Konversi RPL",
      path: "/admin/rpl",
      icon: <FileCheck2 className="w-4 h-4" />,
    },
    {
      label: "Kurikulum Mata Kuliah RPL",
      path: "/admin/rpl/mata-kuliah",
      icon: <BookOpen className="w-4 h-4" />,
    },
  ];

  const cmsItems = [
    {
      label: "Berita & Pengumuman",
      path: "/admin/cms/berita",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      label: "Banner Slider Beranda",
      path: "/admin/cms/banner",
      icon: <Image className="w-4 h-4" />,
    },
    {
      label: "FAQ Pertanyaan Umum",
      path: "/admin/cms/faq",
      icon: <HelpCircle className="w-4 h-4" />,
    },
    {
      label: "Halaman & Kebijakan",
      path: "/admin/cms/halaman",
      icon: <FileCode className="w-4 h-4" />,
    },
  ];

  const konfigurasiItems = [
    {
      label: "Tahun & Gelombang",
      path: "/admin/konfigurasi/gelombang",
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      label: "Fakultas & Prodi",
      path: "/admin/konfigurasi/prodi",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      label: "Jalur Pendaftaran",
      path: "/admin/konfigurasi/jalur",
      icon: <Compass className="w-4 h-4" />,
    },
    {
      label: "Matriks Biaya & Cicilan",
      path: "/admin/konfigurasi/biaya",
      icon: <Coins className="w-4 h-4" />,
    },
    {
      label: "Voucher Promosi",
      path: "/admin/konfigurasi/vouchers",
      icon: <Ticket className="w-4 h-4" />,
    },
    {
      label: "Form & Berkas Builder",
      path: "/admin/konfigurasi/form-builder",
      icon: <Layers className="w-4 h-4" />,
    },
    {
      label: "Pengaturan Sistem",
      path: "/admin/konfigurasi/pengaturan",
      icon: <Sliders className="w-4 h-4" />,
    },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isAdmin = user?.role === "admin_pmb" || user?.role === "super_admin";

  return (
    <div className="min-h-screen bg-biru-50/40 text-biru-950 flex flex-col">
      {/* Top Header Admin */}
      <header className="bg-biru-950 text-putih border-b border-biru-900 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img
                src={logoPlaceholder}
                alt="Logo Universitas Pignatelli Triputra"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-md bg-biru-900 text-biru-200 text-xs font-semibold border border-biru-800">
              Panel Administrasi PMB
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-putih">
                {user?.nama_lengkap || "Administrator PMB"}
              </p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-biru-400 animate-pulse" />
                <span className="text-[11px] text-biru-200 uppercase tracking-wider font-mono">
                  {user?.role || "super_admin"}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-biru-200 hover:text-putih hover:bg-biru-900 border border-biru-800 transition-colors cursor-pointer"
              title="Keluar dari panel admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Navigasi Admin */}
        <aside className="lg:col-span-3 space-y-4">
          {/* Kelompok 1: Operasional Panitia */}
          <div className="bg-putih border border-biru-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-biru-800 uppercase tracking-wider">
                Operasional PMB
              </span>
              <p className="text-[11px] text-biru-900">
                Pendaftar, berkas & seleksi
              </p>
            </div>

            <nav className="space-y-1">
              {operasionalItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive(item.path)
                      ? "bg-biru-700 text-putih shadow-xs"
                      : "text-biru-900 hover:bg-biru-50 hover:text-biru-950"
                  }`}
                >
                  <span
                    className={
                      isActive(item.path) ? "text-putih" : "text-biru-700"
                    }
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Kelompok: CBT & Presensi Ujian */}
          {(isAdmin || user?.role === "pengawas_ujian") && (
            <div className="bg-putih border border-biru-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-biru-800 uppercase tracking-wider">
                  CBT & Presensi Ujian
                </span>
                <p className="text-[11px] text-biru-900">
                  Sesi, meja pengawas & soal
                </p>
              </div>

              <nav className="space-y-1">
                {cbtItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive(item.path)
                        ? "bg-biru-700 text-putih shadow-xs"
                        : "text-biru-900 hover:bg-biru-50 hover:text-biru-950"
                    }`}
                  >
                    <span
                      className={
                        isActive(item.path) ? "text-putih" : "text-biru-700"
                      }
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {/* Kelompok: Rekognisi Pembelajaran Lampau (RPL) */}
          {(isAdmin || user?.role === "asesor_rpl") && (
            <div className="bg-putih border border-biru-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-biru-800 uppercase tracking-wider">
                  Jalur Rekognisi (RPL)
                </span>
                <p className="text-[11px] text-biru-900">
                  Asesmen portofolio & konversi SKS
                </p>
              </div>

              <nav className="space-y-1">
                {rplItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive(item.path)
                        ? "bg-biru-700 text-putih shadow-xs"
                        : "text-biru-900 hover:bg-biru-50 hover:text-biru-950"
                    }`}
                  >
                    <span
                      className={
                        isActive(item.path) ? "text-putih" : "text-biru-700"
                      }
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {/* Kelompok: CMS & Konten Publik */}
          {isAdmin && (
            <div className="bg-putih border border-biru-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-biru-800 uppercase tracking-wider">
                  CMS &amp; Konten Publik
                </span>
                <p className="text-[11px] text-biru-900">
                  Berita, banner, FAQ &amp; halaman
                </p>
              </div>

              <nav className="space-y-1">
                {cmsItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive(item.path)
                        ? "bg-biru-700 text-putih shadow-xs"
                        : "text-biru-900 hover:bg-biru-50 hover:text-biru-950"
                    }`}
                  >
                    <span
                      className={
                        isActive(item.path) ? "text-putih" : "text-biru-700"
                      }
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {/* Kelompok 2: Konfigurasi PMB (Hanya untuk Admin PMB / Super Admin) */}
          {isAdmin && (
            <div className="bg-putih border border-biru-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-biru-800 uppercase tracking-wider">
                  Konfigurasi PMB
                </span>
                <p className="text-[11px] text-biru-900">
                  Gelombang, prodi, tarif & voucher
                </p>
              </div>

              <nav className="space-y-1">
                {konfigurasiItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive(item.path)
                        ? "bg-biru-700 text-putih shadow-xs"
                        : "text-biru-900 hover:bg-biru-50 hover:text-biru-950"
                    }`}
                  >
                    <span
                      className={
                        isActive(item.path) ? "text-putih" : "text-biru-700"
                      }
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {/* Status Keamanan */}
          <div className="bg-biru-100/60 border border-biru-200 rounded-2xl p-4 text-xs text-biru-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-biru-900">
              <Shield className="w-4 h-4 text-biru-700" />
              <span>Sistem PMB Aman</span>
            </div>
            <p className="text-[11px] text-biru-800 leading-relaxed font-light">
              Audit log aktif mencatat seluruh riwayat penambahan, modifikasi,
              dan penghapusan konfigurasi.
            </p>
          </div>
        </aside>

        {/* Content Outlet */}
        <main className="lg:col-span-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
