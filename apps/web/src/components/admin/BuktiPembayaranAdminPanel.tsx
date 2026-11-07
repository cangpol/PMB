import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Card, Button } from "../common";
import { fetchApi } from "../../services/api";
import { useDialog } from "@/components/ui/useDialog";
import type { components } from "@/types/api";

type BuktiItem = components["schemas"]["BuktiPembayaranItem"];
type ReviewResponse = components["schemas"]["ReviewBuktiResponse"];
type FilterStatus = "PENDING" | "DISETUJUI" | "DITOLAK" | "";
export type JenisTagihan = "FORMULIR" | "DAFTAR_ULANG_UKT" | "";

const LABEL_JENIS: Record<string, string> = {
  FORMULIR: "Formulir",
  DAFTAR_ULANG_UKT: "Daftar Ulang",
};
const LABEL_METODE: Record<string, string> = {
  VA_MANDIRI: "VA Mandiri",
  QRIS: "QRIS",
};

interface Props {
  /** Kunci panel ke satu jenis tagihan; kosong = tampilkan pilihan filter jenis */
  jenis?: JenisTagihan;
  judul?: string;
  onChanged?: () => void;
}

/**
 * Antrean verifikasi bukti pembayaran (VA Mandiri / QRIS) untuk admin PMB & keuangan.
 * Persetujuan melunasi tagihan dan memajukan tahap calon secara otomatis.
 */
export const BuktiPembayaranAdminPanel: React.FC<Props> = ({
  jenis: jenisTetap,
  judul = "Verifikasi Bukti Pembayaran",
  onChanged,
}) => {
  const [items, setItems] = useState<BuktiItem[]>([]);
  const [status, setStatus] = useState<FilterStatus>("PENDING");
  const [jenis, setJenis] = useState<JenisTagihan>(jenisTetap ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const dialog = useDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ status, jenis });
      setItems(await fetchApi<BuktiItem[]>(`/api/pembayaran/admin/bukti?${q}`));
    } catch (err: unknown) {
      setError((err as { pesan?: string }).pesan || "Gagal memuat bukti bayar");
    } finally {
      setLoading(false);
    }
  }, [status, jenis]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (it: BuktiItem, keputusan: "DISETUJUI" | "DITOLAK") => {
    const jenisLabel = LABEL_JENIS[it.jenis_tagihan] ?? it.jenis_tagihan;
    let catatan: string | undefined;
    if (keputusan === "DITOLAK") {
      const alasan = await dialog.masukkanAlasan({
        judul: "Tolak bukti pembayaran?",
        deskripsi: (
          <>
            Bukti pembayaran {jenisLabel} milik{" "}
            <strong className="text-biru-950">{it.nama_lengkap}</strong> akan
            ditolak. Alasan ini dikirim ke calon agar dapat mengunggah ulang.
          </>
        ),
        label: "Alasan penolakan",
        placeholder: "Contoh: nominal tidak sesuai tagihan atau bukti buram.",
        labelKirim: "Tolak Bukti",
        nada: "bahaya",
      });
      if (alasan === null) return;
      catatan = alasan;
    } else {
      const selisih =
        it.nominal_tagihan != null &&
        it.nominal_dibayar != null &&
        it.nominal_dibayar < it.nominal_tagihan;
      const ya = await dialog.konfirmasi({
        judul: selisih ? "Nominal kurang dari tagihan" : "Setujui pembayaran?",
        nada: selisih ? "bahaya" : "sukses",
        deskripsi: selisih ? (
          <>
            Nominal dibayar{" "}
            <strong className="text-biru-950">
              Rp {it.nominal_dibayar?.toLocaleString("id-ID")}
            </strong>{" "}
            kurang dari tagihan{" "}
            <strong className="text-biru-950">
              Rp {it.nominal_tagihan?.toLocaleString("id-ID")}
            </strong>
            . Tetap setujui pembayaran {it.nama_lengkap}?
          </>
        ) : (
          <>
            Pembayaran {jenisLabel} milik{" "}
            <strong className="text-biru-950">{it.nama_lengkap}</strong> akan
            dilunasi. Pastikan dana sudah masuk ke rekening kampus.
          </>
        ),
        labelYa: selisih ? "Ya, Tetap Setujui" : "Ya, Setujui",
      });
      if (!ya) return;
    }
    setBusyId(it.id);
    setError(null);
    try {
      const res = await fetchApi<ReviewResponse>(
        `/api/pembayaran/admin/bukti/${it.id}/review`,
        {
          method: "POST",
          body: JSON.stringify({ status: keputusan, catatan }),
        },
      );
      await load();
      onChanged?.();
      setBusyId(null);
      void dialog.hasil(
        keputusan === "DISETUJUI"
          ? {
              nada: "sukses",
              judul: "Pembayaran disetujui",
              deskripsi: res.pesan,
              rincian: [`${it.nama_lengkap} · ${jenisLabel}`],
              autoTutupMs: 3000,
            }
          : {
              nada: "ditolak",
              judul: "Bukti pembayaran ditolak",
              deskripsi: res.pesan,
              rincian: [
                `${it.nama_lengkap} · ${jenisLabel}`,
                `Alasan: ${catatan}`,
              ],
              autoTutupMs: 5000,
            },
      );
    } catch (err: unknown) {
      const e = err as { pesan?: string; detail?: string[] };
      setError(e.detail?.join(", ") || e.pesan || "Gagal memproses bukti");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="p-5 border-biru-200 bg-putih rounded-2xl shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif font-bold text-lg text-biru-950">
            {judul}
          </h2>
          <p className="text-xs text-biru-700">
            Cocokkan bukti dengan mutasi rekening kampus. Persetujuan otomatis
            melunasi tagihan dan membuka tahap berikutnya bagi calon.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {jenisTetap === undefined && (
            <select
              value={jenis}
              onChange={(e) => setJenis(e.target.value as JenisTagihan)}
              className="rounded-lg border border-biru-200 px-3 py-2 text-xs"
              aria-label="Filter jenis tagihan"
            >
              <option value="">Semua jenis</option>
              <option value="FORMULIR">Biaya formulir</option>
              <option value="DAFTAR_ULANG_UKT">Daftar ulang</option>
            </select>
          )}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as FilterStatus)}
            className="rounded-lg border border-biru-200 px-3 py-2 text-xs"
            aria-label="Filter status bukti bayar"
          >
            <option value="PENDING">Menunggu</option>
            <option value="DISETUJUI">Disetujui</option>
            <option value="DITOLAK">Ditolak</option>
            <option value="">Semua</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            className="gap-1"
            aria-label="Muat ulang"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-xs font-semibold text-rose-800" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-xs text-biru-700">Memuat...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-biru-700">Tidak ada bukti bayar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-biru-700 border-b border-biru-100">
                <th className="py-2 pr-3">Calon</th>
                <th className="py-2 pr-3">Jenis</th>
                <th className="py-2 pr-3">Tagihan / Dibayar</th>
                <th className="py-2 pr-3">Metode & Tanggal</th>
                <th className="py-2 pr-3">Bukti</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-biru-100">
              {items.map((it) => {
                const kurang =
                  it.nominal_tagihan != null &&
                  it.nominal_dibayar != null &&
                  it.nominal_dibayar < it.nominal_tagihan;
                return (
                  <tr key={it.id} className="align-top">
                    <td className="py-2 pr-3">
                      <p className="font-semibold text-biru-950">
                        {it.nama_lengkap}
                      </p>
                      <p className="text-biru-700 font-mono">
                        {it.nomor_pendaftaran}
                      </p>
                      {it.nomor_registrasi && (
                        <p className="text-biru-700 font-mono">
                          {it.nomor_registrasi}
                        </p>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {LABEL_JENIS[it.jenis_tagihan] ?? it.jenis_tagihan}
                      <span className="block text-biru-700 font-mono">
                        {it.nomor_tagihan}
                      </span>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className="block">
                        {it.nominal_tagihan != null
                          ? `Rp ${it.nominal_tagihan.toLocaleString("id-ID")}`
                          : "-"}
                      </span>
                      <span
                        className={`flex items-center gap-1 ${kurang ? "text-rose-700 font-bold" : "text-biru-700"}`}
                      >
                        {kurang && (
                          <AlertTriangle
                            className="w-3 h-3"
                            aria-label="Nominal kurang"
                          />
                        )}
                        {it.nominal_dibayar != null
                          ? `Rp ${it.nominal_dibayar.toLocaleString("id-ID")}`
                          : "-"}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {it.metode ? (LABEL_METODE[it.metode] ?? it.metode) : "-"}
                      <span className="block text-biru-700">
                        {it.tgl_bayar
                          ? new Date(it.tgl_bayar).toLocaleDateString("id-ID")
                          : "-"}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {it.download_url ? (
                        <a
                          href={it.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-biru-700 underline"
                        >
                          Lihat <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        it.file_name
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {it.status}
                      {it.catatan ? (
                        <span className="block text-biru-700">
                          {it.catatan}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2">
                      {it.status === "PENDING" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={busyId === it.id}
                            onClick={() => review(it, "DISETUJUI")}
                            className="gap-1"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === it.id}
                            onClick={() => review(it, "DITOLAK")}
                            className="gap-1"
                          >
                            <XCircle className="w-4 h-4" /> Tolak
                          </Button>
                        </div>
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
  );
};
