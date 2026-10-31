#![allow(clippy::collapsible_if)]

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::modules::pendaftaran::model::DefinisiField;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct ValidationErrorItem {
    pub field: String,
    pub message: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
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

            // Jika field tidak wajib dan kosong, lewati validasi aturan
            if is_empty {
                continue;
            }

            let val = val.unwrap();

            match field.tipe_field.as_str() {
                "teks" => {
                    if let Some(s) = val.as_str() {
                        let trimmed = s.trim();
                        // Validasi min length
                        if let Some(min) = field
                            .aturan_validasi
                            .get("min")
                            .and_then(|v| v.as_u64())
                            .or_else(|| {
                                field
                                    .aturan_validasi
                                    .get("min_length")
                                    .and_then(|v| v.as_u64())
                            })
                        {
                            if (trimmed.chars().count() as u64) < min {
                                errors.push(ValidationErrorItem {
                                    field: field.kode_field.clone(),
                                    message: format!("{} minimal {} karakter", field.label, min),
                                });
                            }
                        }

                        // Validasi max length
                        if let Some(max) = field
                            .aturan_validasi
                            .get("max")
                            .and_then(|v| v.as_u64())
                            .or_else(|| {
                                field
                                    .aturan_validasi
                                    .get("max_length")
                                    .and_then(|v| v.as_u64())
                            })
                        {
                            if (trimmed.chars().count() as u64) > max {
                                errors.push(ValidationErrorItem {
                                    field: field.kode_field.clone(),
                                    message: format!("{} maksimal {} karakter", field.label, max),
                                });
                            }
                        }

                        // Validasi format khusus (nik, email, phone)
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
                        let allowed_options: Vec<String> = extract_options(&field.opsi);
                        if !allowed_options.is_empty()
                            && !allowed_options.iter().any(|opt| opt == s)
                        {
                            errors.push(ValidationErrorItem {
                                field: field.kode_field.clone(),
                                message: format!(
                                    "Pilihan {} tidak valid. Opsi yang tersedia: {}",
                                    field.label,
                                    allowed_options.join(", ")
                                ),
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
                        let allowed_options: Vec<String> = extract_options(&field.opsi);

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
                        if let Some(min) = field
                            .aturan_validasi
                            .get("min")
                            .and_then(|v| v.as_u64())
                            .or_else(|| {
                                field
                                    .aturan_validasi
                                    .get("min_length")
                                    .and_then(|v| v.as_u64())
                            })
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
                    // Wilayah dapat berupa Object { provinsi: String, kabupaten: String, ... } atau String
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use serde_json::json;
    use uuid::Uuid;

    fn make_field(
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
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn test_validasi_nik_16_digit() {
        let field = make_field(
            "nik",
            "NIK",
            "teks",
            true,
            json!([]),
            json!({"format": "nik"}),
        );
        let fields = vec![field];

        // Valid
        let valid_payload = json!({"nik": "3372010101990001"});
        let res = DynamicFormValidator::validate(&fields, &valid_payload);
        assert!(res.is_valid);
        assert!(res.errors.is_empty());

        // Tidak valid (hanya 15 digit)
        let invalid_payload = json!({"nik": "337201010199000"});
        let res = DynamicFormValidator::validate(&fields, &invalid_payload);
        assert!(!res.is_valid);
        assert_eq!(res.errors[0].field, "nik");
    }

    #[test]
    fn test_validasi_pilihan() {
        let field = make_field(
            "agama",
            "Agama",
            "pilihan",
            true,
            json!(["Katolik", "Kristen Protestan"]),
            json!({}),
        );
        let fields = vec![field];

        let valid = json!({"agama": "Katolik"});
        let res = DynamicFormValidator::validate(&fields, &valid);
        assert!(res.is_valid);

        let invalid = json!({"agama": "AgamaTidakDikenal"});
        let res = DynamicFormValidator::validate(&fields, &invalid);
        assert!(!res.is_valid);
    }
}
