export interface BerkasUnggahan {
  jenis_berkas: string;
  status_verifikasi: string;
  uploaded_at?: string;
}

export const PESAN_DAFTAR_ULANG_SELESAI =
  "Pendaftaran telah selesai. Admin akan memeriksa berkas dan menerbitkan NIM. Mohon menunggu.";

/** Unggahan terbaru untuk satu jenis (calon bisa mengunggah ulang setelah ditolak). */
export function berkasTerbaru<T extends BerkasUnggahan>(
  daftar: readonly T[],
  jenis: string,
): T | undefined {
  const sejenis = daftar.filter((b) => b.jenis_berkas === jenis);
  return sejenis.reduce<T | undefined>(
    (terbaru, b) =>
      !terbaru || (b.uploaded_at ?? "") >= (terbaru.uploaded_at ?? "")
        ? b
        : terbaru,
    undefined,
  );
}

/** Semua jenis wajib sudah terunggah; berkas yang ditolak dihitung belum sampai diunggah ulang. */
export function berkasDaftarUlangLengkap(
  daftar: readonly BerkasUnggahan[],
  jenisWajib: readonly string[],
): boolean {
  return jenisWajib.every((j) => {
    const b = berkasTerbaru(daftar, j);
    return !!b && b.status_verifikasi !== "INVALID";
  });
}
