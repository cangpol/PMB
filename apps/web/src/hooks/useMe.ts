import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "../services/api";
import type { AuthResponse } from "../types";

export const ME_QUERY_KEY = ["auth", "me"] as const;

export function useMe() {
  return useQuery<AuthResponse>({
    queryKey: ME_QUERY_KEY,
    queryFn: () => fetchApi<AuthResponse>("/api/auth/me"),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}
