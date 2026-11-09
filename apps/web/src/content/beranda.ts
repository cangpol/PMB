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

export const JALUR_PENERIMAAN = [
  {
    kode: "early",
    nama: "READY Early",
    keterangan: "Dibuka sesuai gelombang",
    ketentuan: [
      "Seleksi rapor kelas 11 semester 4, rata-rata keseluruhan minimal 80",
      "Formulir gratis",
      "Potongan 100% biaya DPP dan SKS",
      "Kuota 70 calon yang sudah daftar ulang",
    ],
  },
  {
    kode: "partner",
    nama: "READY Partner Scholarship",
    keterangan: "Jalur Mitra Sekolah",
    ketentuan: [
      "Rapor semester 1-4 rata-rata minimal 75",
      "Surat Rekomendasi Sekolah",
      "Potongan 75% biaya DPP dan SKS",
    ],
  },
  {
    kode: "achievement",
    nama: "READY Achievement",
    keterangan: "Jalur Prestasi Siswa",
    ketentuan: [
      "Nilai rapor + sertifikat prestasi",
      "Rapor > 88: 100%, 83-87,9: 75%, 78-82,9: 50%, 75-77,9: 25%",
      "Sertifikat: Internasional 100%, Nasional 75%, Provinsi 50%, Kota/Kabupaten 25%",
      "Berkesempatan menjadi Duta UPITRA",
    ],
  },
  {
    kode: "admission",
    nama: "READY Admission",
    keterangan: "Jalur Reguler",
    ketentuan: ["Seleksi rapor, CBT online, lalu wawancara"],
  },
  {
    kode: "legacy",
    nama: "READY Legacy Scholarship",
    keterangan: "Jalur Alumni UPITRA",
    ketentuan: ["Seleksi berkas Kartu Keluarga (KK) dan ijazah alumni"],
  },
  {
    kode: "future-leader",
    nama: "READY Future Leader",
    keterangan: "Jalur Aktivis Organisasi (Osis, OMK, dll)",
    ketentuan: [
      "Rapor semester 1-4 rata-rata minimal 75",
      "Surat Rekomendasi Sekolah/Gereja/Organisasi lain",
      "Beasiswa up to 75%",
      "Dapat mengikuti Student Leadership Camp Forum",
    ],
  },
  {
    kode: "creator",
    nama: "READY Creator",
    keterangan: "Jalur Konten dan Talenta Digital",
    ketentuan: [
      "Berkas portofolio dan seleksi wawancara",
      "Follower minimal 10K (khusus content creator): potongan 50% biaya DPP dan SKS",
      "Berkesempatan mengikuti Portfolio Development",
    ],
  },
] as const;
