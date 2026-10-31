const fs = require('fs');
const path = require('path');

const openapiPath = path.resolve(__dirname, '../../api/openapi.json');
const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));

// 1. Tambahkan paths Konfigurasi Admin
const newPaths = {
  "/api/admin/konfigurasi/tahun-akademik": {
    "get": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Daftar tahun akademik",
      "operationId": "list_tahun_akademik_handler",
      "responses": {
        "200": {
          "description": "Daftar tahun akademik",
          "content": {
            "application/json": {
              "schema": { "type": "array", "items": { "$ref": "#/components/schemas/TahunAkademikResponse" } }
            }
          }
        }
      }
    },
    "post": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Tambah tahun akademik baru",
      "operationId": "create_tahun_akademik_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateTahunAkademikRequest" } } }
      },
      "responses": {
        "201": {
          "description": "Tahun akademik berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/TahunAkademikResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/tahun-akademik/{id}": {
    "put": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Ubah tahun akademik",
      "operationId": "update_tahun_akademik_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateTahunAkademikRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Tahun akademik berhasil diperbarui",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/TahunAkademikResponse" } } }
        }
      }
    },
    "delete": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Hapus tahun akademik",
      "operationId": "delete_tahun_akademik_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Tahun akademik berhasil dihapus",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GenericMessageResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/fakultas": {
    "get": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Daftar fakultas",
      "operationId": "list_fakultas_handler",
      "responses": {
        "200": {
          "description": "Daftar fakultas",
          "content": {
            "application/json": {
              "schema": { "type": "array", "items": { "$ref": "#/components/schemas/FakultasResponse" } }
            }
          }
        }
      }
    },
    "post": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Tambah fakultas baru",
      "operationId": "create_fakultas_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateFakultasRequest" } } }
      },
      "responses": {
        "201": {
          "description": "Fakultas berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/FakultasResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/fakultas/{id}": {
    "put": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Ubah fakultas",
      "operationId": "update_fakultas_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateFakultasRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Fakultas berhasil diperbarui",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/FakultasResponse" } } }
        }
      }
    },
    "delete": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Hapus fakultas",
      "operationId": "delete_fakultas_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Fakultas berhasil dihapus",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GenericMessageResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/gelombang": {
    "get": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Daftar gelombang pendaftaran admin",
      "operationId": "list_gelombang_admin_handler",
      "responses": {
        "200": {
          "description": "Daftar gelombang",
          "content": {
            "application/json": {
              "schema": { "type": "array", "items": { "$ref": "#/components/schemas/GelombangDetailResponse" } }
            }
          }
        }
      }
    },
    "post": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Tambah gelombang pendaftaran",
      "operationId": "create_gelombang_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateGelombangRequest" } } }
      },
      "responses": {
        "201": {
          "description": "Gelombang berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GelombangDetailResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/gelombang/{id}": {
    "put": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Ubah gelombang",
      "operationId": "update_gelombang_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateGelombangRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Gelombang berhasil diubah",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GelombangDetailResponse" } } }
        }
      }
    },
    "delete": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Hapus gelombang",
      "operationId": "delete_gelombang_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Gelombang berhasil dihapus",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GenericMessageResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/prodi": {
    "get": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Daftar program studi admin",
      "operationId": "list_prodi_admin_handler",
      "responses": {
        "200": {
          "description": "Daftar program studi",
          "content": {
            "application/json": {
              "schema": { "type": "array", "items": { "$ref": "#/components/schemas/ProdiDetailResponse" } }
            }
          }
        }
      }
    },
    "post": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Tambah prodi baru",
      "operationId": "create_prodi_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateProdiKonfigurasiRequest" } } }
      },
      "responses": {
        "201": {
          "description": "Program studi berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ProdiDetailResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/prodi/{id}": {
    "put": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Ubah program studi",
      "operationId": "update_prodi_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateProdiKonfigurasiRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Program studi berhasil diubah",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ProdiDetailResponse" } } }
        }
      }
    },
    "delete": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Hapus prodi",
      "operationId": "delete_prodi_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Program studi berhasil dihapus",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GenericMessageResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/kuota-prodi": {
    "get": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Daftar alokasi kuota prodi per gelombang",
      "operationId": "list_kuota_prodi_gelombang_handler",
      "responses": {
        "200": {
          "description": "Daftar kuota prodi per gelombang",
          "content": {
            "application/json": {
              "schema": { "type": "array", "items": { "$ref": "#/components/schemas/KuotaProdiGelombangResponse" } }
            }
          }
        }
      }
    },
    "put": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Set kuota prodi untuk gelombang tertentu",
      "operationId": "set_kuota_prodi_gelombang_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/SetKuotaProdiGelombangRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Kuota berhasil disimpan",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/KuotaProdiGelombangResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/jalur": {
    "get": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Daftar jalur pendaftaran admin",
      "operationId": "list_jalur_admin_handler",
      "responses": {
        "200": {
          "description": "Daftar jalur masuk",
          "content": {
            "application/json": {
              "schema": { "type": "array", "items": { "$ref": "#/components/schemas/JalurDetailResponse" } }
            }
          }
        }
      }
    },
    "post": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Tambah jalur masuk baru",
      "operationId": "create_jalur_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateJalurKonfigurasiRequest" } } }
      },
      "responses": {
        "201": {
          "description": "Jalur berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/JalurDetailResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/jalur/{id}": {
    "put": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Ubah jalur masuk",
      "operationId": "update_jalur_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateJalurKonfigurasiRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Jalur berhasil diubah",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/JalurDetailResponse" } } }
        }
      }
    },
    "delete": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Hapus jalur masuk",
      "operationId": "delete_jalur_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Jalur berhasil dihapus",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GenericMessageResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/komponen-biaya": {
    "get": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Daftar komponen biaya",
      "operationId": "list_komponen_biaya_handler",
      "responses": {
        "200": {
          "description": "Daftar komponen biaya",
          "content": {
            "application/json": {
              "schema": { "type": "array", "items": { "$ref": "#/components/schemas/KomponenBiayaResponse" } }
            }
          }
        }
      }
    },
    "post": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Tambah komponen biaya",
      "operationId": "create_komponen_biaya_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateKomponenBiayaRequest" } } }
      },
      "responses": {
        "201": {
          "description": "Komponen biaya berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/KomponenBiayaResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/komponen-biaya/{id}": {
    "put": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Ubah komponen biaya",
      "operationId": "update_komponen_biaya_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateKomponenBiayaRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Komponen biaya berhasil diubah",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/KomponenBiayaResponse" } } }
        }
      }
    },
    "delete": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Hapus komponen biaya",
      "operationId": "delete_komponen_biaya_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Komponen biaya berhasil dihapus",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GenericMessageResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/matriks-biaya": {
    "get": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Daftar matriks biaya pendaftaran & kuliah",
      "operationId": "list_matriks_biaya_handler",
      "responses": {
        "200": {
          "description": "Daftar matriks biaya",
          "content": {
            "application/json": {
              "schema": { "type": "array", "items": { "$ref": "#/components/schemas/MatriksBiayaResponse" } }
            }
          }
        }
      }
    },
    "post": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Tambah matriks biaya",
      "operationId": "create_matriks_biaya_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateMatriksBiayaRequest" } } }
      },
      "responses": {
        "201": {
          "description": "Matriks biaya berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GenericMessageResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/matriks-biaya/{id}": {
    "put": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Ubah matriks biaya",
      "operationId": "update_matriks_biaya_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateMatriksBiayaRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Matriks biaya berhasil diubah",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GenericMessageResponse" } } }
        }
      }
    },
    "delete": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Hapus matriks biaya",
      "operationId": "delete_matriks_biaya_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Matriks biaya berhasil dihapus",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GenericMessageResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/matriks-biaya/hitung": {
    "post": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Simulasi dan kalkulator perhitungan biaya",
      "operationId": "hitung_biaya_simulasi_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/HitungBiayaRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Hasil perhitungan simulasi biaya",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/HitungBiayaResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/vouchers": {
    "get": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Daftar voucher diskon",
      "operationId": "list_vouchers_handler",
      "responses": {
        "200": {
          "description": "Daftar voucher",
          "content": {
            "application/json": {
              "schema": { "type": "array", "items": { "$ref": "#/components/schemas/VoucherDetailResponse" } }
            }
          }
        }
      }
    },
    "post": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Tambah voucher baru",
      "operationId": "create_voucher_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateVoucherRequest" } } }
      },
      "responses": {
        "201": {
          "description": "Voucher berhasil dibuat",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/VoucherDetailResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/vouchers/{id}": {
    "put": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Ubah voucher",
      "operationId": "update_voucher_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateVoucherRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Voucher berhasil diubah",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/VoucherDetailResponse" } } }
        }
      }
    },
    "delete": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Hapus voucher",
      "operationId": "delete_voucher_handler",
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
      "responses": {
        "200": {
          "description": "Voucher berhasil dihapus",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/GenericMessageResponse" } } }
        }
      }
    }
  },
  "/api/admin/konfigurasi/pengaturan": {
    "get": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Daftar pengaturan PMB",
      "operationId": "list_pengaturan_handler",
      "responses": {
        "200": {
          "description": "Daftar pengaturan",
          "content": {
            "application/json": {
              "schema": { "type": "array", "items": { "$ref": "#/components/schemas/PengaturanResponse" } }
            }
          }
        }
      }
    },
    "put": {
      "tags": ["Konfigurasi Admin"],
      "summary": "Ubah pengaturan PMB",
      "operationId": "update_pengaturan_handler",
      "requestBody": {
        "required": true,
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdatePengaturanRequest" } } }
      },
      "responses": {
        "200": {
          "description": "Pengaturan berhasil diperbarui",
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PengaturanResponse" } } }
        }
      }
    }
  }
};

// 2. Tambahkan schemas Konfigurasi Admin
const newSchemas = {
  "TahunAkademikResponse": {
    "type": "object",
    "required": ["id", "kode", "nama", "tgl_mulai", "tgl_selesai", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "kode": { "type": "string" },
      "nama": { "type": "string" },
      "tgl_mulai": { "type": "string", "format": "date" },
      "tgl_selesai": { "type": "string", "format": "date" },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "CreateTahunAkademikRequest": {
    "type": "object",
    "required": ["kode", "nama", "tgl_mulai", "tgl_selesai", "is_active"],
    "properties": {
      "kode": { "type": "string" },
      "nama": { "type": "string" },
      "tgl_mulai": { "type": "string", "format": "date" },
      "tgl_selesai": { "type": "string", "format": "date" },
      "is_active": { "type": "boolean" }
    }
  },
  "UpdateTahunAkademikRequest": {
    "type": "object",
    "required": ["kode", "nama", "tgl_mulai", "tgl_selesai", "is_active"],
    "properties": {
      "kode": { "type": "string" },
      "nama": { "type": "string" },
      "tgl_mulai": { "type": "string", "format": "date" },
      "tgl_selesai": { "type": "string", "format": "date" },
      "is_active": { "type": "boolean" }
    }
  },
  "FakultasResponse": {
    "type": "object",
    "required": ["id", "kode_fakultas", "nama_fakultas", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "kode_fakultas": { "type": "string" },
      "nama_fakultas": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "CreateFakultasRequest": {
    "type": "object",
    "required": ["kode_fakultas", "nama_fakultas", "is_active"],
    "properties": {
      "kode_fakultas": { "type": "string" },
      "nama_fakultas": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "is_active": { "type": "boolean" }
    }
  },
  "GelombangDetailResponse": {
    "type": "object",
    "required": ["id", "nama_gelombang", "nomor_gelombang", "status", "tgl_mulai", "tgl_selesai", "kuota", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "nama_gelombang": { "type": "string" },
      "tahun_akademik_id": { "type": "string", "format": "uuid", "nullable": true },
      "tahun_akademik_nama": { "type": "string", "nullable": true },
      "nomor_gelombang": { "type": "integer" },
      "status": { "type": "string" },
      "tgl_mulai": { "type": "string", "format": "date-time" },
      "tgl_selesai": { "type": "string", "format": "date-time" },
      "kuota": { "type": "integer" },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "CreateGelombangRequest": {
    "type": "object",
    "required": ["nama_gelombang", "nomor_gelombang", "status", "tgl_mulai", "tgl_selesai", "kuota", "is_active"],
    "properties": {
      "nama_gelombang": { "type": "string" },
      "tahun_akademik_id": { "type": "string", "format": "uuid", "nullable": true },
      "nomor_gelombang": { "type": "integer" },
      "status": { "type": "string" },
      "tgl_mulai": { "type": "string", "format": "date-time" },
      "tgl_selesai": { "type": "string", "format": "date-time" },
      "kuota": { "type": "integer" },
      "is_active": { "type": "boolean" }
    }
  },
  "UpdateGelombangRequest": {
    "type": "object",
    "required": ["nama_gelombang", "status", "tgl_mulai", "tgl_selesai", "kuota", "is_active"],
    "properties": {
      "nama_gelombang": { "type": "string" },
      "tahun_akademik_id": { "type": "string", "format": "uuid", "nullable": true },
      "status": { "type": "string" },
      "tgl_mulai": { "type": "string", "format": "date-time" },
      "tgl_selesai": { "type": "string", "format": "date-time" },
      "kuota": { "type": "integer" },
      "is_active": { "type": "boolean" }
    }
  },
  "ProdiDetailResponse": {
    "type": "object",
    "required": ["id", "kode_prodi", "nama_prodi", "jenjang", "fakultas", "kode_fakultas", "passing_score", "kuota", "ukt_nominal", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "kode_prodi": { "type": "string" },
      "nama_prodi": { "type": "string" },
      "jenjang": { "type": "string" },
      "fakultas": { "type": "string" },
      "kode_fakultas": { "type": "string" },
      "fakultas_id": { "type": "string", "format": "uuid", "nullable": true },
      "passing_score": { "type": "number" },
      "kuota": { "type": "integer" },
      "ukt_nominal": { "type": "integer" },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "CreateProdiKonfigurasiRequest": {
    "type": "object",
    "required": ["kode_prodi", "nama_prodi", "jenjang", "fakultas", "kode_fakultas", "passing_score", "kuota", "ukt_nominal", "is_active"],
    "properties": {
      "kode_prodi": { "type": "string" },
      "nama_prodi": { "type": "string" },
      "jenjang": { "type": "string" },
      "fakultas_id": { "type": "string", "format": "uuid", "nullable": true },
      "fakultas": { "type": "string" },
      "kode_fakultas": { "type": "string" },
      "passing_score": { "type": "number" },
      "kuota": { "type": "integer" },
      "ukt_nominal": { "type": "integer" },
      "is_active": { "type": "boolean" }
    }
  },
  "UpdateProdiKonfigurasiRequest": {
    "type": "object",
    "required": ["nama_prodi", "jenjang", "fakultas", "kode_fakultas", "passing_score", "kuota", "ukt_nominal", "is_active"],
    "properties": {
      "nama_prodi": { "type": "string" },
      "jenjang": { "type": "string" },
      "fakultas_id": { "type": "string", "format": "uuid", "nullable": true },
      "fakultas": { "type": "string" },
      "kode_fakultas": { "type": "string" },
      "passing_score": { "type": "number" },
      "kuota": { "type": "integer" },
      "ukt_nominal": { "type": "integer" },
      "is_active": { "type": "boolean" }
    }
  },
  "KuotaProdiGelombangResponse": {
    "type": "object",
    "required": ["id", "prodi_id", "nama_prodi", "gelombang_id", "nama_gelombang", "kuota", "kuota_terisi", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "prodi_id": { "type": "string", "format": "uuid" },
      "nama_prodi": { "type": "string" },
      "gelombang_id": { "type": "string", "format": "uuid" },
      "nama_gelombang": { "type": "string" },
      "kuota": { "type": "integer" },
      "kuota_terisi": { "type": "integer" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "SetKuotaProdiGelombangRequest": {
    "type": "object",
    "required": ["prodi_id", "gelombang_id", "kuota"],
    "properties": {
      "prodi_id": { "type": "string", "format": "uuid" },
      "gelombang_id": { "type": "string", "format": "uuid" },
      "kuota": { "type": "integer" }
    }
  },
  "JalurDetailResponse": {
    "type": "object",
    "required": ["id", "kode_jalur", "nama_jalur", "deskripsi", "biaya_formulir", "tipe_seleksi", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "kode_jalur": { "type": "string" },
      "nama_jalur": { "type": "string" },
      "deskripsi": { "type": "string" },
      "biaya_formulir": { "type": "integer" },
      "tipe_seleksi": { "type": "string" },
      "syarat": { "type": "string", "nullable": true },
      "kuota_maksimal": { "type": "integer", "nullable": true },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "CreateJalurKonfigurasiRequest": {
    "type": "object",
    "required": ["kode_jalur", "nama_jalur", "deskripsi", "biaya_formulir", "tipe_seleksi", "is_active"],
    "properties": {
      "kode_jalur": { "type": "string" },
      "nama_jalur": { "type": "string" },
      "deskripsi": { "type": "string" },
      "biaya_formulir": { "type": "integer" },
      "tipe_seleksi": { "type": "string" },
      "syarat": { "type": "string", "nullable": true },
      "kuota_maksimal": { "type": "integer", "nullable": true },
      "is_active": { "type": "boolean" }
    }
  },
  "UpdateJalurKonfigurasiRequest": {
    "type": "object",
    "required": ["nama_jalur", "deskripsi", "biaya_formulir", "tipe_seleksi", "is_active"],
    "properties": {
      "nama_jalur": { "type": "string" },
      "deskripsi": { "type": "string" },
      "biaya_formulir": { "type": "integer" },
      "tipe_seleksi": { "type": "string" },
      "syarat": { "type": "string", "nullable": true },
      "kuota_maksimal": { "type": "integer", "nullable": true },
      "is_active": { "type": "boolean" }
    }
  },
  "KomponenBiayaResponse": {
    "type": "object",
    "required": ["id", "kode_komponen", "nama_komponen", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "kode_komponen": { "type": "string" },
      "nama_komponen": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "CreateKomponenBiayaRequest": {
    "type": "object",
    "required": ["kode_komponen", "nama_komponen", "is_active"],
    "properties": {
      "kode_komponen": { "type": "string" },
      "nama_komponen": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "is_active": { "type": "boolean" }
    }
  },
  "MatriksBiayaResponse": {
    "type": "object",
    "required": ["id", "prodi_id", "nama_prodi", "jalur_id", "nama_jalur", "gelombang_id", "nama_gelombang", "komponen_id", "nama_komponen", "kode_komponen", "nominal", "bisa_dicicil", "maksimal_cicilan", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "prodi_id": { "type": "string", "format": "uuid" },
      "nama_prodi": { "type": "string" },
      "jalur_id": { "type": "string", "format": "uuid" },
      "nama_jalur": { "type": "string" },
      "gelombang_id": { "type": "string", "format": "uuid" },
      "nama_gelombang": { "type": "string" },
      "komponen_id": { "type": "string", "format": "uuid" },
      "nama_komponen": { "type": "string" },
      "kode_komponen": { "type": "string" },
      "nominal": { "type": "integer" },
      "bisa_dicicil": { "type": "boolean" },
      "maksimal_cicilan": { "type": "integer" },
      "nominal_cicilan_pertama": { "type": "integer", "nullable": true },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "CreateMatriksBiayaRequest": {
    "type": "object",
    "required": ["prodi_id", "jalur_id", "gelombang_id", "komponen_id", "nominal", "bisa_dicicil", "maksimal_cicilan"],
    "properties": {
      "prodi_id": { "type": "string", "format": "uuid" },
      "jalur_id": { "type": "string", "format": "uuid" },
      "gelombang_id": { "type": "string", "format": "uuid" },
      "komponen_id": { "type": "string", "format": "uuid" },
      "nominal": { "type": "integer" },
      "bisa_dicicil": { "type": "boolean" },
      "maksimal_cicilan": { "type": "integer" },
      "nominal_cicilan_pertama": { "type": "integer", "nullable": true }
    }
  },
  "UpdateMatriksBiayaRequest": {
    "type": "object",
    "required": ["nominal", "bisa_dicicil", "maksimal_cicilan"],
    "properties": {
      "nominal": { "type": "integer" },
      "bisa_dicicil": { "type": "boolean" },
      "maksimal_cicilan": { "type": "integer" },
      "nominal_cicilan_pertama": { "type": "integer", "nullable": true }
    }
  },
  "HitungBiayaRequest": {
    "type": "object",
    "required": ["prodi_id", "jalur_id", "gelombang_id"],
    "properties": {
      "prodi_id": { "type": "string", "format": "uuid" },
      "jalur_id": { "type": "string", "format": "uuid" },
      "gelombang_id": { "type": "string", "format": "uuid" },
      "kode_voucher": { "type": "string", "nullable": true }
    }
  },
  "BiayaItemDetail": {
    "type": "object",
    "required": ["komponen_id", "kode_komponen", "nama_komponen", "nominal", "bisa_dicicil", "maksimal_cicilan"],
    "properties": {
      "komponen_id": { "type": "string", "format": "uuid" },
      "kode_komponen": { "type": "string" },
      "nama_komponen": { "type": "string" },
      "nominal": { "type": "integer" },
      "bisa_dicicil": { "type": "boolean" },
      "maksimal_cicilan": { "type": "integer" },
      "nominal_cicilan_pertama": { "type": "integer", "nullable": true }
    }
  },
  "HitungBiayaResponse": {
    "type": "object",
    "required": ["rincian_komponen", "total_biaya_asli", "diskon_voucher", "total_setelah_diskon", "minimal_bayar_pertama", "bisa_dicicil", "maksimal_termin"],
    "properties": {
      "rincian_komponen": { "type": "array", "items": { "$ref": "#/components/schemas/BiayaItemDetail" } },
      "total_biaya_asli": { "type": "integer" },
      "diskon_voucher": { "type": "integer" },
      "total_setelah_diskon": { "type": "integer" },
      "minimal_bayar_pertama": { "type": "integer" },
      "bisa_dicicil": { "type": "boolean" },
      "maksimal_termin": { "type": "integer" },
      "voucher_info": { "type": "string", "nullable": true }
    }
  },
  "VoucherDetailResponse": {
    "type": "object",
    "required": ["id", "kode_voucher", "tipe_diskon", "nilai_diskon", "kuota", "kuota_terpakai", "tgl_kadaluarsa", "is_active", "created_at", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "kode_voucher": { "type": "string" },
      "tipe_diskon": { "type": "string" },
      "nilai_diskon": { "type": "integer" },
      "kuota": { "type": "integer" },
      "kuota_terpakai": { "type": "integer" },
      "tgl_kadaluarsa": { "type": "string", "format": "date-time" },
      "batas_jalur_id": { "type": "string", "format": "uuid", "nullable": true },
      "batas_prodi_id": { "type": "string", "format": "uuid", "nullable": true },
      "deskripsi": { "type": "string", "nullable": true },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "CreateVoucherRequest": {
    "type": "object",
    "required": ["kode_voucher", "tipe_diskon", "nilai_diskon", "kuota", "tgl_kadaluarsa", "is_active"],
    "properties": {
      "kode_voucher": { "type": "string" },
      "tipe_diskon": { "type": "string" },
      "nilai_diskon": { "type": "integer" },
      "kuota": { "type": "integer" },
      "tgl_kadaluarsa": { "type": "string", "format": "date-time" },
      "batas_jalur_id": { "type": "string", "format": "uuid", "nullable": true },
      "batas_prodi_id": { "type": "string", "format": "uuid", "nullable": true },
      "deskripsi": { "type": "string", "nullable": true },
      "is_active": { "type": "boolean" }
    }
  },
  "UpdateVoucherRequest": {
    "type": "object",
    "required": ["kuota", "tgl_kadaluarsa", "is_active"],
    "properties": {
      "kuota": { "type": "integer" },
      "tgl_kadaluarsa": { "type": "string", "format": "date-time" },
      "batas_jalur_id": { "type": "string", "format": "uuid", "nullable": true },
      "batas_prodi_id": { "type": "string", "format": "uuid", "nullable": true },
      "deskripsi": { "type": "string", "nullable": true },
      "is_active": { "type": "boolean" }
    }
  },
  "PengaturanResponse": {
    "type": "object",
    "required": ["id", "kunci", "nilai", "updated_at"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "kunci": { "type": "string" },
      "nilai": { "type": "string" },
      "deskripsi": { "type": "string", "nullable": true },
      "updated_by": { "type": "string", "format": "uuid", "nullable": true },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  },
  "UpdatePengaturanRequest": {
    "type": "object",
    "required": ["kunci", "nilai"],
    "properties": {
      "kunci": { "type": "string" },
      "nilai": { "type": "string" }
    }
  }
};

// Gabungkan
openapi.paths = { ...openapi.paths, ...newPaths };
openapi.components.schemas = { ...openapi.components.schemas, ...newSchemas };

fs.writeFileSync(openapiPath, JSON.stringify(openapi, null, 2), 'utf8');
console.log('openapi.json berhasil diperbarui dengan endpoints dan skema Konfigurasi Admin!');

