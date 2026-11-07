import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { RequireRole } from "../components/auth/RouteGuards";
import { EVENT_SESI_BERAKHIR } from "../services/sesiEvent";

const fetchApi = vi.fn();
vi.mock("../services/api", () => ({
  fetchApi: (...a: unknown[]) => fetchApi(...a),
}));

const CALON = {
  user_id: "u1",
  email: "calon@contoh.id",
  nama_lengkap: "Calon",
  role: "calon_mahasiswa",
  no_hp: "0812",
  is_email_verified: true,
};

const renderPortal = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/portal/formulir"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<p>Halaman Login</p>} />
            <Route
              path="/portal/formulir"
              element={
                <RequireRole allowedRoles={["calon_mahasiswa"]}>
                  <p>Isi Formulir Rahasia</p>
                </RequireRole>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("akses portal tanpa login", () => {
  beforeEach(() => {
    fetchApi.mockReset();
  });

  it("membuka /portal/formulir tanpa sesi -> diarahkan ke login", async () => {
    fetchApi.mockRejectedValue({ kode: "TIDAK_TERAUTENTIKASI" });
    renderPortal();
    expect(await screen.findByText("Halaman Login")).toBeInTheDocument();
    expect(screen.queryByText("Isi Formulir Rahasia")).not.toBeInTheDocument();
  });

  it("dengan sesi sah halaman terbuka", async () => {
    fetchApi.mockResolvedValue(CALON);
    renderPortal();
    expect(await screen.findByText("Isi Formulir Rahasia")).toBeInTheDocument();
  });

  it("sesi berakhir saat halaman terbuka -> langsung ke login", async () => {
    fetchApi.mockResolvedValue(CALON);
    renderPortal();
    await screen.findByText("Isi Formulir Rahasia");
    act(() => {
      window.dispatchEvent(new Event(EVENT_SESI_BERAKHIR));
    });
    expect(await screen.findByText("Halaman Login")).toBeInTheDocument();
    expect(screen.queryByText("Isi Formulir Rahasia")).not.toBeInTheDocument();
  });

  it("halaman dipulihkan dari cache (tombol Back) dicek ulang: sesi sudah tak sah -> login", async () => {
    fetchApi.mockResolvedValueOnce(CALON);
    renderPortal();
    await screen.findByText("Isi Formulir Rahasia");
    fetchApi.mockRejectedValue({ kode: "TIDAK_TERAUTENTIKASI" });
    act(() => {
      const e = new Event("pageshow") as Event & { persisted: boolean };
      e.persisted = true;
      window.dispatchEvent(e);
    });
    expect(await screen.findByText("Halaman Login")).toBeInTheDocument();
  });

  it("gangguan jaringan saat dicek ulang TIDAK mengeluarkan pengguna", async () => {
    fetchApi.mockResolvedValueOnce(CALON);
    renderPortal();
    await screen.findByText("Isi Formulir Rahasia");
    fetchApi.mockRejectedValue({ kode: "LAYANAN_TIDAK_TERSEDIA" });
    act(() => {
      const e = new Event("pageshow") as Event & { persisted: boolean };
      e.persisted = true;
      window.dispatchEvent(e);
    });
    await waitFor(() => expect(fetchApi).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Isi Formulir Rahasia")).toBeInTheDocument();
  });
});
