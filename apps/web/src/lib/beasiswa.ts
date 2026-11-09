/** Aturan potongan DPP & SKS jalur READY; sama dengan perhitungan di server (pendaftaran/beasiswa.rs). */
export const JALUR_ACHIEVEMENT = "READY-ACHIEVEMENT";
export const JALUR_CREATOR = "READY-CREATOR";
export const JALUR_LEGACY = "READY-LEGACY";
export const FOLLOWER_MINIMAL_CREATOR = 10_000;

export const TINGKAT_PRESTASI = [
  { kode: "INTERNASIONAL", label: "Internasional" },
  { kode: "NASIONAL", label: "Nasional" },
  { kode: "PROVINSI", label: "Provinsi" },
  { kode: "KOTA_KABUPATEN", label: "Kota/Kabupaten" },
] as const;

export interface AturanJalur {
  kode_jalur: string;
  alur_seleksi: string;
  rapor_minimal: number | null;
  potongan_tetap: number | null;
  potongan_maks: number | null;
}

export interface MasukanPotongan {
  rataRapor: number | null;
  tingkatPrestasi: string;
  follower: number | null;
  potonganAdmin: number | null;
}

export type HasilPotongan = { persen: number } | { galat: string };

export function potonganDariRapor(r: number): number {
  if (r > 88) return 100;
  if (r >= 83) return 75;
  if (r >= 78) return 50;
  if (r >= 75) return 25;
  return 0;
}

export function potonganDariPrestasi(tingkat: string): number {
  return (
    { INTERNASIONAL: 100, NASIONAL: 75, PROVINSI: 50, KOTA_KABUPATEN: 25 }[
      tingkat
    ] ?? 0
  );
}

/** Rapor dipakai pada jalur ini (ada batas minimal, Achievement, atau seleksi penuh). */
export const memakaiRapor = (a: AturanJalur) =>
  a.rapor_minimal !== null ||
  a.kode_jalur === JALUR_ACHIEVEMENT ||
  a.alur_seleksi === "PENUH";

/** Potongan ditentukan admin (Future Leader hingga 75%, Legacy). */
export const potonganDitentukanAdmin = (a: AturanJalur) =>
  a.potongan_tetap === null &&
  a.kode_jalur !== JALUR_ACHIEVEMENT &&
  a.kode_jalur !== JALUR_CREATOR &&
  (a.potongan_maks !== null || a.kode_jalur === JALUR_LEGACY);

export function hitungPotongan(
  a: AturanJalur,
  m: MasukanPotongan,
): HasilPotongan {
  if (a.rapor_minimal !== null) {
    if (m.rataRapor === null) return { galat: "Rata-rata rapor wajib diisi" };
    if (m.rataRapor < a.rapor_minimal)
      return { galat: `Rata-rata rapor minimal ${a.rapor_minimal}` };
  }
  if (a.kode_jalur === JALUR_ACHIEVEMENT) {
    const p = Math.max(
      m.rataRapor === null ? 0 : potonganDariRapor(m.rataRapor),
      potonganDariPrestasi(m.tingkatPrestasi),
    );
    return p > 0
      ? { persen: p }
      : { galat: "Rapor minimal 75 atau sertifikat prestasi yang sah" };
  }
  if (a.kode_jalur === JALUR_CREATOR)
    return {
      persen:
        (m.follower ?? 0) >= FOLLOWER_MINIMAL_CREATOR
          ? (a.potongan_tetap ?? 0)
          : 0,
    };
  if (a.potongan_tetap !== null) return { persen: a.potongan_tetap };
  const batas = a.potongan_maks ?? (a.kode_jalur === JALUR_LEGACY ? 100 : 0);
  const p = m.potonganAdmin ?? Math.min(batas, a.potongan_maks ?? 0);
  return p >= 0 && p <= batas
    ? { persen: p }
    : { galat: `Potongan harus antara 0 dan ${batas} persen` };
}
