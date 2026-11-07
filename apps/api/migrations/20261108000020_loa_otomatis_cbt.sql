-- Nomor LoA yang terbit otomatis untuk calon yang lulus CBT.
-- Memakai SEQUENCE (bukan hitungan ulang per ranking) agar tidak bentrok dengan
-- nomor SK hasil ranking yang unik di hasil_kelulusan.nomor_surat_loa.
CREATE SEQUENCE IF NOT EXISTS seq_nomor_loa_cbt;
