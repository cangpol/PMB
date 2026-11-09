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

    // 2. Seeding Data Pengguna Default (Termasuk Akun Cepat Login)
    println!("[2/9] Melakukan seeding akun pengguna default (Super Admin, Admin, Staf & Calon)...");
    let pignatelli_pass_hash = hash_password_seed("Pignatelli2026!");
    let admin_pass_hash = hash_password_seed("AdminUPT2026!");
    let superadmin_pass_hash = hash_password_seed("SuperAdminUPT2026!");
    let calon_pass_hash = hash_password_seed("CalonUPT2026!");

    sqlx::query(
        r#"
        INSERT INTO users (email, password_hash, role, nama_lengkap, no_hp, is_active, is_email_verified)
        VALUES 
            -- Akun Standar Demo UI (Pignatelli2026!)
            ('superadmin@triputra.id', $1, 'super_admin', 'Super Administrator Triputra', '081100000001', TRUE, TRUE),
            ('admin@triputra.id', $1, 'admin_pmb', 'Administrator PMB Triputra', '081100000002', TRUE, TRUE),
            ('keuangan@triputra.id', $1, 'keuangan', 'Staf Keuangan PMB', '081100000003', TRUE, TRUE),
            ('pengawas@triputra.id', $1, 'pengawas_ujian', 'Pengawas Ujian CBT PMB', '081100000004', TRUE, TRUE),
            ('asesor@triputra.id', $1, 'asesor_rpl', 'Asesor Program RPL PMB', '081100000005', TRUE, TRUE),
            ('calon@triputra.id', $1, 'calon_mahasiswa', 'Calon Mahasiswa Demo', '081100000006', TRUE, TRUE),
            ('maba@triputra.id', $1, 'calon_mahasiswa', 'Calon Mahasiswa Demo', '081100000007', TRUE, TRUE),
            -- Akun Domain Resmi Institusi
            ('superadmin@pignatelli.ac.id', $2, 'super_admin', 'Super Administrator UPT', '081100000011', TRUE, TRUE),
            ('superadmin@upitra.ac.id', $2, 'super_admin', 'Super Administrator UPITRA', '081100000012', TRUE, TRUE),
            ('admin@pignatelli.ac.id', $3, 'admin_pmb', 'Administrator PMB UPT', '081122334455', TRUE, TRUE),
            ('calon@pignatelli.ac.id', $4, 'calon_mahasiswa', 'Yohanes Baptista Pratama', '081234567890', TRUE, TRUE)
        ON CONFLICT (email) DO UPDATE 
        SET nama_lengkap = EXCLUDED.nama_lengkap,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            is_active = TRUE,
            is_email_verified = TRUE,
            updated_at = NOW();
        "#,
    )
    .bind(&pignatelli_pass_hash)
    .bind(&superadmin_pass_hash)
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
        INSERT INTO fakultas (kode_fakultas, nama_fakultas, slug, deskripsi_singkat, deskripsi, urutan_tampil, is_active)
        VALUES ('FST', 'Fakultas Sains & Teknologi', 'sains-teknologi', 'Pengembangan kompetensi rekayasa perangkat lunak, sistem informasi industri, dan komputasi cerdas.', '[DRAF - verifikasi kampus] Fakultas Sains & Teknologi menyelenggarakan pendidikan terapan bidang sains komputer.', 1, TRUE)
        ON CONFLICT (kode_fakultas) DO UPDATE SET nama_fakultas = EXCLUDED.nama_fakultas, slug = EXCLUDED.slug, deskripsi_singkat = EXCLUDED.deskripsi_singkat, urutan_tampil = EXCLUDED.urutan_tampil
        RETURNING id;
        "#,
    )
    .fetch_one(&pool)
    .await?;

    let fak_feb_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO fakultas (kode_fakultas, nama_fakultas, slug, deskripsi_singkat, deskripsi, urutan_tampil, is_active)
        VALUES ('FEB', 'Fakultas Ekonomika Bisnis', 'ekonomika-bisnis', 'Pusat keunggulan ilmu manajemen bisnis, tata kelola korporasi, dan audit akuntansi profesional.', '[DRAF - verifikasi kampus] Fakultas Ekonomika Bisnis menghasilkan praktisi bisnis dan akuntan berintegritas.', 2, TRUE)
        ON CONFLICT (kode_fakultas) DO UPDATE SET nama_fakultas = EXCLUDED.nama_fakultas, slug = EXCLUDED.slug, deskripsi_singkat = EXCLUDED.deskripsi_singkat, urutan_tampil = EXCLUDED.urutan_tampil
        RETURNING id;
        "#,
    )
    .fetch_one(&pool)
    .await?;

    let fak_fsh_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO fakultas (kode_fakultas, nama_fakultas, slug, deskripsi_singkat, deskripsi, urutan_tampil, is_active)
        VALUES ('FSH', 'Fakultas Sosial Humaniora', 'sosial-humaniora', 'Pendidikan pariwisata strategis, komunikasi lintas budaya, dan literasi bahasa Inggris terapan.', '[DRAF - verifikasi kampus] Fakultas Sosial Humaniora berfokus pada hospitalitas pariwisata dan komunikasi bisnis internasional.', 3, TRUE)
        ON CONFLICT (kode_fakultas) DO UPDATE SET nama_fakultas = EXCLUDED.nama_fakultas, slug = EXCLUDED.slug, deskripsi_singkat = EXCLUDED.deskripsi_singkat, urutan_tampil = EXCLUDED.urutan_tampil
        RETURNING id;
        "#,
    )
    .fetch_one(&pool)
    .await?;

    let fak_fkes_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO fakultas (kode_fakultas, nama_fakultas, slug, deskripsi_singkat, deskripsi, urutan_tampil, is_active)
        VALUES ('FKES', 'Fakultas Kesehatan', 'kesehatan', 'Pendidikan tenaga kesehatan profesional berfokus pada keselamatan kerja, fisioterapi, dan keperawatan.', '[DRAF - verifikasi kampus] Fakultas Kesehatan membekali calon praktisi kesehatan dengan standar keselamatan kerja dan pelayanan medis terpadu.', 4, TRUE)
        ON CONFLICT (kode_fakultas) DO UPDATE SET nama_fakultas = EXCLUDED.nama_fakultas, slug = EXCLUDED.slug, deskripsi_singkat = EXCLUDED.deskripsi_singkat, urutan_tampil = EXCLUDED.urutan_tampil
        RETURNING id;
        "#,
    )
    .fetch_one(&pool)
    .await?;

    // 4. Seeding Program Studi Resmi UPITRA (10 Program Studi)
    println!("[4/9] Melakukan seeding Master Program Studi Resmi (10 Prodi)...");
    struct ProdiSeed {
        kode: &'static str,
        nama: &'static str,
        jenjang: &'static str,
        slug: &'static str,
        fak_id: Uuid,
        fakultas: &'static str,
        k_fakultas: &'static str,
        gelar: &'static str,
        lama_studi: i32,
        akreditasi: Option<&'static str>,
        deskripsi: &'static str,
        passing: f64,
        kuota: i32,
        daya_tampung: Option<i32>,
        ukt: i64,
        biaya_min: Option<i64>,
        biaya_maks: Option<i64>,
        urutan: i32,
    }

    let list_prodi = vec![
        ProdiSeed {
            kode: "IF",
            nama: "Informatika",
            jenjang: "S1",
            slug: "s1-informatika",
            fak_id: fak_saintek_id,
            fakultas: "Fakultas Sains & Teknologi",
            k_fakultas: "FST",
            gelar: "S.Kom.",
            lama_studi: 8,
            akreditasi: Some("Baik Sekali (BAN-PT)"),
            deskripsi: "[DRAF - verifikasi kampus] Fokus pada rekayasa perangkat lunak, kecerdasan buatan, komputasi awan, dan sistem terdistribusi.",
            passing: 75.0,
            kuota: 100,
            daya_tampung: Some(100),
            ukt: 7000000,
            biaya_min: Some(7000000),
            biaya_maks: Some(7000000),
            urutan: 1,
        },
        ProdiSeed {
            kode: "SI",
            nama: "Sistem Informasi",
            jenjang: "S1",
            slug: "s1-sistem-informasi",
            fak_id: fak_saintek_id,
            fakultas: "Fakultas Sains & Teknologi",
            k_fakultas: "FST",
            gelar: "S.Kom.",
            lama_studi: 8,
            akreditasi: Some("Baik Sekali (BAN-PT)"),
            deskripsi: "[DRAF - verifikasi kampus] Integrasi proses bisnis dengan teknologi informasi enterprise dan manajemen basis data.",
            passing: 70.0,
            kuota: 80,
            daya_tampung: Some(80),
            ukt: 6500000,
            biaya_min: Some(6500000),
            biaya_maks: Some(6500000),
            urutan: 2,
        },
        ProdiSeed {
            kode: "SE",
            nama: "Software Engineering",
            jenjang: "S1",
            slug: "s1-software-engineering",
            fak_id: fak_saintek_id,
            fakultas: "Fakultas Sains & Teknologi",
            k_fakultas: "FST",
            gelar: "S.Kom.",
            lama_studi: 8,
            akreditasi: None,
            deskripsi: "[DRAF - verifikasi kampus] Disiplin rekayasa perangkat lunak terapan, automated testing, dan CI/CD pipeline industri.",
            passing: 65.0,
            kuota: 0,
            daya_tampung: None,
            ukt: 0,
            biaya_min: None,
            biaya_maks: None,
            urutan: 3,
        },
        ProdiSeed {
            kode: "MNJ",
            nama: "Manajemen",
            jenjang: "S1",
            slug: "s1-manajemen",
            fak_id: fak_feb_id,
            fakultas: "Fakultas Ekonomika Bisnis",
            k_fakultas: "FEB",
            gelar: "S.M.",
            lama_studi: 8,
            akreditasi: None,
            deskripsi: "[DRAF - verifikasi kampus] Manajemen operasional bisnis, rantai pasok, kepemimpinan organisasi, dan pemasaran modern.",
            passing: 65.0,
            kuota: 0,
            daya_tampung: None,
            ukt: 0,
            biaya_min: None,
            biaya_maks: None,
            urutan: 4,
        },
        ProdiSeed {
            kode: "AKT",
            nama: "Akuntansi",
            jenjang: "S1",
            slug: "s1-akuntansi",
            fak_id: fak_feb_id,
            fakultas: "Fakultas Ekonomika Bisnis",
            k_fakultas: "FEB",
            gelar: "S.Ak.",
            lama_studi: 8,
            akreditasi: Some("Baik (BAN-PT)"),
            deskripsi: "[DRAF - verifikasi kampus] Tata kelola pelaporan keuangan, audit profesional, sistem informasi akuntansi, dan perpajakan.",
            passing: 70.0,
            kuota: 60,
            daya_tampung: Some(60),
            ukt: 6000000,
            biaya_min: Some(6000000),
            biaya_maks: Some(6000000),
            urutan: 5,
        },
        ProdiSeed {
            kode: "PAR",
            nama: "Pariwisata",
            jenjang: "S1",
            slug: "s1-pariwisata",
            fak_id: fak_fsh_id,
            fakultas: "Fakultas Sosial Humaniora",
            k_fakultas: "FSH",
            gelar: "S.Par.",
            lama_studi: 8,
            akreditasi: None,
            deskripsi: "[DRAF - verifikasi kampus] Manajemen destinasi wisata, industri perhotelan, event management, dan pariwisata berkelanjutan.",
            passing: 65.0,
            kuota: 0,
            daya_tampung: None,
            ukt: 0,
            biaya_min: None,
            biaya_maks: None,
            urutan: 6,
        },
        ProdiSeed {
            kode: "BIG",
            nama: "Bahasa Inggris",
            jenjang: "S1",
            slug: "s1-bahasa-inggris",
            fak_id: fak_fsh_id,
            fakultas: "Fakultas Sosial Humaniora",
            k_fakultas: "FSH",
            gelar: "S.Li.",
            lama_studi: 8,
            akreditasi: None,
            deskripsi: "[DRAF - verifikasi kampus] Linguistik terapan, komunikasi bisnis internasional, dan penerjemahan dokumen korporat.",
            passing: 65.0,
            kuota: 0,
            daya_tampung: None,
            ukt: 0,
            biaya_min: None,
            biaya_maks: None,
            urutan: 7,
        },
        ProdiSeed {
            kode: "K3",
            nama: "Keselamatan dan Kesehatan Kerja (K3)",
            jenjang: "S1",
            slug: "s1-k3",
            fak_id: fak_fkes_id,
            fakultas: "Fakultas Kesehatan",
            k_fakultas: "FKES",
            gelar: "S.K.K.K.",
            lama_studi: 8,
            akreditasi: None,
            deskripsi: "[DRAF - verifikasi kampus] Manajemen risiko kecelakaan kerja, higiene industri, ergonomi, dan audit regulasi SMK3.",
            passing: 65.0,
            kuota: 0,
            daya_tampung: None,
            ukt: 0,
            biaya_min: None,
            biaya_maks: None,
            urutan: 8,
        },
        ProdiSeed {
            kode: "FIS",
            nama: "Fisioterapi",
            jenjang: "S1",
            slug: "s1-fisioterapi",
            fak_id: fak_fkes_id,
            fakultas: "Fakultas Kesehatan",
            k_fakultas: "FKES",
            gelar: "S.Ftr.",
            lama_studi: 8,
            akreditasi: None,
            deskripsi: "[DRAF - verifikasi kampus] Pemulihan gerak dan fungsi tubuh, fisioterapi muskuloskeletal, olahraga, dan rehabilitasi.",
            passing: 65.0,
            kuota: 0,
            daya_tampung: None,
            ukt: 0,
            biaya_min: None,
            biaya_maks: None,
            urutan: 9,
        },
        ProdiSeed {
            kode: "KEP",
            nama: "Keperawatan",
            jenjang: "D3",
            slug: "d3-keperawatan",
            fak_id: fak_fkes_id,
            fakultas: "Fakultas Kesehatan",
            k_fakultas: "FKES",
            gelar: "A.Md.Kep.",
            lama_studi: 6,
            akreditasi: None,
            deskripsi: "[DRAF - verifikasi kampus] Asuhan keperawatan terapan, kegawatdaruratan, dan etika profesi keperawatan klinis.",
            passing: 65.0,
            kuota: 0,
            daya_tampung: None,
            ukt: 0,
            biaya_min: None,
            biaya_maks: None,
            urutan: 10,
        },
    ];

    let mut prodi_ids = Vec::new();
    for p in list_prodi {
        let p_id = sqlx::query_scalar::<_, Uuid>(
            r#"
            INSERT INTO program_studi (
                kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas_id, fakultas, kode_fakultas,
                gelar, lama_studi_semester, akreditasi, deskripsi_singkat, passing_score, kuota, daya_tampung,
                ukt_nominal, biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active
            )
            VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, TRUE)
            ON CONFLICT (kode_prodi) DO UPDATE SET
                nama_prodi = EXCLUDED.nama_prodi,
                slug = EXCLUDED.slug,
                fakultas_id = EXCLUDED.fakultas_id,
                fakultas = EXCLUDED.fakultas,
                kode_fakultas = EXCLUDED.kode_fakultas,
                gelar = EXCLUDED.gelar,
                lama_studi_semester = EXCLUDED.lama_studi_semester,
                akreditasi = EXCLUDED.akreditasi,
                deskripsi_singkat = EXCLUDED.deskripsi_singkat,
                daya_tampung = EXCLUDED.daya_tampung,
                biaya_ukt_min = EXCLUDED.biaya_ukt_min,
                biaya_ukt_maks = EXCLUDED.biaya_ukt_maks,
                urutan_tampil = EXCLUDED.urutan_tampil
            RETURNING id;
            "#,
        )
        .bind(p.kode)
        .bind(p.nama)
        .bind(p.jenjang)
        .bind(p.slug)
        .bind(p.fak_id)
        .bind(p.fakultas)
        .bind(p.k_fakultas)
        .bind(p.gelar)
        .bind(p.lama_studi)
        .bind(p.akreditasi)
        .bind(p.deskripsi)
        .bind(p.passing)
        .bind(p.kuota)
        .bind(p.daya_tampung)
        .bind(p.ukt)
        .bind(p.biaya_min)
        .bind(p.biaya_maks)
        .bind(p.urutan)
        .fetch_one(&pool)
        .await?;
        prodi_ids.push(p_id);
    }

    // Kode prodi 2 digit untuk nomor pendaftaran & NIM (sama dengan migrasi 20261109000023)
    for (kode_prodi, kode_angka) in [
        ("MNJ", "11"),
        ("AKT", "12"),
        ("IF", "21"),
        ("SI", "22"),
        ("SE", "23"),
        ("BIG", "31"),
        ("PAR", "32"),
        ("K3", "41"),
        ("FIS", "42"),
        ("KEP", "43"),
    ] {
        sqlx::query("UPDATE program_studi SET kode_angka = $2 WHERE kode_prodi = $1")
            .bind(kode_prodi)
            .bind(kode_angka)
            .execute(&pool)
            .await?;
    }

    // 5. Seeding Jalur Masuk [CONTOH]
    println!("[5/9] Melakukan seeding Master Jalur Masuk [CONTOH]...");
    let list_jalur = vec![
        (
            "JALUR-RAPOR",
            "[CONTOH] Jalur Reguler Prestasi (RAPOR)",
            "Seleksi berkas nilai rapor semester 1-5 tanpa tes tertulis",
            250000i64,
            "BERKAS",
            "Nilai rata-rata rapor semester 1-5 minimal 75.0",
        ),
        (
            "JALUR-CBT",
            "[CONTOH] Jalur Mandiri Tes CBT Online",
            "Ujian Computer-Based Testing potensi akademik & bahasa Inggris",
            250000i64,
            "CBT",
            "Mengikuti ujian CBT online 60 menit dengan nilai ambang batas",
        ),
        (
            "JALUR-BEASISWA",
            "[CONTOH] Jalur Beasiswa Triputra Peduli",
            "Program beasiswa penuh biaya kuliah dari Yayasan Triputra",
            0i64,
            "CAMPURAN",
            "Seleksi berkas prestasi akademik/non-akademik + tes wawancara",
        ),
        (
            "JALUR-RPL",
            "[CONTOH] Jalur Rekognisi Pembelajaran Lampau (RPL)",
            "Pengakuan pengalaman kerja atau alih jenjang D3 ke S1",
            350000i64,
            "RPL",
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

    // Jalur READY (kuota READY Early 70) + kolom seleksi: jalankan ulang migrasinya (idempoten)
    sqlx::raw_sql(include_str!(
        "../../migrations/20261110000028_jalur_ready_kuota_seleksi.sql"
    ))
    .execute(&pool)
    .await?;

    // Kurikulum RPL & langkah RPL bergantung pada prodi dan jalur di atas, yang
    // dibuat setelah migrasi berjalan. Jalankan ulang file migrasinya (idempoten).
    sqlx::raw_sql(include_str!(
        "../../migrations/20261107000015_rpl_kurikulum_dan_langkah.sql"
    ))
    .execute(&pool)
    .await?;

    // 6. Seeding Gelombang Pendaftaran & Kuota Gelombang [CONTOH]
    println!("[6/9] Melakukan seeding Gelombang Pendaftaran & Kuota Prodi [CONTOH]...");
    let gelombang_row = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO gelombang (nama_gelombang, tahun_akademik_id, nomor_gelombang, status, tgl_mulai, tgl_selesai, kuota, is_active)
        SELECT '[CONTOH] Gelombang I (Early Bird)', $1, 1, 'DIBUKA', NOW() - INTERVAL '7 days', NOW() + INTERVAL '60 days', 150, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM gelombang WHERE nama_gelombang = '[CONTOH] Gelombang I (Early Bird)')
        RETURNING id;
        "#,
    )
    .bind(ta_id)
    .fetch_optional(&pool)
    .await?;

    let gelombang_id = match gelombang_row {
        Some(id) => id,
        None => {
            sqlx::query_scalar::<_, Uuid>(
                "SELECT id FROM gelombang WHERE nama_gelombang = '[CONTOH] Gelombang I (Early Bird)' LIMIT 1",
            )
            .fetch_one(&pool)
            .await?
        }
    };

    // Gelombang II & III + informasi gelombang untuk halaman depan (dapat diedit admin)
    let info_gelombang = [
        (
            "[CONTOH] Gelombang I (Early Bird)",
            1,
            "-7 days",
            "60 days",
            "Periode pendaftaran awal dengan fasilitas beasiswa dan potongan DPP terbesar.",
            "Maksimal 14 hari setelah pengumuman",
        ),
        (
            "[CONTOH] Gelombang II (Reguler)",
            2,
            "61 days",
            "120 days",
            "Periode seleksi reguler untuk seluruh lulusan SMA/SMK/MA dan pindahan.",
            "Maksimal 14 hari setelah pengumuman",
        ),
        (
            "[CONTOH] Gelombang III (Penutupan Kuota)",
            3,
            "121 days",
            "150 days",
            "Periode seleksi akhir untuk pengisian sisa kuota program studi yang masih tersedia.",
            "Maksimal 7 hari setelah pengumuman",
        ),
    ];
    let mut gelombang_semua = vec![gelombang_id];
    for (nama, nomor, mulai, selesai, deskripsi, ulang) in info_gelombang {
        sqlx::query(
            r#"
            INSERT INTO gelombang (nama_gelombang, tahun_akademik_id, nomor_gelombang, status, tgl_mulai, tgl_selesai, kuota, is_active)
            SELECT $1, $2, $3, 'DIBUKA', NOW() + $4::interval, NOW() + $5::interval, 150, TRUE
            WHERE NOT EXISTS (SELECT 1 FROM gelombang WHERE nama_gelombang = $1)
            "#,
        )
        .bind(nama)
        .bind(ta_id)
        .bind(nomor)
        .bind(mulai)
        .bind(selesai)
        .execute(&pool)
        .await?;
        // Isi informasi hanya bila admin belum mengisinya sendiri
        sqlx::query(
            r#"
            UPDATE gelombang SET deskripsi = $2, info_daftar_ulang = $3
            WHERE nama_gelombang = $1 AND deskripsi IS NULL
            "#,
        )
        .bind(nama)
        .bind(deskripsi)
        .bind(ulang)
        .execute(&pool)
        .await?;
        if let Some(id) =
            sqlx::query_scalar::<_, Uuid>("SELECT id FROM gelombang WHERE nama_gelombang = $1")
                .bind(nama)
                .fetch_optional(&pool)
                .await?
        {
            if id != gelombang_id {
                gelombang_semua.push(id);
            }
        }
    }

    for p_id in &prodi_ids {
        for g_id in &gelombang_semua {
            sqlx::query(
                r#"
                INSERT INTO kuota_prodi_gelombang (prodi_id, gelombang_id, kuota, kuota_terisi)
                VALUES ($1, $2, 40, 0)
                ON CONFLICT (prodi_id, gelombang_id) DO UPDATE SET kuota = EXCLUDED.kuota;
                "#,
            )
            .bind(p_id)
            .bind(g_id)
            .execute(&pool)
            .await?;
        }
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
            "CONTOH-TRIPUTRA50",
            "NOMINAL",
            50000i64,
            100,
            "Potongan 50rb biaya formulir",
        ),
        (
            "CONTOH-EARLYBIRD50",
            "PERCENT",
            50i64,
            100,
            "Diskon 50% biaya formulir early bird",
        ),
        (
            "CONTOH-BEASISWA100",
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

    // 10. Seeding Formulir Pendaftaran & Sidang Kelulusan Resmi Demo [CONTOH]
    println!("[10/10] Melakukan seeding Formulir Pendaftaran & Sidang Kelulusan Demo [CONTOH]...");
    let calon_user_id = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM users WHERE email = 'calon@triputra.id' LIMIT 1",
    )
    .fetch_one(&pool)
    .await?;

    let prodi_if_id = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM program_studi WHERE kode_prodi = 'IF' LIMIT 1",
    )
    .fetch_one(&pool)
    .await?;

    let prodi_si_id = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM program_studi WHERE kode_prodi = 'SI' LIMIT 1",
    )
    .fetch_one(&pool)
    .await?;

    let jalur_demo_id = jalur_ids[0]; // Jalur Reguler

    let pendaftar_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO pendaftar (
            user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
            nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama,
            alamat_lengkap, nama_ortu, no_hp_ortu, asal_sekolah, jurusan_sekolah,
            nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2
        )
        VALUES (
            $1, 'PMB-2026-0001', $2, $3, 'LULUS',
            '3374010101990001', 'Semarang', '2005-08-17', 'L', 'Katolik',
            'Jl. Triputra No. 1, Semarang', 'Budi Santoso', '081234567890', 'SMA Sedes Sapientiae Semarang', 'IPA',
            87.5, $4, $5
        )
        ON CONFLICT (user_id) DO UPDATE SET
            nomor_pendaftaran = 'PMB-2026-0001',
            status_pendaftaran = 'LULUS',
            prodi_pilihan_1 = EXCLUDED.prodi_pilihan_1,
            prodi_pilihan_2 = EXCLUDED.prodi_pilihan_2
        RETURNING id;
        "#,
    )
    .bind(calon_user_id)
    .bind(jalur_demo_id)
    .bind(gelombang_id)
    .bind(prodi_if_id)
    .bind(prodi_si_id)
    .fetch_one(&pool)
    .await?;

    let sidang_row = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO sidang_kelulusan (
            gelombang_id, nama_sidang, nomor_sk, tanggal_sidang, tgl_pengumuman,
            status_sidang, total_peserta, total_lulus, total_cadangan, total_tidak_lulus, catatan_sidang
        )
        SELECT 
            $1, '[CONTOH] Sidang Pleno Kelulusan Gelombang I', 'SK/PMB-UPT/2026/0001',
            CURRENT_DATE - INTERVAL '2 days', NOW() - INTERVAL '1 day',
            'DIPUBLIKASIKAN', 1, 1, 0, 0, 'Sidang pleno kelulusan seleksi penerimaan mahasiswa baru resmi disetujui dan dipublikasikan.'
        WHERE NOT EXISTS (
            SELECT 1 FROM sidang_kelulusan WHERE nomor_sk = 'SK/PMB-UPT/2026/0001'
        )
        RETURNING id;
        "#,
    )
    .bind(gelombang_id)
    .fetch_optional(&pool)
    .await?;

    let sidang_id =
        match sidang_row {
            Some(id) => id,
            None => sqlx::query_scalar::<_, Uuid>(
                "SELECT id FROM sidang_kelulusan WHERE nomor_sk = 'SK/PMB-UPT/2026/0001' LIMIT 1",
            )
            .fetch_one(&pool)
            .await?,
        };

    sqlx::query(
        r#"
        INSERT INTO hasil_kelulusan (
            pendaftar_id, sidang_id, status_kelulusan, prodi_diterima_id, pilihan_ke,
            ranking, skor_cbt, nilai_rapor, nilai_prestasi, skor_akhir,
            nim_resmi, nomor_surat_loa, tanggal_sk, is_published, status_daftar_ulang,
            catatan_sidang
        )
        VALUES (
            $1, $2, 'LULUS_PILIHAN_1', $3, 1,
            1, 85.0, 87.5, 80.0, 85.5,
            '261010001', 'SK/PMB-UPT/2026/0001', CURRENT_DATE - INTERVAL '2 days', TRUE, 'TAGIHAN_TERBIT',
            'Selamat! Anda diterima pada program studi S1 Informatika jalur Reguler.'
        )
        ON CONFLICT (pendaftar_id) DO UPDATE SET
            sidang_id = EXCLUDED.sidang_id,
            status_kelulusan = EXCLUDED.status_kelulusan,
            prodi_diterima_id = EXCLUDED.prodi_diterima_id,
            pilihan_ke = EXCLUDED.pilihan_ke,
            ranking = EXCLUDED.ranking,
            skor_akhir = EXCLUDED.skor_akhir,
            nim_resmi = EXCLUDED.nim_resmi,
            nomor_surat_loa = EXCLUDED.nomor_surat_loa,
            tanggal_sk = EXCLUDED.tanggal_sk,
            is_published = TRUE,
            status_daftar_ulang = EXCLUDED.status_daftar_ulang;
        "#,
    )
    .bind(pendaftar_id)
    .bind(sidang_id)
    .bind(prodi_if_id)
    .execute(&pool)
    .await?;

    // Data contoh di atas memakai nomor tetap (mis. PMB-2026-0001); majukan
    // sequence nomor agar pendaftar/tagihan baru tidak bentrok dengannya.
    sqlx::raw_sql(include_str!(
        "../../migrations/20261107000017_sequence_nomor.sql"
    ))
    .execute(&pool)
    .await?;

    println!("========================================================");
    println!("  [SUKSES] Seeding database selesai secara idempoten!   ");
    println!("  Akun Default:");
    println!("    - Admin Demo : admin@triputra.id (Password: Pignatelli2026!)");
    println!("    - Calon Demo : calon@triputra.id (Password: Pignatelli2026!)");
    println!("    - Admin UPT  : admin@pignatelli.ac.id (Password: AdminUPT2026!)");
    println!("    - Calon UPT  : calon@pignatelli.ac.id (Password: CalonUPT2026!)");
    println!("  Data [CONTOH] siap diuji dan dikustomisasi di panel admin.");
    println!("========================================================");

    Ok(())
}
