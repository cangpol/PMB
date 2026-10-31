use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::{
        dashboard::dto::{
            AdminDashboardResponse, CalonDashboardResponse, FunnelStat, ProdiStat, StepperStep,
        },
        pendaftaran::repository::PendaftaranRepository,
    },
};

#[derive(Clone)]
pub struct DashboardService {
    pool: PgPool,
    pendaftar_repo: PendaftaranRepository,
}

impl DashboardService {
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

        let total_dana: (i64,) = sqlx::query_as("SELECT COALESCE(SUM(nominal_akhir), 0) FROM pembayaran WHERE status_pembayaran = 'LUNAS'")
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
                jumlah: total_pendaftar.0 + 10,
            },
            FunnelStat {
                tahapan: "2. Formulir Terisi".to_string(),
                jumlah: total_pendaftar.0,
            },
            FunnelStat {
                tahapan: "3. Berkas Lengkap".to_string(),
                jumlah: total_berkas.0,
            },
            FunnelStat {
                tahapan: "4. Lulus Seleksi".to_string(),
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
}
