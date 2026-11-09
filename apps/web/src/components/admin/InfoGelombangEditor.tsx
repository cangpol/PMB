import React, { useCallback, useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "../common";
import { fetchApi, type ApiError } from "@/services/api";
import { useToast } from "@/components/ui/useToast";
import type { InfoGelombang } from "../../lib/gelombangTahap";

const inputCls =
  "w-full rounded-lg border border-biru-200 bg-putih px-2.5 py-1.5 text-xs text-biru-950 focus:border-biru-600 focus:outline-none";

interface Isian {
  deskripsi: string;
  info_daftar_ulang: string;
}

const dariApi = (i: InfoGelombang): Isian => ({
  deskripsi: i.deskripsi ?? "",
  info_daftar_ulang: i.info_daftar_ulang ?? "",
});

/**
 * Informasi gelombang yang tampil di beranda dan halaman jadwal seleksi.
 * Perubahan langsung terlihat di halaman depan setelah disimpan.
 */
export const InfoGelombangEditor: React.FC<{ gelombangId: string }> = ({
  gelombangId,
}) => {
  const { toast } = useToast();
  const url = `/api/admin/konfigurasi/gelombang/${gelombangId}/info`;
  const [f, setF] = useState<Isian | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const muat = useCallback(async () => {
    try {
      setF(dariApi(await fetchApi<InfoGelombang>(url)));
    } catch (e) {
      setGalat((e as ApiError).pesan ?? "Gagal memuat informasi gelombang");
    }
  }, [url]);

  useEffect(() => {
    muat();
  }, [muat]);

  const simpan = async () => {
    if (!f) return;
    try {
      setMenyimpan(true);
      setGalat(null);
      const data = await fetchApi<InfoGelombang>(url, {
        method: "PUT",
        body: JSON.stringify({
          deskripsi: f.deskripsi,
          info_daftar_ulang: f.info_daftar_ulang,
        }),
      });
      setF(dariApi(data));
      toast({
        title: "Informasi gelombang tersimpan",
        description: "Halaman depan website ikut diperbarui.",
        variant: "success",
      });
    } catch (e) {
      setGalat((e as ApiError).pesan ?? "Gagal menyimpan informasi gelombang");
    } finally {
      setMenyimpan(false);
    }
  };

  const ubah = (patch: Partial<Isian>) => {
    setGalat(null);
    setF((x) => (x ? { ...x, ...patch } : x));
  };

  return (
    <section
      aria-label="Informasi halaman depan"
      className="space-y-3 rounded-2xl border border-biru-200 bg-biru-50/40 p-4"
    >
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-biru-800" />
        <h3 className="text-xs font-bold text-biru-950">
          Informasi di halaman depan
        </h3>
      </div>
      <p className="text-[11px] text-biru-800">
        Tampil pada kartu gelombang di beranda dan halaman Jadwal Seleksi. Kolom
        yang dikosongkan tidak ditampilkan.
      </p>
      {!f ? (
        <p className="text-xs text-biru-700">{galat ?? "Memuat..."}</p>
      ) : (
        <>
          <label className="block space-y-1">
            <span className="text-[11px] font-bold text-biru-900">
              Deskripsi singkat
            </span>
            <textarea
              rows={2}
              maxLength={600}
              className={inputCls}
              value={f.deskripsi}
              onChange={(e) => ubah({ deskripsi: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-bold text-biru-900">
              Batas daftar ulang
            </span>
            <input
              className={inputCls}
              maxLength={255}
              value={f.info_daftar_ulang}
              onChange={(e) => ubah({ info_daftar_ulang: e.target.value })}
            />
          </label>
          {galat && (
            <p role="alert" className="text-xs font-semibold text-biru-900">
              {galat}
            </p>
          )}
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={menyimpan}
              onClick={simpan}
            >
              {menyimpan ? "Menyimpan..." : "Simpan informasi"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
};
