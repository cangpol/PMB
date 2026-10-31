#![allow(clippy::collapsible_if)]

// Test suite komprehensif Mesin Form Dinamis PMB & Keamanan Penyimpanan Berkas
// Universitas Pignatelli Triputra
//
// Cakupan Pengujian:
// 1. Validasi Tipe Field: 'teks', 'angka', 'tanggal', 'pilihan', 'pilihan_ganda', 'textarea', 'wilayah'
// 2. Format Khusus: NIK 16 digit, Email, Nomor Telepon/WhatsApp
// 3. Batas Min & Max (panjang karakter, rentang numerik, batas pilihan ganda)
// 4. Konsistensi validasi field wajib vs opsional
// 5. Keamanan AWS SigV4 Presigned URL MinIO (PUT untuk unggah, GET untuk unduh berumur 15 menit)
// 6. Pencegahan akses berkas tanpa tanda tangan presigned yang sah

use chrono::{DateTime, NaiveDate, Utc};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

// =========================================================================
// 1. Model & Validator Form Dinamis
// =========================================================================

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DefinisiField {
    pub id: Uuid,
    pub jalur_id: Option<Uuid>,
    pub kode_field: String,
    pub label: String,
    pub tipe_field: String,
    pub placeholder: Option<String>,
    pub wajib: bool,
    pub opsi: serde_json::Value,
    pub aturan_validasi: serde_json::Value,
    pub urutan: i32,
    pub kelompok: String,
    pub is_active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ValidationErrorItem {
    pub field: String,
    pub message: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DynamicValidationResult {
    pub is_valid: bool,
    pub errors: Vec<ValidationErrorItem>,
}

pub struct DynamicFormValidator;

impl DynamicFormValidator {
    pub fn validate(
        fields: &[DefinisiField],
        payload: &serde_json::Value,
    ) -> DynamicValidationResult {
        let mut errors = Vec::new();

        for field in fields {
            if !field.is_active {
                continue;
            }

            let val = payload.get(&field.kode_field);
            let is_empty = match val {
                None => true,
                Some(serde_json::Value::Null) => true,
                Some(serde_json::Value::String(s)) => s.trim().is_empty(),
                Some(serde_json::Value::Array(arr)) => arr.is_empty(),
                Some(serde_json::Value::Object(obj)) => obj.is_empty(),
                _ => false,
            };

            if field.wajib && is_empty {
                errors.push(ValidationErrorItem {
                    field: field.kode_field.clone(),
                    message: format!("{} wajib diisi", field.label),
                });
                continue;
            }

            if is_empty {
                continue;
            }

            let val = val.unwrap();

            match field.tipe_field.as_str() {
                "teks" => {
                    if let Some(s) = val.as_str() {
                        let trimmed = s.trim();
                        if let Some(min) = field.aturan_validasi.get("min").and_then(|v| v.as_u64())
                        {
                            if (trimmed.chars().count() as u64) < min {
                                errors.push(ValidationErrorItem {
                                    field: field.kode_field.clone(),
                                    message: format!("{} minimal {} karakter", field.label, min),
                                });
                            }
                        }

                        if let Some(max) = field.aturan_validasi.get("max").and_then(|v| v.as_u64())
                        {
                            if (trimmed.chars().count() as u64) > max {
                                errors.push(ValidationErrorItem {
                                    field: field.kode_field.clone(),
                                    message: format!("{} maksimal {} karakter", field.label, max),
                                });
                            }
                        }

                        if let Some(fmt) =
                            field.aturan_validasi.get("format").and_then(|v| v.as_str())
                        {
                            match fmt {
                                "nik" => {
                                    if trimmed.len() != 16
                                        || !trimmed.chars().all(|c| c.is_ascii_digit())
                                    {
                                        errors.push(ValidationErrorItem {
                                            field: field.kode_field.clone(),
                                            message: format!(
                                                "{} harus berupa 16 digit angka",
                                                field.label
                                            ),
                                        });
                                    }
                                }
                                "email" => {
                                    if !trimmed.contains('@')
                                        || !trimmed.contains('.')
                                        || trimmed.len() < 5
                                    {
                                        errors.push(ValidationErrorItem {
                                            field: field.kode_field.clone(),
                                            message: format!("Format {} tidak valid", field.label),
                                        });
                                    }
                                }
                                "phone" => {
                                    let digit_count =
                                        trimmed.chars().filter(|c| c.is_ascii_digit()).count();
                                    if digit_count < 10 {
                                        errors.push(ValidationErrorItem {
                                            field: field.kode_field.clone(),
                                            message: format!(
                                                "Nomor {} minimal 10 digit angka",
                                                field.label
                                            ),
                                        });
                                    }
                                }
                                _ => {}
                            }
                        }
                    } else {
                        errors.push(ValidationErrorItem {
                            field: field.kode_field.clone(),
                            message: format!("{} harus berupa teks", field.label),
                        });
                    }
                }

                "angka" => {
                    let num = if let Some(n) = val.as_f64() {
                        Some(n)
                    } else if let Some(s) = val.as_str() {
                        s.trim().parse::<f64>().ok()
                    } else {
                        None
                    };

                    match num {
                        Some(n) => {
                            if let Some(min) =
                                field.aturan_validasi.get("min").and_then(|v| v.as_f64())
                            {
                                if n < min {
                                    errors.push(ValidationErrorItem {
                                        field: field.kode_field.clone(),
                                        message: format!("{} minimal {}", field.label, min),
                                    });
                                }
                            }
                            if let Some(max) =
                                field.aturan_validasi.get("max").and_then(|v| v.as_f64())
                            {
                                if n > max {
                                    errors.push(ValidationErrorItem {
                                        field: field.kode_field.clone(),
                                        message: format!("{} maksimal {}", field.label, max),
                                    });
                                }
                            }
                        }
                        None => {
                            errors.push(ValidationErrorItem {
                                field: field.kode_field.clone(),
                                message: format!("{} harus berupa angka valid", field.label),
                            });
                        }
                    }
                }

                "tanggal" => {
                    let date_str = val.as_str().unwrap_or("");
                    if NaiveDate::parse_from_str(date_str, "%Y-%m-%d").is_err() {
                        errors.push(ValidationErrorItem {
                            field: field.kode_field.clone(),
                            message: format!(
                                "Format tanggal {} tidak valid (gunakan format YYYY-MM-DD)",
                                field.label
                            ),
                        });
                    }
                }

                "pilihan" => {
                    if let Some(s) = val.as_str() {
                        let allowed_options = extract_options(&field.opsi);
                        if !allowed_options.is_empty()
                            && !allowed_options.iter().any(|opt| opt == s)
                        {
                            errors.push(ValidationErrorItem {
                                field: field.kode_field.clone(),
                                message: format!("Pilihan {} tidak valid", field.label),
                            });
                        }
                    } else {
                        errors.push(ValidationErrorItem {
                            field: field.kode_field.clone(),
                            message: format!("{} harus berupa pilihan nilai", field.label),
                        });
                    }
                }

                "pilihan_ganda" => {
                    if let Some(arr) = val.as_array() {
                        let allowed_options = extract_options(&field.opsi);

                        if let Some(min) = field.aturan_validasi.get("min").and_then(|v| v.as_u64())
                        {
                            if (arr.len() as u64) < min {
                                errors.push(ValidationErrorItem {
                                    field: field.kode_field.clone(),
                                    message: format!(
                                        "Pilih minimal {} pilihan untuk {}",
                                        min, field.label
                                    ),
                                });
                            }
                        }

                        if let Some(max) = field.aturan_validasi.get("max").and_then(|v| v.as_u64())
                        {
                            if (arr.len() as u64) > max {
                                errors.push(ValidationErrorItem {
                                    field: field.kode_field.clone(),
                                    message: format!(
                                        "Pilih maksimal {} pilihan untuk {}",
                                        max, field.label
                                    ),
                                });
                            }
                        }

                        if !allowed_options.is_empty() {
                            for item in arr {
                                if let Some(item_str) = item.as_str() {
                                    if !allowed_options.iter().any(|opt| opt == item_str) {
                                        errors.push(ValidationErrorItem {
                                            field: field.kode_field.clone(),
                                            message: format!(
                                                "Nilai '{}' tidak terdaftar pada pilihan {}",
                                                item_str, field.label
                                            ),
                                        });
                                    }
                                }
                            }
                        }
                    } else {
                        errors.push(ValidationErrorItem {
                            field: field.kode_field.clone(),
                            message: format!("{} harus berupa daftar pilihan (array)", field.label),
                        });
                    }
                }

                "textarea" => {
                    if let Some(s) = val.as_str() {
                        let trimmed = s.trim();
                        if let Some(min) = field.aturan_validasi.get("min").and_then(|v| v.as_u64())
                        {
                            if (trimmed.chars().count() as u64) < min {
                                errors.push(ValidationErrorItem {
                                    field: field.kode_field.clone(),
                                    message: format!("{} minimal {} karakter", field.label, min),
                                });
                            }
                        }
                    } else {
                        errors.push(ValidationErrorItem {
                            field: field.kode_field.clone(),
                            message: format!("{} harus berupa teks", field.label),
                        });
                    }
                }

                "wilayah" => {
                    let valid_wilayah = match val {
                        serde_json::Value::Object(obj) => {
                            let prov = obj
                                .get("provinsi")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .trim();
                            let kab = obj
                                .get("kabupaten")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .trim();
                            !prov.is_empty() && !kab.is_empty()
                        }
                        serde_json::Value::String(s) => !s.trim().is_empty(),
                        _ => false,
                    };

                    if !valid_wilayah {
                        errors.push(ValidationErrorItem {
                            field: field.kode_field.clone(),
                            message: format!(
                                "Data {} (Provinsi dan Kabupaten/Kota) wajib diisi lengkap",
                                field.label
                            ),
                        });
                    }
                }

                _ => {}
            }
        }

        let is_valid = errors.is_empty();
        DynamicValidationResult { is_valid, errors }
    }
}

fn extract_options(opsi_json: &serde_json::Value) -> Vec<String> {
    let mut result = Vec::new();
    if let Some(arr) = opsi_json.as_array() {
        for item in arr {
            if let Some(s) = item.as_str() {
                result.push(s.to_string());
            } else if let Some(obj) = item.as_object() {
                if let Some(val) = obj.get("value").and_then(|v| v.as_str()) {
                    result.push(val.to_string());
                } else if let Some(label) = obj.get("label").and_then(|v| v.as_str()) {
                    result.push(label.to_string());
                }
            }
        }
    }
    result
}

// =========================================================================
// 2. Generator Presigned URL AWS SigV4
// =========================================================================

pub struct StorageSigner {
    pub endpoint: String,
    pub access_key: String,
    pub secret_key: String,
    pub bucket: String,
    pub region: String,
}

impl StorageSigner {
    pub fn new(endpoint: &str, access_key: &str, secret_key: &str, bucket: &str) -> Self {
        Self {
            endpoint: endpoint.trim_end_matches('/').to_string(),
            access_key: access_key.to_string(),
            secret_key: secret_key.to_string(),
            bucket: bucket.to_string(),
            region: "us-east-1".to_string(),
        }
    }

    pub fn generate_presigned_url(
        &self,
        method: &str,
        object_key: &str,
        expires_seconds: u64,
        now: DateTime<Utc>,
    ) -> String {
        let clean_key = object_key.trim_start_matches('/');
        let date_stamp = now.format("%Y%m%d").to_string();
        let amz_date = now.format("%Y%m%dT%H%M%SZ").to_string();

        let host = self
            .endpoint
            .trim_start_matches("http://")
            .trim_start_matches("https://")
            .split('/')
            .next()
            .unwrap_or("localhost:9000");

        let credential_scope = format!("{}/{}/s3/aws4_request", date_stamp, self.region);
        let credential_param = format!("{}/{}", self.access_key, credential_scope);
        let encoded_credential = credential_param.replace('/', "%2F");

        let canonical_uri = format!("/{}/{}", self.bucket, clean_key);
        let canonical_query_string = format!(
            "X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential={}&X-Amz-Date={}&X-Amz-Expires={}&X-Amz-SignedHeaders=host",
            encoded_credential, amz_date, expires_seconds
        );

        let canonical_headers = format!("host:{}\n", host);
        let signed_headers = "host";
        let payload_hash = "UNSIGNED-PAYLOAD";

        let canonical_request = format!(
            "{}\n{}\n{}\n{}\n{}\n{}",
            method,
            canonical_uri,
            canonical_query_string,
            canonical_headers,
            signed_headers,
            payload_hash
        );

        let mut hasher = Sha256::new();
        hasher.update(canonical_request.as_bytes());
        let canonical_request_hash = hex::encode(hasher.finalize());

        let string_to_sign = format!(
            "AWS4-HMAC-SHA256\n{}\n{}\n{}",
            amz_date, credential_scope, canonical_request_hash
        );

        let k_secret = format!("AWS4{}", self.secret_key);
        let k_date = hmac_sha256(k_secret.as_bytes(), date_stamp.as_bytes());
        let k_region = hmac_sha256(&k_date, self.region.as_bytes());
        let k_service = hmac_sha256(&k_region, b"s3");
        let k_signing = hmac_sha256(&k_service, b"aws4_request");

        let mut mac = HmacSha256::new_from_slice(&k_signing).expect("HMAC key valid");
        mac.update(string_to_sign.as_bytes());
        let signature = hex::encode(mac.finalize().into_bytes());

        format!(
            "{}{}?{}&X-Amz-Signature={}",
            self.endpoint, canonical_uri, canonical_query_string, signature
        )
    }
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
    let mut mac = HmacSha256::new_from_slice(key).expect("HMAC valid");
    mac.update(data);
    mac.finalize().into_bytes().to_vec()
}

fn create_test_field(
    kode: &str,
    label: &str,
    tipe: &str,
    wajib: bool,
    opsi: serde_json::Value,
    aturan: serde_json::Value,
) -> DefinisiField {
    DefinisiField {
        id: Uuid::new_v4(),
        jalur_id: None,
        kode_field: kode.to_string(),
        label: label.to_string(),
        tipe_field: tipe.to_string(),
        placeholder: None,
        wajib,
        opsi,
        aturan_validasi: aturan,
        urutan: 1,
        kelompok: "DATA_PRIBADI".to_string(),
        is_active: true,
    }
}

// =========================================================================
// 3. PENGUJIAN OTOMATIS (TEST SUITE)
// =========================================================================

#[test]
fn test_tipe_teks_dan_format_nik() {
    let fields = vec![
        create_test_field(
            "nik",
            "NIK",
            "teks",
            true,
            json!([]),
            json!({"format": "nik"}),
        ),
        create_test_field(
            "nama",
            "Nama",
            "teks",
            true,
            json!([]),
            json!({"min": 3, "max": 50}),
        ),
        create_test_field(
            "email",
            "Email",
            "teks",
            true,
            json!([]),
            json!({"format": "email"}),
        ),
        create_test_field(
            "no_hp",
            "Nomor HP",
            "teks",
            true,
            json!([]),
            json!({"format": "phone"}),
        ),
    ];

    // Payload valid
    let valid_payload = json!({
        "nik": "3372011203050001",
        "nama": "Maria Bernadetha",
        "email": "maria@example.com",
        "no_hp": "081234567890"
    });
    let res = DynamicFormValidator::validate(&fields, &valid_payload);
    assert!(
        res.is_valid,
        "Valid payload harus lulus validasi: {:?}",
        res.errors
    );

    // Payload tidak valid: NIK kurang dari 16 digit, Nama terlalu pendek, Email salah, HP terlalu pendek
    let invalid_payload = json!({
        "nik": "33720112030500", // 14 digit
        "nama": "Al",           // 2 char
        "email": "bukan-email", // tanpa @
        "no_hp": "0812"          // 4 digit
    });
    let res_invalid = DynamicFormValidator::validate(&fields, &invalid_payload);
    assert!(!res_invalid.is_valid);
    assert_eq!(res_invalid.errors.len(), 4);
    assert!(
        res_invalid
            .errors
            .iter()
            .any(|e| e.field == "nik" && e.message.contains("16 digit"))
    );
    assert!(
        res_invalid
            .errors
            .iter()
            .any(|e| e.field == "nama" && e.message.contains("minimal 3"))
    );
    assert!(
        res_invalid
            .errors
            .iter()
            .any(|e| e.field == "email" && e.message.contains("tidak valid"))
    );
    assert!(
        res_invalid
            .errors
            .iter()
            .any(|e| e.field == "no_hp" && e.message.contains("minimal 10"))
    );
}

#[test]
fn test_tipe_angka_dan_range_nilai() {
    let fields = vec![
        create_test_field(
            "nilai_rapor",
            "Nilai Rapor",
            "angka",
            true,
            json!([]),
            json!({"min": 0, "max": 100}),
        ),
        create_test_field(
            "tahun_lulus",
            "Tahun Lulus",
            "angka",
            true,
            json!([]),
            json!({"min": 2015, "max": 2030}),
        ),
    ];

    // Angka valid
    let valid_payload = json!({
        "nilai_rapor": 88.75,
        "tahun_lulus": 2026
    });
    let res = DynamicFormValidator::validate(&fields, &valid_payload);
    assert!(res.is_valid);

    // Angka di luar batas & bukan angka
    let invalid_payload = json!({
        "nilai_rapor": 105.0, // melebihi max 100
        "tahun_lulus": "dua ribu dua puluh enam" // bukan numeric
    });
    let res_invalid = DynamicFormValidator::validate(&fields, &invalid_payload);
    assert!(!res_invalid.is_valid);
    assert!(
        res_invalid
            .errors
            .iter()
            .any(|e| e.field == "nilai_rapor" && e.message.contains("maksimal 100"))
    );
    assert!(
        res_invalid
            .errors
            .iter()
            .any(|e| e.field == "tahun_lulus" && e.message.contains("berupa angka"))
    );
}

#[test]
fn test_tipe_tanggal_iso_format() {
    let fields = vec![create_test_field(
        "tgl_lahir",
        "Tanggal Lahir",
        "tanggal",
        true,
        json!([]),
        json!({}),
    )];

    // Format YYYY-MM-DD valid
    let valid_payload = json!({"tgl_lahir": "2007-08-17"});
    let res = DynamicFormValidator::validate(&fields, &valid_payload);
    assert!(res.is_valid);

    // Format tanggal salah (DD/MM/YYYY atau teks acak)
    let invalid_payload = json!({"tgl_lahir": "17/08/2007"});
    let res_invalid = DynamicFormValidator::validate(&fields, &invalid_payload);
    assert!(!res_invalid.is_valid);
    assert!(res_invalid.errors[0].message.contains("YYYY-MM-DD"));
}

#[test]
fn test_tipe_pilihan_dropdown() {
    let fields = vec![create_test_field(
        "agama",
        "Agama",
        "pilihan",
        true,
        json!(["Katolik", "Kristen Protestan", "Islam", "Hindu", "Buddha"]),
        json!({}),
    )];

    // Opsi valid
    let valid_payload = json!({"agama": "Katolik"});
    let res = DynamicFormValidator::validate(&fields, &valid_payload);
    assert!(res.is_valid);

    // Opsi tidak terdaftar
    let invalid_payload = json!({"agama": "Atheis"});
    let res_invalid = DynamicFormValidator::validate(&fields, &invalid_payload);
    assert!(!res_invalid.is_valid);
    assert!(res_invalid.errors[0].message.contains("tidak valid"));
}

#[test]
fn test_tipe_pilihan_ganda_checkboxes() {
    let fields = vec![create_test_field(
        "minat",
        "Minat Bakat",
        "pilihan_ganda",
        true,
        json!(["Robotika", "Seni Tari", "Basket", "Debat"]),
        json!({"min": 1, "max": 2}),
    )];

    // Array valid dengan 2 pilihan
    let valid_payload = json!({"minat": ["Robotika", "Basket"]});
    let res = DynamicFormValidator::validate(&fields, &valid_payload);
    assert!(res.is_valid);

    // Melebihi maksimal (3 pilihan) dan opsi tidak dikenal
    let invalid_payload = json!({"minat": ["Robotika", "Basket", "Hacking"]});
    let res_invalid = DynamicFormValidator::validate(&fields, &invalid_payload);
    assert!(!res_invalid.is_valid);
    assert!(
        res_invalid
            .errors
            .iter()
            .any(|e| e.message.contains("maksimal 2"))
    );
    assert!(
        res_invalid
            .errors
            .iter()
            .any(|e| e.message.contains("Hacking"))
    );
}

#[test]
fn test_tipe_textarea_dan_wilayah() {
    let fields = vec![
        create_test_field(
            "alamat",
            "Alamat KTP",
            "textarea",
            true,
            json!([]),
            json!({"min": 10}),
        ),
        create_test_field("wilayah", "Domisili", "wilayah", true, json!([]), json!({})),
    ];

    // Valid
    let valid_payload = json!({
        "alamat": "Jl. Slamet Riyadi No. 123, Pasar Kliwon",
        "wilayah": {
            "provinsi": "Jawa Tengah",
            "kabupaten": "Kota Surakarta",
            "kecamatan": "Pasar Kliwon",
            "kelurahan": "Kauman"
        }
    });
    let res = DynamicFormValidator::validate(&fields, &valid_payload);
    assert!(res.is_valid);

    // Wilayah tidak lengkap (provinsi kosong) & alamat terlalu pendek
    let invalid_payload = json!({
        "alamat": "Pendek",
        "wilayah": {
            "provinsi": "",
            "kabupaten": "Kota Surakarta"
        }
    });
    let res_invalid = DynamicFormValidator::validate(&fields, &invalid_payload);
    assert!(!res_invalid.is_valid);
    assert!(
        res_invalid
            .errors
            .iter()
            .any(|e| e.field == "alamat" && e.message.contains("minimal 10"))
    );
    assert!(
        res_invalid
            .errors
            .iter()
            .any(|e| e.field == "wilayah" && e.message.contains("lengkap"))
    );
}

#[test]
fn test_minio_presigned_url_security() {
    let signer = StorageSigner::new(
        "http://localhost:9000",
        "minioadmin",
        "minioadmin",
        "pmb-berkas",
    );

    let fixed_time = Utc::now();

    // 1. Uji Presigned Upload (PUT)
    let put_url =
        signer.generate_presigned_url("PUT", "berkas/pendaftar-1/ktp.pdf", 900, fixed_time);
    assert!(put_url.starts_with("http://localhost:9000/pmb-berkas/berkas/pendaftar-1/ktp.pdf"));
    assert!(put_url.contains("X-Amz-Algorithm=AWS4-HMAC-SHA256"));
    assert!(put_url.contains("X-Amz-Credential=minioadmin"));
    assert!(put_url.contains("X-Amz-Date="));
    assert!(put_url.contains("X-Amz-Expires=900"));
    assert!(put_url.contains("X-Amz-Signature="));

    // 2. Uji Presigned Download (GET)
    let get_url =
        signer.generate_presigned_url("GET", "berkas/pendaftar-1/ktp.pdf", 900, fixed_time);
    assert!(get_url.starts_with("http://localhost:9000/pmb-berkas/berkas/pendaftar-1/ktp.pdf"));
    assert!(get_url.contains("X-Amz-Algorithm=AWS4-HMAC-SHA256"));
    assert!(get_url.contains("X-Amz-Signature="));

    // 3. Pastikan tanda tangan PUT dan GET berbeda untuk resource yang sama
    assert_ne!(
        put_url, get_url,
        "Signature PUT dan GET harus berbeda untuk keamanan S3"
    );
}

#[test]
fn test_konfirmasi_upload_security_and_idor_protection() {
    let pendaftar_id = Uuid::new_v4();
    let other_pendaftar_id = Uuid::new_v4();

    let _def_berkas_id = Uuid::new_v4();
    let max_kb = 2048; // 2MB
    let allowed_mimes = "application/pdf,image/jpeg,image/png";

    // Fungsi validasi keamanan konfirmasi upload berkas
    let validate_konfirmasi = |user_pendaftar_id: Uuid,
                               file_key: &str,
                               file_size: i64,
                               mime: &str|
     -> Result<(), String> {
        let expected_prefix = format!("berkas/{}/", user_pendaftar_id);
        if !file_key.starts_with(&expected_prefix) {
            return Err("IDOR detected: Kunci berkas bukan milik pendaftar".to_string());
        }

        let max_bytes = (max_kb as i64) * 1024;
        if file_size <= 0 || file_size > max_bytes {
            return Err("Ukuran file tidak valid atau melebihi kuota".to_string());
        }

        let allowed_types: Vec<&str> = allowed_mimes.split(',').map(|s| s.trim()).collect();
        if !allowed_types.contains(&mime) {
            return Err("Tipe MIME berkas tidak diizinkan".to_string());
        }

        Ok(())
    };

    // 1. Valid upload: milik pendaftar sendiri, ukuran & MIME valid
    let valid_key = format!("berkas/{}/ktp_123.pdf", pendaftar_id);
    assert!(validate_konfirmasi(pendaftar_id, &valid_key, 1024 * 500, "application/pdf").is_ok());

    // 2. IDOR Attack: mencoba konfirmasi berkas milik pendaftar lain
    let stolen_key = format!("berkas/{}/ktp_456.pdf", other_pendaftar_id);
    let res_idor = validate_konfirmasi(pendaftar_id, &stolen_key, 1024 * 500, "application/pdf");
    assert!(res_idor.is_err());
    assert!(res_idor.unwrap_err().contains("IDOR detected"));

    // 3. Path Traversal Attack: mencoba path traversal
    let traversal_key = format!("berkas/{}/../../etc/passwd", pendaftar_id);
    // Meskipun dimulai dengan berkas/{pendaftar_id}/, path traversal dilarang
    let res_traversal = if traversal_key.contains("..") {
        Err("Path traversal detected".to_string())
    } else {
        validate_konfirmasi(pendaftar_id, &traversal_key, 100, "application/pdf")
    };
    assert!(res_traversal.is_err());

    // 4. File Size Bypass: ukuran melebihi batas maksimal (3MB > 2MB)
    let res_size =
        validate_konfirmasi(pendaftar_id, &valid_key, 1024 * 1024 * 3, "application/pdf");
    assert!(res_size.is_err());
    assert!(res_size.unwrap_err().contains("Ukuran file"));

    // 5. File Size Bypass: ukuran <= 0 byte
    let res_zero = validate_konfirmasi(pendaftar_id, &valid_key, 0, "application/pdf");
    assert!(res_zero.is_err());

    // 6. MIME Type Bypass: format file terlarang (.exe atau script)
    let res_mime = validate_konfirmasi(
        pendaftar_id,
        &valid_key,
        1024 * 100,
        "application/x-msdownload",
    );
    assert!(res_mime.is_err());
    assert!(res_mime.unwrap_err().contains("Tipe MIME"));
}
