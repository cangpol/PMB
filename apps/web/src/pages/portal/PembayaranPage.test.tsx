import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PembayaranPage } from "./PembayaranPage";

const fetchApi = vi.fn();
vi.mock("@/services/api", () => ({
  fetchApi: (...args: unknown[]) => fetchApi(...args),
}));

const KODE = [
  "buat_akun",
  "pilih_jalur",
  "formulir",
  "pembayaran",
  "berkas",
  "ujian",
  "pengumuman",
  "bayar_daftar_ulang",
  "registrasi_ulang",
];
const alur = {
  status_pendaftaran: "SUBMITTED",
  nomor_pendaftaran: "PMB-2026-0009",
  langkah_aktif: "pembayaran",
  langkah: KODE.map((kode, i) => ({
    nomor: i + 1,
    kode,
    judul: kode,
    status: i < 3 ? "SELESAI" : i === 3 ? "AKTIF" : "TERKUNCI",
    pesan: "",
    aksi_url: null,
  })),
};

const siapkan = (biaya: number, voucher?: () => Promise<unknown>) => {
  fetchApi.mockImplementation((url: string) => {
    if (url === "/api/pendaftaran/alur") return Promise.resolve(alur);
    if (url === "/api/pembayaran/my-tagihan")
      return Promise.reject({ kode: "DATA_TIDAK_DITEMUKAN" });
    if (url === "/api/pembayaran/bukti/my") return Promise.resolve([]);
    if (url === "/api/pendaftaran/dashboard-summary")
      return Promise.resolve({
        biaya: [{ jenis: "FORMULIR", nominal: biaya, status: "BELUM_TERBIT" }],
      });
    if (url === "/api/pembayaran/cek-voucher" && voucher) return voucher();
    return Promise.reject({ pesan: "tak terduga " + url });
  });
};

const tampilkan = () =>
  render(
    <MemoryRouter>
      <PembayaranPage />
    </MemoryRouter>,
  );

describe("PembayaranPage (langkah 4)", () => {
  beforeEach(() => {
    fetchApi.mockReset();
  });

  it("menampilkan biaya formulir sebelum calon melanjutkan", async () => {
    siapkan(250000);
    tampilkan();
    expect(
      await screen.findByText("Biaya formulir pendaftaran"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Rp 250.000").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /Lanjut ke Pembayaran/ }),
    ).toBeInTheDocument();
    // Penanda sub-langkah: calon berada di "Cek biaya"
    expect(screen.getByText("Cek biaya").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("voucher yang salah ditampilkan di bawah kolom voucher, bukan sebagai error halaman", async () => {
    siapkan(250000, () =>
      Promise.reject({
        pesan: "Kode voucher tidak ditemukan atau tidak aktif",
      }),
    );
    tampilkan();
    const input = await screen.findByLabelText("Kode voucher");
    fireEvent.change(input, { target: { value: "SALAH123" } });
    fireEvent.click(screen.getByRole("button", { name: "Terapkan" }));
    expect(
      await screen.findByText(/tidak ditemukan atau tidak aktif/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Gagal Memuat")).not.toBeInTheDocument();
  });

  it("biaya Rp 0 tidak meminta transfer", async () => {
    siapkan(0);
    tampilkan();
    expect(
      await screen.findByRole("button", { name: /Konfirmasi \(tanpa biaya\)/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/tidak perlu transfer atau mengunggah bukti/),
    ).toBeInTheDocument();
  });
});
