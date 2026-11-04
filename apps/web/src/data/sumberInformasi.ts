/** Pilihan "Dari mana Anda mengetahui PMB UPITRA?" (kode harus sama dengan backend). */
export const SUMBER_INFORMASI_OPTIONS: ReadonlyArray<{
  kode: string;
  label: string;
}> = [
  { kode: "INSTAGRAM", label: "Instagram" },
  { kode: "TIKTOK", label: "TikTok" },
  { kode: "FACEBOOK", label: "Facebook" },
  { kode: "YOUTUBE", label: "YouTube" },
  { kode: "WEBSITE_UPITRA", label: "Website UPITRA" },
  { kode: "GOOGLE", label: "Pencarian Google" },
  { kode: "WHATSAPP", label: "WhatsApp / Broadcast" },
  { kode: "SOSIALISASI_SEKOLAH", label: "Sosialisasi di Sekolah" },
  { kode: "TEMAN_KELUARGA", label: "Teman / Keluarga" },
  { kode: "ALUMNI_MAHASISWA", label: "Alumni / Mahasiswa UPITRA" },
  { kode: "BROSUR_SPANDUK", label: "Brosur / Spanduk / Baliho" },
  { kode: "PAMERAN_EDUFAIR", label: "Pameran Pendidikan / Edufair" },
  { kode: "IKLAN_MEDIA", label: "Iklan Media (Radio/TV/Koran)" },
  { kode: "LAINNYA", label: "Lainnya" },
];
