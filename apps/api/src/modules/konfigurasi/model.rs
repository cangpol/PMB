use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct TahunAkademik {
    pub id: Uuid,
    pub kode: String,
    pub nama: String,
    pub tgl_mulai: NaiveDate,
    pub tgl_selesai: NaiveDate,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct Fakultas {
    pub id: Uuid,
    pub kode_fakultas: String,
    pub nama_fakultas: String,
    pub deskripsi: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct GelombangDetail {
    pub id: Uuid,
    pub nama_gelombang: String,
    pub tahun_akademik_id: Option<Uuid>,
    pub nomor_gelombang: i32,
    pub status: String,
    pub tgl_mulai: DateTime<Utc>,
    pub tgl_selesai: DateTime<Utc>,
    pub kuota: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct ProgramStudiDetail {
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

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct KuotaProdiGelombang {
    pub id: Uuid,
    pub prodi_id: Uuid,
    pub gelombang_id: Uuid,
    pub kuota: i32,
    pub kuota_terisi: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct JalurMasukDetail {
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

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct KomponenBiaya {
    pub id: Uuid,
    pub kode_komponen: String,
    pub nama_komponen: String,
    pub deskripsi: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct MatriksBiaya {
    pub id: Uuid,
    pub prodi_id: Uuid,
    pub jalur_id: Uuid,
    pub gelombang_id: Uuid,
    pub komponen_id: Uuid,
    pub nominal: i64,
    pub bisa_dicicil: bool,
    pub maksimal_cicilan: i32,
    pub nominal_cicilan_pertama: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct VoucherDetail {
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

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct PengaturanPmb {
    pub id: Uuid,
    pub kunci: String,
    pub nilai: String,
    pub deskripsi: Option<String>,
    pub updated_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
}
