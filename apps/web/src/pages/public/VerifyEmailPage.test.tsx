import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { VerifyEmailPage } from "./VerifyEmailPage";
import {
  AuthContext,
  type AuthContextType,
} from "../../context/authContextDef";

// Halaman kode diuji dalam keadaan verifikasi email diaktifkan
vi.mock("../../components/auth/akses", async (asli) => ({
  ...(await asli<typeof import("../../components/auth/akses")>()),
  WAJIB_VERIFIKASI_EMAIL: true,
}));

const ctx = (over: Partial<AuthContextType> = {}): AuthContextType =>
  ({
    user: {
      user_id: "u1",
      email: "calon@contoh.id",
      nama_lengkap: "Calon",
      role: "calon_mahasiswa",
      no_hp: "0812",
      is_email_verified: false,
    },
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    baruLogout: false,
    verifyEmail: vi.fn(),
    kirimUlangKode: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    refetchUser: vi.fn(),
    setUser: vi.fn(),
    ...over,
  }) as AuthContextType;

const tampil = (c: AuthContextType) =>
  render(
    <AuthContext.Provider value={c}>
      <MemoryRouter initialEntries={["/verify-email"]}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/login" element={<div>Halaman Login</div>} />
          <Route path="/portal/dashboard" element={<div>Portal</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe("VerifyEmailPage", () => {
  it("hanya menerima angka dan mengirim kode 6 digit", async () => {
    const verifyEmail = vi.fn().mockResolvedValue({ pesan: "ok" });
    tampil(ctx({ verifyEmail }));
    const input = screen.getByLabelText("Kode verifikasi 6 digit");
    fireEvent.change(input, { target: { value: "12a3-45 6" } });
    expect(input).toHaveValue("123456");
    fireEvent.click(screen.getByRole("button", { name: "Verifikasi" }));
    await waitFor(() =>
      expect(verifyEmail).toHaveBeenCalledWith({ kode: "123456" }),
    );
    expect(await screen.findByText("Email Terverifikasi")).toBeInTheDocument();
  });

  it("menampilkan pesan server bila kode salah", async () => {
    const verifyEmail = vi.fn().mockRejectedValue({
      pesan: "Kode verifikasi salah. Sisa percobaan: 4.",
    });
    tampil(ctx({ verifyEmail }));
    fireEvent.change(screen.getByLabelText("Kode verifikasi 6 digit"), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verifikasi" }));
    expect(await screen.findByText(/Sisa percobaan: 4/)).toBeInTheDocument();
  });

  it("tombol kirim ulang menunggu jeda", () => {
    tampil(ctx());
    expect(
      screen.getByRole("button", { name: /Kirim ulang kode \(\d+ dtk\)/ }),
    ).toBeDisabled();
  });

  it("tanpa login diarahkan ke halaman login", () => {
    tampil(ctx({ user: null }));
    expect(screen.getByText("Halaman Login")).toBeInTheDocument();
  });

  it("yang sudah terverifikasi langsung ke portal", () => {
    tampil(
      ctx({
        user: {
          user_id: "u1",
          email: "calon@contoh.id",
          nama_lengkap: "Calon",
          role: "calon_mahasiswa",
          no_hp: "0812",
          is_email_verified: true,
        },
      }),
    );
    expect(screen.getByText("Portal")).toBeInTheDocument();
  });
});
