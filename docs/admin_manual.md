# Panduan Operasional Administrator PMB UPITRA
## Berdasarkan Peran & Tanggung Jawab (*Role-Based Admin Manual*)

Dokumen ini merupakan panduan praktis operasional bagi seluruh panitia dan pengelola Sistem Penerimaan Mahasiswa Baru (PMB) Universitas Pignatelli Triputra. Setiap peran hanya dapat mengakses menu dan fitur yang sesuai dengan kewenangannya.

---

## Matriks Hak Akses & Peran

| Modul / Menu | Super Admin | Admin PMB | Bagian Keuangan | Asesor RPL | Pengawas CBT |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Dashboard Eksekutif & Analitik** | Full | Full | Read-Only | - | - |
| **Verifikasi Berkas Calon** | Full | Full | - | - | - |
| **Verifikasi Keuangan & Rekonsiliasi** | Full | - | Full | - | - |
| **Seleksi Kelulusan & Rapat Pleno** | Full | Full | - | - | - |
| **Verifikasi Daftar Ulang & Terbit NIM** | Full | Full | Read-Only | - | - |
| **Penilaian Asesmen RPL & Konversi SKS** | Full | Read-Only | - | Full (Tugasan) | - |
| **Bank Soal, Sesi & Monitor Live CBT** | Full | Full | - | - | Full |
| **CMS Publik (Berita, Banner, FAQ, Web)**| Full | Full | - | - | - |
| **Konfigurasi Gelombang, Biaya, & Voucher**| Full | - | - | - | - |

---

## 1. Peran: Admin PMB (Verifikator & Pelaksana PMB)

### 1.1 Verifikasi Berkas Calon Mahasiswa
1. Buka menu **Admin PMB &gt; Verifikasi Berkas** (`/admin/berkas`).
2. Gunakan filter gelombang aktif dan status *Menunggu Verifikasi*.
3. Klik nama calon mahasiswa untuk membuka drawer pratinjau dokumen (Ijazah/SKL, KTP/KK, Rapor/Sertifikat).
4. Periksa keaslian dan keterbacaan berkas:
   - Jika berkas sah: Klik **Valid &amp; Loloskan**.
   - Jika berkas buram/salah: Klik **Tolak Berkas** dan berikan catatan spesifik (misal: *"Scan ijazah terpotong, unggah ulang halaman belakang"*). Calon akan menerima notifikasi otomatis.

### 1.2 Sidang Kelulusan & Penetapan Hasil Seleksi
1. Buka menu **Admin PMB &gt; Seleksi Kelulusan** (`/admin/seleksi`).
2. Tinjau nilai terbobot (Rapor/CBT) dan periksa peringkat pendaftar per program studi.
3. Klik **Tetapkan Kelulusan**:
   - Pilih *Lulus Pilihan 1*, *Lulus Pilihan 2*, *Cadangan*, atau *Tidak Lulus*.
4. Masukkan **Nomor SK Rektor** dan **Nomor Surat LoA**.
5. Klik **Simpan Keputusan**. Keputusan kelulusan tersimpan dengan aman dan siap dipublikasikan serentak sesuai tanggal rilis resmi.

### 1.3 Verifikasi Daftar Ulang & Penerbitan NIM Resmi
1. Buka menu **Admin PMB &gt; Verifikasi Daftar Ulang** (`/admin/daftar-ulang`).
2. Periksa status pembayaran UKT dan kelengkapan dokumen registrasi ulang.
3. Klik tombol **Terbitkan NIM Resmi**:
   - Sistem akan mengunci urutan pendaftar dan membangkitkan Nomor Induk Mahasiswa otomatis berbasis format universitas (Tahun + Fakultas + Prodi + Urut).
   - Surat Keterangan Registrasi & LoA Final otomatis diperbarui dengan NIM resmi.
4. Klik **Ekspor ke SIAKAD (Excel)** untuk mengimpor data mahasiswa baru ke sistem akademik kampus.

### 1.4 Pengelolaan Konten Website Publik (CMS)
- **Berita & Pengumuman** (`/admin/cms/berita`): Buat rilis pers, berita beasiswa, dan pengumuman batas pendaftaran dengan editor teks kaya yang aman dari XSS.
- **Banner Beranda** (`/admin/cms/banner`): Pasang banner promosi gelombang dan beasiswa di halaman utama.
- **FAQ** (`/admin/cms/faq`): Tambah atau sunting pertanyaan yang sering ditanyakan per kategori.

---

## 2. Peran: Bagian Keuangan (*Finance & Billing*)

### 2.1 Pemantauan Pembayaran Gateway & Rekonsiliasi
1. Buka menu **Admin PMB &gt; Verifikasi Keuangan** (`/admin/keuangan`).
2. Transaksi via Midtrans Payment Gateway (Virtual Account, QRIS) akan berstatus **LUNAS** secara otomatis melalui webhook terenkripsi.
3. Jika calon mahasiswa melakukan konfirmasi transfer manual (misal: kendala jaringan bank):
   - Periksa mutasi rekening bank institusi.
   - Cocokkan jumlah transfer dan bukti setoran.
   - Klik tombol **Verifikasi Manual** dan masukkan nomor referensi bank. Status tagihan otomatis berubah menjadi lunas.

### 2.2 Ekspor Laporan Keuangan
1. Buka tab **Laporan Penerimaan**.
2. Pilih rentang tanggal dan filter berdasarkan jenis pembayaran (Formulir atau Daftar Ulang/UKT).
3. Klik **Ekspor CSV Keuangan** untuk rekonsiliasi pembukuan universitas.

---

## 3. Peran: Asesor Rekognisi Pembelajaran Lampau (RPL)

### 3.1 Penilaian Berkas & Portofolio RPL
1. Buka menu **Admin PMB &gt; Asesmen RPL** (`/admin/rpl`).
2. Daftar yang tampil **hanya calon mahasiswa yang ditugaskan khusus** kepada Anda oleh Panitia PMB.
3. Klik **Mulai Asesmen** pada pendaftar yang ditugaskan (`/admin/rpl/penilaian/:id`).
4. Pada setiap mata kuliah yang diajukan pemohon:
   - Pelajari silabus, pengalaman kerja, transkrip sebelumnya, dan bukti portofolio yang dilampirkan.
   - Tentukan status: **Diakui** atau **Tidak Diakui**.
   - Masukkan **Nilai Konversi** (A, A-, B+, B, dll.) dan berikan catatan justifikasi asesmen.
5. Klik **Simpan Draft Asesmen** kapan saja jika penilaian masih berlangsung.
6. Setelah seluruh mata kuliah selesai dinilai, klik **Finalisasi &amp; Kunci Nilai Konversi**. Sistem akan menjumlahkan total SKS yang diakui dan menerbitkan Berita Acara Rekognisi.

---

## 4. Peran: Pengawas & Tim Ujian CBT

### 4.1 Persiapan Bank Soal & Penjadwalan Sesi
1. Buka menu **Admin CBT &gt; Bank Soal** (`/admin/cbt/bank-soal`) untuk meninjau butir soal tes potensi akademik & literasi.
2. Buka menu **Jadwal Sesi** (`/admin/cbt/sesi`) untuk menetapkan kuota ruang, waktu mulai, dan durasi ujian (dalam menit).

### 4.2 Presensi Ujian & Live Monitoring
1. Buka menu **Admin CBT &gt; Presensi** (`/admin/cbt/presensi`).
2. Verifikasi kehadiran peserta dengan memeriksa kartu ujian dan nomor pendaftaran.
3. Buka menu **Live Monitor CBT** (`/admin/cbt/monitor/:sesi_id`):
   - Layar menampilkan seluruh peserta ujian secara real-time.
   - Indikator koneksi peserta: Hijau (Aktif), Kuning (Peringatan), Merah (Terputus).
   - Deteksi pelanggaran otomatis: Tampilan mencatat log jika peserta berpindah tab browser (*tab-switch*) atau meninggalkan layar ujian.
   - Pengawas dapat mereset sesi peserta jika terjadi kendala teknis perangkat (mati listrik/gangguan browser).

---

## 5. Peran: Super Administrator (IT & Master Data)

### 5.1 Manajemen Tahun Akademik & Gelombang
1. Buka menu **Konfigurasi &gt; Tahun &amp; Gelombang** (`/admin/konfigurasi/gelombang`).
2. Aktifkan tahun akademik baru (misal: 2026/2027).
3. Buat gelombang pendaftaran (Gelombang 1, Gelombang 2, Beasiswa Triputra):
   - Tentukan tanggal buka, tanggal tutup, dan batas pembayaran formulir.

### 5.2 Matriks Biaya & Pengaturan Voucher
1. Buka menu **Konfigurasi &gt; Biaya Matriks** (`/admin/konfigurasi/biaya`):
   - Atur besaran biaya formulir, DPP, dan UKT per fakultas, program studi, dan jalur masuk.
2. Buka menu **Konfigurasi &gt; Voucher Diskon** (`/admin/konfigurasi/vouchers`):
   - Buat kode voucher promosi (contoh: `TRIPUTRA2026`).
   - Tentukan nilai potongan, kuota maksimal penggunaan, dan masa berlaku kode.

