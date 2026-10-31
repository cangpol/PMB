// Script Seeding Database Idempoten
// Sistem Penerimaan Mahasiswa Baru (PMB) Universitas Pignatelli Triputra
// Cara menjalankan: cargo run --bin seed

use argon2::{Argon2, password_hash::PasswordHasher};
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;

fn hash_password_seed(password: &str) -> String {
    Argon2::default()
        .hash_password(password.as_bytes())
        .expect("Gagal hash password seed")
        .to_string()
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://pmb_user:pmb_password@localhost:5432/pmb_db".to_string());

    println!("========================================================");
    println!("  SEEDING DATABASE PMB UNIVERSITAS PIGNATELLI TRIPUTRA  ");
    println!("  Target: {}", database_url);
    println!("========================================================");

    let pool = match PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
    {
        Ok(p) => p,
        Err(err) => {
            eprintln!("[SEED INFO] Database belum dapat dihubungi: {err}");
            eprintln!(
                "Untuk menjalankan seeding, aktifkan PostgreSQL (misal: docker compose up -d postgres)."
            );
            return Ok(());
        }
    };

    // 1. Jalankan migrasi terlebih dahulu agar seluruh tabel ada
    println!("[1/9] Memverifikasi & menerapkan skema migrasi database...");
    sqlx::migrate!("./migrations").run(&pool).await?;

    // 2. Seeding Data Pengguna Default
    println!("[2/9] Melakukan seeding akun pengguna default (Admin & Calon)...");
    let admin_pass_hash = hash_password_seed("AdminUPT2026!");
    let calon_pass_hash = hash_password_seed("CalonUPT2026!");

    sqlx::query(
        r#"
        INSERT INTO users (email, password_hash, role, nama_lengkap, no_hp, is_active)
        VALUES 
            ('admin@pignatelli.ac.id', $1, 'admin_pmb', 'Administrator PMB UPT', '081122334455', TRUE),
            ('calon@pignatelli.ac.id', $2, 'calon_mahasiswa', 'Yohanes Baptista Pratama', '081234567890', TRUE)
        ON CONFLICT (email) DO UPDATE 
        SET nama_lengkap = EXCLUDED.nama_lengkap,
            password_hash = EXCLUDED.password_hash,
            updated_at = NOW();
        "#,
    )
    .bind(&admin_pass_hash)
    .bind(&calon_pass_hash)
    .execute(&pool)
    .await?;

    // 3. Seeding Tahun Akademik & Fakultas [CONTOH]
    println!("[3/9] Melakukan seeding Tahun Akademik & Fakultas [CONTOH]...");
    let ta_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO tahun_akademik (kode, nama, tgl_mulai, tgl_selesai, is_active)
        VALUES ('2026/2027', '[CONTOH] Tahun Akademik 2026/2027', '2026-09-01', '2027-08-31', TRUE)
        ON CONFLICT (kode) DO UPDATE SET nama = EXCLUDED.nama
        RETURNING id;
        "#,
    )
    .fetch_one(&pool)
    .await?;

    let fak_saintek_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO fakultas (kode_fakultas, nama_fakultas, deskripsi, is_active)
        VALUES ('FST', '[CONTOH] Fakultas Sains dan Teknologi', 'Fakultas bidang komputasi dan teknologi informasi', TRUE)
        ON CONFLICT (kode_fakultas) DO UPDATE SET nama_fakultas = EXCLUDED.nama_fakultas
        RETURNING id;
        "#,
    )
    .fetch_one(&pool)
    .await?;

    let fak_feb_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO fakultas (kode_fakultas, nama_fakultas, deskripsi, is_active)
        VALUES ('FEB', '[CONTOH] Fakultas Ekonomi dan Bisnis', 'Fakultas bidang akuntansi, manajemen dan bisnis', TRUE)
        ON CONFLICT (kode_fakultas) DO UPDATE SET nama_fakultas = EXCLUDED.nama_fakultas
        RETURNING id;
        "#,
    )
    .fetch_one(&pool)
    .await?;

    // 4. Seeding Program Studi [CONTOH]
    println!("[4/9] Melakukan seeding Master Program Studi [CONTOH]...");
    let list_prodi = vec![
        (
            "SI-01",
            "[CONTOH] Sistem Informasi",
            "S1",
            fak_saintek_id,
            "Fakultas Sains & Teknologi",
            "FST",
            70.0,
            80,
            6500000i64,
        ),
        (
            "IF-02",
            "[CONTOH] Informatika",
            "S1",
            fak_saintek_id,
            "Fakultas Sains & Teknologi",
            "FST",
            75.0,
            100,
            7000000i64,
        ),
        (
            "AKT-01",
            "[CONTOH] Akuntansi Bisnis",
            "S1",
            fak_feb_id,
            "Fakultas Ekonomi & Bisnis",
            "FEB",
            75.0,
            60,
            6000000i64,
        ),
        (
            "MNJ-01",
            "[CONTOH] Manajemen Pemasaran",
            "D3",
            fak_feb_id,
            "Fakultas Ekonomi & Bisnis",
            "FEB",
            65.0,
            50,
            5000000i64,
        ),
    ];

    let mut prodi_ids = Vec::new();
    for (kode, nama, jenjang, fak_id, fakultas, k_fakultas, passing, kuota, ukt) in list_prodi {
        let p_id = sqlx::query_scalar::<_, Uuid>(
            r#"
            INSERT INTO program_studi (kode_prodi, nama_prodi, jenjang, fakultas_id, fakultas, kode_fakultas, passing_score, kuota, ukt_nominal, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
            ON CONFLICT (kode_prodi) DO UPDATE SET nama_prodi = EXCLUDED.nama_prodi, fakultas_id = EXCLUDED.fakultas_id
            RETURNING id;
            "#,
        )
        .bind(kode)
        .bind(nama)
        .bind(jenjang)
        .bind(fak_id)
        .bind(fakultas)
        .bind(k_fakultas)
        .bind(passing)
        .bind(kuota)
        .bind(ukt)
        .fetch_one(&pool)
        .await?;
        prodi_ids.push(p_id);
    }

    // 5. Seeding Jalur Masuk [CONTOH]
    println!("[5/9] Melakukan seeding Master Jalur Masuk [CONTOH]...");
    let list_jalur = vec![
        (
            "JALUR-RAPOR",
            "[CONTOH] Jalur Reguler Prestasi (RAPOR)",
            "Seleksi berkas nilai rapor semester 1-5 tanpa tes tertulis",
            250000i64,
            "berkas",
            "Nilai rata-rata rapor semester 1-5 minimal 75.0",
        ),
        (
            "JALUR-CBT",
            "[CONTOH] Jalur Mandiri Tes CBT Online",
            "Ujian Computer-Based Testing potensi akademik & bahasa Inggris",
            250000i64,
            "cbt",
            "Mengikuti ujian CBT online 60 menit dengan nilai ambang batas",
        ),
        (
            "JALUR-BEASISWA",
            "[CONTOH] Jalur Beasiswa Triputra Peduli",
            "Program beasiswa penuh biaya kuliah dari Yayasan Triputra",
            0i64,
            "campuran",
            "Seleksi berkas prestasi akademik/non-akademik + tes wawancara",
        ),
        (
            "JALUR-RPL",
            "[CONTOH] Jalur Rekognisi Pembelajaran Lampau (RPL)",
            "Pengakuan pengalaman kerja atau alih jenjang D3 ke S1",
            350000i64,
            "rpl",
            "Portofolio pengalaman kerja minimal 2 tahun atau transkrip D3",
        ),
    ];

    let mut jalur_ids = Vec::new();
    for (kode, nama, deskripsi, biaya, tipe, syarat) in list_jalur {
        let j_id = sqlx::query_scalar::<_, Uuid>(
            r#"
            INSERT INTO jalur_masuk (kode_jalur, nama_jalur, deskripsi, biaya_formulir, tipe_seleksi, syarat, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, TRUE)
            ON CONFLICT (kode_jalur) DO UPDATE SET nama_jalur = EXCLUDED.nama_jalur, tipe_seleksi = EXCLUDED.tipe_seleksi
            RETURNING id;
            "#,
        )
        .bind(kode)
        .bind(nama)
        .bind(deskripsi)
        .bind(biaya)
        .bind(tipe)
        .bind(syarat)
        .fetch_one(&pool)
        .await?;
        jalur_ids.push(j_id);
    }

    // 6. Seeding Gelombang Pendaftaran & Kuota Gelombang [CONTOH]
    println!("[6/9] Melakukan seeding Gelombang Pendaftaran & Kuota Prodi [CONTOH]...");
    let gelombang_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO gelombang (nama_gelombang, tahun_akademik_id, nomor_gelombang, status, tgl_mulai, tgl_selesai, kuota, is_active)
        VALUES ('[CONTOH] Gelombang I (Early Bird)', $1, 1, 'buka', NOW() - INTERVAL '7 days', NOW() + INTERVAL '60 days', 150, TRUE)
        ON CONFLICT (nomor_gelombang) DO UPDATE SET nama_gelombang = EXCLUDED.nama_gelombang, tahun_akademik_id = EXCLUDED.tahun_akademik_id
        RETURNING id;
        "#,
    )
    .bind(ta_id)
    .fetch_one(&pool)
    .await?;

    for p_id in &prodi_ids {
        sqlx::query(
            r#"
            INSERT INTO kuota_prodi_gelombang (prodi_id, gelombang_id, kuota, kuota_terisi)
            VALUES ($1, $2, 40, 0)
            ON CONFLICT (prodi_id, gelombang_id) DO UPDATE SET kuota = EXCLUDED.kuota;
            "#,
        )
        .bind(p_id)
        .bind(gelombang_id)
        .execute(&pool)
        .await?;
    }

    // 7. Seeding Komponen Biaya & Matriks Biaya [CONTOH]
    println!("[7/9] Melakukan seeding Komponen Biaya & Matriks Biaya [CONTOH]...");
    let list_komponen = vec![
        (
            "DPK",
            "[CONTOH] Dana Pengembangan Kampus (Gedung)",
            "Biaya satu kali saat diterima",
        ),
        (
            "UKT-S1",
            "[CONTOH] UKT Pokok Semester 1",
            "Biaya operasional kuliah semester 1",
        ),
        (
            "ALMA",
            "[CONTOH] Jas Almamater & Orientasi Kampus",
            "Jas almamater, dasi, kartu mahasiswa & ospek",
        ),
    ];

    let mut komponen_ids = Vec::new();
    for (kode, nama, deskripsi) in list_komponen {
        let k_id = sqlx::query_scalar::<_, Uuid>(
            r#"
            INSERT INTO komponen_biaya (kode_komponen, nama_komponen, deskripsi, is_active)
            VALUES ($1, $2, $3, TRUE)
            ON CONFLICT (kode_komponen) DO UPDATE SET nama_komponen = EXCLUDED.nama_komponen
            RETURNING id;
            "#,
        )
        .bind(kode)
        .bind(nama)
        .bind(deskripsi)
        .fetch_one(&pool)
        .await?;
        komponen_ids.push(k_id);
    }

    // Matriks Biaya untuk SI-01 di Gelombang 1 Jalur RAPOR
    if let (Some(&p_si), Some(&j_rapor), Some(&k_dpk), Some(&k_ukt), Some(&k_alma)) = (
        prodi_ids.first(),
        jalur_ids.first(),
        komponen_ids.first(),
        komponen_ids.get(1),
        komponen_ids.get(2),
    ) {
        let matriks_items = vec![
            (
                p_si,
                j_rapor,
                gelombang_id,
                k_dpk,
                7500000i64,
                true,
                3,
                Some(3500000i64),
            ),
            (
                p_si,
                j_rapor,
                gelombang_id,
                k_ukt,
                6500000i64,
                true,
                2,
                Some(3250000i64),
            ),
            (
                p_si,
                j_rapor,
                gelombang_id,
                k_alma,
                1250000i64,
                false,
                1,
                None,
            ),
        ];

        for (p, j, g, k, nom, cicil, maks, pert) in matriks_items {
            sqlx::query(
                r#"
                INSERT INTO matriks_biaya (prodi_id, jalur_id, gelombang_id, komponen_id, nominal, bisa_dicicil, maksimal_cicilan, nominal_cicilan_pertama)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (prodi_id, jalur_id, gelombang_id, komponen_id) DO UPDATE 
                SET nominal = EXCLUDED.nominal, bisa_dicicil = EXCLUDED.bisa_dicicil;
                "#,
            )
            .bind(p)
            .bind(j)
            .bind(g)
            .bind(k)
            .bind(nom)
            .bind(cicil)
            .bind(maks)
            .bind(pert)
            .execute(&pool)
            .await?;
        }
    }

    // 8. Seeding Voucher Diskon [CONTOH]
    println!("[8/9] Melakukan seeding Voucher Diskon [CONTOH]...");
    let list_voucher = vec![
        (
            "[CONTOH] TRIPUTRA50",
            "NOMINAL",
            50000i64,
            100,
            "Potongan 50rb biaya formulir",
        ),
        (
            "[CONTOH] EARLYBIRD50",
            "PERCENT",
            50i64,
            100,
            "Diskon 50% biaya formulir early bird",
        ),
        (
            "[CONTOH] BEASISWA100",
            "PERCENT",
            100i64,
            50,
            "Gratis 100% biaya pendaftaran",
        ),
    ];

    for (kode, tipe, diskon, kuota, deskripsi) in list_voucher {
        sqlx::query(
            r#"
            INSERT INTO vouchers (kode_voucher, tipe_diskon, nilai_diskon, kuota, kuota_terpakai, tgl_kadaluarsa, deskripsi, is_active)
            VALUES ($1, $2, $3, $4, 0, NOW() + INTERVAL '180 days', $5, TRUE)
            ON CONFLICT (kode_voucher) DO UPDATE SET deskripsi = EXCLUDED.deskripsi;
            "#,
        )
        .bind(kode)
        .bind(tipe)
        .bind(diskon)
        .bind(kuota)
        .bind(deskripsi)
        .execute(&pool)
        .await?;
    }

    // 9. Seeding Bank Soal CBT & Pengaturan PMB
    println!("[9/9] Melakukan seeding Ujian CBT & Pengaturan Sistem PMB...");
    let cbt_row = sqlx::query_scalar::<_, uuid::Uuid>(
        r#"
        INSERT INTO ujian_cbt (judul, deskripsi, durasi_menit, passing_grade, is_active)
        SELECT 'Ujian Seleksi Masuk CBT T.A. 2026/2027', 'Tes potensi skolastik, logika matematika, penalaran, dan literasi bahasa Inggris', 60, 65.0, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM ujian_cbt WHERE judul = 'Ujian Seleksi Masuk CBT T.A. 2026/2027')
        RETURNING id;
        "#,
    )
    .fetch_optional(&pool)
    .await?;

    let cbt_id = match cbt_row {
        Some(id) => id,
        None => {
            sqlx::query_scalar::<_, uuid::Uuid>(
                "SELECT id FROM ujian_cbt WHERE judul = 'Ujian Seleksi Masuk CBT T.A. 2026/2027' LIMIT 1"
            )
            .fetch_one(&pool)
            .await?
        }
    };

    let list_soal = vec![
        (
            1,
            "Semua mahasiswa sistem informasi mempelajari basis data. Sebagian mahasiswa membawa laptop. Kesimpulan yang benar adalah:",
            "Sebagian mahasiswa sistem informasi yang membawa laptop mempelajari basis data",
            "Semua mahasiswa yang membawa laptop adalah mahasiswa sistem informasi",
            "Mahasiswa yang tidak membawa laptop tidak mempelajari basis data",
            "Tidak ada kesimpulan yang benar",
            "A",
        ),
        (
            2,
            "Deret angka: 3, 6, 12, 24, 48, ... Angka berikutnya adalah:",
            "72",
            "96",
            "84",
            "108",
            "B",
        ),
        (
            3,
            "Jika A = 2B dan B = 3C, berapakah perbandingan A terhadap C?",
            "6 : 1",
            "1 : 6",
            "5 : 1",
            "3 : 2",
            "A",
        ),
        (
            4,
            "Choose the correct sentence in professional English:",
            "He don't know the announcement yesterday",
            "The university has established a new partnership with Triputra Group",
            "The scholarship were offered to all applicants",
            "Each candidates must submits their document",
            "B",
        ),
        (
            5,
            "Sebuah program studi memiliki kuota 80 mahasiswa. Jika jumlah pendaftar 400 orang, berapa persentase penerimaannya?",
            "15%",
            "25%",
            "20%",
            "30%",
            "C",
        ),
    ];

    for (no, tanya, a, b, c, d, kunci) in list_soal {
        sqlx::query(
            r#"
            INSERT INTO soal_ujian (ujian_id, nomor_urut, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, kunci_jawaban, bobot)
            SELECT $1, $2, $3, $4, $5, $6, $7, $8, 20.0
            WHERE NOT EXISTS (
                SELECT 1 FROM soal_ujian WHERE ujian_id = $1 AND nomor_urut = $2
            );
            "#,
        )
        .bind(cbt_id)
        .bind(no)
        .bind(tanya)
        .bind(a)
        .bind(b)
        .bind(c)
        .bind(d)
        .bind(kunci)
        .execute(&pool)
        .await?;
    }

    println!("========================================================");
    println!("  [SUKSES] Seeding database selesai secara idempoten!   ");
    println!("  Akun Default:");
    println!("    - Admin : admin@pignatelli.ac.id (Password: AdminUPT2026!)");
    println!("    - Calon : calon@pignatelli.ac.id (Password: CalonUPT2026!)");
    println!("  Data [CONTOH] siap diuji dan dikustomisasi di panel admin.");
    println!("========================================================");

    Ok(())
}
