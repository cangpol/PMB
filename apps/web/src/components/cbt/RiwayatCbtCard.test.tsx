import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import {
  RiwayatCbtCard,
  formatDurasi,
  formatHariTanggal,
  formatJam,
  type RiwayatCbtItem,
} from "./RiwayatCbtCard";

const fetchApi = vi.fn();
vi.mock("@/services/api", () => ({
  fetchApi: (...args: unknown[]) => fetchApi(...args),
}));

// 7 Nov 2026 01:30 UTC = Sabtu 08.30 WIB
const selesai: RiwayatCbtItem = {
  peserta_sesi_id: "a",
  nama_sesi: "Sesi Pagi",
  nama_paket: "TPA",
  mode: "ONLINE",
  ruang: "Online",
  nomor_peserta: "CBT-001",
  jadwal_mulai: "2026-11-07T01:00:00Z",
  jadwal_selesai: "2026-11-07T03:00:00Z",
  status_ujian: "SELESAI",
  status_presensi: "HADIR",
  waktu_mulai: "2026-11-07T01:30:00Z",
  waktu_selesai: "2026-11-07T02:35:00Z",
  durasi_detik: 3900,
  total_soal: 50,
  jumlah_benar: 40,
  jumlah_salah: 8,
  jumlah_kosong: 2,
  nilai_akhir: 80,
  passing_grade: 65,
  is_lulus: true,
  jumlah_pelanggaran: 0,
};

describe("format waktu WIB", () => {
  it("menampilkan hari, tanggal, dan jam dalam WIB", () => {
    expect(formatHariTanggal("2026-11-07T01:30:00Z")).toBe(
      "Sabtu, 7 November 2026",
    );
    expect(formatJam("2026-11-07T01:30:00Z")).toBe("08.30");
    // 23:30 UTC sudah berganti hari di WIB
    expect(formatHariTanggal("2026-11-06T23:30:00Z")).toBe(
      "Sabtu, 7 November 2026",
    );
  });

  it("memformat durasi pengerjaan", () => {
    expect(formatDurasi(30)).toBe("30 detik");
    expect(formatDurasi(42 * 60)).toBe("42 menit");
    expect(formatDurasi(3900)).toBe("1 jam 5 menit");
  });
});

describe("RiwayatCbtCard", () => {
  it("menampilkan tanggal, jam, dan skor pengerjaan", async () => {
    fetchApi.mockResolvedValue([selesai]);
    render(<RiwayatCbtCard />);

    expect(await screen.findByText("80.00")).toBeInTheDocument();
    expect(screen.getByText("Sabtu, 7 November 2026")).toBeInTheDocument();
    expect(screen.getByText(/Mulai 08\.30/)).toBeInTheDocument();
    expect(screen.getByText(/Benar 40/)).toBeInTheDocument();
    expect(screen.getByText(/Memenuhi passing grade 65/)).toBeInTheDocument();
  });

  it("menampilkan pesan kosong bila belum pernah ujian", async () => {
    fetchApi.mockResolvedValue([]);
    render(<RiwayatCbtCard />);
    expect(await screen.findByText(/Belum ada riwayat/)).toBeInTheDocument();
  });
});
