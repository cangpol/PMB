import * as React from "react";
import { Link, useLocation } from "react-router-dom";
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
  UserPlus,
  Tv,
  UserCheck,
  HelpCircle,
  FileText,
  Image,
  FileCode,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Landmark,
  ShieldCheck,
  ClipboardCheck,
  Hash,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/context";
import {
  useAntreanVerifikasi,
  type JenisAntrean,
} from "@/hooks/useAntreanVerifikasi";
import { useFitur } from "@/hooks/useFitur";
import { LencanaAntrean } from "./LencanaAntrean";
import { Logo } from "../ui/Logo";

export interface NavSubItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  /** Antrean pemeriksaan yang ditandai dengan lencana angka pada menu ini. */
  antrean?: JenisAntrean | JenisAntrean[];
}

export interface NavGroup {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  items: NavSubItem[];
}

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: "ringkasan",
    title: "Ringkasan",
    description: "Analitik & Pendaftaran Loket",
    icon: LayoutDashboard,
    items: [
      {
        id: "dashboard",
        label: "Dashboard Eksekutif",
        path: "/admin/dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "offline",
        label: "Pendaftaran Offline Loket",
        path: "/admin/pendaftaran-offline",
        icon: UserPlus,
        roles: ["admin_pmb", "super_admin"],
      },
      {
        id: "laporan-registrasi",
        label: "Laporan Registrasi & Sumber",
        path: "/admin/laporan-registrasi",
        icon: Megaphone,
        roles: ["admin_pmb", "super_admin"],
      },
    ],
  },
  {
    id: "pendaftaran",
    title: "Pendaftaran & Berkas",
    description: "Verifikasi Berkas PMB",
    icon: FileCheck2,
    roles: ["admin_pmb", "super_admin"],
    items: [
      {
        id: "berkas",
        label: "Verifikasi Berkas PMB",
        path: "/admin/berkas",
        antrean: "berkas",
        icon: FileCheck2,
      },
      {
        id: "seleksi-tahap",
        label: "Seleksi & Kuota Jalur",
        path: "/admin/seleksi-tahap",
        antrean: ["seleksi_rapor", "seleksi_interview"],
        icon: ClipboardCheck,
        roles: ["admin_pmb", "super_admin"],
      },
      {
        id: "master",
        label: "Master Data Pendaftar",
        path: "/admin/master",
        icon: Layers,
      },
    ],
  },
  {
    id: "cbt",
    title: "Ujian Seleksi (CBT)",
    description: "Sesi, Meja Pengawas & Soal",
    icon: Tv,
    roles: ["admin_pmb", "super_admin", "pengawas_ujian"],
    items: [
      {
        id: "cbt-sesi",
        label: "Jadwal & Sesi CBT",
        path: "/admin/cbt/sesi",
        icon: Tv,
      },
      {
        id: "cbt-presensi",
        label: "Meja Presensi Pengawas",
        path: "/admin/cbt/presensi",
        icon: UserCheck,
      },
      {
        id: "cbt-hasil",
        label: "Hasil Pengerjaan CBT",
        path: "/admin/cbt/hasil",
        antrean: "cbt_keputusan",
        icon: ClipboardCheck,
        roles: ["admin_pmb", "super_admin"],
      },
      {
        id: "cbt-soal",
        label: "Bank Soal CBT",
        path: "/admin/cbt/bank-soal",
        icon: HelpCircle,
      },
    ],
  },
  {
    id: "keuangan",
    title: "Keuangan & Tagihan",
    description: "Verifikasi Pembayaran",
    icon: CreditCard,
    roles: ["admin_pmb", "super_admin", "keuangan"],
    items: [
      {
        id: "keuangan-bukti",
        label: "Verifikasi Bukti Bayar",
        path: "/admin/verifikasi-pembayaran",
        antrean: "bukti_bayar",
        icon: Receipt,
      },
      {
        id: "keuangan-verif",
        label: "Verifikasi Keuangan",
        path: "/admin/keuangan",
        icon: CreditCard,
      },
      {
        id: "keuangan-rekening",
        label: "Rekening VA & QRIS",
        path: "/admin/rekening-pembayaran",
        icon: Landmark,
      },
    ],
  },
  {
    id: "kelulusan",
    title: "Hasil & Registrasi",
    description: "Kelulusan & Penerbitan NIM",
    icon: GraduationCap,
    roles: ["admin_pmb", "super_admin"],
    items: [
      {
        id: "seleksi",
        label: "Seleksi Kelulusan",
        path: "/admin/seleksi",
        icon: GraduationCap,
      },
      {
        id: "daftar-ulang",
        label: "Verifikasi Daftar Ulang (NIM)",
        path: "/admin/daftar-ulang",
        antrean: "daftar_ulang",
        icon: FileCheck2,
      },
    ],
  },
  {
    id: "rpl",
    title: "Jalur Rekognisi (RPL)",
    description: "Asesmen & Konversi SKS",
    icon: BookOpen,
    roles: ["admin_pmb", "super_admin", "asesor_rpl"],
    items: [
      {
        id: "rpl-asesmen",
        label: "Evaluasi Portofolio RPL",
        path: "/admin/rpl",
        icon: FileCheck2,
      },
      {
        id: "rpl-matkul",
        label: "Kurikulum Mata Kuliah RPL",
        path: "/admin/rpl/mata-kuliah",
        icon: BookOpen,
      },
    ],
  },
  {
    id: "cms",
    title: "Konten Publik (CMS)",
    description: "Berita, Banner & FAQ",
    icon: FileText,
    roles: ["admin_pmb", "super_admin"],
    items: [
      {
        id: "cms-berita",
        label: "Berita & Pengumuman",
        path: "/admin/cms/berita",
        icon: FileText,
      },
      {
        id: "cms-banner",
        label: "Banner Slider Beranda",
        path: "/admin/cms/banner",
        icon: Image,
      },
      {
        id: "cms-faq",
        label: "FAQ Pertanyaan Umum",
        path: "/admin/cms/faq",
        icon: HelpCircle,
      },
      {
        id: "cms-halaman",
        label: "Halaman & Kebijakan",
        path: "/admin/cms/halaman",
        icon: FileCode,
      },
    ],
  },
  {
    id: "konfigurasi",
    title: "Pengaturan PMB",
    description: "Gelombang, Tarif & Sistem",
    icon: Sliders,
    roles: ["admin_pmb", "super_admin"],
    items: [
      {
        id: "cfg-gelombang",
        label: "Tahun & Gelombang",
        path: "/admin/konfigurasi/gelombang",
        icon: Calendar,
      },
      {
        id: "cfg-prodi",
        label: "Fakultas & Prodi",
        path: "/admin/konfigurasi/prodi",
        icon: BookOpen,
      },
      {
        id: "cfg-jalur",
        label: "Jalur Pendaftaran",
        path: "/admin/konfigurasi/jalur",
        icon: Compass,
      },
      {
        id: "cfg-biaya",
        label: "Matriks Biaya & Cicilan",
        path: "/admin/konfigurasi/biaya",
        icon: Coins,
      },
      {
        id: "cfg-biaya-kuliah",
        label: "Rincian Biaya Kuliah",
        path: "/admin/konfigurasi/biaya-kuliah",
        icon: Receipt,
      },
      {
        id: "cfg-potongan-jalur",
        label: "Potongan per Jalur",
        path: "/admin/konfigurasi/potongan-jalur",
        icon: Receipt,
      },
      {
        id: "cfg-vouchers",
        label: "Voucher Promosi",
        path: "/admin/konfigurasi/vouchers",
        icon: Ticket,
      },
      {
        id: "cfg-form",
        label: "Form & Berkas Builder",
        path: "/admin/konfigurasi/form-builder",
        icon: Layers,
      },
      {
        id: "cfg-rumus-nim",
        label: "Rumus NIM",
        path: "/admin/konfigurasi/rumus-nim",
        icon: Hash,
      },
      {
        id: "cfg-pengaturan",
        label: "Pengaturan Sistem",
        path: "/admin/konfigurasi/pengaturan",
        icon: Sliders,
      },
    ],
  },
  {
    id: "super-admin",
    title: "Super Admin",
    description: "Pengguna, Akses & Fitur",
    icon: ShieldCheck,
    roles: ["super_admin"],
    items: [
      {
        id: "pengguna-akses",
        label: "Pengguna & Akses",
        path: "/admin/pengguna",
        icon: ShieldCheck,
      },
    ],
  },
];

export interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
  className?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  onNavigate,
  className = "",
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const currentRole = user?.role || "";

  // Sakelar fitur pengawas CBT (diatur Super Admin). Selama belum diketahui dianggap aktif.
  const { data: fitur } = useFitur();
  const pengawasCbtAktif = fitur?.pengawas_cbt_aktif ?? true;

  // Filter groups according to user role
  const visibleGroups = React.useMemo(() => {
    return ADMIN_NAV_GROUPS.map((group) => {
      // Fitur pengawas dimatikan: pengawas tak punya menu CBT sama sekali,
      // dan menu meja presensi disembunyikan untuk semua peran.
      if (
        !pengawasCbtAktif &&
        group.id === "cbt" &&
        currentRole === "pengawas_ujian"
      ) {
        return null;
      }
      // Check group role
      if (
        group.roles &&
        !group.roles.includes(currentRole) &&
        currentRole !== "super_admin"
      ) {
        return null;
      }
      // Filter sub-items by role
      const items = group.items.filter((item) => {
        if (!pengawasCbtAktif && item.id === "cbt-presensi") return false;
        if (!item.roles) return true;
        return (
          item.roles.includes(currentRole) || currentRole === "super_admin"
        );
      });
      if (items.length === 0) return null;
      return { ...group, items };
    }).filter(Boolean) as NavGroup[];
  }, [currentRole, pengawasCbtAktif]);

  // Lencana: jumlah berkas/bukti yang menunggu diperiksa
  const { data: antrean } = useAntreanVerifikasi();
  const jumlahItem = (item: NavSubItem): number =>
    item.antrean && antrean
      ? [item.antrean].flat().reduce((n, k) => n + antrean[k].menunggu, 0)
      : 0;
  const jumlahGrup = (group: NavGroup): number =>
    group.items.reduce((n, item) => n + jumlahItem(item), 0);

  // Determine which group has the active item
  const activeGroupId = React.useMemo(() => {
    for (const group of visibleGroups) {
      if (group.items.some((item) => location.pathname === item.path)) {
        return group.id;
      }
    }
    return visibleGroups[0]?.id || "ringkasan";
  }, [location.pathname, visibleGroups]);

  // Accordion open state persisted in localStorage
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    () => {
      try {
        const saved = localStorage.getItem("pmb_admin_sidebar_accordions");
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {
        // Ignore JSON error
      }
      return { [activeGroupId]: true };
    },
  );

  // Ensure active group is opened automatically when route changes
  React.useEffect(() => {
    setOpenGroups((prev) => {
      if (prev[activeGroupId]) return prev;
      const next = { ...prev, [activeGroupId]: true };
      try {
        localStorage.setItem(
          "pmb_admin_sidebar_accordions",
          JSON.stringify(next),
        );
      } catch {
        // Ignore
      }
      return next;
    });
  }, [activeGroupId]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem(
          "pmb_admin_sidebar_accordions",
          JSON.stringify(next),
        );
      } catch {
        // Ignore
      }
      return next;
    });
  };

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
    <aside
      className={`h-[100dvh] sticky top-0 flex flex-col bg-putih border-r border-biru-200 z-30 select-none transition-all duration-200 ease-in-out ${
        collapsed ? "w-[72px]" : "w-[268px]"
      } ${className}`}
      aria-label="Sidebar Navigasi Panel Admin"
    >
      {/* ===================================================================== */}
      {/* ZONA 1: HEADER TETAP */}
      {/* ===================================================================== */}
      <div className="h-16 shrink-0 px-3.5 border-b border-biru-100 flex items-center justify-between bg-putih">
        <Link
          to="/admin/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500 rounded-lg p-1"
          title="Ke Beranda Dashboard"
        >
          <Logo height={36} showText={!collapsed} />
          <span className="sr-only">Admin Panel</span>
        </Link>

        {/* Tombol Collapse / Expand */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-biru-600 hover:text-biru-950 hover:bg-biru-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500 cursor-pointer"
          title={collapsed ? "Perluas Sidebar" : "Persempit Sidebar (Rail)"}
          aria-label={collapsed ? "Perluas Sidebar" : "Persempit Sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* ZONA 2: AREA MENU SCROLL MANDIRI DENGAN AKORDION */}
      {/* ===================================================================== */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1.5 scrollbar-thin">
        {visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          const isGroupOpen = !!openGroups[group.id];
          const hasActiveItem = group.items.some(
            (item) => location.pathname === item.path,
          );

          if (collapsed) {
            // Mode Rail: tampilkan ikon grup dengan popover / direct first item link
            return (
              <div key={group.id} className="relative group/rail py-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  title={group.title}
                  className={`w-full h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                    hasActiveItem
                      ? "bg-biru-100 text-biru-900 font-bold"
                      : "text-biru-700 hover:bg-biru-50 hover:text-biru-950"
                  }`}
                >
                  <GroupIcon className="w-[18px] h-[18px] shrink-0" />
                  {jumlahGrup(group) > 0 && (
                    <span
                      className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-putih"
                      title={`${jumlahGrup(group)} menunggu diperiksa`}
                      aria-label={`${jumlahGrup(group)} menunggu diperiksa`}
                    />
                  )}
                </button>

                {/* Flyout Submenu Popover saat hover di Mode Rail */}
                <div className="absolute left-full top-0 ml-2 hidden group-hover/rail:block z-50 w-56 bg-putih rounded-xl border border-biru-200 shadow-soft-lg p-2 animate-in fade-in duration-150">
                  <div className="px-2.5 py-1 mb-1 border-b border-biru-100">
                    <div className="text-xs font-bold text-biru-950">
                      {group.title}
                    </div>
                    <div className="text-[10px] text-biru-600">
                      {group.description}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.id}
                          to={item.path}
                          onClick={onNavigate}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            isActive
                              ? "bg-biru-100 text-biru-900 font-bold"
                              : "text-biru-800 hover:bg-biru-50 hover:text-biru-950"
                          }`}
                        >
                          <ItemIcon className="w-3.5 h-3.5 shrink-0 text-biru-600" />
                          <span className="truncate">{item.label}</span>
                          <LencanaAntrean
                            jumlah={jumlahItem(item)}
                            keterangan="menunggu diperiksa"
                            className="ml-auto"
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          // Mode Penuh: Akordion interaktif
          return (
            <div key={group.id} className="rounded-xl overflow-hidden">
              {/* Header Grup Akordion */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full h-9 flex items-center justify-between px-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  hasActiveItem
                    ? "text-biru-900 bg-biru-50/80"
                    : "text-biru-700 hover:bg-biru-50/50 hover:text-biru-900"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <GroupIcon className="w-4 h-4 text-biru-600 shrink-0" />
                  <span className="truncate text-[11px] font-bold">
                    {group.title}
                  </span>
                </div>
                <span className="flex items-center gap-1.5 shrink-0">
                  {/* Saat grup tertutup, tetap tampilkan ada pekerjaan di dalamnya */}
                  {!isGroupOpen && (
                    <LencanaAntrean
                      jumlah={jumlahGrup(group)}
                      keterangan="menunggu diperiksa"
                    />
                  )}
                  {isGroupOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-biru-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-biru-400 shrink-0" />
                  )}
                </span>
              </button>

              {/* Sub-item Navigasi */}
              {isGroupOpen && (
                <div className="pl-2 mt-0.5 space-y-0.5 border-l border-biru-100 ml-3 py-0.5">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.id}
                        to={item.path}
                        onClick={onNavigate}
                        className={`relative flex items-center gap-2.5 px-3 h-10 rounded-xl text-xs transition-all ${
                          isActive
                            ? "bg-biru-100 text-biru-900 font-bold shadow-xs"
                            : "text-biru-800 hover:bg-biru-50 hover:text-biru-950 font-medium"
                        }`}
                      >
                        {/* Garis Aksen Biru-600 Sisi Kiri untuk Halaman Aktif */}
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-biru-600 rounded-r-md" />
                        )}
                        <ItemIcon
                          className={`w-[18px] h-[18px] shrink-0 ${
                            isActive ? "text-biru-700" : "text-biru-500"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                        <LencanaAntrean
                          jumlah={jumlahItem(item)}
                          keterangan="menunggu diperiksa"
                          className="ml-auto"
                        />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* ZONA 3: FOOTER TETAP (PROFIL & LOGOUT) */}
      {/* ===================================================================== */}
      <div className="shrink-0 p-3 border-t border-biru-100 bg-biru-50/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-biru-900 text-putih flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {getInitials(user?.nama_lengkap || "Admin")}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-biru-950 truncate">
                  {user?.nama_lengkap || "Administrator"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-biru-500 animate-pulse" />
                  <span className="text-[10px] text-biru-700 font-mono uppercase tracking-wider truncate">
                    {user?.role || "Petugas PMB"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-xl text-biru-600 hover:text-putih hover:bg-biru-800 border border-biru-200 hover:border-biru-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500 cursor-pointer shrink-0"
            title="Keluar dari Panel Admin"
            aria-label="Keluar dari akun"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
