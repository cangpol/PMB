import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  QrCode,
  CheckCircle2,
  Search,
  UserCheck,
  Building2,
  RotateCw,
} from "lucide-react";
import { Button, Card } from "../../../components/common";
import { fetchApi, type ApiError } from "@/services/api";
import { useToast } from "@/components/ui/useToast";
import type { components } from "@/types/api";

type SesiUjian = components["schemas"]["SesiUjian"];
type PresensiCheckInResponse = components["schemas"]["PresensiCheckInResponse"];
type LivePesertaItem = components["schemas"]["LivePesertaStatusItem"];
type LiveStreamResponse = components["schemas"]["LiveMonitorStreamResponse"];

export const PresensiCbtPage: React.FC = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSesiId = searchParams.get("sesi_id") || "";

  const [sesiList, setSesiList] = useState<SesiUjian[]>([]);
  const [selectedSesiId, setSelectedSesiId] = useState<string>(initialSesiId);

  // Input Check-in
  const [scanInput, setScanInput] = useState<string>("");
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [lastCheckIn, setLastCheckIn] =
    useState<PresensiCheckInResponse | null>(null);

  // Daftar Peserta Sesi Terpilih
  const [pesertaList, setPesertaList] = useState<LivePesertaItem[]>([]);
  const [filterSearch, setFilterSearch] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Sesi Ujian Aktif
  const loadSesiList = useCallback(async () => {
    try {
      const res = await fetchApi<SesiUjian[]>("/api/cbt/admin/sesi");
      setSesiList(res);
      if (res.length > 0 && !selectedSesiId) {
        setSelectedSesiId(res[0].id);
        setSearchParams({ sesi_id: res[0].id });
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Gagal Memuat Sesi",
        description: apiErr.pesan || "Terjadi kesalahan.",
        type: "error",
      });
    }
  }, [selectedSesiId, setSearchParams, toast]);

  useEffect(() => {
    loadSesiList();
  }, [loadSesiList]);

  // 2. Fetch Daftar Peserta pada Sesi yang Dipilih
  const loadPesertaSesi = useCallback(async () => {
    if (!selectedSesiId) return;
    try {
      // Panggil snapshot REST endpoint untuk mendapatkan rekap peserta sesi
      const res = await fetchApi<LiveStreamResponse>(
        `/api/cbt/admin/sesi/${selectedSesiId}/snapshot`,
      );

      if (res && res.peserta) {
        setPesertaList(res.peserta);
      }
    } catch {
      // Fallback silent jika belum ada data
    }
  }, [selectedSesiId]);

  useEffect(() => {
    loadPesertaSesi();
  }, [loadPesertaSesi]);

  // Auto focus input scanner
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 3. Proses Check-in
  const handleCheckIn = async (
    e?: React.FormEvent,
    identifierOverride?: string,
  ) => {
    if (e) e.preventDefault();
    const identifier = (identifierOverride || scanInput).trim();

    if (!identifier) {
      toast({
        title: "Input Kosong",
        description: "Silakan scan kode QR atau ketikkan nomor peserta.",
        type: "error",
      });
      return;
    }

    try {
      setIsCheckingIn(true);
      const res = await fetchApi<PresensiCheckInResponse>(
        "/api/cbt/admin/presensi/check-in",
        {
          method: "POST",
          body: JSON.stringify({
            nomor_peserta_atau_qr: identifier,
            identifier,
            sesi_id: selectedSesiId || undefined,
          }),
        },
      );

      setLastCheckIn(res);
      setScanInput("");
      toast({
        title: "Presensi Berhasil ✓",
        description: `${res.nama_peserta} (${res.nomor_peserta}) telah dicatat HADIR.`,
      });

      // Refresh list peserta
      loadPesertaSesi();

      // Kembalikan fokus ke input untuk peserta berikutnya
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Check-in Gagal",
        description:
          apiErr.pesan ||
          "Peserta tidak ditemukan atau tidak terdaftar di sesi ini.",
        type: "error",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const selectedSesiObj = sesiList.find((s) => s.id === selectedSesiId);

  // Filter peserta di tabel
  const filteredPeserta = pesertaList.filter((p) => {
    if (!filterSearch) return true;
    const q = filterSearch.toLowerCase();
    return (
      p.nama_peserta.toLowerCase().includes(q) ||
      p.nomor_peserta.toLowerCase().includes(q)
    );
  });

  const totalHadir = pesertaList.filter(
    (p) => p.status_presensi === "HADIR",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-biru-950">
          Meja Presensi Pengawas CBT
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Scan QR Code kartu peserta atau masukkan nomor peserta secara manual
          untuk membuka akses ujian.
        </p>
      </div>

      {/* Sesi Selector & Stat Bar */}
      <Card className="p-4 bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Building2 className="w-5 h-5 text-biru-600 shrink-0" />
          <div className="w-full sm:w-80">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase">
              Pilih Sesi Ujian Aktif:
            </label>
            <select
              value={selectedSesiId}
              onChange={(e) => {
                setSelectedSesiId(e.target.value);
                setSearchParams({ sesi_id: e.target.value });
              }}
              className="w-full mt-1 px-3 py-1.5 text-sm font-semibold text-biru-950 rounded-lg border border-slate-300 focus:ring-2 focus:ring-biru-600 bg-white"
            >
              {sesiList.map((sesi) => (
                <option key={sesi.id} value={sesi.id}>
                  {sesi.nama_sesi} ({sesi.ruang} - Kuota {sesi.kuota})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-6 w-full sm:w-auto justify-end text-sm">
          <div>
            <span className="text-xs text-slate-500 block">Total Peserta:</span>
            <span className="font-bold text-biru-950 text-base">
              {pesertaList.length}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Sudah Hadir:</span>
            <span className="font-bold text-emerald-700 text-base">
              {totalHadir}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Belum Hadir:</span>
            <span className="font-bold text-slate-500 text-base">
              {pesertaList.length - totalHadir}
            </span>
          </div>
        </div>
      </Card>

      {/* Scan & Check-in Console */}
      <Card className="p-6 bg-biru-950 text-white rounded-2xl shadow-md border border-biru-900">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-biru-900 text-biru-200 rounded-full text-xs font-semibold">
            <QrCode className="w-4 h-4 text-emerald-400" />
            Scanner Barcode / QR Siap Menerima Input
          </div>

          <h2 className="text-xl font-serif font-bold text-white">
            Pindai QR Kartu Peserta
          </h2>
          <p className="text-xs text-biru-200">
            Arahkan barcode scanner fisik ke QR Code kartu atau ketikkan Nomor
            Peserta / Pendaftaran di bawah.
          </p>

          <form
            onSubmit={handleCheckIn}
            className="flex gap-2 max-w-lg mx-auto"
          >
            <input
              ref={inputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scan QR atau ketik CBT-2026-XXXX..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-biru-900/80 border border-biru-700 text-white placeholder-biru-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono text-sm"
              disabled={isCheckingIn}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={isCheckingIn || !scanInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-xl flex items-center gap-2"
            >
              {isCheckingIn ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserCheck className="w-4 h-4" /> Check-in
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Banner Peserta Terakhir Check-in */}
        {lastCheckIn && (
          <div className="mt-6 pt-6 border-t border-biru-900 max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-emerald-950/80 border border-emerald-600/50 p-4 rounded-xl flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">
                    {lastCheckIn.nama_peserta}
                  </p>
                  <p className="font-mono text-xs text-emerald-300">
                    No: {lastCheckIn.nomor_peserta} • Metode:{" "}
                    {lastCheckIn.metode_presensi}
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/30 text-emerald-200 font-semibold">
                AKSES DIBUKA ✓
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Tabel Daftar Peserta Sesi Ini */}
      <Card className="p-5 bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <h3 className="font-semibold text-biru-950 text-sm">
            Daftar Peserta di {selectedSesiObj?.nama_sesi || "Sesi Ujian"}
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Cari nama atau nomor..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-biru-600"
            />
          </div>
        </div>

        {filteredPeserta.length === 0 ? (
          <p className="text-center py-8 text-xs text-slate-400">
            Belum ada data peserta yang terdaftar pada sesi ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Nomor Peserta</th>
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">Status Presensi</th>
                  <th className="py-2.5 px-3">Status Ujian</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPeserta.map((peserta) => {
                  const isHadir = peserta.status_presensi === "HADIR";
                  return (
                    <tr key={peserta.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-biru-950">
                        {peserta.nomor_peserta}
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        {peserta.nama_peserta}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isHadir
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {peserta.status_presensi}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[11px] font-mono text-slate-500">
                          {peserta.status_ujian}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {!isHadir ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleCheckIn(undefined, peserta.nomor_peserta)
                            }
                            className="text-xs py-1 px-2.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                          >
                            Tandai Hadir
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold">
                            ✓ Terverifikasi
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
