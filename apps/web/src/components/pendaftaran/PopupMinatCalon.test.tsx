import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PopupMinatCalon } from "./PopupMinatCalon";

vi.mock("../../services/prodi", () => ({
  getProdiList: () =>
    Promise.resolve([
      { id: "p1", jenjang: "S1", nama_prodi: "Informatika" },
      { id: "p2", jenjang: "S1", nama_prodi: "Manajemen" },
    ]),
}));
vi.mock("../form/AutocompleteSekolah", () => ({
  AutocompleteSekolah: (p: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <input
      aria-label="sekolah"
      value={p.value}
      onChange={(e) => p.onChange(e.target.value)}
    />
  ),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  vi.stubGlobal("fetch", fetchMock);
});

function tampil() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <PopupMinatCalon />
    </QueryClientProvider>,
  );
}

describe("PopupMinatCalon", () => {
  it("tampil, menolak isian kosong, lalu mengirim data lengkap", async () => {
    tampil();
    const tombol = await screen.findByRole(
      "button",
      { name: "Tanya Info PMB" },
      { timeout: 4000 },
    );
    fireEvent.click(tombol);
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Nama Lengkap"), {
      target: { value: "Budi Santoso" },
    });
    fireEvent.change(screen.getByLabelText("Nomor HP/WA"), {
      target: { value: "081234567890" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "budi@mail.com" },
    });
    fireEvent.change(screen.getByLabelText("sekolah"), {
      target: { value: "SMAN 1 Surakarta" },
    });
    await screen.findByRole("option", { name: "S1 - Informatika" });
    fireEvent.change(screen.getByLabelText("Program Studi yang Diminati"), {
      target: { value: "p1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tanya Info PMB" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, opt] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/cms/prospek");
    expect(JSON.parse(opt.body).prodi_minat).toBe("S1 - Informatika");
    expect(await screen.findByText(/data Anda sudah kami terima/)).toBeTruthy();
  }, 10000);

  it("tampil lagi setiap halaman dibuka, walau pernah ditutup", async () => {
    tampil();
    fireEvent.click(
      await screen.findByRole("button", { name: "Tutup" }, { timeout: 2000 }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    tampil();
    expect(
      await screen.findByRole("dialog", {}, { timeout: 2000 }),
    ).toBeTruthy();
  });
});
