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
  }
};

// Gabungkan ke openapi
openapi.paths = { ...openapi.paths, ...formBuilderPaths };
openapi.components.schemas = { ...openapi.components.schemas, ...formBuilderSchemas };

fs.writeFileSync(openapiPath, JSON.stringify(openapi, null, 2), 'utf8');
console.log('openapi.json berhasil diperbarui dengan endpoints Form Builder, Dynamic Fields, Berkas, dan Langkah!');
