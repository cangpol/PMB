import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, Shield, GraduationCap } from "lucide-react";
import logoPlaceholder from "../../assets/logo-placeholder.svg";

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: "Beranda", path: "/" },
    { label: "Program Studi", path: "/prodi" },
    { label: "Jalur & Biaya", path: "/biaya" },
    { label: "Pengumuman", path: "/pengumuman" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-biru-950 text-putih border-b border-biru-900 shadow-md">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo Brand Institusi */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-biru-500 rounded-lg"
          >
            <img
              src={logoPlaceholder}
              alt="Logo Universitas Pignatelli Triputra"
              className="h-12 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          {/* Navigasi Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? "bg-biru-900 text-putih border border-biru-700"
                    : "text-biru-100 hover:text-putih hover:bg-biru-900/60"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-biru-200 hover:text-putih bg-biru-900/40 hover:bg-biru-900 rounded-xl border border-biru-800 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-biru-500" />
              <span>Portal Admin</span>
            </Link>
            <Link
              to="/portal/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-biru-950 bg-biru-100 hover:bg-putih rounded-xl border border-biru-200 shadow-sm transition-all"
            >
              <User className="w-4 h-4 text-biru-800" />
              <span>Portal Pendaftar</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-biru-200 hover:text-putih hover:bg-biru-900 focus-visible:outline-2 focus-visible:outline-biru-500"
              aria-label="Buka menu navigasi"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-biru-900 bg-biru-950 px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-xl text-base font-medium ${
                isActive(link.path)
                  ? "bg-biru-900 text-putih"
                  : "text-biru-100 hover:bg-biru-900/50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 border-t border-biru-900 flex flex-col gap-2">
            <Link
              to="/portal/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-biru-950 bg-biru-100 rounded-xl"
            >
              <GraduationCap className="w-4 h-4 text-biru-800" />
              <span>Masuk Portal Pendaftar</span>
            </Link>
            <Link
              to="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-biru-200 bg-biru-900 rounded-xl border border-biru-800"
            >
              <Shield className="w-4 h-4 text-biru-500" />
              <span>Portal Staf & Admin</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
