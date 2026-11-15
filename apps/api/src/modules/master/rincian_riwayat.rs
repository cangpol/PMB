//! Riwayat Rincian Biaya Kuliah: arsip versi biaya sebelum perubahan, dan unduhan publik
//! (PDF / Excel) untuk versi yang berakhir dalam 1 tahun terakhir.

use axum::{
    Json,
    body::Body,
    extract::{Path, State},
    http::header,
    response::{IntoResponse, Response},
};
use chrono::{DateTime, Utc};
use rust_xlsxwriter::{Format, FormatAlign, Workbook};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::RequireAdmin,
    modules::master::rincian_biaya::total_hingga_lulus,
    pdfkit::{self, ABU, BIRU, EMAS, GARIS, Halaman, LATAR, NAVY, PUTIH, TEKS},
    state::AppState,
};

/// Riwayat hanya dapat diunduh untuk periode yang berakhir dalam rentang ini.
const MASA_RIWAYAT: &str = "1 year";

// ---------------------------------------------------------------------------
// Pengarsipan manual oleh admin
// ---------------------------------------------------------------------------

/// Kondisi biaya semua program studi aktif saat ini.
async fn kondisi_saat_ini(pool: &PgPool) -> Result<Vec<ItemArsip>, AppError> {
    let rows: Vec<ItemArsip> = sqlx::query_as(
        "SELECT ps.kode_prodi, ps.nama_prodi, ps.jenjang, ps.fakultas,
                COALESCE(r.admisi, 0) AS admisi, COALESCE(r.semester_1, 0) AS semester_1,
                COALESCE(r.semester_2, 0) AS semester_2, COALESCE(r.semester_3, 0) AS semester_3,
                COALESCE(r.semester_4, 0) AS semester_4, COALESCE(r.semester_5, 0) AS semester_5,
                COALESCE(r.semester_6, 0) AS semester_6, COALESCE(r.semester_7, 0) AS semester_7,
                COALESCE(r.semester_8, 0) AS semester_8,
                COALESCE(r.jumlah_semester, CASE WHEN ps.jenjang = 'D3' THEN 6 ELSE 8 END) AS jumlah_semester
         FROM program_studi ps
         LEFT JOIN rincian_biaya_kuliah r ON r.prodi_id = ps.id
         WHERE ps.is_active = TRUE
         ORDER BY ps.kode_prodi",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

/// Jadikan biaya kuliah saat ini sebuah arsip (biaya periode yang berakhir sekarang). Ditolak bila
/// biaya sama persis dengan arsip terakhir, supaya tidak ada arsip kembar.
pub(crate) async fn arsipkan_biaya_saat_ini(
    pool: &PgPool,
    user_id: Option<Uuid>,
    keterangan: Option<&str>,
) -> Result<Uuid, AppError> {
    let keterangan = keterangan.map(str::trim).filter(|k| !k.is_empty());
    if let Some(k) = keterangan
        && k.chars().count() > 150
    {
        return Err(AppError::BadRequest(
            "Keterangan arsip maksimal 150 karakter".into(),
        ));
    }
    let sekarang = kondisi_saat_ini(pool).await?;
    if sekarang.is_empty() {
        return Err(AppError::BadRequest(
            "Belum ada program studi aktif untuk diarsipkan".into(),
        ));
    }

    let terakhir: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM rincian_biaya_versi ORDER BY berlaku_sampai DESC, created_at DESC LIMIT 1",
    )
    .fetch_optional(pool)
    .await?;
    if let Some(id) = terakhir {
        let mut lama: Vec<ItemArsip> = sqlx::query_as(
            "SELECT kode_prodi, nama_prodi, jenjang, fakultas, admisi, semester_1, semester_2,
                    semester_3, semester_4, semester_5, semester_6, semester_7, semester_8,
                    jumlah_semester
             FROM rincian_biaya_versi_item WHERE versi_id = $1 ORDER BY kode_prodi",
        )
        .bind(id)
        .fetch_all(pool)
        .await?;
        lama.sort_by(|a, b| a.kode_prodi.cmp(&b.kode_prodi));
        if lama == sekarang {
            return Err(AppError::Conflict(
                "Biaya kuliah saat ini sama dengan arsip terakhir, belum ada perubahan untuk diarsipkan."
                    .into(),
            ));
        }
    }

    let mut tx = pool.begin().await?;
    let versi: Uuid = sqlx::query_scalar(
        "INSERT INTO rincian_biaya_versi (berlaku_dari, berlaku_sampai, dibuat_oleh, keterangan)
         VALUES (COALESCE((SELECT MAX(berlaku_sampai) FROM rincian_biaya_versi),
                          (SELECT MIN(updated_at) FROM rincian_biaya_kuliah), NOW()),
                 NOW(), $1, $2)
         RETURNING id",
    )
    .bind(user_id)
    .bind(keterangan)
    .fetch_one(&mut *tx)
    .await?;
    for it in &sekarang {
        sqlx::query(
            "INSERT INTO rincian_biaya_versi_item
                (versi_id, kode_prodi, nama_prodi, jenjang, fakultas, admisi, semester_1, semester_2,
                 semester_3, semester_4, semester_5, semester_6, semester_7, semester_8, jumlah_semester)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)",
        )
        .bind(versi)
        .bind(&it.kode_prodi)
        .bind(&it.nama_prodi)
        .bind(&it.jenjang)
        .bind(&it.fakultas)
        .bind(it.admisi)
        .bind(it.semester_1)
        .bind(it.semester_2)
        .bind(it.semester_3)
        .bind(it.semester_4)
        .bind(it.semester_5)
        .bind(it.semester_6)
        .bind(it.semester_7)
        .bind(it.semester_8)
        .bind(it.jumlah_semester)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;
    Ok(versi)
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ArsipkanBiayaRequest {
    /// Keterangan arsip, mis. "Biaya T.A. 2025/2026"
    pub keterangan: Option<String>,
}

#[utoipa::path(
    post,
    path = "/api/admin/konfigurasi/rincian-biaya-kuliah/arsipkan",
    tag = "Konfigurasi Admin",
    request_body = ArsipkanBiayaRequest,
    responses(
        (status = 200, description = "Biaya kuliah saat ini diarsipkan"),
        (status = 409, description = "Biaya sama dengan arsip terakhir")
    )
)]
pub async fn arsipkan_biaya_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Json(req): Json<ArsipkanBiayaRequest>,
) -> Result<impl IntoResponse, AppError> {
    let id = arsipkan_biaya_saat_ini(&state.db, Some(admin.0.user_id), req.keterangan.as_deref())
        .await?;
    Ok(Json(serde_json::json!({ "ok": true, "id": id })))
}

#[utoipa::path(
    get,
    path = "/api/admin/konfigurasi/rincian-biaya-kuliah/arsip",
    tag = "Konfigurasi Admin",
    responses((status = 200, description = "Semua arsip biaya kuliah", body = Vec<VersiBiayaItem>))
)]
pub async fn list_arsip_admin_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    Ok(Json(daftar_versi(&state.db, false).await?))
}

#[utoipa::path(
    delete,
    path = "/api/admin/konfigurasi/rincian-biaya-kuliah/arsip/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID arsip")),
    responses((status = 200, description = "Arsip dihapus"), (status = 404, description = "Tidak ditemukan"))
)]
pub async fn hapus_arsip_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let r = sqlx::query("DELETE FROM rincian_biaya_versi WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;
    if r.rows_affected() == 0 {
        return Err(AppError::NotFound("Arsip tidak ditemukan".into()));
    }
    Ok(Json(serde_json::json!({ "ok": true })))
}

// ---------------------------------------------------------------------------
// Daftar & unduhan publik
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct VersiBiayaItem {
    pub id: Uuid,
    pub berlaku_dari: DateTime<Utc>,
    pub berlaku_sampai: DateTime<Utc>,
    /// Keterangan dari admin, mis. "Biaya T.A. 2025/2026"
    pub keterangan: Option<String>,
    pub jumlah_prodi: i64,
    /// Sudah melewati batas 1 tahun (tidak tampil/tidak dapat diunduh publik)
    pub lewat_batas: bool,
}

#[utoipa::path(
    get,
    path = "/api/master/rincian-biaya-kuliah/riwayat",
    tag = "Master",
    responses((status = 200, description = "Versi biaya kuliah sebelumnya (maksimal 1 tahun ke belakang)", body = Vec<VersiBiayaItem>))
)]
pub async fn list_riwayat_biaya_handler(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    Ok(Json(daftar_versi(&state.db, true).await?))
}

/// Daftar arsip; `hanya_terunduh` membatasi pada arsip yang berakhir dalam 1 tahun terakhir.
async fn daftar_versi(
    pool: &PgPool,
    hanya_terunduh: bool,
) -> Result<Vec<VersiBiayaItem>, AppError> {
    let batas = if hanya_terunduh {
        format!("WHERE v.berlaku_sampai >= NOW() - INTERVAL '{MASA_RIWAYAT}'")
    } else {
        String::new()
    };
    let sql = format!(
        "SELECT v.id, v.berlaku_dari, v.berlaku_sampai, v.keterangan,
                (SELECT COUNT(*) FROM rincian_biaya_versi_item i WHERE i.versi_id = v.id) AS jumlah_prodi,
                (v.berlaku_sampai < NOW() - INTERVAL '{MASA_RIWAYAT}') AS lewat_batas
         FROM rincian_biaya_versi v {batas}
         ORDER BY v.berlaku_sampai DESC, v.created_at DESC"
    );
    let rows: Vec<VersiBiayaItem> = sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .fetch_all(pool)
        .await?;
    Ok(rows)
}

#[derive(Debug, FromRow, PartialEq)]
struct ItemArsip {
    kode_prodi: String,
    nama_prodi: String,
    jenjang: String,
    fakultas: String,
    admisi: i64,
    semester_1: i64,
    semester_2: i64,
    semester_3: i64,
    semester_4: i64,
    semester_5: i64,
    semester_6: i64,
    semester_7: i64,
    semester_8: i64,
    jumlah_semester: i32,
}

impl ItemArsip {
    fn semester(&self) -> [i64; 8] {
        [
            self.semester_1,
            self.semester_2,
            self.semester_3,
            self.semester_4,
            self.semester_5,
            self.semester_6,
            self.semester_7,
            self.semester_8,
        ]
    }
    fn total(&self) -> i64 {
        total_hingga_lulus(self.admisi, &self.semester(), self.jumlah_semester)
    }
}

async fn muat_versi(pool: &PgPool, id: Uuid) -> Result<(VersiBiayaItem, Vec<ItemArsip>), AppError> {
    let sql = format!(
        "SELECT v.id, v.berlaku_dari, v.berlaku_sampai, v.keterangan, 0::bigint AS jumlah_prodi,
                FALSE AS lewat_batas
         FROM rincian_biaya_versi v
         WHERE v.id = $1 AND v.berlaku_sampai >= NOW() - INTERVAL '{MASA_RIWAYAT}'"
    );
    let versi: VersiBiayaItem = sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| {
            AppError::NotFound(
                "Riwayat biaya tidak ditemukan atau sudah melewati batas 1 tahun".to_string(),
            )
        })?;
    let items: Vec<ItemArsip> = sqlx::query_as(
        "SELECT kode_prodi, nama_prodi, jenjang, fakultas, admisi, semester_1, semester_2,
                semester_3, semester_4, semester_5, semester_6, semester_7, semester_8, jumlah_semester
         FROM rincian_biaya_versi_item WHERE versi_id = $1
         ORDER BY fakultas, jenjang DESC, nama_prodi",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;
    Ok((versi, items))
}

fn tanggal(t: DateTime<Utc>) -> String {
    (t + chrono::Duration::hours(7))
        .format("%d/%m/%Y")
        .to_string()
}

fn periode(v: &VersiBiayaItem) -> String {
    format!(
        "{} s.d. {}",
        tanggal(v.berlaku_dari),
        tanggal(v.berlaku_sampai)
    )
}

fn rupiah(n: i64) -> String {
    if n <= 0 {
        return "-".to_string();
    }
    let s = n.to_string();
    let mut out = String::new();
    for (i, c) in s.chars().enumerate() {
        if i > 0 && (s.len() - i).is_multiple_of(3) {
            out.push('.');
        }
        out.push(c);
    }
    out
}

fn tanggal_berkas(v: &VersiBiayaItem) -> String {
    (v.berlaku_sampai + chrono::Duration::hours(7))
        .format("%Y%m%d")
        .to_string()
}

fn unduhan(tipe: &str, nama: String, isi: Vec<u8>) -> Result<Response, AppError> {
    Response::builder()
        .header(header::CONTENT_TYPE, tipe)
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{nama}\""),
        )
        .body(Body::from(isi))
        .map_err(|e| AppError::Internal(e.to_string()))
}

pub async fn unduh_riwayat_excel_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Response, AppError> {
    let (versi, items) = muat_versi(&state.db, id).await?;
    let berkas = bangun_xlsx(&versi, &items)?;
    unduhan(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        format!("Rincian_Biaya_Kuliah_s.d._{}.xlsx", tanggal_berkas(&versi)),
        berkas,
    )
}

pub async fn unduh_riwayat_pdf_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Response, AppError> {
    let (versi, items) = muat_versi(&state.db, id).await?;
    let pdf = bangun_pdf(&versi, &items);
    unduhan(
        "application/pdf",
        format!("Rincian_Biaya_Kuliah_s.d._{}.pdf", tanggal_berkas(&versi)),
        pdf,
    )
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

fn bangun_xlsx(versi: &VersiBiayaItem, items: &[ItemArsip]) -> Result<Vec<u8>, AppError> {
    let galat = |e: rust_xlsxwriter::XlsxError| AppError::Internal(e.to_string());
    let mut wb = Workbook::new();
    let ws = wb.add_worksheet();
    ws.set_name("Rincian Biaya Kuliah").map_err(galat)?;
    let judul = Format::new().set_bold().set_font_size(13);
    let kepala = Format::new()
        .set_bold()
        .set_font_color(0xFFFFFF)
        .set_background_color(0x0B1F4B)
        .set_align(FormatAlign::Center);
    let uang = Format::new().set_num_format("#,##0");
    ws.write_with_format(
        0,
        0,
        format!("Rincian Biaya Kuliah - berlaku {}", periode(versi)),
        &judul,
    )
    .map_err(galat)?;
    ws.write(
        1,
        0,
        "Biaya normal (tanpa potongan beasiswa). Arsip biaya periode sebelumnya.",
    )
    .map_err(galat)?;
    let mut kolom = vec!["Fakultas", "Program Studi", "Admisi"];
    let nama_smt: Vec<String> = (1..=8).map(|n| format!("Semester {n}")).collect();
    kolom.extend(nama_smt.iter().map(String::as_str));
    kolom.push("Total hingga Lulus");
    for (c, t) in kolom.iter().enumerate() {
        ws.write_with_format(3, c as u16, *t, &kepala)
            .map_err(galat)?;
        ws.set_column_width(c as u16, if c < 2 { 30.0 } else { 15.0 })
            .map_err(galat)?;
    }
    for (i, it) in items.iter().enumerate() {
        let r = (i + 4) as u32;
        ws.write_string(r, 0, &it.fakultas).map_err(galat)?;
        ws.write_string(r, 1, format!("{} {}", it.jenjang, it.nama_prodi))
            .map_err(galat)?;
        ws.write_number_with_format(r, 2, it.admisi as f64, &uang)
            .map_err(galat)?;
        for (n, v) in it.semester().iter().enumerate() {
            if (n as i32) < it.jumlah_semester {
                ws.write_number_with_format(r, (3 + n) as u16, *v as f64, &uang)
                    .map_err(galat)?;
            } else {
                ws.write_string(r, (3 + n) as u16, "-").map_err(galat)?;
            }
        }
        ws.write_number_with_format(r, 11, it.total() as f64, &uang)
            .map_err(galat)?;
    }
    ws.set_freeze_panes(4, 2).map_err(galat)?;
    wb.save_to_buffer().map_err(galat)
}

// ---------------------------------------------------------------------------
// PDF (A4 lanskap)
// ---------------------------------------------------------------------------

const LEBAR: f64 = 841.89;
const TINGGI: f64 = 595.28;
const MARGIN: f64 = 30.0;
const TINGGI_BARIS: f64 = 17.0;
const BATAS_BAWAH: f64 = 50.0;
const UKURAN: f64 = 7.0;

/// (judul, x kanan/kiri, lebar): kolom pertama rata kiri, sisanya rata kanan.
fn kolom_pdf() -> Vec<(String, f64, f64)> {
    let mut k = vec![("Program Studi".to_string(), MARGIN, 168.0)];
    let mut x = MARGIN + 168.0;
    k.push(("Admisi".to_string(), x, 58.0));
    x += 58.0;
    for n in 1..=8 {
        k.push((format!("Smt {n}"), x, 46.0));
        x += 46.0;
    }
    k.push(("Total hingga Lulus".to_string(), x, LEBAR - MARGIN - x));
    k
}

fn kepala_tabel(h: &mut Halaman, y_atas: f64, kolom: &[(String, f64, f64)]) {
    h.kotak(MARGIN, y_atas - 16.0, LEBAR - 2.0 * MARGIN, 16.0, NAVY);
    for (i, (judul, x, w)) in kolom.iter().enumerate() {
        if i == 0 {
            h.teks(x + 3.0, y_atas - 11.0, true, 7.5, PUTIH, judul);
        } else {
            h.teks_kanan(x + w - 3.0, y_atas - 11.0, true, 7.5, PUTIH, judul);
        }
    }
}

fn kepala_halaman(h: &mut Halaman, versi: &VersiBiayaItem, pertama: bool) {
    h.kotak(0.0, TINGGI - 7.0, LEBAR, 7.0, NAVY);
    h.kotak(0.0, TINGGI - 9.5, LEBAR, 2.5, EMAS);
    if pertama {
        h.logo(MARGIN, TINGGI - 78.0, 46.0);
        h.teks(
            MARGIN + 58.0,
            TINGGI - 40.0,
            true,
            17.0,
            NAVY,
            "Rincian Biaya Kuliah",
        );
        h.teks(
            MARGIN + 58.0,
            TINGGI - 54.0,
            true,
            9.5,
            BIRU,
            "Universitas Pignatelli Triputra - arsip biaya periode sebelumnya",
        );
        h.teks(
            MARGIN + 58.0,
            TINGGI - 66.0,
            false,
            8.5,
            ABU,
            &match versi.keterangan.as_deref() {
                Some(k) if k != "Arsip otomatis" => format!("{k} | berlaku {}", periode(versi)),
                _ => format!("Berlaku {}", periode(versi)),
            },
        );
        h.garis(
            MARGIN,
            TINGGI - 84.0,
            LEBAR - MARGIN,
            TINGGI - 84.0,
            NAVY,
            1.5,
        );
    } else {
        h.teks(
            MARGIN,
            TINGGI - 28.0,
            true,
            10.0,
            NAVY,
            &format!(
                "Rincian Biaya Kuliah, berlaku {} (lanjutan)",
                periode(versi)
            ),
        );
        h.garis(
            MARGIN,
            TINGGI - 34.0,
            LEBAR - MARGIN,
            TINGGI - 34.0,
            NAVY,
            1.0,
        );
    }
}

fn bangun_pdf(versi: &VersiBiayaItem, items: &[ItemArsip]) -> Vec<u8> {
    let kolom = kolom_pdf();
    let mut halaman: Vec<Halaman> = Vec::new();
    let mut h = Halaman::baru();
    kepala_halaman(&mut h, versi, true);
    kepala_tabel(&mut h, TINGGI - 98.0, &kolom);
    let mut y = TINGGI - 98.0 - 16.0;
    halaman.push(h);

    let mut fakultas_sekarang = String::new();
    let mut selang = 0usize;
    let perlu_halaman = |y: f64, tinggi: f64| y - tinggi < BATAS_BAWAH;
    for it in items {
        let butuh = if it.fakultas != fakultas_sekarang {
            TINGGI_BARIS * 2.0
        } else {
            TINGGI_BARIS
        };
        if perlu_halaman(y, butuh) {
            let mut baru = Halaman::baru();
            kepala_halaman(&mut baru, versi, false);
            kepala_tabel(&mut baru, TINGGI - 42.0, &kolom);
            y = TINGGI - 42.0 - 16.0;
            halaman.push(baru);
        }
        let h = halaman.last_mut().unwrap();
        if it.fakultas != fakultas_sekarang {
            fakultas_sekarang = it.fakultas.clone();
            selang = 0;
            h.kotak(
                MARGIN,
                y - TINGGI_BARIS,
                LEBAR - 2.0 * MARGIN,
                TINGGI_BARIS,
                GARIS,
            );
            h.teks(
                MARGIN + 3.0,
                y - 12.0,
                true,
                7.5,
                NAVY,
                &fakultas_sekarang.to_uppercase(),
            );
            y -= TINGGI_BARIS;
        }
        if selang % 2 == 1 {
            h.kotak(
                MARGIN,
                y - TINGGI_BARIS,
                LEBAR - 2.0 * MARGIN,
                TINGGI_BARIS,
                LATAR,
            );
        }
        selang += 1;
        let ty = y - 12.0;
        h.teks(
            kolom[0].1 + 3.0,
            ty,
            true,
            UKURAN,
            TEKS,
            &format!("{} {}", it.jenjang, it.nama_prodi),
        );
        h.teks_kanan(
            kolom[1].1 + kolom[1].2 - 3.0,
            ty,
            false,
            UKURAN,
            TEKS,
            &rupiah(it.admisi),
        );
        for (n, v) in it.semester().iter().enumerate() {
            let teks = if (n as i32) < it.jumlah_semester {
                rupiah(*v)
            } else {
                "-".to_string()
            };
            let (_, x, w) = &kolom[2 + n];
            h.teks_kanan(x + w - 3.0, ty, false, UKURAN, TEKS, &teks);
        }
        let (_, x, w) = &kolom[10];
        h.teks_kanan(x + w - 3.0, ty, true, UKURAN, TEKS, &rupiah(it.total()));
        y -= TINGGI_BARIS;
    }
    if items.is_empty() {
        halaman.last_mut().unwrap().teks(
            MARGIN + 4.0,
            y - 16.0,
            false,
            9.0,
            ABU,
            "Tidak ada data pada arsip ini.",
        );
    }
    // catatan di akhir tabel
    let akhir = halaman.last_mut().unwrap();
    let mut yc = (y - 16.0).max(BATAS_BAWAH - 4.0);
    for baris in [
        "* Rincian biaya di atas merupakan BIAYA NORMAL (Tanpa Potongan Beasiswa).",
        "* Dokumen ini arsip biaya periode sebelumnya dan tidak berlaku untuk pendaftaran saat ini.",
    ] {
        akhir.teks(MARGIN, yc, false, 7.5, TEKS, baris);
        yc -= 10.0;
    }

    let total = halaman.len();
    for (n, h) in halaman.iter_mut().enumerate() {
        h.garis(MARGIN, 34.0, LEBAR - MARGIN, 34.0, GARIS, 0.6);
        h.teks(
            MARGIN,
            22.0,
            false,
            7.0,
            ABU,
            "PMB Universitas Pignatelli Triputra - arsip biaya kuliah",
        );
        h.teks_kanan(
            LEBAR - MARGIN,
            22.0,
            false,
            7.0,
            ABU,
            &format!("Halaman {} dari {}", n + 1, total),
        );
    }
    let isi: Vec<String> = halaman.into_iter().map(|h| h.s).collect();
    pdfkit::bangun_pdf_banyak(&isi, LEBAR, TINGGI)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(fak: &str, nama: &str) -> ItemArsip {
        ItemArsip {
            kode_prodi: "X".into(),
            nama_prodi: nama.into(),
            jenjang: "S1".into(),
            fakultas: fak.into(),
            admisi: 5_000_000,
            semester_1: 7_000_000,
            semester_2: 6_000_000,
            semester_3: 6_000_000,
            semester_4: 6_000_000,
            semester_5: 6_000_000,
            semester_6: 6_000_000,
            semester_7: 6_000_000,
            semester_8: 6_000_000,
            jumlah_semester: 8,
        }
    }

    fn versi() -> VersiBiayaItem {
        VersiBiayaItem {
            id: Uuid::nil(),
            berlaku_dari: Utc::now() - chrono::Duration::days(200),
            berlaku_sampai: Utc::now() - chrono::Duration::days(10),
            keterangan: Some("Biaya T.A. 2025/2026".into()),
            jumlah_prodi: 0,
            lewat_batas: false,
        }
    }

    #[test]
    fn format_rupiah_titik_ribuan() {
        assert_eq!(rupiah(0), "-");
        assert_eq!(rupiah(7_000_000), "7.000.000");
        assert_eq!(rupiah(250_000), "250.000");
        assert_eq!(rupiah(1_234), "1.234");
    }

    #[test]
    fn total_item_sama_dengan_rumus() {
        assert_eq!(item("F", "A").total(), 54_000_000);
    }

    #[test]
    fn xlsx_dan_pdf_terbentuk() {
        let data: Vec<_> = (0..40)
            .map(|i| {
                item(
                    if i % 2 == 0 {
                        "Fakultas A"
                    } else {
                        "Fakultas B"
                    },
                    "Prodi",
                )
            })
            .collect();
        let x = bangun_xlsx(&versi(), &data).unwrap();
        assert_eq!(&x[..2], b"PK");
        let p = bangun_pdf(&versi(), &data);
        assert!(p.starts_with(b"%PDF"));
        assert!(bangun_pdf(&versi(), &[]).starts_with(b"%PDF"));
    }

    #[sqlx::test(migrations = "./migrations")]
    #[ignore = "butuh PostgreSQL"]
    async fn arsip_biaya_manual_tanpa_kembar_dan_batas_satu_tahun(pool: PgPool) {
        let aktif: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM program_studi WHERE is_active")
            .fetch_one(&pool)
            .await
            .unwrap();
        let hitung = |p: PgPool| async move {
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM rincian_biaya_versi")
                .fetch_one(&p)
                .await
                .unwrap()
        };
        assert_eq!(hitung(pool.clone()).await, 0);

        // arsipkan: seluruh program studi aktif tersimpan beserta keterangannya
        let id = arsipkan_biaya_saat_ini(&pool, None, Some("  Biaya T.A. 2025/2026 "))
            .await
            .unwrap();
        assert_eq!(hitung(pool.clone()).await, 1);
        let (item, ket): (i64, Option<String>) = sqlx::query_as(
            "SELECT (SELECT COUNT(*) FROM rincian_biaya_versi_item WHERE versi_id = v.id), v.keterangan
             FROM rincian_biaya_versi v WHERE v.id = $1",
        )
        .bind(id)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(item, aktif);
        assert_eq!(ket.as_deref(), Some("Biaya T.A. 2025/2026"));

        // tanpa perubahan biaya: ditolak (tidak ada arsip kembar)
        assert!(arsipkan_biaya_saat_ini(&pool, None, None).await.is_err());
        assert_eq!(hitung(pool.clone()).await, 1);

        // biaya berubah: arsip kedua dapat dibuat; mengubah biaya sendiri tidak mengarsipkan
        sqlx::query("UPDATE rincian_biaya_kuliah SET admisi = 9999999 WHERE prodi_id = (SELECT id FROM program_studi ORDER BY kode_prodi LIMIT 1)")
            .execute(&pool)
            .await
            .unwrap();
        assert_eq!(hitung(pool.clone()).await, 1);
        arsipkan_biaya_saat_ini(&pool, None, None).await.unwrap();
        assert_eq!(hitung(pool.clone()).await, 2);

        // batas 1 tahun: arsip tua tidak tampil publik dan tidak dapat dimuat
        sqlx::query("UPDATE rincian_biaya_versi SET berlaku_sampai = NOW() - INTERVAL '400 days' WHERE id = $1")
            .bind(id)
            .execute(&pool)
            .await
            .unwrap();
        assert!(muat_versi(&pool, id).await.is_err());
        let publik = daftar_versi(&pool, true).await.unwrap();
        assert_eq!(publik.len(), 1);
        let admin = daftar_versi(&pool, false).await.unwrap();
        assert_eq!(admin.len(), 2);
        assert!(admin.iter().any(|v| v.id == id && v.lewat_batas));
    }
}
