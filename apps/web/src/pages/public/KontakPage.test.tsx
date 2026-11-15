import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KontakPage } from "./KontakPage";

vi.mock("../../services/prodi", () => ({
  getProdiList: () =>
    Promise.resolve([
      { id: "p1", jenjang: "S1", nama_prodi: "Informatika" },
      { id: "p2", jenjang: "D3", nama_prodi: "Keuangan & Perbankan" },
    ]),
}));
vi.mock("../../hooks/useKontakPublik", () => ({
  useKontakPublik: () => ({
    email: "pmb@upitra.ac.id",
    whatsapp: "+62 811-2233-4455",
    jam_layanan: "Senin - Jumat",
    alamat: "Jl. Duwet No. 1",
  }),
  barisJam: (j: string) => [j],
  nomorTautan: (n: string) => n.replace(/\D/g, ""),
}));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  vi.stubGlobal("fetch", fetchMock);
});

describe("KontakPage konsultasi online", () => {
  it("pilihan prodi dari data dan pesan dikirim ke server", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={qc}>
        <KontakPage />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("option", { name: "D3 - Keuangan & Perbankan" }),
    ).toBeTruthy();
    expect(screen.queryByRole("option", { name: "S1 Sains Data" })).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Masukkan nama Anda"), {
      target: { value: "Budi" },
    });
    fireEvent.change(screen.getByPlaceholderText("nama@email.com"), {
      target: { value: "budi@mail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("0812xxxxxxx"), {
      target: { value: "081234567890" },
    });
    fireEvent.change(screen.getByDisplayValue("Pilih program studi"), {
      target: { value: "p2" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Tuliskan pertanyaan/), {
      target: { value: "Berapa biaya kuliah D3?" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Kirim Pertanyaan Sekarang/ }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, opt] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/cms/prospek");
    const body = JSON.parse(opt.body);
    expect(body.pesan).toBe("Berapa biaya kuliah D3?");
    expect(body.prodi_minat).toBe("D3 - Keuangan & Perbankan");
    expect(await screen.findByText(/Berhasil Terkirim/)).toBeTruthy();
  });
});
