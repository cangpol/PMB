export interface FormMinat {
  nama: string;
  no_hp: string;
  email: string;
  asal_sekolah: string;
  prodi_id: string;
}

export type GalatMinat = Partial<Record<keyof FormMinat, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validasiMinat(f: FormMinat): GalatMinat {
  const g: GalatMinat = {};
  if (f.nama.trim().length < 3) g.nama = "Nama lengkap minimal 3 karakter";
  const hp = f.no_hp.trim();
  const digit = hp.replace(/[\s+-]/g, "");
  if (!/^[\d\s+-]+$/.test(hp) || digit.length < 9 || digit.length > 15)
    g.no_hp = "Nomor HP/WA tidak valid";
  if (!EMAIL.test(f.email.trim())) g.email = "Format email tidak valid";
  if (f.asal_sekolah.trim().length < 2) g.asal_sekolah = "Isi asal sekolah";
  if (!f.prodi_id) g.prodi_id = "Pilih program studi";
  return g;
}
