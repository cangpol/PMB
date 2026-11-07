import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { RequireAuth, RequireRole } from "./RouteGuards";
import {
  AuthContext,
  type AuthContextType,
} from "../../context/authContextDef";
import type { AuthResponse } from "../../types";

const mockAuthContext = (
  user: AuthResponse | null = null,
  isLoading = false,
): AuthContextType => ({
  user,
  isLoading,
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
});

describe("Auth & RBAC Route Guards", () => {
  it("RequireAuth menampilkan loading spinner saat memverifikasi sesi", () => {
    const ctx = mockAuthContext(null, true);
    render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter>
          <RequireAuth>
            <div>Konten Rahasia</div>
          </RequireAuth>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText("Memverifikasi sesi Anda...")).toBeInTheDocument();
    expect(screen.queryByText("Konten Rahasia")).not.toBeInTheDocument();
  });

  it("RequireAuth me-redirect ke /login jika pengguna belum terautentikasi", () => {
    const ctx = mockAuthContext(null, false);
    render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/portal/dashboard"]}>
          <Routes>
            <Route
              path="/portal/dashboard"
              element={
                <RequireAuth>
                  <div>Konten Portal</div>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<div>Halaman Login Target</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText("Halaman Login Target")).toBeInTheDocument();
    expect(screen.queryByText("Konten Portal")).not.toBeInTheDocument();
  });

  it("RequireRole mengembalikan calon ke portalnya tanpa membuka halaman admin", () => {
    const candidateUser: AuthResponse = {
      user_id: "usr-1",
      email: "calon@example.com",
      nama_lengkap: "Budi Santoso",
      role: "calon_mahasiswa",
      no_hp: "081234567890",
      is_email_verified: true,
    };
    const ctx = mockAuthContext(candidateUser, false);

    render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/admin/cbt/bank-soal"]}>
          <Routes>
            <Route
              path="/admin/cbt/bank-soal"
              element={
                <RequireRole allowedRoles={["admin_pmb", "super_admin"]}>
                  <div>Konten Rahasia Admin PMB</div>
                </RequireRole>
              }
            />
            <Route
              path="/portal/dashboard"
              element={<div>Dashboard Calon</div>}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText("Dashboard Calon")).toBeInTheDocument();
    expect(
      screen.queryByText("Konten Rahasia Admin PMB"),
    ).not.toBeInTheDocument();
    // Tidak ada halaman "Akses Ditolak" yang membocorkan keberadaan rute admin
    expect(screen.queryByText("Akses Ditolak")).not.toBeInTheDocument();
  });

  it("Setelah logout, halaman terakhir tidak diingat untuk pengguna berikutnya", () => {
    const ctx = { ...mockAuthContext(null, false), baruLogout: true };
    let stateLogin: unknown = "belum";
    const LoginProbe = () => {
      stateLogin = useLocation().state;
      return <div>Halaman Login</div>;
    };

    render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/admin/cbt/bank-soal"]}>
          <Routes>
            <Route
              path="/admin/cbt/bank-soal"
              element={
                <RequireRole allowedRoles={["admin_pmb"]}>
                  <div>Bank Soal</div>
                </RequireRole>
              }
            />
            <Route path="/login" element={<LoginProbe />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText("Halaman Login")).toBeInTheDocument();
    expect(stateLogin).toBeFalsy();
  });

  it("RequireRole MENGIZINKAN admin PMB mengakses rute admin", () => {
    const adminUser: AuthResponse = {
      user_id: "adm-1",
      email: "admin@triputra.id",
      nama_lengkap: "Admin PMB UPT",
      role: "admin_pmb",
      no_hp: "081234567899",
      is_email_verified: true,
    };
    const ctx = mockAuthContext(adminUser, false);

    render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/admin/dashboard"]}>
          <Routes>
            <Route
              path="/admin/dashboard"
              element={
                <RequireRole allowedRoles={["admin_pmb", "super_admin"]}>
                  <div>Konten Rahasia Admin PMB</div>
                </RequireRole>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText("Konten Rahasia Admin PMB")).toBeInTheDocument();
    expect(screen.queryByText("Akses Ditolak")).not.toBeInTheDocument();
  });

  it("RequireRole MENGIZINKAN Super Admin mengakses seluruh rute", () => {
    const superAdminUser: AuthResponse = {
      user_id: "sa-1",
      email: "superadmin@triputra.id",
      nama_lengkap: "Super Admin PMB",
      role: "super_admin",
      no_hp: "081234567888",
      is_email_verified: true,
    };
    const ctx = mockAuthContext(superAdminUser, false);

    render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/admin/keuangan"]}>
          <Routes>
            <Route
              path="/admin/keuangan"
              element={
                <RequireRole allowedRoles={["keuangan"]}>
                  <div>Portal Verifikasi Keuangan</div>
                </RequireRole>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText("Portal Verifikasi Keuangan")).toBeInTheDocument();
    expect(screen.queryByText("Akses Ditolak")).not.toBeInTheDocument();
  });
});
