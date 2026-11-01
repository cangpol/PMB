import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Clock,
  Search,
  ArrowLeft,
  LayoutGrid,
  Table as TableIcon,
  Download,
  Printer,
} from "lucide-react";
import {
  Button,
  Card,
  CardSkeleton,
  EmptyState,
} from "../../../components/common";
import { fetchApi } from "@/services/api";
import type { components } from "@/types/api";

type LiveStreamResponse = components["schemas"]["LiveMonitorStreamResponse"];

export const MonitorLiveCbtPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [streamData, setStreamData] = useState<LiveStreamResponse | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // 1. Subscribe to SSE stream dengan fallback polling snapshot
  useEffect(() => {
    if (!id) return;

    let eventSource: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    const fetchSnapshot = async () => {
      try {
        const data = await fetchApi<LiveStreamResponse>(
          `/api/cbt/admin/sesi/${id}/snapshot`,
        );
        if (data) {
          setStreamData(data);
          setLoading(false);
        }
      } catch {
        // Fallback silent
      }
    };

    // Ambil initial snapshot segera
    fetchSnapshot();

    const setupSSE = () => {
      try {
        eventSource = new EventSource(`/api/cbt/admin/sesi/${id}/live-stream`, {
          withCredentials: true,
        });

        eventSource.onopen = () => {
          setSseConnected(true);
          setLoading(false);
        };

        eventSource.onmessage = (event) => {
          try {
            const data: LiveStreamResponse = JSON.parse(event.data);
            if (data && typeof data === "object") {
              setStreamData(data);
              setLoading(false);
            }
          } catch {
            // Ignore parse errors
          }
        };

        eventSource.onerror = () => {
          setSseConnected(false);
          if (eventSource) eventSource.close();
          startFallbackPolling();
        };
      } catch {
        startFallbackPolling();
      }
    };

    const startFallbackPolling = () => {
      if (fallbackInterval) return;
      fallbackInterval = setInterval(fetchSnapshot, 4000);
    };

    setupSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [id]);

  const formatTimer = (seconds: number) => {
    if (seconds <= 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) {
      return `${h}j ${remM}m`;
    }
    return `${m}m ${s}s`;
  };

  const pesertaList = streamData?.peserta || [];

  const filteredList = pesertaList.filter((p) => {
    const matchStatus =
      filterStatus === "ALL" ||
      (filterStatus === "SEDANG_MENGERJAKAN" &&
        p.status_ujian === "SEDANG_MENGERJAKAN") ||
      (filterStatus === "SELESAI" &&
        (p.status_ujian === "SELESAI" || p.status_ujian === "WAKTU_HABIS")) ||
      (filterStatus === "BELUM_HADIR" && p.status_presensi === "BELUM_HADIR");

    const matchQuery =
      !searchQuery ||
      p.nama_peserta.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nomor_peserta.toLowerCase().includes(searchQuery.toLowerCase());

    return matchStatus && matchQuery;
  });

  // Ekspor CSV Rekap Presensi & Nilai
  const handleExportCsv = () => {
    if (pesertaList.length === 0) return;

    const headers = [
      "No",
      "Nomor Peserta",
      "Nama Lengkap",
      "Status Presensi",
      "Status Ujian",
      "Soal Terjawab",
      "Total Soal",
      "Nilai Akhir",
      "Status Kelulusan",
    ];

    const rows = pesertaList.map((p, idx) => [
      idx + 1,
      `"${p.nomor_peserta}"`,
      `"${p.nama_peserta.replace(/"/g, '""')}"`,
      p.status_presensi,
      p.status_ujian,
      p.soal_terjawab,
      p.total_soal,
      p.nilai_akhir !== undefined && p.nilai_akhir !== null
        ? p.nilai_akhir.toFixed(2)
        : "-",
      p.is_lulus === true
        ? "LULUS"
        : p.is_lulus === false
          ? "TIDAK LULUS"
          : "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `rekap_cbt_${streamData?.nama_sesi || "sesi"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalHadir = streamData?.total_hadir ?? (streamData as any)?.hadir ?? 0;
  const totalSedangMengerjakan =
    streamData?.total_sedang_mengerjakan ??
    (streamData as any)?.sedang_mengerjakan ??
    0;
  const totalSelesai =
    streamData?.total_selesai ?? (streamData as any)?.selesai ?? 0;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/admin/cbt/sesi"
              className="text-slate-400 hover:text-biru-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-xs font-semibold text-biru-800 uppercase tracking-wider">
              Ruang Pengawasan CBT
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  sseConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span className="text-slate-500 font-mono text-[11px]">
                {sseConnected ? "SSE Aktif" : "Polling Aktif"}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-serif font-bold text-biru-950">
            {streamData?.nama_sesi || "Live Monitoring Peserta Ujian"}
          </h1>
          <p className="text-sm text-slate-500">
            Pantau progres jawaban, sisa waktu hitung mundur, dan rekap
            kehadiran serta nilai seleksi PMB secara waktu-nyata.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle View Cards vs Table */}
          <div className="flex items-center border border-slate-300 rounded-lg p-0.5 bg-slate-100">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === "cards"
                  ? "bg-white text-biru-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Tampilan Grid Kartu"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kartu</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === "table"
                  ? "bg-white text-biru-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Tampilan Tabel Rekap"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabel Rekap</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={pesertaList.length === 0}
            className="text-xs border-slate-300 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor</span> CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs border-slate-300 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak</span>
          </Button>

          <Link to={`/admin/cbt/presensi?sesi_id=${id}`}>
            <Button
              variant="primary"
              size="sm"
              className="text-xs bg-biru-600 hover:bg-biru-700 text-white"
            >
              Meja Presensi
            </Button>
          </Link>
        </div>
      </div>

      {/* Counter Ringkasan Metrik */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Peserta
          </p>
          <p className="text-2xl font-bold text-biru-950 mt-1">
            {streamData?.total_peserta || 0}
          </p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Hadir di Ruangan
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {totalHadir}
          </p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Sedang Mengerjakan
          </p>
          <p className="text-2xl font-bold text-biru-600 mt-1">
            {totalSedangMengerjakan}
          </p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Selesai Ujian
          </p>
          <p className="text-2xl font-bold text-biru-950 mt-1">
            {totalSelesai}
          </p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { key: "ALL", label: "Semua Peserta" },
              { key: "SEDANG_MENGERJAKAN", label: "Sedang Mengerjakan" },
              { key: "SELESAI", label: "Selesai" },
              { key: "BELUM_HADIR", label: "Belum Hadir" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterStatus === tab.key
                    ? "bg-biru-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama / nomor peserta..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-biru-600"
            />
          </div>
        </div>
      </Card>

      {/* Konten Utama: Grid Kartu atau Tabel Rekap */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredList.length === 0 ? (
        <EmptyState
          title="Tidak Ada Peserta Sesuai Filter"
          description="Tidak ditemukan peserta dengan kriteria yang dipilih."
        />
      ) : viewMode === "cards" ? (
        /* TAMPILAN 1: GRID KARTU LIVE MONITOR */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((p) => {
            const isWorking = p.status_ujian === "SEDANG_MENGERJAKAN";
            const isDone =
              p.status_ujian === "SELESAI" || p.status_ujian === "WAKTU_HABIS";
            const percent =
              p.total_soal > 0
                ? Math.round((p.soal_terjawab / p.total_soal) * 100)
                : 0;

            return (
              <Card
                key={p.id}
                className={`p-4 bg-white border transition-all shadow-sm ${
                  isWorking
                    ? "border-biru-400 ring-1 ring-biru-300"
                    : isDone
                      ? "border-emerald-300"
                      : "border-slate-200"
                }`}
              >
                {/* Header Card Peserta */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h4 className="font-semibold text-biru-950 text-sm truncate max-w-[200px]">
                      {p.nama_peserta}
                    </h4>
                    <p className="font-mono text-xs text-slate-400">
                      {p.nomor_peserta}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isWorking
                        ? "bg-biru-100 text-biru-800 animate-pulse"
                        : isDone
                          ? "bg-emerald-100 text-emerald-800"
                          : p.status_presensi === "HADIR"
                            ? "bg-biru-50 text-biru-700"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {p.status_ujian === "SEDANG_MENGERJAKAN"
                      ? "MENGERJAKAN"
                      : p.status_ujian === "BELUM_MULAI" &&
                          p.status_presensi === "HADIR"
                        ? "SIAP MULAI"
                        : p.status_ujian}
                  </span>
                </div>

                {/* Progress Bar Soal Terjawab */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Progres Jawaban:</span>
                    <span className="font-semibold text-biru-950">
                      {p.soal_terjawab}/{p.total_soal} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isDone ? "bg-emerald-500" : "bg-biru-600"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Footer Card: Timer & Skor */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono font-medium">
                      {isWorking
                        ? formatTimer(p.sisa_detik)
                        : isDone
                          ? "Selesai"
                          : "-"}
                    </span>
                  </div>

                  {isDone && p.nilai_akhir !== undefined && (
                    <div className="font-semibold text-xs">
                      Nilai:{" "}
                      <span
                        className={
                          p.is_lulus ? "text-emerald-700" : "text-rose-600"
                        }
                      >
                        {p.nilai_akhir.toFixed(1)}{" "}
                        {p.is_lulus ? "(LULUS)" : "(TIDAK)"}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TAMPILAN 2: TABEL REKAP PRESENSI & NILAI CBT */
        <Card className="p-5 bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-12">No</th>
                  <th className="py-2.5 px-3">Nomor Peserta</th>
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">Presensi</th>
                  <th className="py-2.5 px-3">Status Ujian</th>
                  <th className="py-2.5 px-3 text-center">Progres Soal</th>
                  <th className="py-2.5 px-3 text-center">Sisa Waktu</th>
                  <th className="py-2.5 px-3 text-right">Nilai Akhir</th>
                  <th className="py-2.5 px-3 text-center">Status Kelulusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredList.map((p, idx) => {
                  const isHadir = p.status_presensi === "HADIR";
                  const isDone =
                    p.status_ujian === "SELESAI" ||
                    p.status_ujian === "WAKTU_HABIS";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-biru-950">
                        {p.nomor_peserta}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {p.nama_peserta}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isHadir
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {p.status_presensi}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {p.status_ujian}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {p.soal_terjawab}/{p.total_soal}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {p.status_ujian === "SEDANG_MENGERJAKAN"
                          ? formatTimer(p.sisa_detik)
                          : isDone
                            ? "Selesai"
                            : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {p.nilai_akhir !== undefined && p.nilai_akhir !== null
                          ? p.nilai_akhir.toFixed(2)
                          : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {p.is_lulus === true ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            LULUS
                          </span>
                        ) : p.is_lulus === false ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            TIDAK LULUS
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
