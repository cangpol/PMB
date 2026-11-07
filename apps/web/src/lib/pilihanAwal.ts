/**
 * Jalur/prodi yang dipilih calon di website (mis. tombol "Daftar Jalur RPL"
 * -> /register?jalur=rpl) dibawa sampai formulir, agar calon tidak perlu
 * memilih ulang dan tidak tertukar ke jalur lain.
 */

const KUNCI = "pmb_pilihan_awal";

export interface PilihanAwal {
  jalur?: string;
  prodi?: string;
}

/** Kode jalur di URL website -> tipe seleksi jalur di master data. */
const JALUR_WEBSITE: Record<string, string> = {
  reguler: "CBT",
  cbt: "CBT",
  prestasi: "BERKAS",
  rapor: "BERKAS",
  beasiswa: "CAMPURAN",
  rpl: "RPL",
};

export const simpanPilihanAwal = (params: URLSearchParams) => {
  const jalur = params.get("jalur")?.trim().toLowerCase() || undefined;
  const prodi = params.get("prodi")?.trim() || undefined;
  if (!jalur && !prodi) return;
  try {
    localStorage.setItem(KUNCI, JSON.stringify({ jalur, prodi }));
  } catch {
    // penyimpanan browser tidak tersedia; calon tetap bisa memilih manual
  }
};

export const ambilPilihanAwal = (): PilihanAwal => {
  try {
    const v = JSON.parse(localStorage.getItem(KUNCI) || "{}");
    return typeof v === "object" && v ? v : {};
  } catch {
    return {};
  }
};

export const hapusPilihanAwal = () => {
  try {
    localStorage.removeItem(KUNCI);
  } catch {
    /* abaikan */
  }
};

/** Cari jalur yang cocok dengan pilihan dari website (aktif saja). */
export const cariJalurAwal = <
  J extends { id: string; kode_jalur: string; tipe_seleksi: string },
>(
  jalur: readonly J[],
  kode?: string,
): J | undefined => {
  if (!kode) return undefined;
  const k = kode.toLowerCase();
  const tipe = JALUR_WEBSITE[k];
  return (
    jalur.find((j) => j.kode_jalur.toLowerCase() === k) ??
    jalur.find((j) => j.kode_jalur.toLowerCase() === `jalur-${k}`) ??
    (tipe ? jalur.find((j) => j.tipe_seleksi === tipe) : undefined)
  );
};

/** Cari prodi dari kode singkat/kode prodi di URL. */
export const cariProdiAwal = <
  P extends { id: string; kode_prodi: string; kode_singkat?: string | null },
>(
  prodi: readonly P[],
  kode?: string,
): P | undefined => {
  if (!kode) return undefined;
  const k = kode.toLowerCase();
  return prodi.find(
    (p) =>
      p.kode_prodi.toLowerCase() === k || p.kode_singkat?.toLowerCase() === k,
  );
};
