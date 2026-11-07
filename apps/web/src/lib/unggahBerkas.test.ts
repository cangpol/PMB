import { describe, it, expect } from "vitest";
import {
  atributAccept,
  labelFormat,
  mimeDariDaftar,
  periksaFormatBerkas,
} from "./unggahBerkas";

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46];
const berkas = (nama: string, isi: number[], type = "") =>
  new File([new Uint8Array(isi)], nama, { type });

const SEMUA = mimeDariDaftar("image/jpeg,image/png,application/pdf");

describe("mimeDariDaftar & label", () => {
  it("menerima daftar MIME maupun ekstensi", () => {
    expect(mimeDariDaftar("pdf, .JPG")).toEqual([
      "application/pdf",
      "image/jpeg",
    ]);
    expect(labelFormat(SEMUA)).toBe("JPG, PNG, PDF");
    expect(atributAccept(["application/pdf"])).toBe("application/pdf,.pdf");
  });
});

describe("periksaFormatBerkas", () => {
  it("menerima berkas yang ekstensi dan isinya sesuai", async () => {
    expect(
      await periksaFormatBerkas(berkas("rapor.pdf", PDF), SEMUA),
    ).toMatchObject({
      ok: true,
      mime: "application/pdf",
    });
    expect(
      await periksaFormatBerkas(berkas("foto.JPEG", JPG), SEMUA),
    ).toMatchObject({
      ok: true,
      mime: "image/jpeg",
    });
  });

  it("menolak ekstensi yang tidak diizinkan", async () => {
    const h = await periksaFormatBerkas(berkas("ijazah.docx", PDF), SEMUA);
    expect(h.ok).toBe(false);
    expect(h.alasan).toContain(".docx");
    const tanpa = await periksaFormatBerkas(berkas("ijazah", PDF), SEMUA);
    expect(tanpa.ok).toBe(false);
  });

  it("menolak berkas yang hanya diganti namanya", async () => {
    // isi PNG tetapi bernama .pdf
    const h = await periksaFormatBerkas(
      berkas("palsu.pdf", PNG, "application/pdf"),
      SEMUA,
    );
    expect(h.ok).toBe(false);
    // isi teks biasa bernama .jpg
    const teks = await periksaFormatBerkas(
      berkas("a.jpg", [0x68, 0x61, 0x6c, 0x6f]),
      SEMUA,
    );
    expect(teks.ok).toBe(false);
  });

  it("menolak format sah yang tidak diizinkan untuk berkas ini", async () => {
    const h = await periksaFormatBerkas(berkas("foto.png", PNG), [
      "application/pdf",
    ]);
    expect(h.ok).toBe(false);
    expect(h.alasan).toContain("PDF");
  });
});
