import React, { useState } from "react";
import { Printer } from "lucide-react";
import {
  Button,
  StatusBadge,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";
import { useAuth } from "@/context";
import logoPlaceholder from "../../assets/logo-placeholder.svg";

export const HasilKelulusanPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const kelulusan = {
    nomorPendaftaran: "PMB-2026-0042",
    status: "LULUS_PILIHAN_1",
    namaProdi: "Informatika",
    jenjang: "S1",
    fakultas: "Fakultas Sains & Teknologi",
    skorAkhir: 85.0,
    nimResmi: "2601020042",
    nomorLoa: "SK/PMB-UPT/2026/0042",
    tanggalSk: "31 Oktober 2026",
    uktNominal: 7000000,
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-200">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Pengumuman Kelulusan & Surat Penerimaan Resmi
          </h1>
          <p className="text-xs text-biru-800">
            Surat Keputusan Rektor Penerimaan Mahasiswa Baru Universitas
            Pignatelli Triputra
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status="berhasil" label="Status: Lulus Pilihan 1" />
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs"
          >
            <Printer className="w-3.5 h-3.5 text-biru-700" />
            <span>Cetak SK / LoA</span>
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <ErrorState
          title="Gagal Memuat Hasil Kelulusan"
          message="Terjadi kesalahan jaringan saat memverifikasi status kelulusan Anda."
          onRetry={() => {
            setIsError(false);
            setIsLoading(false);
          }}
        />
      )}

      {/* Empty State */}
      {!isLoading && !isError && !kelulusan.nomorLoa && (
        <EmptyState
          title="Pengumuman Belum Dirilis"
          description="Rapat pleno kelulusan gelombang ini belum selesai. Pengumuman resmi akan diumumkan sesuai jadwal kalender akademik PMB."
        />
      )}

      {/* Dokumen Fisik Letter of Acceptance (LoA) */}
      {!isLoading && !isError && kelulusan.nomorLoa && (
        <div className="bg-putih border-2 border-biru-300 rounded-3xl p-8 sm:p-12 shadow-xl space-y-8 print:border-none print:shadow-none print:p-0">
          {/* KOP Surat Resmi Universitas */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b-2 border-biru-950 text-center sm:text-left">
            <div className="flex items-center gap-4">
              <img
                src={logoPlaceholder}
                alt="Logo Universitas Pignatelli Triputra"
                className="h-16 w-auto object-contain"
              />
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-biru-950 uppercase tracking-wide">
                  Universitas Pignatelli Triputra
                </h2>
                <p className="text-xs text-biru-800 font-medium">
                  Panitia Penerimaan Mahasiswa Baru TA 2026/2027
                </p>
                <p className="text-[11px] text-biru-700 font-light">
                  Jl. Sam Ratulangi No. 16, Surakarta, Jawa Tengah •
                  pmb.pignatellitriputra.ac.id
                </p>
              </div>
            </div>
            <div className="text-right sm:border-l-2 sm:border-biru-200 sm:pl-6">
              <span className="text-[11px] font-bold text-biru-800 block uppercase">
                Nomor SK / LoA
              </span>
              <span className="font-mono text-xs font-bold text-biru-950 block">
                {kelulusan.nomorLoa}
              </span>
              <span className="text-[11px] text-biru-700 block mt-1">
                {kelulusan.tanggalSk}
              </span>
            </div>
          </div>

          {/* Pernyataan Kelulusan */}
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-biru-50/80 border border-biru-200 text-center space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-biru-800">
                Keputusan Yudisium Seleksi Masuk
              </span>
              <p className="font-serif text-3xl font-bold text-biru-950">
                DINYATAKAN DITERIMA / LULUS SELEKSI
              </p>
              <p className="text-xs text-biru-900 font-medium">
                Sebagai Calon Mahasiswa Baru Program Sarjana (S1) Angkatan 2026
              </p>
            </div>

            <p className="text-sm text-biru-900 leading-relaxed font-light pt-2">
              Berdasarkan hasil evaluasi dokumen akademik, nilai rapor, dan
              pencapaian ujian Computer-Based Test (CBT) yang dilaksanakan
              secara daring, Rektor Universitas Pignatelli Triputra menerbitkan
              Surat Keputusan Penerimaan resmi kepada:
            </p>

            {/* Rincian Identitas Mahasiswa Baru */}
            <div className="p-6 rounded-2xl bg-putih border border-biru-200 space-y-3 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1.5 border-b border-biru-100">
                <span className="text-biru-800 font-medium">Nama Lengkap</span>
                <span className="sm:col-span-2 font-bold text-biru-950">
                  {user?.nama_lengkap || "Budi Santoso"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1.5 border-b border-biru-100">
                <span className="text-biru-800 font-medium">
                  Nomor Pendaftaran PMB
                </span>
                <span className="sm:col-span-2 font-mono font-bold text-biru-950">
                  {kelulusan.nomorPendaftaran}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1.5 border-b border-biru-100">
                <span className="text-biru-800 font-medium">
                  Program Studi Diterima
                </span>
                <span className="sm:col-span-2 font-bold text-biru-950">
                  {kelulusan.jenjang} {kelulusan.namaProdi} (
                  {kelulusan.fakultas})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1.5 border-b border-biru-100">
                <span className="text-biru-800 font-medium">
                  Nomor Induk Mahasiswa (NIM) Resmi
                </span>
                <span className="sm:col-span-2 font-mono text-base font-bold text-biru-700">
                  {kelulusan.nimResmi}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1.5 border-b border-biru-100">
                <span className="text-biru-800 font-medium">
                  Skor Evaluasi Akhir
                </span>
                <span className="sm:col-span-2 font-mono font-bold text-biru-950">
                  {kelulusan.skorAkhir.toFixed(1)} / 100.0
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1.5">
                <span className="text-biru-800 font-medium">
                  Biaya UKT Semester 1
                </span>
                <span className="sm:col-span-2 font-mono font-bold text-biru-950">
                  Rp {kelulusan.uktNominal.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          {/* Ketentuan Daftar Ulang */}
          <div className="p-5 rounded-2xl bg-biru-50/60 border border-biru-200 text-xs text-biru-900 space-y-2">
            <span className="font-bold text-biru-950 block">
              Instruksi Registrasi Ulang:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-biru-800 leading-relaxed">
              <li>
                Lakukan pelunasan UKT Semester 1 paling lambat 14 hari kerja
                setelah surat ini diterbitkan.
              </li>
              <li>
                Bawa cetakan SK / Letter of Acceptance (LoA) ini beserta berkas
                fisik asli pada saat orientasi kampus.
              </li>
              <li>
                Akun Sistem Informasi Akademik (SIAKAD) mahasiswa akan aktif
                setelah pembayaran UKT terverifikasi.
              </li>
            </ol>
          </div>

          {/* Tanda Tangan Rektor */}
          <div className="pt-8 flex justify-between items-end text-xs">
            <div className="space-y-1 text-biru-700">
              <p className="font-mono text-[10px]">
                Dokumen ini sah dan diterbitkan secara elektronik.
              </p>
              <p className="font-mono text-[10px]">
                Verifikasi keaslian via pmb.pignatellitriputra.ac.id/verifikasi
              </p>
            </div>
            <div className="text-center space-y-1 sm:pr-8">
              <p className="text-biru-800">Surakarta, {kelulusan.tanggalSk}</p>
              <p className="font-bold text-biru-950">
                Rektor Universitas Pignatelli Triputra,
              </p>
              <div className="h-16 flex items-center justify-center">
                <span className="font-serif italic text-biru-600 font-bold text-lg">
                  [Tanda Tangan Digital Terverifikasi]
                </span>
              </div>
              <p className="font-bold text-biru-950 underline underline-offset-4">
                Dr. Yohanes Sudarsono, M.Kom.
              </p>
              <p className="text-[11px] text-biru-800 font-mono">
                NIDN: 0612087501
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
