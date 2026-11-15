import { describe, expect, it } from "vitest";
import {
  hitungPotongan,
  memakaiRapor,
  potonganDitentukanAdmin,
  potonganDariRapor,
  type AturanJalur,
  type MasukanPotongan,
} from "./beasiswa";

const m = (o: Partial<MasukanPotongan> = {}): MasukanPotongan => ({
  rataRapor: null,
  tingkatPrestasi: "",
  follower: null,
  potonganAdmin: null,
  ...o,
});
const aturan = (o: Partial<AturanJalur>): AturanJalur => ({
  kode_jalur: "X",
  alur_seleksi: "LANGSUNG_LULUS",
  rapor_minimal: null,
  potongan_tetap: null,
  potongan_maks: null,
  ...o,
});

describe("potongan beasiswa jalur READY", () => {
  it("rapor Achievement berjenjang", () => {
    expect(
      [90, 88, 83, 82.9, 78, 77.9, 75, 74.9].map(potonganDariRapor),
    ).toEqual([100, 75, 75, 50, 50, 25, 25, 0]);
  });

  it("Early: rapor minimal 80 dan potongan 100%", () => {
    const a = aturan({
      kode_jalur: "READY-EARLY",
      rapor_minimal: 80,
      potongan_tetap: 100,
    });
    expect(hitungPotongan(a, m({ rataRapor: 80 }))).toEqual({ persen: 100 });
    expect(hitungPotongan(a, m({ rataRapor: 79.9 }))).toHaveProperty("galat");
    expect(hitungPotongan(a, m())).toHaveProperty("galat");
  });

  it("Achievement mengambil yang terbesar antara rapor dan sertifikat", () => {
    const a = aturan({ kode_jalur: "READY-ACHIEVEMENT" });
    expect(
      hitungPotongan(a, m({ rataRapor: 80, tingkatPrestasi: "NASIONAL" })),
    ).toEqual({ persen: 75 });
    expect(
      hitungPotongan(a, m({ rataRapor: 60, tingkatPrestasi: "INTERNASIONAL" })),
    ).toEqual({ persen: 100 });
    expect(hitungPotongan(a, m({ rataRapor: 60 }))).toHaveProperty("galat");
  });

  it("Creator 50% bila follower minimal 10K", () => {
    const a = aturan({
      kode_jalur: "READY-CREATOR",
      alur_seleksi: "TANPA_CBT",
      potongan_tetap: 50,
    });
    expect(hitungPotongan(a, m({ follower: 10000 }))).toEqual({ persen: 50 });
    expect(hitungPotongan(a, m({ follower: 9999 }))).toEqual({ persen: 0 });
  });

  it("Future Leader hingga 75% pilihan admin", () => {
    const a = aturan({
      kode_jalur: "READY-FUTURE-LEADER",
      rapor_minimal: 75,
      potongan_maks: 75,
    });
    expect(hitungPotongan(a, m({ rataRapor: 76, potonganAdmin: 40 }))).toEqual({
      persen: 40,
    });
    expect(hitungPotongan(a, m({ rataRapor: 76 }))).toEqual({ persen: 75 });
    expect(
      hitungPotongan(a, m({ rataRapor: 76, potonganAdmin: 80 })),
    ).toHaveProperty("galat");
  });

  it("potongan bertingkat: rapor >= ambang dan di bawahnya", () => {
    const a = aturan({
      kode_jalur: "READY-EARLY",
      potongan_tetap: 100,
      potongan_ambang_rapor: 80,
    });
    expect(hitungPotongan(a, m({ rataRapor: 80 }))).toEqual({ persen: 100 });
    expect(hitungPotongan(a, m({ rataRapor: 92 }))).toEqual({ persen: 100 });
    // di bawah ambang tanpa potongan lain: tidak memenuhi syarat
    expect(hitungPotongan(a, m({ rataRapor: 79.9 }))).toHaveProperty("galat");
    expect(hitungPotongan(a, m({ rataRapor: null }))).toHaveProperty("galat");
    const b = { ...a, potongan_di_bawah_ambang: 50 };
    expect(hitungPotongan(b, m({ rataRapor: 79.9 }))).toEqual({ persen: 50 });
    expect(hitungPotongan(b, m({ rataRapor: 60 }))).toEqual({ persen: 50 });
    expect(memakaiRapor(a)).toBe(true);
  });

  it("Legacy: anak alumni 50%, saudara alumni 25%, wajib dipilih", () => {
    const a = aturan({ kode_jalur: "READY-LEGACY" });
    expect(hitungPotongan(a, m({ hubunganAlumni: "ANAK" }))).toEqual({
      persen: 50,
    });
    expect(hitungPotongan(a, m({ hubunganAlumni: "SAUDARA" }))).toEqual({
      persen: 25,
    });
    expect(hitungPotongan(a, m())).toHaveProperty("galat");
    expect(potonganDitentukanAdmin(a)).toBe(false);
  });
});
