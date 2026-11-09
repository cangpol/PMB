import React, { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock, History, Monitor, School } from "lucide-react";
import { Card } from "../common";
import { fetchApi, type ApiError } from "@/services/api";
import type { components } from "@/types/api";

export type RiwayatCbtItem = components["schemas"]["RiwayatCbtItem"];

const WIB = "Asia/Jakarta";

/** "Sabtu, 7 November 2026" (zona WIB). */
export const formatHariTanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: WIB,
  });

/** "08.30" (zona WIB). */
export const formatJam = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: WIB,
  });

/** "1 jam 5 menit" / "42 menit" / "30 detik". */
export const formatDurasi = (detik: number) => {
  if (detik < 60) return `${Math.max(0, detik)} detik`;
  const jam = Math.floor(detik / 3600);
  const menit = Math.floor((detik % 3600) / 60);
  return jam > 0 ? `${jam} jam ${menit} menit` : `${menit} menit`;
};

const LABEL_STATUS: Record<string, string> = {
  MENUNGGU: "Belum dikerjakan",
  SEDANG_MENGERJAKAN: "Sedang dikerjakan",
  SELESAI: "Selesai",
  WAKTU_HABIS: "Waktu habis",
};

const RiwayatBaris: React.FC<{ r: RiwayatCbtItem }> = ({ r }) => {
  const dinilai = r.nilai_akhir !== null && r.nilai_akhir !== undefined;
  const waktuAcuan = r.waktu_mulai ?? r.jadwal_mulai;

  return (
    <li className="p-4 rounded-2xl border border-biru-100 bg-putih flex flex-col sm:flex-row gap-4 sm:items-center">
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="font-bold text-biru-950 text-sm truncate">
          {r.nama_sesi}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-biru-900">
          <CalendarDays className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {formatHariTanggal(waktuAcuan)}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-biru-900">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {r.waktu_mulai ? (
            <>
              Mulai {formatJam(r.waktu_mulai)}
              {r.waktu_selesai && (
                <> · Selesai {formatJam(r.waktu_selesai)}</>
              )}{" "}
              WIB
              {r.durasi_detik != null && (
                <span className="text-biru-700/80">
                  {" "}
                  ({formatDurasi(r.durasi_detik)})
                </span>
              )}
            </>
          ) : (
            <>
              Jadwal {formatJam(r.jadwal_mulai)}–{formatJam(r.jadwal_selesai)}{" "}
              WIB
            </>
          )}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-biru-700/80">
          {r.mode === "ONLINE" ? (
            <Monitor className="w-3.5 h-3.5 shrink-0" aria-hidden />
          ) : (
            <School className="w-3.5 h-3.5 shrink-0" aria-hidden />
          )}
          {r.mode === "ONLINE" ? "Online" : `Luring · ${r.ruang}`} ·{" "}
          {LABEL_STATUS[r.status_ujian] ?? r.status_ujian}
          {r.jumlah_pelanggaran > 0 && (
            <span className="text-rose-700">
              {" "}
              · {r.jumlah_pelanggaran} pelanggaran tercatat
            </span>
          )}
        </p>
      </div>

      <div className="sm:text-right shrink-0">
        {dinilai ? (
          <p className="max-w-[14rem] text-xs font-semibold text-biru-800 sm:ml-auto">
            Nilai CBT akan kami nilai dulu oleh admin
          </p>
        ) : (
          <p className="text-xs text-biru-700/80">Belum selesai</p>
        )}
      </div>
    </li>
  );
};

interface Props {
  /** Ubah nilai ini untuk memuat ulang riwayat (mis. setelah submit). */
  muatUlangKey?: unknown;
}

/** Riwayat pengerjaan CBT calon: hari, tanggal, jam, dan skor. */
export const RiwayatCbtCard: React.FC<Props> = ({ muatUlangKey }) => {
  const [items, setItems] = useState<RiwayatCbtItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const muat = useCallback(async () => {
    try {
      setError(null);
      setItems(await fetchApi<RiwayatCbtItem[]>("/api/cbt/riwayat"));
    } catch (err: unknown) {
      setError((err as ApiError).pesan || "Gagal memuat riwayat ujian.");
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat, muatUlangKey]);

  return (
    <Card className="p-5 sm:p-6 border border-biru-200 rounded-2xl space-y-4 text-left">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-biru-800" aria-hidden />
        <h2 className="font-serif font-bold text-lg text-biru-950">
          Riwayat Pengerjaan CBT
        </h2>
      </div>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      {!error && items === null && (
        <p className="text-sm text-biru-800">Memuat riwayat…</p>
      )}
      {items && items.length === 0 && (
        <p className="text-sm text-biru-800">
          Belum ada riwayat. Riwayat dan skor tampil di sini setelah Anda
          mengerjakan ujian.
        </p>
      )}
      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((r) => (
            <RiwayatBaris key={r.peserta_sesi_id} r={r} />
          ))}
        </ul>
      )}
    </Card>
  );
};
