import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PilihWilayahDomisili } from "./PilihWilayahDomisili";
import type { WilayahDomisili } from "../../lib/wilayah";

const data: Record<string, unknown> = {
  "/data/wilayah/index.json": [{ kode: "33", nama: "Jawa Tengah" }],
  "/data/wilayah/33.json": [
    { nama: "Kota Surakarta", kecamatan: ["Banjarsari", "Laweyan"] },
    { nama: "Kabupaten Sukoharjo", kecamatan: ["Grogol"] },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      Promise.resolve({
        ok: url in data,
        json: () => Promise.resolve(data[url]),
      }),
    ),
  );
});

function Dibungkus({ onNilai }: { onNilai: (v: WilayahDomisili) => void }) {
  const [v, setV] = useState<Partial<WilayahDomisili>>({});
  return (
    <PilihWilayahDomisili
      value={v}
      onChange={(n) => {
        setV(n);
        onNilai(n);
      }}
    />
  );
}

describe("PilihWilayahDomisili", () => {
  it("memilih Negara > Provinsi > Kabupaten > Kecamatan secara bertingkat", async () => {
    const onNilai = vi.fn();
    render(<Dibungkus onNilai={onNilai} />);

    const kab = screen.getByLabelText("Kabupaten / Kota") as HTMLSelectElement;
    expect(kab.disabled).toBe(true);

    fireEvent.change(await screen.findByLabelText("Provinsi"), {
      target: { value: "Jawa Tengah" },
    });
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Kabupaten / Kota") as HTMLSelectElement)
          .disabled,
      ).toBe(false),
    );
    fireEvent.change(await screen.findByLabelText("Kabupaten / Kota"), {
      target: { value: "Kota Surakarta" },
    });
    const kec = (await screen.findByLabelText(
      "Kecamatan",
    )) as HTMLSelectElement;
    await waitFor(() =>
      expect(Array.from(kec.options).map((o) => o.text)).toContain("Laweyan"),
    );
    fireEvent.change(kec, { target: { value: "Laweyan" } });

    expect(onNilai).toHaveBeenLastCalledWith({
      negara: "Indonesia",
      provinsi: "Jawa Tengah",
      kabupaten: "Kota Surakarta",
      kecamatan: "Laweyan",
    });
  });

  it("mengganti provinsi mengosongkan kabupaten dan kecamatan", async () => {
    const onNilai = vi.fn();
    render(<Dibungkus onNilai={onNilai} />);
    fireEvent.change(await screen.findByLabelText("Provinsi"), {
      target: { value: "Jawa Tengah" },
    });
    expect(onNilai).toHaveBeenLastCalledWith(
      expect.objectContaining({ kabupaten: "", kecamatan: "" }),
    );
  });

  it("negara selain Indonesia memakai isian bebas", () => {
    const onNilai = vi.fn();
    render(<Dibungkus onNilai={onNilai} />);
    fireEvent.change(screen.getByLabelText("Negara"), {
      target: { value: "Malaysia" },
    });
    fireEvent.change(screen.getByLabelText("Provinsi / Negara Bagian"), {
      target: { value: "Selangor" },
    });
    expect(onNilai).toHaveBeenLastCalledWith(
      expect.objectContaining({ negara: "Malaysia", provinsi: "Selangor" }),
    );
    expect(screen.getByLabelText("Kecamatan / Distrik")).toBeTruthy();
  });
});
