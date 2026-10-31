// Layanan API Modul Konfigurasi PMB Admin
// Universitas Pignatelli Triputra

import { fetchApi } from "./api";
import type {
  TahunAkademikResponse,
  CreateTahunAkademikRequest,
  UpdateTahunAkademikRequest,
  FakultasResponse,
  CreateFakultasRequest,
  GelombangDetailResponse,
  CreateGelombangRequest,
  UpdateGelombangRequest,
  ProdiDetailResponse,
  CreateProdiKonfigurasiRequest,
  UpdateProdiKonfigurasiRequest,
  KuotaProdiGelombangResponse,
  SetKuotaProdiGelombangRequest,
  JalurDetailResponse,
  CreateJalurKonfigurasiRequest,
  UpdateJalurKonfigurasiRequest,
  KomponenBiayaResponse,
  CreateKomponenBiayaRequest,
  MatriksBiayaResponse,
  CreateMatriksBiayaRequest,
  UpdateMatriksBiayaRequest,
  HitungBiayaRequest,
  HitungBiayaResponse,
  VoucherDetailResponse,
  CreateVoucherRequest,
  UpdateVoucherRequest,
  PengaturanResponse,
  UpdatePengaturanRequest,
  GenericMessageResponse,
} from "../types";

const BASE_URL = "/api/admin/konfigurasi";

// ================= 1. TAHUN AKADEMIK =================
export async function getTahunAkademikList(): Promise<TahunAkademikResponse[]> {
  return fetchApi<TahunAkademikResponse[]>(`${BASE_URL}/tahun-akademik`);
}

export async function createTahunAkademik(
  data: CreateTahunAkademikRequest,
): Promise<TahunAkademikResponse> {
  return fetchApi<TahunAkademikResponse>(`${BASE_URL}/tahun-akademik`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTahunAkademik(
  id: string,
  data: UpdateTahunAkademikRequest,
): Promise<TahunAkademikResponse> {
  return fetchApi<TahunAkademikResponse>(`${BASE_URL}/tahun-akademik/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTahunAkademik(
  id: string,
): Promise<GenericMessageResponse> {
  return fetchApi<GenericMessageResponse>(`${BASE_URL}/tahun-akademik/${id}`, {
    method: "DELETE",
  });
}

// ================= 2. FAKULTAS =================
export async function getFakultasList(): Promise<FakultasResponse[]> {
  return fetchApi<FakultasResponse[]>(`${BASE_URL}/fakultas`);
}

export async function createFakultas(
  data: CreateFakultasRequest,
): Promise<FakultasResponse> {
  return fetchApi<FakultasResponse>(`${BASE_URL}/fakultas`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFakultas(
  id: string,
  data: CreateFakultasRequest,
): Promise<FakultasResponse> {
  return fetchApi<FakultasResponse>(`${BASE_URL}/fakultas/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteFakultas(
  id: string,
): Promise<GenericMessageResponse> {
  return fetchApi<GenericMessageResponse>(`${BASE_URL}/fakultas/${id}`, {
    method: "DELETE",
  });
}

// ================= 3. GELOMBANG =================
export async function getGelombangAdminList(): Promise<
  GelombangDetailResponse[]
> {
  return fetchApi<GelombangDetailResponse[]>(`${BASE_URL}/gelombang`);
}

export async function createGelombang(
  data: CreateGelombangRequest,
): Promise<GelombangDetailResponse> {
  return fetchApi<GelombangDetailResponse>(`${BASE_URL}/gelombang`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateGelombang(
  id: string,
  data: UpdateGelombangRequest,
): Promise<GelombangDetailResponse> {
  return fetchApi<GelombangDetailResponse>(`${BASE_URL}/gelombang/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteGelombang(
  id: string,
): Promise<GenericMessageResponse> {
  return fetchApi<GenericMessageResponse>(`${BASE_URL}/gelombang/${id}`, {
    method: "DELETE",
  });
}

// ================= 4. PROGRAM STUDI & KUOTA =================
export async function getProdiAdminList(): Promise<ProdiDetailResponse[]> {
  return fetchApi<ProdiDetailResponse[]>(`${BASE_URL}/prodi`);
}

export async function createProdi(
  data: CreateProdiKonfigurasiRequest,
): Promise<ProdiDetailResponse> {
  return fetchApi<ProdiDetailResponse>(`${BASE_URL}/prodi`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProdi(
  id: string,
  data: UpdateProdiKonfigurasiRequest,
): Promise<ProdiDetailResponse> {
  return fetchApi<ProdiDetailResponse>(`${BASE_URL}/prodi/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProdi(id: string): Promise<GenericMessageResponse> {
  return fetchApi<GenericMessageResponse>(`${BASE_URL}/prodi/${id}`, {
    method: "DELETE",
  });
}

export async function getKuotaProdiGelombangList(): Promise<
  KuotaProdiGelombangResponse[]
> {
  return fetchApi<KuotaProdiGelombangResponse[]>(`${BASE_URL}/kuota-prodi`);
}

export async function setKuotaProdiGelombang(
  data: SetKuotaProdiGelombangRequest,
): Promise<KuotaProdiGelombangResponse> {
  return fetchApi<KuotaProdiGelombangResponse>(`${BASE_URL}/kuota-prodi`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ================= 5. JALUR MASUK =================
export async function getJalurAdminList(): Promise<JalurDetailResponse[]> {
  return fetchApi<JalurDetailResponse[]>(`${BASE_URL}/jalur`);
}

export async function createJalur(
  data: CreateJalurKonfigurasiRequest,
): Promise<JalurDetailResponse> {
  return fetchApi<JalurDetailResponse>(`${BASE_URL}/jalur`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateJalur(
  id: string,
  data: UpdateJalurKonfigurasiRequest,
): Promise<JalurDetailResponse> {
  return fetchApi<JalurDetailResponse>(`${BASE_URL}/jalur/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteJalur(id: string): Promise<GenericMessageResponse> {
  return fetchApi<GenericMessageResponse>(`${BASE_URL}/jalur/${id}`, {
    method: "DELETE",
  });
}

// ================= 6. KOMPONEN BIAYA =================
export async function getKomponenBiayaList(): Promise<KomponenBiayaResponse[]> {
  return fetchApi<KomponenBiayaResponse[]>(`${BASE_URL}/komponen-biaya`);
}

export async function createKomponenBiaya(
  data: CreateKomponenBiayaRequest,
): Promise<KomponenBiayaResponse> {
  return fetchApi<KomponenBiayaResponse>(`${BASE_URL}/komponen-biaya`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateKomponenBiaya(
  id: string,
  data: CreateKomponenBiayaRequest,
): Promise<KomponenBiayaResponse> {
  return fetchApi<KomponenBiayaResponse>(`${BASE_URL}/komponen-biaya/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteKomponenBiaya(
  id: string,
): Promise<GenericMessageResponse> {
  return fetchApi<GenericMessageResponse>(`${BASE_URL}/komponen-biaya/${id}`, {
    method: "DELETE",
  });
}

// ================= 7. MATRIKS BIAYA & SIMULASI =================
export async function getMatriksBiayaList(): Promise<MatriksBiayaResponse[]> {
  return fetchApi<MatriksBiayaResponse[]>(`${BASE_URL}/matriks-biaya`);
}

export async function createMatriksBiaya(
  data: CreateMatriksBiayaRequest,
): Promise<GenericMessageResponse> {
  return fetchApi<GenericMessageResponse>(`${BASE_URL}/matriks-biaya`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMatriksBiaya(
  id: string,
  data: UpdateMatriksBiayaRequest,
): Promise<GenericMessageResponse> {
  return fetchApi<GenericMessageResponse>(`${BASE_URL}/matriks-biaya/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMatriksBiaya(
  id: string,
): Promise<GenericMessageResponse> {
  return fetchApi<GenericMessageResponse>(`${BASE_URL}/matriks-biaya/${id}`, {
    method: "DELETE",
  });
}

export async function hitungSimulasiBiaya(
  data: HitungBiayaRequest,
): Promise<HitungBiayaResponse> {
  return fetchApi<HitungBiayaResponse>(`${BASE_URL}/matriks-biaya/hitung`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ================= 8. VOUCHER =================
export async function getVouchersList(): Promise<VoucherDetailResponse[]> {
  return fetchApi<VoucherDetailResponse[]>(`${BASE_URL}/vouchers`);
}

export async function createVoucher(
  data: CreateVoucherRequest,
): Promise<VoucherDetailResponse> {
  return fetchApi<VoucherDetailResponse>(`${BASE_URL}/vouchers`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateVoucher(
  id: string,
  data: UpdateVoucherRequest,
): Promise<VoucherDetailResponse> {
  return fetchApi<VoucherDetailResponse>(`${BASE_URL}/vouchers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteVoucher(
  id: string,
): Promise<GenericMessageResponse> {
  return fetchApi<GenericMessageResponse>(`${BASE_URL}/vouchers/${id}`, {
    method: "DELETE",
  });
}

// ================= 9. PENGATURAN PMB =================
export async function getPengaturanList(): Promise<PengaturanResponse[]> {
  return fetchApi<PengaturanResponse[]>(`${BASE_URL}/pengaturan`);
}

export async function updatePengaturan(
  data: UpdatePengaturanRequest,
): Promise<PengaturanResponse> {
  return fetchApi<PengaturanResponse>(`${BASE_URL}/pengaturan`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
