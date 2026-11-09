/**
 * Prodi (kode_prodi) yang hanya boleh dipilih sebagai pilihan 1.
 * D3 Keperawatan mewajibkan surat keterangan sehat & bebas buta warna, sehingga tidak boleh
 * menjadi pilihan cadangan (pilihan 2). Aturan yang sama dijaga di backend.
 */
export const HANYA_PILIHAN_1: ReadonlyArray<string> = ["KEP"];

export const boleh_pilihan_2 = (kodeProdi?: string | null): boolean =>
  !kodeProdi || !HANYA_PILIHAN_1.includes(kodeProdi);

export const PESAN_HANYA_PILIHAN_1 =
  "D3 Keperawatan hanya dapat dipilih sebagai pilihan 1.";
