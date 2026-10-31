import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileCheck,
} from "lucide-react";
import {
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";

export const BiayaJalurPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const jalurList = [
    {
      id: "reguler",
      nama: "Jalur Reguler (Tes CBT & Rapor)",
      biayaFormulir: 250000,
      badge: "Dibuka",
      deskripsi:
        "Jalur umum terbuka untuk seluruh lulusan SMA/SMK/MA sederajat dengan seleksi berbasis Computer-Based Test (CBT) dan evaluasi nilai rapor semester 1-5.",
      keuntungan: [
        "Terbuka untuk semua jurusan sekolah menengah",
        "Peluang memilih 2 program studi",
        "Bisa menggunakan voucher promo gelombang",
      ],
      syarat: [
        "Scan Ijazah / SKL / Surat Keterangan Siswa Kelas 12",
        "Scan Nilai Rapor Semester 1-5",
        "Pasfoto formal berwarna latar biru/putih",
      ],
    },
    {
      id: "prestasi",
      nama: "Jalur Prestasi Akademik & Bakat",
      biayaFormulir: 150000,
      badge: "Bebas Tes CBT",
      deskripsi:
        "Dikhususkan bagi siswa dengan peringkat 10 besar kelas atau peraih medali kejuaraan sains, olahraga, seni, dan kepemimpinan minimal tingkat kota/kabupaten.",
      keuntungan: [
        "Bebas ujian Computer-Based Test (CBT)",
        "Potongan biaya formulir Rp 100.000",
        "Prioritas beasiswa potongan UKT semester 1 hingga 50%",
      ],
      syarat: [
        "Sertifikat / Piagam Kejuaraan minimal Tingkat Kota/Kabupaten",
        "Rapor Semester 1-5 rata-rata minimal 80.0",
        "Surat Rekomendasi Kepala Sekolah",
      ],
    },
    {
      id: "kemitraan",
      nama: "Jalur Kemitraan Triputra Group",
      biayaFormulir: 200000,
      badge: "Prioritas Ikatan Kerja",
      deskripsi:
        "Jalur khusus kerja sama strategis dengan Triputra Group, diperuntukkan bagi putra-putri karyawan atau lulusan SMK/SMA binaan Triputra.",
      keuntungan: [
        "Prioritas penempatan magang kerja di entitas Triputra Group",
        "Mentorship langsung dari praktisi industri senior Triputra",
        "Kesempatan ikatan dinas dan percepatan karier setelah lulus",
      ],
      syarat: [
        "Surat Pengantar / Bukti Karyawan Triputra atau SMK Binaan",
        "Rapor Semester 1-5",
        "Tes wawancara kesiapan kerja",
      ],
    },
    {
      id: "beasiswa",
      nama: "Jalur Beasiswa Penuh Yayasan Pignatelli",
      biayaFormulir: 0,
      badge: "Gratis 100%",
      deskripsi:
        "Bantuan pembiayaan pendidikan penuh 100% (bebas UKT selama masa studi normal) untuk calon mahasiswa berprestasi unggul dari keluarga prasejahtera.",
      keuntungan: [
        "Bebas biaya formulir pendaftaran 100%",
        "Bebas biaya kuliah UKT semester 1 sampai 8",
        "Bantuan biaya pembinaan soft skills & sertifikasi industri",
      ],
      syarat: [
        "Surat Keterangan Tidak Mampu (SKTM) / KIP Kuliah",
        "Nilai Rapor rata-rata minimal 85.0",
        "Lolos verifikasi faktual lapangan panitia",
      ],
    },
  ];

  return (
    <div className="bg-biru-50/30 flex flex-col">
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biru-100 text-biru-900 text-xs font-semibold">
            <CreditCard className="w-4 h-4 text-biru-700" />
            <span>Skema Biaya Transparan & Jalur Seleksi</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-biru-950">
            Pilihan Jalur Masuk & Biaya Kuliah
          </h1>
          <p className="text-base text-biru-800/90 leading-relaxed font-light">
            Universitas Pignatelli Triputra berkomitmen menyediakan pendidikan
            tinggi berkualitas yang inklusif, terjangkau, dan didukung penuh
            oleh program beasiswa industri.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && (
          <ErrorState
            title="Gagal Memuat Informasi Jalur"
            message="Terjadi gangguan saat memuat informasi rincian biaya jalur pendaftaran."
            onRetry={() => {
              setIsError(false);
              setIsLoading(false);
            }}
          />
        )}

        {/* Empty State */}
        {!isLoading && !isError && jalurList.length === 0 && (
          <EmptyState
            title="Jalur Pendaftaran Belum Dibuka"
            description="Saat ini belum ada periode jalur pendaftaran yang aktif dibuka."
          />
        )}

        {/* Data List Jalur */}
        {!isLoading && !isError && jalurList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {jalurList.map((jalur) => (
              <Card
                key={jalur.id}
                className="flex flex-col justify-between hover:border-biru-600 transition-all hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-biru-100">
                    <div>
                      <h3 className="font-serif text-xl sm:text-2xl font-bold text-biru-950">
                        {jalur.nama}
                      </h3>
                      <span className="text-xs text-biru-800 font-medium">
                        {jalur.badge}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-biru-800 block">
                        Biaya Formulir
                      </span>
                      <span className="font-mono text-xl font-bold text-biru-950">
                        {jalur.biayaFormulir === 0
                          ? "Gratis (Rp 0)"
                          : `Rp ${jalur.biayaFormulir.toLocaleString("id-ID")}`}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-biru-900/80 leading-relaxed font-light">
                    {jalur.deskripsi}
                  </p>

                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-biru-950 block flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-biru-700" />
                      Keuntungan & Fasilitas Jalur:
                    </span>
                    <ul className="space-y-1.5">
                      {jalur.keuntungan.map((untung, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-biru-900"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-biru-700 flex-shrink-0 mt-0.5" />
                          <span>{untung}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-biru-100">
                    <span className="text-xs font-bold text-biru-950 block flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-biru-700" />
                      Persyaratan Dokumen:
                    </span>
                    <ul className="space-y-1 text-xs text-biru-800 list-disc list-inside">
                      {jalur.syarat.map((syarat, i) => (
                        <li key={i}>{syarat}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-biru-100">
                  <Link to="/register">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full gap-2"
                    >
                      <span>Daftar Lewat Jalur Ini</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Tabel Komponen UKT Standar */}
        <div className="pt-6 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="font-serif text-3xl font-bold text-biru-950">
              Transparansi Uang Kuliah Tunggal (UKT)
            </h2>
            <p className="text-xs text-biru-800">
              Biaya kuliah flat per semester tanpa uang pangkal/gedung
              tersembunyi. Termasuk biaya ujian, praktikum lab, dan akses
              perpustakaan digital.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-biru-200 bg-putih shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-biru-900 text-putih">
                  <th className="py-3 px-4 font-bold">Program Studi</th>
                  <th className="py-3 px-4 font-bold">Jenjang</th>
                  <th className="py-3 px-4 font-bold text-right">
                    Uang Gedung (SPI)
                  </th>
                  <th className="py-3 px-4 font-bold text-right">
                    UKT per Semester
                  </th>
                  <th className="py-3 px-4 font-bold">Keterangan Fasilitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-biru-100 text-biru-950">
                <tr className="hover:bg-biru-50/50">
                  <td className="py-3 px-4 font-bold">S1 Sistem Informasi</td>
                  <td className="py-3 px-4">Sarjana (8 Smt)</td>
                  <td className="py-3 px-4 text-right font-mono text-biru-700 font-bold">
                    Rp 0 (Bebas Uang Gedung)
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    Rp 6.500.000
                  </td>
                  <td className="py-3 px-4 text-biru-800">
                    Termasuk Lisensi Enterprise ERP & Cloud Lab
                  </td>
                </tr>
                <tr className="hover:bg-biru-50/50">
                  <td className="py-3 px-4 font-bold">S1 Informatika</td>
                  <td className="py-3 px-4">Sarjana (8 Smt)</td>
                  <td className="py-3 px-4 text-right font-mono text-biru-700 font-bold">
                    Rp 0 (Bebas Uang Gedung)
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    Rp 7.000.000
                  </td>
                  <td className="py-3 px-4 text-biru-800">
                    Termasuk Akses Server GPU AI & Cybersecurity Lab
                  </td>
                </tr>
                <tr className="hover:bg-biru-50/50">
                  <td className="py-3 px-4 font-bold">
                    S1 Akuntansi Bisnis Digital
                  </td>
                  <td className="py-3 px-4">Sarjana (8 Smt)</td>
                  <td className="py-3 px-4 text-right font-mono text-biru-700 font-bold">
                    Rp 0 (Bebas Uang Gedung)
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    Rp 6.000.000
                  </td>
                  <td className="py-3 px-4 text-biru-800">
                    Termasuk Software Audit Forensik & Sertifikasi Accurate
                  </td>
                </tr>
                <tr className="hover:bg-biru-50/50">
                  <td className="py-3 px-4 font-bold">
                    D3 Manajemen Pemasaran Digital
                  </td>
                  <td className="py-3 px-4">Diploma 3 (6 Smt)</td>
                  <td className="py-3 px-4 text-right font-mono text-biru-700 font-bold">
                    Rp 0 (Bebas Uang Gedung)
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    Rp 5.000.000
                  </td>
                  <td className="py-3 px-4 text-biru-800">
                    Termasuk Magang Industri Terjamin di Triputra Group
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
