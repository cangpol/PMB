/**
 * Pemeriksaan format berkas dan unggah langsung ke penyimpanan (MinIO/S3)
 * lewat URL presign. Dipakai semua halaman unggah calon agar aturan dan
 * pesan kesalahannya seragam.
 */

/** Ekstensi yang sah untuk tiap tipe MIME yang dipakai di PMB. */
const EKSTENSI_MIME: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

/** Pesan pop up bila ekstensi/isi berkas tidak sesuai. */
export const PESAN_EKSTENSI_SALAH =
  "Ekstensi berkas yang Anda masukkan salah, silakan ulangi kembali.";

export const PESAN_STORAGE_TERPUTUS =
  "Server penyimpanan berkas sedang tidak dapat dihubungi. Silakan coba lagi beberapa saat lagi; bila tetap gagal, hubungi panitia PMB.";

/**
 * Ubah daftar format dari server (mis. "image/jpeg,image/png,application/pdf"
 * atau "pdf,jpg") menjadi daftar tipe MIME yang dikenal.
 */
export const mimeDariDaftar = (
  daftar: string | readonly string[],
): string[] => {
  const item = (typeof daftar === "string" ? daftar.split(",") : daftar)
    .map((t) => t.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
  const hasil = new Set<string>();
  for (const t of item) {
    if (EKSTENSI_MIME[t]) hasil.add(t);
    else {
      const mime = Object.keys(EKSTENSI_MIME).find((m) =>
        EKSTENSI_MIME[m].includes(t),
      );
      if (mime) hasil.add(mime);
    }
  }
  return [...hasil];
};

/** Ekstensi yang diterima, mis. ["pdf", "jpg", "jpeg", "png"]. */
export const ekstensiDiterima = (mime: readonly string[]): string[] =>
  mime.flatMap((m) => EKSTENSI_MIME[m] ?? []);

/** Nilai atribut `accept` untuk <input type="file">. */
export const atributAccept = (mime: readonly string[]): string =>
  [...mime, ...ekstensiDiterima(mime).map((e) => `.${e}`)].join(",");

/** Label ramah pengguna, mis. "PDF, JPG, PNG". */
export const labelFormat = (mime: readonly string[]): string =>
  [
    ...new Set(
      mime.map((m) =>
        m === "image/jpeg" ? "JPG" : (EKSTENSI_MIME[m]?.[0] ?? m).toUpperCase(),
      ),
    ),
  ].join(", ");

const ekstensiFile = (nama: string): string => {
  const i = nama.lastIndexOf(".");
  return i > 0 ? nama.slice(i + 1).toLowerCase() : "";
};

/** Tipe MIME sebenarnya menurut isi file (magic bytes); null bila tak dikenal. */
const mimeDariIsi = async (file: File): Promise<string | null> => {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const awal = (...x: number[]) => x.every((v, i) => b[i] === v);
  if (awal(0x25, 0x50, 0x44, 0x46)) return "application/pdf"; // %PDF
  if (awal(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (awal(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (
    awal(0x52, 0x49, 0x46, 0x46) && // RIFF
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
    return "image/webp";
  return null;
};

export interface HasilPeriksa {
  ok: boolean;
  /** Tipe MIME menurut isi file (kosong bila tidak sah). */
  mime: string;
  /** Rincian kesalahan untuk pop up (kosong bila sah). */
  alasan: string;
}

/**
 * Berkas sah bila ekstensinya termasuk format yang diizinkan DAN isinya
 * benar-benar berformat itu (mencegah file yang sekadar diganti namanya).
 * `mime` yang dikembalikan diambil dari isi file, bukan dari browser.
 */
export const periksaFormatBerkas = async (
  file: File,
  mimeDiizinkan: readonly string[],
): Promise<HasilPeriksa> => {
  const diterima = ekstensiDiterima(mimeDiizinkan);
  const ext = ekstensiFile(file.name);
  const format = labelFormat(mimeDiizinkan);
  if (!ext || !diterima.includes(ext)) {
    return {
      ok: false,
      mime: "",
      alasan: `Berkas "${file.name}" ${ext ? `berekstensi .${ext}` : "tidak memiliki ekstensi"}. Format yang diterima: ${format}.`,
    };
  }
  let isi: string | null = null;
  try {
    isi = await mimeDariIsi(file);
  } catch {
    isi = null;
  }
  if (
    !isi ||
    !EKSTENSI_MIME[isi].includes(ext) ||
    !mimeDiizinkan.includes(isi)
  ) {
    return {
      ok: false,
      mime: "",
      alasan: `Isi berkas "${file.name}" bukan ${ext.toUpperCase()} yang sah (kemungkinan hanya diganti namanya atau rusak). Format yang diterima: ${format}.`,
    };
  }
  return { ok: true, mime: isi, alasan: "" };
};

/**
 * Unggah file ke URL presign (PUT). Kegagalan jaringan/penyimpanan diubah
 * menjadi pesan yang dapat dipahami calon.
 */
export const unggahKeStorage = (
  url: string,
  file: File,
  mime: string,
  onProgress?: (persen: number) => void,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", mime);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(
            new Error(
              xhr.status >= 500
                ? PESAN_STORAGE_TERPUTUS
                : `Penyimpanan berkas menolak unggahan (kode ${xhr.status}). Silakan ulangi; bila tetap gagal, hubungi panitia PMB.`,
            ),
          );
    xhr.onerror = () => reject(new Error(PESAN_STORAGE_TERPUTUS));
    xhr.ontimeout = () => reject(new Error(PESAN_STORAGE_TERPUTUS));
    xhr.send(file);
  });
