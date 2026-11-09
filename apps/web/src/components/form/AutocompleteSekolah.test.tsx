import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AutocompleteSekolah } from "./AutocompleteSekolah";

const data: Record<string, unknown> = {
  "/data/sekolah/index.json": [
    {
      kode: "030000",
      nama: "Jawa Tengah",
      kabupaten: [
        { kode: "030100", nama: "Kota Surakarta" },
        { kode: "030200", nama: "Kabupaten Sukoharjo" },
      ],
    },
  ],
  "/data/sekolah/030000.json": {
    "030100": ["SMA Negeri 1 Surakarta", "SMA Katolik Santo Yosef"],
    "030200": ["SMA Negeri 1 Sukoharjo"],
  },
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

function Dibungkus({ awal = "" }: { awal?: string }) {
  const [v, setV] = useState(awal);
  return (
    <AutocompleteSekolah
      value={v}
      onChange={setV}
      preferensi={{ provinsi: "Jawa Tengah", kabupaten: "Kota Surakarta" }}
    />
  );
}

describe("AutocompleteSekolah", () => {
  it("menampilkan saran saat mengetik beberapa huruf lalu memilihnya", async () => {
    render(<Dibungkus />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "sma neg" } });

    const opsi = await screen.findAllByRole("option");
    // sekolah di kabupaten domisili (Surakarta) paling atas
    expect(opsi[0].textContent).toContain("SMA Negeri 1 Surakarta");
    expect(opsi).toHaveLength(2);

    fireEvent.mouseDown(opsi[1]);
    expect(input.value).toBe("SMA Negeri 1 Sukoharjo");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("navigasi keyboard dan Enter memilih saran", async () => {
    render(<Dibungkus />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "yosef" } });
    await screen.findAllByRole("option");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("SMA Katolik Santo Yosef");
  });

  it("tidak mencari untuk kurang dari 2 huruf, dan nama bebas tetap bisa diketik", async () => {
    render(<Dibungkus />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "S" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    fireEvent.change(input, { target: { value: "SMA Tidak Terdaftar" } });
    await waitFor(() => expect(input.value).toBe("SMA Tidak Terdaftar"));
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("nilai awal tidak langsung membuka saran", () => {
    render(<Dibungkus awal="SMA Negeri 1 Surakarta" />);
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});
