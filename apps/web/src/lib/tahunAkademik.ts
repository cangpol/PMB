/**
 * Tahun masuk sebuah tahun akademik = tahun tanggal mulainya (mis. 2027-09-01 -> 2027).
 * Dua digit terakhirnya dipakai pada nomor pendaftaran (W270001-3132) dan NIM (27310001).
 */
export function tahunMasuk(
  tglMulai: string,
): { tahun: number; kode: string } | null {
  const tahun = Number(tglMulai?.slice(0, 4));
  if (!Number.isInteger(tahun) || tahun < 1900) return null;
  return { tahun, kode: String(tahun % 100).padStart(2, "0") };
}

export const teksTahunMasuk = (tglMulai: string): string => {
  const t = tahunMasuk(tglMulai);
  return t ? `${t.tahun} (kode ${t.kode})` : "-";
};
