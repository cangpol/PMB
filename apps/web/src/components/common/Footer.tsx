import React from "react";
import { Mail, Phone, MapPin, Award, CheckCircle2 } from "lucide-react";
import logoPlaceholder from "../../assets/logo-placeholder.svg";

const CURRENT_YEAR = 2026;

export const Footer: React.FC = () => {
  return (
    <footer className="bg-biru-950 text-biru-100 border-t border-biru-900 mt-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Kolom Profil Kampus */}
          <div className="md:col-span-5 space-y-4">
            <img
              src={logoPlaceholder}
              alt="Logo Universitas Pignatelli Triputra"
              className="h-12 w-auto object-contain"
            />
            <p className="text-sm text-biru-200 leading-relaxed max-w-sm">
              Universitas Pignatelli Triputra menyelenggarakan pendidikan tinggi
              berkualitas berstandar industri melalui sinergi Triputra Group,
              berfokus pada keunggulan kompetensi, integritas, dan daya saing
              global.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-biru-900 text-biru-100 text-xs border border-biru-800">
              <Award className="w-4 h-4 text-biru-500" />
              <span>Terakreditasi BAN-PT & Kemitraan Industri Triputra</span>
            </div>
          </div>

          {/* Kolom Program Studi */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-serif text-lg font-bold text-putih">
              Fakultas & Program Studi
            </h4>
            <ul className="space-y-2 text-sm text-biru-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-biru-500" />
                <span>S1 Informatika</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-biru-500" />
                <span>S1 Sistem Informasi</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-biru-500" />
                <span>S1 Manajemen Bisnis</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-biru-500" />
                <span>S1 Akuntansi</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-biru-500" />
                <span>D3 Manajemen Informatika</span>
              </li>
            </ul>
          </div>

          {/* Kolom Kontak & Layanan PMB */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="font-serif text-lg font-bold text-putih">
              Sekretariat PMB
            </h4>
            <div className="space-y-2.5 text-sm text-biru-200">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-biru-500 shrink-0 mt-0.5" />
                <span>
                  Jl. Duwet No. 1, Karangasem, Laweyan, Surakarta, Jawa Tengah
                  57145
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-biru-500 shrink-0" />
                <span>(0271) 714-877 / +62 812-3456-7890</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-biru-500 shrink-0" />
                <span>pmb@upignatelli.ac.id</span>
              </div>
            </div>
          </div>
        </div>

        {/* Baris Hak Cipta */}
        <div className="border-t border-biru-900 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-biru-200 gap-4">
          <p>
            © {CURRENT_YEAR} Universitas Pignatelli Triputra. Hak Cipta
            Dilindungi Undang-Undang.
          </p>
          <p className="text-biru-100 font-medium">
            Sistem Penerimaan Mahasiswa Baru (PMB) v1.0.0
          </p>
        </div>
      </div>
    </footer>
  );
};
