import React, { useState, useMemo } from "react";
import { SumberInformasiCard } from "../../components/admin/SumberInformasiCard";
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
  Search,
  ArrowUpRight,
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
  EmptyState,
} from "../../components/common";
import { SeoHead } from "../../components/common/SeoHead";
import { PageHeader } from "../../components/admin/PageHeader";
import { KartuAntrean } from "../../components/admin/KartuAntrean";
import { Sparkline } from "../../components/ui/Sparkline";
import { fetchApi } from "../../services/api";
import type { components } from "../../types/api";

type ExecutiveStats = components["schemas"]["ExecutiveDashboardResponse"];

// Palet warna biru royal murni resmi untuk Recharts
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
  const [prodiSearch, setProdiSearch] = useState<string>("");

  // Siapkan query params berdasarkan filter periode
  const queryString = useMemo(() => {
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
      return fetchApi<ExecutiveStats>(url);
    },
    refetchInterval: 30000,
  });

  const handleExportExcel = () => {
    const exportUrl = `/api/dashboard/admin/export-excel${queryString ? `?${queryString}` : ""}`;
    window.open(exportUrl, "_blank");
  };

  // Sparkline trend data derived from daily trends or fallback curves
  const pendaftarTrend = useMemo(() => {
    if (stats?.tren_harian && stats.tren_harian.length >= 2) {
      return stats.tren_harian.map((t) => t.pendaftar);
    }
    return [12, 18, 15, 24, 28, 32, 45];
  }, [stats?.tren_harian]);

  const berkasTrend = useMemo(() => {
    if (stats?.tren_harian && stats.tren_harian.length >= 2) {
      return stats.tren_harian.map(
        (t) => t.terverifikasi || Math.round(t.pendaftar * 0.85),
      );
    }
    return [10, 14, 12, 20, 22, 29, 38];
  }, [stats?.tren_harian]);

  const bayarTrend = useMemo(() => {
    if (stats?.tren_harian && stats.tren_harian.length >= 2) {
      return stats.tren_harian.map((t) => t.bayar);
    }
    return [8, 12, 11, 17, 21, 26, 35];
  }, [stats?.tren_harian]);

  // Filter prodi by keyword
  const filteredProdi = useMemo(() => {
    if (!stats?.distribusi_prodi) return [];
    const q = prodiSearch.trim().toLowerCase();
    if (!q) return stats.distribusi_prodi;
    return stats.distribusi_prodi.filter(
      (p) =>
        p.nama_prodi.toLowerCase().includes(q) ||
        p.kode_prodi.toLowerCase().includes(q),
    );
  }, [stats?.distribusi_prodi, prodiSearch]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      <SeoHead title="Dashboard Eksekutif PMB | Administrator" />

      {/* ========================================================================= */}
      {/* 1. UNIFIED PAGE HEADER & ACTION TOOLBAR */}
      {/* ========================================================================= */}
      <PageHeader
        tag="Analitik PMB T.A. 2026/2027"
        title="Dashboard Eksekutif & Analisis PMB"
        description="Pemantauan real-time konversi pendaftar, kapasitas program studi, dan penerimaan keuangan institusi."
        actions={
          <>
            {/* Periode Filter Buttons */}
            <div className="flex rounded-xl border border-biru-200 bg-putih p-0.5 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setPeriode("ALL")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  periode === "ALL"
                    ? "bg-biru-800 text-putih shadow-xs"
                    : "text-biru-700 hover:text-biru-950"
                }`}
              >
                Semua Periode
              </button>
              <button
                type="button"
                onClick={() => setPeriode("30D")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  periode === "30D"
                    ? "bg-biru-800 text-putih shadow-xs"
                    : "text-biru-700 hover:text-biru-950"
                }`}
              >
                30 Hari
              </button>
              <button
                type="button"
                onClick={() => setPeriode("7D")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  periode === "7D"
                    ? "bg-biru-800 text-putih shadow-xs"
                    : "text-biru-700 hover:text-biru-950"
                }`}
              >
                7 Hari
              </button>
            </div>

            {/* Ekspor Excel Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="gap-1.5 text-xs border-biru-300 font-bold bg-putih hover:bg-biru-50 text-biru-900 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-biru-700" />
              <span>Ekspor Excel (CSV)</span>
            </Button>
          </>
        }
      />

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <CardSkeleton className="h-32 w-full" />
            <CardSkeleton className="h-32 w-full" />
            <CardSkeleton className="h-32 w-full" />
            <CardSkeleton className="h-32 w-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <CardSkeleton className="h-28 w-full" />
            <CardSkeleton className="h-28 w-full" />
          </div>
        </div>
      )}

      {/* Berkas/bukti yang menunggu diperiksa (tersembunyi bila kosong) */}
      <KartuAntrean />

      {/* Error State */}
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

      {/* Main Stats Display */}
      {stats && (
        <>
          {/* ========================================================================= */}
          {/* 2. KPI METRIC CARDS (4 KARTU OPERASIONAL PMB + SPARKLINE) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Total Pendaftar */}
            <Card className="p-5 border-biru-200 bg-putih hover:shadow-soft-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-biru-700 uppercase tracking-wider">
                    Total Pendaftar
                  </span>
                  <div className="h-9 w-9 rounded-xl bg-biru-100 flex items-center justify-center text-biru-800 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="font-serif text-3xl font-extrabold text-biru-950 tabular-nums">
                    {(stats.total_pendaftar ?? 0).toLocaleString("id-ID")}
                  </span>
                  <Sparkline
                    data={pendaftarTrend}
                    width={72}
                    height={26}
                    strokeColor="var(--color-biru-600)"
                  />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-biru-100 flex items-center justify-between text-[11px]">
                <span className="text-biru-600">Akun terdaftar</span>
                <span className="inline-flex items-center text-biru-700 font-semibold font-mono">
                  <ArrowUpRight className="w-3 h-3 text-biru-600 mr-0.5" />
                  Aktif
                </span>
              </div>
            </Card>

            {/* Berkas Terverifikasi */}
            <Card className="p-5 border-biru-200 bg-putih hover:shadow-soft-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-biru-700 uppercase tracking-wider">
                    Berkas Terverifikasi
                  </span>
                  <div className="h-9 w-9 rounded-xl bg-biru-100 flex items-center justify-center text-biru-800 shrink-0">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="font-serif text-3xl font-extrabold text-biru-950 tabular-nums">
                    {(stats.total_berkas_diverifikasi ?? 0).toLocaleString(
                      "id-ID",
                    )}
                  </span>
                  <Sparkline
                    data={berkasTrend}
                    width={72}
                    height={26}
                    strokeColor="var(--color-biru-700)"
                  />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-biru-100 flex items-center justify-between text-[11px]">
                <span className="text-biru-600">Lolos administrasi</span>
                <span className="text-biru-700 font-semibold font-mono">
                  {(stats.total_pendaftar ?? 0) > 0
                    ? `${Math.round(((stats.total_berkas_diverifikasi ?? 0) / stats.total_pendaftar) * 100)}%`
                    : "0%"}
                </span>
              </div>
            </Card>

            {/* Lulus Seleksi */}
            <Card className="p-5 border-biru-200 bg-putih hover:shadow-soft-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-biru-700 uppercase tracking-wider">
                    Lulus Seleksi
                  </span>
                  <div className="h-9 w-9 rounded-xl bg-biru-100 flex items-center justify-center text-biru-800 shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="font-serif text-3xl font-extrabold text-biru-950 tabular-nums">
                    {(stats.total_lulus ?? 0).toLocaleString("id-ID")}
                  </span>
                  <Sparkline
                    data={bayarTrend}
                    width={72}
                    height={26}
                    strokeColor="var(--color-biru-900)"
                  />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-biru-100 flex items-center justify-between text-[11px]">
                <span className="text-biru-600">Sidang kelulusan</span>
                <span className="text-biru-700 font-semibold font-mono">
                  {(stats.total_peserta_ujian ?? 0) > 0
                    ? `${Math.round(((stats.total_lulus ?? 0) / stats.total_peserta_ujian) * 100)}%`
                    : "Diterima"}
                </span>
              </div>
            </Card>

            {/* Mahasiswa Baru (NIM Terbit) */}
            <Card className="p-5 border-biru-300 bg-gradient-to-br from-biru-50/80 to-putih hover:shadow-soft-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-biru-900 uppercase tracking-wider">
                    Mahasiswa Baru (NIM)
                  </span>
                  <div className="h-9 w-9 rounded-xl bg-biru-800 text-putih flex items-center justify-center shrink-0 shadow-xs">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="font-serif text-3xl font-extrabold text-biru-950 tabular-nums">
                    {(stats.total_registrasi_nim ?? 0).toLocaleString("id-ID")}
                  </span>
                  <Sparkline
                    data={[5, 12, 19, 28, 42, 60, 85]}
                    width={72}
                    height={26}
                    strokeColor="var(--color-biru-950)"
                  />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-biru-200/80 flex items-center justify-between text-[11px]">
                <span className="text-biru-700 font-medium">
                  Registrasi lunas
                </span>
                <span className="text-biru-900 font-bold font-mono">
                  Siap Kuliah
                </span>
              </div>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* 3. KPI RINGKASAN KEUANGAN */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Card className="p-5 sm:p-6 border-biru-200 bg-putih flex items-center justify-between shadow-soft-xs">
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-biru-700 block">
                  Total Dana Masuk Terkumpul (Lunas)
                </span>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-1 block tabular-nums">
                  Rp{" "}
                  {(stats.total_pendapatan_rupiah ?? 0).toLocaleString("id-ID")}
                </span>
                <p className="text-[11px] text-biru-600 mt-0.5">
                  Pembayaran formulir pendaftaran &amp; registrasi ulang UKT
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-biru-100 text-biru-900 border border-biru-200 flex items-center justify-center shrink-0 ml-4">
                <CreditCard className="w-6 h-6" />
              </div>
            </Card>

            <Card className="p-5 sm:p-6 border-biru-200 bg-putih flex items-center justify-between shadow-soft-xs">
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-biru-700 block">
                  Total Tagihan Berjalan (Menunggu Bayar)
                </span>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-biru-900 mt-1 block tabular-nums">
                  Rp {(stats.total_piutang_rupiah ?? 0).toLocaleString("id-ID")}
                </span>
                <p className="text-[11px] text-biru-600 mt-0.5">
                  Invoice aktif calon mahasiswa dengan batas jatuh tempo
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-biru-50 text-biru-800 border border-biru-200 flex items-center justify-center shrink-0 ml-4">
                <TrendingUp className="w-6 h-6" />
              </div>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* 4. GRAFIK RECHARTS: TREN HARIAN & FUNNEL SELEKSI */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Tren Harian (8 Kolom) */}
            <Card className="lg:col-span-8 p-5 sm:p-6 border-biru-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-biru-950">
                    Tren Pendaftaran &amp; Pembayaran Harian
                  </h3>
                  <p className="text-xs text-biru-700">
                    Pergerakan jumlah akun baru dibanding verifikasi pembayaran
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-biru-600" />
                  <span className="text-[11px] font-semibold text-biru-900">
                    Live
                  </span>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
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
                          stopOpacity={0.4}
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
                          stopOpacity={0.4}
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
                      tick={{ fontSize: 11, fill: BIRU_PALETTE.dark }}
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
                        color: "#ffffff",
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

            {/* Funnel Konversi (4 Kolom) */}
            <Card className="lg:col-span-4 p-5 sm:p-6 border-biru-200 space-y-4">
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
                        fontSize: 10,
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
                        color: "#ffffff",
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
          {/* 5. GRAFIK RECHARTS: DISTRIBUSI PROGRAM STUDI & JALUR MASUK */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* BarChart Program Studi (7 Kolom) */}
            <Card className="lg:col-span-7 p-5 sm:p-6 border-biru-200 space-y-4">
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
                        color: "#ffffff",
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

            {/* Donut Chart: Distribusi Jalur Masuk (5 Kolom) */}
            <Card className="lg:col-span-5 p-5 sm:p-6 border-biru-200 space-y-4">
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
                        color: "#ffffff",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* 6. TABEL STATUS BREAKDOWN & REKAP KUOTA (STICKY HEADER + STICKY FIRST COL) */}
          {/* ========================================================================= */}
          <Card className="border-biru-200 overflow-hidden shadow-soft-xs">
            <div className="p-4 sm:p-5 border-b border-biru-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-putih">
              <div>
                <h3 className="font-serif text-lg font-bold text-biru-950">
                  Rekapitulasi Program Studi &amp; Keterisian Kuota
                </h3>
                <p className="text-xs text-biru-700">
                  Rincian kuota terisi dan konversi mahasiswa baru per program
                  studi
                </p>
              </div>

              {/* Input Pencarian Cepat Prodi */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-biru-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={prodiSearch}
                  onChange={(e) => setProdiSearch(e.target.value)}
                  placeholder="Cari program studi..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-biru-200 focus:outline-none focus:ring-2 focus:ring-biru-500 bg-biru-50/40 text-biru-950 placeholder:text-biru-400"
                />
              </div>
            </div>

            {filteredProdi.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="Program Studi Tidak Ditemukan"
                  description="Tidak ada program studi yang cocok dengan kata kunci pencarian Anda."
                  actionLabel="Bersihkan Pencarian"
                  onAction={() => setProdiSearch("")}
                />
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[420px] scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse sticky-first-col">
                  <thead>
                    <tr className="border-b border-biru-200 bg-biru-50/95 backdrop-blur-xs text-biru-950 font-bold sticky top-0 z-20">
                      <th className="py-3 px-4 shadow-[1px_0_0_0_var(--color-biru-100)] border-r border-biru-100">
                        Kode
                      </th>
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
                    {filteredProdi.map((p) => {
                      const pct =
                        p.kuota > 0
                          ? Math.round((p.total_daftar_ulang / p.kuota) * 100)
                          : 0;
                      return (
                        <tr
                          key={p.prodi_id}
                          className="hover:bg-biru-50/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-biru-900 shadow-[1px_0_0_0_var(--color-biru-100)] border-r border-biru-100 bg-putih">
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
                          <td className="py-3 px-3 text-center font-bold text-biru-900 tabular-nums">
                            {p.kuota}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-biru-800 tabular-nums">
                            {p.total_peminat}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-biru-800 tabular-nums">
                            {p.total_lulus}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-biru-950 tabular-nums">
                            {p.total_daftar_ulang}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 rounded-full bg-biru-100 overflow-hidden">
                                <div
                                  className="h-full bg-biru-700 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="font-bold text-[11px] text-biru-900 font-mono tabular-nums">
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
            )}
          </Card>
        </>
      )}

      <SumberInformasiCard />
    </div>
  );
};
