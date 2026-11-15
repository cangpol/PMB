export interface Prospek {
  id: string;
  nama: string;
  no_hp: string;
  email: string;
  asal_sekolah: string;
  prodi_minat: string;
  pesan: string | null;
  sumber: string;
  status: "BARU" | "DIHUBUNGI" | "SUDAH_DAFTAR";
  catatan: string | null;
  created_at: string;
}

export const LABEL_STATUS_PROSPEK: Record<Prospek["status"], string> = {
  BARU: "Baru",
  DIHUBUNGI: "Sudah dihubungi",
  SUDAH_DAFTAR: "Sudah daftar",
};

export const LABEL_SUMBER_PROSPEK: Record<string, string> = {
  POPUP_BERANDA: "Pop up beranda",
  KONSULTASI_ONLINE: "Konsultasi online",
};

const sel = (v: string) => `"${v.replace(/"/g, '""')}"`;

/** Isi CSV untuk diunduh admin (awalan = diberi tanda petik agar tidak dibaca sebagai rumus). */
export function prospekKeCsv(daftar: readonly Prospek[]): string {
  const aman = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v);
  const baris = [
    [
      "Tanggal",
      "Nama",
      "No HP/WA",
      "Email",
      "Asal Sekolah",
      "Program Studi",
      "Sumber",
      "Pertanyaan",
      "Status",
      "Catatan",
    ],
    ...daftar.map((p) => [
      new Date(p.created_at).toLocaleString("id-ID"),
      p.nama,
      p.no_hp,
      p.email,
      p.asal_sekolah,
      p.prodi_minat,
      LABEL_SUMBER_PROSPEK[p.sumber] ?? p.sumber,
      p.pesan ?? "",
      LABEL_STATUS_PROSPEK[p.status],
      p.catatan ?? "",
    ]),
  ];
  return baris.map((b) => b.map((v) => sel(aman(v))).join(",")).join("\r\n");
}

/** Tautan WhatsApp dari nomor lokal (08…) atau internasional. */
export function tautanWa(noHp: string): string {
  const d = noHp.replace(/\D/g, "");
  return `https://wa.me/${d.startsWith("0") ? `62${d.slice(1)}` : d}`;
}
