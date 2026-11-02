import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  ArrowRight,
  GraduationCap,
  ChevronDown,
  Megaphone,
  HelpCircle,
  Phone,
  FileText,
} from "lucide-react";
import { Logo } from "../ui/Logo";

interface NavLinkItem {
  label: string;
  href: string;
}

const PRIMARY_NAV_LINKS: NavLinkItem[] = [
  { label: "Beranda", href: "/" },
  { label: "Jalur Masuk", href: "/jalur-masuk" },
  { label: "Program Studi", href: "/program-studi" },
  { label: "Biaya & UKT", href: "/biaya" },
  { label: "Jadwal", href: "/jadwal" },
];

const INFO_DROPDOWN_LINKS = [
  {
    label: "Pengumuman",
    description: "Informasi resmi dan berita seleksi",
    href: "/pengumuman",
    icon: Megaphone,
  },
  {
    label: "FAQ",
    description: "Tanya jawab seputar pendaftaran",
    href: "/faq",
    icon: HelpCircle,
  },
  {
    label: "Kontak",
    description: "Hubungi panitia PMB dan lokasi kampus",
    href: "/kontak",
    icon: Phone,
  },
  {
    label: "Panduan Pendaftaran",
    description: "Syarat, tata tertib, dan alur seleksi",
    href: "/syarat-ketentuan",
    icon: FileText,
  },
];

export const PublicNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState<boolean>(false);
  const [isScrolled, setIsScrolled] = React.useState<boolean>(false);
  const [infoDropdownOpen, setInfoDropdownOpen] = React.useState<boolean>(false);
  const [mobileInfoExpanded, setMobileInfoExpanded] =
    React.useState<boolean>(false);

  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const drawerRef = React.useRef<HTMLDivElement>(null);

  // Monitor scroll untuk penyesuaian tinggi dan bayangan lembut bernuansa biru
  React.useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled(scrolled);
      // Sinkronkan CSS variable --navbar-h untuk halaman yang membutuhkannya
      document.documentElement.style.setProperty(
        "--navbar-h",
        scrolled ? "64px" : "72px",
      );
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Tutup menu dan dropdown saat rute berpindah
  React.useEffect(() => {
    setMobileMenuOpen(false);
    setInfoDropdownOpen(false);
  }, [location.pathname]);

  // Lock scroll saat mobile drawer terbuka
  React.useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen]);

  // Keyboard accessibility: Escape untuk menutup dropdown dan mobile drawer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (infoDropdownOpen) setInfoDropdownOpen(false);
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [infoDropdownOpen, mobileMenuOpen]);

  // Klik di luar dropdown untuk menutup
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setInfoDropdownOpen(false);
      }
    };
    if (infoDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [infoDropdownOpen]);

  const isProdiActive =
    location.pathname.startsWith("/program-studi") ||
    location.pathname.startsWith("/prodi");

  const isInfoActive =
    location.pathname.startsWith("/pengumuman") ||
    location.pathname.startsWith("/faq") ||
    location.pathname.startsWith("/kontak") ||
    location.pathname.startsWith("/syarat-ketentuan");

  return (
    <header
      className={`sticky top-0 z-40 bg-putih border-b border-biru-100 transition-all duration-200 motion-reduce:transition-none ${
        isScrolled
          ? "h-16 sm:h-[64px] shadow-[0_4px_20px_rgba(11,37,89,0.07)]"
          : "h-[72px]"
      }`}
      style={{ scrollPaddingTop: isScrolled ? "64px" : "72px" }}
    >
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ZONA KIRI: Logo Institusi (lebar tetap, anti broken-image) */}
        <div className="shrink-0">
          <Link
            to="/"
            className="flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500"
            aria-label="Beranda PMB Universitas Pignatelli Triputra"
          >
            <Logo width={220} height={44} />
          </Link>
        </div>

        {/* ZONA TENGAH: Menu Navigasi Utama (>=1024px) */}
        {/* Semua item whitespace-nowrap, font-medium konstan (zero layout shift) */}
        <nav
          aria-label="Navigasi Utama"
          className="hidden min-[1024px]:flex items-center gap-1 text-sm font-medium text-biru-700"
        >
          {PRIMARY_NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? location.pathname === "/"
                : link.href === "/program-studi"
                  ? isProdiActive
                  : location.pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                to={link.href}
                className={`relative whitespace-nowrap px-3.5 py-2 rounded-lg transition-colors font-medium ${
                  isActive
                    ? "text-biru-950 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-biru-600 after:rounded-full"
                    : "hover:text-biru-950 hover:bg-biru-50/80"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Menu Dropdown "Informasi" */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setInfoDropdownOpen(!infoDropdownOpen)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setInfoDropdownOpen(true);
                }
              }}
              aria-haspopup="true"
              aria-expanded={infoDropdownOpen}
              className={`relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-lg transition-colors font-medium ${
                isInfoActive
                  ? "text-biru-950 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-biru-600 after:rounded-full"
                  : "hover:text-biru-950 hover:bg-biru-50/80"
              }`}
            >
              <span>Informasi</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-150 ${
                  infoDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {infoDropdownOpen && (
              <div
                role="menu"
                aria-orientation="vertical"
                className="absolute top-full left-0 mt-2 w-72 rounded-2xl border border-biru-100 bg-putih p-2 shadow-soft-xl focus:outline-none animate-in fade-in-50 zoom-in-95 duration-150"
              >
                {INFO_DROPDOWN_LINKS.map((item) => {
                  const Icon = item.icon;
                  const isItemActive = location.pathname.startsWith(item.href);
                  return (
                    <button
                      key={item.href}
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        navigate(item.href);
                        setInfoDropdownOpen(false);
                      }}
                      className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors ${
                        isItemActive
                          ? "bg-biru-50 text-biru-950"
                          : "text-biru-800 hover:bg-biru-50/80 hover:text-biru-950"
                      }`}
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-biru-100 text-biru-700">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{item.label}</div>
                        <div className="text-[11px] text-biru-600 line-clamp-1">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* ZONA KANAN: Aksi & Tombol CTA */}
        <div className="hidden min-[1024px]:flex items-center gap-2.5">
          {/* Cek Kelulusan */}
          {/* >=1280px: Teks + Ikon. 1024-1279px: Ikon + Tooltip */}
          <Link
            to="/cek-kelulusan"
            title="Cek Status Kelulusan Seleksi PMB"
            aria-label="Cek Status Kelulusan Seleksi PMB"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-biru-800 hover:text-biru-950 hover:bg-biru-50 transition-colors whitespace-nowrap"
          >
            <GraduationCap className="h-4 w-4 text-biru-600 shrink-0" />
            <span className="hidden min-[1280px]:inline">Cek Kelulusan</span>
          </Link>

          {/* Tombol Masuk */}
          {/* >=1280px: Outline button h-10 px-4. 1024-1279px: Text link */}
          <Link
            to="/login"
            className="hidden min-[1280px]:inline-flex items-center justify-center h-10 px-4 rounded-xl border border-biru-800 text-xs font-semibold text-biru-800 hover:bg-biru-50 hover:border-biru-900 transition-colors whitespace-nowrap"
          >
            Masuk
          </Link>
          <Link
            to="/login"
            className="inline-flex min-[1280px]:hidden items-center text-xs font-semibold text-biru-800 hover:text-biru-950 hover:underline px-2 py-1.5 whitespace-nowrap"
          >
            Masuk
          </Link>

          {/* Tombol Daftar Sekarang (Selalu Solid Gradient Satu Baris) */}
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gradient-to-r from-biru-700 to-biru-600 hover:from-biru-800 hover:to-biru-700 text-putih text-xs font-bold shadow-soft-sm hover:shadow-soft-md transition-all whitespace-nowrap"
          >
            <span>Daftar Sekarang</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* MOBILE/TABLET HEADER CONTROLS (<1024px) */}
        <div className="flex min-[1024px]:hidden items-center gap-2">
          <Link
            to="/register"
            className="inline-flex items-center h-9 px-3.5 rounded-xl bg-gradient-to-r from-biru-700 to-biru-600 text-putih text-xs font-bold shadow-soft-sm"
          >
            Daftar
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Buka menu navigasi utama"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-biru-200 bg-putih text-biru-900 hover:bg-biru-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER (<1024px) dengan Focus Trap, Escape close, dan Scroll Lock */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-biru-950/40 backdrop-blur-xs min-[1024px]:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu Navigasi Mobile PMB"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            ref={drawerRef}
            className="relative flex h-full w-full max-w-sm flex-col bg-putih p-6 shadow-2xl focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Drawer */}
            <div className="flex items-center justify-between pb-4 border-b border-biru-100">
              <Logo width={180} height={36} />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu navigasi"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-biru-200 text-biru-700 hover:bg-biru-50 hover:text-biru-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-1">
              {PRIMARY_NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/"
                    ? location.pathname === "/"
                    : link.href === "/program-studi"
                      ? isProdiActive
                      : location.pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-biru-100 text-biru-950 font-bold"
                        : "text-biru-800 hover:bg-biru-50 hover:text-biru-950"
                    }`}
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="h-4 w-4 text-biru-400" />
                  </Link>
                );
              })}

              {/* Accordion Informasi */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setMobileInfoExpanded(!mobileInfoExpanded)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    isInfoActive
                      ? "bg-biru-50 text-biru-950 font-bold"
                      : "text-biru-800 hover:bg-biru-50 hover:text-biru-950"
                  }`}
                >
                  <span>Pusat Informasi</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-150 ${
                      mobileInfoExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {mobileInfoExpanded && (
                  <div className="ml-3 mt-1 pl-3 border-l-2 border-biru-100 space-y-1">
                    {INFO_DROPDOWN_LINKS.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = location.pathname.startsWith(
                        item.href,
                      );
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                            isItemActive
                              ? "bg-biru-100 text-biru-950 font-bold"
                              : "text-biru-700 hover:bg-biru-50 hover:text-biru-950"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 text-biru-600" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tautan Khusus Cek Kelulusan */}
              <Link
                to="/cek-kelulusan"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-biru-900 bg-biru-50 border border-biru-200 mt-3"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <GraduationCap className="h-4 w-4 text-biru-600" />
                  Cek Status Kelulusan
                </span>
                <ArrowRight className="h-4 w-4 text-biru-500" />
              </Link>
            </div>

            {/* Bottom Actions di Drawer */}
            <div className="pt-4 border-t border-biru-100 space-y-2">
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-gradient-to-r from-biru-700 to-biru-600 text-putih text-sm font-bold shadow-soft-sm"
              >
                <span>Daftar Sekarang</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full h-11 rounded-xl border border-biru-800 text-sm font-semibold text-biru-800 hover:bg-biru-50"
              >
                Masuk ke Akun
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

