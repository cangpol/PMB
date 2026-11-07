import { createContext, type ReactNode } from "react";

/** Gaya popup hasil: disetujui, ditolak, gagal, peringatan, atau informasi. */
export type NadaHasil = "sukses" | "ditolak" | "gagal" | "peringatan" | "info";

export interface OpsiKonfirmasi {
  judul: string;
  deskripsi?: ReactNode;
  /** `bahaya` untuk tindakan yang merusak/tak bisa dibatalkan (hapus, tolak). */
  nada?: "default" | "bahaya" | "sukses";
  labelYa?: string;
  labelBatal?: string;
}

export interface OpsiAlasan {
  judul: string;
  deskripsi?: ReactNode;
  label?: string;
  placeholder?: string;
  nilaiAwal?: string;
  labelKirim?: string;
  /** Alasan wajib diisi (bawaan: ya). */
  wajib?: boolean;
  nada?: "default" | "bahaya";
}

export interface OpsiHasil {
  nada: NadaHasil;
  judul: string;
  deskripsi?: ReactNode;
  /** Butir-butir rincian, mis. nama berkas atau alasan penolakan. */
  rincian?: string[];
  labelTutup?: string;
  /** Tutup otomatis setelah sekian milidetik (jeda saat kursor di atas popup). */
  autoTutupMs?: number;
}

export interface DialogApi {
  /** Tanya ya/tidak. Resolve `true` bila dikonfirmasi. Pengganti `window.confirm`. */
  konfirmasi: (opsi: OpsiKonfirmasi) => Promise<boolean>;
  /** Minta teks alasan. Resolve teks, atau `null` bila dibatalkan. Pengganti `window.prompt`. */
  masukkanAlasan: (opsi: OpsiAlasan) => Promise<string | null>;
  /** Tampilkan hasil tindakan. Resolve saat popup ditutup. Pengganti `window.alert`. */
  hasil: (opsi: OpsiHasil) => Promise<void>;
}

export const DialogContext = createContext<DialogApi | undefined>(undefined);
