/** Gelombang pendaftaran yang dapat dibagi menjadi beberapa tahap (mis. Gelombang 1 Tahap 1 & 2). */
export type StatusTahap = "BELUM_DIBUKA" | "DIBUKA" | "BERAKHIR";

export interface TahapGelombang {
  id: string;
  nomor_tahap: number;
  nama: string;
  tgl_mulai: string; // YYYY-MM-DD
  tgl_selesai: string;
  status: StatusTahap;
}

export interface GelombangBertahap {
  id: string;
  nama_gelombang: string;
  tahap?: TahapGelombang[];
  /** Periode gelombang (ISO); dipakai bila gelombang tidak dibagi tahap */
  tgl_mulai?: string;
  tgl_selesai?: string;
}

export const LABEL_STATUS_TAHAP: Record<StatusTahap, string> = {
  DIBUKA: "Dibuka",
  BERAKHIR: "Ditutup",
  BELUM_DIBUKA: "Segera dibuka",
};

export const tahapDibuka = (g: GelombangBertahap) =>
  g.tahap?.find((t) => t.status === "DIBUKA");

/**
 * Gelombang bertahap perlu tahap yang dibuka. Gelombang tanpa tahap mengikuti tanggalnya
 * (Gelombang 2/3 yang belum mulai tidak bisa dipilih); tanpa tanggal dianggap terbuka.
 */
export const bisaDipilih = (g: GelombangBertahap) =>
  g.tahap?.length
    ? !!tahapDibuka(g)
    : g.tgl_mulai && g.tgl_selesai
      ? statusGelombang(g as GelombangPublik) === "AKTIF"
      : true;

/**
 * Pilihan awal: gelombang yang diutamakan (mis. milik calon) bila masih bisa dipilih, selain itu
 * gelombang pertama yang bisa dipilih. Untuk gelombang bertahap dipilih tahap yang sedang dibuka.
 */
export function pilihAwal(
  daftar: GelombangBertahap[],
  utamakanGelombangId?: string | null,
): { gelombangId: string; tahapId: string } {
  const urut = [
    ...daftar.filter((g) => g.id === utamakanGelombangId),
    ...daftar.filter((g) => g.id !== utamakanGelombangId),
  ];
  const g = urut.find(bisaDipilih);
  if (g) return { gelombangId: g.id, tahapId: tahapDibuka(g)?.id ?? "" };
  const cadangan = urut[0];
  return { gelombangId: cadangan?.id ?? "", tahapId: "" };
}

const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** "2026-11-01" -> "1 Nov 2026" (tanpa konversi zona waktu). */
export function tanggalPendek(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${BULAN[(m ?? 1) - 1]} ${y}`;
}

export const rentangTanggal = (mulai: string, selesai: string) =>
  `${tanggalPendek(mulai)} – ${tanggalPendek(selesai)}`;

const HARI = 86_400_000;
const keMs = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d);
};
const keIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Tanggal (YYYY-MM-DD) menurut WIB dari waktu ISO/UTC milik gelombang. */
export const tanggalWib = (iso: string) =>
  keIso(new Date(iso).getTime() + 7 * 3_600_000);

export interface TahapEditan {
  nama: string;
  tgl_mulai: string;
  tgl_selesai: string;
}

/** Bagi rentang gelombang menjadi dua tahap berurutan tanpa tumpang tindih. */
export function bagiDuaTahap(mulai: string, selesai: string): TahapEditan[] {
  const awal = keMs(mulai);
  const akhir = keMs(selesai);
  const hari = Math.max(0, Math.round((akhir - awal) / HARI));
  const batas1 = awal + Math.floor(hari / 2) * HARI;
  const mulai2 = Math.min(akhir, batas1 + HARI);
  return [
    { nama: "Tahap 1", tgl_mulai: mulai, tgl_selesai: keIso(batas1) },
    { nama: "Tahap 2", tgl_mulai: keIso(mulai2), tgl_selesai: selesai },
  ];
}

/** Gelombang dari /api/master/gelombang untuk tampilan publik. */
export interface GelombangPublik extends GelombangBertahap {
  tgl_mulai: string; // ISO
  tgl_selesai: string; // ISO
  is_active: boolean;
  /** Informasi halaman depan yang diatur admin */
  deskripsi?: string | null;
  info_daftar_ulang?: string | null;
}

export interface InfoGelombang {
  deskripsi: string | null;
  info_daftar_ulang: string | null;
}

export type StatusGelombang = "AKTIF" | "MENDATANG" | "SELESAI";

/**
 * Status gelombang untuk publik. Gelombang bertahap: AKTIF bila ada tahap yang dibuka,
 * MENDATANG bila belum ada yang dibuka tetapi masih ada tahap berikutnya, selain itu SELESAI.
 * Gelombang tanpa tahap mengikuti tanggalnya sendiri.
 */
export function statusGelombang(
  g: GelombangPublik,
  sekarang: number = Date.now(),
): StatusGelombang {
  if (g.tahap?.length) {
    if (g.tahap.some((t) => t.status === "DIBUKA")) return "AKTIF";
    if (g.tahap.some((t) => t.status === "BELUM_DIBUKA")) return "MENDATANG";
    return "SELESAI";
  }
  if (new Date(g.tgl_selesai).getTime() < sekarang) return "SELESAI";
  if (new Date(g.tgl_mulai).getTime() > sekarang) return "MENDATANG";
  return "AKTIF";
}

/** Batas akhir pendaftaran yang sedang berjalan (untuk hitung mundur), dalam ms. */
export function batasPenutupan(g: GelombangPublik): number {
  const t = tahapDibuka(g);
  // Tahap berakhir pada akhir hari tanggal selesainya (WIB)
  return t
    ? new Date(`${t.tgl_selesai}T23:59:59+07:00`).getTime()
    : new Date(g.tgl_selesai).getTime();
}

/** Judul gelombang beserta tahap yang sedang dibuka, mis. "Gelombang 1 — Tahap 2". */
export function judulGelombang(g: GelombangPublik): string {
  const nama = g.nama_gelombang.replace(/\[CONTOH\]\s*/i, "");
  const t = tahapDibuka(g);
  return t ? `${nama} — ${t.nama}` : nama;
}

export const periodeGelombang = (g: GelombangPublik) =>
  rentangTanggal(tanggalWib(g.tgl_mulai), tanggalWib(g.tgl_selesai));
