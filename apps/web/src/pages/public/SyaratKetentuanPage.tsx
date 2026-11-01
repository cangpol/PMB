import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card, CardSkeleton } from "../../components/common";
import { SeoHead } from "../../components/common/SeoHead";
import type { components } from "../../types/api";

type CmsPage = components["schemas"]["CmsPageResponse"];

const FALLBACK_KONTEN = `<h2>1. Ketentuan Umum Calon Mahasiswa</h2>
<p>Seluruh calon mahasiswa yang mendaftarkan diri pada sistem Penerimaan Mahasiswa Baru (PMB) Universitas Pignatelli Triputra diwajibkan memberikan data diri dan dokumen resmi yang sah, benar, dan dapat dipertanggungjawabkan di hadapan hukum Republik Indonesia.</p>

<h2>2. Pembayaran Formulir & Registrasi Ulang</h2>
<p>Biaya formulir pendaftaran yang telah dibayarkan melalui kanal pembayaran resmi (Virtual Account Bank atau QRIS) tidak dapat ditarik kembali (non-refundable) dengan alasan apapun, kecuali terdapat pembatalan penyelenggaraan program studi oleh pihak universitas.</p>

<h2>3. Pelaksanaan Ujian CBT Online</h2>
<p>Peserta ujian CBT mandiri wajib mematuhi seluruh tata tertib integritas akademik. Segala bentuk kecurangan, perjokian, penggunaan bantuan pihak ketiga, atau perekaman soal ujian tanpa hak akan mengakibatkan diskualifikasi seketika.</p>

<h2>4. Penetapan Kelulusan & Penerbitan NIM</h2>
<p>Keputusan sidang penetapan kelulusan calon mahasiswa oleh Rektor dan Panitia PMB bersifat final dan mengikat. Penerbitan Nomor Induk Mahasiswa (NIM) resmi dilakukan setelah seluruh tagihan registrasi diselesaikan dan dokumen fisik diverifikasi.</p>`;

export const SyaratKetentuanPage: React.FC = () => {
  const { data: pageData, isLoading } = useQuery<CmsPage>({
    queryKey: ["cms-page-syarat-ketentuan"],
    queryFn: async () => {
      const res = await fetch("/api/cms/pages/syarat-ketentuan");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const judul = pageData?.judul || "Syarat & Ketentuan Pendaftaran PMB";
  const konten = pageData?.konten || FALLBACK_KONTEN;

  return (
    <div className="space-y-12 pb-20">
      <SeoHead
        title={judul}
        description="Syarat dan ketentuan resmi pendaftaran mahasiswa baru Universitas Pignatelli Triputra."
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
            Terakhir diperbarui: 1 November 2026 &bull; Sekretariat Rektorat
            UPITRA
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
