import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { DialogProvider } from "@/components/ui/DialogProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { TahunGelombangPage } from "./TahunGelombangPage";

const svc = vi.hoisted(() => ({
  getGelombangAdminList: vi.fn(),
  createGelombang: vi.fn(),
  updateGelombang: vi.fn(),
  deleteGelombang: vi.fn(),
  getTahunAkademikList: vi.fn(),
  createTahunAkademik: vi.fn(),
  updateTahunAkademik: vi.fn(),
  deleteTahunAkademik: vi.fn(),
}));
vi.mock("@/services/konfigurasi", () => svc);

const TAHUN = [
  {
    id: "ta1",
    kode: "2027/2028",
    nama: "Tahun Akademik 2027/2028",
    tgl_mulai: "2027-09-01",
    tgl_selesai: "2028-08-31",
    is_active: true,
  },
];

// Tahun akademik dikelola di tab "Tahun Akademik" pada halaman Tahun & Gelombang
const tampil = async () => {
  render(
    <ToastProvider>
      <DialogProvider>
        <TahunGelombangPage />
      </DialogProvider>
    </ToastProvider>,
  );
  const tab = await screen.findByRole("tab", { name: "Tahun Akademik" });
  fireEvent.mouseDown(tab);
  fireEvent.click(tab);
};

beforeEach(() => {
  Object.values(svc).forEach((f) => f.mockReset());
  svc.getGelombangAdminList.mockResolvedValue([]);
  svc.getTahunAkademikList.mockResolvedValue(TAHUN);
  svc.updateTahunAkademik.mockResolvedValue(TAHUN[0]);
  svc.createTahunAkademik.mockResolvedValue(TAHUN[0]);
});
afterEach(cleanup);

describe("Tab Tahun Akademik di Tahun & Gelombang", () => {
  it("tab menampilkan tahun akademik beserta tahun masuk", async () => {
    await tampil();
    expect(await screen.findByText("2027/2028")).toBeInTheDocument();
    expect(screen.getByText("2027 (kode 27)")).toBeInTheDocument();
  });

  it("dapat diedit: form terisi, simpan memanggil API ubah dengan data baru", async () => {
    await tampil();
    await screen.findByText("2027/2028");
    fireEvent.click(screen.getByTitle("Ubah Tahun Akademik"));
    const nama = (await screen.findByDisplayValue(
      "Tahun Akademik 2027/2028",
    )) as HTMLInputElement;
    fireEvent.change(nama, { target: { value: "TA 2027/2028 (revisi)" } });
    fireEvent.change(screen.getByDisplayValue("2027-09-01"), {
      target: { value: "2028-01-15" },
    });
    // petunjuk tahun masuk ikut berubah mengikuti tanggal mulai
    expect(
      screen.getByText("2028 (kode 28)", { selector: "strong" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Simpan Tahun Akademik" }),
    );
    await waitFor(() =>
      expect(svc.updateTahunAkademik).toHaveBeenCalledTimes(1),
    );
    const [id, body] = svc.updateTahunAkademik.mock.calls[0];
    expect(id).toBe("ta1");
    expect(body).toMatchObject({
      kode: "2027/2028",
      nama: "TA 2027/2028 (revisi)",
      tgl_mulai: "2028-01-15",
    });
  });

  it("dapat menambah tahun akademik baru", async () => {
    await tampil();
    await screen.findByText("2027/2028");
    fireEvent.click(
      screen.getByRole("button", { name: /Tambah Tahun Akademik/ }),
    );
    fireEvent.change(await screen.findByPlaceholderText("misal: 2026/2027"), {
      target: { value: "2028/2029" },
    });
    fireEvent.change(screen.getByPlaceholderText(/misal: \[CONTOH\]/), {
      target: { value: "Tahun Akademik 2028/2029" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Simpan Tahun Akademik" }),
    );
    await waitFor(() =>
      expect(svc.createTahunAkademik).toHaveBeenCalledTimes(1),
    );
    expect(svc.createTahunAkademik.mock.calls[0][0]).toMatchObject({
      kode: "2028/2029",
      nama: "Tahun Akademik 2028/2029",
    });
  });
});
