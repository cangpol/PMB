import { describe, it, expect } from "vitest";
import {
  judulDenganAntrean,
  pesanTambahan,
  type AntreanVerifikasi,
} from "./useAntreanVerifikasi";

const a = (b: number, p: number, d: number): AntreanVerifikasi => {
  const x = (n: number) => ({ menunggu: n, calon: n, terlama_sejak: null });
  return {
    berkas: x(b),
    bukti_bayar: x(p),
    daftar_ulang: x(d),
    cbt_keputusan: x(0),
    total: b + p + d,
  };
};

describe("pesanTambahan", () => {
  it("tidak ada pesan bila antrean tidak bertambah", () => {
    expect(pesanTambahan(a(2, 1, 0), a(2, 1, 0))).toBeNull();
  });

  it("tidak ada pesan bila antrean hanya berkurang (admin sedang memeriksa)", () => {
    expect(pesanTambahan(a(5, 2, 1), a(3, 0, 0))).toBeNull();
  });

  it("menyebut hanya jenis yang bertambah", () => {
    expect(pesanTambahan(a(1, 0, 0), a(4, 0, 0))).toBe(
      "3 berkas pendaftaran baru menunggu diperiksa.",
    );
    expect(pesanTambahan(a(0, 1, 0), a(2, 3, 0))).toBe(
      "2 berkas pendaftaran baru, 2 bukti pembayaran baru menunggu diperiksa.",
    );
  });
});

describe("judulDenganAntrean", () => {
  it("menambah dan memperbarui awalan jumlah tanpa menumpuk", () => {
    expect(judulDenganAntrean("Dashboard | PMB", 3)).toBe(
      "(3) Dashboard | PMB",
    );
    expect(judulDenganAntrean("(3) Dashboard | PMB", 5)).toBe(
      "(5) Dashboard | PMB",
    );
  });

  it("menghapus awalan bila antrean kosong", () => {
    expect(judulDenganAntrean("(4) Dashboard | PMB", 0)).toBe(
      "Dashboard | PMB",
    );
    expect(judulDenganAntrean("Dashboard | PMB", 0)).toBe("Dashboard | PMB");
  });
});
