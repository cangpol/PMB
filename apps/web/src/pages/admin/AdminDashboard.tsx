import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  FileCheck2,
  GraduationCap,
  CreditCard,
  Download,
  TrendingUp,
  Award,
  Layers,
  Clock,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Button,
  Card,
  CardSkeleton,
  ErrorState,
} from "../../components/common";
import { SeoHead } from "../../components/common/SeoHead";
import type { components } from "../../types/api";

type ExecutiveStats = components["schemas"]["ExecutiveDashboardResponse"];

// Palet warna biru royal elegan untuk Recharts
const BIRU_PALETTE = {
  primary: "#0b2559", // biru-900
  secondary: "#2563eb", // biru-600
  accent: "#3b82f6", // biru-500
  light: "#bfd4f8", // biru-200
  tint: "#dce8fc", // biru-100
  dark: "#061633", // biru-950
  success: "#1a4bb5", // biru-700
  warning: "#12378a", // biru-800
};

const PIE_COLORS = [
  "#0b2559",
  "#2563eb",
  "#3b82f6",
  "#1a4bb5",
  "#12378a",
  "#bfd4f8",
];

export const AdminDashboard: React.FC = () => {
  const [periode, setPeriode] = useState<"ALL" | "7D" | "30D">("ALL");

  // Siapkan query params berdasarkan periode
  const queryString = React.useMemo(() => {
    const params = new URLSearchParams();
    const now = new Date();

    if (periode === "7D") {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      params.append("start_date", past7.toISOString().split("T")[0]);
    } else if (periode === "30D") {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      params.append("start_date", past30.toISOString().split("T")[0]);
    }
    return params.toString();
  }, [periode]);

  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useQuery<ExecutiveStats>({
    queryKey: ["admin-executive-stats", periode],
    queryFn: async () => {
      const url = `/api/dashboard/admin/stats${queryString ? `?${queryString}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data statistik dashboard");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const handleExportExcel = () => {
    const exportUrl = `/api/dashboard/admin/export-excel${queryString ? `?${queryString}` : ""}`;
    window.open(exportUrl, "_blank");
  };

  return (
    <div className="space-y-8 pb-12">
      <SeoHead title="Dashboard Eksekutif PMB | Administrator" />

      {/* Header Dashboard & Periode Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-200">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-100 text-biru-800">
            Analitik PMB T.A. 2026/2027
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-1">
            Dashboard Eksekutif &amp; Analisis PMB
          </h1>
          <p className="text-xs text-biru-700 font-sans mt-0.5">
            Pemantauan real-time konversi pendaftar, kapasitas program studi,
            dan penerimaan keuangan institusi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Periode Filter Buttons */}
          <div className="flex rounded-xl border border-biru-200 bg-putih p-0.5 text-xs shadow-soft-xs">
            <button
              type="button"
              onClick={() => setPeriode("ALL")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                periode === "ALL"
                  ? "bg-biru-800 text-putih"
                  : "text-biru-700 hover:text-biru-950"
              }`}
            >
              Semua Periode
            </button>
            <button
              type="button"
              onClick={() => setPeriode("30D")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                periode === "30D"
                  ? "bg-biru-800 text-putih"
                  : "text-biru-700 hover:text-biru-950"
              }`}
            >
              30 Hari
            </button>
            <button
              type="button"
              onClick={() => setPeriode("7D")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                periode === "7D"
                  ? "bg-biru-800 text-putih"
                  : "text-biru-700 hover:text-biru-950"
              }`}
            >
              7 Hari
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-1.5 text-xs border-biru-300 font-bold bg-putih hover:bg-biru-50"
          >
            <Download className="w-3.5 h-3.5 text-biru-700" />
            <span>Ekspor Excel (CSV)</span>
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton className="h-28 w-full" />
          <CardSkeleton className="h-28 w-full" />
          <CardSkeleton className="h-28 w-full" />
          <CardSkeleton className="h-28 w-full" />
        </div>
      )}

      {isError && (
        <ErrorState
          title="Gagal Memuat Data Statistik"
          message="Terjadi kendala saat mengambil metrik eksekutif. Pastikan koneksi backend aktif."
          retryLabel="Muat Ulang Data"
          onRetry={() => {
            void refetch();
          }}
        />
      )}

      {stats && (
        <>
          {/* ========================================================================= */}
          {/* KPI METRIC CARDS (7 KARTU UTAMA) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Pendaftar */}
            <Card className="p-5 border-biru-200 hover:shadow-soft-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-biru-700 uppercase tracking-wider">
                  Total Pendaftar
                </span>
                <div className="h-9 w-9 rounded-xl bg-biru-100 flex items-center justify-center text-biru-800">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-serif text-3xl font-extrabold text-biru-950">
                  {stats.total_pendaftar.toLocaleString("id-ID")}
                </span>
                <p className="text-[11px] text-biru-600 mt-0.5">
                  Akun calon mahasiswa terdaftar
                </p>
              </div>
            </Card>

            {/* Berkas Valid */}
            <Card className="p-5 border-biru-200 hover:shadow-soft-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-biru-700 uppercase tracking-wider">
                  Berkas Terverifikasi
                </span>
                <div className="h-9 w-9 rounded-xl bg-biru-100 flex items-center justify-center text-biru-800">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-serif text-3xl font-extrabold text-biru-950">
                  {stats.total_berkas_diverifikasi.toLocaleString("id-ID")}
                </span>
                <p className="text-[11px] text-biru-600 mt-0.5">
                  Dokumen valid &amp; lolos administrasi
                </p>
              </div>
            </Card>

            {/* Lulus Seleksi */}
            <Card className="p-5 border-biru-200 hover:shadow-soft-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-biru-700 uppercase tracking-wider">
                  Lulus Seleksi
                </span>
                <div className="h-9 w-9 rounded-xl bg-biru-100 flex items-center justify-center text-biru-800">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-serif text-3xl font-extrabold text-biru-950">
                  {stats.total_lulus.toLocaleString("id-ID")}
                </span>
                <p className="text-[11px] text-biru-600 mt-0.5">
                  Ditetapkan melalui sidang kelulusan
                </p>
              </div>
            </Card>

            {/* Mahasiswa Baru (NIM Terbit) */}
            <Card className="p-5 border-biru-300 bg-gradient-to-br from-biru-50/70 to-putih hover:shadow-soft-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-biru-900 uppercase tracking-wider">
                  Mahasiswa Baru (NIM)
                </span>
                <div className="h-9 w-9 rounded-xl bg-biru-800 text-putih flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-serif text-3xl font-extrabold text-biru-950">
                  {stats.total_registrasi_nim.toLocaleString("id-ID")}
                </span>
                <p className="text-[11px] text-biru-700 mt-0.5 font-medium">
                  Telah daftar ulang &amp; siap kuliah
                </p>
              </div>
            </Card>
          </div>

          {/* KPI Keuangan Ringkas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 border-biru-200 bg-putih flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-biru-700 block">
                  Total Dana Masuk Terkumpul (Lunas)
                </span>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-1 block">
                  Rp {stats.total_pendapatan_rupiah.toLocaleString("id-ID")}
                </span>
                <p className="text-[11px] text-biru-600 mt-0.5">
                  Pembayaran formulir pendaftaran &amp; registrasi ulang UKT
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-biru-100 text-biru-900 border border-biru-200 flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
            </Card>

            <Card className="p-5 border-biru-200 bg-putih flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-biru-700 block">
                  Total Tagihan Berjalan (Menunggu Bayar)
                </span>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-biru-900 mt-1 block">
                  Rp {stats.total_piutang_rupiah.toLocaleString("id-ID")}
                </span>
                <p className="text-[11px] text-biru-600 mt-0.5">
                  Tagihan formulir / daftar ulang aktif belum dilunasi
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-biru-50 text-biru-800 border border-biru-200 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* GRAFIK 1: TREN HARIAN & FUNNEL PENDAFTARAN */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* AreaChart Tren Harian (8 kolom) */}
            <Card className="lg:col-span-8 p-6 border-biru-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-biru-950">
                    Tren Pendaftaran Harian (14 Hari Terakhir)
                  </h3>
                  <p className="text-xs text-biru-700">
                    Aktivitas pembuatan akun formulir dan pembayaran lunas per
                    tanggal
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-biru-600" />
              </div>

              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.tren_harian}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorPendaftar"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={BIRU_PALETTE.secondary}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={BIRU_PALETTE.secondary}
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorBayar"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={BIRU_PALETTE.primary}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={BIRU_PALETTE.primary}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={BIRU_PALETTE.tint}
                    />
                    <XAxis
                      dataKey="tanggal"
                      tick={{ fontSize: 10, fill: BIRU_PALETTE.warning }}
                      tickFormatter={(val) => val.slice(5)} // Tampilkan MM-DD
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: BIRU_PALETTE.warning }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: BIRU_PALETTE.dark,
                        borderRadius: "12px",
                        border: `1px solid ${BIRU_PALETTE.primary}`,
                        fontSize: "11px",
                        color: "#FFFFFF",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pendaftar"
                      name="Pendaftar Baru"
                      stroke={BIRU_PALETTE.secondary}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPendaftar)"
                    />
                    <Area
                      type="monotone"
                      dataKey="bayar"
                      name="Pembayaran Lunas"
                      stroke={BIRU_PALETTE.primary}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorBayar)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Funnel BarChart (4 kolom) */}
            <Card className="lg:col-span-4 p-6 border-biru-200 space-y-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-biru-950">
                  Konversi Funnel Seleksi
                </h3>
                <p className="text-xs text-biru-700">
                  Penyusutan bertahap dari akun hingga terbit NIM
                </p>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.funnel_tahapan}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={BIRU_PALETTE.tint}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: BIRU_PALETTE.warning }}
                    />
                    <YAxis
                      dataKey="tahapan"
                      type="category"
                      tick={{
                        fontSize: 9,
                        fill: BIRU_PALETTE.dark,
                        fontWeight: 600,
                      }}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: BIRU_PALETTE.dark,
                        borderRadius: "10px",
                        border: `1px solid ${BIRU_PALETTE.primary}`,
                        fontSize: "11px",
                        color: "#FFFFFF",
                      }}
                    />
                    <Bar
                      dataKey="jumlah"
                      name="Total Kandidat"
                      fill={BIRU_PALETTE.accent}
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* GRAFIK 2: DISTRIBUSI PROGRAM STUDI & JALUR MASUK */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* BarChart Program Studi (7 kolom) */}
            <Card className="lg:col-span-7 p-6 border-biru-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-biru-950">
                    Peminat vs Kuota Program Studi
                  </h3>
                  <p className="text-xs text-biru-700">
                    Jumlah pendaftar pilihan 1, lulusan, dan kapasitas kuota
                  </p>
                </div>
                <Layers className="w-5 h-5 text-biru-600" />
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.distribusi_prodi}
                    margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={BIRU_PALETTE.tint}
                    />
                    <XAxis
                      dataKey="kode_prodi"
                      tick={{
                        fontSize: 11,
                        fill: BIRU_PALETTE.dark,
                        fontWeight: 700,
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: BIRU_PALETTE.warning }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: BIRU_PALETTE.dark,
                        borderRadius: "12px",
                        border: `1px solid ${BIRU_PALETTE.primary}`,
                        fontSize: "11px",
                        color: "#FFFFFF",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                    />
                    <Bar
                      dataKey="total_peminat"
                      name="Peminat Pilihan 1"
                      fill={BIRU_PALETTE.secondary}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="total_lulus"
                      name="Lulus Seleksi"
                      fill={BIRU_PALETTE.primary}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="kuota"
                      name="Kuota Tersedia"
                      fill={BIRU_PALETTE.light}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Donut Chart: Distribusi Jalur Masuk (5 kolom) */}
            <Card className="lg:col-span-5 p-6 border-biru-200 space-y-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-biru-950">
                  Proporsi Jalur Masuk
                </h3>
                <p className="text-xs text-biru-700">
                  Komposisi pendaftar berdasarkan jalur seleksi
                </p>
              </div>

              <div className="h-72 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.distribusi_jalur}
                      dataKey="total_pendaftar"
                      nameKey="nama_jalur"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {stats.distribusi_jalur.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: BIRU_PALETTE.dark,
                        borderRadius: "10px",
                        border: `1px solid ${BIRU_PALETTE.primary}`,
                        fontSize: "11px",
                        color: "#FFFFFF",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* TABEL STATUS BREAKDOWN & DETAIL KUOTA */}
          {/* ========================================================================= */}
          <Card className="border-biru-200 overflow-hidden">
            <div className="p-5 border-b border-biru-100 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-biru-950">
                  Rekapitulasi Program Studi &amp; Keterisian Kuota
                </h3>
                <p className="text-xs text-biru-700">
                  Rincian kuota terisi dan konversi mahasiswa baru per program
                  studi
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-biru-200 bg-biru-50/70 text-biru-950 font-bold">
                    <th className="py-3 px-4">Kode</th>
                    <th className="py-3 px-4">Program Studi</th>
                    <th className="py-3 px-3 text-center">Jenjang</th>
                    <th className="py-3 px-3 text-center">Kuota</th>
                    <th className="py-3 px-3 text-center">Peminat</th>
                    <th className="py-3 px-3 text-center">Lolos Seleksi</th>
                    <th className="py-3 px-3 text-center">
                      Daftar Ulang (NIM)
                    </th>
                    <th className="py-3 px-4 text-center">Keterisian (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-biru-100 text-biru-800 font-sans">
                  {stats.distribusi_prodi.map((p) => {
                    const pct =
                      p.kuota > 0
                        ? Math.round((p.total_daftar_ulang / p.kuota) * 100)
                        : 0;
                    return (
                      <tr key={p.prodi_id} className="hover:bg-biru-50/40">
                        <td className="py-3 px-4 font-mono font-bold text-biru-900">
                          {p.kode_prodi}
                        </td>
                        <td className="py-3 px-4 font-semibold text-biru-950">
                          {p.nama_prodi}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-biru-100 text-biru-800">
                            {p.jenjang}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-biru-900">
                          {p.kuota}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-biru-800">
                          {p.total_peminat}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-biru-800">
                          {p.total_lulus}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-biru-950">
                          {p.total_daftar_ulang}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-biru-100 overflow-hidden">
                              <div
                                className="h-full bg-biru-700 rounded-full"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="font-bold text-[11px] text-biru-900 font-mono">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
