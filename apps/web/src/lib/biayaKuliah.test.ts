import { describe, expect, it } from "vitest";
import {
  kelompokkanPerFakultas,
  parseNominal,
  totalHinggaLulus,
  type RincianBiayaKuliah,
} from "./biayaKuliah";

describe("biayaKuliah", () => {
  it("menghitung total S1 delapan semester", () => {
    const smt = [7, 6, 6, 6, 6, 6, 6, 6].map((n) => n * 1_000_000);
    expect(totalHinggaLulus(5_000_000, smt, 8)).toBe(54_000_000);
  });
  it("D3 hanya menjumlah enam semester pertama", () => {
    expect(totalHinggaLulus(1, [4, 3, 3, 3, 3, 3, 999, 999], 6)).toBe(20);
  });
  it("jumlah semester di luar batas aman", () => {
    expect(totalHinggaLulus(1, [2, 3], 0)).toBe(1);
    expect(totalHinggaLulus(1, [2, 3], 99)).toBe(6);
  });
  it("mem-parse isian nominal", () => {
    expect(parseNominal("6.000.000")).toBe(6_000_000);
    expect(parseNominal("Rp 6000000")).toBe(6_000_000);
    expect(parseNominal("")).toBeNull();
    expect(parseNominal("-5")).toBeNull();
    expect(parseNominal("12abc")).toBeNull();
  });
});

describe("kelompokkanPerFakultas", () => {
  const p = (fakultas: string, jenjang: string, nama: string) =>
    ({ fakultas, jenjang, nama_prodi: nama }) as RincianBiayaKuliah;

  it("mengurutkan per fakultas, lalu jenjang dan nama prodi", () => {
    const hasil = kelompokkanPerFakultas([
      p("Fakultas Teknik", "S1", "Informatika"),
      p("Fakultas Ekonomi", "S1", "Manajemen"),
      p("Fakultas Teknik", "D3", "Teknik Mesin"),
      p("Fakultas Ekonomi", "S1", "Akuntansi"),
    ]);
    expect(hasil.map((h) => h.fakultas)).toEqual([
      "Fakultas Ekonomi",
      "Fakultas Teknik",
    ]);
    expect(hasil[0].prodi.map((x) => x.nama_prodi)).toEqual([
      "Akuntansi",
      "Manajemen",
    ]);
    expect(hasil[1].prodi.map((x) => x.nama_prodi)).toEqual([
      "Teknik Mesin",
      "Informatika",
    ]);
  });
});
