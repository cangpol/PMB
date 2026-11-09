use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::pendaftaran::{
        dto::{
            BerkasCalonItem, BerkasCalonRingkasan, BerkasDetailItem, DashboardSummaryResponse,
            PendaftaranOfflineRequest,
        },
        model::{
            BerkasPendaftar, DefinisiBerkas, DefinisiField, DefinisiLangkah, Pendaftar,
            StateLangkahPendaftar,
        },
        pdf::{JadwalUjianPdfData, PendaftarPdfData},
    },
};

#[derive(Clone)]
pub struct PendaftaranRepository {
    pool: PgPool,
}

impl PendaftaranRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // ==========================================
    // 1. DATA PENDAFTAR (DENGAN DATA_FORMULIR JSONB)
    // ==========================================

    pub async fn find_by_user_id(&self, user_id: Uuid) -> Result<Option<Pendaftar>, AppError> {
        let p = sqlx::query_as::<_, Pendaftar>(
            "SELECT id, user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                    nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                    asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2,
                    data_formulir, channel, catatan_verifikator, created_at, updated_at
             FROM pendaftar WHERE user_id = $1"
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Pendaftar>, AppError> {
        let p = sqlx::query_as::<_, Pendaftar>(
            "SELECT id, user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                    nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                    asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2,
                    data_formulir, channel, catatan_verifikator, created_at, updated_at
             FROM pendaftar WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn get_next_sequence(&self) -> Result<i64, AppError> {
        // SEQUENCE: aman dari bentrok saat ada baris terhapus / pengiriman bersamaan
        let row: (i64,) = sqlx::query_as("SELECT nextval('seq_nomor_pendaftaran')")
            .fetch_one(&self.pool)
            .await?;
        Ok(row.0)
    }

    pub async fn upsert_formulir_dinamis(
        &self,
        user_id: Uuid,
        nomor_pendaftaran: &str,
        jalur_id: Uuid,
        gelombang_id: Uuid,
        prodi_1: Uuid,
        prodi_2: Option<Uuid>,
        data_formulir: &serde_json::Value,
        // Kolom legacy yang diekstrak secara cerdas jika tersedia di data_formulir
        nik: &str,
        tempat_lahir: &str,
        tgl_lahir: chrono::NaiveDate,
        jenis_kelamin: &str,
        agama: &str,
        alamat_lengkap: &str,
        nama_ortu: &str,
        no_hp_ortu: &str,
        asal_sekolah: &str,
        jurusan_sekolah: &str,
        nilai_rapor_avg: f64,
    ) -> Result<Pendaftar, AppError> {
        let p = sqlx::query_as::<_, Pendaftar>(
            "INSERT INTO pendaftar (
                user_id, nomor_pendaftaran, jalur_id, gelombang_id, prodi_pilihan_1, prodi_pilihan_2,
                data_formulir, nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap,
                nama_ortu, no_hp_ortu, asal_sekolah, jurusan_sekolah, nilai_rapor_avg, status_pendaftaran
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'DRAFT')
            ON CONFLICT (user_id) DO UPDATE SET
                jalur_id = EXCLUDED.jalur_id,
                gelombang_id = EXCLUDED.gelombang_id,
                prodi_pilihan_1 = EXCLUDED.prodi_pilihan_1,
                prodi_pilihan_2 = EXCLUDED.prodi_pilihan_2,
                data_formulir = EXCLUDED.data_formulir,
                nik = EXCLUDED.nik,
                tempat_lahir = EXCLUDED.tempat_lahir,
                tgl_lahir = EXCLUDED.tgl_lahir,
                jenis_kelamin = EXCLUDED.jenis_kelamin,
                agama = EXCLUDED.agama,
                alamat_lengkap = EXCLUDED.alamat_lengkap,
                nama_ortu = EXCLUDED.nama_ortu,
                no_hp_ortu = EXCLUDED.no_hp_ortu,
                asal_sekolah = EXCLUDED.asal_sekolah,
                jurusan_sekolah = EXCLUDED.jurusan_sekolah,
                nilai_rapor_avg = EXCLUDED.nilai_rapor_avg,
                updated_at = NOW()
            RETURNING id, user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                      nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                      asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2,
                      data_formulir, channel, catatan_verifikator, created_at, updated_at"
        )
        .bind(user_id)
        .bind(nomor_pendaftaran)
        .bind(jalur_id)
        .bind(gelombang_id)
        .bind(prodi_1)
        .bind(prodi_2)
        .bind(data_formulir)
        .bind(nik)
        .bind(tempat_lahir)
        .bind(tgl_lahir)
        .bind(jenis_kelamin)
        .bind(agama)
        .bind(alamat_lengkap)
        .bind(nama_ortu)
        .bind(no_hp_ortu)
        .bind(asal_sekolah)
        .bind(jurusan_sekolah)
        .bind(nilai_rapor_avg)
        .fetch_one(&self.pool)
        .await?;

        Ok(p)
    }

    pub async fn upsert_biodata(
        &self,
        user_id: Uuid,
        nomor_pendaftaran: &str,
        jalur_id: Uuid,
        gelombang_id: Uuid,
        nik: &str,
        tempat_lahir: &str,
        tgl_lahir: chrono::NaiveDate,
        jenis_kelamin: &str,
        agama: &str,
        alamat_lengkap: &str,
        nama_ortu: &str,
        no_hp_ortu: &str,
    ) -> Result<Pendaftar, AppError> {
        let default_prodi: (Uuid,) = sqlx::query_as("SELECT id FROM program_studi LIMIT 1")
            .fetch_one(&self.pool)
            .await?;

        let p = sqlx::query_as::<_, Pendaftar>(
            "INSERT INTO pendaftar (
                user_id, nomor_pendaftaran, jalur_id, gelombang_id,
                nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, status_pendaftaran, data_formulir
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Belum Diisi', 'Belum Diisi', 0.0, $13, 'DRAFT', '{}'::jsonb)
            ON CONFLICT (user_id) DO UPDATE SET
                jalur_id = EXCLUDED.jalur_id,
                gelombang_id = EXCLUDED.gelombang_id,
                nik = EXCLUDED.nik,
                tempat_lahir = EXCLUDED.tempat_lahir,
                tgl_lahir = EXCLUDED.tgl_lahir,
                jenis_kelamin = EXCLUDED.jenis_kelamin,
                agama = EXCLUDED.agama,
                alamat_lengkap = EXCLUDED.alamat_lengkap,
                nama_ortu = EXCLUDED.nama_ortu,
                no_hp_ortu = EXCLUDED.no_hp_ortu,
                updated_at = NOW()
            RETURNING id, user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                      nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                      asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2,
                      data_formulir, channel, catatan_verifikator, created_at, updated_at"
        )
        .bind(user_id)
        .bind(nomor_pendaftaran)
        .bind(jalur_id)
        .bind(gelombang_id)
        .bind(nik)
        .bind(tempat_lahir)
        .bind(tgl_lahir)
        .bind(jenis_kelamin)
        .bind(agama)
        .bind(alamat_lengkap)
        .bind(nama_ortu)
        .bind(no_hp_ortu)
        .bind(default_prodi.0)
        .fetch_one(&self.pool)
        .await?;

        Ok(p)
    }

    pub async fn update_akademik(
        &self,
        pendaftar_id: Uuid,
        asal_sekolah: &str,
        jurusan_sekolah: &str,
        nilai_rapor_avg: f64,
        prodi_1: Uuid,
        prodi_2: Option<Uuid>,
    ) -> Result<Pendaftar, AppError> {
        let p = sqlx::query_as::<_, Pendaftar>(
            "UPDATE pendaftar
             SET asal_sekolah = $1,
                 jurusan_sekolah = $2,
                 nilai_rapor_avg = $3,
                 prodi_pilihan_1 = $4,
                 prodi_pilihan_2 = $5,
                 updated_at = NOW()
             WHERE id = $6
             RETURNING id, user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                       nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                       asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2,
                       data_formulir, channel, catatan_verifikator, created_at, updated_at"
        )
        .bind(asal_sekolah)
        .bind(jurusan_sekolah)
        .bind(nilai_rapor_avg)
        .bind(prodi_1)
        .bind(prodi_2)
        .bind(pendaftar_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(p)
    }

    pub async fn finalisasi(&self, pendaftar_id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE pendaftar SET status_pendaftaran = 'SUBMITTED', updated_at = NOW() WHERE id = $1"
        )
        .bind(pendaftar_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn list_all_pendaftar(&self) -> Result<Vec<Pendaftar>, AppError> {
        let list = sqlx::query_as::<_, Pendaftar>(
            "SELECT id, user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                    nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                    asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2,
                    data_formulir, channel, catatan_verifikator, created_at, updated_at
             FROM pendaftar ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(list)
    }

    // ==========================================
    // 2. DEFINISI FIELD (CUSTOM FIELD FORM BUILDER)
    // ==========================================

    pub async fn list_fields(
        &self,
        jalur_id: Option<Uuid>,
    ) -> Result<Vec<DefinisiField>, AppError> {
        let fields = match jalur_id {
            Some(j_id) => {
                sqlx::query_as::<_, DefinisiField>(
                    "SELECT * FROM definisi_field 
                 WHERE (jalur_id IS NULL OR jalur_id = $1) AND is_active = TRUE 
                 ORDER BY urutan ASC, created_at ASC",
                )
                .bind(j_id)
                .fetch_all(&self.pool)
                .await?
            }
            None => {
                sqlx::query_as::<_, DefinisiField>(
                    "SELECT * FROM definisi_field ORDER BY urutan ASC, created_at ASC",
                )
                .fetch_all(&self.pool)
                .await?
            }
        };
        Ok(fields)
    }

    pub async fn find_field_by_id(&self, id: Uuid) -> Result<Option<DefinisiField>, AppError> {
        let f = sqlx::query_as::<_, DefinisiField>("SELECT * FROM definisi_field WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(f)
    }

    pub async fn create_field(
        &self,
        jalur_id: Option<Uuid>,
        kode_field: &str,
        label: &str,
        tipe_field: &str,
        placeholder: Option<&str>,
        wajib: bool,
        opsi: &serde_json::Value,
        aturan_validasi: &serde_json::Value,
        urutan: i32,
        kelompok: &str,
    ) -> Result<DefinisiField, AppError> {
        let f = sqlx::query_as::<_, DefinisiField>(
            "INSERT INTO definisi_field (
                jalur_id, kode_field, label, tipe_field, placeholder, wajib, opsi, aturan_validasi, urutan, kelompok
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *"
        )
        .bind(jalur_id)
        .bind(kode_field)
        .bind(label)
        .bind(tipe_field)
        .bind(placeholder)
        .bind(wajib)
        .bind(opsi)
        .bind(aturan_validasi)
        .bind(urutan)
        .bind(kelompok)
        .fetch_one(&self.pool)
        .await?;

        Ok(f)
    }

    pub async fn update_field(
        &self,
        id: Uuid,
        jalur_id: Option<Uuid>,
        label: &str,
        tipe_field: &str,
        placeholder: Option<&str>,
        wajib: bool,
        opsi: &serde_json::Value,
        aturan_validasi: &serde_json::Value,
        urutan: i32,
        kelompok: &str,
        is_active: bool,
    ) -> Result<DefinisiField, AppError> {
        let f = sqlx::query_as::<_, DefinisiField>(
            "UPDATE definisi_field
             SET jalur_id = $1, label = $2, tipe_field = $3, placeholder = $4, wajib = $5,
                 opsi = $6, aturan_validasi = $7, urutan = $8, kelompok = $9, is_active = $10, updated_at = NOW()
             WHERE id = $11
             RETURNING *"
        )
        .bind(jalur_id)
        .bind(label)
        .bind(tipe_field)
        .bind(placeholder)
        .bind(wajib)
        .bind(opsi)
        .bind(aturan_validasi)
        .bind(urutan)
        .bind(kelompok)
        .bind(is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(f)
    }

    pub async fn delete_field(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM definisi_field WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn reorder_fields(&self, field_ids: &[Uuid]) -> Result<(), AppError> {
        for (idx, id) in field_ids.iter().enumerate() {
            sqlx::query("UPDATE definisi_field SET urutan = $1, updated_at = NOW() WHERE id = $2")
                .bind((idx + 1) as i32)
                .bind(id)
                .execute(&self.pool)
                .await?;
        }
        Ok(())
    }

    // ==========================================
    // 3. DEFINISI BERKAS (PERSYARATAN BERKAS)
    // ==========================================

    pub async fn list_definisi_berkas(
        &self,
        jalur_id: Option<Uuid>,
    ) -> Result<Vec<DefinisiBerkas>, AppError> {
        let list = match jalur_id {
            Some(j_id) => {
                sqlx::query_as::<_, DefinisiBerkas>(
                    "SELECT * FROM definisi_berkas 
                 WHERE (jalur_id IS NULL OR jalur_id = $1) AND is_active = TRUE 
                 ORDER BY urutan ASC, created_at ASC",
                )
                .bind(j_id)
                .fetch_all(&self.pool)
                .await?
            }
            None => {
                sqlx::query_as::<_, DefinisiBerkas>(
                    "SELECT * FROM definisi_berkas ORDER BY urutan ASC, created_at ASC",
                )
                .fetch_all(&self.pool)
                .await?
            }
        };
        Ok(list)
    }

    pub async fn find_definisi_berkas_by_id(
        &self,
        id: Uuid,
    ) -> Result<Option<DefinisiBerkas>, AppError> {
        let b = sqlx::query_as::<_, DefinisiBerkas>("SELECT * FROM definisi_berkas WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(b)
    }

    pub async fn create_definisi_berkas(
        &self,
        jalur_id: Option<Uuid>,
        kode_berkas: &str,
        nama: &str,
        deskripsi: Option<&str>,
        wajib: bool,
        tipe_file: &str,
        ukuran_maks_kb: i32,
        urutan: i32,
    ) -> Result<DefinisiBerkas, AppError> {
        let b = sqlx::query_as::<_, DefinisiBerkas>(
            "INSERT INTO definisi_berkas (
                jalur_id, kode_berkas, nama, deskripsi, wajib, tipe_file, ukuran_maks_kb, urutan
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *",
        )
        .bind(jalur_id)
        .bind(kode_berkas)
        .bind(nama)
        .bind(deskripsi)
        .bind(wajib)
        .bind(tipe_file)
        .bind(ukuran_maks_kb)
        .bind(urutan)
        .fetch_one(&self.pool)
        .await?;

        Ok(b)
    }

    pub async fn update_definisi_berkas(
        &self,
        id: Uuid,
        jalur_id: Option<Uuid>,
        nama: &str,
        deskripsi: Option<&str>,
        wajib: bool,
        tipe_file: &str,
        ukuran_maks_kb: i32,
        urutan: i32,
        is_active: bool,
    ) -> Result<DefinisiBerkas, AppError> {
        let b = sqlx::query_as::<_, DefinisiBerkas>(
            "UPDATE definisi_berkas
             SET jalur_id = $1, nama = $2, deskripsi = $3, wajib = $4,
                 tipe_file = $5, ukuran_maks_kb = $6, urutan = $7, is_active = $8, updated_at = NOW()
             WHERE id = $9
             RETURNING *"
        )
        .bind(jalur_id)
        .bind(nama)
        .bind(deskripsi)
        .bind(wajib)
        .bind(tipe_file)
        .bind(ukuran_maks_kb)
        .bind(urutan)
        .bind(is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(b)
    }

    /// Atur cakupan prodi berkas (NULL = semua prodi).
    pub async fn set_prodi_definisi_berkas(
        &self,
        id: Uuid,
        prodi_id: Option<Uuid>,
    ) -> Result<DefinisiBerkas, AppError> {
        let b = sqlx::query_as::<_, DefinisiBerkas>(
            "UPDATE definisi_berkas SET prodi_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        )
        .bind(prodi_id)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(b)
    }

    pub async fn delete_definisi_berkas(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM definisi_berkas WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ==========================================
    // 4. BERKAS PENDAFTAR & VERIFIKASI ADMIN
    // ==========================================

    pub async fn save_berkas_dinamis(
        &self,
        pendaftar_id: Uuid,
        definisi_berkas_id: Uuid,
        jenis_berkas: &str,
        file_key: &str,
        file_name: &str,
        mime_type: &str,
        file_size_bytes: i64,
    ) -> Result<BerkasPendaftar, AppError> {
        let b = sqlx::query_as::<_, BerkasPendaftar>(
            "INSERT INTO berkas_pendaftar (
                pendaftar_id, definisi_berkas_id, jenis_berkas, file_key, file_name,
                mime_type, file_size_bytes, status_verifikasi
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
            RETURNING *",
        )
        .bind(pendaftar_id)
        .bind(definisi_berkas_id)
        .bind(jenis_berkas)
        .bind(file_key)
        .bind(file_name)
        .bind(mime_type)
        .bind(file_size_bytes)
        .fetch_one(&self.pool)
        .await?;

        Ok(b)
    }

    pub async fn save_berkas(
        &self,
        pendaftar_id: Uuid,
        jenis_berkas: &str,
        file_key: &str,
        file_name: &str,
        mime_type: &str,
        file_size_bytes: i64,
    ) -> Result<BerkasPendaftar, AppError> {
        let b = sqlx::query_as::<_, BerkasPendaftar>(
            "INSERT INTO berkas_pendaftar (
                pendaftar_id, jenis_berkas, file_key, file_name, mime_type, file_size_bytes, status_verifikasi
            ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
            RETURNING *"
        )
        .bind(pendaftar_id)
        .bind(jenis_berkas)
        .bind(file_key)
        .bind(file_name)
        .bind(mime_type)
        .bind(file_size_bytes)
        .fetch_one(&self.pool)
        .await?;

        Ok(b)
    }

    pub async fn get_berkas_by_id(&self, id: Uuid) -> Result<Option<BerkasPendaftar>, AppError> {
        let b =
            sqlx::query_as::<_, BerkasPendaftar>("SELECT * FROM berkas_pendaftar WHERE id = $1")
                .bind(id)
                .fetch_optional(&self.pool)
                .await?;
        Ok(b)
    }

    pub async fn get_berkas_by_pendaftar(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Vec<BerkasPendaftar>, AppError> {
        let list = sqlx::query_as::<_, BerkasPendaftar>(
            "SELECT * FROM berkas_pendaftar WHERE pendaftar_id = $1 ORDER BY uploaded_at DESC",
        )
        .bind(pendaftar_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(list)
    }

    /// Definisi berkas aktif yang berlaku untuk pendaftar: umum, khusus jalurnya,
    /// dan khusus prodi pilihannya (mis. bebas buta warna untuk Fisioterapi).
    pub async fn list_definisi_berkas_pendaftar(
        &self,
        jalur_id: Uuid,
        prodi_ids: &[Uuid],
    ) -> Result<Vec<DefinisiBerkas>, AppError> {
        let list = sqlx::query_as::<_, DefinisiBerkas>(
            "SELECT * FROM definisi_berkas
             WHERE is_active = TRUE
               AND (jalur_id IS NULL OR jalur_id = $1)
               AND (prodi_id IS NULL OR prodi_id = ANY($2))
             ORDER BY urutan ASC, created_at ASC",
        )
        .bind(jalur_id)
        .bind(prodi_ids)
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn get_calon_berkas_list(
        &self,
        pendaftar_id: Uuid,
        jalur_id: Uuid,
        prodi_ids: &[Uuid],
    ) -> Result<Vec<BerkasCalonItem>, AppError> {
        let definisi_list = self
            .list_definisi_berkas_pendaftar(jalur_id, prodi_ids)
            .await?;
        let uploaded_list = self.get_berkas_by_pendaftar(pendaftar_id).await?;

        let mut items = Vec::new();
        for def in definisi_list {
            let matched = uploaded_list.iter().find(|u| {
                u.definisi_berkas_id == Some(def.id) || u.jenis_berkas == def.kode_berkas
            });

            match matched {
                Some(u) => {
                    items.push(BerkasCalonItem {
                        id: Some(u.id),
                        definisi_berkas_id: def.id,
                        kode_berkas: def.kode_berkas.clone(),
                        nama: def.nama.clone(),
                        deskripsi: def.deskripsi.clone(),
                        wajib: def.wajib,
                        tipe_file: def.tipe_file.clone(),
                        ukuran_maks_kb: def.ukuran_maks_kb,
                        urutan: def.urutan,
                        file_key: Some(u.file_key.clone()),
                        file_name: Some(u.file_name.clone()),
                        mime_type: Some(u.mime_type.clone()),
                        file_size_bytes: Some(u.file_size_bytes),
                        status_verifikasi: u.status_verifikasi.clone(),
                        catatan: u.catatan.clone(),
                        uploaded_at: Some(u.uploaded_at),
                    });
                }
                None => {
                    items.push(BerkasCalonItem {
                        id: None,
                        definisi_berkas_id: def.id,
                        kode_berkas: def.kode_berkas.clone(),
                        nama: def.nama.clone(),
                        deskripsi: def.deskripsi.clone(),
                        wajib: def.wajib,
                        tipe_file: def.tipe_file.clone(),
                        ukuran_maks_kb: def.ukuran_maks_kb,
                        urutan: def.urutan,
                        file_key: None,
                        file_name: None,
                        mime_type: None,
                        file_size_bytes: None,
                        status_verifikasi: "BELUM_UNGGAH".to_string(),
                        catatan: None,
                        uploaded_at: None,
                    });
                }
            }
        }

        Ok(items)
    }

    pub async fn list_all_berkas_admin(
        &self,
        status_filter: Option<&str>,
        search: Option<&str>,
        pendaftar_id: Option<Uuid>,
    ) -> Result<Vec<BerkasDetailItem>, AppError> {
        let mut builder = sqlx::QueryBuilder::new(
            "SELECT b.id, b.pendaftar_id, p.nomor_pendaftaran, u.nama_lengkap, u.email,
                    j.nama_jalur, b.definisi_berkas_id, b.jenis_berkas AS kode_berkas,
                    COALESCE(db.nama, b.jenis_berkas) AS nama_berkas,
                    COALESCE(db.wajib, TRUE) AS wajib,
                    b.file_key, b.file_name, b.mime_type, b.file_size_bytes,
                    b.status_verifikasi, b.catatan, b.uploaded_at, b.verified_at
             FROM berkas_pendaftar b
             JOIN pendaftar p ON b.pendaftar_id = p.id
             JOIN users u ON p.user_id = u.id
             JOIN jalur_masuk j ON p.jalur_id = j.id
             LEFT JOIN definisi_berkas db ON b.definisi_berkas_id = db.id
             WHERE 1=1",
        );

        if let Some(pid) = pendaftar_id {
            builder.push(" AND b.pendaftar_id = ");
            builder.push_bind(pid);
        }

        if let Some(status) = status_filter {
            if !status.is_empty() && status != "SEMUA" {
                builder.push(" AND b.status_verifikasi = ");
                builder.push_bind(status);
            }
        }

        if let Some(s) = search {
            if !s.trim().is_empty() {
                let pattern = format!("%{}%", s.trim());
                builder.push(" AND (p.nomor_pendaftaran ILIKE ");
                builder.push_bind(pattern.clone());
                builder.push(" OR p.nomor_sementara ILIKE ");
                builder.push_bind(pattern.clone());
                builder.push(" OR u.nama_lengkap ILIKE ");
                builder.push_bind(pattern.clone());
                builder.push(" OR u.email ILIKE ");
                builder.push_bind(pattern);
                builder.push(")");
            }
        }

        builder.push(" ORDER BY b.uploaded_at DESC LIMIT 200");

        let items = builder
            .build_query_as::<BerkasDetailItem>()
            .fetch_all(&self.pool)
            .await?;

        Ok(items)
    }

    /// Daftar calon beserta ringkasan berkasnya (unggahan terbaru tiap jenis).
    /// `status`: PENDING (ada yang menunggu), INVALID (ada yang ditolak),
    /// VALID (semua sah), selain itu semua. Yang perlu diperiksa tampil paling atas.
    pub async fn list_berkas_per_calon(
        &self,
        status: Option<&str>,
        search: Option<&str>,
    ) -> Result<Vec<BerkasCalonRingkasan>, AppError> {
        let mut builder = sqlx::QueryBuilder::new(
            "WITH terbaru AS (
                 SELECT DISTINCT ON (pendaftar_id, jenis_berkas)
                        pendaftar_id, status_verifikasi, uploaded_at
                 FROM berkas_pendaftar
                 ORDER BY pendaftar_id, jenis_berkas, uploaded_at DESC
             ), ringkas AS (
                 SELECT pendaftar_id,
                        COUNT(*)::bigint AS total,
                        (COUNT(*) FILTER (WHERE status_verifikasi = 'PENDING'))::bigint AS menunggu,
                        (COUNT(*) FILTER (WHERE status_verifikasi = 'VALID'))::bigint AS valid,
                        (COUNT(*) FILTER (WHERE status_verifikasi = 'INVALID'))::bigint AS ditolak,
                        MIN(uploaded_at) FILTER (WHERE status_verifikasi = 'PENDING') AS menunggu_sejak,
                        MAX(uploaded_at) AS terakhir_unggah
                 FROM terbaru GROUP BY pendaftar_id
             )
             SELECT r.pendaftar_id, p.nomor_pendaftaran, u.nama_lengkap, u.email,
                    j.nama_jalur, ps.nama_prodi, p.status_pendaftaran,
                    r.total, r.menunggu, r.valid, r.ditolak, r.menunggu_sejak, r.terakhir_unggah
             FROM ringkas r
             JOIN pendaftar p ON p.id = r.pendaftar_id
             JOIN users u ON u.id = p.user_id
             JOIN jalur_masuk j ON j.id = p.jalur_id
             LEFT JOIN program_studi ps ON ps.id = p.prodi_pilihan_1
             WHERE 1=1",
        );
        match status {
            Some("PENDING") => {
                builder.push(" AND r.menunggu > 0");
            }
            Some("INVALID") => {
                builder.push(" AND r.ditolak > 0");
            }
            Some("VALID") => {
                builder.push(" AND r.menunggu = 0 AND r.ditolak = 0 AND r.valid > 0");
            }
            _ => {}
        }
        if let Some(s) = search.map(str::trim).filter(|s| !s.is_empty()) {
            let pola = format!("%{s}%");
            builder.push(" AND (p.nomor_pendaftaran ILIKE ");
            builder.push_bind(pola.clone());
            builder.push(" OR p.nomor_sementara ILIKE ");
            builder.push_bind(pola.clone());
            builder.push(" OR u.nama_lengkap ILIKE ");
            builder.push_bind(pola.clone());
            builder.push(" OR u.email ILIKE ");
            builder.push_bind(pola);
            builder.push(")");
        }
        builder.push(
            " ORDER BY (r.menunggu > 0) DESC, r.menunggu_sejak ASC NULLS LAST, r.terakhir_unggah DESC
              LIMIT 200",
        );
        Ok(builder
            .build_query_as::<BerkasCalonRingkasan>()
            .fetch_all(&self.pool)
            .await?)
    }

    /// Sahkan unggahan terbaru tiap jenis berkas calon yang masih menunggu.
    /// Berkas yang sudah sah/ditolak dan unggahan lama yang sudah diganti tidak disentuh.
    pub async fn sahkan_semua_berkas_menunggu(
        &self,
        pendaftar_id: Uuid,
        verified_by: Uuid,
    ) -> Result<i64, AppError> {
        let hasil = sqlx::query(
            "UPDATE berkas_pendaftar
             SET status_verifikasi = 'VALID', catatan = NULL, verified_at = NOW(), verified_by = $2
             WHERE status_verifikasi = 'PENDING'
               AND id IN (SELECT DISTINCT ON (jenis_berkas) id
                          FROM berkas_pendaftar
                          WHERE pendaftar_id = $1
                          ORDER BY jenis_berkas, uploaded_at DESC)",
        )
        .bind(pendaftar_id)
        .bind(verified_by)
        .execute(&self.pool)
        .await?;
        Ok(hasil.rows_affected() as i64)
    }

    /// Perbarui status verifikasi satu berkas; mengembalikan `pendaftar_id` pemilik berkas.
    pub async fn update_verifikasi_berkas(
        &self,
        berkas_id: Uuid,
        status: &str,
        catatan: Option<&str>,
        verified_by: Option<Uuid>,
    ) -> Result<Uuid, AppError> {
        let pendaftar_id: Option<Uuid> = sqlx::query_scalar(
            "UPDATE berkas_pendaftar
             SET status_verifikasi = $1, catatan = $2, verified_at = NOW(), verified_by = $3
             WHERE id = $4
             RETURNING pendaftar_id",
        )
        .bind(status)
        .bind(catatan)
        .bind(verified_by)
        .bind(berkas_id)
        .fetch_optional(&self.pool)
        .await?;

        pendaftar_id.ok_or_else(|| {
            AppError::NotFound("Dokumen berkas pendaftaran tidak ditemukan".to_string())
        })
    }

    // ==========================================
    // 5. DEFINISI LANGKAH & STATE LANGKAH PENDAFTAR
    // ==========================================

    pub async fn list_definisi_langkah(
        &self,
        jalur_id: Option<Uuid>,
    ) -> Result<Vec<DefinisiLangkah>, AppError> {
        let list = match jalur_id {
            Some(j_id) => {
                sqlx::query_as::<_, DefinisiLangkah>(
                    "SELECT * FROM definisi_langkah 
                 WHERE (jalur_id IS NULL OR jalur_id = $1) AND is_active = TRUE 
                 ORDER BY urutan ASC, created_at ASC",
                )
                .bind(j_id)
                .fetch_all(&self.pool)
                .await?
            }
            None => {
                sqlx::query_as::<_, DefinisiLangkah>(
                    "SELECT * FROM definisi_langkah ORDER BY urutan ASC, created_at ASC",
                )
                .fetch_all(&self.pool)
                .await?
            }
        };
        Ok(list)
    }

    pub async fn create_definisi_langkah(
        &self,
        jalur_id: Option<Uuid>,
        kode_langkah: &str,
        judul_langkah: &str,
        deskripsi: Option<&str>,
        tipe_langkah: &str,
        urutan: i32,
        wajib: bool,
        syarat_lanjut: &serde_json::Value,
    ) -> Result<DefinisiLangkah, AppError> {
        let l = sqlx::query_as::<_, DefinisiLangkah>(
            "INSERT INTO definisi_langkah (
                jalur_id, kode_langkah, judul_langkah, deskripsi, tipe_langkah, urutan, wajib, syarat_lanjut
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *"
        )
        .bind(jalur_id)
        .bind(kode_langkah)
        .bind(judul_langkah)
        .bind(deskripsi)
        .bind(tipe_langkah)
        .bind(urutan)
        .bind(wajib)
        .bind(syarat_lanjut)
        .fetch_one(&self.pool)
        .await?;

        Ok(l)
    }

    pub async fn update_definisi_langkah(
        &self,
        id: Uuid,
        jalur_id: Option<Uuid>,
        judul_langkah: &str,
        deskripsi: Option<&str>,
        tipe_langkah: &str,
        urutan: i32,
        wajib: bool,
        syarat_lanjut: &serde_json::Value,
        is_active: bool,
    ) -> Result<DefinisiLangkah, AppError> {
        let l = sqlx::query_as::<_, DefinisiLangkah>(
            "UPDATE definisi_langkah
             SET jalur_id = $1, judul_langkah = $2, deskripsi = $3, tipe_langkah = $4,
                 urutan = $5, wajib = $6, syarat_lanjut = $7, is_active = $8, updated_at = NOW()
             WHERE id = $9
             RETURNING *",
        )
        .bind(jalur_id)
        .bind(judul_langkah)
        .bind(deskripsi)
        .bind(tipe_langkah)
        .bind(urutan)
        .bind(wajib)
        .bind(syarat_lanjut)
        .bind(is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(l)
    }

    pub async fn delete_definisi_langkah(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM definisi_langkah WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn get_state_langkah(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Vec<StateLangkahPendaftar>, AppError> {
        let list = sqlx::query_as::<_, StateLangkahPendaftar>(
            "SELECT * FROM state_langkah_pendaftar WHERE pendaftar_id = $1",
        )
        .bind(pendaftar_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn upsert_state_langkah(
        &self,
        pendaftar_id: Uuid,
        langkah_id: Uuid,
        status: &str,
        data: &serde_json::Value,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO state_langkah_pendaftar (pendaftar_id, langkah_id, status, data_tambahan, selesai_at)
             VALUES ($1, $2, $3, $4, CASE WHEN $3 = 'SELESAI' THEN NOW() ELSE NULL END)
             ON CONFLICT (pendaftar_id, langkah_id) DO UPDATE SET
                 status = EXCLUDED.status,
                 data_tambahan = EXCLUDED.data_tambahan,
                 selesai_at = CASE WHEN EXCLUDED.status = 'SELESAI' THEN NOW() ELSE state_langkah_pendaftar.selesai_at END,
                 updated_at = NOW()"
        )
        .bind(pendaftar_id)
        .bind(langkah_id)
        .bind(status)
        .bind(data)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // ==========================================
    // 6. VALIDASI GELOMBANG, KUOTA & ALUR PMB
    // ==========================================

    pub async fn check_gelombang_active(&self, gelombang_id: Uuid) -> Result<bool, AppError> {
        let active: Option<bool> = sqlx::query_scalar(
            "SELECT (status = 'DIBUKA' AND CURRENT_DATE >= tgl_mulai AND CURRENT_DATE <= tgl_selesai)
             FROM gelombang WHERE id = $1",
        )
        .bind(gelombang_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(active.unwrap_or(false))
    }

    pub async fn check_prodi_kuota(
        &self,
        prodi_id: Uuid,
        gelombang_id: Uuid,
    ) -> Result<bool, AppError> {
        // Cek tabel kuota_prodi_gelombang jika ada
        let kuota_row: Option<(i32, i32)> = sqlx::query_as(
            "SELECT kuota, kuota_terisi FROM kuota_prodi_gelombang
             WHERE prodi_id = $1 AND gelombang_id = $2",
        )
        .bind(prodi_id)
        .bind(gelombang_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some((kuota, terisi)) = kuota_row {
            return Ok(terisi < kuota);
        }

        // Fallback: cek kuota umum prodi dan hitung pendaftar aktif
        let prodi: Option<(i32, bool)> =
            sqlx::query_as("SELECT kuota, is_active FROM program_studi WHERE id = $1")
                .bind(prodi_id)
                .fetch_optional(&self.pool)
                .await?;

        match prodi {
            Some((kuota, is_active)) => {
                if !is_active {
                    return Ok(false);
                }
                let count: (i64,) = sqlx::query_as(
                    "SELECT COUNT(*) FROM pendaftar
                     WHERE (prodi_pilihan_1 = $1 OR prodi_pilihan_2 = $1)
                       AND gelombang_id = $2 AND status_pendaftaran != 'TIDAK_LULUS'",
                )
                .bind(prodi_id)
                .bind(gelombang_id)
                .fetch_one(&self.pool)
                .await?;

                Ok(count.0 < kuota as i64)
            }
            None => Ok(false),
        }
    }

    pub async fn get_prodi_nama(&self, prodi_id: Uuid) -> Result<String, AppError> {
        let nama: Option<String> =
            sqlx::query_scalar("SELECT nama_prodi FROM program_studi WHERE id = $1")
                .bind(prodi_id)
                .fetch_optional(&self.pool)
                .await?;
        Ok(nama.unwrap_or_else(|| "Program Studi".to_string()))
    }

    pub async fn get_jalur_nama(&self, jalur_id: Uuid) -> Result<String, AppError> {
        let nama: Option<String> =
            sqlx::query_scalar("SELECT nama_jalur FROM jalur_masuk WHERE id = $1")
                .bind(jalur_id)
                .fetch_optional(&self.pool)
                .await?;
        Ok(nama.unwrap_or_else(|| "Jalur PMB".to_string()))
    }

    pub async fn get_gelombang_nama(&self, gelombang_id: Uuid) -> Result<String, AppError> {
        let nama: Option<String> =
            sqlx::query_scalar("SELECT nama_gelombang FROM gelombang WHERE id = $1")
                .bind(gelombang_id)
                .fetch_optional(&self.pool)
                .await?;
        Ok(nama.unwrap_or_else(|| "Gelombang PMB".to_string()))
    }

    pub async fn pilih_prodi_draft(
        &self,
        user_id: Uuid,
        nomor_pendaftaran: &str,
        jalur_id: Uuid,
        gelombang_id: Uuid,
        prodi_1: Uuid,
        prodi_2: Option<Uuid>,
    ) -> Result<Pendaftar, AppError> {
        let p = sqlx::query_as::<_, Pendaftar>(
            "INSERT INTO pendaftar (
                user_id, nomor_pendaftaran, jalur_id, gelombang_id, prodi_pilihan_1, prodi_pilihan_2,
                status_pendaftaran, nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap,
                nama_ortu, no_hp_ortu, asal_sekolah, jurusan_sekolah, nilai_rapor_avg, data_formulir, channel
            ) VALUES (
                $1, $2, $3, $4, $5, $6, 'DRAFT',
                -- Identitas diisi kemudian dari formulir biodata; jangan pakai data karangan
                '', '', '1900-01-01', 'L', '', '', '', '', '', '', 0.0, '{}'::jsonb, 'online'
            )
            ON CONFLICT (user_id) DO UPDATE SET
                jalur_id = EXCLUDED.jalur_id,
                gelombang_id = EXCLUDED.gelombang_id,
                prodi_pilihan_1 = EXCLUDED.prodi_pilihan_1,
                prodi_pilihan_2 = EXCLUDED.prodi_pilihan_2,
                updated_at = NOW()
            RETURNING id, user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                      nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                      asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2,
                      data_formulir, channel, catatan_verifikator, created_at, updated_at"
        )
        .bind(user_id)
        .bind(nomor_pendaftaran)
        .bind(jalur_id)
        .bind(gelombang_id)
        .bind(prodi_1)
        .bind(prodi_2)
        .fetch_one(&self.pool)
        .await?;

        Ok(p)
    }

    pub async fn create_pendaftaran_offline(
        &self,
        user_id: Uuid,
        nomor_pendaftaran: &str,
        req: &PendaftaranOfflineRequest,
    ) -> Result<Pendaftar, AppError> {
        // Bayar tunai di loket = pembayaran formulir langsung disetujui admin (alur v2)
        let status = if req.lunas_loket {
            crate::modules::pendaftaran::alur::status::PEMBAYARAN_DISETUJUI
        } else {
            crate::modules::pendaftaran::alur::status::DRAFT
        };
        let p = sqlx::query_as::<_, Pendaftar>(
            "INSERT INTO pendaftar (
                user_id, nomor_pendaftaran, jalur_id, gelombang_id, prodi_pilihan_1, prodi_pilihan_2,
                status_pendaftaran, nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap,
                nama_ortu, no_hp_ortu, asal_sekolah, jurusan_sekolah, nilai_rapor_avg,
                data_formulir, channel, catatan_verifikator
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
                '{}'::jsonb, 'offline', $19
            )
            RETURNING id, user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                      nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                      asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2,
                      data_formulir, channel, catatan_verifikator, created_at, updated_at"
        )
        .bind(user_id)
        .bind(nomor_pendaftaran)
        .bind(req.jalur_id)
        .bind(req.gelombang_id)
        .bind(req.prodi_pilihan_1)
        .bind(req.prodi_pilihan_2)
        .bind(status)
        .bind(&req.nik)
        .bind(&req.tempat_lahir)
        .bind(req.tgl_lahir)
        .bind(&req.jenis_kelamin)
        .bind(&req.agama)
        .bind(&req.alamat_lengkap)
        .bind(&req.nama_ortu)
        .bind(&req.no_hp_ortu)
        .bind(&req.asal_sekolah)
        .bind(&req.jurusan_sekolah)
        .bind(req.nilai_rapor_avg.unwrap_or(0.0))
        .bind(req.catatan_loket.as_deref())
        .fetch_one(&self.pool)
        .await?;

        // Update kuota_terisi jika ada
        let _ = sqlx::query(
            "UPDATE kuota_prodi_gelombang
             SET kuota_terisi = kuota_terisi + 1
             WHERE prodi_id = $1 AND gelombang_id = $2",
        )
        .bind(req.prodi_pilihan_1)
        .bind(req.gelombang_id)
        .execute(&self.pool)
        .await;

        Ok(p)
    }

    pub async fn create_pembayaran_loket(
        &self,
        pendaftar_id: Uuid,
        admin_id: Uuid,
        nominal: i64,
    ) -> Result<String, AppError> {
        // Satu sequence dengan tagihan online agar nomor INV tidak pernah bentrok
        let seq: (i64,) = sqlx::query_as("SELECT nextval('seq_nomor_tagihan')")
            .fetch_one(&self.pool)
            .await?;
        let nomor_tagihan = format!("INV-2026-{:05}", seq.0);

        sqlx::query(
            "INSERT INTO pembayaran (
                pendaftar_id, nomor_tagihan, jenis_tagihan, nominal_asli, diskon, nominal_akhir,
                status_pembayaran, metode_pembayaran, tgl_kadaluarsa, tgl_bayar, verified_by
            ) VALUES ($1, $2, 'FORMULIR', $3, 0, $3, 'LUNAS', 'TUNAI_LOKET', NOW() + INTERVAL '30 days', NOW(), $4)"
        )
        .bind(pendaftar_id)
        .bind(&nomor_tagihan)
        .bind(nominal)
        .bind(admin_id)
        .execute(&self.pool)
        .await?;

        // Catat juga di tabel tagihan (sumber laporan keuangan alur v2)
        sqlx::query(
            "INSERT INTO tagihan (
                nomor_tagihan, pendaftar_id, jenis_tagihan, nominal_asli, diskon_voucher,
                nominal_akhir, status, tgl_jatuh_tempo, lunas_at, catatan
            ) VALUES ($1, $2, 'FORMULIR', $3, 0, $3, 'LUNAS', NOW(), NOW(), 'Dibayar tunai di loket PMB')
            ON CONFLICT (nomor_tagihan) DO NOTHING",
        )
        .bind(&nomor_tagihan)
        .bind(pendaftar_id)
        .bind(nominal)
        .execute(&self.pool)
        .await?;

        Ok(nomor_tagihan)
    }

    pub async fn get_dashboard_summary(
        &self,
        user_id: Uuid,
    ) -> Result<DashboardSummaryResponse, AppError> {
        let p = self.find_by_user_id(user_id).await?;

        let Some(pendaftar) = p else {
            return Ok(DashboardSummaryResponse {
                pendaftar_id: None,
                nomor_pendaftaran: None,
                status_pendaftaran: "BELUM_DAFTAR".to_string(),
                jalur_nama: None,
                gelombang_nama: None,
                prodi_1_nama: None,
                prodi_2_nama: None,
                tagihan_lunas: false,
                nomor_tagihan: None,
                nominal_tagihan: None,
                jadwal_ujian: None,
                lokasi_ujian: None,
                pengumuman_status: None,
                nim_resmi: None,
                bisa_cetak_bukti: false,
                bisa_cetak_kartu: false,
                prodi_diterima_nama: None,
                tgl_daftar: None,
                berkas: None,
                cbt: None,
                biaya: Vec::new(),
            });
        };

        let jalur_nama = self.get_jalur_nama(pendaftar.jalur_id).await.ok();
        let gelombang_nama = self.get_gelombang_nama(pendaftar.gelombang_id).await.ok();
        let prodi_1_nama = self.get_prodi_nama(pendaftar.prodi_pilihan_1).await.ok();
        let prodi_2_nama = match pendaftar.prodi_pilihan_2 {
            Some(p2) => self.get_prodi_nama(p2).await.ok(),
            None => None,
        };

        // Cek Pembayaran
        let bayar_row: Option<(String, String, i64)> = sqlx::query_as(
            "SELECT nomor_tagihan, status, nominal_akhir FROM tagihan
             WHERE pendaftar_id = $1 AND jenis_tagihan = 'FORMULIR'
             ORDER BY tgl_terbit DESC LIMIT 1",
        )
        .bind(pendaftar.id)
        .fetch_optional(&self.pool)
        .await?;

        let (tagihan_lunas, nomor_tagihan, nominal_tagihan) = match bayar_row {
            Some((no_tag, status, nom)) => (status == "LUNAS", Some(no_tag), Some(nom)),
            None => (false, None, None),
        };

        // Cek Jadwal Ujian
        let ujian_row: Option<(String, chrono::DateTime<chrono::Utc>, String, String)> =
            sqlx::query_as(
                "SELECT s.nama_sesi, s.jadwal_mulai, s.ruang, s.mode
                 FROM pendaftar p
                 JOIN sesi_ujian s ON s.id = p.sesi_ujian_id
                 WHERE p.id = $1",
            )
            .bind(pendaftar.id)
            .fetch_optional(&self.pool)
            .await?;

        let (jadwal_ujian, lokasi_ujian) = match ujian_row {
            Some((nama, jadwal, ruang, mode)) => (
                Some(format!(
                    "{} - {}",
                    nama,
                    format_wib(jadwal, "%d %b %Y %H:%M WIB")
                )),
                Some(if mode == "ONLINE" {
                    "Online (dari rumah)".to_string()
                } else {
                    ruang
                }),
            ),
            None => (None, None),
        };

        // Hasil kelulusan tampil begitu sidang dipublikasikan dan jadwal pengumuman tiba
        // (sama dengan aturan halaman Pengumuman Kelulusan). Tidak bergantung pada status
        // pendaftaran agar tidak ada selisih antara dashboard dan halaman hasil.
        let kelulusan_row: Option<(String, Option<String>, Option<String>)> = sqlx::query_as(
            "SELECT hk.status_kelulusan, hk.nim_resmi, ps.nama_prodi
             FROM hasil_kelulusan hk
             LEFT JOIN program_studi ps ON ps.id = hk.prodi_diterima_id
             LEFT JOIN sidang_kelulusan sd ON sd.id = hk.sidang_id
             WHERE hk.pendaftar_id = $1 AND hk.is_published = TRUE
               AND (sd.tgl_pengumuman IS NULL OR sd.tgl_pengumuman <= NOW())",
        )
        .bind(pendaftar.id)
        .fetch_optional(&self.pool)
        .await?;

        let (pengumuman_status, nim_resmi, prodi_diterima_nama) = match kelulusan_row {
            Some((st, nim, prodi)) => {
                let st = if st.starts_with("LULUS") {
                    "LULUS".to_string()
                } else {
                    st
                };
                (Some(st), nim, prodi)
            }
            None => (None, None, None),
        };

        let bisa_cetak_bukti = pendaftar.status_pendaftaran != "DRAFT";
        // Kartu peserta terbit setelah berkas diverifikasi (alur v2), sama dengan gerbang cetak PDF
        let bisa_cetak_kartu =
            crate::modules::pendaftaran::alur::peringkat(&pendaftar.status_pendaftaran) >= 5
                || pendaftar.channel == "offline";

        Ok(DashboardSummaryResponse {
            pendaftar_id: Some(pendaftar.id),
            nomor_pendaftaran: Some(pendaftar.nomor_pendaftaran),
            status_pendaftaran: pendaftar.status_pendaftaran,
            jalur_nama,
            gelombang_nama,
            prodi_1_nama,
            prodi_2_nama,
            tagihan_lunas,
            nomor_tagihan,
            nominal_tagihan,
            jadwal_ujian,
            lokasi_ujian,
            pengumuman_status,
            nim_resmi,
            bisa_cetak_bukti,
            bisa_cetak_kartu,
            prodi_diterima_nama,
            tgl_daftar: Some(pendaftar.created_at),
            berkas: None,
            cbt: None,
            biaya: Vec::new(),
        })
    }

    pub async fn get_pendaftar_pdf_data(&self, id: Uuid) -> Result<PendaftarPdfData, AppError> {
        let p = self
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound("Pendaftar tidak ditemukan".to_string()))?;

        let user: Option<(String, String, String)> =
            sqlx::query_as("SELECT nama_lengkap, email, no_hp FROM users WHERE id = $1")
                .bind(p.user_id)
                .fetch_optional(&self.pool)
                .await?;

        let (nama_lengkap, email, no_hp) = user.unwrap_or_else(|| {
            (
                "Calon Mahasiswa".to_string(),
                "calon@pignatelli.ac.id".to_string(),
                p.no_hp_ortu.clone(),
            )
        });

        let jalur_nama = self
            .get_jalur_nama(p.jalur_id)
            .await
            .unwrap_or_else(|_| "Jalur PMB".to_string());
        let gelombang_nama = self
            .get_gelombang_nama(p.gelombang_id)
            .await
            .unwrap_or_else(|_| "Gelombang PMB".to_string());
        let prodi_1_nama = self
            .get_prodi_nama(p.prodi_pilihan_1)
            .await
            .unwrap_or_else(|_| "Program Studi 1".to_string());
        let prodi_2_nama = match p.prodi_pilihan_2 {
            Some(p2) => self.get_prodi_nama(p2).await.ok(),
            None => None,
        };

        // Cek Pembayaran
        let bayar_status: Option<String> = sqlx::query_scalar(
            "SELECT status_pembayaran FROM pembayaran WHERE pendaftar_id = $1 AND jenis_tagihan = 'FORMULIR' ORDER BY created_at DESC LIMIT 1"
        )
        .bind(p.id)
        .fetch_optional(&self.pool)
        .await?;

        let status_pembayaran = match bayar_status.as_deref() {
            Some("LUNAS") => "LUNAS (Terverifikasi)".to_string(),
            Some("MENUNGGU_KONFIRMASI") => "Menunggu Konfirmasi".to_string(),
            _ if p.channel == "offline" => "LUNAS (Loket Offline PMB)".to_string(),
            _ => "Belum Lunas".to_string(),
        };

        Ok(PendaftarPdfData {
            nomor_pendaftaran: p.nomor_pendaftaran,
            nama_lengkap,
            email,
            no_hp,
            nik: p.nik,
            tempat_lahir: p.tempat_lahir,
            tgl_lahir: p.tgl_lahir.format("%d-%m-%Y").to_string(),
            jenis_kelamin: p.jenis_kelamin,
            agama: p.agama,
            asal_sekolah: p.asal_sekolah,
            jurusan_sekolah: p.jurusan_sekolah,
            jalur_nama,
            gelombang_nama,
            prodi_1_nama,
            prodi_2_nama,
            status_pendaftaran: p.status_pendaftaran,
            channel: p.channel,
            status_pembayaran,
            tanggal_cetak: chrono::Utc::now().format("%d %B %Y %H:%M WIB").to_string(),
        })
    }

    pub async fn get_jadwal_ujian_pdf(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Option<JadwalUjianPdfData>, AppError> {
        let row: Option<(
            String,
            String,
            chrono::DateTime<chrono::Utc>,
            String,
            String,
        )> = sqlx::query_as(
            "SELECT ps.nomor_peserta, s.nama_sesi, s.jadwal_mulai, s.ruang, s.mode
                 FROM peserta_sesi ps
                 JOIN sesi_ujian s ON s.id = ps.sesi_id
                 WHERE ps.pendaftar_id = $1
                 ORDER BY s.jadwal_mulai DESC
                 LIMIT 1",
        )
        .bind(pendaftar_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(
            |(nomor_peserta, nama_ujian, jadwal_mulai, ruang, mode)| JadwalUjianPdfData {
                nomor_peserta,
                nama_ujian,
                tanggal_ujian: format_wib(jadwal_mulai, "%d-%m-%Y"),
                waktu_ujian: format_wib(jadwal_mulai, "%H:%M WIB"),
                link_ujian: (mode == "ONLINE").then(|| "Portal PMB > Ujian CBT".to_string()),
                lokasi_ruang: if mode == "ONLINE" {
                    "Online (dari rumah)".to_string()
                } else {
                    ruang
                },
            },
        ))
    }
}

/// Format waktu UTC ke WIB (UTC+7) untuk tampilan dokumen calon.
fn format_wib(t: chrono::DateTime<chrono::Utc>, fmt: &str) -> String {
    let wib = chrono::FixedOffset::east_opt(7 * 3600).expect("offset WIB valid");
    t.with_timezone(&wib).format(fmt).to_string()
}
