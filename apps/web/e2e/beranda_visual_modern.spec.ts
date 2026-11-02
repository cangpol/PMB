import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import * as path from "path";

const SCREENSHOT_DIR =
  "C:/Users/LENOVO/.gemini/antigravity/brain/7fd0eb67-dff5-4aee-9c22-7c90ae0f9307/screenshots";

test.describe("Modernisasi Beranda Publik & Navbar PMB UPITRA", () => {
  test("1. Semua tag <img> pada beranda dimuat sukses dengan naturalWidth > 0", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/");
    await page.waitForSelector("header");
    await page.waitForLoadState("networkidle");

    const images = await page.locator("img").all();
    expect(images.length).toBeGreaterThan(0);

    for (const img of images) {
      const isVisible = await img.isVisible();
      if (isVisible) {
        const naturalWidth = await img.evaluate(
          (node: HTMLImageElement) => node.naturalWidth,
        );
        expect(naturalWidth).toBeGreaterThan(0);
      }
    }
  });

  test("2. Menu navbar tidak pecah baris (satu baris) pada viewport 1280px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("http://localhost:3000/");
    await page.waitForSelector("header");
    await page.waitForLoadState("networkidle");

    const nav = page.locator("nav[aria-label='Navigasi Utama']");
    await expect(nav).toBeVisible();

    const navLinks = await nav.locator("a, button").all();
    expect(navLinks.length).toBeGreaterThanOrEqual(6);

    for (const link of navLinks) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        // Satu baris menu tidak boleh melebihi 40px
        expect(box.height).toBeLessThanOrEqual(40);
      }
    }
  });

  test("3. Kedua tombol CTA hero memiliki teks terlihat dan lolos color-contrast axe-core", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/");
    await page.waitForSelector("main");
    await page.waitForLoadState("networkidle");

    const hero = page
      .locator("section")
      .filter({ hasText: "Membangun Pemimpin Unggul" })
      .first();
    await expect(hero).toBeVisible();

    // Tombol CTA Primer Hero: "Daftar Sekarang" (putih dengan teks biru-900)
    const ctaPrimer = hero
      .locator("a[href='/register']:has-text('Daftar Sekarang')")
      .first();
    await expect(ctaPrimer).toBeVisible();
    await expect(ctaPrimer).toContainText("Daftar Sekarang");

    // Tombol CTA Sekunder Hero: "Lihat Jalur Masuk"
    const ctaSekunder = hero
      .locator("a[href='/jalur-masuk']:has-text('Lihat Jalur Masuk')")
      .first();
    await expect(ctaSekunder).toBeVisible();
    await expect(ctaSekunder).toContainText("Lihat Jalur Masuk");

    // Verifikasi warna teks CTA Primer bukan putih di atas latar putih
    const primerStyles = await ctaPrimer.locator("button").evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
      };
    });
    // Latar putih (rgb(255, 255, 255)), teks biru tua (bukan rgb(255, 255, 255))
    expect(primerStyles.color).not.toBe("rgb(255, 255, 255)");
    expect(primerStyles.backgroundColor).toBe("rgb(255, 255, 255)");

    // Jalankan Axe Accessibility Checker untuk pemeriksaan color-contrast
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include(["main section:first-of-type"])
      .withRules(["color-contrast"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("4. Strip statistik mengambang dirender di bawah hero dengan font sans tabular-nums", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/");
    await page.waitForSelector("main");

    const statsStrip = page.locator("section.-mt-12, section.-mt-14").first();
    await expect(statsStrip).toBeVisible();
    await expect(statsStrip).toContainText("100%");
    await expect(statsStrip).toContainText("10 Prodi");
    await expect(statsStrip).toContainText("3x Cicilan");
    await expect(statsStrip).toContainText("94%");

    // Pastikan tidak ada class font-mono di strip statistik
    const hasFontMono = await statsStrip.locator(".font-mono").count();
    expect(hasFontMono).toBe(0);
  });

  test("5. Judul H1 tidak memiliki garis bergelombang (wavy underline)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/");
    await page.waitForSelector("h1");

    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("Universitas Pignatelli Triputra");

    // Pastikan tidak ada class decoration-wavy pada span di dalam H1
    const wavySpan = await h1.locator(".decoration-wavy").count();
    expect(wavySpan).toBe(0);
  });

  test("6. Ambil screenshot snapshot beranda pada 375px (mobile) dan 1280px (desktop)", async ({
    page,
  }) => {
    // 1. Desktop 1280px
    await page.setViewportSize({ width: 1280, height: 850 });
    await page.goto("http://localhost:3000/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "beranda_modern_desktop_1280.png"),
      fullPage: false,
    });

    // 2. Mobile 375px
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("http://localhost:3000/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "beranda_modern_mobile_375.png"),
      fullPage: false,
    });
  });
});
