import { describe, it, expect } from "vitest";
import { barisJam, nomorTautan } from "./useKontakPublik";

describe("useKontakPublik helper", () => {
  it("nomorTautan menormalkan nomor", () => {
    expect(nomorTautan("+62 812-3456-7890")).toBe("6281234567890");
    expect(nomorTautan("0812 3456 7890")).toBe("6281234567890");
  });
  it("barisJam memisahkan dengan |", () => {
    expect(barisJam("Senin - Jumat: 08.00 | Sabtu: 08.00 ")).toEqual([
      "Senin - Jumat: 08.00",
      "Sabtu: 08.00",
    ]);
    expect(barisJam("")).toEqual([]);
  });
});
