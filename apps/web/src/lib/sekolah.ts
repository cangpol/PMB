/**
 * Data asal sekolah (SMA/SMK) per provinsi -> kabupaten/kota.
 * Sumber: data pokok sekolah Kemendikbud, disimpan statis di /public/data/sekolah
 * (index.json = daftar provinsi & kabupaten/kota; {kodeProvinsi}.json = daftar sekolah).
 * Berkas per provinsi baru diunduh saat provinsi dipilih, lalu di-cache.
 */
export interface KabupatenSekolah {
  kode: string;
  nama: string;
}
export interface ProvinsiSekolah {
  kode: string;
  nama: string;
  kabupaten: KabupatenSekolah[];
}

const BASE = "/data/sekolah";
let indexCache: Promise<ProvinsiSekolah[]> | null = null;
const sekolahCache = new Map<string, Promise<Record<string, string[]>>>();

async function ambil<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal memuat ${url}`);
  return res.json() as Promise<T>;
}

export function muatProvinsi(): Promise<ProvinsiSekolah[]> {
  if (!indexCache) {
    indexCache = ambil<ProvinsiSekolah[]>(`${BASE}/index.json`).catch((e) => {
      indexCache = null; // izinkan coba lagi
      throw e;
    });
  }
  return indexCache;
}

export async function muatSekolah(
  kodeProvinsi: string,
  kodeKabupaten: string,
): Promise<string[]> {
  let p = sekolahCache.get(kodeProvinsi);
  if (!p) {
    p = ambil<Record<string, string[]>>(`${BASE}/${kodeProvinsi}.json`).catch(
      (e) => {
        sekolahCache.delete(kodeProvinsi);
        throw e;
      },
    );
    sekolahCache.set(kodeProvinsi, p);
  }
  return (await p)[kodeKabupaten] ?? [];
}

// ---------------------------------------------------------------------------
// Saran nama sekolah saat mengetik (seluruh Indonesia)
// ---------------------------------------------------------------------------

export interface SaranSekolah {
  nama: string;
  kabupaten: string;
  provinsi: string;
}

export interface PreferensiWilayah {
  provinsi?: string;
  kabupaten?: string;
}

/** Huruf kecil tanpa tanda baca/spasi: "D.I. Yogyakarta" dan "DI Yogyakarta" sama. */
export const normalisasi = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "");

let semuaSekolah: Promise<SaranSekolah[]> | null = null;

/** Muat seluruh sekolah sekali (berkas per provinsi, paralel), lalu di-cache. */
export function muatSemuaSekolah(): Promise<SaranSekolah[]> {
  if (!semuaSekolah) {
    semuaSekolah = (async () => {
      const provinsi = await muatProvinsi();
      const per = await Promise.all(
        provinsi.map(async (p) => {
          let data: Record<string, string[]>;
          try {
            data = await ambil<Record<string, string[]>>(
              `${BASE}/${p.kode}.json`,
            );
          } catch {
            return [] as SaranSekolah[];
          }
          return p.kabupaten.flatMap((k) =>
            (data[k.kode] ?? []).map((nama) => ({
              nama,
              kabupaten: k.nama,
              provinsi: p.nama,
            })),
          );
        }),
      );
      return per.flat();
    })().catch((e) => {
      semuaSekolah = null;
      throw e;
    });
  }
  return semuaSekolah;
}

/**
 * Cari sekolah yang namanya memuat semua kata yang diketik. Urutan: kabupaten domisili,
 * lalu provinsi domisili, lalu sisanya; nama yang diawali ketikan didahulukan.
 */
export function cariDalam(
  daftar: SaranSekolah[],
  ketikan: string,
  pref: PreferensiWilayah = {},
  batas = 8,
): SaranSekolah[] {
  const kata = ketikan
    .toLowerCase()
    .split(/\s+/)
    .map((k) => k.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  if (kata.length === 0) return [];
  const prov = pref.provinsi ? normalisasi(pref.provinsi) : null;
  const kab = pref.kabupaten ? normalisasi(pref.kabupaten) : null;
  const awalan = normalisasi(ketikan);

  const hasil: { s: SaranSekolah; skor: number }[] = [];
  for (const s of daftar) {
    const n = normalisasi(s.nama);
    if (!kata.every((k) => n.includes(k))) continue;
    let skor = 0;
    if (kab && normalisasi(s.kabupaten) === kab) skor += 4;
    if (prov && normalisasi(s.provinsi) === prov) skor += 2;
    if (n.startsWith(awalan)) skor += 1;
    hasil.push({ s, skor });
  }
  hasil.sort((a, b) => b.skor - a.skor || a.s.nama.length - b.s.nama.length);
  return hasil.slice(0, batas).map((h) => h.s);
}

export async function cariSekolah(
  ketikan: string,
  pref: PreferensiWilayah = {},
): Promise<SaranSekolah[]> {
  if (ketikan.trim().length < 2) return [];
  return cariDalam(await muatSemuaSekolah(), ketikan, pref);
}
