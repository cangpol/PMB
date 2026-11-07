import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { fetchApi } from "@/services/api";
import { useAuth } from "@/context";
import type { components } from "@/types/api";

export type FiturSistem = components["schemas"]["FiturResponse"];

export const KUNCI_FITUR = ["fitur-sistem"] as const;

/** Status sakelar fitur sistem (mis. pengawas CBT). Hanya untuk pengguna yang sudah login. */
export function useFitur(): UseQueryResult<FiturSistem> {
  const { user } = useAuth();
  return useQuery({
    queryKey: KUNCI_FITUR,
    queryFn: () => fetchApi<FiturSistem>("/api/fitur"),
    enabled: !!user,
    staleTime: 30_000,
    retry: false,
  });
}

/** Super Admin menyalakan/mematikan fitur pengawas CBT. */
export function useAturPengawasCbt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (aktif: boolean) =>
      fetchApi<FiturSistem>("/api/fitur/pengawas-cbt", {
        method: "PUT",
        body: JSON.stringify({ aktif }),
      }),
    onSuccess: (data) => qc.setQueryData(KUNCI_FITUR, data),
  });
}
