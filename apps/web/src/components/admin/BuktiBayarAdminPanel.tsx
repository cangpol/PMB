import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import { Card, Button } from "../common";
import { fetchApi } from "../../services/api";

interface BuktiBayar {
  id: string;
  nomor_pendaftaran: string;
  nomor_registrasi?: string | null;
  nama_lengkap: string;
  nominal?: number | null;
  file_name: string;
  status: "PENDING" | "DISETUJUI" | "DITOLAK";
  catatan?: string | null;
  created_at: string;
  download_url?: string | null;
}

type Filter = "PENDING" | "DISETUJUI" | "DITOLAK" | "";

export const BuktiBayarAdminPanel: React.FC<{ onChanged?: () => void }> = ({
  onChanged,
}) => {
  const [items, setItems] = useState<BuktiBayar[]>([]);
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<BuktiBayar[]>(
        `/api/kelulusan/admin/bukti-bayar?status=${filter}`,
      );
      setItems(data);
    } catch (err: unknown) {
      setError((err as { pesan?: string }).pesan || "Gagal memuat bukti bayar");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (it: BuktiBayar, status: "DISETUJUI" | "DITOLAK") => {
    let catatan: string | undefined;
    if (status === "DITOLAK") {
      const alasan = window.prompt("Alasan penolakan (wajib):");
      if (!alasan || !alasan.trim()) return;
      catatan = alasan.trim();
    } else if (
      !window.confirm(
        `Setujui pembayaran ${it.nama_lengkap}? NIM akan diterbitkan otomatis.`,
      )
    ) {
      return;
    }
    setBusyId(it.id);
    setInfo(null);
    try {
      const res = await fetchApi<{ pesan: string; nim_resmi?: string | null }>(
        `/api/kelulusan/admin/bukti-bayar/${it.id}/review`,
        { method: "POST", body: JSON.stringify({ status, catatan }) },
      );
      setInfo(res.nim_resmi ? `${res.pesan} NIM: ${res.nim_resmi}` : res.pesan);
      await load();
      onChanged?.();
    } catch (err: unknown) {
      setError((err as { pesan?: string }).pesan || "Gagal memproses");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="p-5 border-biru-200 bg-putih rounded-2xl shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif font-bold text-lg text-biru-950">
            Verifikasi Bukti Bayar Daftar Ulang
          </h2>
          <p className="text-xs text-biru-700">
            Setelah disetujui, tagihan lunas dan NIM terbit otomatis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="rounded-lg border border-biru-200 px-3 py-2 text-xs"
            aria-label="Filter status bukti bayar"
          >
            <option value="PENDING">Menunggu</option>
            <option value="DISETUJUI">Disetujui</option>
            <option value="DITOLAK">Ditolak</option>
            <option value="">Semua</option>
          </select>
          <Button variant="outline" size="sm" onClick={load} className="gap-1">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {info && (
        <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
          {info}
        </p>
      )}
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
                <th className="py-2 pr-3">No. Registrasi</th>
                <th className="py-2 pr-3">Nominal</th>
                <th className="py-2 pr-3">Bukti</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-biru-100">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="py-2 pr-3">
                    <p className="font-semibold text-biru-950">
                      {it.nama_lengkap}
                    </p>
                    <p className="text-biru-700">{it.nomor_pendaftaran}</p>
                  </td>
                  <td className="py-2 pr-3 font-semibold">
                    {it.nomor_registrasi || "-"}
                  </td>
                  <td className="py-2 pr-3">
                    {it.nominal
                      ? `Rp ${it.nominal.toLocaleString("id-ID")}`
                      : "-"}
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
                      <span className="block text-biru-700">{it.catatan}</span>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
