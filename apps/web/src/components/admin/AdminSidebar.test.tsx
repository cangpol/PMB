import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminLayout } from "../../pages/admin/AdminLayout";
import {
  AuthContext,
  type AuthContextType,
} from "../../context/authContextDef";
import type { AuthResponse } from "../../types";

// Data antrean pemeriksaan dikendalikan tes (tanpa jaringan)
const antreanMock = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("@/hooks/useAntreanVerifikasi", async (asli) => ({
  ...(await asli<typeof import("@/hooks/useAntreanVerifikasi")>()),
  useAntreanVerifikasi: () => ({ data: antreanMock.data, refetch: vi.fn() }),
  useNotifikasiAntrean: () => undefined,
}));

// Sakelar fitur pengawas CBT dikendalikan tes
const fiturMock = vi.hoisted(() => ({ pengawasCbtAktif: true }));
vi.mock("@/hooks/useFitur", () => ({
  useFitur: () => ({
    data: { pengawas_cbt_aktif: fiturMock.pengawasCbtAktif },
  }),
}));

const item = (menunggu: number) => ({
  menunggu,
  calon: menunggu,
  terlama_sejak: null,
});

const mockAuthContext = (
  role = "super_admin",
  userOverrides: Partial<AuthResponse> = {},
): AuthContextType => ({
  user: {
    user_id: "user-1",
    email: "admin@upitra.ac.id",
    nama_lengkap: "Administrator PMB",
    role,
    no_hp: "08123456789",
    is_email_verified: true,
    ...userOverrides,
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
});

describe("AdminSidebar Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    antreanMock.data = undefined;
    fiturMock.pengawasCbtAktif = true;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("merender sidebar mode lebar penuh (expanded) dengan judul logo dan grup menu", () => {
    const ctx = mockAuthContext("super_admin");
    render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/admin/dashboard"]}>
          <AdminSidebar collapsed={false} onToggleCollapse={vi.fn()} />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText("PMB")).toBeInTheDocument();
    expect(
      screen.getByText("Universitas Pignatelli Triputra"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ringkasan")).toBeInTheDocument();
    expect(screen.getByText("Pendaftaran & Berkas")).toBeInTheDocument();
    expect(screen.getByText("Ujian Seleksi (CBT)")).toBeInTheDocument();
  });

  it("merender sidebar mode rail ringkas saat collapsed=true", () => {
    const ctx = mockAuthContext("super_admin");
    const { container } = render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/admin/dashboard"]}>
          <AdminSidebar collapsed={true} onToggleCollapse={vi.fn()} />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    // Pada mode rail (collapsed), lebar sidebar adalah w-[72px]
    const aside = container.querySelector("aside");
    expect(aside).toHaveClass("w-[72px]");
    // Teks nama sistem disembunyikan dalam mode rail
    expect(screen.queryByText("Panel Eksekutif")).not.toBeInTheDocument();
  });

  it("memanggil onToggleCollapse saat tombol toggle collapse ditekan", () => {
    const ctx = mockAuthContext("super_admin");
    const onToggle = vi.fn();
    render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/admin/dashboard"]}>
          <AdminSidebar collapsed={false} onToggleCollapse={onToggle} />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    const toggleBtn = screen.getByRole("button", {
      name: /Persempit Sidebar/i,
    });
    fireEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("membuka otomatis grup akordion aktif sesuai rute lokasi", () => {
    const ctx = mockAuthContext("super_admin");
    render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/admin/cbt/sesi"]}>
          <AdminSidebar collapsed={false} onToggleCollapse={vi.fn()} />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    // Sub-item dalam grup CBT harus terlihat otomatis
    expect(screen.getByText("Jadwal & Sesi CBT")).toBeInTheDocument();
    expect(screen.getByText("Meja Presensi Pengawas")).toBeInTheDocument();
    expect(screen.getByText("Bank Soal CBT")).toBeInTheDocument();
  });

  it("menyimpan status buka-tutup akordion ke localStorage", () => {
    const ctx = mockAuthContext("super_admin");
    render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/admin/dashboard"]}>
          <AdminSidebar collapsed={false} onToggleCollapse={vi.fn()} />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    const groupHeader = screen.getByText("Ujian Seleksi (CBT)");
    fireEvent.click(groupHeader);

    const saved = localStorage.getItem("pmb_admin_sidebar_accordions");
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.cbt).toBe(true);
  });

  describe("Role-Based Access Control (RBAC) Filtering", () => {
    it("hanya menampilkan menu Keuangan dan Ringkasan untuk peran 'keuangan'", () => {
      const ctx = mockAuthContext("keuangan");
      render(
        <AuthContext.Provider value={ctx}>
          <MemoryRouter initialEntries={["/admin/keuangan"]}>
            <AdminSidebar collapsed={false} onToggleCollapse={vi.fn()} />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      // Grup yang boleh diakses keuangan
      expect(screen.getByText("Ringkasan")).toBeInTheDocument();
      expect(screen.getByText("Keuangan & Tagihan")).toBeInTheDocument();

      // Grup yang TIDAK boleh diakses keuangan
      expect(screen.queryByText("Ujian Seleksi (CBT)")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Jalur Rekognisi (RPL)"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Pengaturan PMB")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Pendaftaran & Berkas"),
      ).not.toBeInTheDocument();
    });

    it("hanya menampilkan menu RPL dan Ringkasan untuk peran 'asesor_rpl'", () => {
      const ctx = mockAuthContext("asesor_rpl");
      render(
        <AuthContext.Provider value={ctx}>
          <MemoryRouter initialEntries={["/admin/rpl"]}>
            <AdminSidebar collapsed={false} onToggleCollapse={vi.fn()} />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(screen.getByText("Ringkasan")).toBeInTheDocument();
      expect(screen.getByText("Jalur Rekognisi (RPL)")).toBeInTheDocument();

      expect(screen.queryByText("Keuangan & Tagihan")).not.toBeInTheDocument();
      expect(screen.queryByText("Ujian Seleksi (CBT)")).not.toBeInTheDocument();
      expect(screen.queryByText("Pengaturan PMB")).not.toBeInTheDocument();
    });

    it("hanya menampilkan menu CBT dan Ringkasan untuk peran 'pengawas_ujian'", () => {
      const ctx = mockAuthContext("pengawas_ujian");
      render(
        <AuthContext.Provider value={ctx}>
          <MemoryRouter initialEntries={["/admin/cbt/presensi"]}>
            <AdminSidebar collapsed={false} onToggleCollapse={vi.fn()} />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(screen.getByText("Ringkasan")).toBeInTheDocument();
      expect(screen.getByText("Ujian Seleksi (CBT)")).toBeInTheDocument();

      expect(screen.queryByText("Keuangan & Tagihan")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Jalur Rekognisi (RPL)"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Pengaturan PMB")).not.toBeInTheDocument();
    });

    it("menampilkan seluruh 9 grup menu untuk peran 'super_admin'", () => {
      const ctx = mockAuthContext("super_admin");
      render(
        <AuthContext.Provider value={ctx}>
          <MemoryRouter initialEntries={["/admin/dashboard"]}>
            <AdminSidebar collapsed={false} onToggleCollapse={vi.fn()} />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(screen.getByText("Ringkasan")).toBeInTheDocument();
      expect(screen.getByText("Pendaftaran & Berkas")).toBeInTheDocument();
      expect(screen.getByText("Ujian Seleksi (CBT)")).toBeInTheDocument();
      expect(screen.getByText("Keuangan & Tagihan")).toBeInTheDocument();
      expect(screen.getByText("Hasil & Registrasi")).toBeInTheDocument();
      expect(screen.getByText("Jalur Rekognisi (RPL)")).toBeInTheDocument();
      expect(screen.getByText("Konten Publik (CMS)")).toBeInTheDocument();
      expect(screen.getByText("Pengaturan PMB")).toBeInTheDocument();
      expect(screen.getByText("Super Admin")).toBeInTheDocument();
    });

    it("grup 'Super Admin' hanya tampil untuk super_admin, tidak untuk admin_pmb", () => {
      render(
        <AuthContext.Provider value={mockAuthContext("admin_pmb")}>
          <MemoryRouter initialEntries={["/admin/dashboard"]}>
            <AdminSidebar collapsed={false} onToggleCollapse={vi.fn()} />
          </MemoryRouter>
        </AuthContext.Provider>,
      );
      expect(screen.getByText("Pengaturan PMB")).toBeInTheDocument();
      expect(screen.queryByText("Super Admin")).not.toBeInTheDocument();
    });

    it("fitur pengawas dimatikan: pengawas_ujian tidak punya menu CBT", () => {
      fiturMock.pengawasCbtAktif = false;
      render(
        <AuthContext.Provider value={mockAuthContext("pengawas_ujian")}>
          <MemoryRouter initialEntries={["/admin/dashboard"]}>
            <AdminSidebar collapsed={false} onToggleCollapse={vi.fn()} />
          </MemoryRouter>
        </AuthContext.Provider>,
      );
      expect(screen.getByText("Ringkasan")).toBeInTheDocument();
      expect(screen.queryByText("Ujian Seleksi (CBT)")).not.toBeInTheDocument();
    });

    it("fitur pengawas dimatikan: admin tetap punya CBT tetapi tanpa Meja Presensi", () => {
      fiturMock.pengawasCbtAktif = false;
      render(
        <AuthContext.Provider value={mockAuthContext("admin_pmb")}>
          <MemoryRouter initialEntries={["/admin/cbt/sesi"]}>
            <AdminSidebar collapsed={false} onToggleCollapse={vi.fn()} />
          </MemoryRouter>
        </AuthContext.Provider>,
      );
      expect(screen.getByText("Jadwal & Sesi CBT")).toBeInTheDocument();
      expect(
        screen.queryByText("Meja Presensi Pengawas"),
      ).not.toBeInTheDocument();
    });

    it("fitur pengawas menyala: Meja Presensi tampil", () => {
      render(
        <AuthContext.Provider value={mockAuthContext("admin_pmb")}>
          <MemoryRouter initialEntries={["/admin/cbt/sesi"]}>
            <AdminSidebar collapsed={false} onToggleCollapse={vi.fn()} />
          </MemoryRouter>
        </AuthContext.Provider>,
      );
      expect(screen.getByText("Meja Presensi Pengawas")).toBeInTheDocument();
    });

    it("menutup akses menu admin sensitif jika pengguna anonim / peran kosong (fail-closed)", () => {
      const ctx = mockAuthContext("");
      ctx.user = null;
      render(
        <AuthContext.Provider value={ctx}>
          <MemoryRouter initialEntries={["/admin/dashboard"]}>
            <AdminSidebar collapsed={false} onToggleCollapse={vi.fn()} />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(screen.queryByText("Pengaturan PMB")).not.toBeInTheDocument();
      expect(screen.queryByText("Ujian Seleksi (CBT)")).not.toBeInTheDocument();
      expect(screen.queryByText("Keuangan & Tagihan")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Jalur Rekognisi (RPL)"),
      ).not.toBeInTheDocument();
    });
  });
});

describe("AdminLayout Component & Mobile Drawer", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.style.overflow = "";
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    document.body.style.overflow = "";
  });

  it("dapat membuka drawer mobile, mengunci body scroll, dan menutupnya dengan tombol Escape", () => {
    const ctx = mockAuthContext("super_admin");
    render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/admin/dashboard"]}>
          <AdminLayout />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    // Awalnya drawer belum terbuka
    expect(document.body.style.overflow).not.toBe("hidden");

    // Klik tombol hamburger di topbar untuk membuka drawer mobile
    const hamburgerBtn = screen.getByRole("button", {
      name: /Buka menu navigasi/i,
    });
    fireEvent.click(hamburgerBtn);

    // Body scroll harus terkunci dengan overflow: hidden
    expect(document.body.style.overflow).toBe("hidden");

    // Tekan tombol Escape untuk menutup drawer
    fireEvent.keyDown(window, { key: "Escape" });

    // Drawer tertutup dan body scroll dipulihkan
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("menutup drawer mobile otomatis saat berpindah rute", () => {
    const ctx = mockAuthContext("super_admin");

    const NavigationTestComponent = () => {
      const navigate = useNavigate();
      return (
        <div>
          <button
            type="button"
            onClick={() => navigate("/admin/berkas")}
            data-testid="pindah-rute-btn"
          >
            Pindah Halaman
          </button>
        </div>
      );
    };

    render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/admin/dashboard"]}>
          <Routes>
            <Route path="/admin/*" element={<AdminLayout />}>
              <Route path="dashboard" element={<NavigationTestComponent />} />
              <Route path="berkas" element={<div>Halaman Berkas</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    // Buka drawer
    const hamburgerBtn = screen.getByRole("button", {
      name: /Buka menu navigasi/i,
    });
    fireEvent.click(hamburgerBtn);
    expect(document.body.style.overflow).toBe("hidden");

    // Klik tombol navigasi untuk berpindah rute
    const navigateBtn = screen.getByTestId("pindah-rute-btn");
    fireEvent.click(navigateBtn);

    // Saat rute berganti, drawer tertutup otomatis dan overflow dipulihkan
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(screen.getByText("Halaman Berkas")).toBeInTheDocument();
  });

  it("membuka Command Palette dengan shortcut keyboard Ctrl+K atau Cmd+K", () => {
    const ctx = mockAuthContext("super_admin");
    render(
      <AuthContext.Provider value={ctx}>
        <MemoryRouter initialEntries={["/admin/dashboard"]}>
          <AdminLayout />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    // Awalnya command palette belum terbuka
    expect(
      screen.queryByPlaceholderText(/Cari menu, konfigurasi, atau fitur PMB/i),
    ).not.toBeInTheDocument();

    // Trigger keyboard event Ctrl+K
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    // Modal Command Palette harus terbuka
    expect(
      screen.getByPlaceholderText(/Cari menu, konfigurasi, atau fitur PMB/i),
    ).toBeInTheDocument();

    // Tekan Escape untuk menutup
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByPlaceholderText(/Cari menu, konfigurasi, atau fitur PMB/i),
    ).not.toBeInTheDocument();
  });

  describe("penanda berkas yang perlu diperiksa admin", () => {
    const renderDi = (rute: string, role = "super_admin") =>
      render(
        <AuthContext.Provider value={mockAuthContext(role)}>
          <MemoryRouter initialEntries={[rute]}>
            <AdminSidebar collapsed={false} onToggleCollapse={vi.fn()} />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

    it("menampilkan lencana jumlah pada menu Verifikasi Berkas", () => {
      antreanMock.data = {
        berkas: item(3),
        bukti_bayar: item(0),
        daftar_ulang: item(0),
        cbt_keputusan: item(0),
        total: 3,
      };
      renderDi("/admin/berkas");
      const lencana = screen.getByLabelText("3 menunggu diperiksa");
      expect(lencana).toHaveTextContent("3");
      expect(
        screen.getByRole("link", { name: /Verifikasi Berkas PMB/ }),
      ).toContainElement(lencana);
    });

    it("grup yang tertutup tetap menandai ada pekerjaan di dalamnya", () => {
      antreanMock.data = {
        berkas: item(0),
        bukti_bayar: item(7),
        daftar_ulang: item(0),
        cbt_keputusan: item(0),
        total: 7,
      };
      // Rute di grup lain: grup Keuangan tertutup, lencana ada di judul grupnya
      renderDi("/admin/dashboard");
      expect(screen.getByLabelText("7 menunggu diperiksa")).toBeInTheDocument();
    });

    it("tanpa antrean tidak ada lencana", () => {
      antreanMock.data = {
        berkas: item(0),
        bukti_bayar: item(0),
        daftar_ulang: item(0),
        cbt_keputusan: item(0),
        total: 0,
      };
      renderDi("/admin/berkas");
      expect(
        screen.queryByLabelText(/menunggu diperiksa/),
      ).not.toBeInTheDocument();
    });

    it("jumlah besar dipadatkan menjadi 99+", () => {
      antreanMock.data = {
        berkas: item(250),
        bukti_bayar: item(0),
        daftar_ulang: item(0),
        cbt_keputusan: item(0),
        total: 250,
      };
      renderDi("/admin/berkas");
      expect(screen.getByLabelText("250 menunggu diperiksa")).toHaveTextContent(
        "99+",
      );
    });
  });
});
