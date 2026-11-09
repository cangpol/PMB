import { useEffect, useRef } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchApi } from "@/services/api";
import { useAuth } from "@/context";
import { useToast } from "@/components/ui/useToast";
import type { components } from "@/types/api";

export type AntreanVerifikasi =
  components["schemas"]["AntreanVerifikasiResponse"];
export type JenisAntrean =
  | "berkas"
  | "bukti_bayar"
  | "daftar_ulang"
  | "cbt_keputusan"
  | "seleksi_rapor"
  | "seleksi_interview";

export const KUNCI_ANTREAN = ["antrean-verifikasi"] as const;
const JEDA_CEK_MS = 30_000;

/** Peran yang punya antrean pemeriksaan (peran lain tidak perlu memanggil API). */
const PERAN_PEMERIKSA = ["admin_pmb", "super_admin", "keuangan"];

/**
 * Jumlah berkas/bukti yang menunggu diperiksa panitia. Diperbarui tiap 30 detik,
 * saat tab kembali aktif, dan setiap berpindah halaman admin.
 */
export function useAntreanVerifikasi(): UseQueryResult<AntreanVerifikasi> {
  const { user } = useAuth();
  const aktif = !!user && PERAN_PEMERIKSA.includes(user.role);
  return useQuery({
    queryKey: KUNCI_ANTREAN,
    queryFn: () => fetchApi<AntreanVerifikasi>("/api/dashboard/admin/antrean"),
    enabled: aktif,
    refetchInterval: JEDA_CEK_MS,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
    retry: false,
  });
}

/** Teks ringkas tiap jenis antrean untuk notifikasi. */
const NAMA: Record<JenisAntrean, string> = {
  berkas: "berkas pendaftaran",
  bukti_bayar: "bukti pembayaran",
  daftar_ulang: "berkas daftar ulang",
  cbt_keputusan: "hasil CBT menunggu penilaian",
  seleksi_rapor: "calon perlu seleksi rapor",
  seleksi_interview: "calon perlu seleksi interview",
};

/** Kalimat notifikasi untuk tambahan antrean; null bila tidak ada tambahan. */
export function pesanTambahan(
  lama: AntreanVerifikasi,
  baru: AntreanVerifikasi,
): string | null {
  const bagian = (Object.keys(NAMA) as JenisAntrean[])
    .map((k) => ({ k, tambah: baru[k].menunggu - lama[k].menunggu }))
    .filter((x) => x.tambah > 0)
    .map((x) => `${x.tambah} ${NAMA[x.k]} baru`);
  return bagian.length ? `${bagian.join(", ")} menunggu diperiksa.` : null;
}

/** Awalan "(N) " pada judul tab agar admin tahu ada pekerjaan walau tab di latar belakang. */
export function judulDenganAntrean(judul: string, total: number): string {
  const polos = judul.replace(/^\(\d+\)\s+/, "");
  return total > 0 ? `(${total}) ${polos}` : polos;
}

/**
 * Memberi tahu admin saat ada berkas/bukti baru masuk (toast) dan menandai judul
 * tab. Panggil sekali di layout admin. Muat pertama tidak memunculkan toast.
 */
export function useNotifikasiAntrean(): void {
  const { data } = useAntreanVerifikasi();
  const { toast } = useToast();
  const sebelumnya = useRef<AntreanVerifikasi | null>(null);

  useEffect(() => {
    if (!data) return;
    const lama = sebelumnya.current;
    sebelumnya.current = data;
    if (lama) {
      const pesan = pesanTambahan(lama, data);
      if (pesan) {
        toast({
          variant: "peringatan",
          title: "Perlu diperiksa admin",
          description: pesan,
        });
      }
    }
  }, [data, toast]);

  const total = data?.total ?? 0;
  useEffect(() => {
    document.title = judulDenganAntrean(document.title, total);
  }, [total, data]);
}
