import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve(
  "C:/Users/LENOVO/.gemini/antigravity/brain/7fd0eb67-dff5-4aee-9c22-7c90ae0f9307/screenshots",
);

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test("Capture Visual Screenshots at 1280px and 375px", async ({ page }) => {
  // Mock API auth as super_admin
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "superadmin-001",
        nama_lengkap: "Dr. FX. Hendra S.T., M.Kom.",
        email: "superadmin@pignatelli.ac.id",
        role: "super_admin",
        status: "aktif",
      }),
    });
  });

  // Mock API stats for dashboard
  await page.route("**/api/dashboard/admin/stats**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        total_pendaftar: 1482,
        total_berkas_diverifikasi: 1240,
        total_peserta_ujian: 1105,
        total_lulus: 980,
        total_registrasi_nim: 890,
        konversi_pendaftar_ke_nim: 60.1,
        total_pendapatan_rupiah: 370500000,
        total_piutang_rupiah: 15200000,
        distribusi_prodi: [
          {
            prodi_id: "s1-sd",
            kode_prodi: "S1-SD",
            nama_prodi: "Sains Data",
            jenjang: "S1",
            kuota: 120,
            total_peminat: 340,
            total_lulus: 115,
            total_daftar_ulang: 108,
          },
          {
            prodi_id: "s1-ti",
            kode_prodi: "S1-TI",
            nama_prodi: "Teknologi Informasi",
            jenjang: "S1",
            kuota: 150,
            total_peminat: 410,
            total_lulus: 145,
            total_daftar_ulang: 138,
          },
          {
            prodi_id: "s1-si",
            kode_prodi: "S1-SI",
            nama_prodi: "Sistem Informasi",
            jenjang: "S1",
            kuota: 100,
            total_peminat: 280,
            total_lulus: 95,
            total_daftar_ulang: 90,
          },
          {
            prodi_id: "s1-mn",
            kode_prodi: "S1-MN",
            nama_prodi: "Manajemen",
            jenjang: "S1",
            kuota: 120,
            total_peminat: 310,
            total_lulus: 110,
            total_daftar_ulang: 105,
          },
        ],
        tren_harian: [
          { tanggal: "2026-10-25", pendaftar: 20, terverifikasi: 16, bayar: 15 },
          { tanggal: "2026-10-26", pendaftar: 25, terverifikasi: 22, bayar: 20 },
          { tanggal: "2026-10-27", pendaftar: 30, terverifikasi: 25, bayar: 24 },
          { tanggal: "2026-10-28", pendaftar: 38, terverifikasi: 32, bayar: 30 },
          { tanggal: "2026-10-29", pendaftar: 42, terverifikasi: 38, bayar: 35 },
          { tanggal: "2026-10-30", pendaftar: 48, terverifikasi: 41, bayar: 40 },
          { tanggal: "2026-10-31", pendaftar: 55, terverifikasi: 48, bayar: 46 },
        ],
        distribusi_jalur: [
          {
            jalur_id: "j1",
            nama_jalur: "Reguler (CBT)",
            total_pendaftar: 680,
            total_lulus: 450,
          },
          {
            jalur_id: "j2",
            nama_jalur: "Prestasi Rapor",
            total_pendaftar: 420,
            total_lulus: 310,
          },
          {
            jalur_id: "j3",
            nama_jalur: "Beasiswa Triputra",
            total_pendaftar: 240,
            total_lulus: 180,
          },
          {
            jalur_id: "j4",
            nama_jalur: "Jalur RPL",
            total_pendaftar: 142,
            total_lulus: 98,
          },
        ],
      }),
    });
  });

  const BASE_URL = "http://localhost:3000";

  // 1. Beranda Desktop (1280px)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE_URL + "/");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "beranda_desktop_1280.png"),
    fullPage: false,
  });

  // 2. Beranda Mobile (375px)
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE_URL + "/");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "beranda_mobile_375.png"),
    fullPage: false,
  });

  // 3. Admin Dashboard & Sidebar Expanded Desktop (1280x720)
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(BASE_URL + "/admin/dashboard");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "admin_dashboard_expanded_1280x720.png"),
    fullPage: false,
  });

  // 4. Admin Sidebar Collapsed (Rail 72px)
  const collapseBtn = page.getByRole("button", { name: /Persempit Sidebar/i });
  if (await collapseBtn.isVisible()) {
    await collapseBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "admin_sidebar_collapsed_rail_1280.png"),
      fullPage: false,
    });
  }

  // 5. Admin Table Data Kuota Prodi (1280px)
  const prodiTable = page.locator("table");
  if (await prodiTable.isVisible()) {
    await prodiTable.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "admin_tabel_prodi_1280.png"),
      fullPage: false,
    });
  }

  // 6. Admin Dashboard Mobile & Mobile Drawer (375px)
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE_URL + "/admin/dashboard");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "admin_dashboard_mobile_375.png"),
    fullPage: false,
  });

  // Buka mobile drawer
  const hamburgerBtn = page.getByRole("button", { name: /Buka Menu Navigasi/i });
  if (await hamburgerBtn.isVisible()) {
    await hamburgerBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "admin_sidebar_mobile_drawer_375.png"),
      fullPage: false,
    });
  }
});
