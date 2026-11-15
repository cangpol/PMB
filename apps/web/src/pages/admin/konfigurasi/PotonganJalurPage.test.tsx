import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PotonganJalurPage } from "./PotonganJalurPage";
import { parsePersen, parseRapor } from "../../../lib/potonganJalur";

const fetchApi = vi.fn();
vi.mock("@/services/api", () => ({
  fetchApi: (...a: unknown[]) => fetchApi(...a),
}));
vi.mock("@/components/ui/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const jalur = {
  id: "j1",
  kode_jalur: "READY-FUTURE",
  nama_jalur: "READY Future Leader",
  alur_seleksi: "LANGSUNG_LULUS",
  biaya_formulir: 250000,
  rapor_minimal: 75,
  potongan_tetap: null,
  potongan_maks: 75,
  potongan_ambang_rapor: null,
  potongan_di_bawah_ambang: null,
  benefit_tambahan: null,
  kriteria_seleksi: "Kriteria",
  jumlah_calon_berpotongan: 2,
  is_active: true,
};

beforeEach(() => {
  fetchApi.mockReset();
  fetchApi.mockImplementation((_u: string, opt?: { method?: string }) =>
    Promise.resolve(opt?.method === "PUT" ? jalur : [jalur]),
  );
});

function tampil() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <PotonganJalurPage />
    </QueryClientProvider>,
  );
}

describe("parser potongan", () => {
  it("persen & rapor", () => {
    expect(parsePersen("")).toBeNull();
    expect(parsePersen("75")).toBe(75);
    expect(parsePersen("101")).toBeUndefined();
    expect(parsePersen("7a")).toBeUndefined();
    expect(parseRapor("80,5")).toBe(80.5);
    expect(parseRapor("abc")).toBeUndefined();
  });
});

describe("PotonganJalurPage", () => {
  it("menyimpan batas potongan yang diubah", async () => {
    tampil();
    const input = await screen.findByLabelText(
      "Batas potongan admin (%) READY Future Leader",
    );
    const simpan = screen.getByRole("button", { name: "Simpan" });
    expect((simpan as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, { target: { value: "50" } });
    expect((simpan as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(simpan);
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith(
        "/api/admin/konfigurasi/potongan-jalur/j1",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
    const body = JSON.parse(
      fetchApi.mock.calls.find((c) => c[1]?.method === "PUT")![1].body,
    );
    expect(body.potongan_maks).toBe(50);
  });

  it("menolak potongan tetap di atas batas", async () => {
    tampil();
    fireEvent.change(
      await screen.findByLabelText("Potongan tetap (%) READY Future Leader"),
      { target: { value: "90" } },
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Simpan" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("menyimpan ambang rapor dan potongan di bawah ambang", async () => {
    tampil();
    fireEvent.change(
      await screen.findByLabelText("Potongan tetap (%) READY Future Leader"),
      { target: { value: "75" } },
    );
    fireEvent.change(
      screen.getByLabelText("Ambang rapor READY Future Leader"),
      {
        target: { value: "80" },
      },
    );
    fireEvent.change(
      screen.getByLabelText("Potongan di bawah ambang (%) READY Future Leader"),
      { target: { value: "50" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() =>
      expect(fetchApi.mock.calls.some((c) => c[1]?.method === "PUT")).toBe(
        true,
      ),
    );
    const body = JSON.parse(
      fetchApi.mock.calls.find((c) => c[1]?.method === "PUT")![1].body,
    );
    expect(body.potongan_ambang_rapor).toBe(80);
    expect(body.potongan_di_bawah_ambang).toBe(50);
  });

  it("menolak potongan di bawah ambang tanpa ambang rapor", async () => {
    tampil();
    fireEvent.change(
      await screen.findByLabelText(
        "Potongan di bawah ambang (%) READY Future Leader",
      ),
      { target: { value: "50" } },
    );
    expect(
      (screen.getByRole("button", { name: "Simpan" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
