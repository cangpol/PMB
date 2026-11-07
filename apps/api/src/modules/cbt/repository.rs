use chrono::{DateTime, Utc};
use sqlx::{PgPool, Postgres, QueryBuilder};
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::cbt::{
        dto::{CreateSoalRequest, LivePesertaStatusItem},
        model::{BankSoal, HasilUjian, JawabanPeserta, PaketUjian, PesertaSesi, SesiUjian},
    },
};

#[derive(Clone)]
pub struct CbtRepository {
    pub pool: PgPool,
}

impl CbtRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // =========================================================================
    // 1. BANK SOAL
    // =========================================================================

    pub async fn create_soal(&self, req: &CreateSoalRequest) -> Result<BankSoal, AppError> {
        let opsi_json = serde_json::to_value(&req.opsi_jawaban).unwrap_or_default();
        let bobot = req.bobot.unwrap_or(1.0);

        let row = sqlx::query_as::<_, BankSoal>(
            r#"
            INSERT INTO bank_soal 
            (kategori, tingkat_kesulitan, pertanyaan, gambar_url, opsi_jawaban, kunci_jawaban, bobot, pembahasan)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#,
        )
        .bind(&req.kategori)
        .bind(&req.tingkat_kesulitan)
        .bind(&req.pertanyaan)
        .bind(&req.gambar_url)
        .bind(opsi_json)
        .bind(&req.kunci_jawaban)
        .bind(bobot)
        .bind(&req.pembahasan)
        .fetch_one(&self.pool)
        .await?;

        Ok(row)
    }

    pub async fn create_soal_batch(&self, list: &[CreateSoalRequest]) -> Result<usize, AppError> {
        let mut tx = self.pool.begin().await?;
        let mut count = 0;

        for req in list {
            let opsi_json = serde_json::to_value(&req.opsi_jawaban).unwrap_or_default();
            let bobot = req.bobot.unwrap_or(1.0);

            sqlx::query(
                r#"
                INSERT INTO bank_soal 
                (kategori, tingkat_kesulitan, pertanyaan, gambar_url, opsi_jawaban, kunci_jawaban, bobot, pembahasan)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                "#,
            )
            .bind(&req.kategori)
            .bind(&req.tingkat_kesulitan)
            .bind(&req.pertanyaan)
            .bind(&req.gambar_url)
            .bind(opsi_json)
            .bind(&req.kunci_jawaban)
            .bind(bobot)
            .bind(&req.pembahasan)
            .execute(&mut *tx)
            .await?;

            count += 1;
        }

        tx.commit().await?;
        Ok(count)
    }

    pub async fn list_soal(
        &self,
        kategori: Option<&str>,
        kesulitan: Option<&str>,
        q: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<BankSoal>, i64), AppError> {
        let mut count_qb =
            QueryBuilder::<Postgres>::new("SELECT COUNT(*) FROM bank_soal WHERE is_active = true");
        let mut qb =
            QueryBuilder::<Postgres>::new("SELECT * FROM bank_soal WHERE is_active = true");

        if let Some(kat) = kategori {
            count_qb.push(" AND kategori = ").push_bind(kat);
            qb.push(" AND kategori = ").push_bind(kat);
        }

        if let Some(kes) = kesulitan {
            count_qb.push(" AND tingkat_kesulitan = ").push_bind(kes);
            qb.push(" AND tingkat_kesulitan = ").push_bind(kes);
        }

        if let Some(query) = q {
            let pattern = format!("%{}%", query);
            count_qb
                .push(" AND (pertanyaan ILIKE ")
                .push_bind(pattern.clone())
                .push(" OR kategori ILIKE ")
                .push_bind(pattern.clone())
                .push(")");
            qb.push(" AND (pertanyaan ILIKE ")
                .push_bind(pattern.clone())
                .push(" OR kategori ILIKE ")
                .push_bind(pattern)
                .push(")");
        }

        let total: (i64,) = count_qb.build_query_as().fetch_one(&self.pool).await?;

        qb.push(" ORDER BY created_at DESC LIMIT ")
            .push_bind(limit)
            .push(" OFFSET ")
            .push_bind(offset);

        let items: Vec<BankSoal> = qb.build_query_as().fetch_all(&self.pool).await?;
        Ok((items, total.0))
    }

    pub async fn find_soal_by_id(&self, id: Uuid) -> Result<Option<BankSoal>, AppError> {
        let row = sqlx::query_as::<_, BankSoal>("SELECT * FROM bank_soal WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row)
    }

    // =========================================================================
    // 2. PAKET UJIAN
    // =========================================================================

    pub async fn create_paket(
        &self,
        nama: &str,
        deskripsi: Option<&str>,
        durasi: i32,
        passing_grade: f64,
        acak_soal: bool,
        acak_opsi: bool,
        soal_ids: &[Uuid],
    ) -> Result<PaketUjian, AppError> {
        let mut tx = self.pool.begin().await?;

        let paket = sqlx::query_as::<_, PaketUjian>(
            r#"
            INSERT INTO paket_ujian 
            (nama_paket, deskripsi, durasi_menit, passing_grade, total_soal, acak_soal, acak_opsi)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#,
        )
        .bind(nama)
        .bind(deskripsi)
        .bind(durasi)
        .bind(passing_grade)
        .bind(soal_ids.len() as i32)
        .bind(acak_soal)
        .bind(acak_opsi)
        .fetch_one(&mut *tx)
        .await?;

        for (idx, &s_id) in soal_ids.iter().enumerate() {
            sqlx::query(
                "INSERT INTO paket_ujian_soal (paket_id, soal_id, urutan) VALUES ($1, $2, $3)",
            )
            .bind(paket.id)
            .bind(s_id)
            .bind((idx + 1) as i32)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(paket)
    }

    pub async fn list_paket(&self) -> Result<Vec<PaketUjian>, AppError> {
        let rows = sqlx::query_as::<_, PaketUjian>(
            "SELECT * FROM paket_ujian WHERE is_active = true ORDER BY created_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn find_paket_by_id(&self, id: Uuid) -> Result<Option<PaketUjian>, AppError> {
        let row = sqlx::query_as::<_, PaketUjian>("SELECT * FROM paket_ujian WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row)
    }

    pub async fn get_soal_by_paket(&self, paket_id: Uuid) -> Result<Vec<BankSoal>, AppError> {
        let rows = sqlx::query_as::<_, BankSoal>(
            r#"
            SELECT s.*
            FROM bank_soal s
            INNER JOIN paket_ujian_soal ps ON ps.soal_id = s.id
            WHERE ps.paket_id = $1 AND s.is_active = true
            ORDER BY ps.urutan ASC
            "#,
        )
        .bind(paket_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    // =========================================================================
    // 3. SESI UJIAN
    // =========================================================================

    pub async fn create_sesi(
        &self,
        req: &crate::modules::cbt::dto::CreateSesiRequest,
    ) -> Result<SesiUjian, AppError> {
        let row = sqlx::query_as::<_, SesiUjian>(
            r#"
            INSERT INTO sesi_ujian (paket_id, nama_sesi, jadwal_mulai, jadwal_selesai, ruang, kuota,
                                    mode, gelombang_id, jalur_id, is_dibuka_pendaftaran)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(req.paket_id)
        .bind(&req.nama_sesi)
        .bind(req.jadwal_mulai)
        .bind(req.jadwal_selesai)
        .bind(&req.ruang)
        .bind(req.kuota)
        .bind(&req.mode)
        .bind(req.gelombang_id)
        .bind(req.jalur_id)
        .bind(req.is_dibuka_pendaftaran)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    /// Sesi yang bisa dipilih calon: dibuka, belum dimulai, cakupan cocok, beserta jumlah terisi.
    pub async fn list_sesi_tersedia(
        &self,
        gelombang_id: Option<Uuid>,
        jalur_id: Option<Uuid>,
    ) -> Result<Vec<crate::modules::cbt::dto::SesiTersediaItem>, AppError> {
        let rows = sqlx::query_as::<_, crate::modules::cbt::dto::SesiTersediaItem>(
            r#"
            SELECT s.id, s.nama_sesi, s.jadwal_mulai, s.jadwal_selesai, s.mode, s.ruang, s.kuota,
                   (SELECT COUNT(*) FROM peserta_sesi ps WHERE ps.sesi_id = s.id) AS terisi
            FROM sesi_ujian s
            WHERE s.is_dibuka_pendaftaran = TRUE
              -- Masih bisa dipilih selama sesi belum berakhir (sesi online sering dibuka berjam-jam)
              AND s.jadwal_selesai > NOW()
              AND s.status NOT IN ('DIBATALKAN', 'SELESAI')
              AND (s.gelombang_id IS NULL OR $1::uuid IS NULL OR s.gelombang_id = $1)
              AND (s.jalur_id IS NULL OR $2::uuid IS NULL OR s.jalur_id = $2)
            ORDER BY s.jadwal_mulai ASC
            "#,
        )
        .bind(gelombang_id)
        .bind(jalur_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    /// Presensi otomatis untuk sesi ONLINE saat calon menekan "Mulai Ujian".
    pub async fn presensi_online(&self, peserta_sesi_id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE peserta_sesi
             SET status_presensi = 'HADIR', waktu_presensi = NOW(), metode_presensi = 'ONLINE_OTOMATIS',
                 updated_at = NOW()
             WHERE id = $1 AND status_presensi <> 'HADIR'",
        )
        .bind(peserta_sesi_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn list_sesi(&self) -> Result<Vec<SesiUjian>, AppError> {
        let rows =
            sqlx::query_as::<_, SesiUjian>("SELECT * FROM sesi_ujian ORDER BY jadwal_mulai ASC")
                .fetch_all(&self.pool)
                .await?;
        Ok(rows)
    }

    pub async fn find_sesi_by_id(&self, id: Uuid) -> Result<Option<SesiUjian>, AppError> {
        let row = sqlx::query_as::<_, SesiUjian>("SELECT * FROM sesi_ujian WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row)
    }

    pub async fn assign_peserta_to_sesi(
        &self,
        sesi_id: Uuid,
        pendaftar_ids: &[Uuid],
    ) -> Result<usize, AppError> {
        let mut tx = self.pool.begin().await?;
        let mut count = 0;

        for &p_id in pendaftar_ids {
            let p_row: Option<(String,)> =
                sqlx::query_as("SELECT nomor_pendaftaran FROM pendaftar WHERE id = $1")
                    .bind(p_id)
                    .fetch_optional(&mut *tx)
                    .await?;

            let nomor_peserta = p_row.map(|r| r.0).unwrap_or_else(|| {
                format!("CBT-{}", Uuid::new_v4().to_string()[..8].to_uppercase())
            });

            // Pindah sesi: lepas kursi di sesi lain yang belum dikerjakan
            sqlx::query(
                "DELETE FROM peserta_sesi
                 WHERE pendaftar_id = $1 AND sesi_id <> $2 AND status_ujian = 'MENUNGGU'",
            )
            .bind(p_id)
            .bind(sesi_id)
            .execute(&mut *tx)
            .await?;

            let res = sqlx::query(
                r#"
                INSERT INTO peserta_sesi (sesi_id, pendaftar_id, nomor_peserta)
                VALUES ($1, $2, $3)
                ON CONFLICT (sesi_id, pendaftar_id) DO NOTHING
                "#,
            )
            .bind(sesi_id)
            .bind(p_id)
            .bind(&nomor_peserta)
            .execute(&mut *tx)
            .await?;

            sqlx::query(
                "UPDATE pendaftar SET sesi_ujian_id = $1, updated_at = NOW() WHERE id = $2",
            )
            .bind(sesi_id)
            .bind(p_id)
            .execute(&mut *tx)
            .await?;

            if res.rows_affected() > 0 {
                count += 1;
            }
        }

        tx.commit().await?;
        Ok(count)
    }

    // =========================================================================
    // 4. PRESENSI & PENGAMBILAN UJIAN
    // =========================================================================

    pub async fn find_peserta_by_nomor_or_qr(
        &self,
        identifier: &str,
        sesi_id: Option<Uuid>,
    ) -> Result<Option<(PesertaSesi, String, String)>, AppError> {
        // Identifier bisa berupa nomor_peserta, nomor_pendaftaran, atau ID peserta_sesi (UUID)
        let id_clean = identifier.trim();

        let mut qb = QueryBuilder::<Postgres>::new(
            r#"
            SELECT ps.id, ps.sesi_id, ps.pendaftar_id, ps.nomor_peserta, ps.status_presensi,
                   ps.waktu_presensi, ps.metode_presensi, ps.pengawas_id, ps.status_ujian,
                   ps.waktu_mulai, ps.batas_waktu, ps.waktu_selesai, ps.seed_acak,
                   ps.urutan_soal_ids, ps.ip_address, ps.user_agent, ps.created_at, ps.updated_at,
                   u.nama_lengkap AS nama_peserta, s.nama_sesi
            FROM peserta_sesi ps
            INNER JOIN pendaftar p ON p.id = ps.pendaftar_id
            INNER JOIN users u ON u.id = p.user_id
            INNER JOIN sesi_ujian s ON s.id = ps.sesi_id
            WHERE 
            "#,
        );

        if let Ok(parsed_uuid) = Uuid::parse_str(id_clean) {
            qb.push("(ps.id = ")
                .push_bind(parsed_uuid)
                .push(" OR ps.pendaftar_id = ")
                .push_bind(parsed_uuid)
                .push(" OR ps.nomor_peserta = ")
                .push_bind(id_clean)
                .push(" OR p.nomor_pendaftaran = ")
                .push_bind(id_clean)
                .push(")");
        } else {
            qb.push("(ps.nomor_peserta = ")
                .push_bind(id_clean)
                .push(" OR p.nomor_pendaftaran = ")
                .push_bind(id_clean)
                .push(")");
        }

        if let Some(s_id) = sesi_id {
            qb.push(" AND ps.sesi_id = ").push_bind(s_id);
        }

        qb.push(" ORDER BY ps.created_at DESC LIMIT 1");

        let row: Option<PesertaQrLookupRow> =
            qb.build_query_as().fetch_optional(&self.pool).await?;

        if let Some(r) = row {
            let peserta = PesertaSesi {
                id: r.id,
                sesi_id: r.sesi_id,
                pendaftar_id: r.pendaftar_id,
                nomor_peserta: r.nomor_peserta,
                status_presensi: r.status_presensi,
                waktu_presensi: r.waktu_presensi,
                metode_presensi: r.metode_presensi,
                pengawas_id: r.pengawas_id,
                status_ujian: r.status_ujian,
                waktu_mulai: r.waktu_mulai,
                batas_waktu: r.batas_waktu,
                waktu_selesai: r.waktu_selesai,
                seed_acak: r.seed_acak,
                urutan_soal_ids: r.urutan_soal_ids,
                ip_address: r.ip_address,
                user_agent: r.user_agent,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            Ok(Some((peserta, r.nama_peserta, r.nama_sesi)))
        } else {
            Ok(None)
        }
    }

    pub async fn record_presensi(
        &self,
        peserta_id: Uuid,
        pengawas_id: Option<Uuid>,
        metode: &str,
    ) -> Result<PesertaSesi, AppError> {
        let row = sqlx::query_as::<_, PesertaSesi>(
            r#"
            UPDATE peserta_sesi
            SET status_presensi = 'HADIR',
                waktu_presensi = NOW(),
                metode_presensi = $2,
                pengawas_id = $3,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(peserta_id)
        .bind(metode)
        .bind(pengawas_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    // =========================================================================
    // 5. EKSEKUSI MESIN UJIAN CALON
    // =========================================================================

    pub async fn find_active_session_for_pendaftar(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Option<PesertaSesi>, AppError> {
        let row = sqlx::query_as::<_, PesertaSesi>(
            r#"
            SELECT * FROM peserta_sesi 
            WHERE pendaftar_id = $1 AND status_ujian = 'SEDANG_MENGERJAKAN'
            LIMIT 1
            "#,
        )
        .bind(pendaftar_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn find_latest_session_for_pendaftar(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Option<PesertaSesi>, AppError> {
        let row = sqlx::query_as::<_, PesertaSesi>(
            r#"
            SELECT * FROM peserta_sesi 
            WHERE pendaftar_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1
            "#,
        )
        .bind(pendaftar_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn find_peserta_by_id(&self, id: Uuid) -> Result<Option<PesertaSesi>, AppError> {
        let row = sqlx::query_as::<_, PesertaSesi>("SELECT * FROM peserta_sesi WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row)
    }

    pub async fn start_peserta_session(
        &self,
        peserta_id: Uuid,
        batas_waktu: DateTime<Utc>,
        seed_acak: i64,
        urutan_soal_ids: serde_json::Value,
        ip: Option<&str>,
        ua: Option<&str>,
    ) -> Result<PesertaSesi, AppError> {
        let row = sqlx::query_as::<_, PesertaSesi>(
            r#"
            UPDATE peserta_sesi
            SET status_ujian = 'SEDANG_MENGERJAKAN',
                waktu_mulai = NOW(),
                batas_waktu = $2,
                seed_acak = $3,
                urutan_soal_ids = $4,
                ip_address = $5,
                user_agent = $6,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(peserta_id)
        .bind(batas_waktu)
        .bind(seed_acak)
        .bind(urutan_soal_ids)
        .bind(ip)
        .bind(ua)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn insert_pelanggaran(
        &self,
        peserta_sesi_id: Uuid,
        jenis: &str,
        detail: Option<&str>,
        ip: Option<&str>,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO pelanggaran_ujian (peserta_sesi_id, jenis, detail, ip_address) VALUES ($1, $2, $3, $4)",
        )
        .bind(peserta_sesi_id)
        .bind(jenis)
        .bind(detail)
        .bind(ip)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn count_pelanggaran(&self, peserta_sesi_id: Uuid) -> Result<i64, AppError> {
        let n: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM pelanggaran_ujian WHERE peserta_sesi_id = $1")
                .bind(peserta_sesi_id)
                .fetch_one(&self.pool)
                .await?;
        Ok(n)
    }

    pub async fn autosave_jawaban(
        &self,
        peserta_sesi_id: Uuid,
        soal_id: Uuid,
        pilihan: Option<&str>,
        ragu: bool,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO jawaban_peserta (peserta_sesi_id, soal_id, pilihan_jawaban, ragu_ragu, waktu_dijawab)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (peserta_sesi_id, soal_id)
            DO UPDATE SET 
                pilihan_jawaban = EXCLUDED.pilihan_jawaban,
                ragu_ragu = EXCLUDED.ragu_ragu,
                waktu_dijawab = NOW()
            "#,
        )
        .bind(peserta_sesi_id)
        .bind(soal_id)
        .bind(pilihan)
        .bind(ragu)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_jawaban_peserta(
        &self,
        peserta_sesi_id: Uuid,
    ) -> Result<Vec<JawabanPeserta>, AppError> {
        let rows = sqlx::query_as::<_, JawabanPeserta>(
            "SELECT * FROM jawaban_peserta WHERE peserta_sesi_id = $1",
        )
        .bind(peserta_sesi_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn finish_peserta_session(
        &self,
        peserta_id: Uuid,
        status: &str, // 'SELESAI' or 'WAKTU_HABIS'
    ) -> Result<PesertaSesi, AppError> {
        let row = sqlx::query_as::<_, PesertaSesi>(
            r#"
            UPDATE peserta_sesi
            SET status_ujian = $2,
                waktu_selesai = NOW(),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(peserta_id)
        .bind(status)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn save_hasil_ujian(
        &self,
        peserta_sesi_id: Uuid,
        pendaftar_id: Uuid,
        total_soal: i32,
        total_dijawab: i32,
        benar: i32,
        salah: i32,
        kosong: i32,
        nilai: f64,
        is_lulus: bool,
        kategori_json: serde_json::Value,
    ) -> Result<HasilUjian, AppError> {
        let mut tx = self.pool.begin().await?;

        let row = sqlx::query_as::<_, HasilUjian>(
            r#"
            INSERT INTO hasil_ujian 
            (peserta_sesi_id, pendaftar_id, total_soal, total_dijawab, jumlah_benar, jumlah_salah, jumlah_kosong, nilai_akhir, is_lulus, kategori_nilai)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (peserta_sesi_id) DO UPDATE SET
                total_soal = EXCLUDED.total_soal,
                total_dijawab = EXCLUDED.total_dijawab,
                jumlah_benar = EXCLUDED.jumlah_benar,
                jumlah_salah = EXCLUDED.jumlah_salah,
                jumlah_kosong = EXCLUDED.jumlah_kosong,
                nilai_akhir = EXCLUDED.nilai_akhir,
                is_lulus = EXCLUDED.is_lulus,
                kategori_nilai = EXCLUDED.kategori_nilai,
                waktu_submit = NOW()
            RETURNING *
            "#,
        )
        .bind(peserta_sesi_id)
        .bind(pendaftar_id)
        .bind(total_soal)
        .bind(total_dijawab)
        .bind(benar)
        .bind(salah)
        .bind(kosong)
        .bind(nilai)
        .bind(is_lulus)
        .bind(kategori_json)
        .fetch_one(&mut *tx)
        .await?;

        // Setelah CBT selesai peserta berhenti di MENUNGGU_UJIAN:
        // - memenuhi passing grade -> peserta menekan tombol "Lanjut" (`lanjut_setelah_cbt`)
        // - di bawah passing grade -> tertahan sampai admin memutuskan ujian ulang / persetujuan
        sqlx::query(
            "UPDATE pendaftar SET status_pendaftaran = 'MENUNGGU_UJIAN', updated_at = NOW() WHERE id = $1",
        )
        .bind(pendaftar_id)
        .execute(&mut *tx)
        .await?;

        // Tandai langkah ujian SELESAI pada state_langkah_pendaftar
        sqlx::query(
            r#"
            INSERT INTO state_langkah_pendaftar (pendaftar_id, langkah_id, status, selesai_at)
            SELECT $1, dl.id, 'SELESAI', NOW()
            FROM definisi_langkah dl
            WHERE dl.tipe_langkah = 'ujian' AND dl.is_active = TRUE
            ON CONFLICT (pendaftar_id, langkah_id) DO UPDATE
            SET status = 'SELESAI', selesai_at = NOW(), updated_at = NOW()
            "#,
        )
        .bind(pendaftar_id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(row)
    }

    /// Riwayat pengerjaan CBT seorang calon, terbaru di atas.
    pub async fn list_riwayat_pendaftar(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Vec<crate::modules::cbt::dto::RiwayatCbtItem>, AppError> {
        let rows = sqlx::query_as::<_, crate::modules::cbt::dto::RiwayatCbtItem>(
            r#"
            SELECT ps.id AS peserta_sesi_id,
                   s.nama_sesi, pu.nama_paket, s.mode, s.ruang, ps.nomor_peserta,
                   s.jadwal_mulai, s.jadwal_selesai,
                   ps.status_ujian, ps.status_presensi,
                   ps.waktu_mulai,
                   COALESCE(h.waktu_submit, ps.waktu_selesai) AS waktu_selesai,
                   EXTRACT(EPOCH FROM (COALESCE(h.waktu_submit, ps.waktu_selesai) - ps.waktu_mulai))::bigint
                       AS durasi_detik,
                   h.total_soal, h.jumlah_benar, h.jumlah_salah, h.jumlah_kosong,
                   h.nilai_akhir, pu.passing_grade, h.is_lulus,
                   (SELECT COUNT(*) FROM pelanggaran_ujian pl WHERE pl.peserta_sesi_id = ps.id)
                       AS jumlah_pelanggaran
            FROM peserta_sesi ps
            JOIN sesi_ujian s ON s.id = ps.sesi_id
            JOIN paket_ujian pu ON pu.id = s.paket_id
            LEFT JOIN hasil_ujian h ON h.peserta_sesi_id = ps.id
            WHERE ps.pendaftar_id = $1
            ORDER BY COALESCE(ps.waktu_mulai, s.jadwal_mulai) DESC
            "#,
        )
        .bind(pendaftar_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn get_hasil_by_pendaftar(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Option<HasilUjian>, AppError> {
        let row = sqlx::query_as::<_, HasilUjian>(
            "SELECT * FROM hasil_ujian WHERE pendaftar_id = $1 ORDER BY waktu_submit DESC LIMIT 1",
        )
        .bind(pendaftar_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    // =========================================================================
    // 6. MONITORING REAL-TIME PENGAWAS (SSE)
    // =========================================================================

    #[allow(clippy::type_complexity)]
    pub async fn get_sesi_live_snapshot(
        &self,
        sesi_id: Uuid,
    ) -> Result<Vec<LivePesertaStatusItem>, AppError> {
        let now = Utc::now();

        let rows: Vec<(
            Uuid, Uuid, String, String, String, String,
            Option<i64>, Option<DateTime<Utc>>, Option<DateTime<Utc>>,
            Option<DateTime<Utc>>, Option<DateTime<Utc>>, Option<f64>, Option<bool>
        )> = sqlx::query_as(
            r#"
            SELECT ps.id, ps.pendaftar_id, ps.nomor_peserta, u.nama_lengkap,
                   ps.status_presensi, ps.status_ujian,
                   COUNT(jp.id) FILTER (WHERE jp.pilihan_jawaban IS NOT NULL AND jp.pilihan_jawaban <> '') AS soal_terjawab,
                   ps.waktu_mulai, ps.batas_waktu, ps.waktu_selesai,
                   h.waktu_submit, h.nilai_akhir, h.is_lulus
            FROM peserta_sesi ps
            INNER JOIN pendaftar p ON p.id = ps.pendaftar_id
            INNER JOIN users u ON u.id = p.user_id
            LEFT JOIN jawaban_peserta jp ON jp.peserta_sesi_id = ps.id
            LEFT JOIN hasil_ujian h ON h.peserta_sesi_id = ps.id
            WHERE ps.sesi_id = $1
            GROUP BY ps.id, ps.pendaftar_id, ps.nomor_peserta, u.nama_lengkap,
                     ps.status_presensi, ps.status_ujian, ps.waktu_mulai,
                     ps.batas_waktu, ps.waktu_selesai, h.waktu_submit,
                     h.nilai_akhir, h.is_lulus
            ORDER BY ps.nomor_peserta ASC
            "#,
        )
        .bind(sesi_id)
        .fetch_all(&self.pool)
        .await?;

        // Ambil total soal dari paket sesi
        let total_soal: i64 = sqlx::query_scalar(
            r#"
            SELECT pu.total_soal::bigint
            FROM sesi_ujian s
            INNER JOIN paket_ujian pu ON pu.id = s.paket_id
            WHERE s.id = $1
            "#,
        )
        .bind(sesi_id)
        .fetch_optional(&self.pool)
        .await?
        .unwrap_or(0);

        let mut items = Vec::new();
        for r in rows {
            let sisa_detik = if let Some(bw) = r.8 {
                if r.5 == "SEDANG_MENGERJAKAN" {
                    let diff = (bw - now).num_seconds();
                    if diff > 0 { diff } else { 0 }
                } else {
                    0
                }
            } else {
                0
            };

            items.push(LivePesertaStatusItem {
                id: r.0,
                pendaftar_id: r.1,
                nomor_peserta: r.2,
                nama_peserta: r.3,
                status_presensi: r.4,
                status_ujian: r.5,
                soal_terjawab: r.6.unwrap_or(0),
                total_soal,
                sisa_detik,
                nilai_akhir: r.11,
                is_lulus: r.12,
                waktu_mulai: r.7,
                waktu_selesai: r.9,
            });
        }

        Ok(items)
    }
}

impl CbtRepository {
    /// Rekap hasil pengerjaan CBT semua peserta (yang sudah selesai tampil dengan nilai).
    pub async fn list_hasil_admin(
        &self,
        cari: Option<&str>,
        sesi_id: Option<Uuid>,
    ) -> Result<Vec<crate::modules::cbt::dto::HasilCbtAdminItem>, AppError> {
        let pola = cari
            .map(str::trim)
            .filter(|c| !c.is_empty())
            .map(|c| format!("%{}%", c.replace('%', "\\%").replace('_', "\\_")));
        let rows = sqlx::query_as::<_, crate::modules::cbt::dto::HasilCbtAdminItem>(
            r#"
            SELECT ps.id AS peserta_sesi_id, ps.pendaftar_id, ps.nomor_peserta,
                   u.nama_lengkap AS nama_peserta, u.email,
                   s.id AS sesi_id, s.nama_sesi, ps.status_ujian,
                   h.total_soal, h.total_dijawab, h.jumlah_benar, h.jumlah_salah,
                   h.jumlah_kosong, h.nilai_akhir, h.is_lulus, h.waktu_submit,
                   h.disetujui_admin, h.disetujui_alasan
            FROM peserta_sesi ps
            JOIN sesi_ujian s ON s.id = ps.sesi_id
            JOIN pendaftar p ON p.id = ps.pendaftar_id
            JOIN users u ON u.id = p.user_id
            LEFT JOIN hasil_ujian h ON h.peserta_sesi_id = ps.id
            WHERE ($1::uuid IS NULL OR ps.sesi_id = $1)
              AND ($2::text IS NULL OR u.nama_lengkap ILIKE $2 OR u.email ILIKE $2
                   OR ps.nomor_peserta ILIKE $2)
            ORDER BY h.waktu_submit DESC NULLS LAST, s.jadwal_mulai DESC, ps.nomor_peserta
            LIMIT 500
            "#,
        )
        .bind(sesi_id)
        .bind(pola)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }
}

impl CbtRepository {
    /// Peserta yang lulus CBT menekan "Lanjut": buka tahap pengumuman. Idempoten.
    pub async fn lanjut_setelah_cbt(&self, pendaftar_id: Uuid) -> Result<(), AppError> {
        let mut tx = self.pool.begin().await?;
        let status: Option<(String,)> =
            sqlx::query_as("SELECT status_pendaftaran FROM pendaftar WHERE id = $1 FOR UPDATE")
                .bind(pendaftar_id)
                .fetch_optional(&mut *tx)
                .await?;
        let (status,) =
            status.ok_or_else(|| AppError::NotFound("Data pendaftar tidak ditemukan".into()))?;
        // Sudah di tahap setelah CBT (pengumuman, lulus, daftar ulang, dst): tidak ada yang perlu dibuka
        let sudah_lewat = matches!(
            status.as_str(),
            "LULUS"
                | "CADANGAN"
                | "TIDAK_LULUS"
                | "MENUNGGU_VERIFIKASI_DAFTAR_ULANG"
                | "DAFTAR_ULANG_LUNAS"
                | "TERDAFTAR"
        );
        if sudah_lewat {
            return Ok(());
        }
        if status == "MENUNGGU_PENGUMUMAN" {
            tx.commit().await?;
            crate::modules::kelulusan::repository::terbitkan_kelulusan_dari_cbt(
                &self.pool,
                Some(pendaftar_id),
            )
            .await?;
            return Ok(());
        }
        if status != "MENUNGGU_UJIAN" {
            return Err(AppError::Conflict(
                "Anda belum menyelesaikan ujian CBT atau tahap ini sudah terlewati".into(),
            ));
        }
        let lulus: Option<bool> = sqlx::query_scalar(
            "SELECT is_lulus FROM hasil_ujian WHERE pendaftar_id = $1
             ORDER BY waktu_submit DESC LIMIT 1",
        )
        .bind(pendaftar_id)
        .fetch_optional(&mut *tx)
        .await?;
        if lulus != Some(true) {
            return Err(AppError::Conflict(
                "Nilai CBT belum memenuhi passing grade. Tunggu keputusan panitia (ujian ulang atau persetujuan)."
                    .into(),
            ));
        }
        sqlx::query(
            "UPDATE pendaftar SET status_pendaftaran = 'MENUNGGU_PENGUMUMAN', updated_at = NOW()
             WHERE id = $1",
        )
        .bind(pendaftar_id)
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;
        // Lulus CBT -> LoA terbit otomatis dan tahap daftar ulang terbuka
        crate::modules::kelulusan::repository::terbitkan_kelulusan_dari_cbt(
            &self.pool,
            Some(pendaftar_id),
        )
        .await?;
        Ok(())
    }
}

impl CbtRepository {
    /// Setujui hasil CBT oleh admin.
    /// - Hasil di bawah passing grade: diubah menjadi lulus (alasan wajib) dan peserta lanjut ke pengumuman.
    /// - Hasil yang sudah lulus: hanya ditandai "disetujui admin" (alasan opsional).
    ///
    /// Mengembalikan (pendaftar_id, nilai_akhir, sebelumnya_lulus).
    pub async fn setujui_hasil(
        &self,
        peserta_sesi_id: Uuid,
        admin_id: Uuid,
        alasan: Option<&str>,
    ) -> Result<(Uuid, f64, bool), AppError> {
        let mut tx = self.pool.begin().await?;
        let cur: Option<(Uuid, f64, bool, bool, String)> = sqlx::query_as(
            "SELECT h.pendaftar_id, h.nilai_akhir, h.is_lulus, h.disetujui_admin,
                    p.status_pendaftaran
             FROM hasil_ujian h JOIN pendaftar p ON p.id = h.pendaftar_id
             WHERE h.peserta_sesi_id = $1 FOR UPDATE OF h, p",
        )
        .bind(peserta_sesi_id)
        .fetch_optional(&mut *tx)
        .await?;
        let (pendaftar_id, nilai, lulus, sudah, status) =
            cur.ok_or_else(|| AppError::NotFound("Peserta belum memiliki hasil CBT".into()))?;
        if status != "MENUNGGU_PENGUMUMAN" && status != "MENUNGGU_UJIAN" {
            return Err(AppError::Conflict(
                "Hasil seleksi sudah diumumkan. Gunakan koreksi kandidat di menu Seleksi & Kelulusan."
                    .into(),
            ));
        }
        if sudah {
            return Err(AppError::Conflict("Hasil ini sudah disetujui admin".into()));
        }
        let alasan = alasan.map(str::trim).filter(|a| !a.is_empty());
        if !lulus && alasan.map(|a| a.chars().count() < 5).unwrap_or(true) {
            return Err(AppError::BadRequest(
                "Alasan wajib diisi (minimal 5 karakter) untuk menyetujui hasil di bawah passing grade"
                    .into(),
            ));
        }
        sqlx::query(
            "UPDATE hasil_ujian
             SET is_lulus = TRUE, disetujui_admin = TRUE, disetujui_oleh = $2,
                 disetujui_alasan = $3, disetujui_pada = NOW()
             WHERE peserta_sesi_id = $1",
        )
        .bind(peserta_sesi_id)
        .bind(admin_id)
        .bind(alasan.unwrap_or("Disetujui admin"))
        .execute(&mut *tx)
        .await?;
        // Lanjut ke tahap pengumuman (peserta yang tertahan di bawah passing grade)
        sqlx::query(
            "UPDATE pendaftar SET status_pendaftaran = 'MENUNGGU_PENGUMUMAN', updated_at = NOW()
             WHERE id = $1 AND status_pendaftaran = 'MENUNGGU_UJIAN'",
        )
        .bind(pendaftar_id)
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;
        // Disetujui admin -> LoA terbit otomatis (bila belum ada hasil kelulusan)
        crate::modules::kelulusan::repository::terbitkan_kelulusan_dari_cbt(
            &self.pool,
            Some(pendaftar_id),
        )
        .await?;
        Ok((pendaftar_id, nilai, lulus))
    }

    /// Izinkan peserta mengulang CBT. Mengembalikan (pendaftar_id, ringkasan hasil lama).
    pub async fn izinkan_ujian_ulang(
        &self,
        peserta_sesi_id: Uuid,
        sesi_baru: Option<Uuid>,
    ) -> Result<(Uuid, serde_json::Value), AppError> {
        let mut tx = self.pool.begin().await?;
        #[allow(clippy::type_complexity)]
        let cur: Option<(
            Uuid,
            Uuid,
            String,
            String,
            String,
            Option<f64>,
            Option<i32>,
            Option<i32>,
            Option<i32>,
        )> = sqlx::query_as(
            "SELECT ps.sesi_id, ps.pendaftar_id, ps.nomor_peserta, ps.status_ujian,
                        p.status_pendaftaran, h.nilai_akhir, h.jumlah_benar, h.jumlah_salah,
                        h.jumlah_kosong
                 FROM peserta_sesi ps
                 JOIN pendaftar p ON p.id = ps.pendaftar_id
                 LEFT JOIN hasil_ujian h ON h.peserta_sesi_id = ps.id
                 WHERE ps.id = $1 FOR UPDATE OF ps, p",
        )
        .bind(peserta_sesi_id)
        .fetch_optional(&mut *tx)
        .await?;
        let (
            sesi_lama,
            pendaftar_id,
            nomor,
            status_ujian,
            status_pend,
            nilai,
            benar,
            salah,
            kosong,
        ) = cur.ok_or_else(|| AppError::NotFound("Peserta sesi tidak ditemukan".into()))?;

        if status_ujian != "SELESAI" && status_ujian != "WAKTU_HABIS" {
            return Err(AppError::Conflict(
                "Peserta belum menyelesaikan ujian, tidak ada yang perlu diulang".into(),
            ));
        }
        if status_pend != "MENUNGGU_PENGUMUMAN" && status_pend != "MENUNGGU_UJIAN" {
            return Err(AppError::Conflict(
                "Hasil seleksi sudah diumumkan atau status peserta tidak memungkinkan ujian ulang"
                    .into(),
            ));
        }

        let target = sesi_baru.unwrap_or(sesi_lama);
        let sesi: Option<(DateTime<Utc>, i32)> =
            sqlx::query_as("SELECT jadwal_selesai, kuota FROM sesi_ujian WHERE id = $1")
                .bind(target)
                .fetch_optional(&mut *tx)
                .await?;
        let (selesai, kuota) =
            sesi.ok_or_else(|| AppError::NotFound("Sesi tujuan tidak ditemukan".into()))?;
        if selesai <= Utc::now() {
            return Err(AppError::BadRequest(
                "Jadwal sesi tujuan sudah berakhir. Pilih sesi lain yang masih berlangsung.".into(),
            ));
        }

        let ringkasan = serde_json::json!({
            "sesi_id": sesi_lama, "status_ujian": status_ujian, "nilai_akhir": nilai,
            "benar": benar, "salah": salah, "kosong": kosong,
        });

        if target == sesi_lama {
            sqlx::query("DELETE FROM hasil_ujian WHERE peserta_sesi_id = $1")
                .bind(peserta_sesi_id)
                .execute(&mut *tx)
                .await?;
            sqlx::query("DELETE FROM jawaban_peserta WHERE peserta_sesi_id = $1")
                .bind(peserta_sesi_id)
                .execute(&mut *tx)
                .await?;
            sqlx::query("DELETE FROM pelanggaran_ujian WHERE peserta_sesi_id = $1")
                .bind(peserta_sesi_id)
                .execute(&mut *tx)
                .await?;
            sqlx::query(
                "UPDATE peserta_sesi
                 SET status_ujian = 'MENUNGGU', waktu_mulai = NULL, batas_waktu = NULL,
                     waktu_selesai = NULL, urutan_soal_ids = NULL, seed_acak = 1, updated_at = NOW()
                 WHERE id = $1",
            )
            .bind(peserta_sesi_id)
            .execute(&mut *tx)
            .await?;
        } else {
            let terisi: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM peserta_sesi WHERE sesi_id = $1")
                    .bind(target)
                    .fetch_one(&mut *tx)
                    .await?;
            if terisi >= kuota as i64 {
                return Err(AppError::Conflict("Kuota sesi tujuan sudah penuh".into()));
            }
            // Percobaan lama tetap tersimpan sebagai riwayat; tambah kursi di sesi baru
            sqlx::query(
                "INSERT INTO peserta_sesi (sesi_id, pendaftar_id, nomor_peserta)
                 VALUES ($1, $2, $3) ON CONFLICT (sesi_id, pendaftar_id) DO NOTHING",
            )
            .bind(target)
            .bind(pendaftar_id)
            .bind(&nomor)
            .execute(&mut *tx)
            .await?;
        }

        sqlx::query(
            "UPDATE pendaftar SET status_pendaftaran = 'BERKAS_VERIFIED', sesi_ujian_id = $2,
                    updated_at = NOW() WHERE id = $1",
        )
        .bind(pendaftar_id)
        .bind(target)
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok((pendaftar_id, ringkasan))
    }
}

#[derive(sqlx::FromRow)]
struct PesertaQrLookupRow {
    pub id: Uuid,
    pub sesi_id: Uuid,
    pub pendaftar_id: Uuid,
    pub nomor_peserta: String,
    pub status_presensi: String,
    pub waktu_presensi: Option<DateTime<Utc>>,
    pub metode_presensi: Option<String>,
    pub pengawas_id: Option<Uuid>,
    pub status_ujian: String,
    pub waktu_mulai: Option<DateTime<Utc>>,
    pub batas_waktu: Option<DateTime<Utc>>,
    pub waktu_selesai: Option<DateTime<Utc>>,
    pub seed_acak: i64,
    pub urutan_soal_ids: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub nama_peserta: String,
    pub nama_sesi: String,
}
