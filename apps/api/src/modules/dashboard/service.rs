use chrono::{DateTime, NaiveDate, TimeZone, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::{
        dashboard::dto::{
            AdminDashboardResponse, AntreanItem, AntreanVerifikasiResponse, CalonDashboardResponse,
            DashboardFilterQuery, DistribusiJalurStat, DistribusiProdiStat,
            ExecutiveDashboardResponse, FunnelStat, ProdiStat, StatusPendaftaranStat, StepperStep,
            TrenHarianStat,
        },
        pendaftaran::repository::PendaftaranRepository,
    },
};

type RawProdiRow = (Uuid, String, String, String, i32, i64, i64, i64);

#[derive(Clone)]
pub struct DashboardService {
    pool: PgPool,
    pendaftar_repo: PendaftaranRepository,
}

impl DashboardService {
    /// Hitung antrean berkas/bukti yang menunggu pemeriksaan. Hanya antrean yang
    /// diizinkan (`berkas`, `bukti_bayar`, `daftar_ulang`) yang dihitung.
    pub async fn get_antrean_verifikasi(
        &self,
        berkas: bool,
        bukti_bayar: bool,
        daftar_ulang: bool,
        cbt_keputusan: bool,
    ) -> Result<AntreanVerifikasiResponse, AppError> {
        let mut res = AntreanVerifikasiResponse::default();
        // Berkas terbaru per jenis saja: berkas lama yang sudah diunggah ulang tidak ikut dihitung
        if berkas {
            res.berkas = self
                .hitung_antrean(
                    "SELECT COUNT(*)::bigint, COUNT(DISTINCT pendaftar_id)::bigint, MIN(uploaded_at)
                     FROM (SELECT DISTINCT ON (pendaftar_id, jenis_berkas)
                                  pendaftar_id, status_verifikasi, uploaded_at
                           FROM berkas_pendaftar
                           ORDER BY pendaftar_id, jenis_berkas, uploaded_at DESC) t
                     WHERE status_verifikasi = 'PENDING'",
                )
                .await?;
        }
        if bukti_bayar {
            res.bukti_bayar = self
                .hitung_antrean(
                    "SELECT COUNT(*)::bigint, COUNT(DISTINCT pendaftar_id)::bigint, MIN(created_at)
                     FROM bukti_pembayaran WHERE status = 'PENDING'",
                )
                .await?;
        }
        if daftar_ulang {
            res.daftar_ulang = self
                .hitung_antrean(
                    "SELECT COUNT(*)::bigint, COUNT(DISTINCT pendaftar_id)::bigint, MIN(uploaded_at)
                     FROM (SELECT DISTINCT ON (pendaftar_id, jenis_berkas)
                                  pendaftar_id, status_verifikasi, uploaded_at
                           FROM berkas_daftar_ulang
                           ORDER BY pendaftar_id, jenis_berkas, uploaded_at DESC) t
                     WHERE status_verifikasi = 'PENDING'",
                )
                .await?;
        }
        // Hasil CBT terbaru per calon yang belum memenuhi passing grade dan belum diputuskan admin
        if cbt_keputusan {
            res.cbt_keputusan = self
                .hitung_antrean(
                    "SELECT COUNT(*)::bigint, COUNT(DISTINCT t.pendaftar_id)::bigint, MIN(t.waktu_submit)
                     FROM (SELECT DISTINCT ON (pendaftar_id) pendaftar_id, is_lulus, waktu_submit
                           FROM hasil_ujian
                           ORDER BY pendaftar_id, waktu_submit DESC) t
                     JOIN pendaftar p ON p.id = t.pendaftar_id
                     WHERE t.is_lulus = FALSE
                       AND p.status_pendaftaran IN ('MENUNGGU_UJIAN', 'MENUNGGU_PENGUMUMAN')",
                )
                .await?;
        }
        res.total = res.berkas.menunggu
            + res.bukti_bayar.menunggu
            + res.daftar_ulang.menunggu
            + res.cbt_keputusan.menunggu;
        Ok(res)
    }

    async fn hitung_antrean(&self, sql: &'static str) -> Result<AntreanItem, AppError> {
        let (menunggu, calon, terlama_sejak): (i64, i64, Option<DateTime<Utc>>) =
            sqlx::query_as(sql).fetch_one(&self.pool).await?;
        Ok(AntreanItem {
            menunggu,
            calon,
            terlama_sejak,
        })
    }

    pub fn new(pool: PgPool) -> Self {
        let pendaftar_repo = PendaftaranRepository::new(pool.clone());
        Self {
            pool,
            pendaftar_repo,
        }
    }

    pub async fn get_calon_dashboard(
        &self,
        user_id: Uuid,
    ) -> Result<CalonDashboardResponse, AppError> {
        let p = self.pendaftar_repo.find_by_user_id(user_id).await?;

        let (no_pendaftaran, status_pendaftaran, pendaftar_id) = match p {
            Some(ref val) => (
                Some(val.nomor_pendaftaran.clone()),
                val.status_pendaftaran.clone(),
                Some(val.id),
            ),
            None => (None, "BELUM_MENDAFTAR".to_string(), None),
        };

        let mut bayar_lunas = false;
        let mut berkas_valid = false;
        let mut ujian_done = false;
        let mut kelulusan_stat = None;
        let mut nim_resmi = None;

        if let Some(pid) = pendaftar_id {
            // Cek pembayaran formulir
            let bayar_row: Option<(String,)> = sqlx::query_as(
                "SELECT status_pembayaran FROM pembayaran WHERE pendaftar_id = $1 AND jenis_tagihan = 'FORMULIR' ORDER BY created_at DESC LIMIT 1"
            )
            .bind(pid)
            .fetch_optional(&self.pool)
            .await?;
            if let Some((st,)) = bayar_row {
                bayar_lunas = st == "LUNAS";
            }

            // Cek berkas
            let berkas_count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM berkas_pendaftar WHERE pendaftar_id = $1 AND status_verifikasi = 'VALID'"
            )
            .bind(pid)
            .fetch_one(&self.pool)
            .await?;
            berkas_valid = berkas_count.0 > 0;

            // Cek ujian
            let ujian_row: Option<(bool,)> = sqlx::query_as(
                "SELECT waktu_selesai IS NOT NULL FROM peserta_ujian WHERE pendaftar_id = $1 LIMIT 1"
            )
            .bind(pid)
            .fetch_optional(&self.pool)
            .await?;
            if let Some((done,)) = ujian_row {
                ujian_done = done;
            }

            // Cek kelulusan
            let lulus_row: Option<(String, Option<String>)> = sqlx::query_as(
                "SELECT status_kelulusan, nim_resmi FROM hasil_kelulusan WHERE pendaftar_id = $1 LIMIT 1"
            )
            .bind(pid)
            .fetch_optional(&self.pool)
            .await?;
            if let Some((st, nim)) = lulus_row {
                kelulusan_stat = Some(st);
                nim_resmi = nim;
            }
        }

        let stepper = vec![
            StepperStep {
                key: "registrasi".to_string(),
                judul: "1. Pembuatan Akun".to_string(),
                deskripsi: "Akun calon mahasiswa aktif".to_string(),
                status: "SELESAI".to_string(),
                nomor_urut: 1,
            },
            StepperStep {
                key: "pembayaran".to_string(),
                judul: "2. Biaya Formulir".to_string(),
                deskripsi: if bayar_lunas {
                    "Tagihan formulir lunas"
                } else {
                    "Menunggu pelunasan formulir"
                }
                .to_string(),
                status: if bayar_lunas { "SELESAI" } else { "AKTIF" }.to_string(),
                nomor_urut: 2,
            },
            StepperStep {
                key: "biodata".to_string(),
                judul: "3. Isi Formulir & Berkas".to_string(),
                deskripsi: if pendaftar_id.is_some() {
                    "Data telah diisi"
                } else {
                    "Lengkapi biodata dan unggah dokumen"
                }
                .to_string(),
                status: if pendaftar_id.is_some() {
                    "SELESAI"
                } else if bayar_lunas {
                    "AKTIF"
                } else {
                    "MENUNGGU"
                }
                .to_string(),
                nomor_urut: 3,
            },
            StepperStep {
                key: "verifikasi".to_string(),
                judul: "4. Verifikasi Berkas".to_string(),
                deskripsi: if berkas_valid {
                    "Dokumen terverifikasi"
                } else {
                    "Pemeriksaan dokumen oleh panitia"
                }
                .to_string(),
                status: if berkas_valid {
                    "SELESAI"
                } else if pendaftar_id.is_some() {
                    "AKTIF"
                } else {
                    "MENUNGGU"
                }
                .to_string(),
                nomor_urut: 4,
            },
            StepperStep {
                key: "ujian".to_string(),
                judul: "5. Ujian CBT".to_string(),
                deskripsi: if ujian_done {
                    "Tes CBT selesai"
                } else {
                    "Pengerjaan tes online potensi akademik"
                }
                .to_string(),
                status: if ujian_done {
                    "SELESAI"
                } else if berkas_valid {
                    "AKTIF"
                } else {
                    "MENUNGGU"
                }
                .to_string(),
                nomor_urut: 5,
            },
            StepperStep {
                key: "kelulusan".to_string(),
                judul: "6. Hasil & SK Kelulusan".to_string(),
                deskripsi: if kelulusan_stat.is_some() {
                    "Pengumuman dan penerbitan NIM"
                } else {
                    "Menunggu sidang yudisium seleksi"
                }
                .to_string(),
                status: if kelulusan_stat.is_some() {
                    "SELESAI"
                } else if ujian_done {
                    "AKTIF"
                } else {
                    "MENUNGGU"
                }
                .to_string(),
                nomor_urut: 6,
            },
        ];

        Ok(CalonDashboardResponse {
            nomor_pendaftaran: no_pendaftaran,
            status_pendaftaran,
            stepper,
            tagihan_formulir_lunas: bayar_lunas,
            berkas_terverifikasi: berkas_valid,
            ujian_selesai: ujian_done,
            hasil_kelulusan: kelulusan_stat,
            nim_resmi,
        })
    }

    pub async fn get_admin_dashboard(&self) -> Result<AdminDashboardResponse, AppError> {
        let total_pendaftar: (i64,) = sqlx::query_as("SELECT COALESCE(COUNT(*), 0) FROM pendaftar")
            .fetch_one(&self.pool)
            .await?;

        let total_berkas: (i64,) = sqlx::query_as(
            "SELECT COALESCE(COUNT(*), 0) FROM berkas_pendaftar WHERE status_verifikasi = 'VALID'",
        )
        .fetch_one(&self.pool)
        .await?;

        let total_lulus: (i64,) = sqlx::query_as("SELECT COALESCE(COUNT(*), 0) FROM hasil_kelulusan WHERE status_kelulusan LIKE 'LULUS%'")
            .fetch_one(&self.pool)
            .await?;

        let total_dana: (i64,) = sqlx::query_as("SELECT COALESCE(SUM(nominal_akhir), 0)::BIGINT FROM pembayaran WHERE status_pembayaran = 'LUNAS'")
            .fetch_one(&self.pool)
            .await?;

        // Distribusi program studi
        let prodi_stats: Vec<(String, String, i32, i64)> = sqlx::query_as(
            "SELECT ps.nama_prodi, ps.jenjang, ps.kuota, COALESCE(COUNT(p.id), 0)
             FROM program_studi ps
             LEFT JOIN pendaftar p ON p.prodi_pilihan_1 = ps.id
             GROUP BY ps.id, ps.nama_prodi, ps.jenjang, ps.kuota
             ORDER BY ps.nama_prodi ASC",
        )
        .fetch_all(&self.pool)
        .await?;

        let distribusi_prodi = prodi_stats
            .into_iter()
            .map(|(nama, jenjang, kuota, peminat)| ProdiStat {
                nama_prodi: nama,
                jenjang,
                total_peminat: peminat,
                kuota,
            })
            .collect();

        let funnel_tahapan = vec![
            FunnelStat {
                tahapan: "1. Akun Terdaftar".to_string(),
                jumlah: total_pendaftar.0,
            },
            FunnelStat {
                tahapan: "2. Berkas Valid".to_string(),
                jumlah: total_berkas.0,
            },
            FunnelStat {
                tahapan: "3. Lulus Seleksi".to_string(),
                jumlah: total_lulus.0,
            },
        ];

        Ok(AdminDashboardResponse {
            total_pendaftar: total_pendaftar.0,
            total_berkas_diverifikasi: total_berkas.0,
            total_lulus: total_lulus.0,
            total_pendapatan_rupiah: total_dana.0,
            distribusi_prodi,
            funnel_tahapan,
        })
    }

    // =========================================================================
    // EXECUTIVE ANALYTICS DASHBOARD
    // =========================================================================

    pub async fn get_executive_dashboard(
        &self,
        filter: &DashboardFilterQuery,
    ) -> Result<ExecutiveDashboardResponse, AppError> {
        let (start_dt, end_dt) =
            parse_date_filters(filter.start_date.as_deref(), filter.end_date.as_deref());

        // 1. KPI Counts
        let total_pendaftar: (i64,) = sqlx::query_as(
            "SELECT COALESCE(COUNT(p.id), 0)
             FROM pendaftar p
             WHERE ($1::uuid IS NULL OR p.gelombang_id = $1)
               AND ($2::uuid IS NULL OR p.jalur_id = $2)
               AND ($3::timestamptz IS NULL OR p.created_at >= $3)
               AND ($4::timestamptz IS NULL OR p.created_at <= $4)",
        )
        .bind(filter.gelombang_id)
        .bind(filter.jalur_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_one(&self.pool)
        .await?;

        let total_berkas: (i64,) = sqlx::query_as(
            "SELECT COALESCE(COUNT(DISTINCT p.id), 0)
             FROM pendaftar p
             JOIN berkas_pendaftar b ON b.pendaftar_id = p.id
             WHERE b.status_verifikasi = 'VALID'
               AND ($1::uuid IS NULL OR p.gelombang_id = $1)
               AND ($2::uuid IS NULL OR p.jalur_id = $2)
               AND ($3::timestamptz IS NULL OR p.created_at >= $3)
               AND ($4::timestamptz IS NULL OR p.created_at <= $4)",
        )
        .bind(filter.gelombang_id)
        .bind(filter.jalur_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_one(&self.pool)
        .await?;

        let total_ujian: (i64,) = sqlx::query_as(
            "SELECT COALESCE(COUNT(DISTINCT p.id), 0)
             FROM pendaftar p
             JOIN peserta_ujian u ON u.pendaftar_id = p.id
             WHERE u.waktu_selesai IS NOT NULL
               AND ($1::uuid IS NULL OR p.gelombang_id = $1)
               AND ($2::uuid IS NULL OR p.jalur_id = $2)
               AND ($3::timestamptz IS NULL OR p.created_at >= $3)
               AND ($4::timestamptz IS NULL OR p.created_at <= $4)",
        )
        .bind(filter.gelombang_id)
        .bind(filter.jalur_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_one(&self.pool)
        .await?;

        let total_lulus: (i64,) = sqlx::query_as(
            "SELECT COALESCE(COUNT(DISTINCT p.id), 0)
             FROM pendaftar p
             JOIN hasil_kelulusan h ON h.pendaftar_id = p.id
             WHERE h.status_kelulusan LIKE 'LULUS%'
               AND ($1::uuid IS NULL OR p.gelombang_id = $1)
               AND ($2::uuid IS NULL OR p.jalur_id = $2)
               AND ($3::timestamptz IS NULL OR p.created_at >= $3)
               AND ($4::timestamptz IS NULL OR p.created_at <= $4)",
        )
        .bind(filter.gelombang_id)
        .bind(filter.jalur_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_one(&self.pool)
        .await?;

        let total_nim: (i64,) = sqlx::query_as(
            "SELECT COALESCE(COUNT(DISTINCT p.id), 0)
             FROM pendaftar p
             JOIN hasil_kelulusan h ON h.pendaftar_id = p.id
             WHERE h.nim_resmi IS NOT NULL
               AND ($1::uuid IS NULL OR p.gelombang_id = $1)
               AND ($2::uuid IS NULL OR p.jalur_id = $2)
               AND ($3::timestamptz IS NULL OR p.created_at >= $3)
               AND ($4::timestamptz IS NULL OR p.created_at <= $4)",
        )
        .bind(filter.gelombang_id)
        .bind(filter.jalur_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_one(&self.pool)
        .await?;

        let total_dana_lunas: (i64,) = sqlx::query_as(
            "SELECT COALESCE(SUM(pb.nominal_akhir), 0)::BIGINT
             FROM pembayaran pb
             JOIN pendaftar p ON p.id = pb.pendaftar_id
             WHERE pb.status_pembayaran = 'LUNAS'
               AND ($1::uuid IS NULL OR p.gelombang_id = $1)
               AND ($2::uuid IS NULL OR p.jalur_id = $2)
               AND ($3::timestamptz IS NULL OR p.created_at >= $3)
               AND ($4::timestamptz IS NULL OR p.created_at <= $4)",
        )
        .bind(filter.gelombang_id)
        .bind(filter.jalur_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_one(&self.pool)
        .await?;

        let total_dana_piutang: (i64,) = sqlx::query_as(
            "SELECT COALESCE(SUM(pb.nominal_akhir), 0)::BIGINT
             FROM pembayaran pb
             JOIN pendaftar p ON p.id = pb.pendaftar_id
             WHERE pb.status_pembayaran = 'MENUNGGU_PEMBAYARAN'
               AND ($1::uuid IS NULL OR p.gelombang_id = $1)
               AND ($2::uuid IS NULL OR p.jalur_id = $2)
               AND ($3::timestamptz IS NULL OR p.created_at >= $3)
               AND ($4::timestamptz IS NULL OR p.created_at <= $4)",
        )
        .bind(filter.gelombang_id)
        .bind(filter.jalur_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_one(&self.pool)
        .await?;

        // 2. Tren Harian (14 hari terakhir)
        let tren_rows: Vec<(String, i64, i64, i64)> = sqlx::query_as(
            "WITH dates AS (
                SELECT (CURRENT_DATE - i)::date as dt
                FROM generate_series(0, 13) i
             )
             SELECT
                TO_CHAR(d.dt, 'YYYY-MM-DD') as tanggal,
                COALESCE(COUNT(DISTINCT p.id), 0) as pendaftar,
                COALESCE(COUNT(DISTINCT b.pendaftar_id), 0) as terverifikasi,
                COALESCE(COUNT(DISTINCT pb.pendaftar_id), 0) as bayar
             FROM dates d
             LEFT JOIN pendaftar p ON DATE(p.created_at) = d.dt
                AND ($1::uuid IS NULL OR p.gelombang_id = $1)
                AND ($2::uuid IS NULL OR p.jalur_id = $2)
             LEFT JOIN berkas_pendaftar b ON b.pendaftar_id = p.id AND b.status_verifikasi = 'VALID'
             LEFT JOIN pembayaran pb ON pb.pendaftar_id = p.id AND pb.status_pembayaran = 'LUNAS'
             GROUP BY d.dt
             ORDER BY d.dt ASC",
        )
        .bind(filter.gelombang_id)
        .bind(filter.jalur_id)
        .fetch_all(&self.pool)
        .await?;

        let tren_harian = tren_rows
            .into_iter()
            .map(
                |(tanggal, pendaftar, terverifikasi, bayar)| TrenHarianStat {
                    tanggal,
                    pendaftar,
                    terverifikasi,
                    bayar,
                },
            )
            .collect();

        // 3. Distribusi Program Studi
        let prodi_rows: Vec<RawProdiRow> = sqlx::query_as(
            "SELECT
                ps.id,
                ps.kode_prodi,
                ps.nama_prodi,
                ps.jenjang,
                ps.kuota,
                COALESCE(COUNT(p.id), 0) as total_peminat,
                COALESCE(COUNT(CASE WHEN h.status_kelulusan LIKE 'LULUS%' THEN 1 END), 0) as total_lulus,
                COALESCE(COUNT(CASE WHEN h.nim_resmi IS NOT NULL THEN 1 END), 0) as total_daftar_ulang
             FROM program_studi ps
             LEFT JOIN pendaftar p ON p.prodi_pilihan_1 = ps.id
                AND ($1::uuid IS NULL OR p.gelombang_id = $1)
                AND ($2::uuid IS NULL OR p.jalur_id = $2)
                AND ($3::timestamptz IS NULL OR p.created_at >= $3)
                AND ($4::timestamptz IS NULL OR p.created_at <= $4)
             LEFT JOIN hasil_kelulusan h ON h.pendaftar_id = p.id
             GROUP BY ps.id, ps.kode_prodi, ps.nama_prodi, ps.jenjang, ps.kuota
             ORDER BY ps.kode_prodi ASC",
        )
        .bind(filter.gelombang_id)
        .bind(filter.jalur_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_all(&self.pool)
        .await?;

        let distribusi_prodi = prodi_rows
            .into_iter()
            .map(
                |(id, kode, nama, jenjang, kuota, peminat, lulus, reg)| DistribusiProdiStat {
                    prodi_id: id,
                    kode_prodi: kode,
                    nama_prodi: nama,
                    jenjang,
                    kuota,
                    total_peminat: peminat,
                    total_lulus: lulus,
                    total_daftar_ulang: reg,
                },
            )
            .collect();

        // 4. Distribusi Jalur Masuk
        let jalur_rows: Vec<(Uuid, String, i64, i64)> = sqlx::query_as(
            "SELECT
                jm.id,
                jm.nama_jalur,
                COALESCE(COUNT(p.id), 0) as total_pendaftar,
                COALESCE(COUNT(CASE WHEN h.status_kelulusan LIKE 'LULUS%' THEN 1 END), 0) as total_lulus
             FROM jalur_masuk jm
             LEFT JOIN pendaftar p ON p.jalur_id = jm.id
                AND ($1::uuid IS NULL OR p.gelombang_id = $1)
                AND ($2::timestamptz IS NULL OR p.created_at >= $2)
                AND ($3::timestamptz IS NULL OR p.created_at <= $3)
             LEFT JOIN hasil_kelulusan h ON h.pendaftar_id = p.id
             GROUP BY jm.id, jm.nama_jalur
             ORDER BY jm.nama_jalur ASC",
        )
        .bind(filter.gelombang_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_all(&self.pool)
        .await?;

        let distribusi_jalur = jalur_rows
            .into_iter()
            .map(|(id, nama, pendaftar, lulus)| DistribusiJalurStat {
                jalur_id: id,
                nama_jalur: nama,
                total_pendaftar: pendaftar,
                total_lulus: lulus,
            })
            .collect();

        // 5. Status Pendaftaran Breakdown
        let status_rows: Vec<(String, i64)> = sqlx::query_as(
            "SELECT
                p.status_pendaftaran,
                COUNT(p.id) as jumlah
             FROM pendaftar p
             WHERE ($1::uuid IS NULL OR p.gelombang_id = $1)
               AND ($2::uuid IS NULL OR p.jalur_id = $2)
               AND ($3::timestamptz IS NULL OR p.created_at >= $3)
               AND ($4::timestamptz IS NULL OR p.created_at <= $4)
             GROUP BY p.status_pendaftaran
             ORDER BY jumlah DESC",
        )
        .bind(filter.gelombang_id)
        .bind(filter.jalur_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_all(&self.pool)
        .await?;

        let total_status: i64 = status_rows.iter().map(|(_, c)| *c).sum();
        let status_pendaftaran = status_rows
            .into_iter()
            .map(|(status, count)| {
                let pct = if total_status > 0 {
                    (count as f64 / total_status as f64) * 100.0
                } else {
                    0.0
                };
                let label = match status.as_str() {
                    "DRAFT" => "Draf Pengisian",
                    "MENUNGGU_PEMBAYARAN" => "Menunggu Pembayaran",
                    "PEMBAYARAN_DITERIMA" => "Pembayaran Diterima",
                    "SUBMITTED" => "Formulir Dikirim",
                    "DALAM_VERIFIKASI" => "Pemeriksaan Dokumen",
                    "TERVERIFIKASI" => "Dokumen Terverifikasi",
                    "LULUS" => "Lulus Seleksi",
                    "TIDAK_LULUS" => "Tidak Lulus",
                    "DAFTAR_ULANG" => "Daftar Ulang Selesai",
                    _ => &status,
                }
                .to_string();

                StatusPendaftaranStat {
                    status,
                    label,
                    jumlah: count,
                    persentase: (pct * 10.0).round() / 10.0,
                }
            })
            .collect();

        // 6. Funnel
        let funnel_tahapan = vec![
            FunnelStat {
                tahapan: "1. Pembuatan Formulir".to_string(),
                jumlah: total_pendaftar.0,
            },
            FunnelStat {
                tahapan: "2. Berkas Terverifikasi".to_string(),
                jumlah: total_berkas.0,
            },
            FunnelStat {
                tahapan: "3. Mengikuti Ujian CBT".to_string(),
                jumlah: total_ujian.0,
            },
            FunnelStat {
                tahapan: "4. Lulus Seleksi".to_string(),
                jumlah: total_lulus.0,
            },
            FunnelStat {
                tahapan: "5. Resmi Mahasiswa (NIM)".to_string(),
                jumlah: total_nim.0,
            },
        ];

        Ok(ExecutiveDashboardResponse {
            total_pendaftar: total_pendaftar.0,
            total_berkas_diverifikasi: total_berkas.0,
            total_peserta_ujian: total_ujian.0,
            total_lulus: total_lulus.0,
            total_registrasi_nim: total_nim.0,
            total_pendapatan_rupiah: total_dana_lunas.0,
            total_piutang_rupiah: total_dana_piutang.0,
            tren_harian,
            distribusi_prodi,
            distribusi_jalur,
            status_pendaftaran,
            funnel_tahapan,
        })
    }

    // =========================================================================
    // EXCEL / CSV EXPORT
    // =========================================================================

    pub async fn export_excel_dashboard(
        &self,
        filter: &DashboardFilterQuery,
    ) -> Result<Vec<u8>, AppError> {
        let stats = self.get_executive_dashboard(filter).await?;

        // Menggunakan UTF-8 BOM (\u{FEFF}) agar file CSV dibuka langsung dengan benar di Microsoft Excel
        let mut csv_data = String::from("\u{FEFF}");

        csv_data.push_str("LAPORAN EKSEKUTIF PMB - UNIVERSITAS PIGNATELLI TRIPUTRA\n");
        csv_data.push_str(&format!(
            "Waktu Unduh: {}\n\n",
            Utc::now().format("%d-%m-%Y %H:%M:%S UTC")
        ));

        // 1. KPI UTAMA
        csv_data.push_str("=== RINGKASAN METRIK UTAMA ===\n");
        csv_data.push_str("Indikator,Nilai\n");
        csv_data.push_str(&format!("Total Pendaftar,{}\n", stats.total_pendaftar));
        csv_data.push_str(&format!(
            "Total Berkas Terverifikasi,{}\n",
            stats.total_berkas_diverifikasi
        ));
        csv_data.push_str(&format!(
            "Total Peserta Ujian CBT,{}\n",
            stats.total_peserta_ujian
        ));
        csv_data.push_str(&format!("Total Lulus Seleksi,{}\n", stats.total_lulus));
        csv_data.push_str(&format!(
            "Total Mahasiswa Baru (NIM),{}\n",
            stats.total_registrasi_nim
        ));
        csv_data.push_str(&format!(
            "Total Pendapatan Terkumpul (IDR),Rp {}\n",
            stats.total_pendapatan_rupiah
        ));
        csv_data.push_str(&format!(
            "Total Piutang Berjalan (IDR),Rp {}\n\n",
            stats.total_piutang_rupiah
        ));

        // 2. PROGRAM STUDI & KUOTA
        csv_data.push_str("=== DISTRIBUSI PROGRAM STUDI & KUOTA ===\n");
        csv_data.push_str("Kode,Program Studi,Jenjang,Kuota,Peminat,Lulus,Daftar Ulang\n");
        for p in &stats.distribusi_prodi {
            csv_data.push_str(&format!(
                "\"{}\",\"{}\",\"{}\",{},{},{},{}\n",
                p.kode_prodi,
                p.nama_prodi,
                p.jenjang,
                p.kuota,
                p.total_peminat,
                p.total_lulus,
                p.total_daftar_ulang
            ));
        }
        csv_data.push('\n');

        // 3. JALUR PENERIMAAN
        csv_data.push_str("=== DISTRIBUSI JALUR MASUK ===\n");
        csv_data.push_str("Jalur Masuk,Total Pendaftar,Total Lulus\n");
        for j in &stats.distribusi_jalur {
            csv_data.push_str(&format!(
                "\"{}\",{},{}\n",
                j.nama_jalur, j.total_pendaftar, j.total_lulus
            ));
        }
        csv_data.push('\n');

        // 4. STATUS PENDAFTARAN
        csv_data.push_str("=== STATUS TAHAPAN PENDAFTARAN ===\n");
        csv_data.push_str("Status,Label,Jumlah,Persentase (%)\n");
        for s in &stats.status_pendaftaran {
            csv_data.push_str(&format!(
                "\"{}\",\"{}\",{},{}%\n",
                s.status, s.label, s.jumlah, s.persentase
            ));
        }
        csv_data.push('\n');

        // 5. TREN HARIAN
        csv_data.push_str("=== TREN PENDAFTARAN HARIAN (14 HARI TERAKHIR) ===\n");
        csv_data.push_str("Tanggal,Pendaftar Baru,Berkas Valid,Pembayaran Lunas\n");
        for t in &stats.tren_harian {
            csv_data.push_str(&format!(
                "{},{},{},{}\n",
                t.tanggal, t.pendaftar, t.terverifikasi, t.bayar
            ));
        }

        Ok(csv_data.into_bytes())
    }
}

fn parse_date_filters(
    start_str: Option<&str>,
    end_str: Option<&str>,
) -> (Option<DateTime<Utc>>, Option<DateTime<Utc>>) {
    let start_dt = start_str.and_then(|s| {
        DateTime::parse_from_rfc3339(s)
            .map(|dt| dt.with_timezone(&Utc))
            .ok()
            .or_else(|| {
                NaiveDate::parse_from_str(s, "%Y-%m-%d")
                    .ok()
                    .and_then(|nd| nd.and_hms_opt(0, 0, 0))
                    .map(|ndt| Utc.from_utc_datetime(&ndt))
            })
    });

    let end_dt = end_str.and_then(|s| {
        DateTime::parse_from_rfc3339(s)
            .map(|dt| dt.with_timezone(&Utc))
            .ok()
            .or_else(|| {
                NaiveDate::parse_from_str(s, "%Y-%m-%d")
                    .ok()
                    .and_then(|nd| nd.and_hms_opt(23, 59, 59))
                    .map(|ndt| Utc.from_utc_datetime(&ndt))
            })
    });

    (start_dt, end_dt)
}
