import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DialogProvider } from "../../../components/ui/DialogProvider";
import { RincianBiayaKuliahPage } from "./RincianBiayaKuliahPage";

const fetchApi = vi.fn();
vi.mock("@/services/api", () => ({
  fetchApi: (...a: unknown[]) => fetchApi(...a),
}));
vi.mock("@/components/ui/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const prodi = {
  prodi_id: "p1",
  kode_prodi: "IF",
  nama_prodi: "Informatika",
  jenjang: "S1",
  fakultas: "Fakultas Teknik",
  slug: "s1-informatika",
  admisi: 5_000_000,
  semester: [7, 6, 6, 6, 6, 6, 6, 6].map((n) => n * 1_000_000),
  jumlah_semester: 8,
  total_hingga_lulus: 54_000_000,
};

beforeEach(() => {
  fetchApi.mockReset();
  fetchApi.mockImplementation((u: string, opt?: { method?: string }) => {
    if (u.endsWith("/rincian-biaya-kuliah/arsip")) return Promise.resolve([]);
    return Promise.resolve(opt?.method ? prodi : [prodi]);
  });
});

function tampil() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <DialogProvider>
        <RincianBiayaKuliahPage />
      </DialogProvider>
    </QueryClientProvider>,
  );
}

describe("RincianBiayaKuliahPage", () => {
  it("menghitung ulang total saat biaya diubah lalu menyimpannya", async () => {
    tampil();
    const smt = await screen.findByLabelText("Semester 3 Informatika");
    const simpan = screen.getByRole("button", { name: "Simpan" });
    expect((simpan as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(smt, { target: { value: "7000000" } });
    // 5jt + 7jt + 6jt + 7jt + 5 x 6jt = 55jt
    expect(screen.getByText(/55\.000\.000/)).toBeTruthy();
    expect((simpan as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(simpan);
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith(
        "/api/admin/konfigurasi/rincian-biaya-kuliah/p1",
        {
          method: "PUT",
          body: JSON.stringify({
            admisi: 5_000_000,
            semester: [7, 6, 7, 6, 6, 6, 6, 6].map((n) => n * 1_000_000),
          }),
        },
      ),
    );
  });

  it("menolak isian bukan angka", async () => {
    tampil();
    const adm = await screen.findByLabelText("Admisi Informatika");
    fireEvent.change(adm, { target: { value: "abc" } });
    expect(
      (screen.getByRole("button", { name: "Simpan" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("biaya yang disimpan tidak otomatis diarsipkan; arsip hanya lewat tombol Arsipkan", async () => {
    tampil();
    fireEvent.change(await screen.findByLabelText("Semester 3 Informatika"), {
      target: { value: "7000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() =>
      expect(fetchApi.mock.calls.some((c) => c[1]?.method === "PUT")).toBe(
        true,
      ),
    );
    expect(
      fetchApi.mock.calls.some((c) => String(c[0]).endsWith("/arsipkan")),
    ).toBe(false);

    fireEvent.change(screen.getByLabelText("Keterangan arsip"), {
      target: { value: "Biaya T.A. 2025/2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Arsipkan" }));
    // konfirmasi dulu; belum memanggil server
    expect(
      fetchApi.mock.calls.some((c) => String(c[0]).endsWith("/arsipkan")),
    ).toBe(false);
    fireEvent.click(
      await screen.findByRole("button", { name: "Ya, Arsipkan" }),
    );
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith(
        "/api/admin/konfigurasi/rincian-biaya-kuliah/arsipkan",
        {
          method: "POST",
          body: JSON.stringify({ keterangan: "Biaya T.A. 2025/2026" }),
        },
      ),
    );
  });
});
