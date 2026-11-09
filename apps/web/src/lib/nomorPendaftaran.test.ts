import { describe, it, expect } from "vitest";
import { labelNomorPendaftaran, nomorSementara } from "./nomorPendaftaran";

describe("nomorPendaftaran", () => {
  it("nomor berawalan W = sementara, selain itu = asli", () => {
    expect(nomorSementara("W270001-3132")).toBe(true);
    expect(nomorSementara("270031-3132")).toBe(false);
    expect(nomorSementara(undefined)).toBe(false);
    expect(labelNomorPendaftaran("W270001-3132")).toBe(
      "Nomor Pendaftaran Sementara",
    );
    expect(labelNomorPendaftaran("270031-3132")).toBe("Nomor Pendaftaran");
  });
});
