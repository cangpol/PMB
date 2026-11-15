import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RiwayatBiayaKuliah } from "./RiwayatBiayaKuliah";

afterEach(() => vi.unstubAllGlobals());

const tampil = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RiwayatBiayaKuliah />
    </QueryClientProvider>,
  );

describe("RiwayatBiayaKuliah", () => {
  it("menampilkan periode dan tautan unduh PDF & Excel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "v1",
              berlaku_dari: "2026-01-01T00:00:00Z",
              berlaku_sampai: "2026-09-30T00:00:00Z",
              jumlah_prodi: 10,
            },
          ]),
      }),
    );
    tampil();
    expect(
      await screen.findByText(/Biaya Kuliah Tahun Sebelumnya/),
    ).toBeTruthy();
    expect(screen.getByText(/10 program studi/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /PDF/ }).getAttribute("href")).toBe(
      "/api/master/rincian-biaya-kuliah/riwayat/v1/pdf",
    );
    expect(
      screen.getByRole("link", { name: /Excel/ }).getAttribute("href"),
    ).toBe("/api/master/rincian-biaya-kuliah/riwayat/v1/excel");
  });

  it("tersembunyi bila belum ada arsip", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }),
    );
    const { container } = tampil();
    await new Promise((r) => setTimeout(r, 50));
    expect(container.textContent).toBe("");
  });
});
