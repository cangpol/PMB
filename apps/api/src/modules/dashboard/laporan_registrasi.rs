//! Laporan registrasi akun calon: siapa yang mendaftar, kontaknya, dan dari mana mereka
//! tahu PMB UPITRA (media sosial apa / sekolah mana). Dipakai tim admin untuk follow up
//! dan evaluasi promosi; dapat diunduh sebagai PDF.

use axum::{
    Json,
    body::Body,
    extract::{Query, State},
    http::header,
    response::{IntoResponse, Response},
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::AuthUser,
    pdfkit::{self, ABU, BIRU, EMAS, GARIS, Halaman, LATAR, NAVY, PUTIH, TEKS},
    state::AppState,
};

// SQL di bawah hanya disusun dari konstanta (KOLOM/FILTER); nilai pengguna selalu lewat
// parameter ($1..$7), jadi aman ditandai AssertSqlSafe.
const BATAS_PDF: i64 = 5000;

/// Nama tampilan untuk kode sumber informasi.
fn label_sumber(kode: &str) -> String {
    if kode == "BELUM_DIISI" {
        return "Belum diisi".to_string();
    }
    crate::modules::auth::dto::SUMBER_INFORMASI
        .iter()
        .find(|(k, _)| *k == kode)
        .map(|(_, l)| l.to_string())
        .unwrap_or_else(|| kode.to_string())
}

#[derive(Debug, Default, Deserialize)]
pub struct LaporanQuery {
    /// Cari nama / email / no. HP / sekolah / kabupaten
    pub q: Option<String>,
    /// Kode sumber informasi, atau `BELUM_DIISI`
    pub sumber: Option<String>,
    /// Nama media sosial (untuk sumber MEDIA_SOSIAL)
    pub platform: Option<String>,
    pub dari: Option<NaiveDate>,
    pub sampai: Option<NaiveDate>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Penyaring bersama untuk daftar, ringkasan, dan PDF ($1 pola cari, $2 sumber,
/// $3 platform, $4 dari, $5 sampai; tanggal dihitung menurut waktu WIB).
const FILTER: &str = "u.role = 'calon_mahasiswa'
 AND ($1::text IS NULL OR u.nama_lengkap ILIKE $1 OR u.email ILIKE $1 OR u.no_hp ILIKE $1
      OR u.asal_sekolah ILIKE $1 OR u.kabupaten_asal_sekolah ILIKE $1)
 AND ($2::text IS NULL OR ($2 = 'BELUM_DIISI' AND u.sumber_informasi IS NULL) OR u.sumber_informasi = $2)
 AND ($3::text IS NULL OR (u.sumber_informasi = 'MEDIA_SOSIAL' AND LOWER(u.sumber_informasi_lainnya) = LOWER($3)))
 AND ($4::date IS NULL OR (u.created_at AT TIME ZONE 'Asia/Jakarta')::date >= $4::date)
 AND ($5::date IS NULL OR (u.created_at AT TIME ZONE 'Asia/Jakarta')::date <= $5::date)";

struct Penyaring {
    pola: Option<String>,
    sumber: Option<String>,
    platform: Option<String>,
    dari: Option<NaiveDate>,
    sampai: Option<NaiveDate>,
}

fn bersih(v: &Option<String>) -> Option<String> {
    v.as_deref()
        .map(str::trim)
        .filter(|t| !t.is_empty())
        .map(str::to_string)
}

impl Penyaring {
    fn dari_query(q: &LaporanQuery) -> Self {
        Self {
            // % dan _ dari pengguna diperlakukan sebagai huruf biasa
            pola: bersih(&q.q).map(|t| {
                format!(
                    "%{}%",
                    t.replace('\\', "\\\\")
                        .replace('%', "\\%")
                        .replace('_', "\\_")
                )
            }),
            sumber: bersih(&q.sumber),
            platform: bersih(&q.platform),
            dari: q.dari,
            sampai: q.sampai,
        }
    }

    fn deskripsi(&self, q: &LaporanQuery) -> String {
        let mut b: Vec<String> = Vec::new();
        if let Some(t) = bersih(&q.q) {
            b.push(format!("cari \"{t}\""));
        }
        if let Some(s) = &self.sumber {
            b.push(format!("sumber {}", label_sumber(s)));
        }
        if let Some(p) = &self.platform {
            b.push(format!("media {p}"));
        }
        if let Some(d) = self.dari {
            b.push(format!("dari {}", d.format("%d/%m/%Y")));
        }
        if let Some(d) = self.sampai {
            b.push(format!("sampai {}", d.format("%d/%m/%Y")));
        }
        if b.is_empty() {
            "semua pendaftar".to_string()
        } else {
            b.join(", ")
        }
    }
}

macro_rules! ikat {
    ($q:expr, $f:expr) => {
        $q.bind(&$f.pola)
            .bind(&$f.sumber)
            .bind(&$f.platform)
            .bind($f.dari)
            .bind($f.sampai)
    };
}

#[derive(Debug, Serialize, FromRow)]
pub struct BarisRegistrasi {
    pub id: Uuid,
    pub nama_lengkap: String,
    pub email: String,
    pub no_hp: Option<String>,
    pub sumber_informasi: Option<String>,
    pub keterangan: Option<String>,
    pub provinsi_asal_sekolah: Option<String>,
    pub kabupaten_asal_sekolah: Option<String>,
    pub asal_sekolah: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct HitungSumber {
    pub kode: String,
    pub label: String,
    pub jumlah: i64,
}

#[derive(Debug, Serialize)]
pub struct HitungNama {
    pub nama: String,
    pub jumlah: i64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct HitungSekolah {
    pub sekolah: String,
    pub kabupaten: Option<String>,
    pub provinsi: Option<String>,
    pub jumlah: i64,
}

#[derive(Debug, Serialize)]
pub struct RingkasanLaporan {
    pub total: i64,
    pub per_sumber: Vec<HitungSumber>,
    pub per_platform: Vec<HitungNama>,
    pub sekolah_teratas: Vec<HitungSekolah>,
}

#[derive(Debug, Serialize)]
pub struct LaporanRegistrasiResponse {
    pub ringkasan: RingkasanLaporan,
    pub items: Vec<BarisRegistrasi>,
}

const KOLOM: &str = "u.id, u.nama_lengkap, u.email, u.no_hp, u.sumber_informasi,
    u.sumber_informasi_lainnya AS keterangan, u.provinsi_asal_sekolah,
    u.kabupaten_asal_sekolah, u.asal_sekolah, u.created_at";

async fn ambil_baris(
    pool: &PgPool,
    f: &Penyaring,
    limit: i64,
    offset: i64,
) -> Result<Vec<BarisRegistrasi>, AppError> {
    let sql = format!(
        "SELECT {KOLOM} FROM users u WHERE {FILTER} ORDER BY u.created_at DESC LIMIT $6 OFFSET $7"
    );
    Ok(ikat!(
        sqlx::query_as::<_, BarisRegistrasi>(sqlx::AssertSqlSafe(sql)),
        f
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?)
}

async fn ambil_ringkasan(pool: &PgPool, f: &Penyaring) -> Result<RingkasanLaporan, AppError> {
    let sql = format!(
        "SELECT u.sumber_informasi, COUNT(*) FROM users u WHERE {FILTER} GROUP BY u.sumber_informasi"
    );
    let sumber: Vec<(Option<String>, i64)> = ikat!(sqlx::query_as(sqlx::AssertSqlSafe(sql)), f)
        .fetch_all(pool)
        .await?;
    let total = sumber.iter().map(|r| r.1).sum();
    let mut per_sumber: Vec<HitungSumber> = sumber
        .into_iter()
        .map(|(k, jumlah)| {
            let kode = k.unwrap_or_else(|| "BELUM_DIISI".to_string());
            HitungSumber {
                label: label_sumber(&kode),
                kode,
                jumlah,
            }
        })
        .collect();
    per_sumber.sort_by_key(|s| std::cmp::Reverse(s.jumlah));

    let sql = format!(
        "SELECT COALESCE(NULLIF(TRIM(u.sumber_informasi_lainnya), ''), 'Tidak disebutkan'), COUNT(*)
         FROM users u WHERE {FILTER} AND u.sumber_informasi = 'MEDIA_SOSIAL'
         GROUP BY 1 ORDER BY 2 DESC, 1"
    );
    let platform: Vec<(String, i64)> = ikat!(sqlx::query_as(sqlx::AssertSqlSafe(sql)), f)
        .fetch_all(pool)
        .await?;

    let sql = format!(
        "SELECT u.asal_sekolah AS sekolah, u.kabupaten_asal_sekolah AS kabupaten,
                u.provinsi_asal_sekolah AS provinsi, COUNT(*) AS jumlah
         FROM users u WHERE {FILTER} AND u.asal_sekolah IS NOT NULL
         GROUP BY u.asal_sekolah, u.kabupaten_asal_sekolah, u.provinsi_asal_sekolah
         ORDER BY jumlah DESC, sekolah LIMIT 10"
    );
    let sekolah_teratas = ikat!(
        sqlx::query_as::<_, HitungSekolah>(sqlx::AssertSqlSafe(sql)),
        f
    )
    .fetch_all(pool)
    .await?;

    Ok(RingkasanLaporan {
        total,
        per_sumber,
        per_platform: platform
            .into_iter()
            .map(|(nama, jumlah)| HitungNama { nama, jumlah })
            .collect(),
        sekolah_teratas,
    })
}

fn pastikan_admin(u: &AuthUser) -> Result<(), AppError> {
    if !u.is_admin() {
        return Err(AppError::Forbidden(
            "Laporan registrasi hanya untuk admin PMB".to_string(),
        ));
    }
    Ok(())
}

pub async fn laporan_registrasi_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Query(q): Query<LaporanQuery>,
) -> Result<impl IntoResponse, AppError> {
    pastikan_admin(&auth_user)?;
    let f = Penyaring::dari_query(&q);
    let limit = q.limit.unwrap_or(50).clamp(1, 200);
    let offset = q.offset.unwrap_or(0).max(0);
    let ringkasan = ambil_ringkasan(&state.db, &f).await?;
    let items = ambil_baris(&state.db, &f, limit, offset).await?;
    Ok(Json(LaporanRegistrasiResponse { ringkasan, items }))
}

pub async fn laporan_registrasi_pdf_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Query(q): Query<LaporanQuery>,
) -> Result<Response, AppError> {
    pastikan_admin(&auth_user)?;
    let f = Penyaring::dari_query(&q);
    let ringkasan = ambil_ringkasan(&state.db, &f).await?;
    let baris = ambil_baris(&state.db, &f, BATAS_PDF, 0).await?;
    let sekarang = Utc::now();
    let pdf = bangun_pdf_laporan(&baris, &ringkasan, &f.deskripsi(&q), sekarang);
    Response::builder()
        .header(header::CONTENT_TYPE, "application/pdf")
        .header(
            header::CONTENT_DISPOSITION,
            format!(
                "attachment; filename=\"Laporan_Registrasi_PMB_{}.pdf\"",
                sekarang.format("%Y%m%d")
            ),
        )
        .body(Body::from(pdf))
        .map_err(|e| AppError::Internal(e.to_string()))
}

// ---------------------------------------------------------------------------
// PDF (A4 lanskap, beberapa halaman)
// ---------------------------------------------------------------------------

const LEBAR: f64 = 841.89;
const TINGGI: f64 = 595.28;
const MARGIN: f64 = 36.0;
const TINGGI_BARIS: f64 = 24.0;
const BATAS_BAWAH: f64 = 44.0;
const UKURAN: f64 = 7.5;

/// (judul, x, lebar) kolom tabel.
const KOLOM_TABEL: [(&str, f64, f64); 7] = [
    ("No", 36.0, 22.0),
    ("Nama", 60.0, 126.0),
    ("No. HP", 188.0, 76.0),
    ("Email", 266.0, 140.0),
    ("Sumber", 408.0, 100.0),
    ("Keterangan (media sosial / sekolah)", 510.0, 256.0),
    ("Daftar", 768.0, 38.0),
];

/// Potong teks agar muat `lebar` pt, tambahkan "..." bila terpotong.
fn potong(teks: &str, tebal: bool, ukuran: f64, lebar: f64) -> String {
    if pdfkit::lebar_teks(teks, tebal, ukuran) <= lebar {
        return teks.to_string();
    }
    let mut out = String::new();
    for c in teks.chars() {
        let kandidat = format!("{out}{c}...");
        if pdfkit::lebar_teks(&kandidat, tebal, ukuran) > lebar {
            break;
        }
        out.push(c);
    }
    format!("{}...", out.trim_end())
}

fn keterangan(b: &BarisRegistrasi) -> String {
    match b.sumber_informasi.as_deref() {
        Some("SOSIALISASI_SEKOLAH") => {
            let wilayah = [&b.kabupaten_asal_sekolah, &b.provinsi_asal_sekolah]
                .iter()
                .filter_map(|v| v.as_deref())
                .collect::<Vec<_>>()
                .join(", ");
            match (b.asal_sekolah.as_deref(), wilayah.is_empty()) {
                (Some(s), false) => format!("{s} - {wilayah}"),
                (Some(s), true) => s.to_string(),
                (None, false) => wilayah,
                (None, true) => "-".to_string(),
            }
        }
        Some("MEDIA_SOSIAL") | Some("LAINNYA") => {
            b.keterangan.clone().unwrap_or_else(|| "-".to_string())
        }
        _ => "-".to_string(),
    }
}

fn kepala_halaman(h: &mut Halaman, lanjutan: bool) {
    h.kotak(0.0, TINGGI - 7.0, LEBAR, 7.0, NAVY);
    h.kotak(0.0, TINGGI - 9.5, LEBAR, 2.5, EMAS);
    if lanjutan {
        h.teks(
            MARGIN,
            TINGGI - 28.0,
            true,
            10.0,
            NAVY,
            "Laporan Registrasi Calon Mahasiswa (lanjutan)",
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

fn kepala_tabel(h: &mut Halaman, y_atas: f64) {
    h.kotak(MARGIN, y_atas - 16.0, LEBAR - 2.0 * MARGIN, 16.0, NAVY);
    for (judul, x, _) in KOLOM_TABEL {
        h.teks(x + 2.0, y_atas - 11.0, true, 7.5, PUTIH, judul);
    }
}

fn blok_ringkasan(
    h: &mut Halaman,
    x: f64,
    y: f64,
    lebar: f64,
    judul: &str,
    baris: &[(String, i64)],
) {
    h.teks(x, y, true, 9.0, BIRU, judul);
    h.garis(x, y - 3.0, x + lebar, y - 3.0, GARIS, 0.8);
    if baris.is_empty() {
        h.teks(x, y - 15.0, false, 8.0, ABU, "Belum ada data");
        return;
    }
    let mut yy = y - 15.0;
    for (nama, jumlah) in baris.iter().take(7) {
        let angka = jumlah.to_string();
        let maks = lebar - pdfkit::lebar_teks(&angka, true, 8.0) - 8.0;
        h.teks(x, yy, false, 8.0, TEKS, &potong(nama, false, 8.0, maks));
        h.teks_kanan(x + lebar, yy, true, 8.0, TEKS, &angka);
        yy -= 11.0;
    }
}

pub fn bangun_pdf_laporan(
    baris: &[BarisRegistrasi],
    ringkasan: &RingkasanLaporan,
    filter: &str,
    waktu: DateTime<Utc>,
) -> Vec<u8> {
    let mut halaman: Vec<Halaman> = Vec::new();

    // ---- halaman 1: kop + ringkasan
    let mut h = Halaman::baru();
    kepala_halaman(&mut h, false);
    h.logo(MARGIN, TINGGI - 78.0, 46.0);
    h.teks(
        MARGIN + 58.0,
        TINGGI - 40.0,
        true,
        17.0,
        NAVY,
        "Laporan Registrasi Calon Mahasiswa",
    );
    h.teks(
        MARGIN + 58.0,
        TINGGI - 54.0,
        true,
        9.5,
        BIRU,
        "PMB Universitas Pignatelli Triputra",
    );
    let wib = waktu + chrono::Duration::hours(7);
    h.teks(
        MARGIN + 58.0,
        TINGGI - 66.0,
        false,
        8.0,
        ABU,
        &format!(
            "Dicetak {} WIB  |  Total {} calon  |  Filter: {}",
            wib.format("%d/%m/%Y %H:%M"),
            ringkasan.total,
            filter
        ),
    );
    h.garis(
        MARGIN,
        TINGGI - 84.0,
        LEBAR - MARGIN,
        TINGGI - 84.0,
        NAVY,
        1.5,
    );

    let y = TINGGI - 102.0;
    let sumber: Vec<(String, i64)> = ringkasan
        .per_sumber
        .iter()
        .map(|s| (s.label.clone(), s.jumlah))
        .collect();
    let platform: Vec<(String, i64)> = ringkasan
        .per_platform
        .iter()
        .map(|s| (s.nama.clone(), s.jumlah))
        .collect();
    let sekolah: Vec<(String, i64)> = ringkasan
        .sekolah_teratas
        .iter()
        .map(|s| {
            let wilayah = s.kabupaten.as_deref().unwrap_or("");
            let nama = if wilayah.is_empty() {
                s.sekolah.clone()
            } else {
                format!("{} ({})", s.sekolah, wilayah)
            };
            (nama, s.jumlah)
        })
        .collect();
    blok_ringkasan(&mut h, MARGIN, y, 200.0, "Sumber informasi", &sumber);
    blok_ringkasan(&mut h, MARGIN + 232.0, y, 150.0, "Media sosial", &platform);
    blok_ringkasan(
        &mut h,
        MARGIN + 414.0,
        y,
        LEBAR - 2.0 * MARGIN - 414.0,
        "Sekolah teratas",
        &sekolah,
    );

    let baris_ringkasan = sumber
        .len()
        .max(platform.len())
        .max(sekolah.len())
        .clamp(1, 7);
    let mut y_atas = y - 15.0 - baris_ringkasan as f64 * 11.0 - 10.0;
    h.teks(
        MARGIN,
        y_atas,
        true,
        9.0,
        BIRU,
        "Daftar pendaftar (terbaru lebih dulu)",
    );
    y_atas -= 6.0;
    kepala_tabel(&mut h, y_atas);
    let mut y_baris = y_atas - 16.0;
    halaman.push(h);

    // ---- baris tabel
    if baris.is_empty() {
        let h = halaman.last_mut().unwrap();
        h.teks(
            MARGIN + 4.0,
            y_baris - 16.0,
            false,
            9.0,
            ABU,
            "Tidak ada pendaftar yang cocok dengan filter ini.",
        );
    }
    for (i, b) in baris.iter().enumerate() {
        if y_baris - TINGGI_BARIS < BATAS_BAWAH {
            let mut baru = Halaman::baru();
            kepala_halaman(&mut baru, true);
            kepala_tabel(&mut baru, TINGGI - 42.0);
            y_baris = TINGGI - 42.0 - 16.0;
            halaman.push(baru);
        }
        let h = halaman.last_mut().unwrap();
        if i % 2 == 0 {
            h.kotak(
                MARGIN,
                y_baris - TINGGI_BARIS,
                LEBAR - 2.0 * MARGIN,
                TINGGI_BARIS,
                LATAR,
            );
        }
        let ty = y_baris - 9.5;
        let sel = |h: &mut Halaman, k: usize, teks: &str, tebal: bool| {
            let (_, x, w) = KOLOM_TABEL[k];
            h.teks(
                x + 2.0,
                ty,
                tebal,
                UKURAN,
                TEKS,
                &potong(teks, tebal, UKURAN, w - 6.0),
            );
        };
        sel(h, 0, &(i + 1).to_string(), false);
        sel(h, 1, &b.nama_lengkap, true);
        sel(h, 2, b.no_hp.as_deref().unwrap_or("-"), false);
        sel(h, 3, &b.email, false);
        let label = b
            .sumber_informasi
            .as_deref()
            .map(label_sumber)
            .unwrap_or_else(|| "Belum diisi".to_string());
        sel(h, 4, &label, false);
        // keterangan: sampai dua baris
        let (_, kx, kw) = KOLOM_TABEL[5];
        let lines = pdfkit::bungkus(&keterangan(b), false, UKURAN, kw - 6.0);
        for (n, l) in lines.iter().take(2).enumerate() {
            let teks = if n == 1 && lines.len() > 2 {
                potong(&format!("{l}..."), false, UKURAN, kw - 6.0)
            } else {
                l.clone()
            };
            h.teks(kx + 2.0, ty - 10.0 * n as f64, false, UKURAN, TEKS, &teks);
        }
        let tgl = (b.created_at + chrono::Duration::hours(7))
            .format("%d/%m/%y")
            .to_string();
        sel(h, 6, &tgl, false);
        y_baris -= TINGGI_BARIS;
    }

    // ---- kaki halaman (nomor halaman diketahui setelah semua halaman jadi)
    let total = halaman.len();
    for (n, h) in halaman.iter_mut().enumerate() {
        h.garis(MARGIN, 34.0, LEBAR - MARGIN, 34.0, GARIS, 0.6);
        h.teks(
            MARGIN,
            22.0,
            false,
            7.0,
            ABU,
            "Rahasia - hanya untuk tim PMB UPITRA. Data pribadi calon, jangan disebarkan.",
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

    fn contoh(n: usize) -> Vec<BarisRegistrasi> {
        (0..n)
            .map(|i| BarisRegistrasi {
                id: Uuid::nil(),
                nama_lengkap: format!("Calon Nomor {i}"),
                email: format!("calon{i}@contoh.id"),
                no_hp: Some("081234567890".into()),
                sumber_informasi: Some(
                    if i % 2 == 0 {
                        "MEDIA_SOSIAL"
                    } else {
                        "SOSIALISASI_SEKOLAH"
                    }
                    .into(),
                ),
                keterangan: Some("TikTok".into()),
                provinsi_asal_sekolah: Some("Jawa Tengah".into()),
                kabupaten_asal_sekolah: Some("Kota Surakarta".into()),
                asal_sekolah: Some("SMAN 1 SURAKARTA".into()),
                created_at: Utc::now(),
            })
            .collect()
    }

    #[test]
    fn pdf_laporan_banyak_halaman() {
        let ring = RingkasanLaporan {
            total: 120,
            per_sumber: vec![HitungSumber {
                kode: "MEDIA_SOSIAL".into(),
                label: "Media Sosial".into(),
                jumlah: 60,
            }],
            per_platform: vec![HitungNama {
                nama: "TikTok".into(),
                jumlah: 60,
            }],
            sekolah_teratas: vec![],
        };
        let pdf = bangun_pdf_laporan(&contoh(120), &ring, "semua pendaftar", Utc::now());
        let teks = String::from_utf8_lossy(&pdf);
        assert!(teks.starts_with("%PDF-1.4"));
        assert!(teks.contains("/MediaBox [0 0 841.89 595.28]"));
        assert!(
            !teks.contains("/Count 1 "),
            "120 baris harus lebih dari satu halaman"
        );
        assert!(teks.trim_end().ends_with("%%EOF"));
    }

    #[test]
    fn pdf_laporan_kosong_tetap_valid() {
        let ring = RingkasanLaporan {
            total: 0,
            per_sumber: vec![],
            per_platform: vec![],
            sekolah_teratas: vec![],
        };
        let pdf = bangun_pdf_laporan(&[], &ring, "semua pendaftar", Utc::now());
        assert!(String::from_utf8_lossy(&pdf).contains("/Count 1 "));
    }

    #[test]
    fn potong_menambah_elipsis() {
        let p = potong(
            "Nama yang sangat panjang sekali sampai tidak muat",
            false,
            7.5,
            60.0,
        );
        assert!(p.ends_with("..."));
        assert!(pdfkit::lebar_teks(&p, false, 7.5) <= 60.0);
        assert_eq!(potong("Budi", false, 7.5, 60.0), "Budi");
    }
}
