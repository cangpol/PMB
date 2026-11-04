import type { components } from "./api";

export type Schemas = components["schemas"];

export type ApiErrorResponse = Schemas["ApiErrorResponse"];
export type AuthResponse = Schemas["AuthResponse"];
export type LoginRequest = Schemas["LoginRequest"];
export type RegisterRequest = Schemas["RegisterRequest"] & {
  sumber_informasi?: string;
  sumber_informasi_lainnya?: string;
};
export type VerifyEmailRequest = Schemas["VerifyEmailRequest"];
export type ForgotPasswordRequest = Schemas["ForgotPasswordRequest"];
export type ResetPasswordRequest = Schemas["ResetPasswordRequest"];
export type ChangePasswordRequest = Schemas["ChangePasswordRequest"];
export type UpdateUserRoleRequest = Schemas["UpdateUserRoleRequest"];
export type UserListItemResponse = Schemas["UserListItemResponse"];
export type GenericMessageResponse = Schemas["GenericMessageResponse"];

export type ProdiResponse = Schemas["ProdiResponse"];
export type JalurResponse = Schemas["JalurResponse"];
export type GelombangResponse = Schemas["GelombangResponse"];
export type PendaftarDetailResponse = Schemas["PendaftarDetailResponse"];
export type PembayaranDetailResponse = Schemas["PembayaranDetailResponse"];
export type StepperStep = Schemas["StepperStep"];
export type CalonDashboardResponse = Schemas["CalonDashboardResponse"];
export type AdminDashboardResponse = Schemas["AdminDashboardResponse"];
export type ProdiStat = Schemas["ProdiStat"];
export type FunnelStat = Schemas["FunnelStat"];
export type BerkasResponse = Schemas["BerkasResponse"];
export type UploadBerkasRequest = Schemas["UploadBerkasRequest"];
export type PresignedUrlResponse = Schemas["PresignedUrlResponse"];

// Konfigurasi Admin Types
export type TahunAkademikResponse = Schemas["TahunAkademikResponse"];
export type CreateTahunAkademikRequest = Schemas["CreateTahunAkademikRequest"];
export type UpdateTahunAkademikRequest = Schemas["UpdateTahunAkademikRequest"];
export type FakultasResponse = Schemas["FakultasResponse"];
export type CreateFakultasRequest = Schemas["CreateFakultasRequest"];
export type GelombangDetailResponse = Schemas["GelombangDetailResponse"];
export type CreateGelombangRequest = Schemas["CreateGelombangRequest"];
export type UpdateGelombangRequest = Schemas["UpdateGelombangRequest"];
export type ProdiDetailResponse = Schemas["ProdiDetailResponse"];
export type CreateProdiKonfigurasiRequest =
  Schemas["CreateProdiKonfigurasiRequest"];
export type UpdateProdiKonfigurasiRequest =
  Schemas["UpdateProdiKonfigurasiRequest"];
export type KuotaProdiGelombangResponse =
  Schemas["KuotaProdiGelombangResponse"];
export type SetKuotaProdiGelombangRequest =
  Schemas["SetKuotaProdiGelombangRequest"];
export type JalurDetailResponse = Schemas["JalurDetailResponse"];
export type CreateJalurKonfigurasiRequest =
  Schemas["CreateJalurKonfigurasiRequest"];
export type UpdateJalurKonfigurasiRequest =
  Schemas["UpdateJalurKonfigurasiRequest"];
export type KomponenBiayaResponse = Schemas["KomponenBiayaResponse"];
export type CreateKomponenBiayaRequest = Schemas["CreateKomponenBiayaRequest"];
export type MatriksBiayaResponse = Schemas["MatriksBiayaResponse"];
export type CreateMatriksBiayaRequest = Schemas["CreateMatriksBiayaRequest"];
export type UpdateMatriksBiayaRequest = Schemas["UpdateMatriksBiayaRequest"];
export type HitungBiayaRequest = Schemas["HitungBiayaRequest"];
export type HitungBiayaResponse = Schemas["HitungBiayaResponse"];
export type BiayaItemDetail = Schemas["BiayaItemDetail"];
export type VoucherDetailResponse = Schemas["VoucherDetailResponse"];
export type CreateVoucherRequest = Schemas["CreateVoucherRequest"];
export type UpdateVoucherRequest = Schemas["UpdateVoucherRequest"];
export type PengaturanResponse = Schemas["PengaturanResponse"];
export type UpdatePengaturanRequest = Schemas["UpdatePengaturanRequest"];

export type UserRole =
  | "super_admin"
  | "admin_pmb"
  | "keuangan"
  | "pengawas_ujian"
  | "asesor_rpl"
  | "calon_mahasiswa";

// Tipe pendukung UI
export interface BerkasItem {
  id: string;
  nama: string;
  wajib: boolean;
  status: string;
}
