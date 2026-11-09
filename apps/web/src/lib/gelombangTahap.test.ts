import { describe, it, expect } from "vitest";
import {
  bagiDuaTahap,
  bisaDipilih,
  pilihAwal,
  rentangTanggal,
  tanggalWib,
  type GelombangBertahap,
  type TahapGelombang,
} from "./gelombangTahap";

const t = (
  id: string,
  nama: string,
  status: TahapGelombang["status"],
): TahapGelombang => ({
  id,
  nomor_tahap: 1,
  nama,
  tgl_mulai: "2026-11-01",
  tgl_selesai: "2026-11-30",
  status,
});

describe("gelombangTahap", () => {
  const g1: GelombangBertahap = {
    id: "g1",
    nama_gelombang: "Gelombang 1",
    tahap: [t("t1", "Tahap 1", "BERAKHIR"), t("t2", "Tahap 2", "DIBUKA")],
  };

  it("tahap yang sudah ditutup tidak dipilih; otomatis tahap 2", () => {
    expect(pilihAwal([g1])).toEqual({ gelombangId: "g1", tahapId: "t2" });
    expect(pilihAwal([g1], "g1")).toEqual({ gelombangId: "g1", tahapId: "t2" });
  });

  it("gelombang tanpa tahap tetap bisa dipilih", () => {
    const polos: GelombangBertahap = { id: "g0", nama_gelombang: "Gel 0" };
    expect(bisaDipilih(polos)).toBe(true);
    expect(pilihAwal([polos])).toEqual({ gelombangId: "g0", tahapId: "" });
  });

  it("melewati gelombang yang semua tahapnya ditutup", () => {
    const tutup: GelombangBertahap = {
      id: "gx",
      nama_gelombang: "Lama",
      tahap: [t("a", "Tahap 1", "BERAKHIR")],
    };
    expect(bisaDipilih(tutup)).toBe(false);
    expect(pilihAwal([tutup, g1], "gx").gelombangId).toBe("g1");
    // tidak ada yang bisa dipilih -> tidak ada tahap terpilih
    expect(pilihAwal([tutup]).tahapId).toBe("");
  });

  it("format tanggal & bagi dua tahap tanpa tumpang tindih", () => {
    expect(rentangTanggal("2026-11-01", "2026-12-31")).toBe(
      "1 Nov 2026 – 31 Des 2026",
    );
    expect(tanggalWib("2026-10-31T20:00:00Z")).toBe("2026-11-01");
    const [a, b] = bagiDuaTahap("2026-11-01", "2026-12-31");
    expect(a).toMatchObject({ nama: "Tahap 1", tgl_mulai: "2026-11-01" });
    expect(b).toMatchObject({ nama: "Tahap 2", tgl_selesai: "2026-12-31" });
    expect(b.tgl_mulai > a.tgl_selesai).toBe(true);
  });
});
