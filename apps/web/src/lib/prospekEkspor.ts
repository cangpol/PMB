export type FormatEkspor = "xlsx" | "pdf";

export interface FilterEksporProspek {
  status?: string;
  sumber?: string;
}

/** Unduh daftar prospek dari server (Excel atau PDF), sesuai filter yang dipilih. */
export async function unduhProspek(
  format: FormatEkspor,
  filter: FilterEksporProspek = {},
): Promise<void> {
  const q = new URLSearchParams();
  if (filter.status) q.set("status", filter.status);
  if (filter.sumber) q.set("sumber", filter.sumber);
  const qs = q.toString();
  const res = await fetch(
    `/api/cms/admin/prospek/export.${format}${qs ? `?${qs}` : ""}`,
    { credentials: "include" },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as {
      pesan?: string;
    } | null;
    throw new Error(err?.pesan ?? `Gagal mengunduh (HTTP ${res.status})`);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `Calon_Prospek_PMB_${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
