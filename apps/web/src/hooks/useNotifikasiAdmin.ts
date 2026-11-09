import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/services/api";

export interface NotifikasiAdmin {
  id: string;
  tipe: string;
  judul: string;
  pesan: string;
  sudah_dibaca: boolean;
  created_at: string;
}

/** Notifikasi admin (mis. kuota jalur penuh); gagal memuat = tanpa penanda. */
export function useNotifikasiAdmin() {
  return useQuery<NotifikasiAdmin[]>({
    queryKey: ["admin-notifikasi"],
    queryFn: () => fetchApi("/api/pendaftaran/admin/notifikasi"),
    refetchInterval: 60_000,
    retry: false,
  });
}
