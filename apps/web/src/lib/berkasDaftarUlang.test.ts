import { describe, expect, it } from "vitest";
import { berkasDaftarUlangLengkap, berkasTerbaru } from "./berkasDaftarUlang";

const wajib = ["SPKP", "KTP"];
const b = (jenis: string, status: string, at: string) => ({
  jenis_berkas: jenis,
  status_verifikasi: status,
  uploaded_at: at,
});

describe("berkas daftar ulang", () => {
  it("mengambil unggahan terbaru per jenis", () => {
    const l = [
      b("KTP", "INVALID", "2026-11-09T01:00:00Z"),
      b("KTP", "PENDING", "2026-11-09T02:00:00Z"),
    ];
    expect(berkasTerbaru(l, "KTP")?.status_verifikasi).toBe("PENDING");
    expect(berkasTerbaru(l, "SPKP")).toBeUndefined();
  });

  it("lengkap bila semua jenis terunggah dan tidak ada yang ditolak", () => {
    expect(
      berkasDaftarUlangLengkap(
        [
          b("SPKP", "PENDING", "2026-11-09T01:00:00Z"),
          b("KTP", "VALID", "2026-11-09T01:00:00Z"),
        ],
        wajib,
      ),
    ).toBe(true);
    expect(berkasDaftarUlangLengkap([b("SPKP", "PENDING", "x")], wajib)).toBe(
      false,
    );
    expect(
      berkasDaftarUlangLengkap(
        [b("SPKP", "PENDING", "1"), b("KTP", "INVALID", "1")],
        wajib,
      ),
    ).toBe(false);
  });
});
