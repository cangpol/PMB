import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import { Button } from "../common";
import { fetchApi, type ApiError } from "@/services/api";
import { useToast } from "@/components/ui/useToast";

interface JalurPublik {
  id: string;
  kode_jalur: string;
  nama_jalur: string;
}

export interface CalonPindah {
  pendaftar_id: string;
  nama_lengkap: string;
  nama_jalur: string;
  kode_jalur: string;
}

interface Props {
  calon: CalonPindah | null;
  /** Alasan awal (mis. rapor di bawah syarat), dapat diubah admin */
  alasanAwal?: string;
  onClose: () => void;
}

/** Pindahkan calon ke jalur lain saat tidak memenuhi persyaratan jalur semula. */
export const PindahJalurSeleksiDialog: React.FC<Props> = ({
  calon,
  alasanAwal = "",
  onClose,
}) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [jalurId, setJalurId] = useState("");
  const [alasan, setAlasan] = useState(alasanAwal);

  const { data: jalur = [] } = useQuery<JalurPublik[]>({
    queryKey: ["master-jalur-pindah"],
    queryFn: () => fetchApi("/api/master/jalur"),
    enabled: calon !== null,
    staleTime: 5 * 60_000,
  });

  const pindah = useMutation({
    mutationFn: () =>
      fetchApi(
        `/api/pendaftaran/admin/seleksi/${calon!.pendaftar_id}/pindah-jalur`,
        {
          method: "POST",
          body: JSON.stringify({ jalur_id: jalurId, alasan: alasan.trim() }),
        },
      ),
    onSuccess: () => {
      toast({
        title: "Calon dipindahkan",
        description: `${calon!.nama_lengkap} dipindahkan ke jalur lain.`,
        variant: "success",
      });
      void qc.invalidateQueries({ queryKey: ["admin-seleksi"] });
      onClose();
    },
    onError: (e) =>
      toast({
        title: "Gagal memindahkan",
        description: (e as unknown as ApiError).pesan ?? "Terjadi kesalahan.",
        variant: "error",
      }),
  });

  if (!calon) return null;
  const tujuan = jalur.filter((j) => j.kode_jalur !== calon.kode_jalur);
  const valid = jalurId !== "" && alasan.trim().length >= 5;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pindahkan ke jalur lain</DialogTitle>
          <p className="text-xs text-biru-700">
            {calon.nama_lengkap} · jalur saat ini {calon.nama_jalur}
          </p>
        </DialogHeader>
        <div className="mt-4 space-y-3 text-xs">
          <label className="block">
            <span className="font-semibold text-biru-900">Jalur tujuan</span>
            <select
              aria-label="Jalur tujuan"
              value={jalurId}
              onChange={(e) => setJalurId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-biru-200 px-2.5 py-2"
            >
              <option value="">Pilih jalur…</option>
              {tujuan.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama_jalur}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-semibold text-biru-900">
              Alasan (dikirim ke calon)
            </span>
            <textarea
              aria-label="Alasan pemindahan"
              rows={3}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Contoh: Tidak memenuhi persyaratan rapor minimal 80."
              className="mt-1 w-full rounded-lg border border-biru-200 px-2.5 py-2"
            />
          </label>
          <p className="text-[11px] text-biru-600">
            Penilaian jalur lama dihapus. Bila jalur tujuan butuh berkas
            tambahan, calon diminta melengkapinya.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            size="sm"
            disabled={!valid || pindah.isPending}
            onClick={() => pindah.mutate()}
          >
            {pindah.isPending ? "Memindahkan…" : "Pindahkan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
