// Tes konsistensi Alur PMB v2 tanpa database:
// memastikan setiap status yang ditulis kode memang diizinkan oleh CHECK constraint migrasi,
// dan urutan gerbang alur sesuai alur resmi (formulir -> bayar -> berkas -> CBT -> pengumuman
// -> bayar daftar ulang -> registrasi ulang).
//
// Latar belakang: sebelum alur v2, kode menulis 'MENUNGGU_UJIAN' / 'MENUNGGU_PENGUMUMAN'
// yang tidak ada di CHECK, sehingga transaksi pelunasan & submit CBT gagal di database.

use api::modules::pendaftaran::alur::{KonteksAlur, StatusLangkah, bangun_alur, peringkat, status};

// CHECK status terakhir didefinisikan ulang di migrasi jalur READY (menambah MENUNGGU_PINDAH_JALUR)
const MIGRASI_V2: &str = include_str!("../migrations/20261110000028_jalur_ready_kuota_seleksi.sql");

/// Ambil daftar nilai di dalam CHECK (status_pendaftaran IN (...)) dari migrasi v2.
fn status_diizinkan_db() -> Vec<String> {
    let awal = MIGRASI_V2
        .find("CHECK (status_pendaftaran IN (")
        .expect("CHECK status_pendaftaran ada di migrasi v2");
    let isi = &MIGRASI_V2[awal..];
    let akhir = isi.find("));").expect("penutup CHECK");
    isi[..akhir]
        .split('\'')
        .enumerate()
        .filter(|(i, _)| i % 2 == 1)
        .map(|(_, s)| s.to_string())
        .collect()
}

const SEMUA_STATUS: &[&str] = &[
    status::DRAFT,
    status::SUBMITTED,
    status::MENUNGGU_VERIFIKASI_BAYAR,
    status::PEMBAYARAN_DITOLAK,
    status::PEMBAYARAN_DISETUJUI,
    status::MENUNGGU_VERIFIKASI_BERKAS,
    status::BERKAS_REVISION,
    status::BERKAS_VERIFIED,
    status::MENUNGGU_UJIAN,
    status::MENUNGGU_PENGUMUMAN,
    status::LULUS,
    status::CADANGAN,
    status::TIDAK_LULUS,
    status::MENUNGGU_VERIFIKASI_DAFTAR_ULANG,
    status::DAFTAR_ULANG_LUNAS,
    status::TERDAFTAR,
    status::MENUNGGU_PINDAH_JALUR,
];

#[test]
fn semua_status_kode_diizinkan_check_constraint() {
    let db = status_diizinkan_db();
    for s in SEMUA_STATUS {
        assert!(
            db.iter().any(|d| d == s),
            "Status '{s}' dipakai kode tetapi tidak ada di CHECK migrasi v2: {db:?}"
        );
    }
    assert_eq!(
        db.len(),
        SEMUA_STATUS.len(),
        "CHECK berisi status di luar konstanta: {db:?}"
    );
}

#[test]
fn literal_status_di_sumber_ada_di_check() {
    // Pindai literal SQL `status_pendaftaran = 'X'` di seluruh sumber backend.
    let db = status_diizinkan_db();
    let mut pelanggaran = Vec::new();
    let akar = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    let mut tumpukan = vec![akar];
    while let Some(dir) = tumpukan.pop() {
        for entri in std::fs::read_dir(&dir).unwrap() {
            let path = entri.unwrap().path();
            if path.is_dir() {
                tumpukan.push(path);
                continue;
            }
            if path.extension().and_then(|e| e.to_str()) != Some("rs") {
                continue;
            }
            let isi = std::fs::read_to_string(&path).unwrap();
            for (idx, _) in isi.match_indices("status_pendaftaran = '") {
                let mulai = idx + "status_pendaftaran = '".len();
                let nilai: String = isi[mulai..].chars().take_while(|c| *c != '\'').collect();
                if !db.contains(&nilai) {
                    pelanggaran.push(format!("{}: '{}'", path.display(), nilai));
                }
            }
        }
    }
    assert!(
        pelanggaran.is_empty(),
        "Literal status tidak sah: {pelanggaran:?}"
    );
}

#[test]
fn urutan_peringkat_mengikuti_alur_resmi() {
    let urutan = [
        status::DRAFT,
        status::SUBMITTED,
        status::MENUNGGU_VERIFIKASI_BAYAR,
        status::PEMBAYARAN_DISETUJUI,
        status::MENUNGGU_VERIFIKASI_BERKAS,
        status::BERKAS_VERIFIED,
        status::MENUNGGU_PENGUMUMAN,
        status::LULUS,
        status::MENUNGGU_VERIFIKASI_DAFTAR_ULANG,
        status::DAFTAR_ULANG_LUNAS,
        status::TERDAFTAR,
    ];
    for pasangan in urutan.windows(2) {
        assert!(
            peringkat(pasangan[0]) < peringkat(pasangan[1]),
            "{} harus sebelum {}",
            pasangan[0],
            pasangan[1]
        );
    }
}

#[test]
fn gerbang_tidak_tumpang_tindih() {
    // Tahap unggah bukti formulir, unggah berkas, dan ujian harus saling lepas.
    for s in status::BOLEH_UNGGAH_BUKTI_FORMULIR {
        assert!(!status::BOLEH_UNGGAH_BERKAS.contains(s));
        assert!(!status::BOLEH_UJIAN.contains(s));
    }
    for s in status::BOLEH_UNGGAH_BERKAS {
        assert!(!status::BOLEH_UJIAN.contains(s));
    }
    // Berkas hanya setelah pembayaran disetujui; ujian hanya setelah berkas terverifikasi.
    assert!(
        status::BOLEH_UNGGAH_BERKAS
            .iter()
            .all(|s| peringkat(s) >= peringkat(status::PEMBAYARAN_DISETUJUI))
    );
    assert!(
        status::BOLEH_UJIAN
            .iter()
            .all(|s| peringkat(s) >= peringkat(status::BERKAS_VERIFIED))
    );
}

#[test]
fn stepper_tepat_satu_langkah_aktif_untuk_setiap_status() {
    for s in SEMUA_STATUS {
        let alur = bangun_alur(&KonteksAlur {
            status_pendaftaran: Some(s.to_string()),
            ..Default::default()
        });
        assert_eq!(alur.langkah.len(), 9, "status {s}");
        // Langkah sebelum langkah aktif harus selesai semuanya
        if let Some(aktif) = &alur.langkah_aktif {
            let pos = alur.langkah.iter().position(|l| &l.kode == aktif).unwrap();
            assert!(
                alur.langkah[..pos]
                    .iter()
                    .all(|l| l.status == StatusLangkah::Selesai),
                "status {s}: ada langkah belum selesai sebelum '{aktif}'"
            );
        }
    }
}

#[test]
fn urutan_langkah_buat_akun_lalu_pilih_jalur() {
    let alur = bangun_alur(&KonteksAlur::default());
    let kode: Vec<&str> = alur.langkah.iter().map(|l| l.kode.as_str()).collect();
    assert_eq!(
        kode,
        [
            "buat_akun",
            "pilih_jalur",
            "formulir",
            "pembayaran",
            "berkas",
            "ujian",
            "pengumuman",
            "bayar_daftar_ulang",
            "registrasi_ulang"
        ]
    );
}
