import React from "react";
import { Link } from "react-router-dom";
import { Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button, Card, StatusBadge } from "../../components/common";
import { SeoHead } from "../../components/common/SeoHead";

interface GelombangItem {
  id: string;
  nama: string;
  keterangan: string;
  periodePendaftaran: string;
  periodeUjianCbt: string;
  pengumumanKelulusan: string;
  registrasiUlang: string;
  status: "AKTIF" | "MENDATANG" | "SELESAI";
  keuntungan: string[];
}

const JADWAL_GELOMBANG: GelombangItem[] = [
  {
    id: "gel-1",
    nama: "Gelombang 1 (Early Bird)",
    keterangan:
      "Periode pendaftaran awal dengan fasilitas beasiswa dan potongan DPP terbesar.",
    periodePendaftaran: "1 Mei 2026 – 31 Juli 2026",
    periodeUjianCbt: "Fleksibel Mandiri (Setiap Hari Sabtu)",
    pengumumanKelulusan: "1x24 Jam setelah Sesi CBT",
    registrasiUlang: "1 – 15 Agustus 2026",
    status: "AKTIF",
    keuntungan: [
      "Potongan Dana Pengembangan (DPP) Rp 2.000.000",
      "Prioritas Seleksi Beasiswa Triputra Group 100%",
      "Bebas memilih sesi ujian CBT & jadwal orientasi",
    ],
  },
  {
    id: "gel-2",
    nama: "Gelombang 2 (Reguler)",
    keterangan:
      "Periode seleksi reguler untuk seluruh lulusan SMA/SMK/MA dan pindahan.",
    periodePendaftaran: "1 Agustus 2026 – 31 Agustus 2026",
    periodeUjianCbt: "Setiap Hari Rabu & Sabtu",
    pengumumanKelulusan: "1x24 Jam setelah Sesi CBT",
    registrasiUlang: "1 – 10 September 2026",
    status: "MENDATANG",
    keuntungan: [
      "Potongan Dana Pengembangan (DPP) Rp 1.000.000",
      "Kesempatan beasiswa prestasi rapor s.d. 50% UKT",
      "Keringanan angsuran pembayaran registrasi",
    ],
  },
  {
    id: "gel-3",
    nama: "Gelombang 3 (Penutupan Kuota)",
    keterangan:
      "Periode seleksi akhir untuk pengisian sisa kuota program studi yang masih tersedia.",
    periodePendaftaran: "1 September 2026 – 20 September 2026",
    periodeUjianCbt: "Jadwal On-Demand Khusus",
    pengumumanKelulusan: "Same-Day Announcement",
    registrasiUlang: "21 – 25 September 2026",
    status: "MENDATANG",
    keuntungan: [
      "Proses verifikasi berkas ekspres 1x24 jam",
      "Penerbitan NIM instan setelah registrasi",
      "Masuk ke kelas pembekalan mahasiswa baru langsung",
    ],
  },
];

export const JadwalSeleksiPage: React.FC = () => {
  return (
    <div className="space-y-16 pb-20">
      <SeoHead
        title="Jadwal Seleksi PMB 2026/2027"
        description="Jadwal resmi gelombang pendaftaran, pelaksanaan ujian CBT, sidang kelulusan, dan registrasi ulang mahasiswa baru Universitas Pignatelli Triputra."
      />

      {/* Header Banner */}
      <section className="bg-gradient-to-br from-biru-950 via-biru-900 to-biru-800 text-putih py-16 border-b border-biru-800">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-800 text-biru-200 border border-biru-700">
            Agenda Resmi PMB 2026/2027
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-putih">
            Jadwal Gelombang &amp; Tahapan Seleksi
          </h1>
          <p className="text-sm sm:text-base text-biru-200 max-w-2xl mx-auto font-sans leading-relaxed">
            Perhatikan batas waktu pendaftaran, ujian CBT, dan registrasi ulang
            pada setiap gelombang agar tidak terlewatkan kuota program studi
            pilihan Anda.
          </p>
        </div>
      </section>

      {/* Konten Gelombang */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {JADWAL_GELOMBANG.map((gel) => (
            <Card
              key={gel.id}
              className={`p-6 sm:p-7 flex flex-col justify-between transition-all ${
                gel.status === "AKTIF"
                  ? "border-biru-600 shadow-soft-lg ring-2 ring-biru-500/20 bg-gradient-to-b from-biru-50/50 to-putih"
                  : "border-biru-200 hover:border-biru-300"
              }`}
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-biru-600">
                    {gel.id.toUpperCase()}
                  </span>
                  <StatusBadge
                    status={
                      gel.status === "AKTIF"
                        ? "TERVERIFIKASI"
                        : gel.status === "MENDATANG"
                          ? "MENUNGGU"
                          : "DRAFT"
                    }
                    label={
                      gel.status === "AKTIF"
                        ? "Dibuka Sekarang"
                        : gel.status === "MENDATANG"
                          ? "Segera Dibuka"
                          : "Ditutup"
                    }
                  />
                </div>

                <div>
                  <h2 className="font-serif text-2xl font-bold text-biru-950">
                    {gel.nama}
                  </h2>
                  <p className="text-xs text-biru-700 mt-1 font-sans leading-relaxed">
                    {gel.keterangan}
                  </p>
                </div>

                <div className="space-y-3 text-xs border-y border-biru-100 py-4 font-sans">
                  <div>
                    <span className="text-biru-600 block text-[11px]">
                      Periode Pendaftaran:
                    </span>
                    <strong className="text-biru-950 font-semibold">
                      {gel.periodePendaftaran}
                    </strong>
                  </div>
                  <div>
                    <span className="text-biru-600 block text-[11px]">
                      Ujian Potensi CBT:
                    </span>
                    <strong className="text-biru-950 font-semibold">
                      {gel.periodeUjianCbt}
                    </strong>
                  </div>
                  <div>
                    <span className="text-biru-600 block text-[11px]">
                      Pengumuman Hasil:
                    </span>
                    <strong className="text-biru-950 font-semibold">
                      {gel.pengumumanKelulusan}
                    </strong>
                  </div>
                  <div>
                    <span className="text-biru-600 block text-[11px]">
                      Batas Daftar Ulang &amp; NIM:
                    </span>
                    <strong className="text-biru-950 font-semibold">
                      {gel.registrasiUlang}
                    </strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-biru-900 block">
                    Benefit Gelombang:
                  </span>
                  <ul className="text-xs text-biru-800 space-y-1.5">
                    {gel.keuntungan.map((b, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-biru-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-biru-100">
                {gel.status === "AKTIF" ? (
                  <Link to="/register" className="block">
                    <Button
                      variant="primary"
                      className="w-full text-xs font-bold py-2.5 shadow-soft-sm"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Daftar Gelombang 1 Sekarang
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    disabled
                    className="w-full text-xs opacity-60 cursor-not-allowed"
                  >
                    Pendaftaran Belum Dibuka
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Informasi Tahapan Hari-H Ujian */}
        <Card className="p-6 sm:p-8 border-biru-200 bg-biru-50/50 space-y-4">
          <h3 className="font-serif text-xl font-bold text-biru-950 flex items-center gap-2">
            <Clock className="w-5 h-5 text-biru-700" />
            Ketentuan Pelaksanaan Ujian CBT Mandiri Online
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-biru-800 font-sans leading-relaxed">
            <div className="p-4 rounded-xl bg-putih border border-biru-200 space-y-1">
              <strong className="text-biru-950 block font-bold text-sm">
                1. Perangkat Ujian
              </strong>
              <p>
                Dapat menggunakan Laptop, PC, atau Tablet dengan koneksi
                internet stabil &amp; peramban Chrome/Firefox terbaru.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-putih border border-biru-200 space-y-1">
              <strong className="text-biru-950 block font-bold text-sm">
                2. Pilih Jadwal Saat Mengisi Formulir
              </strong>
              <p>
                Jadwal (sesi) CBT dipilih saat mengisi formulir pendaftaran.
                Ujian dapat diikuti setelah pembayaran formulir disetujui dan
                seluruh berkas diverifikasi admin PMB. Sesi online dikerjakan
                dari rumah; sesi luring di lab kampus dengan presensi pengawas.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-putih border border-biru-200 space-y-1">
              <strong className="text-biru-950 block font-bold text-sm">
                3. Keamanan Ujian
              </strong>
              <p>
                Sistem CBT dilengkapi autosave jawaban real-time,
                anti-kecurangan, dan perhitungan skor instan otomatis.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
