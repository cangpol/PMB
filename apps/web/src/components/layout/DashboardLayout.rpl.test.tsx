import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardLayout } from "./DashboardLayout";
import { AlurProvider } from "../pendaftaran/AlurStepper";

const fetchApi = vi.fn();
vi.mock("@/services/api", () => ({
  fetchApi: (...a: unknown[]) => fetchApi(...a),
}));
vi.mock("@/context", () => ({
  useAuth: () => ({
    user: { nama_lengkap: "Budi", email: "b@x.id", role: "calon" },
    logout: vi.fn(),
  }),
}));

const tampil = () =>
  render(
    <MemoryRouter initialEntries={["/portal/dashboard"]}>
      <AlurProvider>
        <DashboardLayout>
          <p>isi</p>
        </DashboardLayout>
      </AlurProvider>
    </MemoryRouter>,
  );

beforeEach(() => fetchApi.mockReset());

describe("menu Portofolio & Jalur RPL", () => {
  it("disembunyikan untuk calon bukan jalur RPL", async () => {
    fetchApi.mockResolvedValue({ jalur_rpl: false, langkah: [] });
    tampil();
    await screen.findAllByText("Formulir Pendaftaran");
    expect(screen.queryByText("Portofolio & Jalur RPL")).toBeNull();
  });

  it("tampil untuk calon jalur RPL", async () => {
    fetchApi.mockResolvedValue({
      jalur_rpl: true,
      langkah: [
        { kode: "pilih_jalur", status: "SELESAI" },
        { kode: "formulir", status: "AKTIF" },
      ],
    });
    tampil();
    expect(
      (await screen.findAllByText("Portofolio & Jalur RPL")).length,
    ).toBeGreaterThan(0);
  });
});
