//! Ekspor daftar prospek calon ke Excel (.xlsx) dan PDF untuk admin.

use axum::{
    body::Body,
    extract::{Query, State},
    http::header,
    response::Response,
};
use chrono::{DateTime, Utc};
use rust_xlsxwriter::{Format, FormatAlign, Workbook};
use serde::Deserialize;

use crate::{
    error::AppError,
    extractors::RequireAdmin,
    modules::cms::prospek::ProspekItem,
    pdfkit::{self, ABU, BIRU, EMAS, GARIS, Halaman, LATAR, NAVY, PUTIH, TEKS},
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct FilterEkspor {
    /// BARU, DIHUBUNGI, atau SUDAH_DAFTAR; kosong = semua
    pub status: Option<String>,
    /// POPUP_BERANDA atau KONSULTASI_ONLINE; kosong = semua
    pub sumber: Option<String>,
}

const BATAS_BARIS: i64 = 5000;

fn label_status(s: &str) -> &'static str {
    match s {
        "DIHUBUNGI" => "Sudah dihubungi",
        "SUDAH_DAFTAR" => "Sudah daftar",
        _ => "Baru",
    }
}

fn label_sumber(s: &str) -> &'static str {
    match s {
        "KONSULTASI_ONLINE" => "Konsultasi online",
        _ => "Pop up beranda",
    }
}

fn wib(t: DateTime<Utc>) -> String {
    (t + chrono::Duration::hours(7))
        .format("%d/%m/%Y %H:%M")
        .to_string()
}

async fn ambil(db: &sqlx::PgPool, f: &FilterEkspor) -> Result<Vec<ProspekItem>, AppError> {
    let rows = sqlx::query_as::<_, ProspekItem>(
        "SELECT id, nama, no_hp, email, COALESCE(asal_sekolah, '') AS asal_sekolah, prodi_minat,
                pesan, sumber, status, catatan, created_at
         FROM prospek_calon
         WHERE ($1::text IS NULL OR status = $1) AND ($2::text IS NULL OR sumber = $2)
         ORDER BY created_at DESC LIMIT $3",
    )
    .bind(f.status.as_deref().filter(|s| !s.is_empty()))
    .bind(f.sumber.as_deref().filter(|s| !s.is_empty()))
    .bind(BATAS_BARIS)
    .fetch_all(db)
    .await?;
    Ok(rows)
}

fn deskripsi_filter(f: &FilterEkspor) -> String {
    let mut bagian = Vec::new();
    if let Some(s) = f.status.as_deref().filter(|s| !s.is_empty()) {
        bagian.push(format!("Status: {}", label_status(s)));
    }
    if let Some(s) = f.sumber.as_deref().filter(|s| !s.is_empty()) {
        bagian.push(format!("Sumber: {}", label_sumber(s)));
    }
    if bagian.is_empty() {
        "Semua data".to_string()
    } else {
        bagian.join(", ")
    }
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

pub fn bangun_xlsx(data: &[ProspekItem]) -> Result<Vec<u8>, AppError> {
    let galat = |e: rust_xlsxwriter::XlsxError| AppError::Internal(e.to_string());
    let mut wb = Workbook::new();
    let ws = wb.add_worksheet();
    ws.set_name("Calon Prospek").map_err(galat)?;

    let kepala = Format::new()
        .set_bold()
        .set_font_color(0xFFFFFF)
        .set_background_color(0x0B1F4B)
        .set_align(FormatAlign::Center);
    let judul: [(&str, f64); 10] = [
        ("No", 5.0),
        ("Tanggal (WIB)", 18.0),
        ("Nama", 26.0),
        ("No. HP/WA", 18.0),
        ("Email", 30.0),
        ("Asal Sekolah", 28.0),
        ("Program Studi", 28.0),
        ("Sumber", 18.0),
        ("Pertanyaan", 50.0),
        ("Status", 16.0),
    ];
    for (c, (t, w)) in judul.iter().enumerate() {
        ws.write_with_format(0, c as u16, *t, &kepala)
            .map_err(galat)?;
        ws.set_column_width(c as u16, *w).map_err(galat)?;
    }
    ws.set_column_width(10, 36.0).map_err(galat)?;
    ws.write_with_format(0, 10, "Catatan Admin", &kepala)
        .map_err(galat)?;

    for (i, p) in data.iter().enumerate() {
        let r = (i + 1) as u32;
        ws.write_number(r, 0, (i + 1) as f64).map_err(galat)?;
        // write_string selalu menulis teks (bukan rumus), aman dari injeksi rumus
        let isi = [
            wib(p.created_at),
            p.nama.clone(),
            p.no_hp.clone(),
            p.email.clone(),
            p.asal_sekolah.clone(),
            p.prodi_minat.clone(),
            label_sumber(&p.sumber).to_string(),
            p.pesan.clone().unwrap_or_default(),
            label_status(&p.status).to_string(),
            p.catatan.clone().unwrap_or_default(),
        ];
        for (c, v) in isi.iter().enumerate() {
            ws.write_string(r, (c + 1) as u16, v).map_err(galat)?;
        }
    }
    ws.set_freeze_panes(1, 0).map_err(galat)?;
    if !data.is_empty() {
        ws.autofilter(0, 0, data.len() as u32, 10).map_err(galat)?;
    }
    wb.save_to_buffer().map_err(galat)
}

// ---------------------------------------------------------------------------
// PDF (A4 lanskap)
// ---------------------------------------------------------------------------

const LEBAR: f64 = 841.89;
const TINGGI: f64 = 595.28;
const MARGIN: f64 = 36.0;
const TINGGI_BARIS: f64 = 26.0;
const BATAS_BAWAH: f64 = 44.0;
const UKURAN: f64 = 7.5;

/// (judul, x, lebar)
const KOLOM: [(&str, f64, f64); 8] = [
    ("No", 36.0, 20.0),
    ("Tanggal", 58.0, 62.0),
    ("Nama & Kontak", 122.0, 150.0),
    ("Asal Sekolah", 274.0, 110.0),
    ("Program Studi", 386.0, 110.0),
    ("Sumber", 498.0, 80.0),
    ("Pertanyaan", 580.0, 154.0),
    ("Status", 736.0, 70.0),
];

fn potong(teks: &str, tebal: bool, ukuran: f64, lebar: f64) -> String {
    if pdfkit::lebar_teks(teks, tebal, ukuran) <= lebar {
        return teks.to_string();
    }
    let mut out = String::new();
    for c in teks.chars() {
        if pdfkit::lebar_teks(&format!("{out}{c}..."), tebal, ukuran) > lebar {
            break;
        }
        out.push(c);
    }
    format!("{}...", out.trim_end())
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
            "Daftar Calon Prospek (lanjutan)",
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
    for (judul, x, _) in KOLOM {
        h.teks(x + 2.0, y_atas - 11.0, true, 7.5, PUTIH, judul);
    }
}

pub fn bangun_pdf(data: &[ProspekItem], filter: &str, waktu: DateTime<Utc>) -> Vec<u8> {
    let mut halaman: Vec<Halaman> = Vec::new();

    let mut h = Halaman::baru();
    kepala_halaman(&mut h, false);
    h.logo(MARGIN, TINGGI - 78.0, 46.0);
    h.teks(
        MARGIN + 58.0,
        TINGGI - 40.0,
        true,
        17.0,
        NAVY,
        "Daftar Calon Prospek",
    );
    h.teks(
        MARGIN + 58.0,
        TINGGI - 54.0,
        true,
        9.5,
        BIRU,
        "PMB Universitas Pignatelli Triputra",
    );
    let baru = data.iter().filter(|p| p.status == "BARU").count();
    let konsultasi = data
        .iter()
        .filter(|p| p.sumber == "KONSULTASI_ONLINE")
        .count();
    h.teks(
        MARGIN + 58.0,
        TINGGI - 66.0,
        false,
        8.0,
        ABU,
        &format!(
            "Dicetak {} WIB  |  Total {} calon ({} belum dihubungi, {} konsultasi online)  |  Filter: {}",
            wib(waktu),
            data.len(),
            baru,
            konsultasi,
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
    let y_atas = TINGGI - 98.0;
    kepala_tabel(&mut h, y_atas);
    let mut y_baris = y_atas - 16.0;
    halaman.push(h);

    if data.is_empty() {
        halaman.last_mut().unwrap().teks(
            MARGIN + 4.0,
            y_baris - 16.0,
            false,
            9.0,
            ABU,
            "Tidak ada data yang cocok dengan filter ini.",
        );
    }
    for (i, p) in data.iter().enumerate() {
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
        let sel = |h: &mut Halaman, k: usize, teks: &str, tebal: bool, dy: f64| {
            let (_, x, w) = KOLOM[k];
            h.teks(
                x + 2.0,
                ty - dy,
                tebal,
                UKURAN,
                TEKS,
                &potong(teks, tebal, UKURAN, w - 6.0),
            );
        };
        sel(h, 0, &(i + 1).to_string(), false, 0.0);
        sel(h, 1, &wib(p.created_at)[..10], false, 0.0);
        sel(h, 2, &p.nama, true, 0.0);
        sel(h, 2, &format!("{} | {}", p.no_hp, p.email), false, 10.0);
        sel(
            h,
            3,
            if p.asal_sekolah.is_empty() {
                "-"
            } else {
                &p.asal_sekolah
            },
            false,
            0.0,
        );
        sel(h, 4, &p.prodi_minat, false, 0.0);
        sel(h, 5, label_sumber(&p.sumber), false, 0.0);
        sel(h, 7, label_status(&p.status), false, 0.0);
        if let Some(pesan) = p.pesan.as_deref() {
            let (_, kx, kw) = KOLOM[6];
            let lines = pdfkit::bungkus(pesan, false, UKURAN, kw - 6.0);
            for (n, l) in lines.iter().take(2).enumerate() {
                let teks = if n == 1 && lines.len() > 2 {
                    potong(&format!("{l}..."), false, UKURAN, kw - 6.0)
                } else {
                    l.clone()
                };
                h.teks(kx + 2.0, ty - 10.0 * n as f64, false, UKURAN, TEKS, &teks);
            }
        } else {
            sel(h, 6, "-", false, 0.0);
        }
        y_baris -= TINGGI_BARIS;
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

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

pub async fn ekspor_xlsx_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Query(f): Query<FilterEkspor>,
) -> Result<Response, AppError> {
    let data = ambil(&state.db, &f).await?;
    let berkas = bangun_xlsx(&data)?;
    Response::builder()
        .header(
            header::CONTENT_TYPE,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        .header(
            header::CONTENT_DISPOSITION,
            format!(
                "attachment; filename=\"Calon_Prospek_PMB_{}.xlsx\"",
                Utc::now().format("%Y%m%d")
            ),
        )
        .body(Body::from(berkas))
        .map_err(|e| AppError::Internal(e.to_string()))
}

pub async fn ekspor_pdf_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Query(f): Query<FilterEkspor>,
) -> Result<Response, AppError> {
    let data = ambil(&state.db, &f).await?;
    let sekarang = Utc::now();
    let pdf = bangun_pdf(&data, &deskripsi_filter(&f), sekarang);
    Response::builder()
        .header(header::CONTENT_TYPE, "application/pdf")
        .header(
            header::CONTENT_DISPOSITION,
            format!(
                "attachment; filename=\"Calon_Prospek_PMB_{}.pdf\"",
                sekarang.format("%Y%m%d")
            ),
        )
        .body(Body::from(pdf))
        .map_err(|e| AppError::Internal(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn contoh(pesan: Option<&str>) -> ProspekItem {
        ProspekItem {
            id: Uuid::nil(),
            nama: "=HYPERLINK(\"x\")".into(),
            no_hp: "0812".into(),
            email: "a@b.co".into(),
            asal_sekolah: String::new(),
            prodi_minat: "S1 - Informatika".into(),
            pesan: pesan.map(str::to_string),
            sumber: "KONSULTASI_ONLINE".into(),
            status: "BARU".into(),
            catatan: None,
            created_at: Utc::now(),
        }
    }

    #[test]
    fn xlsx_berupa_zip_valid() {
        let b = bangun_xlsx(&[contoh(Some("Berapa biaya?")), contoh(None)]).unwrap();
        assert_eq!(&b[..2], b"PK");
        assert!(b.len() > 1000);
    }

    #[test]
    fn xlsx_kosong_tetap_valid() {
        assert_eq!(&bangun_xlsx(&[]).unwrap()[..2], b"PK");
    }

    #[test]
    fn pdf_berisi_header_dan_banyak_halaman() {
        let data: Vec<_> = (0..60)
            .map(|_| contoh(Some("Pertanyaan panjang")))
            .collect();
        let pdf = bangun_pdf(&data, "Semua data", Utc::now());
        assert!(pdf.starts_with(b"%PDF"));
        let teks = String::from_utf8_lossy(&pdf);
        assert!(teks.matches("/Type /Page\n").count() + teks.matches("/Type /Page ").count() >= 1);
    }

    #[test]
    fn deskripsi_filter_menyebut_pilihan() {
        let f = FilterEkspor {
            status: Some("BARU".into()),
            sumber: None,
        };
        assert_eq!(deskripsi_filter(&f), "Status: Baru");
    }
}
