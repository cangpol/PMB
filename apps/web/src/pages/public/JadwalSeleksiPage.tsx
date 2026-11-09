import React from "react";
import { Link } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, StatusBadge } from "../../components/common";
import { DaftarTahapRingkas } from "../../components/pendaftaran/DaftarTahapRingkas";
import {
  periodeGelombang,
  statusGelombang,
  tahapDibuka,
  type GelombangPublik,
} from "../../lib/gelombangTahap";
import { SeoHead } from "../../components/common/SeoHead";

export const JadwalSeleksiPage: React.FC = () => {
  // Jadwal diambil dari gelombang yang diatur admin (termasuk tahap 1 / tahap 2)
  const {
    data: gelombangList = [],
    isLoading,
    isError,
  } = useQuery<GelombangPublik[]>({
    queryKey: ["master-gelombang-jadwal"],
    queryFn: async () => {
      const res = await fetch("/api/master/gelombang");
      if (!res.ok) throw new Error("Gagal memuat gelombang");
      return res.json();
    },
  });

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
        {isLoading && (
          <p className="text-sm text-biru-700 text-center py-10">
            Memuat jadwal gelombang...
          </p>
        )}
        {isError && (
          <p className="text-sm text-biru-900 text-center py-10">
            Jadwal gelombang belum dapat dimuat. Silakan muat ulang halaman.
          </p>
        )}
        {!isLoading && !isError && gelombangList.length === 0 && (
          <p className="text-sm text-biru-700 text-center py-10">
            Jadwal gelombang pendaftaran akan segera diumumkan.
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {gelombangList.map((gel, idx) => {
            const status = statusGelombang(gel);
            const nama = gel.nama_gelombang.replace(/\[CONTOH\]\s*/i, "");
            const dibuka = tahapDibuka(gel);
            return (
              <Card
                key={gel.id}
                className={`p-6 sm:p-7 flex flex-col justify-between transition-all ${
                  status === "AKTIF"
                    ? "border-biru-600 shadow-soft-lg ring-2 ring-biru-500/20 bg-gradient-to-b from-biru-50/50 to-putih"
                    : "border-biru-200 hover:border-biru-300"
                }`}
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-biru-600">
                      GEL-{idx + 1}
                    </span>
                    <StatusBadge
                      status={
                        status === "AKTIF"
                          ? "TERVERIFIKASI"
                          : status === "MENDATANG"
                            ? "MENUNGGU"
                            : "DRAFT"
                      }
                      label={
                        status === "AKTIF"
                          ? dibuka
                            ? `${dibuka.nama} Dibuka`
                            : "Dibuka Sekarang"
                          : status === "MENDATANG"
                            ? "Segera Dibuka"
                            : "Ditutup"
                      }
                    />
                  </div>

                  <div>
                    <h2 className="font-serif text-2xl font-bold text-biru-950">
                      {nama}
                    </h2>
                    {gel.deskripsi && (
                      <p className="text-xs text-biru-700 mt-1 font-sans leading-relaxed">
                        {gel.deskripsi}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 text-xs border-y border-biru-100 py-4 font-sans">
                    <div>
                      <span className="text-biru-600 block text-[11px]">
                        Periode Pendaftaran:
                      </span>
                      <strong className="text-biru-950 font-semibold">
                        {periodeGelombang(gel)}
                      </strong>
                    </div>
                    {gel.tahap?.length ? (
                      <div className="space-y-2">
                        <span className="text-biru-600 block text-[11px]">
                          Tahap Pendaftaran:
                        </span>
                        <DaftarTahapRingkas tahap={gel.tahap} />
                      </div>
                    ) : null}
                    {gel.info_daftar_ulang && (
                      <div>
                        <span className="text-biru-600 block text-[11px]">
                          Batas Daftar Ulang &amp; NIM:
                        </span>
                        <strong className="text-biru-950 font-semibold">
                          {gel.info_daftar_ulang}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-biru-100">
                  {status === "AKTIF" ? (
                    <Link to="/register" className="block">
                      <Button
                        variant="primary"
                        className="w-full text-xs font-bold py-2.5 shadow-soft-sm"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                      >
                        {dibuka
                          ? `Daftar ${dibuka.nama} Sekarang`
                          : "Daftar Sekarang"}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="outline"
                      disabled
                      className="w-full text-xs opacity-60 cursor-not-allowed"
                    >
                      {status === "SELESAI"
                        ? "Pendaftaran Ditutup"
                        : "Pendaftaran Belum Dibuka"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
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
                seluruh berkas diverifikasi admin PMB. Ujian CBT dikerjakan
                online dari rumah.
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
