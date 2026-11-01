-- Migrasi 6: Modul Pembayaran dengan Abstraksi Gateway
-- Tanggal: 2026-11-01
-- Universitas Pignatelli Triputra

-- 1. Tabel Tagihan (Master Invoice Pembayaran)
CREATE TABLE IF NOT EXISTS tagihan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomor_tagihan VARCHAR(50) NOT NULL UNIQUE,
    pendaftar_id UUID NOT NULL REFERENCES pendaftar(id) ON DELETE CASCADE,
    jenis_tagihan VARCHAR(30) NOT NULL CHECK (jenis_tagihan IN ('FORMULIR', 'DAFTAR_ULANG_UKT', 'BIAYA_PENGEMBANGAN', 'LAINNYA')),
    komponen_biaya_id UUID REFERENCES komponen_biaya(id) ON DELETE SET NULL,
    nominal_asli BIGINT NOT NULL CHECK (nominal_asli >= 0),
    diskon_voucher BIGINT NOT NULL DEFAULT 0 CHECK (diskon_voucher >= 0),
    nominal_akhir BIGINT NOT NULL CHECK (nominal_akhir >= 0),
    voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'MENUNGGU_PEMBAYARAN'
        CHECK (status IN ('MENUNGGU_PEMBAYARAN', 'LUNAS', 'KEDALUWARSA', 'BATAL')),
    tgl_terbit TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tgl_jatuh_tempo TIMESTAMPTZ NOT NULL,
    lunas_at TIMESTAMPTZ,
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tagihan_pendaftar ON tagihan(pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_status ON tagihan(status);
CREATE INDEX IF NOT EXISTS idx_tagihan_nomor ON tagihan(nomor_tagihan);

-- 2. Tabel Transaksi Pembayaran (Upaya Pembayaran via Gateway / Loket)
CREATE TABLE IF NOT EXISTS transaksi_pembayaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tagihan_id UUID NOT NULL REFERENCES tagihan(id) ON DELETE CASCADE,
    nomor_transaksi VARCHAR(50) NOT NULL UNIQUE,
    gateway_provider VARCHAR(30) NOT NULL DEFAULT 'MOCK'
        CHECK (gateway_provider IN ('MOCK', 'MIDTRANS', 'XENDIT', 'MANUAL_LOKET')),
    gateway_reference_id VARCHAR(100),
    metode_pembayaran VARCHAR(50) NOT NULL
        CHECK (metode_pembayaran IN (
            'VA_BCA', 'VA_BNI', 'VA_BRI', 'VA_MANDIRI', 'VA_PERMATA', 
            'QRIS', 'TUNAI_LOKET', 'TRANSFER_MANUAL'
        )),
    nomor_va VARCHAR(100),
    qr_string TEXT,
    qr_url TEXT,
    nominal BIGINT NOT NULL CHECK (nominal >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'SETTLEMENT', 'PAID', 'EXPIRED', 'FAILED', 'CANCELLED')),
    waktu_dibuat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    waktu_berlaku_sampai TIMESTAMPTZ NOT NULL,
    waktu_dibayar TIMESTAMPTZ,
    raw_response JSONB,
    signature_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaksi_tagihan ON transaksi_pembayaran(tagihan_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_status ON transaksi_pembayaran(status);
CREATE INDEX IF NOT EXISTS idx_transaksi_nomor ON transaksi_pembayaran(nomor_transaksi);
CREATE INDEX IF NOT EXISTS idx_transaksi_gateway_ref ON transaksi_pembayaran(gateway_reference_id);

-- 3. Tabel Log Webhook Gateway (Audit Trail & Idempotensi)
CREATE TABLE IF NOT EXISTS webhook_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gateway_provider VARCHAR(30) NOT NULL,
    event_id VARCHAR(100),
    order_id VARCHAR(100),
    status_code VARCHAR(20),
    transaction_status VARCHAR(50),
    payload JSONB NOT NULL,
    signature VARCHAR(255),
    status_proses VARCHAR(30) NOT NULL
        CHECK (status_proses IN ('PROCESSED', 'IGNORED_DUPLICATE', 'FAILED_SIGNATURE', 'ERROR')),
    pesan_log TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_order_id ON webhook_log(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON webhook_log(status_proses);

-- 4. Sinkronisasi Data Awal Tagihan dari tabel legacy Pembayaran (jika ada)
INSERT INTO tagihan (
    id, nomor_tagihan, pendaftar_id, jenis_tagihan, nominal_asli, diskon_voucher,
    nominal_akhir, voucher_id, status, tgl_terbit, tgl_jatuh_tempo, lunas_at, created_at, updated_at
)
SELECT 
    id, nomor_tagihan, pendaftar_id, jenis_tagihan, nominal_asli, diskon,
    nominal_akhir, voucher_id,
    CASE 
        WHEN status_pembayaran = 'LUNAS' THEN 'LUNAS'
        WHEN status_pembayaran = 'KADALUARSA' THEN 'KEDALUWARSA'
        ELSE 'MENUNGGU_PEMBAYARAN'
    END,
    created_at, tgl_kadaluarsa, tgl_bayar, created_at, updated_at
FROM pembayaran
ON CONFLICT (nomor_tagihan) DO NOTHING;

