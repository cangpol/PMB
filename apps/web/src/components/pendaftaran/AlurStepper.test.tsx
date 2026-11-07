import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AlurStepper, type AlurResponse } from "./AlurStepper";

const langkah = (
  nomor: number,
  kode: string,
  status: AlurResponse["langkah"][number]["status"],
  aksi_url: string | null = null,
) => ({
  nomor,
  kode,
  judul: `Judul ${kode}`,
  status,
  pesan: `Pesan ${kode}`,
  aksi_url,
});

const alurPembayaranDitolak: AlurResponse = {
  status_pendaftaran: "PEMBAYARAN_DITOLAK",
  nomor_pendaftaran: "PMB-2027-0001",
  langkah_aktif: "pembayaran",
  jalur_rpl: false,
  langkah: [
    langkah(1, "buat_akun", "SELESAI"),
    langkah(2, "pilih_jalur", "SELESAI"),
    langkah(3, "formulir", "SELESAI", "/portal/formulir"),
    langkah(4, "pembayaran", "DITOLAK", "/portal/pembayaran"),
    langkah(5, "berkas", "TERKUNCI"),
    langkah(6, "ujian", "TERKUNCI"),
    langkah(7, "pengumuman", "TERKUNCI"),
    langkah(8, "bayar_daftar_ulang", "TERKUNCI"),
    langkah(9, "registrasi_ulang", "TERKUNCI"),
  ],
};

describe("AlurStepper", () => {
  it("menampilkan 9 langkah dan menandai langkah aktif", () => {
    render(
      <MemoryRouter>
        <AlurStepper alur={alurPembayaranDitolak} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(9);
    expect(screen.getByText("Langkah 4 dari 9")).toBeInTheDocument();
    expect(screen.getByText("Pesan pembayaran")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lanjutkan/ })).toHaveAttribute(
      "href",
      "/portal/pembayaran",
    );
  });

  it("langkah terkunci tidak menjadi tautan", () => {
    render(
      <MemoryRouter>
        <AlurStepper alur={alurPembayaranDitolak} ringkas />
      </MemoryRouter>,
    );

    const berkas = screen.getByText("5. Judul berkas");
    expect(berkas.closest("a")).toBeNull();
    expect(screen.getByText("3. Judul formulir").closest("a")).toHaveAttribute(
      "href",
      "/portal/formulir",
    );
    // Mode ringkas tidak menampilkan panel langkah aktif
    expect(screen.queryByText("Langkah 4 dari 9")).not.toBeInTheDocument();
  });

  it("menampilkan pesan selesai bila seluruh alur tuntas", () => {
    const selesai: AlurResponse = {
      ...alurPembayaranDitolak,
      status_pendaftaran: "TERDAFTAR",
      langkah_aktif: null,
      langkah: alurPembayaranDitolak.langkah.map((l) => ({
        ...l,
        status: "SELESAI" as const,
      })),
    };
    render(
      <MemoryRouter>
        <AlurStepper alur={selesai} />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Seluruh tahapan PMB telah selesai/),
    ).toBeInTheDocument();
  });
});
