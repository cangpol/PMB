import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DaftarUlangPage } from "./DaftarUlangPage";

const fetchApi = vi.fn();
vi.mock("../../services/api", () => ({
  fetchApi: (...a: unknown[]) => fetchApi(...a),
}));
vi.mock("../../components/pendaftaran/AlurStepper", () => ({
  AlurStepper: () => null,
  useAlur: () => ({ alur: null, muatUlang: () => Promise.resolve() }),
}));

const info = {
  pendaftar_id: "p1",
  nomor_pendaftaran: "PMB-2026-0001",
  nama_lengkap: "Sari",
  prodi_diterima: "Informatika",
  jenjang: "S1",
  fakultas: "Fakultas Sains",
  status_kelulusan: "LULUS_PILIHAN_1",
  status_daftar_ulang: "BELUM_DAFTAR_ULANG",
  nim_resmi: null,
  nomor_loa: "SK/PMB-UPT/2026/0001",
  tagihan: null,
  berkas_list: [],
};

function atur(data: Record<string, unknown>) {
  fetchApi.mockReset();
  fetchApi.mockImplementation((u: string) =>
    Promise.resolve(u.includes("daftar-ulang") ? data : []),
  );
}

describe("DaftarUlangPage: LoA", () => {
  beforeEach(() => vi.stubGlobal("open", vi.fn()));

  it("LoA dapat diunduh sebelum daftar ulang dan NIM terbit", async () => {
    atur(info);
    render(<DaftarUlangPage />);
    expect(await screen.findByText("Surat Penerimaan (LoA)")).toBeTruthy();
    expect(screen.getByText(/Setelah NIM terbit/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Unduh LoA/ }));
    expect(window.open).toHaveBeenCalledWith(
      "/api/kelulusan/loa/pdf",
      "_blank",
    );
  });

  it("setelah NIM terbit, keterangan menyebut NIM", async () => {
    atur({
      ...info,
      status_daftar_ulang: "TERDAFTAR_SEBAGAI_MAHASISWA",
      nim_resmi: "271020001",
    });
    render(<DaftarUlangPage />);
    expect(await screen.findByText(/LoA sudah memuat NIM Anda/)).toBeTruthy();
  });

  it("tanpa data kelulusan (belum ada LoA) bagian LoA tidak tampil", async () => {
    atur({ ...info, nomor_loa: null });
    render(<DaftarUlangPage />);
    await screen.findByText(/Daftar Ulang & Registrasi/);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText("Surat Penerimaan (LoA)")).toBeNull();
  });
});
