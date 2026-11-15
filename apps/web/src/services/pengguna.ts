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

export interface DataPengguna {
  email: string;
  nama_lengkap: string;
  no_hp: string;
}

export interface PenggunaDenganPassword {
  pengguna: Pengguna;
  /** Kosong bila password ditentukan admin sendiri */
  password_sementara: string;
}

export function buatPengguna(
  data: DataPengguna & { role: string; password?: string },
): Promise<PenggunaDenganPassword> {
  return fetchApi<PenggunaDenganPassword>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify({ ...data, password: data.password || undefined }),
  });
}

export function ubahPengguna(
  id: string,
  data: DataPengguna,
): Promise<Pengguna> {
  return fetchApi<Pengguna>(`/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function aturStatusPengguna(
  id: string,
  isActive: boolean,
): Promise<Pengguna> {
  return fetchApi<Pengguna>(`/api/admin/users/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function resetPasswordPengguna(
  id: string,
): Promise<PenggunaDenganPassword> {
  return fetchApi<PenggunaDenganPassword>(
    `/api/admin/users/${id}/reset-password`,
    { method: "POST" },
  );
}

export function hapusPengguna(id: string): Promise<void> {
  return fetchApi<void>(`/api/admin/users/${id}`, { method: "DELETE" });
}
