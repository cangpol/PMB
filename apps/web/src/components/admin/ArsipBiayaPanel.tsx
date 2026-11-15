import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Trash2 } from "lucide-react";
import { Button, Card } from "../common";
import { fetchApi, type ApiError } from "@/services/api";
import { useToast } from "@/components/ui/useToast";
import { useDialog } from "@/components/ui/useDialog";

interface Arsip {
  id: string;
  berlaku_dari: string;
  berlaku_sampai: string;
  keterangan: string | null;
  jumlah_prodi: number;
  lewat_batas: boolean;
}

const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** Arsipkan biaya kuliah saat ini secara manual, dan kelola daftar arsip. */
export const ArsipBiayaPanel: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const dialog = useDialog();
  const [keterangan, setKeterangan] = useState("");

  const { data: arsip = [] } = useQuery<Arsip[]>({
    queryKey: ["arsip-biaya-kuliah"],
    queryFn: () =>
      fetchApi("/api/admin/konfigurasi/rincian-biaya-kuliah/arsip"),
  });

  const segarkan = () => {
    void qc.invalidateQueries({ queryKey: ["arsip-biaya-kuliah"] });
    void qc.invalidateQueries({ queryKey: ["riwayat-biaya-kuliah"] });
  };
  const galat = (judul: string) => (e: unknown) =>
    toast({
      title: judul,
      description: (e as unknown as ApiError).pesan ?? "Terjadi kesalahan.",
      variant: "error",
    });

  const arsipkan = useMutation({
    mutationFn: () =>
      fetchApi("/api/admin/konfigurasi/rincian-biaya-kuliah/arsipkan", {
        method: "POST",
        body: JSON.stringify({ keterangan: keterangan.trim() || null }),
      }),
    onSuccess: () => {
      toast({
        title: "Biaya diarsipkan",
        description: "Biaya saat ini tersimpan sebagai arsip.",
        variant: "success",
      });
      setKeterangan("");
      segarkan();
    },
    onError: galat("Gagal mengarsipkan"),
  });

  const hapus = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/admin/konfigurasi/rincian-biaya-kuliah/arsip/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast({ title: "Arsip dihapus", variant: "success" });
      segarkan();
    },
    onError: galat("Gagal menghapus arsip"),
  });

  const klikArsipkan = async () => {
    const ya = await dialog.konfirmasi({
      judul: "Arsipkan biaya saat ini?",
      deskripsi:
        "Biaya kuliah semua program studi saat ini disimpan sebagai arsip dan dapat diunduh calon mahasiswa di halaman Biaya selama 1 tahun. Biaya yang berlaku tidak berubah.",
      labelYa: "Ya, Arsipkan",
    });
    if (ya) arsipkan.mutate();
  };

  const klikHapus = async (a: Arsip) => {
    const ya = await dialog.konfirmasi({
      judul: "Hapus arsip biaya?",
      deskripsi: `Arsip ${a.keterangan ?? `${tgl(a.berlaku_dari)} – ${tgl(a.berlaku_sampai)}`} akan dihapus dan tidak dapat diunduh lagi.`,
      nada: "bahaya",
      labelYa: "Ya, Hapus",
    });
    if (ya) hapus.mutate(a.id);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-56">
          <h2 className="font-serif text-lg font-bold text-biru-950">
            Arsip Biaya Kuliah
          </h2>
          <p className="text-xs text-biru-700">
            Biaya yang berubah <strong>tidak</strong> otomatis diarsipkan. Tekan{" "}
            <strong>Arsipkan</strong> untuk menyimpan biaya saat ini sebagai
            arsip (sebelum mengubah biaya untuk periode baru). Arsip dapat
            diunduh publik selama 1 tahun.
          </p>
        </div>
        <label className="block text-xs">
          <span className="font-semibold text-biru-900">
            Keterangan (opsional)
          </span>
          <input
            aria-label="Keterangan arsip"
            value={keterangan}
            maxLength={150}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Mis. Biaya T.A. 2025/2026"
            className="mt-1 block w-64 rounded-lg border border-biru-200 px-2.5 py-1.5"
          />
        </label>
        <Button
          size="sm"
          leftIcon={<Archive className="w-3.5 h-3.5" />}
          disabled={arsipkan.isPending}
          onClick={() => void klikArsipkan()}
        >
          Arsipkan
        </Button>
      </div>

      {arsip.length > 0 && (
        <ul className="divide-y divide-biru-100 text-xs">
          {arsip.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <div>
                <p className="font-semibold text-biru-950">
                  {a.keterangan ?? "Arsip biaya"}
                </p>
                <p className="text-biru-600">
                  Berlaku {tgl(a.berlaku_dari)} – {tgl(a.berlaku_sampai)} ·{" "}
                  {a.jumlah_prodi} program studi
                  {a.lewat_batas && " · melewati 1 tahun (tidak tampil publik)"}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Hapus arsip ${a.keterangan ?? tgl(a.berlaku_sampai)}`}
                onClick={() => void klikHapus(a)}
                className="p-1.5 rounded-lg border border-biru-200 text-biru-700 hover:bg-biru-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
