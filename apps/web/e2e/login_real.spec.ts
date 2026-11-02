import { test, expect } from "@playwright/test";

test("Login menggunakan akun superadmin via UI berhasil tanpa error", async ({
  page,
}) => {
  await page.goto("http://localhost:3000/login");
  await expect(page.locator("h2:has-text('Masuk ke Portal PMB')")).toBeVisible();

  // Klik tombol shortcut 'Super Admin'
  const superAdminBtn = page.getByRole("button", { name: /Super Admin/i });
  await expect(superAdminBtn).toBeVisible();
  await superAdminBtn.click();

  // Pastikan input email dan password terisi
  await expect(page.locator("input[name='email']")).toHaveValue("superadmin@triputra.id");
  await expect(page.locator("input[name='password']")).toHaveValue("Pignatelli2026!");

  // Klik tombol Masuk
  const submitBtn = page.getByRole("button", { name: /Masuk ke Akun/i });
  await submitBtn.click();

  // Verifikasi redirect sukses ke /admin/dashboard tanpa error alert
  await expect(page).toHaveURL(/.*\/admin\/dashboard/, { timeout: 10000 });
  await expect(page.locator("h1:has-text('Dashboard Eksekutif')")).toBeVisible();
  await expect(page.locator("text=Terjadi kesalahan pada sistem server internal")).not.toBeVisible();
});
