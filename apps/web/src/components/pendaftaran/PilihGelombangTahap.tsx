import React from "react";
import { CalendarClock } from "lucide-react";
import {
  LABEL_STATUS_TAHAP,
  rentangTanggal,
  statusGelombang,
  tanggalWib,
  type GelombangBertahap,
  type GelombangPublik,
  type StatusTahap,
  type TahapGelombang,
} from "../../lib/gelombangTahap";

interface Props {
  daftar: GelombangBertahap[];
  gelombangId: string;
  tahapId: string;
  onChange: (gelombangId: string, tahapId: string) => void;
}

const WARNA_STATUS: Record<StatusTahap, string> = {
  DIBUKA: "bg-biru-700 text-putih",
  BERAKHIR: "bg-biru-100 text-biru-800",
  BELUM_DIBUKA: "bg-biru-50 text-biru-800 border border-biru-300",
};

/**
 * Pilihan gelombang & tahap pendaftaran. Tahap yang sudah ditutup (atau belum dibuka) tetap
 * tampil tetapi tidak bisa diklik; pendaftaran dilanjutkan pada tahap yang sedang dibuka.
 */
export const PilihGelombangTahap: React.FC<Props> = ({
  daftar,
  gelombangId,
  tahapId,
  onChange,
}) => {
  const kartu = (
    key: string,
    judul: string,
    keterangan: string,
    status: StatusTahap,
    terpilih: boolean,
    aktif: boolean,
    onPilih: () => void,
    catatan?: string,
  ) => (
    <label
      key={key}
      aria-disabled={!aktif}
      className={`flex items-start gap-3 p-3.5 rounded-2xl border transition ${
        aktif ? "cursor-pointer" : "cursor-not-allowed opacity-60"
      } ${
        terpilih
          ? "border-biru-700 bg-biru-50"
          : aktif
            ? "border-biru-200 hover:border-biru-400"
            : "border-biru-200 bg-biru-50/40"
      }`}
    >
      <input
        type="radio"
        name="gelombang-tahap"
        className="mt-1 accent-biru-700"
        checked={terpilih}
        disabled={!aktif}
        onChange={() => {
          // Tahap yang ditutup / belum dibuka tidak pernah dapat dipilih
          if (aktif) onPilih();
        }}
      />
      <span className="flex-1 min-w-0 space-y-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-biru-950">{judul}</span>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${WARNA_STATUS[status]}`}
          >
            {LABEL_STATUS_TAHAP[status]}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-biru-800">
          <CalendarClock className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {keterangan}
        </span>
        {catatan && (
          <span className="block text-[11px] text-biru-700">{catatan}</span>
        )}
      </span>
    </label>
  );

  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-bold text-biru-950 uppercase tracking-wider mb-2">
        Gelombang & tahap pendaftaran *
      </legend>
      {daftar.map((g) => {
        if (!g.tahap?.length) {
          // Gelombang tanpa tahap: status mengikuti tanggalnya (Gelombang 2/3 belum mulai = tidak bisa dipilih)
          const sg =
            g.tgl_mulai && g.tgl_selesai
              ? statusGelombang(g as GelombangPublik)
              : "AKTIF";
          const status: StatusTahap =
            sg === "AKTIF"
              ? "DIBUKA"
              : sg === "MENDATANG"
                ? "BELUM_DIBUKA"
                : "BERAKHIR";
          return kartu(
            g.id,
            g.nama_gelombang,
            g.tgl_mulai && g.tgl_selesai
              ? rentangTanggal(
                  tanggalWib(g.tgl_mulai),
                  tanggalWib(g.tgl_selesai),
                )
              : "Pendaftaran dibuka",
            status,
            gelombangId === g.id,
            status === "DIBUKA",
            () => onChange(g.id, ""),
            status === "BERAKHIR"
              ? "Gelombang ini sudah ditutup."
              : status === "BELUM_DIBUKA"
                ? "Belum dibuka. Dapat dipilih setelah tanggal pembukaan."
                : undefined,
          );
        }
        const ada = g.tahap;
        return (
          <div key={g.id} className="space-y-2">
            {daftar.length > 1 && (
              <p className="text-xs font-bold text-biru-900">
                {g.nama_gelombang}
              </p>
            )}
            {ada.map((t: TahapGelombang) =>
              kartu(
                t.id,
                `${g.nama_gelombang} — ${t.nama}`,
                rentangTanggal(t.tgl_mulai, t.tgl_selesai),
                t.status,
                tahapId === t.id,
                t.status === "DIBUKA",
                () => onChange(g.id, t.id),
                t.status === "BERAKHIR"
                  ? "Tahap ini sudah ditutup. Pendaftaran dilanjutkan pada tahap berikutnya."
                  : t.status === "BELUM_DIBUKA"
                    ? "Belum dibuka. Dapat dipilih setelah tanggal pembukaan."
                    : undefined,
              ),
            )}
          </div>
        );
      })}
    </fieldset>
  );
};
