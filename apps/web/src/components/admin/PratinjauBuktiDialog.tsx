import React, { useEffect, useState } from "react";
import { Download, ExternalLink, Minus, Plus, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";

export interface BuktiPratinjau {
  url: string;
  namaFile: string;
  mimeType: string;
  /** Teks pendek di bawah judul, mis. nama calon dan nomor tagihan */
  keterangan?: string;
}

interface Props {
  bukti: BuktiPratinjau | null;
  onClose: () => void;
}

const ZOOM_MIN = 1;
const ZOOM_MAKS = 4;

/** Pratinjau bukti (gambar atau PDF) dalam modal, dengan zoom, unduh, dan buka di tab baru. */
export const PratinjauBuktiDialog: React.FC<Props> = ({ bukti, onClose }) => {
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [mengunduh, setMengunduh] = useState(false);

  useEffect(() => {
    setZoom(ZOOM_MIN);
  }, [bukti?.url]);

  if (!bukti) return null;
  const gambar = bukti.mimeType.startsWith("image/");

  const unduh = async () => {
    setMengunduh(true);
    try {
      // Atribut download diabaikan untuk URL lintas-asal, jadi ambil sebagai blob dulu
      const res = await fetch(bukti.url);
      if (!res.ok) throw new Error("gagal");
      const objek = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = objek;
      a.download = bukti.namaFile;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objek);
    } catch {
      window.open(bukti.url, "_blank", "noopener,noreferrer");
    } finally {
      setMengunduh(false);
    }
  };

  const tombol =
    "inline-flex items-center gap-1.5 rounded-lg border border-biru-200 bg-putih px-3 py-1.5 text-xs font-semibold text-biru-800 hover:bg-biru-50 disabled:opacity-50";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Pratinjau Bukti Pembayaran</DialogTitle>
          <p className="text-xs text-biru-700">
            {bukti.keterangan ? `${bukti.keterangan} · ` : ""}
            {bukti.namaFile}
          </p>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          {gambar && (
            <>
              <button
                type="button"
                className={tombol}
                aria-label="Perkecil"
                disabled={zoom <= ZOOM_MIN}
                onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - 0.5))}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs tabular-nums w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                className={tombol}
                aria-label="Perbesar"
                disabled={zoom >= ZOOM_MAKS}
                onClick={() => setZoom((z) => Math.min(ZOOM_MAKS, z + 0.5))}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className={tombol}
                aria-label="Atur ulang zoom"
                onClick={() => setZoom(ZOOM_MIN)}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <span className="flex-1" />
          <button
            type="button"
            className={tombol}
            onClick={() => void unduh()}
            disabled={mengunduh}
          >
            <Download className="w-3.5 h-3.5" />
            {mengunduh ? "Mengunduh…" : "Unduh"}
          </button>
          <a
            href={bukti.url}
            target="_blank"
            rel="noopener noreferrer"
            className={tombol}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Buka di tab baru
          </a>
        </div>

        <div className="mt-3 h-[70vh] overflow-auto rounded-xl border border-biru-200 bg-biru-50">
          {gambar ? (
            <img
              src={bukti.url}
              alt={bukti.namaFile}
              onClick={() => setZoom((z) => (z > ZOOM_MIN ? ZOOM_MIN : 2))}
              style={{ width: `${zoom * 100}%` }}
              className={`mx-auto max-w-none select-none ${
                zoom > ZOOM_MIN ? "cursor-zoom-out" : "cursor-zoom-in"
              } ${zoom === ZOOM_MIN ? "max-h-full object-contain" : ""}`}
            />
          ) : (
            <iframe
              src={bukti.url}
              title={bukti.namaFile}
              className="h-full w-full"
            />
          )}
        </div>
        {gambar && (
          <p className="mt-2 text-[11px] text-biru-600">
            Klik gambar untuk memperbesar atau mengembalikan ukuran.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
