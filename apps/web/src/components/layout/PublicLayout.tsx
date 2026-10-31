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
  { label: "Biaya & Beasiswa", href: "/biaya" },
  { label: "Jadwal Seleksi", href: "/jadwal" },
  { label: "Informasi Kontak", href: "/kontak" },
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
      <div className="border-b border-biru-800 bg-biru-950 px-4 py-2 text-xs text-biru-200">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-biru-500" />
            <span>
              Penerimaan Mahasiswa Baru Tahun Akademik 2026/2027 Telah Dibuka
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-biru-200">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-biru-500" />
              (0274) 888-999
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-biru-500" />
              pmb@pignatelli.ac.id
            </span>
          </div>
        </div>
      </div>

      {/* Header & Sticky Navbar */}
      <header className="sticky top-0 z-40 border-b border-biru-100 bg-putih/95 backdrop-blur-md transition-all shadow-soft-sm">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo Brand */}
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500"
            aria-label="Beranda PMB Universitas Pignatelli Triputra"
          >
            <img
              src={logoSvg}
              alt="Logo Universitas Pignatelli Triputra"
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-biru-800"
          >
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`transition-colors hover:text-biru-950 ${
                    isActive
                      ? "font-semibold text-biru-950 underline underline-offset-8 decoration-biru-600 decoration-2"
                      : ""
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Action Buttons (Desktop) */}
          <div className="hidden sm:flex items-center gap-3">
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
          <div className="flex sm:hidden items-center">
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
        title="Menu Utama PMB"
      >
        <div className="flex flex-col gap-6 py-2">
          <nav aria-label="Navigasi Mobile" className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                    isActive
                      ? "bg-biru-100 font-semibold text-biru-950"
                      : "text-biru-800 hover:bg-biru-50 hover:text-biru-950"
                  }`}
                >
                  <span>{link.label}</span>
                  <ArrowRight className="h-4 w-4 text-biru-500" />
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-biru-100 pt-4 flex flex-col gap-3">
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

          <div className="mt-4 rounded-xl border border-biru-200 bg-biru-50 p-4 text-xs text-biru-800">
            <p className="font-semibold text-biru-950">Layanan Informasi PMB</p>
            <p className="mt-1">Senin - Jumat: 08.00 - 16.00 WIB</p>
            <p className="mt-1 font-medium text-biru-700">
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
      <footer className="border-t border-biru-200 bg-biru-50 pt-12 pb-8 text-biru-800">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:gap-12">
            {/* Col 1: Campus Identity */}
            <div className="md:col-span-1 space-y-4">
              <img
                src={logoSvg}
                alt="Logo Universitas Pignatelli Triputra"
                className="h-10 w-auto object-contain"
              />
              <p className="text-sm leading-relaxed text-biru-700">
                Lembaga pendidikan tinggi unggul berlandaskan integritas,
                inovasi, dan kepemimpinan transformatif demi masa depan bangsa.
              </p>
            </div>

            {/* Col 2: Jalur Masuk */}
            <div className="space-y-3">
              <h4 className="font-serif text-base font-semibold text-biru-950">
                Jalur Seleksi
              </h4>
              <ul className="space-y-2 text-sm text-biru-700">
                <li>
                  <Link
                    to="/jalur-masuk#prestasi"
                    className="hover:text-biru-950 hover:underline"
                  >
                    Jalur Prestasi Unggul
                  </Link>
                </li>
                <li>
                  <Link
                    to="/jalur-masuk#reguler"
                    className="hover:text-biru-950 hover:underline"
                  >
                    Jalur Reguler / Ujian Mandiri
                  </Link>
                </li>
                <li>
                  <Link
                    to="/jalur-masuk#beasiswa"
                    className="hover:text-biru-950 hover:underline"
                  >
                    Program Beasiswa Triputra
                  </Link>
                </li>
                <li>
                  <Link
                    to="/jalur-masuk#alih-jenjang"
                    className="hover:text-biru-950 hover:underline"
                  >
                    Jalur Alih Jenjang & Transfer
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Layanan & Informasi */}
            <div className="space-y-3">
              <h4 className="font-serif text-base font-semibold text-biru-950">
                Informasi & Bantuan
              </h4>
              <ul className="space-y-2 text-sm text-biru-700">
                <li>
                  <Link
                    to="/biaya"
                    className="hover:text-biru-950 hover:underline"
                  >
                    Biaya Kuliah & Simulasi
                  </Link>
                </li>
                <li>
                  <Link
                    to="/jadwal"
                    className="hover:text-biru-950 hover:underline"
                  >
                    Jadwal & Batas Pendaftaran
                  </Link>
                </li>
                <li>
                  <Link
                    to="/panduan"
                    className="hover:text-biru-950 hover:underline"
                  >
                    Buku Panduan Pendaftaran
                  </Link>
                </li>
                <li>
                  <Link
                    to="/faq"
                    className="hover:text-biru-950 hover:underline"
                  >
                    Tanya Jawab (FAQ)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Kontak Sekretariat PMB */}
            <div className="space-y-3">
              <h4 className="font-serif text-base font-semibold text-biru-950">
                Sekretariat PMB
              </h4>
              <div className="space-y-2 text-sm text-biru-700">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 text-biru-600 mt-0.5" />
                  <span>
                    Jl. Affandi No. 12, Gejayan, Sleman, D.I. Yogyakarta 55281
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-biru-600" />
                  <span>(0274) 888-999 / +62 812-3456-7890</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-biru-600" />
                  <span>pmb@pignatelli.ac.id</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Disclaimer */}
          <div className="mt-12 border-t border-biru-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-biru-600">
            <p>
              &copy; {CURRENT_YEAR} Universitas Pignatelli Triputra. Hak Cipta
              Dilindungi Undang-Undang.
            </p>
            <div className="flex items-center gap-6 text-biru-700">
              <Link
                to="/kebijakan-privasi"
                className="hover:text-biru-950 hover:underline"
              >
                Kebijakan Privasi
              </Link>
              <Link
                to="/syarat-ketentuan"
                className="hover:text-biru-950 hover:underline"
              >
                Syarat & Ketentuan
              </Link>
              {import.meta.env.DEV && (
                <Link
                  to="/styleguide"
                  className="inline-flex items-center gap-1 font-semibold text-biru-600 hover:text-biru-950 hover:underline"
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
