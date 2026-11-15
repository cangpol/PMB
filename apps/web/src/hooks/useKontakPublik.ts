import { useQuery } from "@tanstack/react-query";

export interface KontakPublik {
  email: string;
  whatsapp: string;
  jam_layanan: string;
  alamat: string;
}

/** Cadangan bila data belum bisa dimuat (nilai awal sama dengan data bawaan). */
export const KONTAK_BAWAAN: KontakPublik = {
  email: "pmb@upitra.ac.id",
  whatsapp: "+62 812-3456-7890",
  jam_layanan: "Senin - Jumat: 08.00 - 16.00 WIB",
  alamat:
    "Jl. Duwet No. 1, Karangasem, Laweyan, Kota Surakarta, Jawa Tengah 57145",
};

/** Nomor untuk tautan tel:/wa.me (hanya angka, awalan 0 diganti 62). */
export const nomorTautan = (nomor: string): string => {
  const angka = nomor.replace(/\D/g, "");
  return angka.startsWith("0") ? `62${angka.slice(1)}` : angka;
};

/** Pisahkan jam layanan menjadi baris ("A | B" atau satu baris). */
export const barisJam = (jam: string): string[] =>
  jam
    .split("|")
    .map((b) => b.trim())
    .filter(Boolean);

/** Kontak sekretariat dari Pengaturan PMB; kolom kosong memakai nilai bawaan. */
export function useKontakPublik(): KontakPublik {
  const { data } = useQuery<KontakPublik>({
    queryKey: ["kontak-publik"],
    queryFn: async () => {
      const res = await fetch("/api/cms/kontak");
      if (!res.ok) throw new Error("gagal");
      return res.json();
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
  return {
    email: data?.email || KONTAK_BAWAAN.email,
    whatsapp: data?.whatsapp || KONTAK_BAWAAN.whatsapp,
    jam_layanan: data?.jam_layanan || KONTAK_BAWAAN.jam_layanan,
    alamat: data?.alamat || KONTAK_BAWAAN.alamat,
  };
}
