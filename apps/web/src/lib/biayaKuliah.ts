export const MAKS_SEMESTER = 8;

export interface RincianBiayaKuliah {
  prodi_id: string;
  kode_prodi: string;
  nama_prodi: string;
  jenjang: string;
  fakultas: string;
  slug: string | null;
  admisi: number;
  /** Biaya semester 1 sampai 8 (semester di atas jumlah_semester tidak dipakai) */
  semester: number[];
  jumlah_semester: number;
  total_hingga_lulus: number;
}

/** Sama dengan server: admisi + biaya semester 1 sampai jumlah semester (maks. 8). */
export function totalHinggaLulus(
  admisi: number,
  semester: number[],
  jumlahSemester: number,
): number {
  const n = Math.min(Math.max(jumlahSemester, 0), MAKS_SEMESTER);
  return semester.slice(0, n).reduce((a, b) => a + b, admisi);
}

/** Ubah isian angka ("6.000.000", "Rp 6000000") menjadi bilangan bulat; kosong/tidak valid = null. */
export function parseNominal(teks: string): number | null {
  const bersih = teks.replace(/[.\s]/g, "").replace(/^Rp/i, "");
  if (!/^\d+$/.test(bersih)) return null;
  const n = Number(bersih);
  return Number.isSafeInteger(n) ? n : null;
}

/** Kelompokkan prodi per fakultas (urut nama fakultas), lalu jenjang dan nama prodi. */
export function kelompokkanPerFakultas(
  daftar: readonly RincianBiayaKuliah[],
): { fakultas: string; prodi: RincianBiayaKuliah[] }[] {
  const urut = [...daftar].sort(
    (a, b) =>
      a.fakultas.localeCompare(b.fakultas, "id") ||
      a.jenjang.localeCompare(b.jenjang, "id") ||
      a.nama_prodi.localeCompare(b.nama_prodi, "id"),
  );
  const hasil: { fakultas: string; prodi: RincianBiayaKuliah[] }[] = [];
  for (const p of urut) {
    const akhir = hasil[hasil.length - 1];
    if (akhir && akhir.fakultas === p.fakultas) akhir.prodi.push(p);
    else hasil.push({ fakultas: p.fakultas, prodi: [p] });
  }
  return hasil;
}
