import * as React from "react";
import { Link, Outlet } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Award, BookOpen } from "lucide-react";
import { Logo } from "../ui/Logo";

interface AuthLayoutProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div className="flex min-h-screen bg-putih text-biru-950 font-sans selection:bg-biru-100 selection:text-biru-950">
      {/* Left Branding & Testimonial Column (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-biru-950 via-biru-900 to-biru-800 p-12 text-putih relative overflow-hidden">
        {/* Subtle decorative background pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, var(--color-biru-200) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
          aria-hidden="true"
        />

        {/* Ambient radial glow */}
        <div
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-biru-600/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-biru-500/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Branding */}
        <div className="relative z-10">
          <Link to="/" className="inline-block">
            <Logo theme="dark" height={52} />
          </Link>
        </div>

        {/* Center Quote & Value Statement */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-biru-700/80 bg-biru-900/60 px-4 py-1.5 text-xs font-medium text-biru-200 backdrop-blur-sm">
            <Award className="h-3.5 w-3.5 text-biru-400" />
            <span>Pendidikan Tinggi Unggul & Terakreditasi</span>
          </div>

          <h1 className="font-serif text-3xl font-bold leading-tight tracking-wide text-putih xl:text-4xl">
            "Membentuk Pemimpin Berintegritas, Inovatif, dan Berdaya Saing
            Global."
          </h1>

          <p className="text-sm leading-relaxed text-biru-200">
            Bergabunglah bersama ribuan mahasiswa Universitas Pignatelli
            Triputra dalam lingkungan akademik berstandar internasional dengan
            fasilitas modern dan kurikulum berbasis industri.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-biru-800/80 text-xs text-biru-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-biru-400 shrink-0" />
              <span>Beasiswa Penuh & Parsial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-biru-400 shrink-0" />
              <span>Kemitraan Industri Triputra Group</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-biru-400 shrink-0" />
              <span>Dosen Praktisi & Akademisi Pakar</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-biru-400 shrink-0" />
              <span>Sertifikasi Kompetensi Global</span>
            </div>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 flex items-center justify-between text-xs text-biru-200">
          <span>Sistem PMB Terpadu UPT &copy; 2026</span>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-biru-400" />
            <span>Portal Calon Mahasiswa</span>
          </div>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Back link */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-biru-700 hover:text-biru-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500 rounded-lg px-1 py-0.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Beranda</span>
            </Link>
          </div>

          {/* Mobile branding header */}
          <div className="lg:hidden mb-6">
            <Link to="/" className="inline-block">
              <Logo height={44} />
            </Link>
          </div>

          {/* Heading */}
          {(title || subtitle) && (
            <div className="mb-8">
              {title && (
                <h2 className="font-serif text-2xl font-bold tracking-tight text-biru-950 sm:text-3xl">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-2 text-sm text-biru-700">{subtitle}</p>
              )}
            </div>
          )}

          {/* Slot for form */}
          <div>{children ?? <Outlet />}</div>
        </div>
      </div>
    </div>
  );
};
