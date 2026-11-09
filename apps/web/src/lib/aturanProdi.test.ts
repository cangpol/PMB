import { describe, it, expect } from "vitest";
import { boleh_pilihan_2, HANYA_PILIHAN_1 } from "./aturanProdi";

describe("aturanProdi", () => {
  it("D3 Keperawatan (KEP) hanya boleh pilihan 1", () => {
    expect(HANYA_PILIHAN_1).toContain("KEP");
    expect(boleh_pilihan_2("KEP")).toBe(false);
    for (const k of [
      "IF",
      "SI",
      "SE",
      "MNJ",
      "AKT",
      "PAR",
      "BIG",
      "K3",
      "FIS",
    ]) {
      expect(boleh_pilihan_2(k)).toBe(true);
    }
    expect(boleh_pilihan_2(undefined)).toBe(true);
  });
});
