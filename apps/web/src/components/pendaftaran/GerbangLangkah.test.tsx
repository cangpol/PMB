import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AlurResponse } from "./AlurStepper";
import { AlurProvider, langkahTerbuka } from "./AlurStepper";
import { GerbangLangkah, LANGKAH_HALAMAN } from "./GerbangLangkah";

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
] as const;

/** Alur dengan langkah ke-`aktif` (1-based) sebagai langkah calon. */
const alurDi = (aktif: number, jalur_rpl = false): AlurResponse => ({
  status_pendaftaran: "DRAFT",
  jalur_rpl,
  nomor_pendaftaran: null,
  langkah_aktif: KODE[aktif - 1],
  langkah: KODE.map((kode, i) => ({
    nomor: i + 1,
    kode,
    judul: `Judul ${kode}`,
    status: i + 1 < aktif ? "SELESAI" : i + 1 === aktif ? "AKTIF" : "TERKUNCI",
    pesan: `Pesan ${kode}`,
    aksi_url: `/portal/${kode}`,
  })),
});

const renderGerbang = (langkah: readonly string[], khususRpl = false) =>
  render(
    <MemoryRouter>
      <AlurProvider>
        <GerbangLangkah langkah={langkah} khususRpl={khususRpl}>
          <p>Isi halaman</p>
        </GerbangLangkah>
      </AlurProvider>
    </MemoryRouter>,
  );

describe("langkahTerbuka", () => {
  it("hanya membuka langkah yang sudah dicapai", () => {
    const alur = alurDi(3);
    expect(langkahTerbuka(alur, LANGKAH_HALAMAN.formulir)).toBe(true);
    expect(langkahTerbuka(alur, LANGKAH_HALAMAN.pembayaran)).toBe(false);
    expect(langkahTerbuka(alur, LANGKAH_HALAMAN.daftarUlang)).toBe(false);
    expect(langkahTerbuka(null, LANGKAH_HALAMAN.formulir)).toBe(false);
  });

  it("calon baru (langkah 2: pilih jalur) dapat membuka formulir", () => {
    const alur = alurDi(2);
    expect(alur.langkah[1].kode).toBe("pilih_jalur");
    expect(langkahTerbuka(alur, LANGKAH_HALAMAN.formulir)).toBe(true);
    expect(langkahTerbuka(alur, LANGKAH_HALAMAN.pembayaran)).toBe(false);
  });

  it("halaman langkah yang sudah selesai tetap terbuka", () => {
    const alur = alurDi(5);
    expect(langkahTerbuka(alur, LANGKAH_HALAMAN.formulir)).toBe(true);
    expect(langkahTerbuka(alur, LANGKAH_HALAMAN.pembayaran)).toBe(true);
    expect(langkahTerbuka(alur, LANGKAH_HALAMAN.berkas)).toBe(true);
    expect(langkahTerbuka(alur, LANGKAH_HALAMAN.ujian)).toBe(false);
  });
});

describe("GerbangLangkah", () => {
  beforeEach(() => {
    fetchApi.mockReset();
  });

  it("menahan halaman yang langkahnya masih terkunci", async () => {
    fetchApi.mockResolvedValue(alurDi(3));
    renderGerbang(LANGKAH_HALAMAN.pembayaran);

    expect(await screen.findByText(/masih terkunci/)).toBeInTheDocument();
    expect(screen.queryByText("Isi halaman")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ke langkah saya/ }),
    ).toHaveAttribute("href", "/portal/formulir");
  });

  it("menampilkan halaman yang langkahnya sudah terbuka", async () => {
    fetchApi.mockResolvedValue(alurDi(4));
    renderGerbang(LANGKAH_HALAMAN.pembayaran);

    expect(await screen.findByText("Isi halaman")).toBeInTheDocument();
  });

  it("Portofolio & RPL terkunci untuk calon bukan Jalur RPL", async () => {
    fetchApi.mockResolvedValue(alurDi(4, false));
    renderGerbang(LANGKAH_HALAMAN.rpl, true);

    expect(await screen.findByText("Khusus Jalur RPL")).toBeInTheDocument();
    expect(screen.queryByText("Isi halaman")).not.toBeInTheDocument();
  });

  it("Portofolio & RPL terbuka untuk calon Jalur RPL", async () => {
    fetchApi.mockResolvedValue(alurDi(4, true));
    renderGerbang(LANGKAH_HALAMAN.rpl, true);

    expect(await screen.findByText("Isi halaman")).toBeInTheDocument();
  });
});
