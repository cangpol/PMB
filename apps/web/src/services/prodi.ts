import { fetchApi } from "./api";
import type { components } from "../types/api";

export type ProdiResponse = components["schemas"]["ProdiResponse"];
export type FakultasWithProdiResponse =
  components["schemas"]["FakultasWithProdiResponse"];

/**
 * Mengambil seluruh program studi aktif dari backend master PMB
 */
export async function getProdiList(): Promise<ProdiResponse[]> {
  return fetchApi<ProdiResponse[]>("/api/master/prodi");
}

/**
 * Mengambil daftar fakultas beserta program studi di dalamnya
 */
export async function getFakultasWithProdiList(): Promise<
  FakultasWithProdiResponse[]
> {
  return fetchApi<FakultasWithProdiResponse[]>("/api/master/fakultas");
}

/**
 * Mengambil detail program studi berdasarkan slug (misal: s1-informatika) atau ID UUID
 */
export async function getProdiBySlug(slug: string): Promise<ProdiResponse> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slug.trim(),
    );
  if (isUuid) {
    return await fetchApi<ProdiResponse>(`/api/master/prodi/${slug.trim()}`);
  }
  return await fetchApi<ProdiResponse>(
    `/api/master/prodi/slug/${encodeURIComponent(slug.trim())}`,
  );
}

/**
 * Format nominal Rupiah dengan standar id-ID dan penanganan nilai kosong/NULL
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "Segera diumumkan";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format rentang biaya UKT
 */
export function formatRentangUkt(
  min: number | null | undefined,
  maks: number | null | undefined,
): string {
  if (min === null || min === undefined) {
    if (maks !== null && maks !== undefined) {
      return formatRupiah(maks);
    }
    return "Segera diumumkan";
  }
  if (maks === null || maks === undefined || min === maks) {
    return formatRupiah(min);
  }
  return `${formatRupiah(min)} - ${formatRupiah(maks)}`;
}

/**
 * Format daya tampung kuota
 */
export function formatDayaTampung(
  kuota: number | null | undefined,
): string {
  if (kuota === null || kuota === undefined || kuota <= 0) {
    return "Segera diumumkan";
  }
  return `${kuota} Mahasiswa`;
}

/**
 * Format lama studi semester
 */
export function formatLamaStudi(
  semester: number | null | undefined,
  jenjang: string,
): string {
  if (semester && semester > 0) {
    const tahun = (semester / 2).toFixed(semester % 2 === 0 ? 0 : 1);
    return `${semester} Semester (${tahun} Tahun)`;
  }
  return jenjang === "D3" ? "6 Semester (3 Tahun)" : "8 Semester (4 Tahun)";
}

