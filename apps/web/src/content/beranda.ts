/**
 * ==============================================================================
 * KONTEN HALAMAN BERANDA PUBLIK PMB UNIVERSITAS PIGNATELLI TRIPUTRA
 * ==============================================================================
 * Seluruh teks presentasi, CTA, manfaat gelombang, dan indikator statistik
 * dipusatkan pada berkas ini untuk memisahkan data konten dari markup logika tampilan.
 */

export interface StatistikMetrik {
  nilai: string;
  label: string;
  deskripsi: string;
}

/**
 * PERHATIAN & CATATAN KEBIJAKAN KONTEN:
 * Angka dan klaim metrik statistik di bawah ini merupakan data indikatif/contoh publikasi
 * dan WAJIB diverifikasi serta divalidasi oleh Biro PMB / Humas Universitas
 * Pignatelli Triputra sebelum dipublikasikan secara resmi ke publik.
 * JANGAN menampilkan angka klaim sebagai fakta final tanpa konfirmasi pimpinan institusi.
 */
export const STATISTIK_BERANDA: StatistikMetrik[] = [
  {
    nilai: "100%",
    label: "Peluang Beasiswa",
    deskripsi: "Kemitraan Strategis Triputra Group",
  },
  {
    nilai: "10 Prodi",
    label: "Program Studi Pilihan",
    deskripsi: "Jenjang Sarjana (S1) & Vokasi (D3)",
  },
  {
    nilai: "3x Cicilan",
    label: "Fleksibilitas Biaya",
    deskripsi: "Skema Pembayaran UKT Ringan",
  },
  {
    nilai: "94%",
    label: "Keterserapan Lulusan",
    deskripsi: "Jejaring Industri & Karier Nyata",
  },
];

export const HERO_CONTENT = {
  eyebrow: "Penerimaan Mahasiswa Baru T.A. 2026/2027",
  judulUtama: "Membangun Pemimpin Unggul bersama",
  kampusSorot: "Universitas Pignatelli Triputra",
  deskripsi:
    "Wujudkan masa depan gemilang dengan pendidikan tinggi berkarakter, kurikulum aplikatif, dan kesempatan jalur karier langsung bersama jejaring industri strategis ",
  mitraIndustri: "Triputra Group",
  ctaPrimer: {
    label: "Daftar Sekarang",
    href: "/register",
  },
  ctaSekunder: {
    label: "Lihat Jalur Masuk",
    href: "/jalur-masuk",
  },
  ctaKelulusan: {
    label: "Cek Kelulusan",
    href: "/cek-kelulusan",
  },
};

export const GELOMBANG_CONTENT = {
  badgeDefault: "GELOMBANG 1",
  judulDefault: "Pendaftaran Early Bird",
  subjudulTarget: "Batas Akhir Pendaftaran & Verifikasi:",
  keuntunganJudul: "Keuntungan Gelombang 1:",
  keuntunganList: [
    "Potongan Dana Pengembangan Pendidikan (DPP) Rp 2.000.000",
    "Peluang beasiswa kemitraan industri prioritas utama",
    "Jadwal seleksi & verifikasi berkas lebih fleksibel",
  ],
  ctaAktif: "Amankan Kuota Anda Sekarang",
  stateDitutup: {
    badge: "Gelombang Ditutup",
    judul: "Pendaftaran Gelombang Ini Telah Berakhir",
    subjudul: "Nantikan pembukaan periode gelombang seleksi berikutnya.",
    jadwalBerikutnya: "Dibuka kembali sesuai kalender akademik PMB.",
    cta: "Lihat Jadwal Gelombang",
    ctaHref: "/jadwal",
  },
};

