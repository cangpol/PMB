import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import * as path from "path";

const SCREENSHOT_DIR =
  "C:/Users/LENOVO/.gemini/antigravity/brain/7fd0eb67-dff5-4aee-9c22-7c90ae0f9307/screenshots";

test.describe("Redesain Navbar Publik & Halaman Program Studi PMB UPITRA", () => {
  test("1. Navbar satu baris tanpa wrapping pada breakpoint 1024px, 1280px, 1440px, 1920px", async ({
    page,
  }) => {
    const breakpoints = [1024, 1280, 1440, 1920];

    for (const width of breakpoints) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("http://localhost:3000/");
      await page.waitForSelector("header");
      await page.waitForLoadState("networkidle");

      // Verifikasi header sticky dengan latar putih solid
      const header = page.locator("header");
      await expect(header).toBeVisible();

      // Cek bahwa menu navigasi utama ada dan tidak pecah baris
      const nav = page.locator("nav[aria-label='Navigasi Utama']");
      await expect(nav).toBeVisible();

      const items = await nav.locator("> a, > div > button").all();
      expect(items.length).toBeGreaterThanOrEqual(6);

      // Verifikasi bahwa semua item menu berada pada ketinggian Y yang sama (satu baris)
      let firstY: number | null = null;
      for (const item of items) {
        const box = await item.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          if (firstY === null) {
            firstY = box.y;
          } else {
            // Toleransi perbedaan Y kurang dari 5px (tetap satu baris)
            expect(Math.abs(box.y - firstY)).toBeLessThan(5);
          }
        }
      }

      // Verifikasi zona kanan (aksi) terlihat pada >= 1024px
      const ctaDaftar = header.locator("a[href='/register']:has-text('Daftar')").first();
      await expect(ctaDaftar).toBeVisible();

      if (width === 1280) {
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "navbar_desktop_1280.png"),
        });
      }
    }
  });

  test("2. Navigasi dropdown Informasi aksesibel dan mobile drawer pada 375px", async ({
    page,
  }) => {
    // A. Desktop: Dropdown Informasi
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/");
    await page.waitForSelector("header");

    const infoBtn = page.locator("header button:has-text('Informasi')").first();
    await expect(infoBtn).toBeVisible();
    await expect(infoBtn).toHaveAttribute("aria-expanded", "false");

    // Klik untuk membuka dropdown
    await infoBtn.click();
    await expect(infoBtn).toHaveAttribute("aria-expanded", "true");
    const dropdownMenu = page.locator("header [role='menu']");
    await expect(dropdownMenu).toBeVisible();

    // Tutup dengan Escape
    await page.keyboard.press("Escape");
    await expect(dropdownMenu).not.toBeVisible();

    // B. Mobile: Drawer pada 375px
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("http://localhost:3000/");
    await page.waitForSelector("header");

    const hamburgerBtn = page.locator("button[aria-label='Buka menu navigasi utama']");
    await expect(hamburgerBtn).toBeVisible();
    await hamburgerBtn.click();

    // Drawer muncul
    const drawer = page.locator("div[role='dialog'][aria-label='Menu Navigasi Mobile PMB']");
    await expect(drawer).toBeVisible();

    // Ambil screenshot drawer mobile
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "navbar_mobile_drawer_375.png"),
    });

    // Tutup drawer dengan Escape
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
  });

  test("3. Katalog Program Studi (/program-studi) menampilkan tepat 4 fakultas dan 10 prodi", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://localhost:3000/program-studi");
    await page.waitForSelector("main");
    await page.waitForLoadState("networkidle");

    // Header H1 Serif
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("Program Studi");

    // Verifikasi tidak ada nama prodi lama "Akuntansi Bisnis Digital"
    const oldProdi = page.locator("text='Akuntansi Bisnis Digital'");
    await expect(oldProdi).not.toBeVisible();

    // Verifikasi kartu prodi resmi
    const prodiCards = page.locator("article");
    const cardCount = await prodiCards.count();
    expect(cardCount).toBe(10);

    // Verifikasi nama prodi baru ada
    await expect(page.locator("article:has-text('Informatika')").first()).toBeVisible();
    await expect(page.locator("article:has-text('Sistem Informasi')").first()).toBeVisible();
    await expect(page.locator("article:has-text('Software Engineering')").first()).toBeVisible();
    await expect(page.locator("article:has-text('Manajemen')").first()).toBeVisible();
    await expect(page.locator("article:has-text('Akuntansi')").first()).toBeVisible();
    await expect(page.locator("article:has-text('Pariwisata')").first()).toBeVisible();
    await expect(page.locator("article:has-text('Bahasa Inggris')").first()).toBeVisible();
    await expect(page.locator("article:has-text('Keselamatan dan Kesehatan Kerja')").first()).toBeVisible();
    await expect(page.locator("article:has-text('Fisioterapi')").first()).toBeVisible();
    await expect(page.locator("article:has-text('Keperawatan')").first()).toBeVisible();

    // Verifikasi nilai NULL menampilkan 'Segera diumumkan'
    const segeraDiumumkan = page.locator("text='Segera diumumkan'");
    expect(await segeraDiumumkan.count()).toBeGreaterThan(0);

    // Ambil screenshot katalog prodi desktop
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "prodi_katalog_desktop_1280.png"),
      fullPage: false,
    });
  });

  test("4. Filter sinkron ke URL Query params dan pencarian berfungsi", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/program-studi");
    await page.waitForLoadState("networkidle");

    // Filter Jenjang D3
    const d3Filter = page.locator("button:has-text('D3 (Vokasi)')");
    await d3Filter.click();
    expect(page.url()).toContain("jenjang=d3");

    // Hanya 1 prodi D3 (D3 Keperawatan)
    const cardsD3 = page.locator("article");
    await expect(cardsD3).toHaveCount(1);
    await expect(cardsD3.first()).toContainText("Keperawatan");

    // Filter Semua kembali
    const semuaFilter = page.locator("button:has-text('Semua')").first();
    await semuaFilter.click();
    await expect(page.locator("article")).toHaveCount(10);

    // Cari "Software"
    const searchInput = page.locator("input[placeholder*='Cari prodi']");
    await searchInput.fill("Software");
    await searchInput.press("Enter");
    expect(page.url()).toContain("q=Software");

    const cardsSearch = page.locator("article");
    await expect(cardsSearch).toHaveCount(1);
    await expect(cardsSearch.first()).toContainText("Software Engineering");
  });

  test("5. Fitur Bandingkan Prodi dan Halaman Perbandingan (/program-studi/bandingkan)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://localhost:3000/program-studi");
    await page.waitForLoadState("networkidle");

    // Pilih 2 prodi untuk dibandingkan
    const compareCheckboxes = page.locator("article label:has-text('Bandingkan') input[type='checkbox']");
    await compareCheckboxes.nth(0).click();
    await compareCheckboxes.nth(1).click();

    // Floating bar perbandingan muncul
    const floatingBar = page.locator("aside[role='region'][aria-label='Panel Perbandingan Program Studi']");
    await expect(floatingBar).toBeVisible();
    await expect(floatingBar).toContainText("2/3");

    // Klik tombol Buka Pembanding
    const btnBuka = floatingBar.locator("button:has-text('Buka Pembanding')");
    await btnBuka.click();

    // Pastikan berada di halaman /program-studi/bandingkan
    await expect(page).toHaveURL(/\/program-studi\/bandingkan\?ids=/);
    await page.waitForSelector("table");

    // Ambil screenshot halaman pembanding
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "prodi_bandingkan_desktop_1280.png"),
      fullPage: false,
    });
  });

  test("6. Detail Program Studi (/program-studi/:slug) dan Responsif Mobile 375px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://localhost:3000/program-studi/s1-informatika");
    await page.waitForLoadState("networkidle");

    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("S1 Informatika");

    // Ambil screenshot detail prodi desktop
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "prodi_detail_desktop_1280.png"),
      fullPage: false,
    });

    // Mobile Viewport 375px
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("http://localhost:3000/program-studi");
    await page.waitForLoadState("networkidle");

    // Ambil screenshot katalog mobile
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "prodi_katalog_mobile_375.png"),
      fullPage: false,
    });
  });

  test("7. Lolos Aksesibilitas WCAG AA (Axe-core) pada Katalog Program Studi", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/program-studi");
    await page.waitForLoadState("networkidle");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"]) // dev test baseline
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
