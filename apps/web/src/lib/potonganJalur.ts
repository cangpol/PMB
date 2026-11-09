export interface PotonganJalur {
  id: string;
  kode_jalur: string;
  nama_jalur: string;
  alur_seleksi: "PENUH" | "LANGSUNG_LULUS" | "TANPA_CBT";
  biaya_formulir: number;
  rapor_minimal: number | null;
  potongan_tetap: number | null;
  potongan_maks: number | null;
  benefit_tambahan: string | null;
  kriteria_seleksi: string | null;
  jumlah_calon_berpotongan: number;
  is_active: boolean;
}

/** Bilangan bulat persen 0-100; kosong = tidak diatur (null); salah = undefined. */
export function parsePersen(teks: string): number | null | undefined {
  const t = teks.trim();
  if (t === "") return null;
  if (!/^\d{1,3}$/.test(t)) return undefined;
  const n = Number(t);
  return n >= 0 && n <= 100 ? n : undefined;
}

/** Angka desimal (titik/koma) 0-100; kosong = null; salah = undefined. */
export function parseRapor(teks: string): number | null | undefined {
  const t = teks.trim().replace(",", ".");
  if (t === "") return null;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return undefined;
  const n = Number(t);
  return n >= 0 && n <= 100 ? n : undefined;
}

export const ALUR_LABEL: Record<PotonganJalur["alur_seleksi"], string> = {
  PENUH: "Rapor → CBT → Wawancara",
  LANGSUNG_LULUS: "Persetujuan admin (CBT & wawancara dilewati)",
  TANPA_CBT: "Berkas → Wawancara (CBT dilewati)",
};

/** Jalur dengan aturan potongan bertingkat yang ditetapkan sistem. */
export const ATURAN_KHUSUS: Record<string, string> = {
  "READY-ACHIEVEMENT":
    "Potongan mengikuti tingkat rapor (25–100%) atau sertifikat prestasi (25–100%), diambil yang terbesar.",
  "READY-CREATOR":
    "Potongan tetap hanya berlaku bila follower minimal 10.000; diisi admin saat seleksi.",
};
