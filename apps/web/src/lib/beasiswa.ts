/** Aturan potongan DPP & SKS jalur READY; sama dengan perhitungan di server (pendaftaran/beasiswa.rs). */
export const JALUR_ACHIEVEMENT = "READY-ACHIEVEMENT";
export const JALUR_CREATOR = "READY-CREATOR";
export const JALUR_LEGACY = "READY-LEGACY";
export const HUBUNGAN_ALUMNI = [
  { kode: "ANAK", label: "Anak alumni (50%)", persen: 50 },
  { kode: "SAUDARA", label: "Saudara alumni (25%)", persen: 25 },
] as const;
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
  /** Rapor >= ambang mendapat potongan_tetap; di bawahnya potongan_di_bawah_ambang */
  potongan_ambang_rapor?: number | null;
  potongan_di_bawah_ambang?: number | null;
}

export interface MasukanPotongan {
  rataRapor: number | null;
  tingkatPrestasi: string;
  follower: number | null;
  /** READY Legacy: ANAK | SAUDARA */
  hubunganAlumni?: string;
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
  (a.potongan_ambang_rapor ?? null) !== null ||
  a.kode_jalur === JALUR_ACHIEVEMENT ||
  a.alur_seleksi === "PENUH";

/** Potongan ditentukan admin (Future Leader hingga 75%, Legacy). */
export const potonganDitentukanAdmin = (a: AturanJalur) =>
  a.potongan_tetap === null &&
  a.kode_jalur !== JALUR_ACHIEVEMENT &&
  a.kode_jalur !== JALUR_CREATOR &&
  a.kode_jalur !== JALUR_LEGACY &&
  a.potongan_maks !== null;

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
  if (a.kode_jalur === JALUR_LEGACY) {
    const h = HUBUNGAN_ALUMNI.find((x) => x.kode === m.hubunganAlumni);
    return h
      ? { persen: h.persen }
      : {
          galat:
            "Pilih hubungan dengan alumni: anak alumni (50%) atau saudara alumni (25%)",
        };
  }
  // Potongan bertingkat menurut rapor: >= ambang = potongan tetap, di bawahnya potongan lain
  const ambang = a.potongan_ambang_rapor ?? null;
  if (ambang !== null) {
    if (m.rataRapor === null) return { galat: "Rata-rata rapor wajib diisi" };
    if (m.rataRapor >= ambang) return { persen: a.potongan_tetap ?? 0 };
    const bawah = a.potongan_di_bawah_ambang ?? null;
    return bawah === null
      ? { galat: `Rata-rata rapor minimal ${ambang}` }
      : { persen: bawah };
  }
  if (a.potongan_tetap !== null) return { persen: a.potongan_tetap };
  const batas = a.potongan_maks ?? 0;
  const p = m.potonganAdmin ?? Math.min(batas, a.potongan_maks ?? 0);
  return p >= 0 && p <= batas
    ? { persen: p }
    : { galat: `Potongan harus antara 0 dan ${batas} persen` };
}
