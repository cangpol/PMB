import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toast";
import { LaporanRegistrasiPage } from "./LaporanRegistrasiPage";

const api = vi.hoisted(() => ({ fetchApi: vi.fn() }));
vi.mock("@/services/api", () => api);

const baris = (over: Record<string, unknown>) => ({
  id: "1",
  nama_lengkap: "Budi Santoso",
  email: "budi@contoh.id",
  no_hp: "081234567890",
  sumber_informasi: null,
  keterangan: null,
  provinsi_asal_sekolah: null,
  kabupaten_asal_sekolah: null,
  asal_sekolah: null,
  created_at: "2026-11-09T03:00:00Z",
  ...over,
});

const LAPORAN = {
  ringkasan: {
    total: 2,
    per_sumber: [
      { kode: "MEDIA_SOSIAL", label: "Media Sosial", jumlah: 1 },
      {
        kode: "SOSIALISASI_SEKOLAH",
        label: "Sosialisasi di Sekolah",
        jumlah: 1,
      },
    ],
    per_platform: [{ nama: "TikTok", jumlah: 1 }],
    sekolah_teratas: [
      {
        sekolah: "SMAN 1 SURAKARTA",
        kabupaten: "Kota Surakarta",
        provinsi: "Jawa Tengah",
        jumlah: 1,
      },
    ],
  },
  items: [
    baris({
      id: "1",
      nama_lengkap: "Budi Santoso",
      sumber_informasi: "MEDIA_SOSIAL",
      keterangan: "TikTok",
    }),
    baris({
      id: "2",
      nama_lengkap: "Siti Aminah",
      email: "siti@contoh.id",
      no_hp: "085700001111",
      sumber_informasi: "SOSIALISASI_SEKOLAH",
      asal_sekolah: "SMAN 1 SURAKARTA",
      kabupaten_asal_sekolah: "Kota Surakarta",
      provinsi_asal_sekolah: "Jawa Tengah",
    }),
  ],
};

const tampil = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ToastProvider>
        <LaporanRegistrasiPage />
      </ToastProvider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  api.fetchApi.mockReset();
  api.fetchApi.mockResolvedValue(LAPORAN);
});
afterEach(cleanup);

describe("LaporanRegistrasiPage", () => {
  it("menampilkan pendaftar lengkap dengan kontak, sumber, dan keterangan", async () => {
    tampil();
    expect(await screen.findByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("Siti Aminah")).toBeInTheDocument();
    expect(screen.getByText("081234567890")).toBeInTheDocument();
    expect(
      screen.getByText("budi@contoh.id", { selector: "td" }),
    ).toBeInTheDocument();
    // keterangan: nama media sosial & sekolah + wilayah
    expect(
      screen.getByText("SMAN 1 SURAKARTA — Kota Surakarta, Jawa Tengah"),
    ).toBeInTheDocument();
    // tautan WhatsApp mengubah 08xx menjadi 628xx
    const wa = screen.getByLabelText("Chat WhatsApp Siti Aminah");
    expect(wa).toHaveAttribute("href", "https://wa.me/6285700001111");
  });

  it("menyaring lewat API saat sumber dipilih", async () => {
    tampil();
    await screen.findByText("Budi Santoso");
    fireEvent.change(screen.getByLabelText("Sumber"), {
      target: { value: "MEDIA_SOSIAL" },
    });
    await waitFor(() =>
      expect(
        api.fetchApi.mock.calls.some((c) =>
          String(c[0]).includes("sumber=MEDIA_SOSIAL"),
        ),
      ).toBe(true),
    );
    // filter platform baru aktif setelah sumber = Media Sosial
    expect(screen.getByLabelText("Media sosial")).not.toBeDisabled();
  });

  it("platform terkunci kecuali sumber Media Sosial; PDF memakai filter yang sama", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(["%PDF"]),
    }));
    vi.stubGlobal("fetch", fetchMock);
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    tampil();
    await screen.findByText("Budi Santoso");
    expect(screen.getByLabelText("Media sosial")).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Sumber"), {
      target: { value: "MEDIA_SOSIAL" },
    });
    fireEvent.change(screen.getByLabelText("Media sosial"), {
      target: { value: "TikTok" },
    });
    await waitFor(() =>
      expect(
        api.fetchApi.mock.calls.some((c) =>
          String(c[0]).includes("platform=TikTok"),
        ),
      ).toBe(true),
    );
    fireEvent.click(screen.getByRole("button", { name: /Unduh PDF/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("/api/dashboard/admin/laporan-registrasi/pdf?");
    expect(url).toContain("sumber=MEDIA_SOSIAL");
    expect(url).toContain("platform=TikTok");
    expect(url).not.toContain("limit=");
  });

  it("menampilkan keadaan kosong bila tidak ada pendaftar", async () => {
    api.fetchApi.mockResolvedValue({
      ringkasan: {
        total: 0,
        per_sumber: [],
        per_platform: [],
        sekolah_teratas: [],
      },
      items: [],
    });
    tampil();
    expect(await screen.findByText("Tidak Ada Pendaftar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unduh PDF/i })).toBeDisabled();
  });
});
