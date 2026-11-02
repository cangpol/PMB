import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Search,
  Bell,
  LogOut,
  User,
  ExternalLink,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/DropdownMenu";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "../ui/Breadcrumb";

export interface AdminTopbarProps {
  onOpenMobileDrawer: () => void;
  onOpenCommandPalette: () => void;
}

// Map segment paths to readable names
const BREADCRUMB_MAP: Record<string, string> = {
  admin: "Panel Admin",
  dashboard: "Dashboard Eksekutif",
  "pendaftaran-offline": "Pendaftaran Loket",
  berkas: "Verifikasi Berkas",
  master: "Master Data",
  keuangan: "Verifikasi Keuangan",
  seleksi: "Seleksi Kelulusan",
  "daftar-ulang": "Daftar Ulang & NIM",
  cbt: "Ujian CBT",
  sesi: "Jadwal & Sesi",
  presensi: "Meja Presensi",
  "bank-soal": "Bank Soal",
  rpl: "Jalur RPL",
  "mata-kuliah": "Mata Kuliah",
  cms: "Konten Publik (CMS)",
  berita: "Berita & Pengumuman",
  banner: "Banner Slider",
  faq: "FAQ",
  halaman: "Halaman & Kebijakan",
  konfigurasi: "Pengaturan PMB",
  gelombang: "Tahun & Gelombang",
  prodi: "Fakultas & Prodi",
  jalur: "Jalur Pendaftaran",
  biaya: "Matriks Biaya",
  vouchers: "Voucher Promosi",
  "form-builder": "Form & Berkas Builder",
  pengaturan: "Pengaturan Sistem",
};

export const AdminTopbar: React.FC<AdminTopbarProps> = ({
  onOpenMobileDrawer,
  onOpenCommandPalette,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const pathSegments = location.pathname.split("/").filter(Boolean);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <header className="h-16 shrink-0 bg-putih/95 backdrop-blur-md border-b border-biru-100 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Sisi Kiri: Tombol Menu Mobile & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          className="lg:hidden p-2 rounded-xl text-biru-800 hover:bg-biru-50 hover:text-biru-950 border border-biru-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500 cursor-pointer"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb Navigation */}
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to="/admin/dashboard"
                  className="text-biru-700 hover:text-biru-950 font-medium"
                >
                  Admin
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {pathSegments.slice(1).map((segment, index) => {
              const isLast = index === pathSegments.length - 2;
              const title = BREADCRUMB_MAP[segment] || segment;
              const subPath = `/${pathSegments.slice(0, index + 2).join("/")}`;

              return (
                <React.Fragment key={subPath}>
                  <BreadcrumbSeparator>
                    <ChevronRight className="w-3.5 h-3.5 text-biru-300" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="font-bold text-biru-950">
                        {title}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link
                          to={subPath}
                          className="text-biru-700 hover:text-biru-950 font-medium"
                        >
                          {title}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Sisi Kanan: Search Command Palette, Notifikasi & Profil */}
      <div className="flex items-center gap-2.5">
        {/* Tombol Pemicu Command Palette */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-biru-200 bg-biru-50/50 hover:bg-biru-100/70 text-biru-800 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500 cursor-pointer"
          title="Cari Menu (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-biru-600" />
          <span className="hidden md:inline text-biru-600 font-medium">
            Pencarian cepat...
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-putih text-biru-800 border border-biru-200 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>

        {/* Tombol Lihat Web Publik */}
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-biru-200 text-biru-700 hover:text-biru-950 hover:bg-biru-50 text-xs font-semibold transition-colors"
          title="Buka Website Publik PMB di Tab Baru"
        >
          <span>Web Publik</span>
          <ExternalLink className="w-3 h-3 text-biru-500" />
        </Link>

        {/* Ikon Notifikasi */}
        <div className="relative">
          <button
            type="button"
            className="p-2 rounded-xl text-biru-700 hover:text-biru-950 hover:bg-biru-50 border border-biru-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500 cursor-pointer"
            title="Pemberitahuan Sistem"
            aria-label="Pemberitahuan Sistem"
          >
            <Bell className="w-4 h-4" />
          </button>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-biru-600 ring-2 ring-putih animate-pulse" />
        </div>

        {/* Menu Profil Pengguna (Dropdown) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-biru-50 border border-transparent hover:border-biru-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500 cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-biru-950 block leading-tight truncate max-w-[140px]">
                  {user?.nama_lengkap || "Admin PMB"}
                </span>
                <span className="text-[10px] text-biru-600 font-mono uppercase tracking-wider block">
                  {user?.role || "Petugas PMB"}
                </span>
              </div>
              <div className="h-8 w-8 rounded-xl bg-biru-900 text-putih flex items-center justify-center font-bold text-xs shadow-xs">
                {getInitials(user?.nama_lengkap || "Admin")}
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="right"
            className="w-56 p-1.5 bg-putih rounded-2xl border border-biru-200 shadow-soft-lg text-xs"
          >
            <DropdownMenuLabel className="px-3 py-2">
              <p className="font-bold text-biru-950">
                {user?.nama_lengkap || "Administrator PMB"}
              </p>
              <p className="text-[11px] text-biru-600 font-normal truncate mt-0.5">
                {user?.email || "admin.pmb@pignatelli.ac.id"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 bg-biru-100" />
            <DropdownMenuItem
              onClick={() => navigate("/admin/konfigurasi/pengaturan")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-biru-800 hover:bg-biru-50 hover:text-biru-950 cursor-pointer font-medium w-full text-left"
            >
              <Shield className="w-3.5 h-3.5 text-biru-600" />
              <span>Pengaturan Sistem</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/admin/dashboard")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-biru-800 hover:bg-biru-50 hover:text-biru-950 cursor-pointer font-medium w-full text-left"
            >
              <User className="w-3.5 h-3.5 text-biru-600" />
              <span>Aktivitas Akun</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 bg-biru-100" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-biru-950 hover:bg-biru-50 hover:text-biru-800 cursor-pointer font-semibold w-full text-left"
            >
              <LogOut className="w-3.5 h-3.5 text-biru-700" />
              <span>Keluar dari Akun</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
