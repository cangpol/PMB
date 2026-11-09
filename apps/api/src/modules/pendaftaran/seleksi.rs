//! Tahap seleksi (Rapor -> CBT Online -> Interview), kuota daftar ulang per jalur, dan
//! notifikasi admin ketika calon tertolak karena kuota jalur penuh.
//!
//! - Kuota jalur (`jalur_masuk.kuota_maksimal`, mis. READY Early = 70) dihitung dari calon yang
//!   sudah daftar ulang (`DAFTAR_ULANG_LUNAS` / `TERDAFTAR`). Bila penuh, calon berikutnya yang
//!   daftar ulang ditahan di status `MENUNGGU_PINDAH_JALUR`, admin diberi notifikasi, lalu admin
//!   memindahkannya ke jalur lain.

use axum::{
    Json,
    extract::{Path, Query, State},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgConnection, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

use super::alur::{self, status};
use super::beasiswa::{self, AturanJalur, MasukanPotongan};
use crate::{error::AppError, extractors::RequireAdmin, state::AppState};

pub const TAHAP_RAPOR: &str = "RAPOR";
pub const TAHAP_INTERVIEW: &str = "INTERVIEW";
pub const HASIL_LULUS: &str = "LULUS";
pub const HASIL_TIDAK_LULUS: &str = "TIDAK_LULUS";
pub const HASIL_MENUNGGU: &str = "MENUNGGU";

const STATUS_TERISI: [&str; 2] = [status::DAFTAR_ULANG_LUNAS, status::TERDAFTAR];

// ---------------------------------------------------------------------------
// Kuota jalur
// ---------------------------------------------------------------------------

/// Sisa kuota jalur: `None` = tanpa batas, `Some(n)` = n tempat tersisa (bisa 0).
pub fn sisa_kuota(kuota_maksimal: Option<i32>, terisi: i64) -> Option<i64> {
    kuota_maksimal.map(|k| (i64::from(k) - terisi).max(0))
}

/// Kunci baris jalur lalu hitung sisa kuotanya (dipanggil di dalam transaksi agar tidak balapan).
async fn sisa_kuota_terkunci(
    conn: &mut PgConnection,
    jalur_id: Uuid,
) -> Result<Option<i64>, AppError> {
    let kuota: Option<Option<i32>> =
        sqlx::query_scalar("SELECT kuota_maksimal FROM jalur_masuk WHERE id = $1 FOR UPDATE")
            .bind(jalur_id)
            .fetch_optional(&mut *conn)
            .await?;
    let Some(kuota) = kuota else {
        return Err(AppError::NotFound("Jalur tidak ditemukan".into()));
    };
    let terisi: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pendaftar WHERE jalur_id = $1 AND status_pendaftaran = ANY($2)",
    )
    .bind(jalur_id)
    .bind(STATUS_TERISI.map(String::from).to_vec())
    .fetch_one(&mut *conn)
    .await?;
    Ok(sisa_kuota(kuota, terisi))
}

/// Dipanggil sebelum daftar ulang calon dinyatakan lunas. Bila kuota jalurnya sudah penuh,
/// calon ditahan (`MENUNGGU_PINDAH_JALUR`), admin diberi notifikasi, dan fungsi mengembalikan
/// `true` (alur lunas tidak boleh dilanjutkan).
pub async fn tahan_jika_kuota_penuh(
    conn: &mut PgConnection,
    pendaftar_id: Uuid,
) -> Result<bool, AppError> {
    let baris: Option<(Uuid, String, String, String)> = sqlx::query_as(
        "SELECT p.jalur_id, j.nama_jalur, u.nama_lengkap, p.nomor_pendaftaran
         FROM pendaftar p
         JOIN jalur_masuk j ON j.id = p.jalur_id
         JOIN users u ON u.id = p.user_id
         WHERE p.id = $1",
    )
    .bind(pendaftar_id)
    .fetch_optional(&mut *conn)
    .await?;
    let Some((jalur_id, nama_jalur, nama, nomor)) = baris else {
        return Ok(false);
    };

    if sisa_kuota_terkunci(conn, jalur_id).await? != Some(0) {
        return Ok(false);
    }

    sqlx::query("UPDATE pendaftar SET status_pendaftaran = $1, updated_at = NOW() WHERE id = $2")
        .bind(status::MENUNGGU_PINDAH_JALUR)
        .bind(pendaftar_id)
        .execute(&mut *conn)
        .await?;

    sqlx::query(
        "INSERT INTO notifikasi_admin (tipe, judul, pesan, pendaftar_id) VALUES ($1, $2, $3, $4)",
    )
    .bind("KUOTA_JALUR_PENUH")
    .bind(format!("Kuota {nama_jalur} penuh: {nama} perlu dipindahkan"))
    .bind(format!(
        "{nama} ({nomor}) lulus seleksi {nama_jalur}, tetapi kuota daftar ulang jalur ini sudah terpenuhi. \
         Pindahkan calon ke jalur pendaftaran lain di menu Kuota & Pindah Jalur."
    ))
    .bind(pendaftar_id)
    .execute(&mut *conn)
    .await?;
    Ok(true)
}

// ---------------------------------------------------------------------------
// Tahap seleksi
// ---------------------------------------------------------------------------

/// Hasil seleksi rapor & interview seorang calon: (rapor, interview).
pub async fn hasil_seleksi(
    pool: &PgPool,
    pendaftar_id: Uuid,
) -> Result<(String, String), AppError> {
    let r: Option<(String, String)> = sqlx::query_as(
        "SELECT status_seleksi_rapor, status_seleksi_interview FROM pendaftar WHERE id = $1",
    )
    .bind(pendaftar_id)
    .fetch_optional(pool)
    .await?;
    Ok(r.unwrap_or_else(|| (HASIL_MENUNGGU.into(), HASIL_MENUNGGU.into())))
}

/// Gerbang CBT: calon hanya boleh ujian setelah lulus seleksi rapor.
pub async fn pastikan_lulus_rapor(pool: &PgPool, pendaftar_id: Uuid) -> Result<(), AppError> {
    let (rapor, _) = hasil_seleksi(pool, pendaftar_id).await?;
    match rapor.as_str() {
        HASIL_LULUS => Ok(()),
        HASIL_TIDAK_LULUS => Err(AppError::Conflict(
            "Anda belum lolos seleksi rapor, sehingga belum dapat mengikuti CBT.".into(),
        )),
        _ => Err(AppError::Conflict(
            "Seleksi rapor Anda masih diproses admin. CBT dapat diikuti setelah dinyatakan lulus seleksi rapor."
                .into(),
        )),
    }
}

#[derive(Debug, Clone, Serialize, serde::Deserialize, ToSchema)]
pub struct BerkasRingkas {
    pub id: Uuid,
    pub jenis_berkas: String,
    pub file_name: String,
}

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct SeleksiItem {
    pub pendaftar_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub nama_jalur: String,
    pub status_pendaftaran: String,
    pub nilai_rapor_avg: f64,
    pub status_seleksi_rapor: String,
    pub nilai_seleksi_rapor: Option<f64>,
    pub catatan_seleksi_rapor: Option<String>,
    pub skor_cbt: Option<f64>,
    pub status_seleksi_interview: String,
    pub nilai_seleksi_interview: Option<f64>,
    pub catatan_seleksi_interview: Option<String>,
    /// Berkas yang diunggah calon (untuk dicocokkan dengan nilai/kriteria seleksi)
    #[schema(value_type = Vec<BerkasRingkas>)]
    pub berkas: sqlx::types::Json<Vec<BerkasRingkas>>,
    pub kode_jalur: String,
    /// PENUH | LANGSUNG_LULUS | TANPA_CBT
    pub alur_seleksi: String,
    pub rapor_minimal: Option<f64>,
    pub potongan_tetap: Option<i32>,
    pub potongan_maks: Option<i32>,
    pub kriteria_seleksi: Option<String>,
    pub benefit_tambahan: Option<String>,
    pub potongan_persen: i32,
    pub tingkat_prestasi: Option<String>,
    pub jumlah_follower: Option<i64>,
    pub cbt_dilewati: bool,
    pub prodi_pilihan_1_nama: String,
    pub prodi_pilihan_2_nama: Option<String>,
    /// Penempatan yang sudah ditetapkan admin (1 atau 2); None = belum
    pub pilihan_ke_diterima: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct SeleksiQuery {
    /// RAPOR | INTERVIEW
    pub tahap: String,
}

const SELECT_SELEKSI: &str = "SELECT p.id AS pendaftar_id, p.nomor_pendaftaran, u.nama_lengkap,
        j.nama_jalur, p.status_pendaftaran, p.nilai_rapor_avg,
        p.status_seleksi_rapor, p.nilai_seleksi_rapor, p.catatan_seleksi_rapor,
        (SELECT hu.nilai_akhir FROM hasil_ujian hu WHERE hu.pendaftar_id = p.id
          ORDER BY hu.waktu_submit DESC LIMIT 1) AS skor_cbt,
        p.status_seleksi_interview, p.nilai_seleksi_interview, p.catatan_seleksi_interview,
        (SELECT COALESCE(json_agg(json_build_object('id', b.id, 'jenis_berkas', b.jenis_berkas,
                                                    'file_name', b.file_name) ORDER BY b.uploaded_at), '[]'::json)
           FROM berkas_pendaftar b WHERE b.pendaftar_id = p.id) AS berkas,
        j.kode_jalur, j.alur_seleksi, j.rapor_minimal, j.potongan_tetap, j.potongan_maks,
        j.kriteria_seleksi, j.benefit_tambahan,
        p.potongan_persen, p.tingkat_prestasi, p.jumlah_follower, p.cbt_dilewati,
        pr1.nama_prodi AS prodi_pilihan_1_nama, pr2.nama_prodi AS prodi_pilihan_2_nama,
        (SELECT hk.pilihan_ke FROM hasil_kelulusan hk WHERE hk.pendaftar_id = p.id) AS pilihan_ke_diterima
     FROM pendaftar p
     JOIN users u ON u.id = p.user_id
     JOIN jalur_masuk j ON j.id = p.jalur_id
     JOIN program_studi pr1 ON pr1.id = p.prodi_pilihan_1
     LEFT JOIN program_studi pr2 ON pr2.id = p.prodi_pilihan_2";

#[utoipa::path(
    get,
    path = "/api/pendaftaran/admin/seleksi",
    tag = "Seleksi Admin",
    params(("tahap" = String, Query, description = "RAPOR | INTERVIEW")),
    responses((status = 200, description = "Calon pada tahap seleksi", body = Vec<SeleksiItem>))
)]
pub async fn list_seleksi_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Query(q): Query<SeleksiQuery>,
) -> Result<impl IntoResponse, AppError> {
    // Rapor: berkas sudah terverifikasi dan belum ujian. Interview: sudah selesai CBT.
    let kondisi = match q.tahap.as_str() {
        TAHAP_RAPOR => "p.status_pendaftaran IN ('BERKAS_VERIFIED', 'MENUNGGU_UJIAN')
                        OR (p.status_seleksi_rapor <> 'LULUS' AND p.status_pendaftaran = 'TIDAK_LULUS')",
        TAHAP_INTERVIEW => "p.status_pendaftaran = 'MENUNGGU_PENGUMUMAN'
                        OR (p.status_seleksi_interview <> 'MENUNGGU' AND p.status_pendaftaran IN ('LULUS', 'TIDAK_LULUS'))",
        _ => return Err(AppError::BadRequest("Tahap harus RAPOR atau INTERVIEW".into())),
    };
    let sql = format!("{SELECT_SELEKSI} WHERE {kondisi} ORDER BY p.created_at");
    let rows: Vec<SeleksiItem> = sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .fetch_all(&state.db)
        .await?;
    Ok(Json(rows))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SimpanHasilSeleksiRequest {
    /// LULUS | TIDAK_LULUS
    pub hasil: String,
    /// RAPOR: rata-rata rapor yang sudah dicocokkan dengan berkas (menggantikan isian calon bila berbeda).
    /// INTERVIEW: nilai interview.
    pub nilai: Option<f64>,
    pub catatan: Option<String>,
    /// Penempatan program studi, 1 = pilihan pertama, 2 = pilihan kedua (INTERVIEW lulus, atau
    /// seleksi rapor/berkas jalur yang langsung meluluskan CBT dan wawancara)
    pub pilihan_ke: Option<i32>,
    /// READY Achievement: INTERNASIONAL | NASIONAL | PROVINSI | KOTA_KABUPATEN
    pub tingkat_prestasi: Option<String>,
    /// READY Creator: jumlah follower
    pub jumlah_follower: Option<i64>,
    /// Potongan DPP & SKS pilihan admin (jalur yang potongannya ditentukan admin)
    pub potongan_persen: Option<i32>,
}

#[utoipa::path(
    put,
    path = "/api/pendaftaran/admin/seleksi/{pendaftar_id}/{tahap}",
    tag = "Seleksi Admin",
    params(
        ("pendaftar_id" = Uuid, Path, description = "ID pendaftar"),
        ("tahap" = String, Path, description = "RAPOR | INTERVIEW")
    ),
    request_body = SimpanHasilSeleksiRequest,
    responses((status = 200, description = "Hasil seleksi tersimpan"))
)]
pub async fn simpan_hasil_seleksi_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path((pendaftar_id, tahap)): Path<(Uuid, String)>,
    Json(req): Json<SimpanHasilSeleksiRequest>,
) -> Result<impl IntoResponse, AppError> {
    if req.hasil != HASIL_LULUS && req.hasil != HASIL_TIDAK_LULUS {
        return Err(AppError::BadRequest(
            "Hasil harus LULUS atau TIDAK_LULUS".into(),
        ));
    }
    if let Some(n) = req.nilai
        && !(0.0..=100.0).contains(&n)
    {
        return Err(AppError::BadRequest("Nilai harus antara 0 dan 100".into()));
    }
    let catatan = req
        .catatan
        .as_deref()
        .map(str::trim)
        .filter(|c| !c.is_empty());
    let lulus = req.hasil == HASIL_LULUS;
    let pool = &state.db;

    match tahap.as_str() {
        TAHAP_RAPOR if lulus => {
            luluskan_tahap_pertama(pool, pendaftar_id, &req, catatan).await?;
        }
        TAHAP_RAPOR => {
            let res = sqlx::query(
                "UPDATE pendaftar SET status_seleksi_rapor = $2, nilai_seleksi_rapor = $3,
                        catatan_seleksi_rapor = $4,
                        nilai_rapor_avg = COALESCE($3, nilai_rapor_avg),
                        status_pendaftaran = 'TIDAK_LULUS', updated_at = NOW()
                 WHERE id = $1 AND status_pendaftaran IN ('BERKAS_VERIFIED', 'MENUNGGU_UJIAN')",
            )
            .bind(pendaftar_id)
            .bind(&req.hasil)
            .bind(req.nilai)
            .bind(catatan)
            .execute(pool)
            .await?;
            if res.rows_affected() == 0 {
                return Err(AppError::Conflict(
                    "Seleksi hanya untuk calon yang berkasnya terverifikasi dan belum ujian CBT."
                        .into(),
                ));
            }
            alur::kirim_notifikasi(
                pool,
                pendaftar_id,
                "Hasil Seleksi",
                "Mohon maaf, Anda belum dinyatakan lulus seleksi pada pendaftaran ini.",
                "SELEKSI_RAPOR",
            )
            .await;
        }
        TAHAP_INTERVIEW => {
            if lulus {
                let pilihan = req.pilihan_ke.ok_or_else(|| {
                    AppError::BadRequest(
                        "Tentukan penempatan: program studi pilihan 1 atau pilihan 2".into(),
                    )
                })?;
                if pilihan != 1 && pilihan != 2 {
                    return Err(AppError::BadRequest("Pilihan harus 1 atau 2".into()));
                }
                let (punya_pilihan_2, cbt_lulus, cbt_dilewati): (bool, Option<bool>, bool) =
                    sqlx::query_as(
                        "SELECT p.prodi_pilihan_2 IS NOT NULL,
                            (SELECT hu.is_lulus FROM hasil_ujian hu WHERE hu.pendaftar_id = p.id
                              ORDER BY hu.waktu_submit DESC LIMIT 1),
                            p.cbt_dilewati
                     FROM pendaftar p WHERE p.id = $1",
                    )
                    .bind(pendaftar_id)
                    .fetch_optional(pool)
                    .await?
                    .ok_or_else(|| AppError::NotFound("Pendaftar tidak ditemukan".into()))?;
                if pilihan == 2 && !punya_pilihan_2 {
                    return Err(AppError::BadRequest(
                        "Calon ini tidak memiliki program studi pilihan kedua".into(),
                    ));
                }
                if cbt_lulus != Some(true) && !cbt_dilewati {
                    return Err(AppError::Conflict(
                        "Hasil CBT calon belum disetujui, sehingga penempatan belum dapat ditetapkan."
                            .into(),
                    ));
                }
            }
            let res = sqlx::query(
                "UPDATE pendaftar SET status_seleksi_interview = $2, nilai_seleksi_interview = $3,
                        catatan_seleksi_interview = $4,
                        status_pendaftaran = CASE WHEN $2 = 'TIDAK_LULUS' THEN 'TIDAK_LULUS'
                                                  ELSE status_pendaftaran END,
                        updated_at = NOW()
                 WHERE id = $1 AND status_pendaftaran = 'MENUNGGU_PENGUMUMAN'",
            )
            .bind(pendaftar_id)
            .bind(&req.hasil)
            .bind(req.nilai)
            .bind(catatan)
            .execute(pool)
            .await?;
            if res.rows_affected() == 0 {
                return Err(AppError::Conflict(
                    "Interview hanya untuk calon yang sudah menyelesaikan CBT.".into(),
                ));
            }
            if lulus {
                // Lulus tiga seleksi: terbitkan LoA otomatis (jika lulus CBT)
                crate::modules::kelulusan::repository::terbitkan_kelulusan_dari_cbt(
                    pool,
                    Some(pendaftar_id),
                )
                .await?;
                tetapkan_penempatan(pool, pendaftar_id, req.pilihan_ke.unwrap_or(1)).await?;
                alur::kirim_notifikasi(
                    pool,
                    pendaftar_id,
                    "Selamat, Anda Lulus Seleksi Interview",
                    "Anda telah melewati seleksi rapor, CBT online, dan interview. Cek hasil kelulusan di portal PMB.",
                    "SELEKSI_INTERVIEW",
                )
                .await;
            } else {
                alur::kirim_notifikasi(
                    pool,
                    pendaftar_id,
                    "Hasil Seleksi Interview",
                    "Mohon maaf, Anda belum dinyatakan lulus seleksi interview pada pendaftaran ini.",
                    "SELEKSI_INTERVIEW",
                )
                .await;
            }
        }
        _ => {
            return Err(AppError::BadRequest(
                "Tahap harus RAPOR atau INTERVIEW".into(),
            ));
        }
    }
    Ok(Json(serde_json::json!({ "ok": true })))
}

/// Tetapkan program studi yang diterima (pilihan 1 atau 2) pada hasil kelulusan calon.
async fn tetapkan_penempatan(
    pool: &PgPool,
    pendaftar_id: Uuid,
    pilihan: i32,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE hasil_kelulusan hk
         SET status_kelulusan = CASE WHEN $2 = 2 THEN 'LULUS_PILIHAN_2' ELSE 'LULUS_PILIHAN_1' END,
             prodi_diterima_id = CASE WHEN $2 = 2 THEN p.prodi_pilihan_2 ELSE p.prodi_pilihan_1 END,
             pilihan_ke = $2, updated_at = NOW()
         FROM pendaftar p
         WHERE hk.pendaftar_id = $1 AND p.id = $1",
    )
    .bind(pendaftar_id)
    .bind(pilihan)
    .execute(pool)
    .await?;
    Ok(())
}

#[derive(Debug, FromRow)]
struct KonfigJalurCalon {
    kode_jalur: String,
    alur_seleksi: String,
    rapor_minimal: Option<f64>,
    potongan_tetap: Option<i32>,
    potongan_maks: Option<i32>,
    status_pendaftaran: String,
    punya_pilihan_2: bool,
}

/// Admin menyetujui seleksi tahap pertama (rapor/berkas) sesuai aturan jalur calon:
/// hitung potongan DPP & SKS, lalu majukan alur. Jalur `LANGSUNG_LULUS` melewati CBT dan
/// wawancara (keduanya dinyatakan lulus) dan langsung menerbitkan LoA; `TANPA_CBT` hanya
/// melewati CBT; `PENUH` lanjut ke CBT.
pub(crate) async fn luluskan_tahap_pertama(
    pool: &PgPool,
    pendaftar_id: Uuid,
    req: &SimpanHasilSeleksiRequest,
    catatan: Option<&str>,
) -> Result<(), AppError> {
    let k: KonfigJalurCalon = sqlx::query_as(
        "SELECT j.kode_jalur, j.alur_seleksi, j.rapor_minimal, j.potongan_tetap, j.potongan_maks,
                p.status_pendaftaran, p.prodi_pilihan_2 IS NOT NULL AS punya_pilihan_2
         FROM pendaftar p JOIN jalur_masuk j ON j.id = p.jalur_id WHERE p.id = $1",
    )
    .bind(pendaftar_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Pendaftar tidak ditemukan".into()))?;

    if k.status_pendaftaran != status::BERKAS_VERIFIED
        && k.status_pendaftaran != status::MENUNGGU_UJIAN
    {
        return Err(AppError::Conflict(
            "Seleksi hanya untuk calon yang berkasnya terverifikasi dan belum ujian CBT.".into(),
        ));
    }
    if let Some(t) = req.tingkat_prestasi.as_deref()
        && ![
            beasiswa::TINGKAT_INTERNASIONAL,
            beasiswa::TINGKAT_NASIONAL,
            beasiswa::TINGKAT_PROVINSI,
            beasiswa::TINGKAT_KOTA_KABUPATEN,
        ]
        .contains(&t)
    {
        return Err(AppError::BadRequest(
            "Tingkat prestasi tidak dikenal".into(),
        ));
    }

    let potongan = beasiswa::hitung_potongan(
        &AturanJalur {
            kode_jalur: &k.kode_jalur,
            rapor_minimal: k.rapor_minimal,
            potongan_tetap: k.potongan_tetap,
            potongan_maks: k.potongan_maks,
        },
        &MasukanPotongan {
            rata_rata_rapor: req.nilai,
            tingkat_prestasi: req.tingkat_prestasi.as_deref(),
            jumlah_follower: req.jumlah_follower,
            potongan_admin: req.potongan_persen,
        },
    )
    .map_err(AppError::BadRequest)?;

    let langsung = k.alur_seleksi == beasiswa::ALUR_LANGSUNG_LULUS;
    let lewati_cbt = k.alur_seleksi != beasiswa::ALUR_PENUH;
    let pilihan = if langsung {
        let p = req.pilihan_ke.ok_or_else(|| {
            AppError::BadRequest(
                "Tentukan penempatan: program studi pilihan 1 atau pilihan 2".into(),
            )
        })?;
        if p != 1 && p != 2 {
            return Err(AppError::BadRequest("Pilihan harus 1 atau 2".into()));
        }
        if p == 2 && !k.punya_pilihan_2 {
            return Err(AppError::BadRequest(
                "Calon ini tidak memiliki program studi pilihan kedua".into(),
            ));
        }
        p
    } else {
        1
    };

    let res = sqlx::query(
        "UPDATE pendaftar SET status_seleksi_rapor = 'LULUS', nilai_seleksi_rapor = $2,
                catatan_seleksi_rapor = $3, nilai_rapor_avg = COALESCE($2, nilai_rapor_avg),
                potongan_persen = $4, tingkat_prestasi = $5, jumlah_follower = $6,
                cbt_dilewati = $7,
                status_seleksi_interview = CASE WHEN $8 THEN 'LULUS' ELSE status_seleksi_interview END,
                status_pendaftaran = CASE WHEN $7 THEN 'MENUNGGU_PENGUMUMAN' ELSE status_pendaftaran END,
                updated_at = NOW()
         WHERE id = $1 AND status_pendaftaran IN ('BERKAS_VERIFIED', 'MENUNGGU_UJIAN')",
    )
    .bind(pendaftar_id)
    .bind(req.nilai)
    .bind(catatan)
    .bind(potongan)
    .bind(&req.tingkat_prestasi)
    .bind(req.jumlah_follower)
    .bind(lewati_cbt)
    .bind(langsung)
    .execute(pool)
    .await?;
    if res.rows_affected() == 0 {
        return Err(AppError::Conflict(
            "Status calon sudah berubah. Muat ulang daftar seleksi.".into(),
        ));
    }

    let teks_potongan = if potongan > 0 {
        format!(" Anda mendapat potongan beasiswa {potongan}% untuk biaya DPP dan SKS.")
    } else {
        String::new()
    };
    let (judul, pesan) = if langsung {
        // Seleksi CBT dan wawancara dinyatakan lulus; LoA terbit untuk program studi yang ditentukan
        crate::modules::kelulusan::repository::terbitkan_kelulusan_dari_cbt(
            pool,
            Some(pendaftar_id),
        )
        .await?;
        tetapkan_penempatan(pool, pendaftar_id, pilihan).await?;
        (
            "Selamat, Seleksi Anda Disetujui",
            format!(
                "Seleksi Anda disetujui. Seleksi CBT dan wawancara dilewati dengan keterangan lulus.{teks_potongan} Cek hasil kelulusan di portal PMB."
            ),
        )
    } else if lewati_cbt {
        (
            "Selamat, Seleksi Berkas Anda Disetujui",
            format!(
                "Seleksi berkas Anda disetujui. Seleksi CBT dilewati dengan keterangan lulus; selanjutnya seleksi wawancara oleh panitia.{teks_potongan}"
            ),
        )
    } else {
        (
            "Selamat, Anda Lulus Seleksi Rapor",
            "Anda dinyatakan lulus seleksi rapor. Silakan ikuti seleksi CBT online sesuai jadwal yang dipilih."
                .to_string(),
        )
    };
    alur::kirim_notifikasi(pool, pendaftar_id, judul, &pesan, "SELEKSI_RAPOR").await;
    Ok(())
}

// ---------------------------------------------------------------------------
// Notifikasi admin
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct NotifikasiAdmin {
    pub id: Uuid,
    pub tipe: String,
    pub judul: String,
    pub pesan: String,
    pub pendaftar_id: Option<Uuid>,
    pub sudah_dibaca: bool,
    pub created_at: DateTime<Utc>,
}

#[utoipa::path(
    get,
    path = "/api/pendaftaran/admin/notifikasi",
    tag = "Seleksi Admin",
    responses((status = 200, description = "Notifikasi admin terbaru (belum dibaca di atas)", body = Vec<NotifikasiAdmin>))
)]
pub async fn list_notifikasi_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let rows: Vec<NotifikasiAdmin> = sqlx::query_as(
        "SELECT id, tipe, judul, pesan, pendaftar_id, sudah_dibaca, created_at
         FROM notifikasi_admin ORDER BY sudah_dibaca, created_at DESC LIMIT 100",
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/admin/notifikasi/{id}/baca",
    tag = "Seleksi Admin",
    params(("id" = Uuid, Path, description = "ID notifikasi")),
    responses((status = 200, description = "Ditandai sudah dibaca"))
)]
pub async fn baca_notifikasi_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    sqlx::query("UPDATE notifikasi_admin SET sudah_dibaca = TRUE WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

// ---------------------------------------------------------------------------
// Kuota jalur & pindah jalur
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct KuotaJalurItem {
    pub jalur_id: Uuid,
    pub kode_jalur: String,
    pub nama_jalur: String,
    pub kuota_maksimal: Option<i32>,
    pub terisi: i64,
    pub menunggu_pindah: i64,
}

#[utoipa::path(
    get,
    path = "/api/pendaftaran/admin/kuota-jalur",
    tag = "Seleksi Admin",
    responses((status = 200, description = "Kuota daftar ulang per jalur aktif", body = Vec<KuotaJalurItem>))
)]
pub async fn list_kuota_jalur_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let rows: Vec<KuotaJalurItem> = sqlx::query_as(
        "SELECT j.id AS jalur_id, j.kode_jalur, j.nama_jalur, j.kuota_maksimal,
                COUNT(p.id) FILTER (WHERE p.status_pendaftaran = ANY($1)) AS terisi,
                COUNT(p.id) FILTER (WHERE p.status_pendaftaran = 'MENUNGGU_PINDAH_JALUR') AS menunggu_pindah
         FROM jalur_masuk j
         LEFT JOIN pendaftar p ON p.jalur_id = j.id
         WHERE j.is_active = TRUE
         GROUP BY j.id ORDER BY j.kode_jalur",
    )
    .bind(STATUS_TERISI.map(String::from).to_vec())
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct MenungguPindahItem {
    pub pendaftar_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub jalur_id: Uuid,
    pub nama_jalur: String,
    pub updated_at: DateTime<Utc>,
}

#[utoipa::path(
    get,
    path = "/api/pendaftaran/admin/pindah-jalur",
    tag = "Seleksi Admin",
    responses((status = 200, description = "Calon yang menunggu dipindahkan jalurnya", body = Vec<MenungguPindahItem>))
)]
pub async fn list_menunggu_pindah_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let rows: Vec<MenungguPindahItem> = sqlx::query_as(
        "SELECT p.id AS pendaftar_id, p.nomor_pendaftaran, u.nama_lengkap, p.jalur_id,
                j.nama_jalur, p.updated_at
         FROM pendaftar p
         JOIN users u ON u.id = p.user_id
         JOIN jalur_masuk j ON j.id = p.jalur_id
         WHERE p.status_pendaftaran = 'MENUNGGU_PINDAH_JALUR'
         ORDER BY p.updated_at",
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct PindahJalurRequest {
    pub jalur_id: Uuid,
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/admin/pindah-jalur/{pendaftar_id}",
    tag = "Seleksi Admin",
    params(("pendaftar_id" = Uuid, Path, description = "ID pendaftar")),
    request_body = PindahJalurRequest,
    responses(
        (status = 200, description = "Calon dipindahkan ke jalur baru"),
        (status = 409, description = "Kuota jalur tujuan penuh / status tidak sesuai")
    )
)]
pub async fn pindah_jalur_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(pendaftar_id): Path<Uuid>,
    Json(req): Json<PindahJalurRequest>,
) -> Result<impl IntoResponse, AppError> {
    let mut tx = state.db.begin().await?;

    let aktif: Option<bool> = sqlx::query_scalar("SELECT is_active FROM jalur_masuk WHERE id = $1")
        .bind(req.jalur_id)
        .fetch_optional(&mut *tx)
        .await?;
    match aktif {
        None => return Err(AppError::NotFound("Jalur tujuan tidak ditemukan".into())),
        Some(false) => {
            return Err(AppError::BadRequest("Jalur tujuan tidak aktif".into()));
        }
        Some(true) => {}
    }

    let saat_ini: Option<(String, Uuid)> = sqlx::query_as(
        "SELECT status_pendaftaran, jalur_id FROM pendaftar WHERE id = $1 FOR UPDATE",
    )
    .bind(pendaftar_id)
    .fetch_optional(&mut *tx)
    .await?;
    let Some((status_p, jalur_lama)) = saat_ini else {
        return Err(AppError::NotFound("Pendaftar tidak ditemukan".into()));
    };
    if status_p != status::MENUNGGU_PINDAH_JALUR {
        return Err(AppError::Conflict(
            "Calon ini tidak sedang menunggu pemindahan jalur.".into(),
        ));
    }
    if req.jalur_id == jalur_lama {
        return Err(AppError::BadRequest(
            "Pilih jalur yang berbeda dari jalur semula.".into(),
        ));
    }
    if sisa_kuota_terkunci(&mut tx, req.jalur_id).await? == Some(0) {
        return Err(AppError::Conflict(
            "Kuota jalur tujuan juga sudah penuh. Pilih jalur lain.".into(),
        ));
    }

    // Daftar ulang calon sudah dibayar (itulah yang memicu penahanan) -> langsung lunas di jalur baru
    let sudah_bayar: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM tagihan WHERE pendaftar_id = $1
                        AND jenis_tagihan = 'DAFTAR_ULANG_UKT' AND status = 'LUNAS')",
    )
    .bind(pendaftar_id)
    .fetch_one(&mut *tx)
    .await?;
    let status_baru = if sudah_bayar {
        status::DAFTAR_ULANG_LUNAS
    } else {
        status::LULUS
    };

    sqlx::query(
        "UPDATE pendaftar SET jalur_id = $2, status_pendaftaran = $3, updated_at = NOW() WHERE id = $1",
    )
    .bind(pendaftar_id)
    .bind(req.jalur_id)
    .bind(status_baru)
    .execute(&mut *tx)
    .await?;
    if sudah_bayar {
        sqlx::query(
            "UPDATE hasil_kelulusan SET status_daftar_ulang = 'LUNAS', updated_at = NOW()
             WHERE pendaftar_id = $1 AND status_daftar_ulang IN ('BELUM_DAFTAR_ULANG', 'TAGIHAN_TERBIT')",
        )
        .bind(pendaftar_id)
        .execute(&mut *tx)
        .await?;
    }
    sqlx::query(
        "UPDATE notifikasi_admin SET sudah_dibaca = TRUE
         WHERE pendaftar_id = $1 AND tipe = 'KUOTA_JALUR_PENUH'",
    )
    .bind(pendaftar_id)
    .execute(&mut *tx)
    .await?;
    let nama_baru: String = sqlx::query_scalar("SELECT nama_jalur FROM jalur_masuk WHERE id = $1")
        .bind(req.jalur_id)
        .fetch_one(&mut *tx)
        .await?;
    tx.commit().await?;

    alur::kirim_notifikasi(
        &state.db,
        pendaftar_id,
        "Jalur Pendaftaran Anda Dipindahkan",
        &format!(
            "Kuota jalur semula sudah terpenuhi, sehingga pendaftaran Anda dipindahkan oleh admin ke jalur {nama_baru}. \
             Hasil seleksi Anda tetap berlaku."
        ),
        "PINDAH_JALUR",
    )
    .await;
    Ok(Json(
        serde_json::json!({ "ok": true, "status": status_baru }),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sisa_kuota_tanpa_batas_dan_dengan_batas() {
        assert_eq!(sisa_kuota(None, 500), None);
        assert_eq!(sisa_kuota(Some(70), 0), Some(70));
        assert_eq!(sisa_kuota(Some(70), 69), Some(1));
        assert_eq!(sisa_kuota(Some(70), 70), Some(0));
        assert_eq!(sisa_kuota(Some(70), 75), Some(0));
    }

    // -- Uji integrasi (butuh PostgreSQL): cargo test -- --ignored seleksi_jalur
    // DATABASE_URL harus mengarah ke server dengan hak CREATEDB; basis data uji dibuat otomatis.

    async fn siapkan_calon(pool: &PgPool, kode_jalur: &str, rapor: f64) -> Uuid {
        let user_id: Uuid = sqlx::query_scalar(
            "INSERT INTO users (email, password_hash, role, nama_lengkap, no_hp)
             VALUES ($1, 'x', 'calon_mahasiswa', 'Calon Uji', '0811111111') RETURNING id",
        )
        .bind(format!("{}@uji.id", Uuid::new_v4()))
        .fetch_one(pool)
        .await
        .unwrap();
        let jalur: Uuid = sqlx::query_scalar("SELECT id FROM jalur_masuk WHERE kode_jalur = $1")
            .bind(kode_jalur)
            .fetch_one(pool)
            .await
            .unwrap();
        let gel: Uuid = sqlx::query_scalar(
            "INSERT INTO gelombang (nama_gelombang, tgl_mulai, tgl_selesai)
             VALUES ('Uji', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days') RETURNING id",
        )
        .fetch_one(pool)
        .await
        .unwrap();
        let (prodi1, prodi2): (Uuid, Uuid) = sqlx::query_as(
            "SELECT (SELECT id FROM program_studi ORDER BY kode_prodi LIMIT 1),
                    (SELECT id FROM program_studi ORDER BY kode_prodi DESC LIMIT 1)",
        )
        .fetch_one(pool)
        .await
        .unwrap();
        sqlx::query_scalar(
            "INSERT INTO pendaftar (user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2)
             VALUES ($1, $2, $3, $4, 'BERKAS_VERIFIED', '3300000000000001', 'Solo', '2008-01-01', 'L',
                'Katolik', 'Jl. Uji', 'Ortu', '0822222222', 'SMA Uji', 'IPA', $5, $6, $7) RETURNING id",
        )
        .bind(user_id)
        .bind(format!("W26{}", &Uuid::new_v4().to_string()[..6]))
        .bind(jalur)
        .bind(gel)
        .bind(rapor)
        .bind(prodi1)
        .bind(prodi2)
        .fetch_one(pool)
        .await
        .unwrap()
    }

    fn req(nilai: Option<f64>, pilihan: Option<i32>) -> SimpanHasilSeleksiRequest {
        SimpanHasilSeleksiRequest {
            hasil: "LULUS".into(),
            nilai,
            catatan: None,
            pilihan_ke: pilihan,
            tingkat_prestasi: None,
            jumlah_follower: None,
            potongan_persen: None,
        }
    }

    #[sqlx::test(migrations = "./migrations")]
    #[ignore = "butuh PostgreSQL"]
    async fn seleksi_jalur_early_melewati_cbt_dan_wawancara(pool: PgPool) {
        let calon = siapkan_calon(&pool, "READY-EARLY", 79.0).await;
        // rapor 79 < 80 ditolak, status tidak berubah
        assert!(
            luluskan_tahap_pertama(&pool, calon, &req(Some(79.0), Some(1)), None)
                .await
                .is_err()
        );
        // tanpa penempatan ditolak
        assert!(
            luluskan_tahap_pertama(&pool, calon, &req(Some(82.0), None), None)
                .await
                .is_err()
        );

        luluskan_tahap_pertama(&pool, calon, &req(Some(82.0), Some(2)), None)
            .await
            .unwrap();
        let (st, rapor, interview, dilewati, potongan, avg): (String, String, String, bool, i32, f64) =
            sqlx::query_as(
                "SELECT status_pendaftaran, status_seleksi_rapor, status_seleksi_interview,
                        cbt_dilewati, potongan_persen, nilai_rapor_avg FROM pendaftar WHERE id = $1",
            )
            .bind(calon)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(st, "LULUS");
        assert_eq!((rapor.as_str(), interview.as_str()), ("LULUS", "LULUS"));
        assert!(dilewati);
        assert_eq!(potongan, 100);
        assert_eq!(avg, 82.0); // rata-rata rapor disesuaikan admin
        let (hasil, pilihan): (String, Option<i32>) = sqlx::query_as(
            "SELECT status_kelulusan, pilihan_ke FROM hasil_kelulusan WHERE pendaftar_id = $1",
        )
        .bind(calon)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!((hasil.as_str(), pilihan), ("LULUS_PILIHAN_2", Some(2)));

        // Daftar ulang: admisi 5 jt dengan potongan 100% dan formulir gratis -> Rp 0
        let (prodi, jalur, gel): (Uuid, Uuid, Uuid) = sqlx::query_as(
            "SELECT prodi_pilihan_2, jalur_id, gelombang_id FROM pendaftar WHERE id = $1",
        )
        .bind(calon)
        .fetch_one(&pool)
        .await
        .unwrap();
        sqlx::query("UPDATE rincian_biaya_kuliah SET admisi = 5000000 WHERE prodi_id = $1")
            .bind(prodi)
            .execute(&pool)
            .await
            .unwrap();
        let rincian = crate::modules::kelulusan::service::rincian_biaya_daftar_ulang(
            &pool, calon, prodi, jalur, gel,
        )
        .await
        .unwrap();
        assert_eq!(rincian.iter().map(|r| r.nominal).sum::<i64>(), 0);
    }

    #[sqlx::test(migrations = "./migrations")]
    #[ignore = "butuh PostgreSQL"]
    async fn seleksi_jalur_creator_hanya_melewati_cbt(pool: PgPool) {
        let calon = siapkan_calon(&pool, "READY-CREATOR", 0.0).await;
        let mut r = req(None, None);
        r.jumlah_follower = Some(12_000);
        luluskan_tahap_pertama(&pool, calon, &r, None)
            .await
            .unwrap();
        let (st, interview, dilewati, potongan): (String, String, bool, i32) = sqlx::query_as(
            "SELECT status_pendaftaran, status_seleksi_interview, cbt_dilewati, potongan_persen
             FROM pendaftar WHERE id = $1",
        )
        .bind(calon)
        .fetch_one(&pool)
        .await
        .unwrap();
        // wawancara masih menunggu; CBT dilewati; potongan 50% karena follower >= 10K
        assert_eq!(st, "MENUNGGU_PENGUMUMAN");
        assert_eq!(interview, "MENUNGGU");
        assert!(dilewati);
        assert_eq!(potongan, 50);
        let ada: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM hasil_kelulusan WHERE pendaftar_id = $1")
                .bind(calon)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(ada, 0);
    }

    #[sqlx::test(migrations = "./migrations")]
    #[ignore = "butuh PostgreSQL"]
    async fn seleksi_jalur_admission_tetap_ke_cbt(pool: PgPool) {
        let calon = siapkan_calon(&pool, "READY-ADMISSION", 70.0).await;
        luluskan_tahap_pertama(&pool, calon, &req(Some(70.0), None), None)
            .await
            .unwrap();
        let (st, dilewati): (String, bool) =
            sqlx::query_as("SELECT status_pendaftaran, cbt_dilewati FROM pendaftar WHERE id = $1")
                .bind(calon)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(st, "BERKAS_VERIFIED");
        assert!(!dilewati);
    }
}
