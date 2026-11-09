import React from "react";
import {
  LABEL_STATUS_TAHAP,
  rentangTanggal,
  type TahapGelombang,
} from "../../lib/gelombangTahap";

interface Props {
  tahap: TahapGelombang[];
  /** Tampilan untuk latar gelap (kartu hitung mundur di beranda) */
  gelap?: boolean;
}

/** Daftar tahap pendaftaran. Tahap yang sudah ditutup tetap tampil tetapi redup. */
export const DaftarTahapRingkas: React.FC<Props> = ({ tahap, gelap }) => (
  <ul className="space-y-1.5" aria-label="Tahap pendaftaran">
    {tahap.map((t) => {
      const tutup = t.status === "BERAKHIR";
      const buka = t.status === "DIBUKA";
      return (
        <li
          key={t.id}
          data-status={t.status}
          className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs border ${
            gelap
              ? buka
                ? "bg-biru-500/20 border-biru-400/50 text-putih"
                : "bg-biru-950/50 border-biru-800 text-biru-300"
              : buka
                ? "bg-biru-50 border-biru-300 text-biru-950"
                : "bg-putih border-biru-100 text-biru-700"
          } ${tutup ? "opacity-60" : ""}`}
        >
          <span className="min-w-0">
            <strong className="font-bold">{t.nama}</strong>
            <span className="block text-[11px] opacity-90">
              {rentangTanggal(t.tgl_mulai, t.tgl_selesai)}
            </span>
          </span>
          <span
            className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              buka
                ? gelap
                  ? "bg-putih text-biru-900"
                  : "bg-biru-700 text-putih"
                : gelap
                  ? "bg-biru-900 text-biru-300"
                  : "bg-biru-100 text-biru-800"
            }`}
          >
            {LABEL_STATUS_TAHAP[t.status]}
          </span>
        </li>
      );
    })}
  </ul>
);
