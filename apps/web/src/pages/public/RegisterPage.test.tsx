import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RegisterPage } from "./RegisterPage";

const registerMock = vi.fn().mockResolvedValue({});
vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ register: registerMock, user: null, isLoading: false }),
}));

const INDEX = [
  {
    kode: "030000",
    nama: "Jawa Tengah",
    kabupaten: [{ kode: "036000", nama: "Kota Surakarta" }],
  },
];
const SEKOLAH = { "036000": ["SMAN 1 SURAKARTA", "SMKN 2 SURAKARTA"] };

beforeEach(() => {
  registerMock.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (String(url).endsWith("index.json") ? INDEX : SEKOLAH),
    })),
  );
});

const aksi = {
  type: async (el: HTMLElement, teks: string) => {
    fireEvent.change(el, { target: { value: teks } });
  },
  selectOptions: async (el: HTMLElement, nilai: string) => {
    fireEvent.change(el, { target: { value: nilai } });
  },
  click: async (el: HTMLElement) => {
    fireEvent.click(el);
  },
};

const tampil = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
const isiDasar = async (u: typeof aksi) => {
  await u.type(
    screen.getByPlaceholderText("Misal: Budi Santoso"),
    "Budi Santoso",
  );
  await u.type(screen.getByPlaceholderText("nama@email.com"), "budi@contoh.id");
  await u.type(screen.getByPlaceholderText("081234567890"), "081234567890");
  const [pw, konf] = screen.getAllByPlaceholderText("••••••••");
  await u.type(pw, "Rahasia123!");
  await u.type(konf, "Rahasia123!");
};

describe("RegisterPage - asal sekolah", () => {
  it("disembunyikan kecuali sumber = Sosialisasi di Sekolah", async () => {
    const u = aksi;
    tampil();
    const sumber = screen.getByLabelText(/Dari mana Anda mengetahui/i);
    expect(screen.queryByLabelText(/Provinsi Asal Sekolah/i)).toBeNull();

    await u.selectOptions(sumber, "GOOGLE");
    expect(screen.queryByLabelText(/Provinsi Asal Sekolah/i)).toBeNull();

    await u.selectOptions(sumber, "SOSIALISASI_SEKOLAH");
    expect(screen.getByLabelText(/Provinsi Asal Sekolah/i)).toBeTruthy();
    expect(screen.getByLabelText(/Kabupaten \/ Kota/i)).toBeTruthy();
    expect(screen.getByLabelText(/Nama Sekolah/i)).toBeTruthy();

    await u.selectOptions(sumber, "WHATSAPP");
    expect(screen.queryByLabelText(/Provinsi Asal Sekolah/i)).toBeNull();
  });

  it("bertingkat & wajib diisi saat tampil, lalu terkirim ke API", async () => {
    const u = aksi;
    tampil();
    await isiDasar(u);
    await u.selectOptions(
      screen.getByLabelText(/Dari mana Anda mengetahui/i),
      "SOSIALISASI_SEKOLAH",
    );
    const kab = screen.getByLabelText(
      /Kabupaten \/ Kota/i,
    ) as HTMLSelectElement;
    const sek = screen.getByLabelText(/Nama Sekolah/i) as HTMLInputElement;
    expect(kab.disabled).toBe(true);
    expect(sek.disabled).toBe(true);

    await u.click(
      screen.getByRole("button", { name: /Daftar Akun Sekarang/i }),
    );
    expect(await screen.findByText("Pilih provinsi asal sekolah")).toBeTruthy();
    expect(registerMock).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Jawa Tengah" })).toBeTruthy(),
    );
    await u.selectOptions(
      screen.getByLabelText(/Provinsi Asal Sekolah/i),
      "Jawa Tengah",
    );
    await u.selectOptions(kab, "Kota Surakarta");
    await u.type(sek, "SMAN 1 SURAKARTA");
    await u.click(
      screen.getByRole("button", { name: /Daftar Akun Sekarang/i }),
    );

    await waitFor(() => expect(registerMock).toHaveBeenCalledTimes(1));
    expect(registerMock.mock.calls[0][0]).toMatchObject({
      sumber_informasi: "SOSIALISASI_SEKOLAH",
      provinsi_asal_sekolah: "Jawa Tengah",
      kabupaten_asal_sekolah: "Kota Surakarta",
      asal_sekolah: "SMAN 1 SURAKARTA",
    });
  });

  it("sumber lain: tidak wajib & tidak mengirim data sekolah", async () => {
    const u = aksi;
    tampil();
    await isiDasar(u);
    await u.selectOptions(
      screen.getByLabelText(/Dari mana Anda mengetahui/i),
      "GOOGLE",
    );
    await u.click(
      screen.getByRole("button", { name: /Daftar Akun Sekarang/i }),
    );
    await waitFor(() => expect(registerMock).toHaveBeenCalledTimes(1));
    const arg = registerMock.mock.calls[0][0];
    expect(arg.sumber_informasi).toBe("GOOGLE");
    expect(arg.asal_sekolah).toBeUndefined();
    expect(arg.provinsi_asal_sekolah).toBeUndefined();
  });
});
