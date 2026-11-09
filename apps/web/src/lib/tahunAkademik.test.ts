import { describe, it, expect } from "vitest";
import { tahunMasuk, teksTahunMasuk } from "./tahunAkademik";

describe("tahunAkademik", () => {
  it("tahun masuk = tahun tanggal mulai, kode 2 digit", () => {
    expect(tahunMasuk("2027-09-01")).toEqual({ tahun: 2027, kode: "27" });
    expect(tahunMasuk("2105-01-01")).toEqual({ tahun: 2105, kode: "05" });
    expect(teksTahunMasuk("2026-09-01")).toBe("2026 (kode 26)");
  });
  it("tanggal kosong / tidak valid", () => {
    expect(tahunMasuk("")).toBeNull();
    expect(teksTahunMasuk("abc")).toBe("-");
  });
});
