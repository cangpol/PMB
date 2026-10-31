use chrono::Utc;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::{
        kelulusan::{dto::HasilKelulusanResponse, repository::KelulusanRepository},
        master::repository::MasterRepository,
        pendaftaran::repository::PendaftaranRepository,
    },
};

// ==============================================================================
// Logika Bisnis Murni: Algoritma Seleksi & Generator NIM
// ==============================================================================

pub fn hitung_skor_gabungan(skor_tes: f64, nilai_rapor: f64) -> f64 {
    // Bobot: 60% Tes Potensi Akademik / CBT, 40% Rata-rata Rapor SMA/SMK
    (skor_tes * 0.6) + (nilai_rapor * 0.4)
}

pub fn generate_nim_resmi(
    tahun_dua_digit: i32,
    kode_fakultas: &str,
    kode_prodi: &str,
    sequence: i64,
) -> String {
    format!(
        "{:02}{:0>2}{:0>2}{:04}",
        tahun_dua_digit % 100,
        kode_fakultas,
        kode_prodi,
        sequence
    )
}

pub fn generate_nomor_loa(tahun: i32, sequence: i64) -> String {
    format!("SK/PMB-UPT/{}/{:04}", tahun, sequence)
}

pub fn evaluasi_kelulusan_pendaftar(
    skor_akhir: f64,
    passing_prodi_1: f64,
    kuota_tersedia_1: i32,
    passing_prodi_2: Option<f64>,
    kuota_tersedia_2: i32,
) -> (&'static str, Option<usize>) {
    if skor_akhir >= passing_prodi_1 && kuota_tersedia_1 > 0 {
        ("LULUS_PILIHAN_1", Some(1))
    } else if let Some(p2_pass) = passing_prodi_2 {
        if skor_akhir >= p2_pass && kuota_tersedia_2 > 0 {
            ("LULUS_PILIHAN_2", Some(2))
        } else if skor_akhir >= (passing_prodi_1 - 5.0) {
            ("CADANGAN", None)
        } else {
            ("TIDAK_LULUS", None)
        }
    } else if skor_akhir >= (passing_prodi_1 - 5.0) {
        ("CADANGAN", None)
    } else {
        ("TIDAK_LULUS", None)
    }
}

// ==============================================================================
// Service Layer
// ==============================================================================

#[derive(Clone)]
pub struct KelulusanService {
    repo: KelulusanRepository,
    pendaftar_repo: PendaftaranRepository,
    master_repo: MasterRepository,
}

impl KelulusanService {
    pub fn new(
        repo: KelulusanRepository,
        pendaftar_repo: PendaftaranRepository,
        master_repo: MasterRepository,
    ) -> Self {
        Self {
            repo,
            pendaftar_repo,
            master_repo,
        }
    }

    pub async fn get_my_kelulusan(
        &self,
        user_id: Uuid,
    ) -> Result<HasilKelulusanResponse, AppError> {
        let pendaftar = self
            .pendaftar_repo
            .find_by_user_id(user_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Belum ada formulir pendaftaran untuk akun ini".to_string())
            })?;

        let hasil = self
            .repo
            .find_by_pendaftar_id(pendaftar.id)
            .await?
            .ok_or_else(|| AppError::NotFound("Hasil seleksi belum diumumkan".to_string()))?;

        let mut nama_prodi = None;
        let mut jenjang = None;
        let mut fakultas = None;

        if let Some(pid) = hasil.prodi_diterima_id {
            if let Ok(Some(p)) = self.master_repo.get_prodi_by_id(pid).await {
                nama_prodi = Some(p.nama_prodi);
                jenjang = Some(p.jenjang);
                fakultas = Some(p.fakultas);
            }
        }

        Ok(HasilKelulusanResponse {
            id: hasil.id,
            pendaftar_id: hasil.pendaftar_id,
            nomor_pendaftaran: pendaftar.nomor_pendaftaran,
            nama_lengkap: "Calon Mahasiswa".to_string(),
            status_kelulusan: hasil.status_kelulusan,
            prodi_diterima_id: hasil.prodi_diterima_id,
            nama_prodi_diterima: nama_prodi,
            jenjang_diterima: jenjang,
            fakultas_diterima: fakultas,
            skor_akhir: hasil.skor_akhir,
            nim_resmi: hasil.nim_resmi,
            nomor_surat_loa: hasil.nomor_surat_loa,
            tanggal_sk: hasil.tanggal_sk,
            is_published: hasil.is_published,
        })
    }

    pub async fn proses_seleksi_massal(&self) -> Result<usize, AppError> {
        let pendaftar_list = self.pendaftar_repo.list_all_pendaftar().await?;
        let mut total_diproses = 0;

        for (idx, p) in pendaftar_list.into_iter().enumerate() {
            let skor_akhir = hitung_skor_gabungan(75.0, p.nilai_rapor_avg);
            let prodi1 = self.master_repo.get_prodi_by_id(p.prodi_pilihan_1).await?;

            if let Some(p1) = prodi1 {
                let seq = (idx + 1) as i64;
                let nim = generate_nim_resmi(26, &p1.kode_fakultas, &p1.kode_prodi, seq);
                let loa = generate_nomor_loa(2026, seq);
                let today = Utc::now().date_naive();

                self.repo
                    .upsert_kelulusan(
                        p.id,
                        "LULUS_PILIHAN_1",
                        Some(p1.id),
                        skor_akhir,
                        Some(&nim),
                        Some(&loa),
                        Some(today),
                    )
                    .await?;

                total_diproses += 1;
            }
        }

        Ok(total_diproses)
    }

    pub async fn list_all(&self) -> Result<Vec<HasilKelulusanResponse>, AppError> {
        let list = self.repo.list_all().await?;
        let mut results = Vec::new();

        for h in list {
            let mut nama_prodi = None;
            let mut jenjang = None;
            let mut fakultas = None;

            if let Some(pid) = h.prodi_diterima_id {
                if let Ok(Some(p)) = self.master_repo.get_prodi_by_id(pid).await {
                    nama_prodi = Some(p.nama_prodi);
                    jenjang = Some(p.jenjang);
                    fakultas = Some(p.fakultas);
                }
            }

            results.push(HasilKelulusanResponse {
                id: h.id,
                pendaftar_id: h.pendaftar_id,
                nomor_pendaftaran: "PMB-2026".to_string(),
                nama_lengkap: "Pendaftar".to_string(),
                status_kelulusan: h.status_kelulusan,
                prodi_diterima_id: h.prodi_diterima_id,
                nama_prodi_diterima: nama_prodi,
                jenjang_diterima: jenjang,
                fakultas_diterima: fakultas,
                skor_akhir: h.skor_akhir,
                nim_resmi: h.nim_resmi,
                nomor_surat_loa: h.nomor_surat_loa,
                tanggal_sk: h.tanggal_sk,
                is_published: h.is_published,
            });
        }

        Ok(results)
    }
}

// ==============================================================================
// Unit Test Logika Bisnis Seleksi Kelulusan & Generate NIM
// ==============================================================================
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_nim_resmi_format() {
        // Tahun 2026 (26), Fak 01, Prodi 02, Sequence 1 -> "2601020001"
        let nim = generate_nim_resmi(2026, "01", "02", 1);
        assert_eq!(nim, "2601020001");
        assert_eq!(nim.len(), 10);

        // Sequence 9999 -> "2601029999"
        let nim_large = generate_nim_resmi(2026, "01", "02", 9999);
        assert_eq!(nim_large, "2601029999");
    }

    #[test]
    fn test_generate_nomor_loa() {
        let loa = generate_nomor_loa(2026, 15);
        assert_eq!(loa, "SK/PMB-UPT/2026/0015");
    }

    #[test]
    fn test_evaluasi_kelulusan_lulus_pilihan_1() {
        let skor_akhir = 85.0;
        let passing_1 = 70.0;
        let kuota_1 = 30;

        let (status, pilihan) =
            evaluasi_kelulusan_pendaftar(skor_akhir, passing_1, kuota_1, Some(65.0), 30);
        assert_eq!(status, "LULUS_PILIHAN_1");
        assert_eq!(pilihan, Some(1));
    }

    #[test]
    fn test_evaluasi_kelulusan_lempar_ke_pilihan_2() {
        let skor_akhir = 68.0;
        let passing_1 = 75.0; // Tidak tembus pilihan 1
        let passing_2 = 65.0; // Tembus pilihan 2
        let kuota_2 = 10;

        let (status, pilihan) =
            evaluasi_kelulusan_pendaftar(skor_akhir, passing_1, 10, Some(passing_2), kuota_2);
        assert_eq!(status, "LULUS_PILIHAN_2");
        assert_eq!(pilihan, Some(2));
    }

    #[test]
    fn test_evaluasi_kelulusan_cadangan() {
        let skor_akhir = 67.0;
        let passing_1 = 70.0; // Margin -3 dari passing score -> CADANGAN

        let (status, pilihan) = evaluasi_kelulusan_pendaftar(skor_akhir, passing_1, 10, None, 0);
        assert_eq!(status, "CADANGAN");
        assert_eq!(pilihan, None);
    }
}
