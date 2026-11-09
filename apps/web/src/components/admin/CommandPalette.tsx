import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
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
  UserPlus,
  Tv,
  UserCheck,
  HelpCircle,
  FileText,
  Image,
  FileCode,
  ShieldCheck,
  Hash,
  Megaphone,
  X,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context";

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  path: string;
  keywords?: string[];
  roles?: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_COMMAND_ITEMS: CommandItem[] = [
  // Ringkasan
  {
    id: "dashboard",
    label: "Dashboard Eksekutif & Analitik",
    group: "Ringkasan",
    path: "/admin/dashboard",
    keywords: ["statistik", "analisis", "grafik", "kpi"],
    icon: LayoutDashboard,
  },
  {
    id: "offline",
    label: "Pendaftaran Offline Loket",
    group: "Ringkasan",
    path: "/admin/pendaftaran-offline",
    keywords: ["loket", "formulir fisik", "cs"],
    roles: ["admin_pmb", "super_admin"],
    icon: UserPlus,
  },

  // Pendaftaran
  {
    id: "berkas",
    label: "Verifikasi Berkas PMB",
    group: "Pendaftaran",
    path: "/admin/berkas",
    keywords: ["dokumen", "ijazah", "ktp", "validasi"],
    roles: ["admin_pmb", "super_admin"],
    icon: FileCheck2,
  },
  {
    id: "master",
    label: "Master Data Pendaftar",
    group: "Pendaftaran",
    path: "/admin/master",
    keywords: ["data calon", "ekspor", "pendaftar"],
    roles: ["admin_pmb", "super_admin"],
    icon: Layers,
  },

  // CBT Ujian
  {
    id: "cbt-sesi",
    label: "Jadwal & Sesi CBT",
    group: "Ujian CBT",
    path: "/admin/cbt/sesi",
    keywords: ["sesi", "jadwal ujian", "ruangan", "token"],
    roles: ["admin_pmb", "super_admin", "pengawas_ujian"],
    icon: Tv,
  },
  {
    id: "cbt-presensi",
    label: "Meja Presensi Pengawas",
    group: "Ujian CBT",
    path: "/admin/cbt/presensi",
    keywords: ["kehadiran", "presensi", "pengawas", "ujian"],
    roles: ["admin_pmb", "super_admin", "pengawas_ujian"],
    icon: UserCheck,
  },
  {
    id: "pengguna-akses",
    label: "Pengguna & Akses (Fitur Pengawas CBT, Bagi Peran)",
    group: "Super Admin",
    path: "/admin/pengguna",
    keywords: [
      "user",
      "pengguna",
      "peran",
      "role",
      "akses",
      "pengawas",
      "fitur",
    ],
    roles: ["super_admin"],
    icon: ShieldCheck,
  },
  {
    id: "cbt-hasil",
    label: "Hasil Pengerjaan CBT",
    group: "Ujian CBT",
    path: "/admin/cbt/hasil",
    keywords: ["skor", "nilai", "hasil", "ujian", "cbt"],
    roles: ["admin_pmb", "super_admin"],
    icon: Tv,
  },
  {
    id: "cfg-rumus-nim",
    label: "Rumus Pembuatan NIM",
    group: "Pengaturan PMB",
    path: "/admin/konfigurasi/rumus-nim",
    keywords: ["nim", "nomor induk", "rumus", "format", "mahasiswa"],
    roles: ["admin_pmb", "super_admin"],
    icon: Hash,
  },
  {
    id: "cbt-soal",
    label: "Bank Soal CBT",
    group: "Ujian CBT",
    path: "/admin/cbt/bank-soal",
    keywords: ["soal", "kunci", "pertanyaan", "butir"],
    roles: ["admin_pmb", "super_admin", "pengawas_ujian"],
    icon: HelpCircle,
  },

  // Keuangan
  {
    id: "keuangan",
    label: "Verifikasi Keuangan & Tagihan",
    group: "Keuangan",
    path: "/admin/keuangan",
    keywords: ["bayar", "transfer", "lunas", "piutang"],
    roles: ["admin_pmb", "super_admin", "keuangan"],
    icon: CreditCard,
  },

  // Kelulusan & Registrasi
  {
    id: "seleksi",
    label: "Seleksi Kelulusan",
    group: "Hasil & Registrasi",
    path: "/admin/seleksi",
    keywords: ["sidang", "lulus", "sk", "peringkat"],
    roles: ["admin_pmb", "super_admin"],
    icon: GraduationCap,
  },
  {
    id: "seleksi-tahap",
    label: "Seleksi Rapor, Interview & Kuota Jalur",
    group: "Hasil & Registrasi",
    path: "/admin/seleksi-tahap",
    keywords: [
      "rapor",
      "interview",
      "kuota",
      "pindah jalur",
      "ready early",
      "notifikasi",
    ],
    roles: ["admin_pmb", "super_admin"],
    icon: GraduationCap,
  },
  {
    id: "laporan-registrasi",
    label: "Laporan Registrasi & Sumber Informasi",
    group: "Hasil & Registrasi",
    path: "/admin/laporan-registrasi",
    keywords: [
      "registrasi",
      "sumber",
      "media sosial",
      "sekolah",
      "follow up",
      "pdf",
    ],
    roles: ["admin_pmb", "super_admin"],
    icon: Megaphone,
  },
  {
    id: "daftar-ulang",
    label: "Verifikasi Daftar Ulang & NIM",
    group: "Hasil & Registrasi",
    path: "/admin/daftar-ulang",
    keywords: ["registrasi", "nim", "mahasiswa baru"],
    roles: ["admin_pmb", "super_admin"],
    icon: FileCheck2,
  },

  // Jalur RPL
  {
    id: "rpl-evaluasi",
    label: "Evaluasi & Konversi RPL",
    group: "Jalur Rekognisi (RPL)",
    path: "/admin/rpl",
    keywords: ["portofolio", "konversi", "asesor", "sks"],
    roles: ["admin_pmb", "super_admin", "asesor_rpl"],
    icon: FileCheck2,
  },
  {
    id: "rpl-matkul",
    label: "Kurikulum Mata Kuliah RPL",
    group: "Jalur Rekognisi (RPL)",
    path: "/admin/rpl/mata-kuliah",
    keywords: ["matkul", "sks", "silabus"],
    roles: ["admin_pmb", "super_admin", "asesor_rpl"],
    icon: BookOpen,
  },

  // Konten CMS
  {
    id: "cms-berita",
    label: "Berita & Pengumuman PMB",
    group: "Konten Publik (CMS)",
    path: "/admin/cms/berita",
    keywords: ["artikel", "berita", "pengumuman", "rilis"],
    roles: ["admin_pmb", "super_admin"],
    icon: FileText,
  },
  {
    id: "cms-banner",
    label: "Banner Slider Beranda",
    group: "Konten Publik (CMS)",
    path: "/admin/cms/banner",
    keywords: ["slider", "gambar", "promo", "hero"],
    roles: ["admin_pmb", "super_admin"],
    icon: Image,
  },
  {
    id: "cms-faq",
    label: "FAQ Pertanyaan Umum",
    group: "Konten Publik (CMS)",
    path: "/admin/cms/faq",
    keywords: ["tanya jawab", "bantuan", "pertanyaan"],
    roles: ["admin_pmb", "super_admin"],
    icon: HelpCircle,
  },
  {
    id: "cms-halaman",
    label: "Halaman & Kebijakan",
    group: "Konten Publik (CMS)",
    path: "/admin/cms/halaman",
    keywords: ["privasi", "syarat", "statis"],
    roles: ["admin_pmb", "super_admin"],
    icon: FileCode,
  },

  // Pengaturan PMB
  {
    id: "cfg-gelombang",
    label: "Tahun & Gelombang Pendaftaran",
    group: "Pengaturan PMB",
    path: "/admin/konfigurasi/gelombang",
    keywords: ["jadwal", "buka", "tutup", "periode"],
    roles: ["admin_pmb", "super_admin"],
    icon: Calendar,
  },
  {
    id: "cfg-prodi",
    label: "Fakultas & Program Studi",
    group: "Pengaturan PMB",
    path: "/admin/konfigurasi/prodi",
    keywords: ["jurusan", "jenjang", "kuota"],
    roles: ["admin_pmb", "super_admin"],
    icon: BookOpen,
  },
  {
    id: "cfg-jalur",
    label: "Jalur Pendaftaran PMB",
    group: "Pengaturan PMB",
    path: "/admin/konfigurasi/jalur",
    keywords: ["reguler", "prestasi", "rpl", "kemitraan"],
    roles: ["admin_pmb", "super_admin"],
    icon: Compass,
  },
  {
    id: "cfg-biaya",
    label: "Matriks Biaya & Cicilan UKT",
    group: "Pengaturan PMB",
    path: "/admin/konfigurasi/biaya",
    keywords: ["tarif", "ukt", "dpp", "cicilan"],
    roles: ["admin_pmb", "super_admin"],
    icon: Coins,
  },
  {
    id: "cfg-potongan-jalur",
    label: "Potongan Biaya per Jalur",
    group: "Pengaturan PMB",
    path: "/admin/konfigurasi/potongan-jalur",
    keywords: ["diskon", "beasiswa", "potongan", "dpp", "sks", "jalur"],
    roles: ["admin_pmb", "super_admin"],
    icon: Coins,
  },
  {
    id: "cfg-biaya-kuliah",
    label: "Rincian Biaya Kuliah per Prodi",
    group: "Pengaturan PMB",
    path: "/admin/konfigurasi/biaya-kuliah",
    keywords: ["admisi", "semester", "total", "biaya kuliah", "spp"],
    roles: ["admin_pmb", "super_admin"],
    icon: Coins,
  },
  {
    id: "cfg-voucher",
    label: "Voucher Promosi & Beasiswa",
    group: "Pengaturan PMB",
    path: "/admin/konfigurasi/vouchers",
    keywords: ["diskon", "kupon", "kode promo"],
    roles: ["admin_pmb", "super_admin"],
    icon: Ticket,
  },
  {
    id: "cfg-form",
    label: "Form & Berkas Builder",
    group: "Pengaturan PMB",
    path: "/admin/konfigurasi/form-builder",
    keywords: ["kustomisasi formulir", "syarat berkas"],
    roles: ["admin_pmb", "super_admin"],
    icon: Layers,
  },
  {
    id: "cfg-pengaturan",
    label: "Pengaturan Sistem PMB",
    group: "Pengaturan PMB",
    path: "/admin/konfigurasi/pengaturan",
    keywords: ["whatsapp", "email", "smtp", "gateway", "notifikasi"],
    roles: ["admin_pmb", "super_admin"],
    icon: Sliders,
  },
];

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Filter items by role (fail-closed if role is undefined)
  const roleFilteredItems = React.useMemo(() => {
    const currentRole = user?.role || "";
    return ADMIN_COMMAND_ITEMS.filter((item) => {
      if (!item.roles || item.roles.length === 0) return true;
      return item.roles.includes(currentRole) || currentRole === "super_admin";
    });
  }, [user?.role]);

  // Filter items by search query
  const filteredItems = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roleFilteredItems;
    return roleFilteredItems.filter((item) => {
      const matchLabel = item.label.toLowerCase().includes(q);
      const matchGroup = item.group.toLowerCase().includes(q);
      const matchKeywords = item.keywords?.some((k) =>
        k.toLowerCase().includes(q),
      );
      return matchLabel || matchGroup || matchKeywords;
    });
  }, [roleFilteredItems, search]);

  React.useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      };
      window.addEventListener("keydown", handleGlobalKeyDown);
      return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }
  }, [isOpen, onClose]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredItems.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredItems.length - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredItems[selectedIndex];
      if (target) {
        navigate(target.path);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Ensure active item is visible in viewport
  React.useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      ) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-biru-950/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-putih rounded-2xl border border-biru-200 shadow-soft-xl overflow-hidden text-biru-950 flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-biru-100 bg-biru-50/50">
          <Search className="w-4 h-4 text-biru-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari menu, konfigurasi, atau fitur PMB... (↑↓ navigasi, Enter pilih)"
            className="w-full bg-transparent text-sm font-sans placeholder:text-biru-400 focus:outline-none text-biru-950"
          />
          {search ? (
            <button
              onClick={() => setSearch("")}
              className="p-1 rounded-md text-biru-400 hover:text-biru-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-biru-100 text-biru-800 border border-biru-200">
              ESC
            </kbd>
          )}
        </div>

        {/* Search Results List */}
        <div
          ref={listRef}
          className="overflow-y-auto p-2 divide-y divide-biru-50 scrollbar-thin"
        >
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-biru-600 space-y-1">
              <p className="font-semibold text-biru-900">
                Tidak ada menu yang sesuai
              </p>
              <p>
                Coba gunakan kata kunci lain seperti "berkas", "soal", atau
                "ukt".
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                    isSelected
                      ? "bg-biru-100 text-biru-950 font-bold"
                      : "text-biru-800 hover:bg-biru-50/70"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-biru-600 text-putih"
                          : "bg-biru-100/70 text-biru-700"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="truncate font-semibold">{item.label}</div>
                      <div className="text-[10px] text-biru-600 font-normal">
                        {item.group}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-biru-500 shrink-0">
                    {isSelected && (
                      <span className="text-[10px] text-biru-700 font-mono hidden sm:inline">
                        Buka
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="px-4 py-2 border-t border-biru-100 bg-biru-50/40 flex items-center justify-between text-[11px] text-biru-600 font-sans">
          <div className="flex items-center gap-2">
            <span>Navigasi:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-putih border border-biru-200 text-biru-800 font-mono text-[10px]">
              ↑
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-putih border border-biru-200 text-biru-800 font-mono text-[10px]">
              ↓
            </kbd>
            <span>Pilih:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-putih border border-biru-200 text-biru-800 font-mono text-[10px]">
              ↵
            </kbd>
          </div>
          <span className="text-[10px]">Universitas Pignatelli Triputra</span>
        </div>
      </div>
    </div>
  );
};
