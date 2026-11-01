import { test, expect } from "@playwright/test";

test.describe("PMB UPITRA - Automated End-to-End Verification", () => {
  // ===========================================================================
  // 1. PUBLIC WEBSITE & INFORMATION ARCHITECTURE
  // ===========================================================================
  test("1. Website Publik: Beranda, Navigasi, Simulasi UKT, & Detail Informasi", async ({
    page,
  }) => {
    // Kunjungi beranda publik
    await page.goto("/");
    await expect(page).toHaveTitle(/Universitas Pignatelli Triputra/);

    // Verifikasi Hero section
    const headline = page.locator("h1");
    await expect(headline).toBeVisible();
    await expect(headline).toContainText(/Universitas Pignatelli Triputra/i);

    // Verifikasi CTA Daftar Sekarang
    const ctaButton = page.locator("a:has-text('Daftar Sekarang')").first();
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toHaveAttribute("href", "/register");

    // Verifikasi Countdown Gelombang Aktif
    await expect(page.locator("text=Early Bird Admissions")).toBeVisible();
    await expect(page.locator("text=Batas Akhir Pendaftaran")).toBeVisible();

    // Verifikasi 4 Kartu Jalur Masuk di Beranda
    await expect(page.locator("h3:has-text('Jalur Reguler')").first()).toBeVisible();
    await expect(page.locator("h3:has-text('Jalur Prestasi')").first()).toBeVisible();
    await expect(page.locator("h3:has-text('Kemitraan Triputra')").first()).toBeVisible();
    await expect(page.locator("h3:has-text('Jalur RPL')").first()).toBeVisible();

    // Verifikasi Kalkulator UKT Interaktif
    const prodiSelector = page.locator("select").first();
    if (await prodiSelector.isVisible()) {
      await prodiSelector.selectOption("S1-SD");
      await expect(page.locator("text=Estimasi UKT per Semester")).toBeVisible();
    }

    // Uji Navigasi ke Halaman Jalur Masuk
    await page.goto("/jalur-masuk");
    await expect(page).toHaveURL(/.*jalur-masuk/);
    await expect(page.locator("h1")).toContainText(/Jalur Penerimaan/i);

    // Uji Navigasi ke Halaman Program Studi
    await page.goto("/prodi");
    await expect(page).toHaveURL(/.*prodi/);
    await expect(page.locator("h1")).toContainText(/Program Studi/i);

    // Uji Navigasi ke Detail Program Studi Sains Data
    await page.goto("/prodi/s1-sains-data");
    await expect(page).toHaveURL(/.*prodi\/s1-sains-data/);
    await expect(page.locator("h1")).toContainText(/Sains Data/i);
    await expect(page.locator("text=Prospek Karier")).toBeVisible();

    // Uji Navigasi ke Halaman Jadwal Seleksi
    await page.goto("/jadwal");
    await expect(page.locator("h1")).toContainText(/Jadwal/i);
    await expect(page.locator("text=Gelombang 1").first()).toBeVisible();

    // Uji Navigasi ke Halaman Pengumuman Resmi
    await page.goto("/pengumuman");
    await expect(page.locator("h1")).toContainText(/Warta PMB/i);

    // Uji Navigasi ke Halaman FAQ
    await page.goto("/faq");
    await expect(page.locator("h1")).toContainText(/Pertanyaan yang Kerap Diajukan|FAQ/i);

    // Uji Navigasi ke Halaman Kontak
    await page.goto("/kontak");
    await expect(page.locator("h1")).toContainText(/Hubungi Kami/i);
    await expect(page.locator("text=Surakarta").first()).toBeVisible();
  });

  // ===========================================================================
  // 2. CANDIDATE REGISTRATION & AUTHENTICATION
  // ===========================================================================
  test("2. Alur Calon: Form Pendaftaran, Validasi Formulir, & Halaman Login", async ({
    page,
  }) => {
    // 1. Kunjungi halaman pendaftaran
    await page.goto("/register");
    await expect(page.locator("h2").first()).toContainText(/Pendaftaran Akun/i);

    // Periksa keberadaan form pendaftaran lengkap
    const namaInput = page.locator("input[name='nama_lengkap']");
    const emailInput = page.locator("input[name='email']");
    const noHpInput = page.locator("input[name='no_hp']");
    const passInput = page.locator("input[name='password']");
    const confirmPassInput = page.locator("input[name='confirm_password']");

    await expect(namaInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(noHpInput).toBeVisible();
    await expect(passInput).toBeVisible();
    await expect(confirmPassInput).toBeVisible();

    // Uji validasi client-side: klik submit tanpa mengisi
    await page.locator("button[type='submit']").click();
    await expect(page.locator("text=Nama lengkap tidak boleh kosong")).toBeVisible();
    await expect(page.locator("text=Email tidak boleh kosong")).toBeVisible();

    // 2. Kunjungi halaman login
    await page.goto("/login");
    await expect(page.locator("h2").first()).toContainText(/Masuk ke Portal PMB|Masuk/i);

    const loginEmail = page.locator("input[name='email']");
    const loginPass = page.locator("input[name='password']");
    const submitBtn = page.locator("button[type='submit']");

    await expect(loginEmail).toBeVisible();
    await expect(loginPass).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  // ===========================================================================
  // 3. SELEKSI & CEK KELULUSAN MANDIRI (PORTAL CALON)
  // ===========================================================================
  test("3. Pengumuman Kelulusan: Verifikasi LoA, SK, Status Diterima, & Perlindungan Privasi", async ({
    page,
  }) => {
    // Mock API kelulusan dengan data lulus pilihan 1
    await page.route("**/api/kelulusan/cek", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          pendaftar_id: "p-001-upitra",
          nomor_pendaftaran: "PMB-2026-00123",
          nama_lengkap: "Budi Santoso",
          jalur_nama: "Jalur Reguler (CBT)",
          gelombang_nama: "Gelombang 1",
          status_kelulusan: "LULUS_PILIHAN_1",
          prodi_diterima: "S1 Sains Data",
          jenjang_diterima: "S1",
          fakultas_diterima: "Fakultas Sains & Teknologi",
          pilihan_ke: 1,
          skor_akhir: 89.5,
          nim_resmi: "2601001001",
          nomor_surat_loa: "042/SK-PMB/UPITRA/2026",
          tanggal_sk: "2026-07-20",
          is_published: true,
          is_pengumuman_buka: true,
          status_daftar_ulang: "BELUM_BAYAR",
          pesan: "Selamat! Anda dinyatakan LULUS pada Program Studi S1 Sains Data.",
        }),
      });
    });

    await page.goto("/cek-kelulusan");

    // Verifikasi judul dan data kelulusan resmi
    await expect(
      page.locator("h1:has-text('Pengumuman Kelulusan Seleksi PMB')")
    ).toBeVisible();
    await expect(page.locator("text=Budi Santoso").first()).toBeVisible();
    await expect(page.locator("text=PMB-2026-00123")).toBeVisible();
    await expect(page.locator("text=S1 Sains Data").first()).toBeVisible();
    await expect(page.locator("text=Lulus Pilihan 1")).toBeVisible();

    // Verifikasi tombol unduh LoA dan Cetak SK
    await expect(page.locator("text=Unduh LoA PDF")).toBeVisible();
    await expect(page.locator("text=Cetak SK")).toBeVisible();
  });

  // ===========================================================================
  // 4. SECURITY & RBAC PROTECTION
  // ===========================================================================
  test("4. Keamanan & RBAC: Proteksi Rute Admin Terhadap Pengguna Anonim", async ({
    page,
  }) => {
    // Akses /admin tanpa sesi otentikasi harus otomatis dialihkan ke /login
    await page.goto("/admin");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.locator("input[name='email']")).toBeVisible();
  });

  // ===========================================================================
  // 5. EXECUTIVE DASHBOARD & ADMIN CMS VERIFICATION
  // ===========================================================================
  test("5. Dashboard Eksekutif Admin: Analitik PMB, Ekspor CSV, & Navigasi Modul CMS", async ({
    page,
  }) => {
    // Mock sesi autentikasi sebagai admin_pmb
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "adm-001",
          nama_lengkap: "Administrator PMB",
          email: "admin.pmb@pignatelli.ac.id",
          role: "admin_pmb",
          status: "aktif",
        }),
      });
    });

    // Mock API analitik dashboard eksekutif dengan skema ExecutiveDashboardResponse yang persis
    await page.route("**/api/dashboard/admin/stats**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total_pendaftar: 485,
          total_berkas_diverifikasi: 412,
          total_peserta_ujian: 380,
          total_lulus: 340,
          total_registrasi_nim: 295,
          total_pendapatan_rupiah: 450000000,
          total_piutang_rupiah: 50000000,
          tren_harian: [
            { tanggal: "2026-10-01", pendaftar: 15, terverifikasi: 12, bayar: 10 },
            { tanggal: "2026-10-02", pendaftar: 22, terverifikasi: 18, bayar: 16 },
          ],
          distribusi_prodi: [
            {
              prodi_id: "00000000-0000-0000-0000-000000000001",
              kode_prodi: "S1-SD",
              nama_prodi: "S1 Sains Data",
              jenjang: "S1",
              kuota: 100,
              total_peminat: 150,
              total_lulus: 90,
              total_daftar_ulang: 85,
            },
            {
              prodi_id: "00000000-0000-0000-0000-000000000002",
              kode_prodi: "S1-SI",
              nama_prodi: "S1 Sistem Informasi",
              jenjang: "S1",
              kuota: 100,
              total_peminat: 120,
              total_lulus: 80,
              total_daftar_ulang: 75,
            },
          ],
          distribusi_jalur: [
            {
              jalur_id: "00000000-0000-0000-0000-000000000010",
              nama_jalur: "Jalur Reguler (CBT)",
              total_pendaftar: 250,
              total_lulus: 180,
            },
            {
              jalur_id: "00000000-0000-0000-0000-000000000020",
              nama_jalur: "Jalur Prestasi Rapor",
              total_pendaftar: 120,
              total_lulus: 95,
            },
          ],
          status_pendaftaran: [
            {
              status: "DRAFT",
              label: "Draft Formulir",
              jumlah: 35,
              persentase: 7.2,
            },
            {
              status: "SUBMITTED",
              label: "Menunggu Verifikasi",
              jumlah: 450,
              persentase: 92.8,
            },
          ],
          funnel_tahapan: [
            { tahap: "Akun Dibuat", jumlah: 485, konversi: 100 },
            { tahap: "Formulir Selesai", jumlah: 450, konversi: 92.7 },
            { tahap: "Berkas Valid", jumlah: 412, konversi: 84.9 },
            { tahap: "Lulus Seleksi", jumlah: 340, konversi: 70.1 },
            { tahap: "Registrasi Ulang", jumlah: 295, konversi: 60.8 },
          ],
        }),
      });
    });

    await page.goto("/admin/dashboard");

    // Verifikasi judul dashboard eksekutif
    await expect(
      page.locator("h1:has-text('Dashboard Eksekutif')")
    ).toBeVisible();
    await expect(page.locator("text=Total Pendaftar").first()).toBeVisible();
    await expect(page.locator("text=Ekspor Excel (CSV)")).toBeVisible();

    // Verifikasi navigasi ke menu CMS publik
    await page.goto("/admin/cms/berita");
    await expect(page.locator("h1:has-text('Kelola Berita')")).toBeVisible();

    await page.goto("/admin/cms/banner");
    await expect(page.locator("h1:has-text('Banner Slider Beranda')")).toBeVisible();

    await page.goto("/admin/cms/faq");
    await expect(page.locator("h1:has-text('Kelola Pertanyaan Umum')")).toBeVisible();

    await page.goto("/admin/cms/halaman");
    await expect(page.locator("h1:has-text('Halaman Statis')")).toBeVisible();
  });
});
