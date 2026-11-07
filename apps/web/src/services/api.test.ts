import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchApi } from "./api";
import { EVENT_SESI_BERAKHIR } from "./sesiEvent";

const jawab = (status: number, body: unknown = {}) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

describe("fetchApi: sesi berakhir", () => {
  const dengar = vi.fn();
  beforeEach(() => {
    dengar.mockReset();
    window.addEventListener(EVENT_SESI_BERAKHIR, dengar);
  });
  afterEach(() => {
    window.removeEventListener(EVENT_SESI_BERAKHIR, dengar);
    vi.unstubAllGlobals();
  });

  it("401 pada endpoint biasa mengirim sinyal sesi berakhir", async () => {
    vi.stubGlobal("fetch", jawab(401, { kode: "TIDAK_TERAUTENTIKASI" }));
    await expect(fetchApi("/api/pendaftaran/my")).rejects.toMatchObject({
      kode: "TIDAK_TERAUTENTIKASI",
    });
    expect(dengar).toHaveBeenCalledTimes(1);
  });

  it("401 saat login/me TIDAK memicu sinyal (kredensial salah / belum login)", async () => {
    vi.stubGlobal("fetch", jawab(401, { kode: "TIDAK_TERAUTENTIKASI" }));
    await expect(fetchApi("/api/auth/login")).rejects.toBeTruthy();
    await expect(fetchApi("/api/auth/me")).rejects.toBeTruthy();
    expect(dengar).not.toHaveBeenCalled();
  });

  it("kesalahan selain 401 tidak memicu sinyal", async () => {
    vi.stubGlobal("fetch", jawab(403, { kode: "AKSES_DITOLAK" }));
    await expect(fetchApi("/api/admin/x")).rejects.toBeTruthy();
    vi.stubGlobal("fetch", jawab(500, { kode: "ERROR" }));
    await expect(fetchApi("/api/admin/x")).rejects.toBeTruthy();
    expect(dengar).not.toHaveBeenCalled();
  });
});
