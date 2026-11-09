/**
 * Wilayah domisili Indonesia: Provinsi -> Kabupaten/Kota -> Kecamatan.
 * Sumber: data wilayah administrasi (BPS), disimpan statis di /public/data/wilayah
 * (index.json = daftar provinsi; {kodeProvinsi}.json = kabupaten/kota beserta kecamatannya).
 * Berkas per provinsi baru diunduh saat provinsi dipilih, lalu di-cache.
 */
export interface ProvinsiWilayah {
  kode: string;
  nama: string;
}
export interface KabupatenWilayah {
  nama: string;
  kecamatan: string[];
}

export const NEGARA_INDONESIA = "Indonesia";

/** Negara yang paling sering dipilih; negara lain diketik manual. */
export const DAFTAR_NEGARA = [
  NEGARA_INDONESIA,
  "Malaysia",
  "Singapura",
  "Timor Leste",
  "Brunei Darussalam",
  "Filipina",
  "Thailand",
  "Australia",
  "Jepang",
  "Korea Selatan",
  "Tiongkok",
  "India",
  "Arab Saudi",
  "Amerika Serikat",
  "Belanda",
  "Jerman",
  "Inggris",
] as const;

const BASE = "/data/wilayah";
let indexCache: Promise<ProvinsiWilayah[]> | null = null;
const kabupatenCache = new Map<string, Promise<KabupatenWilayah[]>>();

async function ambil<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal memuat ${url}`);
  return res.json() as Promise<T>;
}

export function muatProvinsiDomisili(): Promise<ProvinsiWilayah[]> {
  if (!indexCache) {
    indexCache = ambil<ProvinsiWilayah[]>(`${BASE}/index.json`).catch((e) => {
      indexCache = null; // izinkan coba lagi
      throw e;
    });
  }
  return indexCache;
}

export function muatKabupatenDomisili(
  kodeProvinsi: string,
): Promise<KabupatenWilayah[]> {
  let p = kabupatenCache.get(kodeProvinsi);
  if (!p) {
    p = ambil<KabupatenWilayah[]>(`${BASE}/${kodeProvinsi}.json`).catch((e) => {
      kabupatenCache.delete(kodeProvinsi);
      throw e;
    });
    kabupatenCache.set(kodeProvinsi, p);
  }
  return p;
}

export interface WilayahDomisili {
  negara: string;
  provinsi: string;
  kabupaten: string;
  kecamatan: string;
}

export const WILAYAH_KOSONG: WilayahDomisili = {
  negara: NEGARA_INDONESIA,
  provinsi: "",
  kabupaten: "",
  kecamatan: "",
};
