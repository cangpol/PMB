import { fetchApi } from "./api";
import type { components } from "@/types/api";

export type Pengguna = components["schemas"]["UserListItemResponse"];
export type HasilPeranMassal = components["schemas"]["AturPeranMassalResponse"];

export async function getDaftarPengguna(
  cari: string,
  role: string,
): Promise<Pengguna[]> {
  const p = new URLSearchParams();
  if (cari.trim()) p.set("q", cari.trim());
  if (role) p.set("role", role);
  const qs = p.toString();
  return fetchApi<Pengguna[]>(`/api/admin/users${qs ? `?${qs}` : ""}`);
}

export async function aturPeranMassal(
  userIds: string[],
  role: string,
): Promise<HasilPeranMassal> {
  return fetchApi<HasilPeranMassal>("/api/admin/users/peran-massal", {
    method: "PUT",
    body: JSON.stringify({ user_ids: userIds, role }),
  });
}
