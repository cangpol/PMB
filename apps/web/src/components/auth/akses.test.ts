import { describe, it, expect, vi } from "vitest";
import { bolehDiArea, tujuanSetelahLogin } from "./akses";

describe("tujuanSetelahLogin", () => {
  it("calon tidak pernah diarahkan ke halaman admin yang tersisa", () => {
    expect(tujuanSetelahLogin("calon_mahasiswa", "/admin/cbt/bank-soal")).toBe(
      "/portal/dashboard",
    );
  });

  it("halaman yang diminta dipakai bila sesuai area peran", () => {
    expect(tujuanSetelahLogin("calon_mahasiswa", "/portal/pembayaran")).toBe(
      "/portal/pembayaran",
    );
    expect(tujuanSetelahLogin("admin_pmb", "/admin/berkas")).toBe(
      "/admin/berkas",
    );
  });

  it("staf tidak diarahkan ke portal calon, tanpa asal ke dashboard", () => {
    expect(tujuanSetelahLogin("keuangan", "/portal/dashboard")).toBe(
      "/admin/dashboard",
    );
    expect(tujuanSetelahLogin("admin_pmb", undefined)).toBe("/admin/dashboard");
  });

  it("awalan mirip tidak dianggap area yang sama", () => {
    expect(bolehDiArea("calon_mahasiswa", "/portalx")).toBe(false);
    expect(bolehDiArea("super_admin", "/portal/hasil")).toBe(true);
  });
});

describe("verifikasi email (kode acak)", () => {
  it("saat nonaktif, calon belum verifikasi langsung ke portal", () => {
    expect(
      tujuanSetelahLogin("calon_mahasiswa", "/portal/pembayaran", false),
    ).toBe("/portal/pembayaran");
    expect(tujuanSetelahLogin("calon_mahasiswa", null, false)).toBe(
      "/portal/dashboard",
    );
  });

  it("saat aktif, calon belum verifikasi diarahkan ke halaman kode", async () => {
    vi.stubEnv("VITE_WAJIB_VERIFIKASI_EMAIL", "true");
    vi.resetModules();
    const m = await import("./akses");
    expect(
      m.tujuanSetelahLogin("calon_mahasiswa", "/portal/pembayaran", false),
    ).toBe("/verify-email");
    expect(m.tujuanSetelahLogin("calon_mahasiswa", null, true)).toBe(
      "/portal/dashboard",
    );
    expect(m.tujuanSetelahLogin("admin_pmb", undefined, false)).toBe(
      "/admin/dashboard",
    );
    vi.unstubAllEnvs();
  });
});
