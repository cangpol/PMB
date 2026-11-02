import { describe, it, expect } from "vitest";
import {
  formatRupiah,
  formatRentangUkt,
  formatDayaTampung,
  formatLamaStudi,
} from "./prodi";

describe("prodi service formatters", () => {
  it("formatRupiah memformat mata uang rupiah atau mengembalikan 'Segera diumumkan' saat NULL", () => {
    expect(formatRupiah(null)).toBe("Segera diumumkan");
    expect(formatRupiah(undefined)).toBe("Segera diumumkan");
    expect(formatRupiah(7000000)).toMatch(/Rp\s*7\.000\.000/);
    expect(formatRupiah(0)).toMatch(/Rp\s*0/);
  });

  it("formatRentangUkt memformat rentang biaya ukt atau nilai tunggal", () => {
    expect(formatRentangUkt(null, null)).toBe("Segera diumumkan");
    expect(formatRentangUkt(6000000, 6000000)).toMatch(/Rp\s*6\.000\.000/);
    expect(formatRentangUkt(5000000, 7000000)).toMatch(/Rp\s*5\.000\.000 - Rp\s*7\.000\.000/);
  });

  it("formatDayaTampung memformat kuota mahasiswa atau 'Segera diumumkan'", () => {
    expect(formatDayaTampung(null)).toBe("Segera diumumkan");
    expect(formatDayaTampung(undefined)).toBe("Segera diumumkan");
    expect(formatDayaTampung(0)).toBe("Segera diumumkan");
    expect(formatDayaTampung(100)).toBe("100 Mahasiswa");
  });

  it("formatLamaStudi memformat lama semester dan tahun studi", () => {
    expect(formatLamaStudi(8, "S1")).toBe("8 Semester (4 Tahun)");
    expect(formatLamaStudi(6, "D3")).toBe("6 Semester (3 Tahun)");
    expect(formatLamaStudi(null, "S1")).toBe("8 Semester (4 Tahun)");
    expect(formatLamaStudi(null, "D3")).toBe("6 Semester (3 Tahun)");
  });
});

