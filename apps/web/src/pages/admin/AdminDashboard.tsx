import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  FileCheck2,
  GraduationCap,
  CreditCard,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Button,
  Card,
  StatusBadge,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";

const DATA_DISTRIBUSI_PRODI = [
  { nama: "S1 Informatika", peminat: 184, kuota: 80 },
  { nama: "S1 Sist. Informasi", peminat: 132, kuota: 60 },
  { nama: "S1 Manajemen", peminat: 120, kuota: 100 },
  { nama: "S1 Akuntansi", peminat: 88, kuota: 60 },
  { nama: "D3 Manaj. Info", peminat: 48, kuota: 50 },
];

const DATA_FUNNEL = [
  { tahapan: "1. Registrasi Akun", total: 572 },
  { tahapan: "2. Bayar Formulir", total: 524 },
  { tahapan: "3. Submit Berkas", total: 480 },
  { tahapan: "4. Ikuti Ujian CBT", total: 420 },
  { tahapan: "5. Dinyatakan Lulus", total: 312 },
  { tahapan: "6. Daftar Ulang", total: 245 },
];

export const AdminDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [isEmpty] = useState<boolean>(false);

  return (
    <div className="space-y-8">
      {/* Header Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-200">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Dashboard Eksekutif Penerimaan Mahasiswa Baru
          </h1>
          <p className="text-xs text-biru-800">
            Statistik konversi, distribusi program studi, dan penerimaan
            keuangan T.A. 2026/2027
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              alert(
                "Mengekspor laporan rekapitulasi PMB ke format Excel/CSV...",
              )
            }
            className="gap-1.5 text-xs border-biru-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Rekapitulasi</span>
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <ErrorState
          title="Gagal Memuat Statistik Eksekutif"
          message="Terjadi kesalahan jaringan saat mengambil metrik analitik PMB."
          onRetry={() => {
            setIsError(false);
            setIsLoading(false);
          }}
        />
      )}

      {/* Empty State */}
      {!isLoading && !isError && isEmpty && (
        <EmptyState
          title="Belum Ada Data Pendaftar Masuk"
          description="Tahun ajaran baru baru dibuka, belum ada data pendaftar atau transaksi keuangan yang tercatat."
        />
      )}

      {/* Konten Analitik */}
      {!isLoading && !isError && !isEmpty && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-biru-200 bg-putih shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-biru-800 uppercase tracking-wider">
                  Total Pendaftar
                </span>
                <div className="w-8 h-8 rounded-lg bg-biru-100 flex items-center justify-center text-biru-700">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="font-serif text-3xl font-bold text-biru-950">
                  524
                </span>
                <span className="text-[11px] text-biru-700 block font-medium">
                  +18% dari periode lalu
                </span>
              </div>
            </Card>

            <Card className="border border-biru-200 bg-putih shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-biru-800 uppercase tracking-wider">
                  Berkas Terverifikasi
                </span>
                <div className="w-8 h-8 rounded-lg bg-biru-100 flex items-center justify-center text-biru-700">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="font-serif text-3xl font-bold text-biru-950">
                  480
                </span>
                <span className="text-[11px] text-biru-800 block">
                  44 berkas dalam antrean
                </span>
              </div>
            </Card>

            <Card className="border border-biru-200 bg-putih shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-biru-800 uppercase tracking-wider">
                  Lulus Seleksi
                </span>
                <div className="w-8 h-8 rounded-lg bg-biru-100 flex items-center justify-center text-biru-700">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="font-serif text-3xl font-bold text-biru-950">
                  312
                </span>
                <span className="text-[11px] text-biru-700 block font-medium">
                  Telah diterbitkan NIM
                </span>
              </div>
            </Card>

            <Card className="border border-biru-200 bg-putih shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-biru-800 uppercase tracking-wider">
                  Total Penerimaan
                </span>
                <div className="w-8 h-8 rounded-lg bg-biru-100 flex items-center justify-center text-biru-700">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="font-serif text-2xl font-bold text-biru-950">
                  Rp 184,5 Jt
                </span>
                <span className="text-[11px] text-biru-800 block">
                  Formulir & Daftar Ulang
                </span>
              </div>
            </Card>
          </div>

          {/* 2 Grafik Recharts: Distribusi Prodi & Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Grafik 1: Distribusi Peminat Program Studi */}
            <div className="lg:col-span-7 bg-putih border border-biru-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-biru-950">
                    Peminat vs Daya Tampung Kuota
                  </h3>
                  <p className="text-xs text-biru-800">
                    Distribusi peminat pilihan pertama tiap program studi
                  </p>
                </div>
                <StatusBadge
                  status="berhasil"
                  label="Informatika Tertinggi"
                  size="sm"
                />
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={DATA_DISTRIBUSI_PRODI}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#DCE8FC"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="nama"
                      stroke="#0B2559"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis stroke="#0B2559" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#061633",
                        borderColor: "#1A4BB5",
                        borderRadius: "12px",
                        color: "#FFFFFF",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="peminat"
                      fill="#1A4BB5"
                      radius={[6, 6, 0, 0]}
                      name="Peminat Pilihan 1"
                    />
                    <Bar
                      dataKey="kuota"
                      fill="#BFD4F8"
                      radius={[6, 6, 0, 0]}
                      name="Kuota Tampung"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grafik 2: Funnel Konversi Seleksi */}
            <div className="lg:col-span-5 bg-putih border border-biru-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-biru-950">
                    Funnel Konversi Pendaftaran
                  </h3>
                  <p className="text-xs text-biru-800">
                    Tingkat kelanjutan tiap fase seleksi
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-biru-700">
                  42.8% Conversion
                </span>
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={DATA_FUNNEL}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#DCE8FC"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="tahapan"
                      stroke="#0B2559"
                      fontSize={9}
                      tickLine={false}
                    />
                    <YAxis stroke="#0B2559" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#061633",
                        borderColor: "#1A4BB5",
                        borderRadius: "12px",
                        color: "#FFFFFF",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#2563EB"
                      strokeWidth={2}
                      fill="#DCE8FC"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabel 5 Pendaftar Terbaru */}
          <Card className="border border-biru-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-biru-100">
              <div>
                <h3 className="font-serif text-lg font-bold text-biru-950">
                  Pendaftar Masuk Terbaru
                </h3>
                <p className="text-xs text-biru-800">
                  Menampilkan 5 aktivitas registrasi terakhir
                </p>
              </div>
              <Link
                to="/admin/berkas"
                className="text-xs font-bold text-biru-700 hover:underline"
              >
                Lihat Semua Berkas &rarr;
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-biru-50 text-biru-950 font-bold uppercase tracking-wider border-b border-biru-200">
                  <tr>
                    <th className="py-3 px-4">No. Pendaftaran</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Asal Sekolah</th>
                    <th className="py-3 px-4">Pilihan 1</th>
                    <th className="py-3 px-4">Rata-rata Rapor</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-biru-100 text-biru-900">
                  <tr className="hover:bg-biru-50/50">
                    <td className="py-3 px-4 font-mono font-bold">
                      PMB-2026-0042
                    </td>
                    <td className="py-3 px-4 font-semibold text-biru-950">
                      Budi Santoso
                    </td>
                    <td className="py-3 px-4">SMA Negeri 1 Surakarta</td>
                    <td className="py-3 px-4">S1 Informatika</td>
                    <td className="py-3 px-4 font-mono">87.50</td>
                    <td className="py-3 px-4 text-right">
                      <StatusBadge status="berhasil" label="LULUS" size="sm" />
                    </td>
                  </tr>
                  <tr className="hover:bg-biru-50/50">
                    <td className="py-3 px-4 font-mono font-bold">
                      PMB-2026-0041
                    </td>
                    <td className="py-3 px-4 font-semibold text-biru-950">
                      Dewi Kartika
                    </td>
                    <td className="py-3 px-4">SMA Regina Pacis Surakarta</td>
                    <td className="py-3 px-4">S1 Sistem Informasi</td>
                    <td className="py-3 px-4 font-mono">89.20</td>
                    <td className="py-3 px-4 text-right">
                      <StatusBadge status="berhasil" label="LULUS" size="sm" />
                    </td>
                  </tr>
                  <tr className="hover:bg-biru-50/50">
                    <td className="py-3 px-4 font-mono font-bold">
                      PMB-2026-0040
                    </td>
                    <td className="py-3 px-4 font-semibold text-biru-950">
                      Agus Setiawan
                    </td>
                    <td className="py-3 px-4">SMK Mikael Surakarta</td>
                    <td className="py-3 px-4">D3 Manaj. Informatika</td>
                    <td className="py-3 px-4 font-mono">82.00</td>
                    <td className="py-3 px-4 text-right">
                      <StatusBadge
                        status="menunggu"
                        label="VERIFIKASI"
                        size="sm"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
