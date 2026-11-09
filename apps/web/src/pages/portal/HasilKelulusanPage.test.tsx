import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HasilKelulusanPage } from "./HasilKelulusanPage";

const fetchApi = vi.fn();
vi.mock("../../services/api", () => ({
  fetchApi: (...a: unknown[]) => fetchApi(...a),
}));

const alurMock = vi.hoisted(() => ({
  langkah: undefined as unknown,
}));
vi.mock("../../components/pendaftaran/AlurStepper", () => ({
  useAlur: () => ({
    alur: { langkah: [alurMock.langkah] },
    isLoading: false,
    error: null,
    muatUlang: vi.fn(),
  }),
  langkahPengumuman: (a: { langkah: unknown[] } | null) => a?.langkah[0],
}));
vi.mock("../../components/dokumen/DokumenLoa", () => ({
  DokumenLoa: () => null,
}));

const dasar = {
  pendaftar_id: "p1",
  nomor_pendaftaran: "W270001-3132",
  nama_lengkap: "Budi",
  jalur_nama: "READY Early",
  gelombang_nama: "Gelombang I",
  status_kelulusan: "BELUM_DIPUTUSKAN",
  skor_akhir: 0,
  is_published: false,
  is_pengumuman_buka: false,
  status_daftar_ulang: "BELUM_DAFTAR_ULANG",
  pesan: "Pesan lama dari server yang berbeda",
};

const tampil = () =>
  render(
    <MemoryRouter>
      <HasilKelulusanPage />
    </MemoryRouter>,
  );

beforeEach(() => fetchApi.mockReset());

describe("HasilKelulusanPage selaras dengan tahapan progress", () => {
  it("memakai keterangan langkah Cek Pengumuman, bukan pesan lain", async () => {
    fetchApi.mockResolvedValue(dasar);
    alurMock.langkah = {
      kode: "pengumuman",
      status: "MENUNGGU_ADMIN",
      pesan: "CBT selesai. Menunggu seleksi interview dan pengumuman hasil.",
    };
    tampil();
    expect(
      await screen.findByText(
        /Menunggu seleksi interview dan pengumuman hasil/,
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Pesan lama dari server/)).toBeNull();
    expect(screen.queryByText(/akan kami nilai dulu/)).toBeNull();
  });

  it("menampilkan tidak lulus bila tahapan progress menyatakan ditolak walau belum ada hasil sidang", async () => {
    fetchApi.mockResolvedValue(dasar);
    alurMock.langkah = {
      kode: "pengumuman",
      status: "DITOLAK",
      pesan: "Mohon maaf, Anda belum lulus seleksi pada gelombang ini.",
    };
    tampil();
    expect(
      await screen.findByText("Terima Kasih Atas Partisipasi Anda"),
    ).toBeTruthy();
    expect(screen.queryByText("Pengumuman Belum Dibuka")).toBeNull();
  });
});
