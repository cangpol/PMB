import React, { useCallback, useEffect, useState } from "react";
import { CalendarRange, Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "../common";
import { fetchApi, type ApiError } from "@/services/api";
import { useToast } from "@/components/ui/useToast";
import {
  LABEL_STATUS_TAHAP,
  bagiDuaTahap,
  tanggalWib,
  type StatusTahap,
  type TahapEditan,
  type TahapGelombang,
} from "../../lib/gelombangTahap";

interface Props {
  gelombangId: string;
  /** Periode gelombang (ISO) — tahap harus berada di dalamnya */
  tglMulai: string;
  tglSelesai: string;
}

const MAKS_TAHAP = 6;
const inputCls =
  "w-full rounded-lg border border-biru-200 bg-putih px-2.5 py-1.5 text-xs text-biru-950 focus:border-biru-600 focus:outline-none";

/**
 * Atur tahap pendaftaran sebuah gelombang (mis. Tahap 1 dan Tahap 2) dengan rentang tanggal.
 * Tahap yang sudah lewat otomatis tidak bisa dipilih calon, namun tetap tampil.
 */
export const TahapGelombangEditor: React.FC<Props> = ({
  gelombangId,
  tglMulai,
  tglSelesai,
}) => {
  const { toast } = useToast();
  const [baris, setBaris] = useState<TahapEditan[]>([]);
  const [status, setStatus] = useState<StatusTahap[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const url = `/api/admin/konfigurasi/gelombang/${gelombangId}/tahap`;

  const terapkan = (data: TahapGelombang[]) => {
    setBaris(
      data.map((t) => ({
        nama: t.nama,
        tgl_mulai: t.tgl_mulai,
        tgl_selesai: t.tgl_selesai,
      })),
    );
    setStatus(data.map((t) => t.status));
  };

  const muat = useCallback(async () => {
    try {
      setMemuat(true);
      terapkan(await fetchApi<TahapGelombang[]>(url));
    } catch (e) {
      setGalat((e as ApiError).pesan ?? "Gagal memuat tahap gelombang");
    } finally {
      setMemuat(false);
    }
  }, [url]);

  useEffect(() => {
    muat();
  }, [muat]);

  const ubah = (i: number, patch: Partial<TahapEditan>) => {
    setGalat(null);
    setBaris((b) => b.map((r, n) => (n === i ? { ...r, ...patch } : r)));
    setStatus([]); // status lama tidak berlaku lagi sampai disimpan
  };

  const tambah = () => {
    const terakhir = baris[baris.length - 1];
    setBaris([
      ...baris,
      {
        nama: `Tahap ${baris.length + 1}`,
        tgl_mulai: terakhir?.tgl_selesai ?? tanggalWib(tglMulai),
        tgl_selesai: tanggalWib(tglSelesai),
      },
    ]);
    setStatus([]);
  };

  const simpan = async () => {
    try {
      setMenyimpan(true);
      setGalat(null);
      const data = await fetchApi<TahapGelombang[]>(url, {
        method: "PUT",
        body: JSON.stringify({ tahap: baris }),
      });
      terapkan(data);
      toast({
        title: "Tahap pendaftaran tersimpan",
        description: data.length
          ? `${data.length} tahap diatur untuk gelombang ini.`
          : "Gelombang ini tidak dibagi tahap.",
        variant: "success",
      });
    } catch (e) {
      setGalat((e as ApiError).pesan ?? "Gagal menyimpan tahap");
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <section
      aria-label="Tahap pendaftaran"
      className="space-y-3 rounded-2xl border border-biru-200 bg-biru-50/40 p-4"
    >
      <div className="flex items-center gap-2">
        <CalendarRange className="w-4 h-4 text-biru-800" />
        <h3 className="text-xs font-bold text-biru-950">Tahap pendaftaran</h3>
        <span className="ml-auto text-[11px] text-biru-700">
          Kosongkan bila gelombang tidak dibagi tahap
        </span>
      </div>
      <p className="text-[11px] text-biru-800">
        Tahap yang tanggalnya sudah lewat tetap tampil di formulir calon tetapi
        tidak bisa dipilih; pendaftaran dilanjutkan pada tahap berikutnya.
      </p>

      {memuat ? (
        <p className="text-xs text-biru-700">Memuat tahap...</p>
      ) : (
        <>
          {baris.length === 0 && (
            <p className="text-xs text-biru-700">
              Belum ada tahap. Gelombang memakai periode tanggalnya sendiri.
            </p>
          )}
          <ul className="space-y-2">
            {baris.map((r, i) => (
              <li
                key={i}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.2fr_1fr_1fr_auto] gap-2 items-end"
              >
                <label className="space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-biru-900 flex items-center gap-2">
                    Nama tahap {i + 1}
                    {status[i] && (
                      <span className="font-semibold text-biru-700">
                        · {LABEL_STATUS_TAHAP[status[i]]}
                      </span>
                    )}
                  </span>
                  <input
                    className={inputCls}
                    value={r.nama}
                    maxLength={100}
                    onChange={(e) => ubah(i, { nama: e.target.value })}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-bold text-biru-900">
                    Mulai
                  </span>
                  <input
                    type="date"
                    className={inputCls}
                    value={r.tgl_mulai}
                    onChange={(e) => ubah(i, { tgl_mulai: e.target.value })}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-bold text-biru-900">
                    Selesai
                  </span>
                  <input
                    type="date"
                    className={inputCls}
                    value={r.tgl_selesai}
                    onChange={(e) => ubah(i, { tgl_selesai: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Hapus tahap ${i + 1}`}
                  onClick={() => {
                    setBaris(baris.filter((_, n) => n !== i));
                    setStatus([]);
                  }}
                  className="p-2 rounded-lg text-biru-700 hover:bg-biru-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>

          {galat && (
            <p role="alert" className="text-xs font-semibold text-biru-900">
              {galat}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={baris.length >= MAKS_TAHAP}
              onClick={tambah}
            >
              <Plus className="w-3.5 h-3.5" /> Tambah tahap
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setBaris(
                  bagiDuaTahap(tanggalWib(tglMulai), tanggalWib(tglSelesai)),
                );
                setStatus([]);
                setGalat(null);
              }}
            >
              <Wand2 className="w-3.5 h-3.5" /> Bagi jadi 2 tahap
            </Button>
            <Button
              type="button"
              size="sm"
              className="ml-auto"
              disabled={menyimpan}
              onClick={simpan}
            >
              {menyimpan ? "Menyimpan..." : "Simpan tahap"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
};
