const fs = require('fs');
const path = require('path');

const openapiPath = path.resolve(__dirname, '../../api/openapi.json');
const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));

// 1. Tambahkan paths Konfigurasi Admin & Form Builder
const formBuilderPaths = {
  "/api/pendaftaran/fields": {
    "get": {
      "tags": ["Pendaftaran"],
      "summary": "Ambil definisi kolom form aktif",
      "operationId": "get_fields_handler",
      "parameters": [{ "name": "jalur_id", "in": "query", "required": false, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Daftar definisi field",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/DefinisiField" } } } }
        }
      }
    }
  },
  "/api/pendaftaran/submit-dinamis": {
    "post": {
      "tags": ["Pendaftaran"],
      "summary": "Simpan formulir pendaftaran dinamis",
      "operationId": "submit_formulir_dinamis_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/SubmitDinamisRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Formulir biodata berhasil disimpan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PendaftarDetailResponse" } } }
        }
      }
    }
  },
  "/api/pendaftaran/berkas/syarat": {
    "get": {
      "tags": ["Pendaftaran"],
      "summary": "Daftar syarat berkas dan status unggah calon",
      "operationId": "get_berkas_syarat_handler",
      "responses": {
        "200": {
          "description": "Daftar berkas",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/BerkasCalonItem" } } } }
        }
      }
    }
  },
  "/api/pendaftaran/berkas/presign-upload": {
    "post": {
      "tags": ["Pendaftaran"],
      "summary": "Minta Presigned PUT URL MinIO untuk unggah berkas",
      "operationId": "presign_upload_berkas_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PresignUploadRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Presigned PUT URL dihasilkan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PresignedUploadResponse" } } }
        }
      }
    }
  },
  "/api/pendaftaran/berkas/konfirmasi": {
    "post": {
      "tags": ["Pendaftaran"],
      "summary": "Konfirmasi unggahan berkas ke database",
      "operationId": "konfirmasi_upload_berkas_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/KonfirmasiUploadRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Berkas berhasil dikonfirmasi",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/BerkasCalonItem" } } }
        }
      }
    }
  },
  "/api/pendaftaran/berkas/{id}/presign-download": {
    "get": {
      "tags": ["Pendaftaran"],
      "summary": "Minta Presigned GET URL MinIO berumur pendek (15 menit)",
      "operationId": "presign_download_berkas_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Presigned GET URL dihasilkan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PresignedDownloadResponse" } } }
        }
      }
    }
  },
  "/api/pendaftaran/langkah": {
    "get": {
      "tags": ["Pendaftaran"],
      "summary": "Ambil progres alur langkah pendaftaran",
      "operationId": "get_langkah_progress_handler",
      "responses": {
        "200": {
          "description": "Daftar progress langkah",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/LangkahProgressItem" } } } }
        }
      }
    }
  },
  "/api/pendaftaran/pilih-prodi": {
    "post": {
      "tags": ["Pendaftaran"],
      "summary": "Pilih jalur, gelombang, dan prodi calon mahasiswa",
      "operationId": "pilih_prodi_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PilihProdiRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Pilihan berhasil disimpan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PendaftarDetailResponse" } } }
        }
      }
    }
  },
  "/api/pendaftaran/dashboard-summary": {
    "get": {
      "tags": ["Pendaftaran"],
      "summary": "Ambil ringkasan dashboard calon mahasiswa",
      "operationId": "get_dashboard_summary_handler",
      "responses": {
        "200": {
          "description": "Ringkasan dashboard",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DashboardSummaryResponse" } } }
        }
      }
    }
  },
  "/api/pendaftaran/admin/offline": {
    "post": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Input pendaftaran offline di loket PMB oleh panitia",
      "operationId": "admin_pendaftaran_offline_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PendaftaranOfflineRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Pendaftaran offline berhasil",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PendaftaranOfflineResponse" } } }
        }
      }
    }
  },
  "/api/pendaftaran/{id}/cetak/bukti-pendaftaran": {
    "get": {
      "tags": ["Pendaftaran Cetak"],
      "summary": "Cetak dokumen resmi Bukti Pendaftaran (PDF)",
      "operationId": "cetak_bukti_pendaftaran_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Berkas PDF Bukti Pendaftaran",
          "content": { "application/pdf": { "schema": { "type": "string", "format": "binary" } } }
        }
      }
    }
  },
  "/api/pendaftaran/{id}/cetak/kartu-peserta": {
    "get": {
      "tags": ["Pendaftaran Cetak"],
      "summary": "Cetak dokumen resmi Kartu Peserta Ujian (PDF)",
      "operationId": "cetak_kartu_peserta_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Berkas PDF Kartu Peserta Ujian",
          "content": { "application/pdf": { "schema": { "type": "string", "format": "binary" } } }
        }
      }
    }
  },
  "/api/pendaftaran/admin/form-builder/fields": {
    "get": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Daftar seluruh kolom form",
      "operationId": "admin_list_fields_handler",
      "parameters": [{ "name": "jalur_id", "in": "query", "required": false, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Daftar definisi field",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/DefinisiField" } } } }
        }
      }
    },
    "post": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Tambah kolom form baru",
      "operationId": "admin_create_field_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateDefinisiFieldRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Field berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DefinisiField" } } }
        }
      }
    }
  },
  "/api/pendaftaran/admin/form-builder/fields/{id}": {
    "put": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Ubah kolom form",
      "operationId": "admin_update_field_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateDefinisiFieldRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Field berhasil diperbarui",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DefinisiField" } } }
        }
      }
    },
    "delete": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Hapus kolom form",
      "operationId": "admin_delete_field_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": { "description": "Field berhasil dihapus" }
      }
    }
  },
  "/api/pendaftaran/admin/form-builder/fields/reorder": {
    "post": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Reorder urutan kolom form",
      "operationId": "admin_reorder_fields_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ReorderFieldsRequest" } } }
      },
      "responses": {
        "200": { "description": "Urutan berhasil diperbarui" }
      }
    }
  },
  "/api/pendaftaran/admin/form-builder/berkas": {
    "get": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Daftar syarat berkas",
      "operationId": "admin_list_definisi_berkas_handler",
      "parameters": [{ "name": "jalur_id", "in": "query", "required": false, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Daftar berkas",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/DefinisiBerkas" } } } }
        }
      }
    },
    "post": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Tambah syarat berkas baru",
      "operationId": "admin_create_definisi_berkas_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateDefinisiBerkasRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Definisi berkas berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DefinisiBerkas" } } }
        }
      }
    }
  },
  "/api/pendaftaran/admin/form-builder/berkas/{id}": {
    "put": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Ubah syarat berkas",
      "operationId": "admin_update_definisi_berkas_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateDefinisiBerkasRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Definisi berkas berhasil diperbarui",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DefinisiBerkas" } } }
        }
      }
    },
    "delete": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Hapus syarat berkas",
      "operationId": "admin_delete_definisi_berkas_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": { "description": "Definisi berkas berhasil dihapus" }
      }
    }
  },
  "/api/pendaftaran/admin/form-builder/langkah": {
    "get": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Daftar langkah alur pendaftaran",
      "operationId": "admin_list_definisi_langkah_handler",
      "parameters": [{ "name": "jalur_id", "in": "query", "required": false, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Daftar definisi langkah",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/DefinisiLangkah" } } } }
        }
      }
    },
    "post": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Tambah langkah pendaftaran baru",
      "operationId": "admin_create_definisi_langkah_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateDefinisiLangkahRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Definisi langkah berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DefinisiLangkah" } } }
        }
      }
    }
  },
  "/api/pendaftaran/admin/form-builder/langkah/{id}": {
    "put": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Ubah langkah pendaftaran",
      "operationId": "admin_update_definisi_langkah_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateDefinisiLangkahRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Definisi langkah berhasil diperbarui",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DefinisiLangkah" } } }
        }
      }
    },
    "delete": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Hapus langkah pendaftaran",
      "operationId": "admin_delete_definisi_langkah_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": { "description": "Definisi langkah berhasil dihapus" }
      }
    }
  },
  "/api/pendaftaran/admin/berkas-list": {
    "get": {
      "tags": ["Pendaftaran Admin"],
      "summary": "Admin: Daftar seluruh berkas masuk calon untuk diverifikasi",
      "operationId": "admin_list_berkas_handler",
      "parameters": [
        { "name": "status", "in": "query", "required": false, "schema": { "type": "string" } },
        { "name": "search", "in": "query", "required": false, "schema": { "type": "string" } }
      ],
      "responses": {
        "200": {
          "description": "Daftar berkas untuk verifikasi",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/BerkasDetailItem" } } } }
        }
      }
    }
  }
};

const formBuilderSchemas = {
  "DefinisiField": {
    "type": "object",
    "required": ["id", "kode_field", "label", "tipe_field", "wajib", "opsi", "aturan_validasi", "urutan", "kelompok", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "jalur_id": { "type": "string", "format": "uuid", "nullable": true },
      "kode_field": { "type": "string" },
      "label": { "type": "string" },
      "tipe_field": { "type": "string" },
      "placeholder": { "type": "string", "nullable": true },
      "wajib": { "type": "boolean" },
      "opsi": {},
      "aturan_validasi": {},
      "urutan": { "type": "integer" },
      "kelompok": { "type": "string" },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "DefinisiBerkas": {
    "type": "object",
    "required": ["id", "kode_berkas", "nama", "wajib", "tipe_file", "ukuran_maks_kb", "urutan", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "jalur_id": { "type": "string", "format": "uuid", "nullable": true },
      "kode_berkas": { "type": "string" },
      "nama": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "wajib": { "type": "boolean" },
      "tipe_file": { "type": "string" },
      "ukuran_maks_kb": { "type": "integer" },
      "urutan": { "type": "integer" },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "DefinisiLangkah": {
    "type": "object",
    "required": ["id", "kode_langkah", "judul_langkah", "tipe_langkah", "urutan", "wajib", "syarat_lanjut", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "jalur_id": { "type": "string", "format": "uuid", "nullable": true },
      "kode_langkah": { "type": "string" },
      "judul_langkah": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "tipe_langkah": { "type": "string" },
      "urutan": { "type": "integer" },
      "wajib": { "type": "boolean" },
      "syarat_lanjut": {},
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "SubmitDinamisRequest": {
    "type": "object",
    "required": ["data"],
    "properties": {
      "jalur_id": { "type": "string", "format": "uuid", "nullable": true },
      "gelombang_id": { "type": "string", "format": "uuid", "nullable": true },
      "prodi_pilihan_1": { "type": "string", "format": "uuid", "nullable": true },
      "prodi_pilihan_2": { "type": "string", "format": "uuid", "nullable": true },
      "data": {}
    }
  },
  "PresignUploadRequest": {
    "type": "object",
    "required": ["definisi_berkas_id", "file_name", "mime_type", "file_size_bytes"],
    "properties": {
      "definisi_berkas_id": { "type": "string", "format": "uuid" },
      "file_name": { "type": "string" },
      "mime_type": { "type": "string" },
      "file_size_bytes": { "type": "integer" }
    }
  },
  "KonfirmasiUploadRequest": {
    "type": "object",
    "required": ["definisi_berkas_id", "file_key", "file_name", "mime_type", "file_size_bytes"],
    "properties": {
      "definisi_berkas_id": { "type": "string", "format": "uuid" },
      "file_key": { "type": "string" },
      "file_name": { "type": "string" },
      "mime_type": { "type": "string" },
      "file_size_bytes": { "type": "integer" }
    }
  },
  "BerkasCalonItem": {
    "type": "object",
    "required": ["definisi_berkas_id", "kode_berkas", "nama", "wajib", "tipe_file", "ukuran_maks_kb", "urutan", "status_verifikasi"],
    "properties": {
      "id": { "type": "string", "format": "uuid", "nullable": true },
      "definisi_berkas_id": { "type": "string", "format": "uuid" },
      "kode_berkas": { "type": "string" },
      "nama": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "wajib": { "type": "boolean" },
      "tipe_file": { "type": "string" },
      "ukuran_maks_kb": { "type": "integer" },
      "urutan": { "type": "integer" },
      "file_key": { "type": "string", "nullable": true },
      "file_name": { "type": "string", "nullable": true },
      "mime_type": { "type": "string", "nullable": true },
      "file_size_bytes": { "type": "integer", "nullable": true },
      "status_verifikasi": { "type": "string" },
      "catatan": { "type": "string", "nullable": true },
      "uploaded_at": { "type": "string", "format": "date-time", "nullable": true }
    }
  },
  "BerkasDetailItem": {
    "type": "object",
    "required": ["id", "pendaftar_id", "nomor_pendaftaran", "nama_lengkap", "email", "nama_jalur", "kode_berkas", "nama_berkas", "wajib", "file_key", "file_name", "mime_type", "file_size_bytes", "status_verifikasi", "uploaded_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "nomor_pendaftaran": { "type": "string" },
      "nama_lengkap": { "type": "string" },
      "email": { "type": "string" },
      "nama_jalur": { "type": "string" },
      "definisi_berkas_id": { "type": "string", "format": "uuid", "nullable": true },
      "kode_berkas": { "type": "string" },
      "nama_berkas": { "type": "string" },
      "wajib": { "type": "boolean" },
      "file_key": { "type": "string" },
      "file_name": { "type": "string" },
      "mime_type": { "type": "string" },
      "file_size_bytes": { "type": "integer" },
      "status_verifikasi": { "type": "string" },
      "catatan": { "type": "string", "nullable": true },
      "uploaded_at": { "type": "string", "format": "date-time" },
      "verified_at": { "type": "string", "format": "date-time", "nullable": true }
    }
  },
  "LangkahProgressItem": {
    "type": "object",
    "required": ["id", "kode_langkah", "judul_langkah", "tipe_langkah", "urutan", "wajib", "status", "bisa_diakses"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "kode_langkah": { "type": "string" },
      "judul_langkah": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "tipe_langkah": { "type": "string" },
      "urutan": { "type": "integer" },
      "wajib": { "type": "boolean" },
      "status": { "type": "string" },
      "bisa_diakses": { "type": "boolean" },
      "syarat_keterangan": { "type": "string", "nullable": true }
    }
  },
  "CreateDefinisiFieldRequest": {
    "type": "object",
    "required": ["kode_field", "label", "tipe_field", "wajib"],
    "properties": {
      "jalur_id": { "type": "string", "format": "uuid", "nullable": true },
      "kode_field": { "type": "string" },
      "label": { "type": "string" },
      "tipe_field": { "type": "string" },
      "placeholder": { "type": "string", "nullable": true },
      "wajib": { "type": "boolean" },
      "opsi": { "nullable": true },
      "aturan_validasi": { "nullable": true },
      "urutan": { "type": "integer", "nullable": true },
      "kelompok": { "type": "string", "nullable": true }
    }
  },
  "UpdateDefinisiFieldRequest": {
    "type": "object",
    "required": ["label", "tipe_field", "wajib", "urutan", "kelompok", "is_active"],
    "properties": {
      "jalur_id": { "type": "string", "format": "uuid", "nullable": true },
      "label": { "type": "string" },
      "tipe_field": { "type": "string" },
      "placeholder": { "type": "string", "nullable": true },
      "wajib": { "type": "boolean" },
      "opsi": { "nullable": true },
      "aturan_validasi": { "nullable": true },
      "urutan": { "type": "integer" },
      "kelompok": { "type": "string" },
      "is_active": { "type": "boolean" }
    }
  },
  "ReorderFieldsRequest": {
    "type": "object",
    "required": ["field_ids"],
    "properties": {
      "field_ids": { "type": "array", "items": { "type": "string", "format": "uuid" } }
    }
  },
  "CreateDefinisiBerkasRequest": {
    "type": "object",
    "required": ["kode_berkas", "nama", "wajib"],
    "properties": {
      "jalur_id": { "type": "string", "format": "uuid", "nullable": true },
      "kode_berkas": { "type": "string" },
      "nama": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "wajib": { "type": "boolean" },
      "tipe_file": { "type": "string", "nullable": true },
      "ukuran_maks_kb": { "type": "integer", "nullable": true },
      "urutan": { "type": "integer", "nullable": true }
    }
  },
  "UpdateDefinisiBerkasRequest": {
    "type": "object",
    "required": ["nama", "wajib", "tipe_file", "ukuran_maks_kb", "urutan", "is_active"],
    "properties": {
      "jalur_id": { "type": "string", "format": "uuid", "nullable": true },
      "nama": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "wajib": { "type": "boolean" },
      "tipe_file": { "type": "string" },
      "ukuran_maks_kb": { "type": "integer" },
      "urutan": { "type": "integer" },
      "is_active": { "type": "boolean" }
    }
  },
  "CreateDefinisiLangkahRequest": {
    "type": "object",
    "required": ["kode_langkah", "judul_langkah", "tipe_langkah", "wajib"],
    "properties": {
      "jalur_id": { "type": "string", "format": "uuid", "nullable": true },
      "kode_langkah": { "type": "string" },
      "judul_langkah": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "tipe_langkah": { "type": "string" },
      "urutan": { "type": "integer", "nullable": true },
      "wajib": { "type": "boolean" },
      "syarat_lanjut": { "nullable": true }
    }
  },
  "UpdateDefinisiLangkahRequest": {
    "type": "object",
    "required": ["judul_langkah", "tipe_langkah", "urutan", "wajib", "is_active"],
    "properties": {
      "jalur_id": { "type": "string", "format": "uuid", "nullable": true },
      "judul_langkah": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "tipe_langkah": { "type": "string" },
      "urutan": { "type": "integer" },
      "wajib": { "type": "boolean" },
      "syarat_lanjut": { "nullable": true },
      "is_active": { "type": "boolean" }
    }
  },
  "PresignedUploadResponse": {
    "type": "object",
    "required": ["upload_url", "file_key", "expires_in_seconds"],
    "properties": {
      "upload_url": { "type": "string" },
      "file_key": { "type": "string" },
      "expires_in_seconds": { "type": "integer" }
    }
  },
  "PresignedDownloadResponse": {
    "type": "object",
    "required": ["download_url", "file_key", "expires_in_seconds"],
    "properties": {
      "download_url": { "type": "string" },
      "file_key": { "type": "string" },
      "expires_in_seconds": { "type": "integer" }
    }
  },
  "PilihProdiRequest": {
    "type": "object",
    "required": ["jalur_id", "gelombang_id", "prodi_pilihan_1"],
    "properties": {
      "jalur_id": { "type": "string", "format": "uuid" },
      "gelombang_id": { "type": "string", "format": "uuid" },
      "prodi_pilihan_1": { "type": "string", "format": "uuid" },
      "prodi_pilihan_2": { "type": "string", "format": "uuid", "nullable": true }
    }
  },
  "PendaftaranOfflineRequest": {
    "type": "object",
    "required": ["nama_lengkap", "email", "no_hp", "nik", "tempat_lahir", "tgl_lahir", "jenis_kelamin", "agama", "alamat_lengkap", "nama_ortu", "no_hp_ortu", "asal_sekolah", "jurusan_sekolah", "jalur_id", "gelombang_id", "prodi_pilihan_1", "lunas_loket"],
    "properties": {
      "nama_lengkap": { "type": "string" },
      "email": { "type": "string", "format": "email" },
      "no_hp": { "type": "string" },
      "nik": { "type": "string" },
      "tempat_lahir": { "type": "string" },
      "tgl_lahir": { "type": "string", "format": "date" },
      "jenis_kelamin": { "type": "string" },
      "agama": { "type": "string" },
      "alamat_lengkap": { "type": "string" },
      "nama_ortu": { "type": "string" },
      "no_hp_ortu": { "type": "string" },
      "asal_sekolah": { "type": "string" },
      "jurusan_sekolah": { "type": "string" },
      "nilai_rapor_avg": { "type": "number", "nullable": true },
      "jalur_id": { "type": "string", "format": "uuid" },
      "gelombang_id": { "type": "string", "format": "uuid" },
      "prodi_pilihan_1": { "type": "string", "format": "uuid" },
      "prodi_pilihan_2": { "type": "string", "format": "uuid", "nullable": true },
      "lunas_loket": { "type": "boolean" },
      "catatan_loket": { "type": "string", "nullable": true }
    }
  },
  "PendaftaranOfflineResponse": {
    "type": "object",
    "required": ["pendaftar_id", "nomor_pendaftaran", "user_id", "email", "status_pendaftaran", "is_lunas_loket", "cetak_bukti_url", "cetak_kartu_url"],
    "properties": {
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "nomor_pendaftaran": { "type": "string" },
      "user_id": { "type": "string", "format": "uuid" },
      "email": { "type": "string", "format": "email" },
      "temporary_password": { "type": "string", "nullable": true },
      "status_pendaftaran": { "type": "string" },
      "is_lunas_loket": { "type": "boolean" },
      "nomor_tagihan": { "type": "string", "nullable": true },
      "cetak_bukti_url": { "type": "string" },
      "cetak_kartu_url": { "type": "string" }
    }
  },
  "DashboardSummaryResponse": {
    "type": "object",
    "required": ["status_pendaftaran", "tagihan_lunas", "bisa_cetak_bukti", "bisa_cetak_kartu"],
    "properties": {
      "pendaftar_id": { "type": "string", "format": "uuid", "nullable": true },
      "nomor_pendaftaran": { "type": "string", "nullable": true },
      "status_pendaftaran": { "type": "string" },
      "jalur_nama": { "type": "string", "nullable": true },
      "gelombang_nama": { "type": "string", "nullable": true },
      "prodi_1_nama": { "type": "string", "nullable": true },
      "prodi_2_nama": { "type": "string", "nullable": true },
      "tagihan_lunas": { "type": "boolean" },
      "nomor_tagihan": { "type": "string", "nullable": true },
      "nominal_tagihan": { "type": "integer", "nullable": true },
      "jadwal_ujian": { "type": "string", "nullable": true },
      "lokasi_ujian": { "type": "string", "nullable": true },
      "pengumuman_status": { "type": "string", "nullable": true },
      "nim_resmi": { "type": "string", "nullable": true },
      "bisa_cetak_bukti": { "type": "boolean" },
      "bisa_cetak_kartu": { "type": "boolean" }
    }
  },
  "KonfirmasiBayarRequest": {
    "type": "object",
    "required": ["pembayaran_id", "status"],
    "properties": {
      "pembayaran_id": { "type": "string", "format": "uuid" },
      "status": { "type": "string" },
      "catatan": { "type": "string", "nullable": true }
    }
  },
  "ChargePaymentRequest": {
    "type": "object",
    "required": ["tagihan_id", "metode_pembayaran"],
    "properties": {
      "tagihan_id": { "type": "string", "format": "uuid" },
      "metode_pembayaran": { "type": "string" }
    }
  },
  "TransaksiDetailResponse": {
    "type": "object",
    "required": ["id", "tagihan_id", "nomor_transaksi", "gateway_provider", "metode_pembayaran", "nominal", "status", "waktu_dibuat", "waktu_berlaku_sampai"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "tagihan_id": { "type": "string", "format": "uuid" },
      "nomor_transaksi": { "type": "string" },
      "gateway_provider": { "type": "string" },
      "metode_pembayaran": { "type": "string" },
      "nomor_va": { "type": "string", "nullable": true },
      "qr_string": { "type": "string", "nullable": true },
      "qr_url": { "type": "string", "nullable": true },
      "nominal": { "type": "integer" },
      "status": { "type": "string" },
      "waktu_dibuat": { "type": "string", "format": "date-time" },
      "waktu_berlaku_sampai": { "type": "string", "format": "date-time" },
      "waktu_dibayar": { "type": "string", "format": "date-time", "nullable": true }
    }
  },
  "TagihanWithTransaksiResponse": {
    "type": "object",
    "required": ["id", "nomor_tagihan", "pendaftar_id", "jenis_tagihan", "nominal_asli", "diskon_voucher", "nominal_akhir", "status", "tgl_terbit", "tgl_jatuh_tempo"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "nomor_tagihan": { "type": "string" },
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "jenis_tagihan": { "type": "string" },
      "nominal_asli": { "type": "integer" },
      "diskon_voucher": { "type": "integer" },
      "nominal_akhir": { "type": "integer" },
      "voucher_id": { "type": "string", "format": "uuid", "nullable": true },
      "status": { "type": "string" },
      "tgl_terbit": { "type": "string", "format": "date-time" },
      "tgl_jatuh_tempo": { "type": "string", "format": "date-time" },
      "lunas_at": { "type": "string", "format": "date-time", "nullable": true },
      "catatan": { "type": "string", "nullable": true },
      "active_transaksi": { "$ref": "#/components/schemas/TransaksiDetailResponse", "nullable": true }
    }
  },
  "RingkasanKeuanganResponse": {
    "type": "object",
    "required": ["total_dana_masuk", "total_transaksi_lunas", "total_transaksi_pending", "total_transaksi_expired"],
    "properties": {
      "total_dana_masuk": { "type": "integer" },
      "total_transaksi_lunas": { "type": "integer" },
      "total_transaksi_pending": { "type": "integer" },
      "total_transaksi_expired": { "type": "integer" }
    }
  },
  "AdminTransaksiItem": {
    "type": "object",
    "required": ["id", "tagihan_id", "nomor_tagihan", "nomor_transaksi", "nomor_pendaftaran", "nama_pendaftar", "jenis_tagihan", "nominal_asli", "diskon_voucher", "nominal", "gateway_provider", "metode_pembayaran", "status", "waktu_dibuat"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "tagihan_id": { "type": "string", "format": "uuid" },
      "nomor_tagihan": { "type": "string" },
      "nomor_transaksi": { "type": "string" },
      "nomor_pendaftaran": { "type": "string" },
      "nama_pendaftar": { "type": "string" },
      "jenis_tagihan": { "type": "string" },
      "nominal_asli": { "type": "integer" },
      "diskon_voucher": { "type": "integer" },
      "nominal": { "type": "integer" },
      "gateway_provider": { "type": "string" },
      "metode_pembayaran": { "type": "string" },
      "nomor_va": { "type": "string", "nullable": true },
      "status": { "type": "string" },
      "waktu_dibuat": { "type": "string", "format": "date-time" },
      "waktu_dibayar": { "type": "string", "format": "date-time", "nullable": true }
    }
  },
  "ListTransaksiAdminResponse": {
    "type": "object",
    "required": ["items", "total", "page", "limit", "ringkasan"],
    "properties": {
      "items": { "type": "array", "items": { "$ref": "#/components/schemas/AdminTransaksiItem" } },
      "total": { "type": "integer" },
      "page": { "type": "integer" },
      "limit": { "type": "integer" },
      "ringkasan": { "$ref": "#/components/schemas/RingkasanKeuanganResponse" }
    }
  },
  "RekonsiliasiResponse": {
    "type": "object",
    "required": ["transaksi_id", "nomor_transaksi", "status_sebelumnya", "status_terkini", "berhasil_disinkronkan", "pesan"],
    "properties": {
      "transaksi_id": { "type": "string", "format": "uuid" },
      "nomor_transaksi": { "type": "string" },
      "status_sebelumnya": { "type": "string" },
      "status_terkini": { "type": "string" },
      "berhasil_disinkronkan": { "type": "boolean" },
      "pesan": { "type": "string" }
    }
  }
};

const pembayaranPaths = {
  "/api/pembayaran/charge": {
    "post": {
      "tags": ["Pembayaran"],
      "summary": "Pilih metode pembayaran dan charge gateway (VA / QRIS)",
      "operationId": "charge_payment_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ChargePaymentRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Transaksi pembayaran berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/TransaksiDetailResponse" } } }
        }
      }
    }
  },
  "/api/pembayaran/admin/rekonsiliasi/{id}": {
    "post": {
      "tags": ["Pembayaran"],
      "summary": "Rekonsiliasi status transaksi ke gateway",
      "operationId": "admin_rekonsiliasi_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Hasil rekonsiliasi gateway",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/RekonsiliasiResponse" } } }
        }
      }
    }
  },
  "/api/pembayaran/admin/konfirmasi-manual": {
    "post": {
      "tags": ["Pembayaran"],
      "summary": "Konfirmasi pelunasan tagihan secara manual",
      "operationId": "admin_konfirmasi_manual_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/KonfirmasiBayarRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Pelunasan tagihan manual berhasil dicatat"
        }
      }
    }
  },
  "/api/pembayaran/admin/ekspor": {
    "get": {
      "tags": ["Pembayaran"],
      "summary": "Ekspor data transaksi PMB ke file CSV",
      "operationId": "admin_ekspor_transaksi_handler",
      "responses": {
        "200": {
          "description": "File CSV transaksi keuangan PMB"
        }
      }
    }
  }
};

const cbtPaths = {
  "/api/cbt/my-sesi": {
    "get": {
      "tags": ["CBT Calon"],
      "summary": "Ambil data sesi ujian & status presensi calon mahasiswa",
      "operationId": "get_my_sesi_handler",
      "responses": {
        "200": {
          "description": "Informasi sesi calon",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/SesiCalonInfoResponse" } } }
        }
      }
    }
  },
  "/api/cbt/mulai": {
    "post": {
      "tags": ["CBT Calon"],
      "summary": "Mulai atau lanjutkan sesi ujian CBT",
      "operationId": "mulai_cbt_handler",
      "responses": {
        "200": {
          "description": "Sesi ujian dimulai atau dipulihkan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/MulaiUjianCbtResponse" } } }
        }
      }
    }
  },
  "/api/cbt/autosave": {
    "post": {
      "tags": ["CBT Calon"],
      "summary": "Simpan otomatis jawaban atau penanda ragu-ragu",
      "operationId": "autosave_jawaban_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/AutosaveJawabanRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Jawaban berhasil diautosave",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/AutosaveJawabanResponse" } } }
        }
      }
    }
  },
  "/api/cbt/submit": {
    "post": {
      "tags": ["CBT Calon"],
      "summary": "Submit akhir ujian CBT dan hitung nilai otomatis",
      "operationId": "submit_cbt_handler",
      "responses": {
        "200": {
          "description": "Ujian berhasil disubmit dan dinilai",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/SubmitUjianResponse" } } }
        }
      }
    }
  },
  "/api/cbt/admin/presensi/check-in": {
    "post": {
      "tags": ["CBT Pengawas"],
      "summary": "Check-in presensi peserta via Scan QR atau input manual",
      "operationId": "check_in_presensi_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PresensiCheckInRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Presensi berhasil dicatat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PresensiCheckInResponse" } } }
        }
      }
    }
  },
  "/api/cbt/admin/sesi/{id}/live-stream": {
    "get": {
      "tags": ["CBT Pengawas"],
      "summary": "Stream SSE snapshot real-time peserta ujian",
      "operationId": "live_stream_sesi_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Server-Sent Events stream"
        }
      }
    }
  },
  "/api/cbt/admin/sesi/{id}/snapshot": {
    "get": {
      "tags": ["CBT Pengawas"],
      "summary": "Snapshot real-time metrik dan peserta sesi ujian",
      "operationId": "get_sesi_snapshot_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Snapshot data live sesi",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/LiveMonitorStreamResponse" } } }
        }
      }
    }
  },
  "/api/cbt/admin/sesi/{id}/peserta": {
    "get": {
      "tags": ["CBT Pengawas"],
      "summary": "Daftar peserta dan status presensi sesi ujian",
      "operationId": "get_sesi_peserta_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Daftar peserta sesi",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/LiveMonitorStreamResponse" } } }
        }
      }
    }
  },
  "/api/cbt/admin/bank-soal": {
    "get": {
      "tags": ["CBT Admin"],
      "summary": "Daftar butir bank soal",
      "operationId": "list_bank_soal_handler",
      "parameters": [
        { "name": "kategori", "in": "query", "required": false, "schema": { "type": "string" } },
        { "name": "tingkat_kesulitan", "in": "query", "required": false, "schema": { "type": "string" } }
      ],
      "responses": {
        "200": {
          "description": "Daftar bank soal",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/BankSoal" } } } }
        }
      }
    },
    "post": {
      "tags": ["CBT Admin"],
      "summary": "Tambah soal baru ke bank soal",
      "operationId": "create_bank_soal_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateSoalRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Soal berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/BankSoal" } } }
        }
      }
    }
  },
  "/api/cbt/admin/bank-soal/import": {
    "post": {
      "tags": ["CBT Admin"],
      "summary": "Impor bank soal dari Excel/CSV",
      "operationId": "import_bank_soal_handler",
      "responses": {
        "200": {
          "description": "Hasil impor soal",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ImportSoalResultResponse" } } }
        }
      }
    }
  },
  "/api/cbt/admin/paket": {
    "get": {
      "tags": ["CBT Admin"],
      "summary": "Daftar paket ujian",
      "operationId": "list_paket_handler",
      "responses": {
        "200": {
          "description": "Daftar paket ujian",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/PaketUjian" } } } }
        }
      }
    },
    "post": {
      "tags": ["CBT Admin"],
      "summary": "Buat paket ujian baru",
      "operationId": "create_paket_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreatePaketRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Paket berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PaketUjian" } } }
        }
      }
    }
  },
  "/api/cbt/admin/sesi": {
    "get": {
      "tags": ["CBT Admin"],
      "summary": "Daftar jadwal sesi ujian",
      "operationId": "list_sesi_handler",
      "responses": {
        "200": {
          "description": "Daftar sesi ujian",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/SesiUjian" } } } }
        }
      }
    },
    "post": {
      "tags": ["CBT Admin"],
      "summary": "Jadwalkan sesi ujian baru",
      "operationId": "create_sesi_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateSesiRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Sesi ujian berhasil dijadwalkan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/SesiUjian" } } }
        }
      }
    }
  },
  "/api/cbt/admin/sesi/{id}/assign": {
    "post": {
      "tags": ["CBT Admin"],
      "summary": "Assign peserta pendaftar ke sesi ujian",
      "operationId": "assign_peserta_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/AssignPesertaRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Peserta berhasil di-assign",
          "content": { "application/json": { "schema": { "type": "object", "properties": { "assigned_count": { "type": "integer" } } } } }
        }
      }
    }
  }
};

const cbtSchemas = {
  "SoalOpsiDto": {
    "type": "object",
    "required": ["id", "label", "teks"],
    "properties": {
      "id": { "type": "string" },
      "label": { "type": "string" },
      "teks": { "type": "string" },
      "gambar_url": { "type": "string", "nullable": true }
    }
  },
  "SoalCbtPesertaResponse": {
    "type": "object",
    "required": ["id", "nomor_urut", "kategori", "tingkat_kesulitan", "bobot", "pertanyaan", "opsi_jawaban", "ragu_ragu"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "nomor_urut": { "type": "integer" },
      "kategori": { "type": "string" },
      "tingkat_kesulitan": { "type": "string" },
      "bobot": { "type": "number" },
      "pertanyaan": { "type": "string" },
      "gambar_url": { "type": "string", "nullable": true },
      "opsi_jawaban": { "type": "array", "items": { "$ref": "#/components/schemas/SoalOpsiDto" } },
      "jawaban_terpilih": { "type": "string", "nullable": true },
      "ragu_ragu": { "type": "boolean" }
    }
  },
  "SesiCalonInfoResponse": {
    "type": "object",
    "required": ["pendaftar_id", "nomor_peserta", "nomor_pendaftaran", "nama_peserta", "nama_prodi", "status_pendaftaran", "status_presensi"],
    "properties": {
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "nomor_peserta": { "type": "string" },
      "nomor_pendaftaran": { "type": "string" },
      "nama_peserta": { "type": "string" },
      "nama_prodi": { "type": "string" },
      "status_pendaftaran": { "type": "string" },
      "sesi_id": { "type": "string", "format": "uuid", "nullable": true },
      "nama_sesi": { "type": "string", "nullable": true },
      "jadwal_mulai": { "type": "string", "format": "date-time", "nullable": true },
      "jadwal_selesai": { "type": "string", "format": "date-time", "nullable": true },
      "ruang": { "type": "string", "nullable": true },
      "durasi_menit": { "type": "integer", "nullable": true },
      "status_presensi": { "type": "string" },
      "status_ujian": { "type": "string", "nullable": true },
      "waktu_mulai": { "type": "string", "format": "date-time", "nullable": true },
      "batas_waktu": { "type": "string", "format": "date-time", "nullable": true },
      "sisa_detik": { "type": "integer", "nullable": true },
      "total_soal": { "type": "integer", "nullable": true },
      "total_dijawab": { "type": "integer", "nullable": true },
      "nilai_akhir": { "type": "number", "nullable": true },
      "is_lulus": { "type": "boolean", "nullable": true },
      "passing_grade": { "type": "number", "nullable": true }
    }
  },
  "MulaiUjianCbtResponse": {
    "type": "object",
    "required": ["peserta_sesi_id", "nama_sesi", "durasi_menit", "waktu_mulai", "batas_waktu", "sisa_detik", "total_soal", "passing_grade", "soal"],
    "properties": {
      "peserta_sesi_id": { "type": "string", "format": "uuid" },
      "nama_sesi": { "type": "string" },
      "durasi_menit": { "type": "integer" },
      "waktu_mulai": { "type": "string", "format": "date-time" },
      "batas_waktu": { "type": "string", "format": "date-time" },
      "sisa_detik": { "type": "integer" },
      "total_soal": { "type": "integer" },
      "passing_grade": { "type": "number" },
      "soal": { "type": "array", "items": { "$ref": "#/components/schemas/SoalCbtPesertaResponse" } },
      "daftar_soal": { "type": "array", "items": { "$ref": "#/components/schemas/SoalCbtPesertaResponse" } }
    }
  },
  "AutosaveJawabanRequest": {
    "type": "object",
    "required": ["soal_id"],
    "properties": {
      "soal_id": { "type": "string", "format": "uuid" },
      "pilihan_jawaban": { "type": "string", "nullable": true },
      "ragu_ragu": { "type": "boolean", "nullable": true }
    }
  },
  "AutosaveJawabanResponse": {
    "type": "object",
    "required": ["status", "soal_id", "ragu_ragu", "sisa_detik", "total_terjawab"],
    "properties": {
      "status": { "type": "string" },
      "soal_id": { "type": "string", "format": "uuid" },
      "pilihan_jawaban": { "type": "string", "nullable": true },
      "ragu_ragu": { "type": "boolean" },
      "sisa_detik": { "type": "integer" },
      "total_terjawab": { "type": "integer" }
    }
  },
  "SubmitUjianResponse": {
    "type": "object",
    "required": ["peserta_sesi_id", "total_soal", "total_dijawab", "jumlah_benar", "jumlah_salah", "jumlah_kosong", "nilai_akhir", "is_lulus", "passing_grade", "keterangan"],
    "properties": {
      "peserta_sesi_id": { "type": "string", "format": "uuid" },
      "total_soal": { "type": "integer" },
      "total_dijawab": { "type": "integer" },
      "jumlah_benar": { "type": "integer" },
      "jumlah_salah": { "type": "integer" },
      "jumlah_kosong": { "type": "integer" },
      "nilai_akhir": { "type": "number" },
      "is_lulus": { "type": "boolean" },
      "passing_grade": { "type": "number" },
      "keterangan": { "type": "string" }
    }
  },
  "PresensiCheckInRequest": {
    "type": "object",
    "properties": {
      "identifier": { "type": "string" },
      "nomor_peserta_atau_qr": { "type": "string" },
      "sesi_id": { "type": "string", "format": "uuid", "nullable": true },
      "catatan": { "type": "string", "nullable": true }
    }
  },
  "PresensiCheckInResponse": {
    "type": "object",
    "required": ["peserta_sesi_id", "nomor_peserta", "nama_peserta", "status_presensi", "waktu_presensi", "metode_presensi", "nama_sesi", "can_start_exam"],
    "properties": {
      "peserta_sesi_id": { "type": "string", "format": "uuid" },
      "nomor_peserta": { "type": "string" },
      "nama_peserta": { "type": "string" },
      "status_presensi": { "type": "string" },
      "waktu_presensi": { "type": "string", "format": "date-time" },
      "metode_presensi": { "type": "string" },
      "nama_sesi": { "type": "string" },
      "can_start_exam": { "type": "boolean" }
    }
  },
  "LivePesertaStatusItem": {
    "type": "object",
    "required": ["id", "pendaftar_id", "nomor_peserta", "nama_peserta", "status_presensi", "status_ujian", "soal_terjawab", "total_soal", "sisa_detik"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "nomor_peserta": { "type": "string" },
      "nama_peserta": { "type": "string" },
      "status_presensi": { "type": "string" },
      "status_ujian": { "type": "string" },
      "soal_terjawab": { "type": "integer" },
      "total_soal": { "type": "integer" },
      "sisa_detik": { "type": "integer" },
      "nilai_akhir": { "type": "number", "nullable": true },
      "is_lulus": { "type": "boolean", "nullable": true },
      "waktu_mulai": { "type": "string", "format": "date-time", "nullable": true },
      "waktu_selesai": { "type": "string", "format": "date-time", "nullable": true }
    }
  },
  "LiveMonitorStreamResponse": {
    "type": "object",
    "required": ["sesi_id", "nama_sesi", "total_peserta", "peserta"],
    "properties": {
      "sesi_id": { "type": "string", "format": "uuid" },
      "nama_sesi": { "type": "string" },
      "total_kuota": { "type": "integer" },
      "total_peserta": { "type": "integer" },
      "hadir": { "type": "integer" },
      "total_hadir": { "type": "integer" },
      "sedang_mengerjakan": { "type": "integer" },
      "total_sedang_mengerjakan": { "type": "integer" },
      "selesai": { "type": "integer" },
      "total_selesai": { "type": "integer" },
      "peserta": { "type": "array", "items": { "$ref": "#/components/schemas/LivePesertaStatusItem" } }
    }
  },
  "ErrorBarisImport": {
    "type": "object",
    "required": ["baris", "pesan"],
    "properties": {
      "baris": { "type": "integer" },
      "kolom": { "type": "string", "nullable": true },
      "pesan": { "type": "string" }
    }
  },
  "ImportSoalResultResponse": {
    "type": "object",
    "required": ["total_baris", "berhasil", "gagal", "errors"],
    "properties": {
      "total_baris": { "type": "integer" },
      "berhasil": { "type": "integer" },
      "gagal": { "type": "integer" },
      "errors": { "type": "array", "items": { "$ref": "#/components/schemas/ErrorBarisImport" } }
    }
  },
  "CreateSoalRequest": {
    "type": "object",
    "required": ["kategori", "pertanyaan", "opsi_jawaban", "kunci_jawaban"],
    "properties": {
      "kategori": { "type": "string" },
      "tingkat_kesulitan": { "type": "string", "nullable": true },
      "pertanyaan": { "type": "string" },
      "gambar_url": { "type": "string", "nullable": true },
      "opsi_jawaban": { "type": "array", "items": { "$ref": "#/components/schemas/SoalOpsiDto" } },
      "kunci_jawaban": { "type": "string" },
      "bobot": { "type": "number", "nullable": true },
      "pembahasan": { "type": "string", "nullable": true }
    }
  },
  "CreatePaketRequest": {
    "type": "object",
    "required": ["nama_paket", "soal_ids"],
    "properties": {
      "nama_paket": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "durasi_menit": { "type": "integer", "nullable": true },
      "passing_grade": { "type": "number", "nullable": true },
      "acak_soal": { "type": "boolean", "nullable": true },
      "acak_opsi": { "type": "boolean", "nullable": true },
      "soal_ids": { "type": "array", "items": { "type": "string", "format": "uuid" } }
    }
  },
  "CreateSesiRequest": {
    "type": "object",
    "required": ["paket_id", "nama_sesi", "jadwal_mulai", "jadwal_selesai", "ruang"],
    "properties": {
      "paket_id": { "type": "string", "format": "uuid" },
      "nama_sesi": { "type": "string" },
      "jadwal_mulai": { "type": "string", "format": "date-time" },
      "jadwal_selesai": { "type": "string", "format": "date-time" },
      "ruang": { "type": "string" },
      "kuota": { "type": "integer", "nullable": true }
    }
  },
  "AssignPesertaRequest": {
    "type": "object",
    "required": ["pendaftar_ids"],
    "properties": {
      "pendaftar_ids": { "type": "array", "items": { "type": "string", "format": "uuid" } }
    }
  },
  "BankSoal": {
    "type": "object",
    "required": ["id", "kategori", "tingkat_kesulitan", "pertanyaan", "opsi_jawaban", "kunci_jawaban", "bobot", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "kategori": { "type": "string" },
      "tingkat_kesulitan": { "type": "string" },
      "pertanyaan": { "type": "string" },
      "gambar_url": { "type": "string", "nullable": true },
      "opsi_jawaban": { "type": "object" },
      "kunci_jawaban": { "type": "string" },
      "bobot": { "type": "number" },
      "pembahasan": { "type": "string", "nullable": true },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "PaketUjian": {
    "type": "object",
    "required": ["id", "nama_paket", "durasi_menit", "passing_grade", "total_soal", "acak_soal", "acak_opsi", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "nama_paket": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "durasi_menit": { "type": "integer" },
      "passing_grade": { "type": "number" },
      "total_soal": { "type": "integer" },
      "acak_soal": { "type": "boolean" },
      "acak_opsi": { "type": "boolean" },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "SesiUjian": {
    "type": "object",
    "required": ["id", "paket_id", "nama_sesi", "jadwal_mulai", "jadwal_selesai", "ruang", "kuota", "status", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "paket_id": { "type": "string", "format": "uuid" },
      "nama_sesi": { "type": "string" },
      "jadwal_mulai": { "type": "string", "format": "date-time" },
      "jadwal_selesai": { "type": "string", "format": "date-time" },
      "ruang": { "type": "string" },
      "kuota": { "type": "integer" },
      "status": { "type": "string" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  }
};

const kelulusanPaths = {
  "/api/kelulusan/cek": {
    "get": {
      "tags": ["Kelulusan Portal"],
      "summary": "Cek status kelulusan calon mahasiswa",
      "operationId": "get_cek_kelulusan_calon_handler",
      "responses": {
        "200": {
          "description": "Status kelulusan calon mahasiswa",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CekKelulusanCalonResponse" } } }
        }
      }
    }
  },
  "/api/kelulusan/loa/pdf": {
    "get": {
      "tags": ["Kelulusan Portal"],
      "summary": "Download LoA PDF",
      "operationId": "download_loa_pdf_handler",
      "responses": {
        "200": {
          "description": "Streaming PDF LoA",
          "content": { "application/pdf": { "schema": { "type": "string", "format": "binary" } } }
        }
      }
    }
  },
  "/api/kelulusan/daftar-ulang": {
    "get": {
      "tags": ["Kelulusan Portal"],
      "summary": "Informasi daftar ulang calon",
      "operationId": "get_daftar_ulang_info_handler",
      "responses": {
        "200": {
          "description": "Informasi daftar ulang",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DaftarUlangInfoResponse" } } }
        }
      }
    }
  },
  "/api/kelulusan/daftar-ulang/berkas": {
    "post": {
      "tags": ["Kelulusan Portal"],
      "summary": "Upload berkas daftar ulang",
      "operationId": "upload_berkas_daftar_ulang_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UploadBerkasDaftarUlangRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Berkas berhasil diupload",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/BerkasDaftarUlang" } } }
        }
      }
    }
  },
  "/api/kelulusan/admin/rumus": {
    "get": {
      "tags": ["Kelulusan Admin"],
      "summary": "Daftar konfigurasi rumus penilaian per jalur",
      "operationId": "get_rumus_penilaian_handler",
      "responses": {
        "200": {
          "description": "Daftar rumus",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/RumusPenilaianJalur" } } } }
        }
      }
    }
  },
  "/api/kelulusan/admin/rumus/{jalur_id}": {
    "post": {
      "tags": ["Kelulusan Admin"],
      "summary": "Update rumus penilaian jalur",
      "operationId": "update_rumus_penilaian_handler",
      "parameters": [{ "name": "jalur_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateRumusRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Rumus berhasil disimpan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/RumusPenilaianJalur" } } }
        }
      }
    }
  },
  "/api/kelulusan/admin/proses-ranking": {
    "post": {
      "tags": ["Kelulusan Admin"],
      "summary": "Proses ranking dan buat draf kelulusan",
      "operationId": "proses_ranking_kelulusan_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ProsesRankingRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Draf kelulusan berhasil diproses",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DrafKelulusanResponse" } } }
        }
      }
    }
  },
  "/api/kelulusan/admin/draf": {
    "get": {
      "tags": ["Kelulusan Admin"],
      "summary": "Ambil draf kelulusan aktif",
      "operationId": "get_draf_kelulusan_handler",
      "parameters": [{ "name": "sidang_id", "in": "query", "required": false, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Draf sidang kelulusan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DrafKelulusanResponse" } } }
        }
      }
    }
  },
  "/api/kelulusan/admin/approve/{sidang_id}": {
    "post": {
      "tags": ["Kelulusan Admin"],
      "summary": "Setujui sidang kelulusan",
      "operationId": "approve_sidang_handler",
      "parameters": [{ "name": "sidang_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ApprovalSidangRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Sidang disetujui",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/SidangKelulusan" } } }
        }
      }
    }
  },
  "/api/kelulusan/admin/publish/{sidang_id}": {
    "post": {
      "tags": ["Kelulusan Admin"],
      "summary": "Publikasikan hasil sidang kelulusan",
      "operationId": "publish_sidang_handler",
      "parameters": [{ "name": "sidang_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Sidang dipublikasikan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/SidangKelulusan" } } }
        }
      }
    }
  },
  "/api/kelulusan/admin/kandidat/status": {
    "post": {
      "tags": ["Kelulusan Admin"],
      "summary": "Ubah status kelulusan kandidat manual",
      "operationId": "update_status_kandidat_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateStatusKandidatRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Status kandidat berhasil diubah",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/HasilKelulusanResponse" } } }
        }
      }
    }
  },
  "/api/kelulusan/admin/daftar-ulang/list": {
    "get": {
      "tags": ["Kelulusan Admin"],
      "summary": "Daftar calon mahasiswa yang lulus dan status daftar ulangnya",
      "operationId": "list_daftar_ulang_admin_handler",
      "responses": {
        "200": {
          "description": "Daftar mahasiswa daftar ulang",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/MahasiswaDaftarUlangDto" } } } }
        }
      }
    }
  },
  "/api/kelulusan/admin/daftar-ulang/berkas/{pendaftar_id}": {
    "get": {
      "tags": ["Kelulusan Admin"],
      "summary": "Daftar berkas daftar ulang calon",
      "operationId": "list_berkas_daftar_ulang_admin_handler",
      "parameters": [{ "name": "pendaftar_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Daftar berkas daftar ulang",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/BerkasDaftarUlang" } } } }
        }
      }
    }
  },
  "/api/kelulusan/admin/daftar-ulang/verifikasi/{berkas_id}": {
    "post": {
      "tags": ["Kelulusan Admin"],
      "summary": "Verifikasi berkas daftar ulang",
      "operationId": "verifikasi_berkas_daftar_ulang_handler",
      "parameters": [{ "name": "berkas_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/VerifikasiBerkasDaftarUlangRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Berkas diverifikasi",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/BerkasDaftarUlang" } } }
        }
      }
    }
  },
  "/api/kelulusan/admin/generate-nim/{pendaftar_id}": {
    "post": {
      "tags": ["Kelulusan Admin"],
      "summary": "Terbitkan NIM resmi mahasiswa",
      "operationId": "generate_nim_handler",
      "parameters": [{ "name": "pendaftar_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "NIM resmi diterbitkan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GenerateNimResponse" } } }
        }
      }
    }
  },
  "/api/kelulusan/admin/ekspor-siakad": {
    "get": {
      "tags": ["Kelulusan Admin"],
      "summary": "Ekspor data mahasiswa baru untuk SIAKAD",
      "operationId": "ekspor_siakad_handler",
      "parameters": [
        { "name": "sidang_id", "in": "query", "required": false, "schema": { "type": "string", "format": "uuid" } },
        { "name": "format", "in": "query", "required": false, "schema": { "type": "string", "enum": ["json", "csv"] } }
      ],
      "responses": {
        "200": {
          "description": "Data SIAKAD",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/EksporSiakadItemDto" } } } }
        }
      }
    }
  }
};

const kelulusanSchemas = {
  "HasilKelulusanResponse": {
    "type": "object",
    "required": ["id", "pendaftar_id", "nomor_pendaftaran", "nama_lengkap", "status_kelulusan", "skor_akhir", "is_published", "status_daftar_ulang"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "nomor_pendaftaran": { "type": "string" },
      "nama_lengkap": { "type": "string" },
      "status_kelulusan": { "type": "string" },
      "prodi_diterima_id": { "type": "string", "format": "uuid", "nullable": true },
      "nama_prodi_diterima": { "type": "string", "nullable": true },
      "jenjang_diterima": { "type": "string", "nullable": true },
      "fakultas_diterima": { "type": "string", "nullable": true },
      "pilihan_ke": { "type": "integer", "nullable": true },
      "ranking": { "type": "integer", "nullable": true },
      "skor_akhir": { "type": "number" },
      "nim_resmi": { "type": "string", "nullable": true },
      "nomor_surat_loa": { "type": "string", "nullable": true },
      "tanggal_sk": { "type": "string", "format": "date", "nullable": true },
      "is_published": { "type": "boolean" },
      "status_daftar_ulang": { "type": "string" }
    }
  },
  "RumusPenilaianJalur": {
    "type": "object",
    "required": ["id", "jalur_id", "bobot_cbt", "bobot_rapor", "bobot_prestasi", "bobot_wawancara", "default_passing_score", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "jalur_id": { "type": "string", "format": "uuid" },
      "bobot_cbt": { "type": "number" },
      "bobot_rapor": { "type": "number" },
      "bobot_prestasi": { "type": "number" },
      "bobot_wawancara": { "type": "number" },
      "default_passing_score": { "type": "number" },
      "keterangan": { "type": "string", "nullable": true },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "SidangKelulusan": {
    "type": "object",
    "required": ["id", "nama_sidang", "tanggal_sidang", "tgl_pengumuman", "status_sidang", "total_peserta", "total_lulus", "total_cadangan", "total_tidak_lulus", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "gelombang_id": { "type": "string", "format": "uuid", "nullable": true },
      "nama_sidang": { "type": "string" },
      "nomor_sk": { "type": "string", "nullable": true },
      "tanggal_sidang": { "type": "string", "format": "date" },
      "tgl_pengumuman": { "type": "string", "format": "date-time" },
      "status_sidang": { "type": "string" },
      "total_peserta": { "type": "integer" },
      "total_lulus": { "type": "integer" },
      "total_cadangan": { "type": "integer" },
      "total_tidak_lulus": { "type": "integer" },
      "approved_by": { "type": "string", "format": "uuid", "nullable": true },
      "approved_at": { "type": "string", "format": "date-time", "nullable": true },
      "catatan_sidang": { "type": "string", "nullable": true },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "AuditKelulusan": {
    "type": "object",
    "required": ["id", "pendaftar_id", "status_baru", "actor_name", "created_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "sidang_id": { "type": "string", "format": "uuid", "nullable": true },
      "status_lama": { "type": "string", "nullable": true },
      "status_baru": { "type": "string" },
      "prodi_lama_id": { "type": "string", "format": "uuid", "nullable": true },
      "prodi_baru_id": { "type": "string", "format": "uuid", "nullable": true },
      "actor_id": { "type": "string", "format": "uuid", "nullable": true },
      "actor_name": { "type": "string" },
      "catatan": { "type": "string", "nullable": true },
      "created_at": { "type": "string", "format": "date-time" }
    }
  },
  "MahasiswaDaftarUlangDto": {
    "type": "object",
    "required": [
      "pendaftar_id", "nomor_pendaftaran", "nama_lengkap", "prodi_diterima", "jenjang",
      "status_kelulusan", "status_daftar_ulang", "status_ukt", "total_berkas_valid", "total_berkas_pending"
    ],
    "properties": {
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "nomor_pendaftaran": { "type": "string" },
      "nama_lengkap": { "type": "string" },
      "prodi_diterima": { "type": "string" },
      "jenjang": { "type": "string" },
      "status_kelulusan": { "type": "string" },
      "status_daftar_ulang": { "type": "string" },
      "nim_resmi": { "type": "string", "nullable": true },
      "nomor_loa": { "type": "string", "nullable": true },
      "status_ukt": { "type": "string" },
      "total_berkas_valid": { "type": "integer" },
      "total_berkas_pending": { "type": "integer" }
    }
  },
  "BerkasDaftarUlang": {
    "type": "object",
    "required": ["id", "pendaftar_id", "jenis_berkas", "file_key", "file_name", "mime_type", "file_size_bytes", "status_verifikasi", "uploaded_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "jenis_berkas": { "type": "string" },
      "file_key": { "type": "string" },
      "file_name": { "type": "string" },
      "mime_type": { "type": "string" },
      "file_size_bytes": { "type": "integer" },
      "status_verifikasi": { "type": "string" },
      "catatan": { "type": "string", "nullable": true },
      "uploaded_at": { "type": "string", "format": "date-time" },
      "verified_by": { "type": "string", "format": "uuid", "nullable": true },
      "verified_at": { "type": "string", "format": "date-time", "nullable": true }
    }
  },
  "CekKelulusanCalonResponse": {
    "type": "object",
    "required": ["pendaftar_id", "nomor_pendaftaran", "nama_lengkap", "jalur_nama", "gelombang_nama", "status_kelulusan", "skor_akhir", "is_published", "is_pengumuman_buka", "status_daftar_ulang", "pesan"],
    "properties": {
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "nomor_pendaftaran": { "type": "string" },
      "nama_lengkap": { "type": "string" },
      "jalur_nama": { "type": "string" },
      "gelombang_nama": { "type": "string" },
      "status_kelulusan": { "type": "string" },
      "prodi_diterima": { "type": "string", "nullable": true },
      "jenjang_diterima": { "type": "string", "nullable": true },
      "fakultas_diterima": { "type": "string", "nullable": true },
      "pilihan_ke": { "type": "integer", "nullable": true },
      "skor_akhir": { "type": "number" },
      "nim_resmi": { "type": "string", "nullable": true },
      "nomor_surat_loa": { "type": "string", "nullable": true },
      "tanggal_sk": { "type": "string", "format": "date", "nullable": true },
      "is_published": { "type": "boolean" },
      "tgl_pengumuman": { "type": "string", "format": "date-time", "nullable": true },
      "is_pengumuman_buka": { "type": "boolean" },
      "status_daftar_ulang": { "type": "string" },
      "pesan": { "type": "string" }
    }
  },
  "TagihanDaftarUlangDto": {
    "type": "object",
    "required": ["id", "nomor_tagihan", "nominal_asli", "nominal_akhir", "diskon", "status", "metode_pembayaran"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "nomor_tagihan": { "type": "string" },
      "nominal_asli": { "type": "integer" },
      "nominal_akhir": { "type": "integer" },
      "diskon": { "type": "integer" },
      "status": { "type": "string" },
      "metode_pembayaran": { "type": "string" },
      "payment_url": { "type": "string", "nullable": true },
      "va_number": { "type": "string", "nullable": true }
    }
  },
  "DaftarUlangInfoResponse": {
    "type": "object",
    "required": ["pendaftar_id", "nomor_pendaftaran", "nama_lengkap", "prodi_diterima", "jenjang", "fakultas", "status_kelulusan", "status_daftar_ulang", "berkas_list"],
    "properties": {
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "nomor_pendaftaran": { "type": "string" },
      "nama_lengkap": { "type": "string" },
      "prodi_diterima": { "type": "string" },
      "jenjang": { "type": "string" },
      "fakultas": { "type": "string" },
      "status_kelulusan": { "type": "string" },
      "status_daftar_ulang": { "type": "string" },
      "nim_resmi": { "type": "string", "nullable": true },
      "nomor_loa": { "type": "string", "nullable": true },
      "tagihan": { "$ref": "#/components/schemas/TagihanDaftarUlangDto" },
      "berkas_list": { "type": "array", "items": { "$ref": "#/components/schemas/BerkasDaftarUlang" } }
    }
  },
  "DrafKelulusanItemDto": {
    "type": "object",
    "required": ["pendaftar_id", "nomor_pendaftaran", "nama_lengkap", "jalur_id", "jalur_nama", "prodi_pilihan_1_id", "prodi_pilihan_1_nama", "skor_cbt", "nilai_rapor", "nilai_prestasi", "skor_akhir", "ranking", "status_kelulusan"],
    "properties": {
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "nomor_pendaftaran": { "type": "string" },
      "nama_lengkap": { "type": "string" },
      "jalur_id": { "type": "string", "format": "uuid" },
      "jalur_nama": { "type": "string" },
      "prodi_pilihan_1_id": { "type": "string", "format": "uuid" },
      "prodi_pilihan_1_nama": { "type": "string" },
      "prodi_pilihan_2_id": { "type": "string", "format": "uuid", "nullable": true },
      "prodi_pilihan_2_nama": { "type": "string", "nullable": true },
      "skor_cbt": { "type": "number" },
      "nilai_rapor": { "type": "number" },
      "nilai_prestasi": { "type": "number" },
      "skor_akhir": { "type": "number" },
      "ranking": { "type": "integer" },
      "status_kelulusan": { "type": "string" },
      "prodi_diterima_id": { "type": "string", "format": "uuid", "nullable": true },
      "prodi_diterima_nama": { "type": "string", "nullable": true },
      "pilihan_ke": { "type": "integer", "nullable": true },
      "catatan": { "type": "string", "nullable": true }
    }
  },
  "DrafKelulusanResponse": {
    "type": "object",
    "required": ["sidang", "items", "audit_logs"],
    "properties": {
      "sidang": { "$ref": "#/components/schemas/SidangKelulusan" },
      "items": { "type": "array", "items": { "$ref": "#/components/schemas/DrafKelulusanItemDto" } },
      "audit_logs": { "type": "array", "items": { "$ref": "#/components/schemas/AuditKelulusan" } }
    }
  },
  "GenerateNimResponse": {
    "type": "object",
    "required": ["pendaftar_id", "nomor_pendaftaran", "nama_lengkap", "prodi_nama", "nim_resmi", "status_daftar_ulang", "pesan"],
    "properties": {
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "nomor_pendaftaran": { "type": "string" },
      "nama_lengkap": { "type": "string" },
      "prodi_nama": { "type": "string" },
      "nim_resmi": { "type": "string" },
      "status_daftar_ulang": { "type": "string" },
      "pesan": { "type": "string" }
    }
  },
  "EksporSiakadItemDto": {
    "type": "object",
    "required": ["no", "nim", "nomor_pendaftaran", "nama_lengkap", "nik", "tempat_lahir", "tgl_lahir", "jenis_kelamin", "agama", "alamat", "no_hp", "email", "nama_ibu_kandung", "nama_ayah", "kode_prodi", "nama_prodi", "jenjang", "jalur_masuk", "tahun_masuk", "skor_akhir"],
    "properties": {
      "no": { "type": "integer" },
      "nim": { "type": "string" },
      "nomor_pendaftaran": { "type": "string" },
      "nama_lengkap": { "type": "string" },
      "nik": { "type": "string" },
      "tempat_lahir": { "type": "string" },
      "tgl_lahir": { "type": "string" },
      "jenis_kelamin": { "type": "string" },
      "agama": { "type": "string" },
      "alamat": { "type": "string" },
      "no_hp": { "type": "string" },
      "email": { "type": "string" },
      "nama_ibu_kandung": { "type": "string" },
      "nama_ayah": { "type": "string" },
      "kode_prodi": { "type": "string" },
      "nama_prodi": { "type": "string" },
      "jenjang": { "type": "string" },
      "jalur_masuk": { "type": "string" },
      "tahun_masuk": { "type": "string" },
      "skor_akhir": { "type": "number" },
      "tanggal_daftar_ulang": { "type": "string", "nullable": true }
    }
  },
  "UpdateRumusRequest": {
    "type": "object",
    "required": ["bobot_cbt", "bobot_rapor", "bobot_prestasi", "bobot_wawancara", "default_passing_score"],
    "properties": {
      "bobot_cbt": { "type": "number", "minimum": 0, "maximum": 100 },
      "bobot_rapor": { "type": "number", "minimum": 0, "maximum": 100 },
      "bobot_prestasi": { "type": "number", "minimum": 0, "maximum": 100 },
      "bobot_wawancara": { "type": "number", "minimum": 0, "maximum": 100 },
      "default_passing_score": { "type": "number", "minimum": 0, "maximum": 100 },
      "keterangan": { "type": "string", "nullable": true }
    }
  },
  "ProsesRankingRequest": {
    "type": "object",
    "required": ["nama_sidang", "tgl_pengumuman"],
    "properties": {
      "gelombang_id": { "type": "string", "format": "uuid", "nullable": true },
      "nama_sidang": { "type": "string" },
      "nomor_sk": { "type": "string", "nullable": true },
      "tgl_pengumuman": { "type": "string", "format": "date-time" }
    }
  },
  "ApprovalSidangRequest": {
    "type": "object",
    "properties": {
      "catatan": { "type": "string", "nullable": true }
    }
  },
  "UpdateStatusKandidatRequest": {
    "type": "object",
    "required": ["pendaftar_id", "status_baru", "catatan"],
    "properties": {
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "status_baru": { "type": "string" },
      "prodi_diterima_id": { "type": "string", "format": "uuid", "nullable": true },
      "catatan": { "type": "string" }
    }
  },
  "UploadBerkasDaftarUlangRequest": {
    "type": "object",
    "required": ["jenis_berkas", "file_name", "mime_type", "file_size_bytes", "file_key"],
    "properties": {
      "jenis_berkas": { "type": "string" },
      "file_name": { "type": "string" },
      "mime_type": { "type": "string" },
      "file_size_bytes": { "type": "integer" },
      "file_key": { "type": "string" }
    }
  },
  "VerifikasiBerkasDaftarUlangRequest": {
    "type": "object",
    "required": ["status"],
    "properties": {
      "status": { "type": "string", "enum": ["VALID", "INVALID"] },
      "catatan": { "type": "string", "nullable": true }
    }
  }
};

// 5. Tambahkan paths & schemas Modul Jalur RPL
const rplPaths = {
  "/api/rpl/mata-kuliah/{prodi_id}": {
    "get": {
      "tags": ["RPL"],
      "summary": "Daftar mata kuliah kurikulum program studi aktif",
      "operationId": "get_mata_kuliah_by_prodi_handler",
      "parameters": [{ "name": "prodi_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Daftar mata kuliah",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/MataKuliah" } } } }
        }
      }
    }
  },
  "/api/rpl/my-permohonan": {
    "get": {
      "tags": ["RPL"],
      "summary": "Detail permohonan RPL milik calon mahasiswa login",
      "operationId": "get_my_permohonan_handler",
      "responses": {
        "200": {
          "description": "Data permohonan RPL calon",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/RplPermohonanDetailResponse" } } }
        }
      }
    }
  },
  "/api/rpl/submit": {
    "post": {
      "tags": ["RPL"],
      "summary": "Simpan draf atau ajukan permohonan RPL calon",
      "operationId": "submit_permohonan_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/SubmitRplPermohonanRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Permohonan RPL berhasil disimpan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/RplPermohonanDetailResponse" } } }
        }
      }
    }
  },
  "/api/rpl/admin/permohonan": {
    "get": {
      "tags": ["RPL"],
      "summary": "Daftar rekapitulasi permohonan RPL (terfilter otomatis untuk asesor)",
      "operationId": "list_permohonan_handler",
      "parameters": [
        { "name": "prodi_id", "in": "query", "required": false, "schema": { "type": "string", "format": "uuid" } },
        { "name": "status", "in": "query", "required": false, "schema": { "type": "string" } }
      ],
      "responses": {
        "200": {
          "description": "Daftar permohonan",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/RplItemRekapDto" } } } }
        }
      }
    }
  },
  "/api/rpl/admin/permohonan/{id}": {
    "get": {
      "tags": ["RPL"],
      "summary": "Detail lengkap permohonan RPL calon",
      "operationId": "get_permohonan_detail_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Detail permohonan RPL",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/RplPermohonanDetailResponse" } } }
        }
      }
    }
  },
  "/api/rpl/admin/assign-asesor/{id}": {
    "post": {
      "tags": ["RPL"],
      "summary": "Admin menugaskan asesor RPL",
      "operationId": "assign_asesor_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/AssignAsesorRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Asesor berhasil ditugaskan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/RplPermohonanDetailResponse" } } }
        }
      }
    }
  },
  "/api/rpl/asesor/penilaian/{id}": {
    "post": {
      "tags": ["RPL"],
      "summary": "Simpan penilaian mata kuliah atau finalisasi konversi SKS",
      "operationId": "submit_penilaian_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/SubmitPenilaianRplRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Hasil penilaian berhasil disimpan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/RplPermohonanDetailResponse" } } }
        }
      }
    }
  },
  "/api/rpl/admin/laporan/{id}": {
    "get": {
      "tags": ["RPL"],
      "summary": "Ambil data laporan Berita Acara Rekognisi RPL",
      "operationId": "get_laporan_rpl_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Laporan Berita Acara",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/LaporanRplResponse" } } }
        }
      }
    }
  },
  "/api/rpl/admin/laporan/{id}/export": {
    "get": {
      "tags": ["RPL"],
      "summary": "Unduh Berita Acara Rekognisi RPL dalam format CSV",
      "operationId": "export_laporan_csv_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "File CSV Berita Acara"
        }
      }
    }
  },
  "/api/rpl/admin/mata-kuliah": {
    "get": {
      "tags": ["RPL"],
      "summary": "Daftar semua mata kuliah kurikulum",
      "operationId": "list_all_mata_kuliah_handler",
      "responses": {
        "200": {
          "description": "Daftar mata kuliah",
          "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/MataKuliah" } } } }
        }
      }
    },
    "post": {
      "tags": ["RPL"],
      "summary": "Tambah mata kuliah kurikulum baru",
      "operationId": "create_mata_kuliah_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateMataKuliahRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Mata kuliah berhasil ditambahkan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/MataKuliah" } } }
        }
      }
    }
  },
  "/api/rpl/admin/mata-kuliah/{id}": {
    "put": {
      "tags": ["RPL"],
      "summary": "Perbarui mata kuliah kurikulum",
      "operationId": "update_mata_kuliah_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateMataKuliahRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Mata kuliah berhasil diperbarui",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/MataKuliah" } } }
        }
      }
    }
  }
};

const rplSchemas = {
  "MataKuliah": {
    "type": "object",
    "required": ["id", "prodi_id", "kode_mk", "nama_mk", "sks", "semester", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "prodi_id": { "type": "string", "format": "uuid" },
      "kode_mk": { "type": "string" },
      "nama_mk": { "type": "string" },
      "sks": { "type": "integer" },
      "semester": { "type": "integer" },
      "silabus_ringkas": { "type": "string", "nullable": true },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "RiwayatPendidikanItem": {
    "type": "object",
    "required": ["jenjang", "nama_institusi", "program_studi", "tahun_lulus"],
    "properties": {
      "jenjang": { "type": "string" },
      "nama_institusi": { "type": "string" },
      "program_studi": { "type": "string" },
      "tahun_lulus": { "type": "integer" },
      "ipk_nilai": { "type": "number", "nullable": true },
      "nomor_ijazah": { "type": "string", "nullable": true }
    }
  },
  "PengalamanKerjaItem": {
    "type": "object",
    "required": ["nama_perusahaan", "jabatan", "deskripsi_pekerjaan", "tanggal_mulai", "masih_bekerja"],
    "properties": {
      "nama_perusahaan": { "type": "string" },
      "jabatan": { "type": "string" },
      "deskripsi_pekerjaan": { "type": "string" },
      "tanggal_mulai": { "type": "string" },
      "tanggal_selesai": { "type": "string", "nullable": true },
      "masih_bekerja": { "type": "boolean" },
      "bukti_dokumen_url": { "type": "string", "nullable": true }
    }
  },
  "BerkasRplItem": {
    "type": "object",
    "required": ["jenis_dokumen", "nama_file", "url", "ukuran_bytes"],
    "properties": {
      "jenis_dokumen": { "type": "string" },
      "nama_file": { "type": "string" },
      "url": { "type": "string" },
      "ukuran_bytes": { "type": "integer" },
      "keterangan": { "type": "string", "nullable": true }
    }
  },
  "RplMataKuliahDiajukanDetail": {
    "type": "object",
    "required": ["id", "permohonan_id", "mata_kuliah_id", "kode_mk", "nama_mk", "sks", "semester", "status_kelayakan"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "permohonan_id": { "type": "string", "format": "uuid" },
      "mata_kuliah_id": { "type": "string", "format": "uuid" },
      "kode_mk": { "type": "string" },
      "nama_mk": { "type": "string" },
      "sks": { "type": "integer" },
      "semester": { "type": "integer" },
      "silabus_ringkas": { "type": "string", "nullable": true },
      "keterangan_pemohon": { "type": "string", "nullable": true },
      "status_kelayakan": { "type": "string" },
      "nilai_transfer": { "type": "string", "nullable": true },
      "bobot_nilai": { "type": "number", "nullable": true },
      "catatan_asesor": { "type": "string", "nullable": true },
      "assessed_at": { "type": "string", "format": "date-time", "nullable": true },
      "assessed_by_nama": { "type": "string", "nullable": true }
    }
  },
  "MatakuliahDiajukanInput": {
    "type": "object",
    "required": ["mata_kuliah_id", "keterangan_pemohon"],
    "properties": {
      "mata_kuliah_id": { "type": "string", "format": "uuid" },
      "keterangan_pemohon": { "type": "string" }
    }
  },
  "SubmitRplPermohonanRequest": {
    "type": "object",
    "required": ["tipe_rpl", "riwayat_pendidikan", "pengalaman_kerja", "berkas_pendukung", "mata_kuliah_list", "is_draft"],
    "properties": {
      "tipe_rpl": { "type": "string" },
      "riwayat_pendidikan": { "type": "array", "items": { "$ref": "#/components/schemas/RiwayatPendidikanItem" } },
      "pengalaman_kerja": { "type": "array", "items": { "$ref": "#/components/schemas/PengalamanKerjaItem" } },
      "berkas_pendukung": { "type": "array", "items": { "$ref": "#/components/schemas/BerkasRplItem" } },
      "mata_kuliah_list": { "type": "array", "items": { "$ref": "#/components/schemas/MatakuliahDiajukanInput" } },
      "is_draft": { "type": "boolean" }
    }
  },
  "RplPermohonanDetailResponse": {
    "type": "object",
    "required": [
      "id", "pendaftar_id", "nomor_pendaftaran", "nama_lengkap", "prodi_id", "prodi_nama", "jenjang",
      "tipe_rpl", "status", "riwayat_pendidikan", "pengalaman_kerja", "berkas_pendukung", "mata_kuliah_list",
      "total_sks_diajukan", "total_sks_diakui", "ipk_konversi", "persentase_rekognisi"
    ],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "nomor_pendaftaran": { "type": "string" },
      "nama_lengkap": { "type": "string" },
      "prodi_id": { "type": "string", "format": "uuid" },
      "prodi_nama": { "type": "string" },
      "jenjang": { "type": "string" },
      "tipe_rpl": { "type": "string" },
      "status": { "type": "string" },
      "riwayat_pendidikan": { "type": "array", "items": { "$ref": "#/components/schemas/RiwayatPendidikanItem" } },
      "pengalaman_kerja": { "type": "array", "items": { "$ref": "#/components/schemas/PengalamanKerjaItem" } },
      "berkas_pendukung": { "type": "array", "items": { "$ref": "#/components/schemas/BerkasRplItem" } },
      "mata_kuliah_list": { "type": "array", "items": { "$ref": "#/components/schemas/RplMataKuliahDiajukanDetail" } },
      "total_sks_diajukan": { "type": "integer" },
      "total_sks_diakui": { "type": "integer" },
      "ipk_konversi": { "type": "number" },
      "persentase_rekognisi": { "type": "number" },
      "asesor_id": { "type": "string", "format": "uuid", "nullable": true },
      "asesor_nama": { "type": "string", "nullable": true },
      "catatan_asesor": { "type": "string", "nullable": true },
      "catatan_admin": { "type": "string", "nullable": true },
      "submitted_at": { "type": "string", "format": "date-time", "nullable": true },
      "assessed_at": { "type": "string", "format": "date-time", "nullable": true }
    }
  },
  "AssignAsesorRequest": {
    "type": "object",
    "required": ["asesor_id"],
    "properties": {
      "asesor_id": { "type": "string", "format": "uuid" },
      "catatan_admin": { "type": "string", "nullable": true }
    }
  },
  "PenilaianMataKuliahInput": {
    "type": "object",
    "required": ["mata_kuliah_id", "status_kelayakan"],
    "properties": {
      "mata_kuliah_id": { "type": "string", "format": "uuid" },
      "status_kelayakan": { "type": "string" },
      "nilai_transfer": { "type": "string", "nullable": true },
      "catatan_asesor": { "type": "string", "nullable": true }
    }
  },
  "SubmitPenilaianRplRequest": {
    "type": "object",
    "required": ["items", "finalisasi"],
    "properties": {
      "items": { "type": "array", "items": { "$ref": "#/components/schemas/PenilaianMataKuliahInput" } },
      "catatan_asesor": { "type": "string", "nullable": true },
      "finalisasi": { "type": "boolean" }
    }
  },
  "RplItemRekapDto": {
    "type": "object",
    "required": [
      "id", "pendaftar_id", "nomor_pendaftaran", "nama_lengkap", "prodi_nama", "jenjang",
      "tipe_rpl", "status", "total_sks_diajukan", "total_sks_diakui", "ipk_konversi", "persentase_rekognisi"
    ],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "pendaftar_id": { "type": "string", "format": "uuid" },
      "nomor_pendaftaran": { "type": "string" },
      "nama_lengkap": { "type": "string" },
      "prodi_nama": { "type": "string" },
      "jenjang": { "type": "string" },
      "tipe_rpl": { "type": "string" },
      "status": { "type": "string" },
      "total_sks_diajukan": { "type": "integer" },
      "total_sks_diakui": { "type": "integer" },
      "ipk_konversi": { "type": "number" },
      "persentase_rekognisi": { "type": "number" },
      "asesor_id": { "type": "string", "format": "uuid", "nullable": true },
      "asesor_nama": { "type": "string", "nullable": true },
      "submitted_at": { "type": "string", "format": "date-time", "nullable": true },
      "assessed_at": { "type": "string", "format": "date-time", "nullable": true }
    }
  },
  "LaporanRplItemCourse": {
    "type": "object",
    "required": ["no", "kode_mk", "nama_mk", "sks", "semester", "status_kelayakan", "nilai_transfer", "bobot_nilai", "catatan_asesor"],
    "properties": {
      "no": { "type": "integer" },
      "kode_mk": { "type": "string" },
      "nama_mk": { "type": "string" },
      "sks": { "type": "integer" },
      "semester": { "type": "integer" },
      "status_kelayakan": { "type": "string" },
      "nilai_transfer": { "type": "string" },
      "bobot_nilai": { "type": "number" },
      "catatan_asesor": { "type": "string" }
    }
  },
  "LaporanRplResponse": {
    "type": "object",
    "required": [
      "nomor_berita_acara", "tanggal_berita_acara", "permohonan_id", "nomor_pendaftaran", "nama_lengkap",
      "nik", "prodi_nama", "jenjang", "fakultas", "tipe_rpl", "total_sks_diajukan", "total_sks_diakui",
      "ipk_konversi", "persentase_rekognisi", "asesor_nama", "catatan_rekomendasi", "daftar_mata_kuliah"
    ],
    "properties": {
      "nomor_berita_acara": { "type": "string" },
      "tanggal_berita_acara": { "type": "string" },
      "permohonan_id": { "type": "string", "format": "uuid" },
      "nomor_pendaftaran": { "type": "string" },
      "nama_lengkap": { "type": "string" },
      "nik": { "type": "string" },
      "prodi_nama": { "type": "string" },
      "jenjang": { "type": "string" },
      "fakultas": { "type": "string" },
      "tipe_rpl": { "type": "string" },
      "total_sks_diajukan": { "type": "integer" },
      "total_sks_diakui": { "type": "integer" },
      "ipk_konversi": { "type": "number" },
      "persentase_rekognisi": { "type": "number" },
      "asesor_nama": { "type": "string" },
      "catatan_rekomendasi": { "type": "string" },
      "daftar_mata_kuliah": { "type": "array", "items": { "$ref": "#/components/schemas/LaporanRplItemCourse" } }
    }
  },
  "CreateMataKuliahRequest": {
    "type": "object",
    "required": ["prodi_id", "kode_mk", "nama_mk", "sks", "semester"],
    "properties": {
      "prodi_id": { "type": "string", "format": "uuid" },
      "kode_mk": { "type": "string" },
      "nama_mk": { "type": "string" },
      "sks": { "type": "integer" },
      "semester": { "type": "integer" },
      "silabus_ringkas": { "type": "string", "nullable": true }
    }
  },
  "UpdateMataKuliahRequest": {
    "type": "object",
    "required": ["nama_mk", "sks", "semester", "is_active"],
    "properties": {
      "nama_mk": { "type": "string" },
      "sks": { "type": "integer" },
      "semester": { "type": "integer" },
      "silabus_ringkas": { "type": "string", "nullable": true },
      "is_active": { "type": "boolean" }
    }
  }
};

// 6. CMS & Executive Dashboard Analytics Paths
const cmsAndDashboardPaths = {
  "/api/cms/posts": {
    "get": {
      "tags": ["CMS Publik"],
      "summary": "Daftar artikel / pengumuman terpublikasi",
      "operationId": "list_posts_handler",
      "parameters": [{ "name": "kategori", "in": "query", "required": false, "schema": { "type": "string" } }],
      "responses": {
        "200": { "description": "Daftar artikel terpublikasi", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/CmsPostResponse" } } } } }
      }
    }
  },
  "/api/cms/posts/{slug}": {
    "get": {
      "tags": ["CMS Publik"],
      "summary": "Detail artikel / pengumuman berdasarkan slug",
      "operationId": "get_post_handler",
      "parameters": [{ "name": "slug", "in": "path", "required": true, "schema": { "type": "string" } }],
      "responses": {
        "200": { "description": "Detail artikel", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsPostResponse" } } } }
      }
    }
  },
  "/api/cms/banners": {
    "get": {
      "tags": ["CMS Publik"],
      "summary": "Daftar banner homepage slider aktif",
      "operationId": "list_banners_handler",
      "responses": {
        "200": { "description": "Daftar banner aktif", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/CmsBannerResponse" } } } } }
      }
    }
  },
  "/api/cms/faqs": {
    "get": {
      "tags": ["CMS Publik"],
      "summary": "Daftar pertanyaan umum aktif",
      "operationId": "list_faqs_handler",
      "parameters": [{ "name": "kategori", "in": "query", "required": false, "schema": { "type": "string" } }],
      "responses": {
        "200": { "description": "Daftar FAQ", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/CmsFaqResponse" } } } } }
      }
    }
  },
  "/api/cms/pages/{slug}": {
    "get": {
      "tags": ["CMS Publik"],
      "summary": "Halaman statis / kebijakan privasi berdasarkan slug",
      "operationId": "get_page_handler",
      "parameters": [{ "name": "slug", "in": "path", "required": true, "schema": { "type": "string" } }],
      "responses": {
        "200": { "description": "Konten halaman statis", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsPageResponse" } } } }
      }
    }
  },
  "/api/cms/admin/posts": {
    "get": {
      "tags": ["CMS Admin"],
      "summary": "Daftar seluruh artikel untuk admin",
      "operationId": "admin_list_posts_handler",
      "parameters": [{ "name": "kategori", "in": "query", "required": false, "schema": { "type": "string" } }],
      "responses": {
        "200": { "description": "Daftar artikel", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/CmsPostResponse" } } } } }
      }
    },
    "post": {
      "tags": ["CMS Admin"],
      "summary": "Buat artikel / pengumuman baru",
      "operationId": "admin_create_post_handler",
      "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateCmsPostRequest" } } } },
      "responses": {
        "200": { "description": "Artikel baru berhasil dibuat", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsPostResponse" } } } }
      }
    }
  },
  "/api/cms/admin/posts/{id}": {
    "get": {
      "tags": ["CMS Admin"],
      "summary": "Detail artikel untuk admin",
      "operationId": "admin_get_post_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": { "description": "Detail artikel", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsPostResponse" } } } }
      }
    },
    "put": {
      "tags": ["CMS Admin"],
      "summary": "Perbarui artikel",
      "operationId": "admin_update_post_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateCmsPostRequest" } } } },
      "responses": {
        "200": { "description": "Artikel berhasil diperbarui", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsPostResponse" } } } }
      }
    },
    "delete": {
      "tags": ["CMS Admin"],
      "summary": "Hapus artikel",
      "operationId": "admin_delete_post_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": { "description": "Artikel berhasil dihapus" }
      }
    }
  },
  "/api/cms/admin/banners": {
    "get": {
      "tags": ["CMS Admin"],
      "summary": "Daftar banner admin",
      "operationId": "admin_list_banners_handler",
      "responses": {
        "200": { "description": "Daftar banner", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/CmsBannerResponse" } } } } }
      }
    },
    "post": {
      "tags": ["CMS Admin"],
      "summary": "Buat banner baru",
      "operationId": "admin_create_banner_handler",
      "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateCmsBannerRequest" } } } },
      "responses": {
        "200": { "description": "Banner berhasil dibuat", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsBannerResponse" } } } }
      }
    }
  },
  "/api/cms/admin/banners/{id}": {
    "get": {
      "tags": ["CMS Admin"],
      "summary": "Detail banner admin",
      "operationId": "admin_get_banner_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": { "description": "Detail banner", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsBannerResponse" } } } }
      }
    },
    "put": {
      "tags": ["CMS Admin"],
      "summary": "Perbarui banner",
      "operationId": "admin_update_banner_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateCmsBannerRequest" } } } },
      "responses": {
        "200": { "description": "Banner berhasil diperbarui", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsBannerResponse" } } } }
      }
    },
    "delete": {
      "tags": ["CMS Admin"],
      "summary": "Hapus banner",
      "operationId": "admin_delete_banner_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": { "description": "Banner berhasil dihapus" }
      }
    }
  },
  "/api/cms/admin/faqs": {
    "get": {
      "tags": ["CMS Admin"],
      "summary": "Daftar seluruh FAQ admin",
      "operationId": "admin_list_faqs_handler",
      "responses": {
        "200": { "description": "Daftar FAQ", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/CmsFaqResponse" } } } } }
      }
    },
    "post": {
      "tags": ["CMS Admin"],
      "summary": "Buat FAQ baru",
      "operationId": "admin_create_faq_handler",
      "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateCmsFaqRequest" } } } },
      "responses": {
        "200": { "description": "FAQ baru berhasil dibuat", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsFaqResponse" } } } }
      }
    }
  },
  "/api/cms/admin/faqs/{id}": {
    "get": {
      "tags": ["CMS Admin"],
      "summary": "Detail FAQ admin",
      "operationId": "admin_get_faq_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": { "description": "Detail FAQ", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsFaqResponse" } } } }
      }
    },
    "put": {
      "tags": ["CMS Admin"],
      "summary": "Perbarui FAQ",
      "operationId": "admin_update_faq_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateCmsFaqRequest" } } } },
      "responses": {
        "200": { "description": "FAQ berhasil diperbarui", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsFaqResponse" } } } }
      }
    },
    "delete": {
      "tags": ["CMS Admin"],
      "summary": "Hapus FAQ",
      "operationId": "admin_delete_faq_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": { "description": "FAQ berhasil dihapus" }
      }
    }
  },
  "/api/cms/admin/pages": {
    "get": {
      "tags": ["CMS Admin"],
      "summary": "Daftar halaman statis admin",
      "operationId": "admin_list_pages_handler",
      "responses": {
        "200": { "description": "Daftar halaman", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/CmsPageResponse" } } } } }
      }
    },
    "post": {
      "tags": ["CMS Admin"],
      "summary": "Buat halaman statis baru",
      "operationId": "admin_create_page_handler",
      "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateCmsPageRequest" } } } },
      "responses": {
        "200": { "description": "Halaman berhasil dibuat", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsPageResponse" } } } }
      }
    }
  },
  "/api/cms/admin/pages/{id}": {
    "get": {
      "tags": ["CMS Admin"],
      "summary": "Detail halaman statis admin",
      "operationId": "admin_get_page_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": { "description": "Detail halaman", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsPageResponse" } } } }
      }
    },
    "put": {
      "tags": ["CMS Admin"],
      "summary": "Perbarui halaman statis",
      "operationId": "admin_update_page_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateCmsPageRequest" } } } },
      "responses": {
        "200": { "description": "Halaman berhasil diperbarui", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CmsPageResponse" } } } }
      }
    },
    "delete": {
      "tags": ["CMS Admin"],
      "summary": "Hapus halaman statis",
      "operationId": "admin_delete_page_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": { "description": "Halaman berhasil dihapus" }
      }
    }
  },
  "/api/cms/admin/upload-presign": {
    "post": {
      "tags": ["CMS Admin"],
      "summary": "Minta presigned URL untuk unggah media / foto banner",
      "operationId": "admin_upload_presign_handler",
      "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PresignMediaUploadRequest" } } } },
      "responses": {
        "200": { "description": "Presigned URL berhasil dibuat", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UploadMediaResponse" } } } }
      }
    }
  },
  "/api/dashboard/admin/stats": {
    "get": {
      "tags": ["Dashboard Admin"],
      "summary": "Analisis data eksekutif PMB dengan filter periode",
      "operationId": "get_executive_dashboard_handler",
      "parameters": [
        { "name": "start_date", "in": "query", "required": false, "schema": { "type": "string" } },
        { "name": "end_date", "in": "query", "required": false, "schema": { "type": "string" } },
        { "name": "gelombang_id", "in": "query", "required": false, "schema": { "type": "string", "format": "uuid" } },
        { "name": "jalur_id", "in": "query", "required": false, "schema": { "type": "string", "format": "uuid" } }
      ],
      "responses": {
        "200": { "description": "Ringkasan analitik eksekutif", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ExecutiveDashboardResponse" } } } }
      }
    }
  },
  "/api/dashboard/admin/export-excel": {
    "get": {
      "tags": ["Dashboard Admin"],
      "summary": "Ekspor laporan analitik eksekutif dalam format spreadsheet CSV",
      "operationId": "export_excel_dashboard_handler",
      "parameters": [
        { "name": "start_date", "in": "query", "required": false, "schema": { "type": "string" } },
        { "name": "end_date", "in": "query", "required": false, "schema": { "type": "string" } },
        { "name": "gelombang_id", "in": "query", "required": false, "schema": { "type": "string", "format": "uuid" } },
        { "name": "jalur_id", "in": "query", "required": false, "schema": { "type": "string", "format": "uuid" } }
      ],
      "responses": {
        "200": { "description": "File laporan CSV UTF-8 BOM" }
      }
    }
  }
};

const cmsAndDashboardSchemas = {
  "CmsPostResponse": {
    "type": "object",
    "required": ["id", "slug", "judul", "kategori", "ringkasan", "konten", "tags", "author_nama", "is_published", "published_at", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "slug": { "type": "string" },
      "judul": { "type": "string" },
      "kategori": { "type": "string" },
      "ringkasan": { "type": "string" },
      "konten": { "type": "string" },
      "gambar_url": { "type": "string", "nullable": true },
      "tags": { "type": "array", "items": { "type": "string" } },
      "author_nama": { "type": "string" },
      "is_published": { "type": "boolean" },
      "published_at": { "type": "string", "format": "date-time" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "CreateCmsPostRequest": {
    "type": "object",
    "required": ["judul", "kategori", "ringkasan", "konten"],
    "properties": {
      "judul": { "type": "string" },
      "kategori": { "type": "string" },
      "ringkasan": { "type": "string" },
      "konten": { "type": "string" },
      "gambar_url": { "type": "string", "nullable": true },
      "tags": { "type": "array", "items": { "type": "string" }, "nullable": true },
      "is_published": { "type": "boolean", "nullable": true }
    }
  },
  "UpdateCmsPostRequest": {
    "type": "object",
    "required": ["judul", "kategori", "ringkasan", "konten", "is_published"],
    "properties": {
      "judul": { "type": "string" },
      "kategori": { "type": "string" },
      "ringkasan": { "type": "string" },
      "konten": { "type": "string" },
      "gambar_url": { "type": "string", "nullable": true },
      "tags": { "type": "array", "items": { "type": "string" }, "nullable": true },
      "is_published": { "type": "boolean" }
    }
  },
  "CmsBannerResponse": {
    "type": "object",
    "required": ["id", "judul", "gambar_url", "urutan", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "judul": { "type": "string" },
      "subjudul": { "type": "string", "nullable": true },
      "gambar_url": { "type": "string" },
      "link_url": { "type": "string", "nullable": true },
      "urutan": { "type": "integer" },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "CreateCmsBannerRequest": {
    "type": "object",
    "required": ["judul", "gambar_url"],
    "properties": {
      "judul": { "type": "string" },
      "subjudul": { "type": "string", "nullable": true },
      "gambar_url": { "type": "string" },
      "link_url": { "type": "string", "nullable": true },
      "urutan": { "type": "integer", "nullable": true },
      "is_active": { "type": "boolean", "nullable": true }
    }
  },
  "UpdateCmsBannerRequest": {
    "type": "object",
    "required": ["judul", "gambar_url", "urutan", "is_active"],
    "properties": {
      "judul": { "type": "string" },
      "subjudul": { "type": "string", "nullable": true },
      "gambar_url": { "type": "string" },
      "link_url": { "type": "string", "nullable": true },
      "urutan": { "type": "integer" },
      "is_active": { "type": "boolean" }
    }
  },
  "CmsFaqResponse": {
    "type": "object",
    "required": ["id", "kategori", "pertanyaan", "jawaban", "urutan", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "kategori": { "type": "string" },
      "pertanyaan": { "type": "string" },
      "jawaban": { "type": "string" },
      "urutan": { "type": "integer" },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "CreateCmsFaqRequest": {
    "type": "object",
    "required": ["kategori", "pertanyaan", "jawaban"],
    "properties": {
      "kategori": { "type": "string" },
      "pertanyaan": { "type": "string" },
      "jawaban": { "type": "string" },
      "urutan": { "type": "integer", "nullable": true },
      "is_active": { "type": "boolean", "nullable": true }
    }
  },
  "UpdateCmsFaqRequest": {
    "type": "object",
    "required": ["kategori", "pertanyaan", "jawaban", "urutan", "is_active"],
    "properties": {
      "kategori": { "type": "string" },
      "pertanyaan": { "type": "string" },
      "jawaban": { "type": "string" },
      "urutan": { "type": "integer" },
      "is_active": { "type": "boolean" }
    }
  },
  "CmsPageResponse": {
    "type": "object",
    "required": ["id", "slug", "judul", "konten", "is_published", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "slug": { "type": "string" },
      "judul": { "type": "string" },
      "konten": { "type": "string" },
      "meta_title": { "type": "string", "nullable": true },
      "meta_description": { "type": "string", "nullable": true },
      "is_published": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "CreateCmsPageRequest": {
    "type": "object",
    "required": ["slug", "judul", "konten"],
    "properties": {
      "slug": { "type": "string" },
      "judul": { "type": "string" },
      "konten": { "type": "string" },
      "meta_title": { "type": "string", "nullable": true },
      "meta_description": { "type": "string", "nullable": true },
      "is_published": { "type": "boolean", "nullable": true }
    }
  },
  "UpdateCmsPageRequest": {
    "type": "object",
    "required": ["judul", "konten", "is_published"],
    "properties": {
      "judul": { "type": "string" },
      "konten": { "type": "string" },
      "meta_title": { "type": "string", "nullable": true },
      "meta_description": { "type": "string", "nullable": true },
      "is_published": { "type": "boolean" }
    }
  },
  "PresignMediaUploadRequest": {
    "type": "object",
    "required": ["file_name"],
    "properties": {
      "file_name": { "type": "string" }
    }
  },
  "UploadMediaResponse": {
    "type": "object",
    "required": ["url", "file_key", "upload_url", "file_name"],
    "properties": {
      "url": { "type": "string" },
      "file_key": { "type": "string" },
      "upload_url": { "type": "string" },
      "file_name": { "type": "string" }
    }
  },
  "TrenHarianStat": {
    "type": "object",
    "required": ["tanggal", "pendaftar", "terverifikasi", "bayar"],
    "properties": {
      "tanggal": { "type": "string" },
      "pendaftar": { "type": "integer" },
      "terverifikasi": { "type": "integer" },
      "bayar": { "type": "integer" }
    }
  },
  "DistribusiProdiStat": {
    "type": "object",
    "required": ["prodi_id", "kode_prodi", "nama_prodi", "jenjang", "kuota", "total_peminat", "total_lulus", "total_daftar_ulang"],
    "properties": {
      "prodi_id": { "type": "string", "format": "uuid" },
      "kode_prodi": { "type": "string" },
      "nama_prodi": { "type": "string" },
      "jenjang": { "type": "string" },
      "kuota": { "type": "integer" },
      "total_peminat": { "type": "integer" },
      "total_lulus": { "type": "integer" },
      "total_daftar_ulang": { "type": "integer" }
    }
  },
  "DistribusiJalurStat": {
    "type": "object",
    "required": ["jalur_id", "nama_jalur", "total_pendaftar", "total_lulus"],
    "properties": {
      "jalur_id": { "type": "string", "format": "uuid" },
      "nama_jalur": { "type": "string" },
      "total_pendaftar": { "type": "integer" },
      "total_lulus": { "type": "integer" }
    }
  },
  "StatusPendaftaranStat": {
    "type": "object",
    "required": ["status", "label", "jumlah", "persentase"],
    "properties": {
      "status": { "type": "string" },
      "label": { "type": "string" },
      "jumlah": { "type": "integer" },
      "persentase": { "type": "number" }
    }
  },
  "ExecutiveDashboardResponse": {
    "type": "object",
    "required": [
      "total_pendaftar", "total_berkas_diverifikasi", "total_peserta_ujian", "total_lulus",
      "total_registrasi_nim", "total_pendapatan_rupiah", "total_piutang_rupiah", "tren_harian",
      "distribusi_prodi", "distribusi_jalur", "status_pendaftaran", "funnel_tahapan"
    ],
    "properties": {
      "total_pendaftar": { "type": "integer" },
      "total_berkas_diverifikasi": { "type": "integer" },
      "total_peserta_ujian": { "type": "integer" },
      "total_lulus": { "type": "integer" },
      "total_registrasi_nim": { "type": "integer" },
      "total_pendapatan_rupiah": { "type": "integer" },
      "total_piutang_rupiah": { "type": "integer" },
      "tren_harian": { "type": "array", "items": { "$ref": "#/components/schemas/TrenHarianStat" } },
      "distribusi_prodi": { "type": "array", "items": { "$ref": "#/components/schemas/DistribusiProdiStat" } },
      "distribusi_jalur": { "type": "array", "items": { "$ref": "#/components/schemas/DistribusiJalurStat" } },
      "status_pendaftaran": { "type": "array", "items": { "$ref": "#/components/schemas/StatusPendaftaranStat" } },
      "funnel_tahapan": { "type": "array", "items": { "$ref": "#/components/schemas/FunnelStat" } }
    }
  }
};

// Gabungkan ke openapi
openapi.paths = { ...openapi.paths, ...formBuilderPaths, ...pembayaranPaths, ...cbtPaths, ...kelulusanPaths, ...rplPaths, ...cmsAndDashboardPaths };
openapi.components.schemas = { ...openapi.components.schemas, ...formBuilderSchemas, ...cbtSchemas, ...kelulusanSchemas, ...rplSchemas, ...cmsAndDashboardSchemas };

fs.writeFileSync(openapiPath, JSON.stringify(openapi, null, 2), 'utf8');
console.log('openapi.json berhasil diperbarui dengan endpoints Form Builder, Dynamic Fields, Berkas, Langkah, Pembayaran Gateway, CBT, Kelulusan, RPL, serta CMS & Dashboard!');
