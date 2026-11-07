-- =========================================================================
-- Migrasi: Perbaiki pendaftar yang tagihan formulirnya sudah LUNAS tetapi
-- statusnya tertinggal (SUBMITTED / MENUNGGU_VERIFIKASI_BAYAR / PEMBAYARAN_DITOLAK).
-- Versi: 20261107000016
--
-- Penyebab: tagihan Rp 0 (jalur gratis / voucher 100%) dulu dibuat langsung
-- berstatus LUNAS sehingga pelunasan dianggap sudah terjadi dan alur pendaftar
-- tidak pernah dimajukan. Kodenya sudah diperbaiki; berkas ini membetulkan data
-- yang telanjur terbentuk. Idempoten.
-- =========================================================================

WITH lunas AS (
    SELECT DISTINCT ON (t.pendaftar_id)
           t.pendaftar_id, t.nomor_tagihan, t.nominal_akhir,
           COALESCE(t.lunas_at, NOW()) AS waktu
    FROM tagihan t
    JOIN pendaftar p ON p.id = t.pendaftar_id
    WHERE t.jenis_tagihan = 'FORMULIR'
      AND t.status = 'LUNAS'
      AND p.status_pendaftaran IN ('SUBMITTED', 'MENUNGGU_VERIFIKASI_BAYAR', 'PEMBAYARAN_DITOLAK')
    ORDER BY t.pendaftar_id, t.tgl_terbit DESC
),
langkah AS (
    INSERT INTO state_langkah_pendaftar (pendaftar_id, langkah_id, status, data_tambahan, selesai_at)
    SELECT l.pendaftar_id, dl.id, 'SELESAI',
           jsonb_build_object('order_id', l.nomor_tagihan, 'nominal', l.nominal_akhir,
                              'paid_at', l.waktu, 'sumber', 'perbaikan_data'),
           l.waktu
    FROM lunas l
    CROSS JOIN definisi_langkah dl
    WHERE dl.tipe_langkah = 'pembayaran' AND dl.is_active = TRUE
    ON CONFLICT (pendaftar_id, langkah_id) DO UPDATE
    SET status = 'SELESAI', selesai_at = EXCLUDED.selesai_at, updated_at = NOW()
)
UPDATE pendaftar p
SET status_pendaftaran = 'PEMBAYARAN_DISETUJUI', updated_at = NOW()
FROM lunas l
WHERE p.id = l.pendaftar_id;
