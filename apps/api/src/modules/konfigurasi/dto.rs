use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

// ================= 1. TAHUN AKADEMIK =================
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateTahunAkademikRequest {
    #[validate(length(min = 4, max = 20, message = "Kode tahun akademik 4-20 karakter"))]
    pub kode: String,

    #[validate(length(min = 3, message = "Nama tahun akademik minimal 3 karakter"))]
    pub nama: String,

    pub tgl_mulai: NaiveDate,
    pub tgl_selesai: NaiveDate,
    pub is_active: bool,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdateTahunAkademikRequest {
    #[validate(length(min = 4, max = 20, message = "Kode tahun akademik 4-20 karakter"))]
    pub kode: String,

    #[validate(length(min = 3, message = "Nama tahun akademik minimal 3 karakter"))]
    pub nama: String,

    pub tgl_mulai: NaiveDate,
    pub tgl_selesai: NaiveDate,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct TahunAkademikResponse {
    pub id: Uuid,
    pub kode: String,
    pub nama: String,
    pub tgl_mulai: NaiveDate,
    pub tgl_selesai: NaiveDate,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ================= 2. FAKULTAS =================
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateFakultasRequest {
    #[validate(length(min = 2, max = 10, message = "Kode fakultas 2-10 karakter"))]
    pub kode_fakultas: String,

    #[validate(length(min = 3, message = "Nama fakultas minimal 3 karakter"))]
    pub nama_fakultas: String,

    pub deskripsi: Option<String>,
    pub is_active: bool,
}

pub type UpdateFakultasRequest = CreateFakultasRequest;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct FakultasResponse {
    pub id: Uuid,
    pub kode_fakultas: String,
    pub nama_fakultas: String,
    pub deskripsi: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ================= 3. GELOMBANG =================
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateGelombangRequest {
    #[validate(length(min = 3, message = "Nama gelombang minimal 3 karakter"))]
    pub nama_gelombang: String,

    pub tahun_akademik_id: Option<Uuid>,
    pub nomor_gelombang: i32,
    pub status: String,
    pub tgl_mulai: DateTime<Utc>,
    pub tgl_selesai: DateTime<Utc>,

    #[validate(range(min = 0, message = "Kuota gelombang tidak boleh negatif"))]
    pub kuota: i32,

    pub is_active: bool,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdateGelombangRequest {
    #[validate(length(min = 3, message = "Nama gelombang minimal 3 karakter"))]
    pub nama_gelombang: String,

    pub tahun_akademik_id: Option<Uuid>,
    pub nomor_gelombang: i32,
    pub status: String,
    pub tgl_mulai: DateTime<Utc>,
    pub tgl_selesai: DateTime<Utc>,

    #[validate(range(min = 0, message = "Kuota gelombang tidak boleh negatif"))]
    pub kuota: i32,

    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, FromRow)]
pub struct GelombangDetailResponse {
    pub id: Uuid,
    pub nama_gelombang: String,
    pub tahun_akademik_id: Option<Uuid>,
    pub tahun_akademik_nama: Option<String>,
    pub nomor_gelombang: i32,
    pub status: String,
    pub tgl_mulai: DateTime<Utc>,
    pub tgl_selesai: DateTime<Utc>,
    pub kuota: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ================= 4. PROGRAM STUDI & KUOTA =================
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateProdiKonfigurasiRequest {
    #[validate(length(min = 2, max = 10, message = "Kode prodi 2-10 karakter"))]
    pub kode_prodi: String,

    #[validate(length(min = 3, message = "Nama prodi minimal 3 karakter"))]
    pub nama_prodi: String,

    pub jenjang: String,
    pub fakultas_id: Option<Uuid>,
    pub fakultas: String,
    pub kode_fakultas: String,
    pub passing_score: f64,

    #[validate(range(min = 0, message = "Kuota prodi tidak boleh negatif"))]
    pub kuota: i32,

    #[validate(range(min = 0, message = "Nominal UKT tidak boleh negatif"))]
    pub ukt_nominal: i64,

    pub is_active: bool,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdateProdiKonfigurasiRequest {
    #[validate(length(min = 2, max = 10, message = "Kode prodi 2-10 karakter"))]
    pub kode_prodi: String,

    #[validate(length(min = 3, message = "Nama prodi minimal 3 karakter"))]
    pub nama_prodi: String,

    pub jenjang: String,
    pub fakultas_id: Option<Uuid>,
    pub fakultas: String,
    pub kode_fakultas: String,
    pub passing_score: f64,

    #[validate(range(min = 0, message = "Kuota prodi tidak boleh negatif"))]
    pub kuota: i32,

    #[validate(range(min = 0, message = "Nominal UKT tidak boleh negatif"))]
    pub ukt_nominal: i64,

    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ProdiDetailResponse {
    pub id: Uuid,
    pub kode_prodi: String,
    pub nama_prodi: String,
    pub jenjang: String,
    pub fakultas: String,
    pub kode_fakultas: String,
    pub fakultas_id: Option<Uuid>,
    pub passing_score: f64,
    pub kuota: i32,
    pub ukt_nominal: i64,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct SetKuotaProdiGelombangRequest {
    pub prodi_id: Uuid,
    pub gelombang_id: Uuid,

    #[validate(range(min = 0, message = "Kuota gelombang prodi tidak boleh negatif"))]
    pub kuota: i32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, FromRow)]
pub struct KuotaProdiGelombangResponse {
    pub id: Uuid,
    pub prodi_id: Uuid,
    pub nama_prodi: String,
    pub gelombang_id: Uuid,
    pub nama_gelombang: String,
    pub kuota: i32,
    pub kuota_terisi: i32,
    pub updated_at: DateTime<Utc>,
}

// ================= 5. JALUR MASUK =================
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateJalurKonfigurasiRequest {
    #[validate(length(min = 2, max = 50, message = "Kode jalur 2-50 karakter"))]
    pub kode_jalur: String,

    #[validate(length(min = 3, message = "Nama jalur minimal 3 karakter"))]
    pub nama_jalur: String,

    pub deskripsi: String,

    #[validate(range(min = 0, message = "Biaya formulir tidak boleh negatif"))]
    pub biaya_formulir: i64,

    pub tipe_seleksi: String,
    pub syarat: Option<String>,
    pub kuota_maksimal: Option<i32>,
    pub is_active: bool,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdateJalurKonfigurasiRequest {
    #[validate(length(min = 2, max = 50, message = "Kode jalur 2-50 karakter"))]
    pub kode_jalur: String,

    #[validate(length(min = 3, message = "Nama jalur minimal 3 karakter"))]
    pub nama_jalur: String,

    pub deskripsi: String,

    #[validate(range(min = 0, message = "Biaya formulir tidak boleh negatif"))]
    pub biaya_formulir: i64,

    pub tipe_seleksi: String,
    pub syarat: Option<String>,
    pub kuota_maksimal: Option<i32>,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct JalurDetailResponse {
    pub id: Uuid,
    pub kode_jalur: String,
    pub nama_jalur: String,
    pub deskripsi: String,
    pub biaya_formulir: i64,
    pub tipe_seleksi: String,
    pub syarat: Option<String>,
    pub kuota_maksimal: Option<i32>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ================= 6. KOMPONEN & MATRIKS BIAYA =================
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateKomponenBiayaRequest {
    #[validate(length(min = 2, max = 50, message = "Kode komponen 2-50 karakter"))]
    pub kode_komponen: String,

    #[validate(length(min = 3, message = "Nama komponen minimal 3 karakter"))]
    pub nama_komponen: String,

    pub deskripsi: Option<String>,
    pub is_active: bool,
}

pub type UpdateKomponenBiayaRequest = CreateKomponenBiayaRequest;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct KomponenBiayaResponse {
    pub id: Uuid,
    pub kode_komponen: String,
    pub nama_komponen: String,
    pub deskripsi: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateMatriksBiayaRequest {
    pub prodi_id: Uuid,
    pub jalur_id: Uuid,
    pub gelombang_id: Uuid,
    pub komponen_id: Uuid,

    #[validate(range(min = 0, message = "Nominal biaya tidak boleh negatif"))]
    pub nominal: i64,

    pub bisa_dicicil: bool,

    #[validate(range(min = 1, message = "Maksimal cicilan minimal 1 kali"))]
    pub maksimal_cicilan: i32,

    pub nominal_cicilan_pertama: Option<i64>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdateMatriksBiayaRequest {
    #[validate(range(min = 0, message = "Nominal biaya tidak boleh negatif"))]
    pub nominal: i64,

    pub bisa_dicicil: bool,

    #[validate(range(min = 1, message = "Maksimal cicilan minimal 1 kali"))]
    pub maksimal_cicilan: i32,

    pub nominal_cicilan_pertama: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, FromRow)]
pub struct MatriksBiayaResponse {
    pub id: Uuid,
    pub prodi_id: Uuid,
    pub nama_prodi: String,
    pub jalur_id: Uuid,
    pub nama_jalur: String,
    pub gelombang_id: Uuid,
    pub nama_gelombang: String,
    pub komponen_id: Uuid,
    pub nama_komponen: String,
    pub kode_komponen: String,
    pub nominal: i64,
    pub bisa_dicicil: bool,
    pub maksimal_cicilan: i32,
    pub nominal_cicilan_pertama: Option<i64>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct HitungBiayaRequest {
    pub prodi_id: Uuid,
    pub jalur_id: Uuid,
    pub gelombang_id: Uuid,
    pub voucher_kode: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct BiayaItemDetail {
    pub komponen_id: Uuid,
    pub nama_komponen: String,
    pub kode_komponen: String,
    pub nominal: i64,
    pub bisa_dicicil: bool,
    pub maksimal_cicilan: i32,
    pub cicilan_pertama: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct HitungBiayaResponse {
    pub total_nominal_asli: i64,
    pub diskon_voucher: i64,
    pub total_akhir: i64,
    pub voucher_valid: bool,
    pub voucher_pesan: Option<String>,
    pub bisa_dicicil: bool,
    pub maksimal_cicilan_maks: i32,
    pub estimasi_cicilan_pertama: i64,
    pub estimasi_cicilan_berikutnya: i64,
    pub rincian_komponen: Vec<BiayaItemDetail>,
}

// ================= 7. VOUCHER =================
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateVoucherRequest {
    #[validate(length(min = 3, max = 50, message = "Kode voucher 3-50 karakter"))]
    pub kode_voucher: String,

    pub tipe_diskon: String,

    #[validate(range(min = 1, message = "Nilai diskon harus lebih dari 0"))]
    pub nilai_diskon: i64,

    #[validate(range(min = 1, message = "Kuota voucher minimal 1"))]
    pub kuota: i32,

    pub tgl_kadaluarsa: DateTime<Utc>,
    pub batas_jalur_id: Option<Uuid>,
    pub batas_prodi_id: Option<Uuid>,
    pub deskripsi: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdateVoucherRequest {
    pub tipe_diskon: String,

    #[validate(range(min = 1, message = "Nilai diskon harus lebih dari 0"))]
    pub nilai_diskon: i64,

    #[validate(range(min = 1, message = "Kuota voucher minimal 1"))]
    pub kuota: i32,

    pub tgl_kadaluarsa: DateTime<Utc>,
    pub batas_jalur_id: Option<Uuid>,
    pub batas_prodi_id: Option<Uuid>,
    pub deskripsi: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct VoucherDetailResponse {
    pub id: Uuid,
    pub kode_voucher: String,
    pub tipe_diskon: String,
    pub nilai_diskon: i64,
    pub kuota: i32,
    pub kuota_terpakai: i32,
    pub tgl_kadaluarsa: DateTime<Utc>,
    pub batas_jalur_id: Option<Uuid>,
    pub batas_prodi_id: Option<Uuid>,
    pub deskripsi: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ================= 8. PENGATURAN PMB =================
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdatePengaturanRequest {
    #[validate(length(min = 2, message = "Kunci pengaturan tidak boleh kosong"))]
    pub kunci: String,

    pub nilai: String,
    pub deskripsi: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PengaturanResponse {
    pub id: Uuid,
    pub kunci: String,
    pub nilai: String,
    pub deskripsi: Option<String>,
    pub updated_at: DateTime<Utc>,
}
