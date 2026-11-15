import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, History } from "lucide-react";

export interface VersiBiaya {
  id: string;
  berlaku_dari: string;
  berlaku_sampai: string;
  keterangan?: string | null;
  jumlah_prodi: number;
}

const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Unduhan biaya kuliah periode sebelumnya. Arsip dibuat otomatis saat biaya diubah dan hanya
 * tersedia 1 tahun ke belakang; bagian ini tersembunyi bila belum ada arsip.
 */
export const RiwayatBiayaKuliah: React.FC = () => {
  const { data } = useQuery<VersiBiaya[]>({
    queryKey: ["riwayat-biaya-kuliah"],
    queryFn: async () => {
      const res = await fetch("/api/master/rincian-biaya-kuliah/riwayat");
      if (!res.ok) throw new Error("gagal");
      return res.json();
    },
    staleTime: 10 * 60_000,
    retry: false,
  });
  if (!data || data.length === 0) return null;

  const tombol =
    "inline-flex items-center gap-1.5 rounded-lg border border-biru-200 bg-putih px-3 py-1.5 text-xs font-semibold text-biru-800 hover:bg-biru-50";

  return (
    <section
      aria-labelledby="riwayat-biaya"
      className="rounded-2xl border border-biru-200 bg-putih p-5 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-biru-100 text-biru-800 flex items-center justify-center">
          <History className="w-4 h-4" />
        </div>
        <div>
          <h2
            id="riwayat-biaya"
            className="font-serif text-lg font-bold text-biru-950"
          >
            Biaya Kuliah Tahun Sebelumnya
          </h2>
          <p className="text-xs text-biru-700">
            Unduh rincian biaya periode sebelumnya sebagai arsip. Hanya tersedia
            untuk 1 tahun terakhir.
          </p>
        </div>
      </div>
      <ul className="divide-y divide-biru-100">
        {data.map((v) => (
          <li
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-2 py-2.5"
          >
            <div>
              <p className="text-sm font-semibold text-biru-950">
                {v.keterangan && v.keterangan !== "Arsip otomatis"
                  ? v.keterangan
                  : `Berlaku ${tgl(v.berlaku_dari)} – ${tgl(v.berlaku_sampai)}`}
              </p>
              <p className="text-[11px] text-biru-600">
                Berlaku {tgl(v.berlaku_dari)} – {tgl(v.berlaku_sampai)} ·{" "}
                {v.jumlah_prodi} program studi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/api/master/rincian-biaya-kuliah/riwayat/${v.id}/pdf`}
                download
                className={tombol}
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </a>
              <a
                href={`/api/master/rincian-biaya-kuliah/riwayat/${v.id}/excel`}
                download
                className={tombol}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
