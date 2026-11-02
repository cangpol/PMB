import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileCheck,
  ShieldCheck,
} from "lucide-react";
import { Button, Card } from "../../components/common";
import { getProdiList, formatRupiah } from "../../services/prodi";
import { SeoHead } from "../../components/common/SeoHead";

export const BiayaJalurPage: React.FC = () => {
  // Query program studi untuk tabel biaya UKT transparan
  const { data: prodiList = [], isLoading: isProdiLoading } = useQuery({
    queryKey: ["public-prodi-list"],
    queryFn: getProdiList,
  });

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
        "Peluang memilih 2 program studi prioritas",
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
    <div className="bg-putih flex flex-col min-h-screen">
      <SeoHead
        title="Biaya Kuliah & Jalur Masuk - PMB Universitas Pignatelli Triputra"
        description="Transparansi skema biaya kuliah UKT flat per semester bebas uang gedung dan informasi jalur seleksi PMB Universitas Pignatelli Triputra."
      />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biru-100 text-biru-900 text-xs font-semibold">
            <CreditCard className="w-4 h-4 text-biru-700" />
            <span>Skema Biaya Transparan & Jalur Seleksi</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-biru-950">
            Pilihan Jalur Masuk & Biaya Kuliah
          </h1>
          <p className="text-sm sm:text-base text-biru-800 leading-relaxed font-normal">
            Universitas Pignatelli Triputra berkomitmen menyediakan pendidikan
            tinggi berkualitas yang inklusif, terjangkau, dan didukung penuh
            oleh program beasiswa kemitraan industri Triputra Group.
          </p>
        </div>

        {/* Data List Jalur Seleksi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {jalurList.map((jalur) => (
            <Card
              key={jalur.id}
              className="flex flex-col justify-between hover:border-biru-400 transition-all hover:shadow-soft-md"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-biru-100">
                  <div>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-biru-950">
                      {jalur.nama}
                    </h3>
                    <span className="text-xs text-biru-700 font-semibold">
                      {jalur.badge}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-biru-700 block">
                      Biaya Formulir
                    </span>
                    <span className="font-sans text-xl font-bold text-biru-950 tabular-nums">
                      {jalur.biayaFormulir === 0
                        ? "Gratis (Rp 0)"
                        : `Rp ${jalur.biayaFormulir.toLocaleString("id-ID")}`}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-biru-900/80 leading-relaxed font-sans">
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
                    className="w-full gap-2 font-bold"
                  >
                    <span>Daftar Lewat Jalur Ini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>

        {/* Tabel Komponen UKT Standar Seluruh 10 Prodi */}
        <div className="pt-8 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="font-serif text-3xl font-bold text-biru-950">
              Transparansi Uang Kuliah Tunggal (UKT)
            </h2>
            <p className="text-xs sm:text-sm text-biru-800">
              Biaya kuliah flat per semester tanpa uang pangkal/gedung
              tersembunyi. Termasuk biaya ujian, praktikum lab industri, dan
              akses fasilitas digital kampus.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-biru-200 bg-putih shadow-soft-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-biru-950 text-putih">
                  <th className="py-3.5 px-4 font-bold">Program Studi</th>
                  <th className="py-3.5 px-4 font-bold">Jenjang</th>
                  <th className="py-3.5 px-4 font-bold">Fakultas</th>
                  <th className="py-3.5 px-4 font-bold text-right">
                    Uang Gedung (SPI)
                  </th>
                  <th className="py-3.5 px-4 font-bold text-right">
                    UKT per Semester
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-biru-100 text-biru-950 font-sans">
                {isProdiLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-biru-700">
                      Memuat data biaya resmi program studi...
                    </td>
                  </tr>
                ) : prodiList.length > 0 ? (
                  prodiList.map((prodi) => (
                    <tr
                      key={prodi.id}
                      className="hover:bg-biru-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-biru-950">
                        <Link
                          to={`/program-studi/${prodi.slug || prodi.id}`}
                          className="hover:text-biru-700 hover:underline"
                        >
                          {prodi.jenjang} {prodi.nama_prodi}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-biru-800">
                        {prodi.jenjang === "D3"
                          ? "Diploma 3 (6 Smt)"
                          : "Sarjana (8 Smt)"}
                      </td>
                      <td className="py-3.5 px-4 text-biru-700">
                        {prodi.fakultas}
                      </td>
                      <td className="py-3.5 px-4 text-right text-biru-700 font-semibold tabular-nums">
                        Rp 0 (Bebas Uang Gedung)
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-biru-950 tabular-nums">
                        {prodi.biaya_ukt_min
                          ? formatRupiah(prodi.biaya_ukt_min)
                          : "Segera diumumkan"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-biru-700">
                      Data biaya program studi sedang dipersiapkan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-2xl bg-biru-50 border border-biru-200 text-xs text-biru-800 flex items-start sm:items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-biru-600 shrink-0 mt-0.5 sm:mt-0" />
            <p>
              Tersedia fasilitas cicilan UKT hingga 3 kali per semester tanpa
              bunga, serta beasiswa penuh hingga 100% untuk calon mahasiswa
              berprestasi.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
