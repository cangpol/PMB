use calamine::{Data, Reader, Xlsx};
use std::io::Cursor;

use crate::modules::cbt::dto::{CreateSoalRequest, ErrorBarisImport, SoalOpsiDto};

pub struct ExcelSoalImporter;

impl ExcelSoalImporter {
    pub fn parse_file(
        bytes: &[u8],
        file_name: &str,
    ) -> Result<(Vec<CreateSoalRequest>, Vec<ErrorBarisImport>), String> {
        let lower = file_name.to_lowercase();
        if lower.ends_with(".csv") {
            Self::parse_csv(bytes)
        } else {
            Self::parse_xlsx(bytes)
        }
    }

    pub fn parse_xlsx(
        bytes: &[u8],
    ) -> Result<(Vec<CreateSoalRequest>, Vec<ErrorBarisImport>), String> {
        let cursor = Cursor::new(bytes);
        let mut workbook: Xlsx<_> =
            Xlsx::new(cursor).map_err(|e| format!("Gagal membaca berkas Excel: {}", e))?;

        let sheet_names = workbook.sheet_names();
        let sheet_name = sheet_names
            .first()
            .ok_or_else(|| "Berkas Excel tidak memiliki sheet".to_string())?
            .clone();

        let range = workbook
            .worksheet_range(&sheet_name)
            .map_err(|e| format!("Gagal membuka worksheet {}: {}", sheet_name, e))?;

        let mut valid_soal = Vec::new();
        let mut error_rows = Vec::new();

        let mut rows = range.rows();
        // Lewati baris header jika ada
        let _header = rows.next();

        let mut row_num = 2; // Baris kedua adalah baris data pertama di Excel
        for row in rows {
            if row.is_empty() {
                row_num += 1;
                continue;
            }

            let get_col = |idx: usize| -> String {
                row.get(idx)
                    .map(|d| match d {
                        Data::String(s) => s.trim().to_string(),
                        Data::Int(i) => i.to_string(),
                        Data::Float(f) => {
                            if (f.round() - f).abs() < f64::EPSILON {
                                (f.round() as i64).to_string()
                            } else {
                                f.to_string()
                            }
                        }
                        _ => d.to_string().trim().to_string(),
                    })
                    .unwrap_or_default()
            };

            let kategori = get_col(0);
            let kesulitan = get_col(1);
            let pertanyaan = get_col(2);
            let opsi_a = get_col(3);
            let opsi_b = get_col(4);
            let opsi_c = get_col(5);
            let opsi_d = get_col(6);
            let opsi_e = get_col(7);
            let kunci = get_col(8).to_uppercase();
            let bobot_str = get_col(9);
            let pembahasan = get_col(10);

            // Jika baris kosong semua, lewati
            if kategori.is_empty() && pertanyaan.is_empty() && opsi_a.is_empty() {
                row_num += 1;
                continue;
            }

            match Self::validate_and_build(
                row_num,
                &kategori,
                &kesulitan,
                &pertanyaan,
                &opsi_a,
                &opsi_b,
                &opsi_c,
                &opsi_d,
                &opsi_e,
                &kunci,
                &bobot_str,
                &pembahasan,
            ) {
                Ok(soal) => valid_soal.push(soal),
                Err(err) => error_rows.push(err),
            }

            row_num += 1;
        }

        Ok((valid_soal, error_rows))
    }

    pub fn parse_csv(
        bytes: &[u8],
    ) -> Result<(Vec<CreateSoalRequest>, Vec<ErrorBarisImport>), String> {
        let mut rdr = csv::ReaderBuilder::new()
            .has_headers(true)
            .flexible(true)
            .from_reader(bytes);

        let mut valid_soal = Vec::new();
        let mut error_rows = Vec::new();

        let mut row_num = 2;
        for result in rdr.records() {
            let record = match result {
                Ok(rec) => rec,
                Err(e) => {
                    error_rows.push(ErrorBarisImport {
                        baris: row_num,
                        pesan: format!("Format baris CSV tidak valid: {}", e),
                    });
                    row_num += 1;
                    continue;
                }
            };

            let get_col = |idx: usize| -> String {
                record
                    .get(idx)
                    .map(|s| s.trim().to_string())
                    .unwrap_or_default()
            };

            let kategori = get_col(0);
            let kesulitan = get_col(1);
            let pertanyaan = get_col(2);
            let opsi_a = get_col(3);
            let opsi_b = get_col(4);
            let opsi_c = get_col(5);
            let opsi_d = get_col(6);
            let opsi_e = get_col(7);
            let kunci = get_col(8).to_uppercase();
            let bobot_str = get_col(9);
            let pembahasan = get_col(10);

            if kategori.is_empty() && pertanyaan.is_empty() && opsi_a.is_empty() {
                row_num += 1;
                continue;
            }

            match Self::validate_and_build(
                row_num,
                &kategori,
                &kesulitan,
                &pertanyaan,
                &opsi_a,
                &opsi_b,
                &opsi_c,
                &opsi_d,
                &opsi_e,
                &kunci,
                &bobot_str,
                &pembahasan,
            ) {
                Ok(soal) => valid_soal.push(soal),
                Err(err) => error_rows.push(err),
            }

            row_num += 1;
        }

        Ok((valid_soal, error_rows))
    }

    #[allow(clippy::too_many_arguments)]
    fn validate_and_build(
        row_num: usize,
        kategori: &str,
        kesulitan: &str,
        pertanyaan: &str,
        opsi_a: &str,
        opsi_b: &str,
        opsi_c: &str,
        opsi_d: &str,
        opsi_e: &str,
        kunci: &str,
        bobot_str: &str,
        pembahasan: &str,
    ) -> Result<CreateSoalRequest, ErrorBarisImport> {
        if kategori.is_empty() {
            return Err(ErrorBarisImport {
                baris: row_num,
                pesan: "Kolom 'Kategori' wajib diisi".to_string(),
            });
        }

        if pertanyaan.is_empty() {
            return Err(ErrorBarisImport {
                baris: row_num,
                pesan: "Kolom 'Pertanyaan' wajib diisi".to_string(),
            });
        }

        if opsi_a.is_empty() || opsi_b.is_empty() {
            return Err(ErrorBarisImport {
                baris: row_num,
                pesan: "Pilihan Opsi A dan Opsi B wajib diisi".to_string(),
            });
        }

        let mut opsi_list = vec![
            SoalOpsiDto {
                id: "A".to_string(),
                label: "A".to_string(),
                teks: opsi_a.to_string(),
                gambar_url: None,
            },
            SoalOpsiDto {
                id: "B".to_string(),
                label: "B".to_string(),
                teks: opsi_b.to_string(),
                gambar_url: None,
            },
        ];

        if !opsi_c.is_empty() {
            opsi_list.push(SoalOpsiDto {
                id: "C".to_string(),
                label: "C".to_string(),
                teks: opsi_c.to_string(),
                gambar_url: None,
            });
        }
        if !opsi_d.is_empty() {
            opsi_list.push(SoalOpsiDto {
                id: "D".to_string(),
                label: "D".to_string(),
                teks: opsi_d.to_string(),
                gambar_url: None,
            });
        }
        if !opsi_e.is_empty() {
            opsi_list.push(SoalOpsiDto {
                id: "E".to_string(),
                label: "E".to_string(),
                teks: opsi_e.to_string(),
                gambar_url: None,
            });
        }

        let valid_labels: Vec<&str> = opsi_list.iter().map(|o| o.label.as_str()).collect();
        if !valid_labels.contains(&kunci) {
            return Err(ErrorBarisImport {
                baris: row_num,
                pesan: format!(
                    "Kunci jawaban '{}' tidak valid. Harus salah satu dari: {}",
                    kunci,
                    valid_labels.join(", ")
                ),
            });
        }

        let bobot = if bobot_str.is_empty() {
            1.0
        } else {
            bobot_str.parse::<f64>().map_err(|_| ErrorBarisImport {
                baris: row_num,
                pesan: format!("Bobot nilai '{}' bukan angka numerik valid", bobot_str),
            })?
        };

        if bobot <= 0.0 {
            return Err(ErrorBarisImport {
                baris: row_num,
                pesan: "Bobot nilai harus lebih besar dari 0".to_string(),
            });
        }

        let normalized_kesulitan = match kesulitan.to_uppercase().as_str() {
            "MUDAH" | "EASY" => "MUDAH",
            "SULIT" | "HARD" => "SULIT",
            _ => "SEDANG",
        };

        Ok(CreateSoalRequest {
            kategori: kategori.to_string(),
            tingkat_kesulitan: normalized_kesulitan.to_string(),
            pertanyaan: pertanyaan.to_string(),
            gambar_url: None,
            opsi_jawaban: opsi_list,
            kunci_jawaban: kunci.to_string(),
            bobot: Some(bobot),
            pembahasan: if pembahasan.is_empty() {
                None
            } else {
                Some(pembahasan.to_string())
            },
        })
    }
}
