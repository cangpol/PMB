use chrono::{Duration, Utc};
use std::collections::HashMap;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::ujian::{
        dto::{HasilUjianResponse, MulaiUjianResponse, SoalPublicResponse, SubmitUjianRequest},
        model::SoalUjian,
        repository::UjianRepository,
    },
};

// ==============================================================================
// Logika Bisnis Murni: Kalkulasi Skor Ujian
// ==============================================================================

pub fn kalkulasi_skor_cbt(
    soal_list: &[SoalUjian],
    jawaban_user: &HashMap<String, String>,
) -> (f64, usize, usize) {
    let mut total_bobot = 0.0;
    let mut bobot_benar = 0.0;
    let mut jumlah_benar = 0;

    for s in soal_list {
        total_bobot += s.bobot;
        if let Some(jwb) = jawaban_user.get(&s.id.to_string()) {
            if jwb.trim().eq_ignore_ascii_case(&s.kunci_jawaban) {
                bobot_benar += s.bobot;
                jumlah_benar += 1;
            }
        }
    }

    let skor = if total_bobot > 0.0 {
        (bobot_benar / total_bobot) * 100.0
    } else {
        0.0
    };

    (skor, jumlah_benar, soal_list.len())
}

// ==============================================================================
// Service Layer
// ==============================================================================

#[derive(Clone)]
pub struct UjianService {
    repo: UjianRepository,
}

impl UjianService {
    pub fn new(repo: UjianRepository) -> Self {
        Self { repo }
    }

    pub async fn mulai_ujian(&self, pendaftar_id: Uuid) -> Result<MulaiUjianResponse, AppError> {
        let ujian = self.repo.get_active_ujian().await?.ok_or_else(|| {
            AppError::NotFound("Tidak ada modul tes CBT yang aktif saat ini".to_string())
        })?;

        // Cek apakah peserta sudah pernah mengambil tes
        if let Some(existing) = self.repo.get_peserta_by_pendaftar(pendaftar_id).await? {
            if existing.waktu_selesai.is_some() {
                return Err(AppError::BadRequest(
                    "Anda telah menyelesaikan ujian seleksi ini. Ujian hanya dapat diambil satu kali".to_string(),
                ));
            }
        }

        let peserta = self
            .repo
            .create_peserta_mulai(pendaftar_id, ujian.id)
            .await?;
        let soal_raw = self.repo.get_soal_by_ujian(ujian.id).await?;

        let daftar_soal = soal_raw
            .into_iter()
            .map(|s| SoalPublicResponse {
                id: s.id,
                nomor_urut: s.nomor_urut,
                pertanyaan: s.pertanyaan,
                pilihan_a: s.pilihan_a,
                pilihan_b: s.pilihan_b,
                pilihan_c: s.pilihan_c,
                pilihan_d: s.pilihan_d,
            })
            .collect();

        let waktu_mulai = peserta.waktu_mulai.unwrap_or_else(Utc::now);
        let batas_waktu_selesai = waktu_mulai + Duration::minutes(ujian.durasi_menit as i64);

        Ok(MulaiUjianResponse {
            peserta_ujian_id: peserta.id,
            ujian_id: ujian.id,
            judul: ujian.judul,
            durasi_menit: ujian.durasi_menit,
            waktu_mulai,
            batas_waktu_selesai,
            daftar_soal,
        })
    }

    pub async fn submit_ujian(
        &self,
        req: SubmitUjianRequest,
    ) -> Result<HasilUjianResponse, AppError> {
        let peserta = self
            .repo
            .find_peserta_by_id(req.peserta_ujian_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Data sesi ujian tidak ditemukan".to_string()))?;

        if peserta.waktu_selesai.is_some() {
            return Err(AppError::BadRequest(
                "Ujian ini sudah pernah disubmit".to_string(),
            ));
        }

        let ujian = self
            .repo
            .get_active_ujian()
            .await?
            .ok_or_else(|| AppError::NotFound("Data ujian tidak ditemukan".to_string()))?;

        let soal_list = self.repo.get_soal_by_ujian(ujian.id).await?;
        let (skor, benar, total) = kalkulasi_skor_cbt(&soal_list, &req.jawaban);
        let is_lulus = skor >= ujian.passing_grade;

        let json_str = serde_json::to_string(&req.jawaban).unwrap_or_else(|_| "{}".to_string());
        self.repo
            .update_hasil_ujian(peserta.id, skor, is_lulus, &json_str)
            .await?;

        Ok(HasilUjianResponse {
            peserta_ujian_id: peserta.id,
            total_skor: skor,
            is_lulus,
            passing_grade: ujian.passing_grade,
            total_soal: total,
            jumlah_benar: benar,
            waktu_selesai: Utc::now(),
        })
    }
}

// ==============================================================================
// Unit Test Logika Bisnis Penilaian Ujian CBT
// ==============================================================================
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kalkulasi_skor_cbt_sempurna() {
        let q1_id = Uuid::new_v4();
        let q2_id = Uuid::new_v4();

        let soal = vec![
            SoalUjian {
                id: q1_id,
                ujian_id: Uuid::new_v4(),
                nomor_urut: 1,
                pertanyaan: "1 + 1 = ?".to_string(),
                pilihan_a: "2".to_string(),
                pilihan_b: "3".to_string(),
                pilihan_c: "4".to_string(),
                pilihan_d: "5".to_string(),
                kunci_jawaban: "A".to_string(),
                bobot: 1.0,
            },
            SoalUjian {
                id: q2_id,
                ujian_id: Uuid::new_v4(),
                nomor_urut: 2,
                pertanyaan: "Ibukota Indonesia?".to_string(),
                pilihan_a: "Bandung".to_string(),
                pilihan_b: "Nusantara".to_string(),
                pilihan_c: "Surabaya".to_string(),
                pilihan_d: "Medan".to_string(),
                kunci_jawaban: "B".to_string(),
                bobot: 1.0,
            },
        ];

        let mut jawaban = HashMap::new();
        jawaban.insert(q1_id.to_string(), "A".to_string());
        jawaban.insert(q2_id.to_string(), "B".to_string());

        let (skor, benar, total) = kalkulasi_skor_cbt(&soal, &jawaban);
        assert_eq!(skor, 100.0);
        assert_eq!(benar, 2);
        assert_eq!(total, 2);
    }

    #[test]
    fn test_kalkulasi_skor_cbt_sebagian_benar() {
        let q1_id = Uuid::new_v4();
        let q2_id = Uuid::new_v4();

        let soal = vec![
            SoalUjian {
                id: q1_id,
                ujian_id: Uuid::new_v4(),
                nomor_urut: 1,
                pertanyaan: "Soal 1".to_string(),
                pilihan_a: "A".to_string(),
                pilihan_b: "B".to_string(),
                pilihan_c: "C".to_string(),
                pilihan_d: "D".to_string(),
                kunci_jawaban: "A".to_string(),
                bobot: 1.0,
            },
            SoalUjian {
                id: q2_id,
                ujian_id: Uuid::new_v4(),
                nomor_urut: 2,
                pertanyaan: "Soal 2".to_string(),
                pilihan_a: "A".to_string(),
                pilihan_b: "B".to_string(),
                pilihan_c: "C".to_string(),
                pilihan_d: "D".to_string(),
                kunci_jawaban: "C".to_string(),
                bobot: 1.0,
            },
        ];

        let mut jawaban = HashMap::new();
        jawaban.insert(q1_id.to_string(), "A".to_string()); // Benar
        jawaban.insert(q2_id.to_string(), "D".to_string()); // Salah

        let (skor, benar, total) = kalkulasi_skor_cbt(&soal, &jawaban);
        assert_eq!(skor, 50.0);
        assert_eq!(benar, 1);
        assert_eq!(total, 2);
    }
}
