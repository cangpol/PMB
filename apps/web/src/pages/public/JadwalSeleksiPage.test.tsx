import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { JadwalSeleksiPage } from "./JadwalSeleksiPage";

const hari = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const ymd = (n: number) => hari(n).slice(0, 10);

const GELOMBANG = [
  {
    id: "g1",
    nama_gelombang: "[CONTOH] Gelombang I (Early Bird)",
    tgl_mulai: hari(-30),
    tgl_selesai: hari(60),
    is_active: true,
    deskripsi: "Periode pendaftaran awal.",
    info_ujian_cbt: "Setiap hari Sabtu",
    info_pengumuman: "1x24 jam setelah CBT",
    info_daftar_ulang: "Maksimal 14 hari setelah pengumuman",
    benefit: ["Potongan DPP Rp 2.000.000", "Beasiswa 100%"],
    tahap: [
      {
        id: "t1",
        nomor_tahap: 1,
        nama: "Tahap 1",
        tgl_mulai: ymd(-30),
        tgl_selesai: ymd(-5),
        status: "BERAKHIR",
      },
      {
        id: "t2",
        nomor_tahap: 2,
        nama: "Tahap 2",
        tgl_mulai: ymd(-4),
        tgl_selesai: ymd(60),
        status: "DIBUKA",
      },
    ],
  },
  {
    id: "g2",
    nama_gelombang: "[CONTOH] Gelombang II (Reguler)",
    tgl_mulai: hari(61),
    tgl_selesai: hari(120),
    is_active: true,
    deskripsi: "Seleksi reguler.",
    benefit: [],
    tahap: [],
  },
  {
    id: "g3",
    nama_gelombang: "[CONTOH] Gelombang III (Penutupan Kuota)",
    tgl_mulai: hari(121),
    tgl_selesai: hari(150),
    is_active: true,
    benefit: [],
    tahap: [],
  },
];

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => GELOMBANG })),
  );
});
afterEach(cleanup);

const tampil = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <JadwalSeleksiPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("JadwalSeleksiPage", () => {
  it("menampilkan ketiga gelombang dari data admin, bukan hanya gelombang 1", async () => {
    tampil();
    expect(
      await screen.findByText("Gelombang I (Early Bird)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Gelombang II (Reguler)")).toBeInTheDocument();
    expect(
      screen.getByText("Gelombang III (Penutupan Kuota)"),
    ).toBeInTheDocument();
    expect(screen.getByText("GEL-1")).toBeInTheDocument();
    expect(screen.getByText("GEL-3")).toBeInTheDocument();
  });

  it("menampilkan tahap (tahap 1 ditutup, tahap 2 dibuka) dan info yang diisi admin", async () => {
    tampil();
    await screen.findByText("Gelombang I (Early Bird)");
    expect(screen.getByText("Tahap 1")).toBeInTheDocument();
    expect(screen.getByText("Ditutup")).toBeInTheDocument();
    expect(screen.getAllByText("Dibuka").length).toBeGreaterThan(0);
    expect(screen.getByText("Periode pendaftaran awal.")).toBeInTheDocument();
    expect(
      screen.getByText("Maksimal 14 hari setelah pengumuman"),
    ).toBeInTheDocument();
    // Ujian Potensi CBT, Pengumuman Hasil, dan Benefit tidak lagi ditampilkan
    expect(screen.queryByText("Ujian Potensi CBT:")).toBeNull();
    expect(screen.queryByText("Pengumuman Hasil:")).toBeNull();
    expect(screen.queryByText(/Benefit Gelombang/)).toBeNull();
    expect(screen.queryByText("Setiap hari Sabtu")).toBeNull();
    expect(screen.queryByText("Potongan DPP Rp 2.000.000")).toBeNull();
  });

  it("hanya gelombang yang sedang dibuka yang punya tombol daftar", async () => {
    tampil();
    await screen.findByText("Gelombang I (Early Bird)");
    expect(
      screen.getByRole("link", { name: /Daftar Tahap 2 Sekarang/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Pendaftaran Belum Dibuka")).toHaveLength(2);
  });
});
