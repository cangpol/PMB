import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card, CardSkeleton } from "../../components/common";
import { SeoHead } from "../../components/common/SeoHead";
import type { components } from "../../types/api";

type CmsPage = components["schemas"]["CmsPageResponse"];

const FALLBACK_KONTEN = `<h2>1. Komitmen Perlindungan Privasi</h2>
<p>Universitas Pignatelli Triputra berkomitmen penuh untuk melindungi kerahasiaan dan keamanan data pribadi calon mahasiswa, orang tua/wali, serta civitas akademika sesuai dengan Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022).</p>

<h2>2. Jenis Data Pribadi yang Dikumpulkan</h2>
<p>Data pribadi yang dikumpulkan melalui formulir PMB daring mencakup: Nama lengkap, Nomor Induk Kependudukan (NIK), alamat tempat tinggal, nomor telepon/WhatsApp, alamat surat elektronik (email), riwayat pendidikan, nilai rapor/ijazah, serta berkas foto/dokumen identitas.</p>

<h2>3. Tujuan Penggunaan Data</h2>
<p>Data pribadi Anda hanya digunakan untuk keperluan administrasi seleksi penerimaan mahasiswa baru, verifikasi keaslian dokumen, penagihan biaya pendidikan, pelaporan resmi ke Pangkalan Data Pendidikan Tinggi (PDDikti Kemendikbudristek), serta komunikasi resmi terkait status akademik.</p>

<h2>4. Keamanan & Penyimpanan Data</h2>
<p>Seluruh dokumen dan kata sandi disimpan menggunakan enkripsi tingkat tinggi (Argon2id dan AWS SigV4 encrypted storage). Kami tidak pernah menjual atau membagikan data pribadi Anda kepada pihak ketiga di luar kemitraan resmi beasiswa Triputra Group.</p>`;

export const KebijakanPrivasiPage: React.FC = () => {
  const { data: pageData, isLoading } = useQuery<CmsPage>({
    queryKey: ["cms-page-kebijakan-privasi"],
    queryFn: async () => {
      const res = await fetch("/api/cms/pages/kebijakan-privasi");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const judul = pageData?.judul || "Kebijakan Privasi & Perlindungan Data";
  const konten = pageData?.konten || FALLBACK_KONTEN;

  return (
    <div className="space-y-12 pb-20">
      <SeoHead
        title={judul}
        description="Kebijakan privasi dan perlindungan data pribadi calon mahasiswa Universitas Pignatelli Triputra."
      />

      <section className="bg-gradient-to-br from-biru-950 via-biru-900 to-biru-800 text-putih py-14 border-b border-biru-800">
        <div className="max-w-[850px] mx-auto px-4 sm:px-6 space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-biru-300 hover:text-putih transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-putih">
            {judul}
          </h1>
          <p className="text-xs sm:text-sm text-biru-200">
            Kepatuhan UU Perlindungan Data Pribadi (UU PDP No. 27/2022) &bull;
            UPITRA Surakarta
          </p>
        </div>
      </section>

      <section className="max-w-[850px] mx-auto px-4 sm:px-6">
        <Card className="p-6 sm:p-10 border-biru-200 shadow-soft-sm space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <CardSkeleton className="h-8 w-1/2" />
              <CardSkeleton className="h-40 w-full" />
            </div>
          ) : (
            <div
              className="prose prose-biru max-w-none text-sm text-biru-900 leading-relaxed font-sans space-y-4"
              dangerouslySetInnerHTML={{ __html: konten }}
            />
          )}
        </Card>
      </section>
    </div>
  );
};
