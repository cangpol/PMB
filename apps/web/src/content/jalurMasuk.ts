import { JALUR_PENERIMAAN } from "./beranda";

export type KodeJalur = (typeof JALUR_PENERIMAAN)[number]["kode"];

export interface DetailJalur {
  /** Potongan biaya DPP dan SKS, ringkas */
  potongan: string;
  /** Tahapan seleksi sesuai alur jalur */
  tahapan: readonly string[];
  /** Berkas khusus jalur (di luar berkas umum) */
  berkasKhusus: readonly string[];
  benefit?: string;
}

const TAHAP_LANGSUNG = [
  "Seleksi rapor dan berkas oleh admin",
  "Seleksi CBT online: dinyatakan lulus",
  "Seleksi wawancara: dinyatakan lulus",
  "Surat penerimaan (LoA), lalu daftar ulang",
] as const;

/** Berkas yang berlaku untuk semua jalur. */
export const BERKAS_UMUM = [
  "Rapor kelas X - XI",
  "Pas foto berwarna",
  "Sertifikat (bila ada)",
] as const;

export const DETAIL_JALUR: Record<KodeJalur, DetailJalur> = {
  early: {
    potongan: "100% biaya DPP dan SKS",
    tahapan: [
      "Seleksi rapor kelas 11 semester 4 (rata-rata minimal 80; di bawah 80 dipindahkan admin ke jalur lain)",
      "Persetujuan admin: CBT dan wawancara dinyatakan lulus",
      "Surat penerimaan (LoA), lalu daftar ulang",
    ],
    berkasKhusus: [],
  },
  partner: {
    potongan: "75% biaya DPP dan SKS",
    tahapan: TAHAP_LANGSUNG,
    berkasKhusus: ["Surat Rekomendasi Sekolah"],
  },
  achievement: {
    potongan: "25% - 100% sesuai rapor atau sertifikat (diambil yang terbesar)",
    tahapan: TAHAP_LANGSUNG,
    berkasKhusus: ["Sertifikat prestasi"],
    benefit: "Berkesempatan menjadi Duta UPITRA",
  },
  admission: {
    potongan: "Tidak ada potongan khusus jalur",
    tahapan: [
      "Seleksi rapor",
      "Seleksi CBT online",
      "Seleksi wawancara",
      "Surat penerimaan (LoA), lalu daftar ulang",
    ],
    berkasKhusus: [],
  },
  legacy: {
    potongan: "Anak alumni 50%, saudara alumni 25% biaya DPP dan SKS",
    tahapan: [
      "Seleksi berkas Kartu Keluarga dan ijazah alumni",
      "Seleksi CBT dan wawancara: dinyatakan lulus",
      "Surat penerimaan (LoA), lalu daftar ulang",
    ],
    berkasKhusus: ["Kartu Keluarga (KK)", "Ijazah alumni UPITRA"],
  },
  "future-leader": {
    potongan: "Beasiswa hingga 75% biaya DPP dan SKS",
    tahapan: TAHAP_LANGSUNG,
    berkasKhusus: ["Surat Rekomendasi Sekolah/Gereja/Organisasi lain"],
    benefit: "Dapat mengikuti Student Leadership Camp Forum",
  },
  creator: {
    potongan: "50% biaya DPP dan SKS (follower minimal 10K)",
    tahapan: [
      "Seleksi berkas portofolio",
      "Seleksi CBT online: dilewati",
      "Seleksi wawancara",
      "Surat penerimaan (LoA), lalu daftar ulang",
    ],
    berkasKhusus: [
      "Portofolio",
      "Bukti jumlah follower (khusus content creator)",
    ],
    benefit: "Berkesempatan mengikuti Portfolio Development",
  },
};

/** Kode jalur untuk tautan pendaftaran, sama dengan kode di master data (READY-...). */
export const kodeDaftar = (kode: KodeJalur) => `ready-${kode}`;
