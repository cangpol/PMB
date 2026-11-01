import * as React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Menu,
  ArrowRight,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  GraduationCap,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
import logoSvg from "../../assets/logo-placeholder.svg";

const CURRENT_YEAR = 2026;

interface NavLinkItem {
  label: string;
  href: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: "Beranda", href: "/" },
  { label: "Jalur Masuk", href: "/jalur-masuk" },
  { label: "Program Studi", href: "/prodi" },
  { label: "Biaya & UKT", href: "/biaya" },
  { label: "Jadwal", href: "/jadwal" },
  { label: "Pengumuman", href: "/pengumuman" },
  { label: "FAQ", href: "/faq" },
  { label: "Kontak", href: "/kontak" },
];

export const PublicLayout: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-putih text-biru-950 font-sans selection:bg-biru-100 selection:text-biru-950">
      {/* Skip to main content for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-biru-900 focus:px-4 focus:py-2 focus:text-putih focus:shadow-soft-lg focus:outline-none focus:ring-2 focus:ring-biru-500"
      >
        Lewati ke konten utama
      </a>

      {/* Top Banner Akademik */}
      <div className="border-b border-biru-900 bg-biru-950 px-4 py-2 text-xs text-biru-200">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-biru-400" />
            <span className="font-medium">
              PMB Tahun Akademik 2026/2027 Telah Dibuka Resmi &middot; Beasiswa
              Unggulan Triputra Group
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-biru-200">
            <a
              href="tel:+6281234567890"
              className="flex items-center gap-1.5 hover:text-putih transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-biru-400" />
              <span>+62 812-3456-7890</span>
            </a>
            <a
              href="mailto:pmb@upitra.ac.id"
              className="flex items-center gap-1.5 hover:text-putih transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-biru-400" />
              <span>pmb@upitra.ac.id</span>
            </a>
            <Link
              to="/cek-kelulusan"
              className="inline-flex items-center gap-1 font-semibold text-biru-300 hover:text-putih transition-colors underline underline-offset-4"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Cek Kelulusan</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Header & Sticky Navbar */}
      <header className="sticky top-0 z-40 border-b border-biru-100 bg-putih/95 backdrop-blur-md transition-all shadow-soft-sm">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo Brand */}
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500"
            aria-label="Beranda PMB Universitas Pignatelli Triputra"
          >
            <img
              src={logoSvg}
              alt="Logo Universitas Pignatelli Triputra"
              className="h-10 sm:h-11 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden xl:flex items-center gap-5 text-sm font-medium text-biru-800"
          >
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`transition-colors hover:text-biru-950 py-1 ${
                    isActive
                      ? "font-bold text-biru-950 border-b-2 border-biru-700"
                      : ""
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Action Buttons (Desktop) */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link to="/cek-kelulusan" className="hidden lg:inline-block">
              <Button variant="outline" size="sm" className="text-xs">
                Cek Kelulusan
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Masuk
              </Button>
            </Link>
            <Link to="/register">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Daftar Sekarang
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex xl:hidden items-center gap-2">
            <Link to="/register" className="sm:hidden">
              <Button variant="primary" size="sm">
                Daftar
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi utama"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-biru-200 bg-putih text-biru-900 shadow-soft-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <Drawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        side="right"
        title="Menu Navigasi PMB"
      >
        <div className="flex flex-col gap-5 py-2">
          <nav aria-label="Navigasi Mobile" className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-biru-100 font-bold text-biru-950"
                      : "text-biru-800 hover:bg-biru-50 hover:text-biru-950"
                  }`}
                >
                  <span>{link.label}</span>
                  <ArrowRight className="h-4 w-4 text-biru-500" />
                </Link>
              );
            })}
            <Link
              to="/cek-kelulusan"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-biru-900 bg-biru-50 border border-biru-200 mt-1"
            >
              <span className="flex items-center gap-2 font-semibold">
                <GraduationCap className="h-4 w-4 text-biru-600" />
                Cek Status Kelulusan
              </span>
              <ArrowRight className="h-4 w-4 text-biru-500" />
            </Link>
          </nav>

          <div className="border-t border-biru-100 pt-4 flex flex-col gap-2.5">
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full">
                Masuk ke Akun
              </Button>
            </Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" className="w-full">
                Daftar Sekarang
              </Button>
            </Link>
          </div>

          <div className="rounded-xl border border-biru-200 bg-biru-50 p-4 text-xs text-biru-800 space-y-1.5">
            <p className="font-semibold text-biru-950">Layanan Informasi PMB</p>
            <p>Senin &ndash; Jumat: 08.00 &ndash; 16.00 WIB</p>
            <p>Sabtu: 08.00 &ndash; 13.00 WIB</p>
            <p className="font-medium text-biru-700">
              WhatsApp: +62 812-3456-7890
            </p>
          </div>
        </div>
      </Drawer>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1">
        {children ?? <Outlet />}
      </main>

      {/* Comprehensive Academic Footer */}
      <footer className="border-t border-biru-200 bg-biru-950 text-biru-200 pt-14 pb-8">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4 lg:gap-12">
            {/* Col 1: Campus Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-biru-800 flex items-center justify-center text-putih font-serif font-bold text-xl shadow-soft-sm">
                  U
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-putih tracking-wide">
                    UNIVERSITAS PIGNATELLI TRIPUTRA
                  </h3>
                  <p className="text-xs text-biru-400 font-sans">
                    Unggul, Berintegritas, Inovatif
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-biru-300">
                Pendidikan tinggi berbasis karakter, teknologi terapan, dan
                kemitraan strategis dengan industri Triputra Group untuk
                mencetak pemimpin masa depan berdaya saing global.
              </p>
              <div className="pt-2 text-xs text-biru-400">
                <p className="font-semibold text-putih">Akreditasi Institusi</p>
                <p>Terakreditasi Baik Sekali oleh BAN-PT</p>
              </div>
            </div>

            {/* Col 2: Jalur Masuk & Program */}
            <div className="space-y-3">
              <h4 className="font-serif text-sm font-bold uppercase tracking-wider text-putih border-b border-biru-800 pb-2">
                Jalur Penerimaan
              </h4>
              <ul className="space-y-2 text-xs text-biru-300">
                <li>
                  <Link
                    to="/jalur-masuk#reguler"
                    className="hover:text-putih transition-colors"
                  >
                    Jalur Reguler (Tes CBT Mandiri)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/jalur-masuk#prestasi"
                    className="hover:text-putih transition-colors"
                  >
                    Jalur Prestasi Rapor & Kejuaraan
                  </Link>
                </li>
                <li>
                  <Link
                    to="/jalur-masuk#beasiswa"
                    className="hover:text-putih transition-colors"
                  >
                    Beasiswa Kemitraan Triputra
                  </Link>
                </li>
                <li>
                  <Link
                    to="/jalur-masuk#rpl"
                    className="hover:text-putih transition-colors"
                  >
                    Rekognisi Pembelajaran Lampau (RPL)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/prodi"
                    className="hover:text-putih transition-colors font-medium text-biru-400"
                  >
                    Lihat Semua Program Studi &rarr;
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Informasi & Layanan Calon */}
            <div className="space-y-3">
              <h4 className="font-serif text-sm font-bold uppercase tracking-wider text-putih border-b border-biru-800 pb-2">
                Informasi Penting
              </h4>
              <ul className="space-y-2 text-xs text-biru-300">
                <li>
                  <Link
                    to="/biaya"
                    className="hover:text-putih transition-colors"
                  >
                    Biaya Kuliah & Kalkulator UKT
                  </Link>
                </li>
                <li>
                  <Link
                    to="/jadwal"
                    className="hover:text-putih transition-colors"
                  >
                    Jadwal Gelombang Seleksi
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pengumuman"
                    className="hover:text-putih transition-colors"
                  >
                    Berita & Pengumuman PMB
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cek-kelulusan"
                    className="hover:text-putih transition-colors"
                  >
                    Cek Hasil Kelulusan Seleksi
                  </Link>
                </li>
                <li>
                  <Link
                    to="/faq"
                    className="hover:text-putih transition-colors"
                  >
                    Pertanyaan Umum (FAQ)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Sekretariat PMB */}
            <div className="space-y-3">
              <h4 className="font-serif text-sm font-bold uppercase tracking-wider text-putih border-b border-biru-800 pb-2">
                Sekretariat PMB
              </h4>
              <div className="space-y-2.5 text-xs text-biru-300">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 text-biru-400 mt-0.5" />
                  <span>
                    Jl. K.S. Tubun No. 2, Manahan, Banjarsari, Kota Surakarta,
                    Jawa Tengah 57139
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-biru-400" />
                  <span>+62 812-3456-7890 (WhatsApp Hotline)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-biru-400" />
                  <span>pmb@upitra.ac.id</span>
                </div>
                <div className="pt-2">
                  <p className="text-[11px] text-biru-400">Jam Operasional:</p>
                  <p className="text-xs">
                    Senin &ndash; Jumat: 08.00 &ndash; 16.00 WIB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Disclaimer */}
          <div className="mt-12 border-t border-biru-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-biru-400">
            <p>
              &copy; {CURRENT_YEAR} Universitas Pignatelli Triputra. Hak Cipta
              Dilindungi Undang-Undang.
            </p>
            <div className="flex items-center gap-6 text-biru-300">
              <Link
                to="/kebijakan-privasi"
                className="hover:text-putih hover:underline transition-colors"
              >
                Kebijakan Privasi
              </Link>
              <Link
                to="/syarat-ketentuan"
                className="hover:text-putih hover:underline transition-colors"
              >
                Syarat & Ketentuan
              </Link>
              {import.meta.env.DEV && (
                <Link
                  to="/styleguide"
                  className="inline-flex items-center gap-1 font-semibold text-biru-400 hover:text-putih hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Styleguide (Dev)
                </Link>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
