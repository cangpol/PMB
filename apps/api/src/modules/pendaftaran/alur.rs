//! Alur PMB v2: satu sumber kebenaran untuk status pendaftar, gerbang transisi,
//! dan stepper yang ditampilkan di portal calon.
//!
//! Urutan alur (sesuai alur resmi PMB UPITRA):
//! 1. Pilih jalur, 2. Buat akun, 3. Isi formulir (+ pilih sesi CBT),
//! 4. Bayar formulir (VA Mandiri / QRIS) + unggah bukti, lalu approval admin,
//! 5. Unggah berkas, lalu verifikasi admin, 6. CBT, 7. Pengumuman,
//! 8. Bayar daftar ulang + unggah bukti, lalu approval admin, 9. Registrasi ulang (NIM).

use serde::{Deserialize, Serialize};
use sqlx::PgExecutor;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

/// Nilai `pendaftar.status_pendaftaran` (lihat CHECK di migrasi 20261107000014).
pub mod status {
    pub const DRAFT: &str = "DRAFT";
    pub const SUBMITTED: &str = "SUBMITTED";
    pub const MENUNGGU_VERIFIKASI_BAYAR: &str = "MENUNGGU_VERIFIKASI_BAYAR";
    pub const PEMBAYARAN_DITOLAK: &str = "PEMBAYARAN_DITOLAK";
    pub const PEMBAYARAN_DISETUJUI: &str = "PEMBAYARAN_DISETUJUI";
    pub const MENUNGGU_VERIFIKASI_BERKAS: &str = "MENUNGGU_VERIFIKASI_BERKAS";
    pub const BERKAS_REVISION: &str = "BERKAS_REVISION";
    pub const BERKAS_VERIFIED: &str = "BERKAS_VERIFIED";
    /// Status lama (sebelum alur v2), diperlakukan setara `BERKAS_VERIFIED`.
    pub const MENUNGGU_UJIAN: &str = "MENUNGGU_UJIAN";
    pub const MENUNGGU_PENGUMUMAN: &str = "MENUNGGU_PENGUMUMAN";
    pub const LULUS: &str = "LULUS";
    pub const CADANGAN: &str = "CADANGAN";
    pub const TIDAK_LULUS: &str = "TIDAK_LULUS";
    pub const MENUNGGU_VERIFIKASI_DAFTAR_ULANG: &str = "MENUNGGU_VERIFIKASI_DAFTAR_ULANG";
    pub const DAFTAR_ULANG_LUNAS: &str = "DAFTAR_ULANG_LUNAS";
    pub const TERDAFTAR: &str = "TERDAFTAR";
    /// Kuota jalur penuh saat daftar ulang; menunggu admin memindahkan ke jalur lain.
    pub const MENUNGGU_PINDAH_JALUR: &str = "MENUNGGU_PINDAH_JALUR";

    /// Calon boleh mengunggah bukti bayar formulir.
    pub const BOLEH_UNGGAH_BUKTI_FORMULIR: &[&str] = &[SUBMITTED, PEMBAYARAN_DITOLAK];
    /// Calon boleh mengunggah / mengganti berkas persyaratan.
    pub const BOLEH_UNGGAH_BERKAS: &[&str] = &[
        PEMBAYARAN_DISETUJUI,
        MENUNGGU_VERIFIKASI_BERKAS,
        BERKAS_REVISION,
    ];
    /// Calon boleh mengikuti CBT.
    pub const BOLEH_UJIAN: &[&str] = &[BERKAS_VERIFIED, MENUNGGU_UJIAN];
    /// Calon boleh mengunggah bukti bayar daftar ulang.
    pub const BOLEH_UNGGAH_BUKTI_DAFTAR_ULANG: &[&str] = &[LULUS];
}

/// Pastikan status saat ini termasuk `boleh`; jika tidak, 409 dengan pesan yang dapat dibaca calon.
pub fn pastikan_status(saat_ini: &str, boleh: &[&str], pesan: &str) -> Result<(), AppError> {
    if boleh.contains(&saat_ini) {
        Ok(())
    } else {
        Err(AppError::Conflict(pesan.to_string()))
    }
}

/// Transisi status atomik: hanya berubah jika status saat ini ada di `dari`.
/// Mengembalikan 409 bila tidak ada baris yang berubah (status sudah bergeser / tidak sah).
pub async fn transisi_status<'e, E: PgExecutor<'e>>(
    exec: E,
    pendaftar_id: Uuid,
    dari: &[&str],
    ke: &str,
    pesan_gagal: &str,
) -> Result<(), AppError> {
    let dari_vec: Vec<String> = dari.iter().map(|s| s.to_string()).collect();
    let res = sqlx::query(
        "UPDATE pendaftar SET status_pendaftaran = $1, updated_at = NOW()
         WHERE id = $2 AND status_pendaftaran = ANY($3)",
    )
    .bind(ke)
    .bind(pendaftar_id)
    .bind(&dari_vec)
    .execute(exec)
    .await?;

    if res.rows_affected() == 0 {
        return Err(AppError::Conflict(pesan_gagal.to_string()));
    }
    Ok(())
}

/// Kirim email notifikasi perubahan tahap ke calon (best-effort: kegagalan hanya dicatat log,
/// tidak menggagalkan aksi utama).
pub async fn kirim_notifikasi(
    pool: &sqlx::PgPool,
    pendaftar_id: Uuid,
    subject: &str,
    pesan: &str,
    tipe_notifikasi: &str,
) {
    let penerima: Option<(String, String)> = match sqlx::query_as(
        "SELECT u.email, u.nama_lengkap FROM users u JOIN pendaftar p ON p.user_id = u.id
         WHERE p.id = $1",
    )
    .bind(pendaftar_id)
    .fetch_optional(pool)
    .await
    {
        Ok(v) => v,
        Err(err) => {
            tracing::warn!(%pendaftar_id, error = %err, "Gagal membaca penerima notifikasi");
            return;
        }
    };

    let Some((email, nama)) = penerima else {
        return;
    };

    let body_text = format!("Halo {nama},\n\n{pesan}\n\nSalam,\nPanitia PMB UPITRA");
    let body_html = format!(
        "<p>Halo <strong>{}</strong>,</p><p>{}</p><p>Salam,<br/>Panitia PMB UPITRA</p>",
        ammonia::clean_text(&nama),
        ammonia::clean_text(pesan)
    );

    let repo = crate::modules::email_queue::repository::EmailQueueRepository::new(pool.clone());
    if let Err(err) = repo
        .enqueue(
            &email,
            &nama,
            subject,
            &body_text,
            &body_html,
            tipe_notifikasi,
            Some(pendaftar_id),
        )
        .await
    {
        tracing::warn!(%pendaftar_id, error = %err, "Gagal mengantrekan email notifikasi");
    }
}

/// Sinkronkan `status_pendaftaran` dengan hasil kelulusan yang SUDAH boleh dilihat calon
/// (dipublikasikan dan `tgl_pengumuman` sudah lewat). Idempoten; aman dipanggil berulang.
/// Tidak menyentuh pendaftar yang sudah masuk tahap daftar ulang.
pub async fn sinkron_status_kelulusan(
    pool: &sqlx::PgPool,
    pendaftar_id: Option<Uuid>,
    sidang_id: Option<Uuid>,
) -> Result<u64, AppError> {
    use status::*;
    let boleh_ditimpa: Vec<String> = [
        SUBMITTED,
        MENUNGGU_VERIFIKASI_BAYAR,
        PEMBAYARAN_DITOLAK,
        PEMBAYARAN_DISETUJUI,
        MENUNGGU_VERIFIKASI_BERKAS,
        BERKAS_REVISION,
        BERKAS_VERIFIED,
        MENUNGGU_UJIAN,
        MENUNGGU_PENGUMUMAN,
        LULUS,
        CADANGAN,
        TIDAK_LULUS,
    ]
    .map(String::from)
    .to_vec();

    let res = sqlx::query(
        "WITH hasil AS (
            SELECT h.pendaftar_id,
                   CASE
                       WHEN h.status_kelulusan LIKE 'LULUS%' THEN 'LULUS'
                       WHEN h.status_kelulusan = 'CADANGAN' THEN 'CADANGAN'
                       ELSE 'TIDAK_LULUS'
                   END AS status_baru
            FROM hasil_kelulusan h
            LEFT JOIN sidang_kelulusan s ON s.id = h.sidang_id
            WHERE h.is_published = TRUE
              AND (s.id IS NULL OR s.tgl_pengumuman <= NOW())
              AND ($1::uuid IS NULL OR h.pendaftar_id = $1)
              AND ($2::uuid IS NULL OR h.sidang_id = $2)
        )
        UPDATE pendaftar p
        SET status_pendaftaran = hasil.status_baru, updated_at = NOW()
        FROM hasil
        WHERE p.id = hasil.pendaftar_id
          AND p.status_pendaftaran = ANY($3)
          AND p.status_pendaftaran <> hasil.status_baru",
    )
    .bind(pendaftar_id)
    .bind(sidang_id)
    .bind(&boleh_ditimpa)
    .execute(pool)
    .await?;
    Ok(res.rows_affected())
}

/// Peringkat kemajuan status untuk membandingkan "sudah melewati langkah X".
pub fn peringkat(status_pendaftaran: &str) -> u8 {
    use status::*;
    match status_pendaftaran {
        DRAFT => 0,
        SUBMITTED => 1,
        MENUNGGU_VERIFIKASI_BAYAR | PEMBAYARAN_DITOLAK => 2,
        PEMBAYARAN_DISETUJUI => 3,
        MENUNGGU_VERIFIKASI_BERKAS | BERKAS_REVISION => 4,
        BERKAS_VERIFIED | MENUNGGU_UJIAN => 5,
        MENUNGGU_PENGUMUMAN => 6,
        LULUS | CADANGAN | TIDAK_LULUS => 7,
        MENUNGGU_VERIFIKASI_DAFTAR_ULANG | MENUNGGU_PINDAH_JALUR => 8,
        DAFTAR_ULANG_LUNAS => 9,
        TERDAFTAR => 10,
        _ => 0,
    }
}

// ==========================================
// STEPPER PORTAL CALON
// ==========================================

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StatusLangkah {
    Selesai,
    Aktif,
    MenungguAdmin,
    Ditolak,
    Terkunci,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct LangkahAlur {
    pub nomor: u8,
    pub kode: String,
    pub judul: String,
    pub status: StatusLangkah,
    pub pesan: String,
    /// Rute portal untuk menyelesaikan langkah ini (None jika tidak ada aksi di portal).
    pub aksi_url: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AlurResponse {
    pub status_pendaftaran: String,
    pub nomor_pendaftaran: Option<String>,
    /// Kode langkah pertama yang belum selesai (None bila seluruh alur tuntas).
    pub langkah_aktif: Option<String>,
    pub langkah: Vec<LangkahAlur>,
    /// Jalur calon adalah Jalur RPL; menu Portofolio & RPL hanya terbuka bila true.
    pub jalur_rpl: bool,
}

/// Data tambahan yang mempengaruhi pesan stepper.
#[derive(Clone, Debug, Default)]
pub struct KonteksAlur {
    pub status_pendaftaran: Option<String>,
    pub nomor_pendaftaran: Option<String>,
    pub alasan_tolak_bayar: Option<String>,
    pub alasan_tolak_bayar_daftar_ulang: Option<String>,
    pub jadwal_ujian: Option<String>,
    pub mode_ujian: Option<String>,
    pub nim: Option<String>,
    /// Hasil CBT terbaru memenuhi passing grade (None = belum ada hasil).
    pub cbt_lulus: Option<bool>,
    /// Seleksi CBT dilewati karena aturan jalur (dinyatakan lulus tanpa ujian).
    pub cbt_dilewati: bool,
}

fn langkah(
    nomor: u8,
    kode: &str,
    judul: &str,
    status: StatusLangkah,
    pesan: impl Into<String>,
    aksi_url: Option<&str>,
) -> LangkahAlur {
    LangkahAlur {
        nomor,
        kode: kode.to_string(),
        judul: judul.to_string(),
        status,
        pesan: pesan.into(),
        aksi_url: aksi_url.map(str::to_string),
    }
}

/// Bangun stepper 9 langkah murni dari status pendaftar (tanpa I/O, mudah diuji).
pub fn bangun_alur(ctx: &KonteksAlur) -> AlurResponse {
    use StatusLangkah::*;
    use status::*;

    let st = ctx.status_pendaftaran.as_deref();
    let s = st.unwrap_or(DRAFT);
    let r = if st.is_some() { peringkat(s) } else { 0 };
    let ada_pendaftar = st.is_some();

    // Urutan nyata: akun dibuat dulu, lalu jalur & prodi dipilih di portal
    // (bagian pertama formulir). Data pendaftar baru ada setelah jalur dipilih.
    let mut list = vec![
        langkah(
            1,
            "buat_akun",
            "Buat Akun PMB",
            Selesai,
            "Akun PMB Anda sudah aktif.",
            None,
        ),
        if ada_pendaftar {
            langkah(
                2,
                "pilih_jalur",
                "Pilih Jalur & Prodi",
                Selesai,
                "Jalur masuk dan program studi sudah dipilih.",
                Some("/portal/formulir"),
            )
        } else {
            langkah(
                2,
                "pilih_jalur",
                "Pilih Jalur & Prodi",
                Aktif,
                "Pilih jalur masuk, gelombang, dan program studi tujuan Anda.",
                Some("/portal/formulir"),
            )
        },
    ];

    // 3. Formulir
    list.push(if ada_pendaftar && r >= 1 {
        langkah(
            3,
            "formulir",
            "Isi Formulir",
            Selesai,
            "Formulir terkirim.",
            Some("/portal/formulir"),
        )
    } else if ada_pendaftar {
        langkah(
            3,
            "formulir",
            "Isi Formulir",
            Aktif,
            "Lengkapi data diri, data sekolah, data orang tua, dan jadwal seleksi, lalu kirim formulir.",
            Some("/portal/formulir"),
        )
    } else {
        langkah(
            3,
            "formulir",
            "Isi Formulir",
            Terkunci,
            "Pilih jalur dan program studi terlebih dahulu.",
            None,
        )
    });

    // 4. Pembayaran formulir
    list.push(match s {
        _ if !ada_pendaftar || r < 1 => langkah(
            4,
            "pembayaran",
            "Bayar Formulir",
            Terkunci,
            "Kirim formulir terlebih dahulu.",
            None,
        ),
        SUBMITTED => langkah(
            4,
            "pembayaran",
            "Bayar Formulir",
            Aktif,
            "Bayar melalui VA Mandiri atau QRIS, lalu unggah bukti pembayaran.",
            Some("/portal/pembayaran"),
        ),
        MENUNGGU_VERIFIKASI_BAYAR => langkah(
            4,
            "pembayaran",
            "Bayar Formulir",
            MenungguAdmin,
            "Bukti pembayaran sedang diperiksa admin PMB.",
            Some("/portal/pembayaran"),
        ),
        PEMBAYARAN_DITOLAK => langkah(
            4,
            "pembayaran",
            "Bayar Formulir",
            Ditolak,
            format!(
                "Bukti pembayaran ditolak{}. Silakan unggah ulang.",
                ctx.alasan_tolak_bayar
                    .as_deref()
                    .map(|a| format!(": {a}"))
                    .unwrap_or_default()
            ),
            Some("/portal/pembayaran"),
        ),
        _ => langkah(
            4,
            "pembayaran",
            "Bayar Formulir",
            Selesai,
            "Pembayaran formulir disetujui.",
            Some("/portal/pembayaran"),
        ),
    });

    // 5. Berkas
    list.push(match s {
        _ if r < 3 => langkah(
            5,
            "berkas",
            "Unggah Berkas",
            Terkunci,
            "Terbuka setelah pembayaran formulir disetujui.",
            None,
        ),
        PEMBAYARAN_DISETUJUI => langkah(
            5,
            "berkas",
            "Unggah Berkas",
            Aktif,
            "Unggah rapor, pas foto, surat rekomendasi, dan berkas khusus prodi.",
            Some("/portal/berkas"),
        ),
        MENUNGGU_VERIFIKASI_BERKAS => langkah(
            5,
            "berkas",
            "Unggah Berkas",
            MenungguAdmin,
            "Berkas sedang diverifikasi admin PMB.",
            Some("/portal/berkas"),
        ),
        BERKAS_REVISION => langkah(
            5,
            "berkas",
            "Unggah Berkas",
            Ditolak,
            "Ada berkas yang perlu diperbaiki. Lihat catatan admin.",
            Some("/portal/berkas"),
        ),
        _ => langkah(
            5,
            "berkas",
            "Unggah Berkas",
            Selesai,
            "Berkas terverifikasi.",
            Some("/portal/berkas"),
        ),
    });

    // 6. CBT
    let info_jadwal = match (&ctx.jadwal_ujian, &ctx.mode_ujian) {
        (Some(j), Some(m)) => format!(" Jadwal: {j} ({}).", m.to_lowercase()),
        (Some(j), None) => format!(" Jadwal: {j}."),
        _ => String::new(),
    };
    list.push(match r {
        // Jalur READY tertentu: CBT dilewati dengan keterangan lulus setelah seleksi berkas disetujui
        _ if ctx.cbt_dilewati && r >= 6 => langkah(
            6,
            "ujian",
            "Ujian CBT",
            Selesai,
            "Seleksi CBT dilewati dan dinyatakan lulus sesuai ketentuan jalur Anda.",
            None,
        ),
        // CBT selesai: calon tidak diberi tahu lulus/tidaknya; admin yang menilai sesuai passing grade
        _ if s == MENUNGGU_UJIAN => langkah(
            6,
            "ujian",
            "Ujian CBT",
            MenungguAdmin,
            "Ujian selesai. Nilai CBT kamu akan kami nilai dulu; admin yang menentukan lolos atau tidaknya sesuai ketentuan passing grade.",
            Some("/portal/ujian"),
        ),
        0..=4 => langkah(
            6,
            "ujian",
            "Ujian CBT",
            Terkunci,
            format!("Terbuka setelah berkas terverifikasi.{info_jadwal}"),
            None,
        ),
        5 => langkah(
            6,
            "ujian",
            "Ujian CBT",
            Aktif,
            format!("Setelah dinyatakan lulus seleksi rapor, ikuti CBT online sesuai jadwal yang Anda pilih.{info_jadwal}"),
            Some("/portal/ujian"),
        ),
        _ => langkah(6, "ujian", "Ujian CBT", Selesai, "Ujian selesai.", None),
    });

    // 7. Pengumuman
    list.push(match s {
        _ if r < 6 => langkah(
            7,
            "pengumuman",
            "Cek Pengumuman",
            Terkunci,
            "Pengumuman terbit sesuai jadwal seleksi.",
            None,
        ),
        MENUNGGU_PENGUMUMAN => langkah(
            7,
            "pengumuman",
            "Cek Pengumuman",
            MenungguAdmin,
            if ctx.cbt_dilewati {
                "Seleksi CBT dilewati. Menunggu seleksi wawancara dan pengumuman hasil."
            } else {
                "CBT selesai. Menunggu seleksi interview dan pengumuman hasil."
            },
            Some("/portal/hasil"),
        ),
        TIDAK_LULUS => langkah(
            7,
            "pengumuman",
            "Cek Pengumuman",
            Ditolak,
            "Mohon maaf, Anda belum lulus seleksi pada gelombang ini.",
            Some("/portal/hasil"),
        ),
        CADANGAN => langkah(
            7,
            "pengumuman",
            "Cek Pengumuman",
            MenungguAdmin,
            "Anda berstatus cadangan. Tunggu pemanggilan dari panitia.",
            Some("/portal/hasil"),
        ),
        _ => langkah(
            7,
            "pengumuman",
            "Cek Pengumuman",
            Selesai,
            "Selamat, Anda dinyatakan lulus. Unduh surat penerimaan.",
            Some("/portal/hasil"),
        ),
    });

    // 8. Bayar daftar ulang
    list.push(match s {
        LULUS if ctx.alasan_tolak_bayar_daftar_ulang.is_some() => langkah(
            8,
            "bayar_daftar_ulang",
            "Bayar Daftar Ulang",
            Ditolak,
            format!(
                "Bukti pembayaran daftar ulang ditolak: {}. Silakan unggah ulang.",
                ctx.alasan_tolak_bayar_daftar_ulang
                    .as_deref()
                    .unwrap_or("-")
            ),
            Some("/portal/daftar-ulang"),
        ),
        LULUS => langkah(
            8,
            "bayar_daftar_ulang",
            "Bayar Daftar Ulang",
            Aktif,
            "Bayar sesuai surat penerimaan (VA Mandiri / QRIS), lalu unggah bukti.",
            Some("/portal/daftar-ulang"),
        ),
        MENUNGGU_VERIFIKASI_DAFTAR_ULANG => langkah(
            8,
            "bayar_daftar_ulang",
            "Bayar Daftar Ulang",
            MenungguAdmin,
            "Bukti pembayaran daftar ulang sedang diperiksa admin PMB.",
            Some("/portal/daftar-ulang"),
        ),
        MENUNGGU_PINDAH_JALUR => langkah(
            8,
            "bayar_daftar_ulang",
            "Bayar Daftar Ulang",
            MenungguAdmin,
            "Kuota jalur pilihan Anda sudah terpenuhi. Admin PMB akan memindahkan Anda ke jalur lain; hasil seleksi tetap berlaku.",
            Some("/portal/daftar-ulang"),
        ),
        _ if r >= 9 => langkah(
            8,
            "bayar_daftar_ulang",
            "Bayar Daftar Ulang",
            Selesai,
            "Pembayaran daftar ulang disetujui.",
            Some("/portal/daftar-ulang"),
        ),
        _ => langkah(
            8,
            "bayar_daftar_ulang",
            "Bayar Daftar Ulang",
            Terkunci,
            "Khusus calon yang dinyatakan lulus.",
            None,
        ),
    });

    // 9. Registrasi ulang
    list.push(match s {
        DAFTAR_ULANG_LUNAS => langkah(
            9,
            "registrasi_ulang",
            "Registrasi Ulang",
            Aktif,
            "Unggah berkas registrasi ulang untuk menerima NIM.",
            Some("/portal/daftar-ulang"),
        ),
        TERDAFTAR => langkah(
            9,
            "registrasi_ulang",
            "Registrasi Ulang",
            Selesai,
            match &ctx.nim {
                Some(nim) => format!("Selamat bergabung! NIM Anda: {nim}."),
                None => "Registrasi ulang selesai.".to_string(),
            },
            Some("/portal/daftar-ulang"),
        ),
        _ => langkah(
            9,
            "registrasi_ulang",
            "Registrasi Ulang",
            Terkunci,
            "Terbuka setelah pembayaran daftar ulang disetujui.",
            None,
        ),
    });

    let langkah_aktif = list
        .iter()
        .find(|l| l.status != Selesai)
        .map(|l| l.kode.clone());

    AlurResponse {
        status_pendaftaran: s.to_string(),
        nomor_pendaftaran: ctx.nomor_pendaftaran.clone(),
        langkah_aktif,
        langkah: list,
        jalur_rpl: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn alur(st: Option<&str>) -> AlurResponse {
        bangun_alur(&KonteksAlur {
            status_pendaftaran: st.map(str::to_string),
            ..Default::default()
        })
    }

    fn status_of(a: &AlurResponse, kode: &str) -> StatusLangkah {
        a.langkah.iter().find(|l| l.kode == kode).unwrap().status
    }

    #[test]
    fn calon_baru_aktif_di_pilih_jalur() {
        let a = alur(None);
        assert_eq!(a.langkah.len(), 9);
        // Akun dibuat lebih dulu, baru memilih jalur
        assert_eq!(a.langkah[0].kode, "buat_akun");
        assert_eq!(a.langkah[0].status, StatusLangkah::Selesai);
        assert_eq!(a.langkah[1].kode, "pilih_jalur");
        assert_eq!(a.langkah_aktif.as_deref(), Some("pilih_jalur"));
        assert_eq!(status_of(&a, "formulir"), StatusLangkah::Terkunci);
        assert_eq!(status_of(&a, "pembayaran"), StatusLangkah::Terkunci);
    }

    #[test]
    fn setelah_pilih_jalur_aktif_di_formulir() {
        let a = alur(Some(status::DRAFT));
        assert_eq!(status_of(&a, "pilih_jalur"), StatusLangkah::Selesai);
        assert_eq!(a.langkah_aktif.as_deref(), Some("formulir"));
    }

    #[test]
    fn setelah_submit_aktif_di_pembayaran() {
        let a = alur(Some(status::SUBMITTED));
        assert_eq!(a.langkah_aktif.as_deref(), Some("pembayaran"));
        assert_eq!(status_of(&a, "berkas"), StatusLangkah::Terkunci);
    }

    #[test]
    fn bukti_ditolak_menampilkan_alasan() {
        let a = bangun_alur(&KonteksAlur {
            status_pendaftaran: Some(status::PEMBAYARAN_DITOLAK.into()),
            alasan_tolak_bayar: Some("nominal kurang".into()),
            ..Default::default()
        });
        let l = a.langkah.iter().find(|l| l.kode == "pembayaran").unwrap();
        assert_eq!(l.status, StatusLangkah::Ditolak);
        assert!(l.pesan.contains("nominal kurang"));
    }

    #[test]
    fn ujian_terkunci_sampai_berkas_terverifikasi() {
        assert_eq!(
            status_of(&alur(Some(status::MENUNGGU_VERIFIKASI_BERKAS)), "ujian"),
            StatusLangkah::Terkunci
        );
        let a = alur(Some(status::BERKAS_VERIFIED));
        assert_eq!(status_of(&a, "ujian"), StatusLangkah::Aktif);
        assert_eq!(a.langkah_aktif.as_deref(), Some("ujian"));
    }

    #[test]
    fn cbt_selesai_menunggu_penilaian_admin_tanpa_membedakan_lulus_tidak() {
        for lulus in [Some(true), Some(false), None] {
            let a = bangun_alur(&KonteksAlur {
                status_pendaftaran: Some(status::MENUNGGU_UJIAN.to_string()),
                cbt_lulus: lulus,
                ..Default::default()
            });
            assert_eq!(status_of(&a, "ujian"), StatusLangkah::MenungguAdmin);
            assert_eq!(status_of(&a, "pengumuman"), StatusLangkah::Terkunci);
            let pesan = &a.langkah.iter().find(|l| l.kode == "ujian").unwrap().pesan;
            assert!(pesan.contains("akan kami nilai dulu"), "{pesan}");
            assert!(!pesan.to_lowercase().contains("memenuhi"), "{pesan}");
        }
    }

    #[test]
    fn cbt_dilewati_jalur_ready_ditampilkan_selesai_lulus() {
        let a = bangun_alur(&KonteksAlur {
            status_pendaftaran: Some(status::LULUS.to_string()),
            cbt_dilewati: true,
            ..Default::default()
        });
        assert_eq!(status_of(&a, "ujian"), StatusLangkah::Selesai);
        let pesan = &a.langkah.iter().find(|l| l.kode == "ujian").unwrap().pesan;
        assert!(pesan.contains("dilewati"), "{pesan}");

        // Creator: CBT dilewati tetapi wawancara masih menunggu
        let a = bangun_alur(&KonteksAlur {
            status_pendaftaran: Some(status::MENUNGGU_PENGUMUMAN.to_string()),
            cbt_dilewati: true,
            ..Default::default()
        });
        assert_eq!(status_of(&a, "ujian"), StatusLangkah::Selesai);
        let p7 = &a
            .langkah
            .iter()
            .find(|l| l.kode == "pengumuman")
            .unwrap()
            .pesan;
        assert!(p7.contains("wawancara"), "{p7}");
    }

    #[test]
    fn tahap_interview_belum_membuka_daftar_ulang() {
        // Selesai CBT, masih menunggu seleksi interview/pengumuman: daftar ulang & registrasi terkunci
        for st in [status::MENUNGGU_UJIAN, status::MENUNGGU_PENGUMUMAN] {
            let a = alur(Some(st));
            assert_eq!(
                status_of(&a, "bayar_daftar_ulang"),
                StatusLangkah::Terkunci,
                "{st}"
            );
            assert_eq!(
                status_of(&a, "registrasi_ulang"),
                StatusLangkah::Terkunci,
                "{st}"
            );
        }
    }

    #[test]
    fn tidak_lulus_tidak_membuka_daftar_ulang() {
        let a = alur(Some(status::TIDAK_LULUS));
        assert_eq!(status_of(&a, "pengumuman"), StatusLangkah::Ditolak);
        assert_eq!(status_of(&a, "bayar_daftar_ulang"), StatusLangkah::Terkunci);
    }

    #[test]
    fn terdaftar_semua_selesai() {
        let a = alur(Some(status::TERDAFTAR));
        assert!(a.langkah.iter().all(|l| l.status == StatusLangkah::Selesai));
        assert_eq!(a.langkah_aktif, None);
    }

    #[test]
    fn gerbang_status() {
        assert!(pastikan_status("SUBMITTED", status::BOLEH_UNGGAH_BUKTI_FORMULIR, "x").is_ok());
        assert!(pastikan_status("DRAFT", status::BOLEH_UNGGAH_BERKAS, "x").is_err());
        assert!(pastikan_status("MENUNGGU_UJIAN", status::BOLEH_UJIAN, "x").is_ok());
    }
}
