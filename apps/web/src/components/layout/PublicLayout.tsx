import * as React from "react";
import { Link, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { Button } from "../ui/Button";
import { PublicNavbar } from "./PublicNavbar";

const CURRENT_YEAR = 2026;

interface BannerCms {
  id: string;
  judul: string;
  link_url: string | null;
}

const TEKS_BANNER_BAWAAN =
  "PMB Tahun Akademik 2026/2027 Telah Dibuka Resmi · Beasiswa Unggulan Triputra Group";

/** Teks banner bagian atas: banner aktif pertama dari Kelola Banner (admin); bawaan bila kosong. */
const BannerAtas: React.FC = () => {
  const { data } = useQuery<BannerCms[]>({
    queryKey: ["cms-banner-atas"],
    queryFn: async () => {
      const res = await fetch("/api/cms/banners");
      if (!res.ok) return [];
      return res.json();
    },
  });
  const banner = data?.[0];
  const teks = banner?.judul ?? TEKS_BANNER_BAWAAN;
  const kelas = "font-medium truncate";
  if (banner?.link_url) {
    return banner.link_url.startsWith("/") ? (
      <Link to={banner.link_url} className={`${kelas} hover:text-putih`}>
        {teks}
      </Link>
    ) : (
      <a
        href={banner.link_url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${kelas} hover:text-putih`}
      >
        {teks}
      </a>
    );
  }
  return <span className={kelas}>{teks}</span>;
};

export const PublicLayout: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
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
        <div className="mx-auto flex max-w-[1280px] items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-biru-400 shrink-0" />
            <BannerAtas />
          </div>
          <div className="hidden md:flex items-center gap-6 text-biru-200 shrink-0">
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

      {/* Satu Komponen Navbar Terpadu untuk Seluruh Halaman Publik */}
      <PublicNavbar />

      {/* Main Content Area with bottom padding on mobile for sticky floating action */}
      <main id="main-content" className="flex-1 pb-20 sm:pb-0">
        {children ?? <Outlet />}
      </main>

      {/* Floating Sticky Bottom Bar for Mobile (<640px) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-biru-200/90 bg-putih/95 p-3 backdrop-blur-md sm:hidden shadow-soft-lg">
        <div className="mx-auto flex max-w-[420px] items-center gap-2.5">
          <Link to="/login" className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              Masuk
            </Button>
          </Link>
          <Link to="/register" className="flex-1">
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Daftar Sekarang
            </Button>
          </Link>
        </div>
      </div>

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
