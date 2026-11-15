import { afterEach, describe, expect, it, vi } from "vitest";
import { unduhProspek } from "./prospekEkspor";

afterEach(() => vi.unstubAllGlobals());

describe("unduhProspek", () => {
  it("memanggil endpoint ekspor dengan filter dan kredensial", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"])),
    });
    vi.stubGlobal("fetch", fetchMock);
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    await unduhProspek("pdf", { status: "BARU", sumber: "KONSULTASI_ONLINE" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cms/admin/prospek/export.pdf?status=BARU&sumber=KONSULTASI_ONLINE",
      { credentials: "include" },
    );
  });

  it("melempar pesan galat dari server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ pesan: "Akses ditolak" }),
      }),
    );
    await expect(unduhProspek("xlsx")).rejects.toThrow("Akses ditolak");
  });
});
