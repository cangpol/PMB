import { describe, expect, it } from "vitest";
import { validasiMinat, type FormMinat } from "./minatCalon";
import { prospekKeCsv, tautanWa, type Prospek } from "./prospek";

const valid: FormMinat = {
  nama: "Budi Santoso",
  no_hp: "0812 3456 7890",
  email: "budi@mail.com",
  asal_sekolah: "SMAN 1 Surakarta",
  prodi_id: "p1",
};

describe("validasiMinat", () => {
  it("data lengkap lolos", () => {
    expect(validasiMinat(valid)).toEqual({});
  });
  it("menandai setiap isian yang salah", () => {
    const g = validasiMinat({
      nama: "Bu",
      no_hp: "08abc",
      email: "salah",
      asal_sekolah: "",
      prodi_id: "",
    });
    expect(Object.keys(g).sort()).toEqual(
      ["asal_sekolah", "email", "nama", "no_hp", "prodi_id"].sort(),
    );
  });
});

describe("prospek", () => {
  const p: Prospek = {
    id: "1",
    nama: '=HYPERLINK("x")',
    no_hp: "0812",
    email: "a@b.co",
    asal_sekolah: 'SMA "A"',
    prodi_minat: "S1 - Informatika",
    pesan: null,
    sumber: "POPUP_BERANDA",
    status: "BARU",
    catatan: null,
    created_at: "2026-11-11T00:00:00Z",
  };
  it("CSV melindungi rumus dan tanda kutip", () => {
    const csv = prospekKeCsv([p]);
    expect(csv).toContain('"\'=HYPERLINK(""x"")"');
    expect(csv).toContain('"SMA ""A"""');
  });
  it("CSV memuat sumber dan pertanyaan konsultasi", () => {
    const csv = prospekKeCsv([
      { ...p, sumber: "KONSULTASI_ONLINE", pesan: "Berapa biaya kuliah?" },
    ]);
    expect(csv).toContain('"Konsultasi online","Berapa biaya kuliah?"');
  });
  it("tautan WA mengganti 0 dengan 62", () => {
    expect(tautanWa("0812-3456")).toBe("https://wa.me/628123456");
  });
});
