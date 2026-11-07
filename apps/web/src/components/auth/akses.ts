/**
 * Verifikasi email dengan kode acak 6 digit. Sedang dinonaktifkan; aktifkan
 * dengan VITE_WAJIB_VERIFIKASI_EMAIL=true (bersama WAJIB_VERIFIKASI_EMAIL=true di API).
 */
export const WAJIB_VERIFIKASI_EMAIL =
  import.meta.env.VITE_WAJIB_VERIFIKASI_EMAIL === "true";

/** Halaman awal tiap peran setelah login. */
export const dashboardPeran = (role: string): string =>
  role === "calon_mahasiswa" ? "/portal/dashboard" : "/admin/dashboard";

/** Area aplikasi (awalan URL) yang boleh dibuka sebuah peran. */
export const bolehDiArea = (role: string, path: string): boolean => {
  const di = (awalan: string) =>
    path === awalan || path.startsWith(`${awalan}/`);
  if (role === "super_admin") return di("/admin") || di("/portal");
  if (role === "calon_mahasiswa") return di("/portal");
  return di("/admin");
};

/**
 * Tujuan setelah login: halaman yang tadi diminta hanya bila memang area
 * peran tersebut; selain itu dashboard peran. Ini mencegah akun calon
 * diarahkan ke halaman admin yang terakhir dibuka pengguna sebelumnya.
 */
export const tujuanSetelahLogin = (
  role: string,
  dari?: string | null,
  emailTerverifikasi = true,
) => {
  // Calon wajib memverifikasi email dengan kode sebelum memakai portal
  if (
    WAJIB_VERIFIKASI_EMAIL &&
    role === "calon_mahasiswa" &&
    !emailTerverifikasi
  )
    return "/verify-email";
  return dari && bolehDiArea(role, dari) ? dari : dashboardPeran(role);
};

/** Hapus data sesi yang tersimpan di browser (mis. cadangan jawaban CBT). */
export const bersihkanPenyimpananSesi = () => {
  try {
    const hapus: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("cbt_backup_")) hapus.push(k);
    }
    hapus.forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {
    // Penyimpanan browser bisa tidak tersedia (mode privat); abaikan
  }
};
