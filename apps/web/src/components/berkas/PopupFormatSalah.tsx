import React from "react";
import { FileWarning } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { PESAN_EKSTENSI_SALAH } from "@/lib/unggahBerkas";

interface Props {
  /** Rincian kesalahan; pop up tampil selama nilainya tidak null. */
  alasan: string | null;
  onTutup: () => void;
}

/** Pop up saat berkas yang dipilih tidak sesuai format yang diizinkan. */
export const PopupFormatSalah: React.FC<Props> = ({ alasan, onTutup }) => (
  <Dialog open={alasan !== null} onOpenChange={(buka) => !buka && onTutup()}>
    <DialogContent className="max-w-md" role="alertdialog">
      <DialogHeader>
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-700">
          <FileWarning className="h-6 w-6" aria-hidden />
        </div>
        <DialogTitle className="text-center">Format Berkas Salah</DialogTitle>
        <DialogDescription className="text-center">
          {PESAN_EKSTENSI_SALAH}
        </DialogDescription>
      </DialogHeader>
      {alasan && (
        <p className="rounded-xl bg-biru-50 border border-biru-200 p-3 text-xs text-biru-900">
          {alasan}
        </p>
      )}
      <DialogFooter>
        <Button type="button" className="w-full" onClick={onTutup} autoFocus>
          Pilih Ulang Berkas
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
