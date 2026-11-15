import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DialogProvider } from "../../../components/ui/DialogProvider";
import { BankSoalPage } from "./BankSoalPage";

const fetchApi = vi.fn();
vi.mock("@/services/api", () => ({
  fetchApi: (...a: unknown[]) => fetchApi(...a),
}));
vi.mock("@/components/ui/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const soal = {
  id: "s1",
  kategori: "TPA",
  tingkat_kesulitan: "SEDANG",
  pertanyaan: "Berapa 2 + 2?",
  gambar_url: null,
  opsi_jawaban: [
    { id: "A", label: "A", teks: "3" },
    { id: "B", label: "B", teks: "4" },
  ],
  kunci_jawaban: "B",
  bobot: 1,
  pembahasan: null,
  is_active: true,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

beforeEach(() => {
  fetchApi.mockReset();
  fetchApi.mockImplementation((url: string, opt?: { method?: string }) => {
    if (url.endsWith("/penggunaan"))
      return Promise.resolve({ paket: ["Paket CBT 2026"], jumlah_jawaban: 3 });
    if (opt?.method) return Promise.resolve({ ok: true });
    return Promise.resolve({ items: [soal], total: 1 });
  });
});

const tampil = () =>
  render(
    <DialogProvider>
      <BankSoalPage />
    </DialogProvider>,
  );

describe("BankSoalPage ubah dan hapus", () => {
  it("mengubah soal: formulir terisi, peringatan penggunaan, lalu PUT", async () => {
    tampil();
    fireEvent.click(await screen.findByLabelText("Ubah soal 1"));
    const pertanyaan = (await screen.findByDisplayValue(
      "Berapa 2 + 2?",
    )) as HTMLTextAreaElement;
    expect(await screen.findByText(/sudah dijawab 3 kali/)).toBeTruthy();
    fireEvent.change(pertanyaan, { target: { value: "Berapa 3 + 3?" } });
    fireEvent.change(screen.getByDisplayValue("4"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Perubahan" }));
    await waitFor(() =>
      expect(
        fetchApi.mock.calls.some(
          (c) =>
            c[0] === "/api/cbt/admin/bank-soal/s1" && c[1]?.method === "PUT",
        ),
      ).toBe(true),
    );
    const put = fetchApi.mock.calls.find((c) => c[1]?.method === "PUT")!;
    const body = JSON.parse(put[1].body);
    expect(body.pertanyaan).toBe("Berapa 3 + 3?");
    expect(body.kunci_jawaban).toBe("B");
    expect(body.opsi_jawaban[1].teks).toBe("6");
  });

  it("menghapus soal setelah konfirmasi yang menyebut paket terdampak", async () => {
    tampil();
    fireEvent.click(await screen.findByLabelText("Hapus soal 1"));
    expect(await screen.findByText(/Paket CBT 2026/)).toBeTruthy();
    expect(fetchApi.mock.calls.some((c) => c[1]?.method === "DELETE")).toBe(
      false,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Ya, Hapus" }));
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/cbt/admin/bank-soal/s1", {
        method: "DELETE",
      }),
    );
  });

  it("membatalkan penghapusan tidak memanggil server", async () => {
    tampil();
    fireEvent.click(await screen.findByLabelText("Hapus soal 1"));
    fireEvent.click(await screen.findByRole("button", { name: /Batal/ }));
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchApi.mock.calls.some((c) => c[1]?.method === "DELETE")).toBe(
      false,
    );
  });
});
