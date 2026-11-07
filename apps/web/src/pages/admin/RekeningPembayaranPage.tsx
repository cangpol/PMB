import React, { useCallback, useEffect, useState } from "react";
import { Building2, QrCode, Plus, Save, Upload } from "lucide-react";
import {
  Button,
  Card,
  CardSkeleton,
  ErrorState,
} from "../../components/common";
import { fetchApi } from "@/services/api";
import { useToast } from "@/components/ui/useToast";
import type { components } from "@/types/api";

type Rekening = components["schemas"]["RekeningPembayaran"] & {
  qris_image_key?: string | null;
};

interface Draft {
  id?: string;
  jenis: "VA_MANDIRI" | "QRIS";
  nama_bank: string;
  nomor: string;
  atas_nama: string;
  qris_image_key: string | null;
  qris_image_url?: string | null;
  instruksi: string;
  is_active: boolean;
}

const kosong = (jenis: Draft["jenis"]): Draft => ({
  jenis,
  nama_bank: jenis === "VA_MANDIRI" ? "Bank Mandiri" : "QRIS",
  nomor: "",
  atas_nama: "Universitas Pignatelli Triputra",
  qris_image_key: null,
  instruksi: "",
  is_active: true,
});

const INPUT =
  "w-full px-3 py-2.5 rounded-xl border border-biru-200 text-sm text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600";

/** Pengaturan nomor VA Mandiri & gambar QRIS kampus untuk pembayaran manual PMB. */
export const RekeningPembayaranPage: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Rekening[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const muat = useCallback(async () => {
    try {
      setError(null);
      setItems(await fetchApi<Rekening[]>("/api/pembayaran/admin/rekening"));
    } catch (err: unknown) {
      setError((err as { pesan?: string }).pesan || "Gagal memuat rekening.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  const unggahQris = async (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast({
        title: "Format tidak didukung",
        description: "Gunakan PNG, JPG, atau WEBP.",
        variant: "error",
      });
      return;
    }
    try {
      const p = await fetchApi<{ upload_url: string; file_key: string }>(
        "/api/pembayaran/admin/rekening/qris/presign",
        { method: "POST", body: JSON.stringify({ file_name: file.name }) },
      );
      const put = await fetch(p.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Unggah gagal (HTTP ${put.status})`);
      setDraft((d) =>
        d
          ? {
              ...d,
              qris_image_key: p.file_key,
              qris_image_url: URL.createObjectURL(file),
            }
          : d,
      );
    } catch (err: unknown) {
      const e = err as { pesan?: string; message?: string };
      toast({
        title: "Gagal mengunggah QRIS",
        description: e.pesan || e.message,
        variant: "error",
      });
    }
  };

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    try {
      setSaving(true);
      const body = JSON.stringify({
        jenis: draft.jenis,
        nama_bank: draft.nama_bank,
        nomor: draft.jenis === "VA_MANDIRI" ? draft.nomor.trim() : null,
        atas_nama: draft.atas_nama,
        qris_image_key: draft.jenis === "QRIS" ? draft.qris_image_key : null,
        instruksi: draft.instruksi.trim() || null,
        is_active: draft.is_active,
      });
      await fetchApi(
        draft.id
          ? `/api/pembayaran/admin/rekening/${draft.id}`
          : "/api/pembayaran/admin/rekening",
        { method: draft.id ? "PUT" : "POST", body },
      );
      toast({
        title: "Tersimpan",
        description: "Rekening pembayaran diperbarui.",
        variant: "success",
      });
      setDraft(null);
      await muat();
    } catch (err: unknown) {
      const e2 = err as { pesan?: string; detail?: string[] };
      toast({
        title: "Gagal menyimpan",
        description: e2.detail?.join(", ") || e2.pesan,
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CardSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-biru-800 uppercase tracking-wider">
            Keuangan & Tagihan
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-1">
            Rekening VA Mandiri & QRIS
          </h1>
          <p className="text-xs sm:text-sm text-biru-800/80 mt-1">
            Ditampilkan kepada calon di halaman pembayaran formulir, daftar
            ulang, dan surat penerimaan.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setDraft(kosong("VA_MANDIRI"))}
          >
            <Plus className="w-4 h-4" /> VA Mandiri
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setDraft(kosong("QRIS"))}
          >
            <Plus className="w-4 h-4" /> QRIS
          </Button>
        </div>
      </div>

      {error && (
        <ErrorState title="Gagal Memuat" message={error} onRetry={muat} />
      )}

      {items.length === 0 && !draft && (
        <Card className="p-6 border-biru-200 rounded-2xl text-sm text-biru-900">
          Belum ada rekening. Calon tidak dapat membayar sampai minimal satu VA
          Mandiri atau QRIS aktif ditambahkan.
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((r) => (
          <Card
            key={r.id}
            className={`p-5 border-biru-200 rounded-2xl space-y-2 ${r.is_active ? "" : "opacity-60"}`}
          >
            <div className="flex items-center gap-2">
              {r.jenis === "QRIS" ? (
                <QrCode className="w-5 h-5 text-biru-800" />
              ) : (
                <Building2 className="w-5 h-5 text-biru-800" />
              )}
              <h2 className="font-bold text-biru-950">
                {r.jenis === "QRIS" ? "QRIS" : r.nama_bank}
              </h2>
              <span className="ml-auto text-[11px] font-bold text-biru-700">
                {r.is_active ? "AKTIF" : "NONAKTIF"}
              </span>
            </div>
            {r.nomor && (
              <p className="font-mono text-lg font-bold text-biru-950">
                {r.nomor}
              </p>
            )}
            {r.qris_image_url && (
              <img
                src={r.qris_image_url}
                alt="QRIS"
                className="w-32 h-32 object-contain border border-biru-200 rounded-lg"
              />
            )}
            <p className="text-xs text-biru-800">a.n. {r.atas_nama}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft({
                  id: r.id,
                  jenis: r.jenis as Draft["jenis"],
                  nama_bank: r.nama_bank,
                  nomor: r.nomor ?? "",
                  atas_nama: r.atas_nama,
                  qris_image_key: r.qris_image_key ?? null,
                  qris_image_url: r.qris_image_url,
                  instruksi: r.instruksi ?? "",
                  is_active: r.is_active,
                })
              }
            >
              Ubah
            </Button>
          </Card>
        ))}
      </div>

      {draft && (
        <Card className="p-6 border-biru-700 rounded-2xl">
          <form onSubmit={simpan} className="space-y-4">
            <h2 className="font-serif font-bold text-lg text-biru-950">
              {draft.id ? "Ubah" : "Tambah"}{" "}
              {draft.jenis === "QRIS" ? "QRIS" : "VA Mandiri"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {draft.jenis === "VA_MANDIRI" && (
                <label className="space-y-1 text-xs text-biru-900">
                  <span className="font-semibold">Nomor Virtual Account</span>
                  <input
                    className={`${INPUT} font-mono`}
                    value={draft.nomor}
                    onChange={(e) =>
                      setDraft({ ...draft, nomor: e.target.value })
                    }
                    inputMode="numeric"
                    required
                  />
                </label>
              )}
              <label className="space-y-1 text-xs text-biru-900">
                <span className="font-semibold">Atas nama</span>
                <input
                  className={INPUT}
                  value={draft.atas_nama}
                  onChange={(e) =>
                    setDraft({ ...draft, atas_nama: e.target.value })
                  }
                  required
                />
              </label>
            </div>
            {draft.jenis === "QRIS" && (
              <div className="space-y-2">
                {draft.qris_image_url && (
                  <img
                    src={draft.qris_image_url}
                    alt="Pratinjau QRIS"
                    className="w-40 h-40 object-contain border border-biru-200 rounded-lg"
                  />
                )}
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-biru-950 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {draft.qris_image_key
                    ? "Ganti gambar QRIS"
                    : "Unggah gambar QRIS"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.currentTarget.files?.[0];
                      if (f) unggahQris(f);
                    }}
                  />
                </label>
              </div>
            )}
            <label className="block space-y-1 text-xs text-biru-900">
              <span className="font-semibold">
                Instruksi pembayaran (opsional)
              </span>
              <textarea
                className={INPUT}
                rows={3}
                value={draft.instruksi}
                onChange={(e) =>
                  setDraft({ ...draft, instruksi: e.target.value })
                }
                placeholder="Contoh: Livin' by Mandiri > Bayar > Pendidikan > masukkan nomor VA"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-biru-900">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) =>
                  setDraft({ ...draft, is_active: e.target.checked })
                }
                className="accent-biru-700"
              />
              Aktif (tampil ke calon)
            </label>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                className="gap-1.5"
              >
                <Save className="w-4 h-4" />{" "}
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraft(null)}
              >
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default RekeningPembayaranPage;
