-- =========================================================================
-- Migrasi: Nomor pendaftaran & nomor tagihan dari SEQUENCE database
-- Versi: 20261107000017
--
-- Sebelumnya nomor dihitung dari COUNT(*) + 1. Nomor itu bentrok (galat
-- "identitas unik sudah terdaftar") begitu ada baris yang terhapus atau dua
-- calon mengirim bersamaan. SEQUENCE aman untuk keduanya. File ini idempoten:
-- seed menjalankannya ulang setelah menyisipkan data contoh bernomor tetap.
-- =========================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nomor_pendaftaran;
CREATE SEQUENCE IF NOT EXISTS seq_nomor_tagihan;

-- Lanjutkan dari nomor terbesar yang sudah dipakai (tidak pernah mundur)
SELECT setval(
    'seq_nomor_pendaftaran',
    GREATEST(
        (SELECT last_value FROM seq_nomor_pendaftaran),
        (SELECT COUNT(*) FROM pendaftar),
        COALESCE((
            SELECT MAX(substring(nomor_pendaftaran FROM '([0-9]+)$')::bigint)
            FROM pendaftar
            WHERE nomor_pendaftaran ~ '^PMB-[0-9]{4}-[0-9]+$'
        ), 0),
        1
    )
);

SELECT setval(
    'seq_nomor_tagihan',
    GREATEST(
        (SELECT last_value FROM seq_nomor_tagihan),
        (SELECT COUNT(*) FROM tagihan),
        (SELECT COUNT(*) FROM pembayaran),
        COALESCE((
            SELECT MAX(substring(nomor_tagihan FROM '([0-9]+)$')::bigint)
            FROM tagihan
            WHERE nomor_tagihan ~ '^INV-[0-9]{4}-[0-9]+$'
        ), 0),
        COALESCE((
            SELECT MAX(substring(nomor_tagihan FROM '([0-9]+)$')::bigint)
            FROM pembayaran
            WHERE nomor_tagihan ~ '^INV-[0-9]{4}-[0-9]+$'
        ), 0),
        1
    )
);
