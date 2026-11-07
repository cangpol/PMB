use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct HasilKelulusan {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub sidang_id: Option<Uuid>,
    pub status_kelulusan: String, // 'LULUS_PILIHAN_1', 'LULUS_PILIHAN_2', 'CADANGAN', 'TIDAK_LULUS'
    pub prodi_diterima_id: Option<Uuid>,
    pub pilihan_ke: Option<i32>,
    pub ranking: Option<i32>,
    pub skor_cbt: Option<f64>,
    pub nilai_rapor: Option<f64>,
    pub nilai_prestasi: Option<f64>,
    pub skor_akhir: f64,
    pub nim_resmi: Option<String>,
    pub nomor_surat_loa: Option<String>,
    pub tanggal_sk: Option<NaiveDate>,
    pub is_published: bool,
    pub catatan_sidang: Option<String>,
    pub status_daftar_ulang: String, // 'BELUM_DAFTAR_ULANG', 'TAGIHAN_TERBIT', 'LUNAS', 'BERKAS_LENGKAP', 'TERDAFTAR_SEBAGAI_MAHASISWA'
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct RumusPenilaianJalur {
    pub id: Uuid,
    pub jalur_id: Uuid,
    pub bobot_cbt: f64,
    pub bobot_rapor: f64,
    pub bobot_prestasi: f64,
    pub bobot_wawancara: f64,
    pub default_passing_score: f64,
    pub keterangan: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct SidangKelulusan {
    pub id: Uuid,
    pub gelombang_id: Option<Uuid>,
    pub nama_sidang: String,
    pub nomor_sk: Option<String>,
    pub tanggal_sidang: NaiveDate,
    pub tgl_pengumuman: DateTime<Utc>,
    pub status_sidang: String, // 'DRAFT', 'DISETUJUI', 'DIPUBLIKASIKAN', 'DIBATALKAN'
    pub total_peserta: i32,
    pub total_lulus: i32,
    pub total_cadangan: i32,
    pub total_tidak_lulus: i32,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub catatan_sidang: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AuditKelulusan {
    pub id: Uuid,
    /// NULL untuk audit tingkat sidang (draf/approve/publish), terisi untuk audit per calon.
    pub pendaftar_id: Option<Uuid>,
    pub sidang_id: Option<Uuid>,
    pub status_lama: Option<String>,
    pub status_baru: String,
    pub prodi_lama_id: Option<Uuid>,
    pub prodi_baru_id: Option<Uuid>,
    pub actor_id: Option<Uuid>,
    pub actor_name: String,
    pub catatan: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct NimCounter {
    pub tahun: i32,
    pub prodi_id: Uuid,
    pub last_number: i32,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct BerkasDaftarUlang {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub jenis_berkas: String, // 'SURAT_PERNYATAAN_MABA', 'SURAT_BEBAS_NARKOBA', 'AKTA_KELAHIRAN', 'IJAZAH_LEGALISIR'
    pub file_key: String,
    pub file_name: String,
    pub mime_type: String,
    pub file_size_bytes: i64,
    pub status_verifikasi: String, // 'PENDING', 'VALID', 'INVALID'
    pub catatan: Option<String>,
    pub uploaded_at: DateTime<Utc>,
    pub verified_by: Option<Uuid>,
    pub verified_at: Option<DateTime<Utc>>,
}
