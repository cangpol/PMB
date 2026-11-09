import { describe, expect, it } from "vitest";
import { cariDalam, normalisasi, type SaranSekolah } from "./sekolah";

const daftar: SaranSekolah[] = [
  {
    nama: "SMA Negeri 1 Surakarta",
    kabupaten: "Kota Surakarta",
    provinsi: "Jawa Tengah",
  },
  {
    nama: "SMA Negeri 1 Sukoharjo",
    kabupaten: "Kabupaten Sukoharjo",
    provinsi: "Jawa Tengah",
  },
  {
    nama: "SMA Negeri 1 Medan",
    kabupaten: "Kota Medan",
    provinsi: "Sumatera Utara",
  },
  {
    nama: "SMK Katolik Santo Yosef",
    kabupaten: "Kota Surakarta",
    provinsi: "Jawa Tengah",
  },
];

describe("pencarian sekolah", () => {
  it("normalisasi menyamakan penulisan provinsi", () => {
    expect(normalisasi("D.I. Yogyakarta")).toBe(normalisasi("DI Yogyakarta"));
  });

  it("mencocokkan semua kata yang diketik, tanpa peduli huruf besar", () => {
    const h = cariDalam(daftar, "sma negeri 1");
    expect(h.map((s) => s.nama)).toHaveLength(3);
    expect(cariDalam(daftar, "yosef").map((s) => s.nama)).toEqual([
      "SMK Katolik Santo Yosef",
    ]);
  });

  it("mengutamakan kabupaten lalu provinsi domisili", () => {
    const h = cariDalam(daftar, "sma negeri 1", {
      provinsi: "Jawa Tengah",
      kabupaten: "Kota Surakarta",
    });
    expect(h[0].nama).toBe("SMA Negeri 1 Surakarta");
    expect(h[1].provinsi).toBe("Jawa Tengah");
    expect(h[2].provinsi).toBe("Sumatera Utara");
  });

  it("ketikan kosong atau tidak cocok menghasilkan daftar kosong", () => {
    expect(cariDalam(daftar, "   ")).toEqual([]);
    expect(cariDalam(daftar, "xyz")).toEqual([]);
  });

  it("membatasi jumlah saran", () => {
    expect(cariDalam(daftar, "sma", {}, 2)).toHaveLength(2);
  });
});
