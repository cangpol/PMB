import { describe, it, expect, beforeEach } from "vitest";
import {
  ambilPilihanAwal,
  cariJalurAwal,
  cariProdiAwal,
  hapusPilihanAwal,
  simpanPilihanAwal,
} from "./pilihanAwal";

const JALUR = [
  { id: "j1", kode_jalur: "JALUR-BEASISWA", tipe_seleksi: "CAMPURAN" },
  { id: "j2", kode_jalur: "JALUR-RAPOR", tipe_seleksi: "BERKAS" },
  { id: "j3", kode_jalur: "JALUR-CBT", tipe_seleksi: "CBT" },
  { id: "j4", kode_jalur: "JALUR-RPL", tipe_seleksi: "RPL" },
];

describe("pilihan jalur dari website", () => {
  beforeEach(() => localStorage.clear());

  it("tombol jalur di website memetakan ke jalur yang benar", () => {
    expect(cariJalurAwal(JALUR, "rpl")?.id).toBe("j4");
    expect(cariJalurAwal(JALUR, "reguler")?.id).toBe("j3");
    expect(cariJalurAwal(JALUR, "prestasi")?.id).toBe("j2");
    expect(cariJalurAwal(JALUR, "beasiswa")?.id).toBe("j1");
    expect(cariJalurAwal(JALUR, "JALUR-RPL")?.id).toBe("j4");
    expect(cariJalurAwal(JALUR, "tidak-ada")).toBeUndefined();
    expect(cariJalurAwal(JALUR, undefined)).toBeUndefined();
  });

  it("prodi dicari dari kode prodi maupun kode singkat", () => {
    const prodi = [{ id: "p1", kode_prodi: "FIS", kode_singkat: "fisio" }];
    expect(cariProdiAwal(prodi, "fis")?.id).toBe("p1");
    expect(cariProdiAwal(prodi, "FISIO")?.id).toBe("p1");
  });

  it("disimpan saat registrasi dan dihapus setelah jalur dipilih", () => {
    simpanPilihanAwal(new URLSearchParams("jalur=RPL"));
    expect(ambilPilihanAwal()).toEqual({ jalur: "rpl" });
    hapusPilihanAwal();
    expect(ambilPilihanAwal()).toEqual({});
    simpanPilihanAwal(new URLSearchParams(""));
    expect(ambilPilihanAwal()).toEqual({});
  });
});
