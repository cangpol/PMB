import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";
import { DialogProvider } from "@/components/ui/DialogProvider";
import { AuthContext, type AuthContextType } from "@/context/authContextDef";
import { PenggunaAksesPage } from "./PenggunaAksesPage";

const svc = vi.hoisted(() => ({
  getDaftarPengguna: vi.fn(),
  aturPeranMassal: vi.fn(),
  aturStatusPengguna: vi.fn(),
  buatPengguna: vi.fn(),
  hapusPengguna: vi.fn(),
  resetPasswordPengguna: vi.fn(),
  ubahPengguna: vi.fn(),
}));
vi.mock("@/services/pengguna", () => svc);

const fiturMock = vi.hoisted(() => ({
  aktif: true,
  ubah: vi.fn(),
}));
vi.mock("@/hooks/useFitur", () => ({
  KUNCI_FITUR: ["fitur-sistem"],
  useFitur: () => ({
    data: { pengawas_cbt_aktif: fiturMock.aktif },
    isLoading: false,
    isError: false,
  }),
  useAturPengawasCbt: () => ({
    mutateAsync: fiturMock.ubah,
    isPending: false,
  }),
}));

const u = (id: string, nama: string, role: string) => ({
  id,
  email: `${id}@contoh.id`,
  role,
  nama_lengkap: nama,
  no_hp: "0812",
  is_active: true,
  is_email_verified: true,
  created_at: "2026-11-01T00:00:00Z",
});

const DAFTAR = [
  u("sa", "Super Satu", "super_admin"),
  u("me", "Saya Sendiri", "super_admin"),
  u("c1", "Calon Satu", "calon_mahasiswa"),
  u("c2", "Calon Dua", "calon_mahasiswa"),
];

const tampil = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider
        value={
          {
            user: {
              user_id: "me",
              email: "me@contoh.id",
              nama_lengkap: "Saya Sendiri",
              role: "super_admin",
              no_hp: "0812",
              is_email_verified: true,
            },
            isLoading: false,
          } as unknown as AuthContextType
        }
      >
        <MemoryRouter>
          <ToastProvider>
            <DialogProvider>
              <PenggunaAksesPage />
            </DialogProvider>
          </ToastProvider>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );

describe("PenggunaAksesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fiturMock.aktif = true;
    fiturMock.ubah.mockResolvedValue({ pengawas_cbt_aktif: false });
    svc.getDaftarPengguna.mockResolvedValue(DAFTAR);
    svc.aturPeranMassal.mockResolvedValue({
      role: "keuangan",
      diubah: [
        u("c1", "Calon Satu", "keuangan"),
        u("c2", "Calon Dua", "keuangan"),
      ],
      dilewati: [],
    });
  });

  it("menampilkan sakelar pengawas CBT dalam keadaan ON", async () => {
    tampil();
    const sakelar = await screen.findByRole("switch");
    expect(sakelar).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("ON")).toBeInTheDocument();
  });

  it("mematikan fitur pengawas setelah dikonfirmasi", async () => {
    tampil();
    fireEvent.click(await screen.findByRole("switch"));
    const dlg = await screen.findByRole("alertdialog");
    expect(within(dlg).getByText(/Matikan fitur pengawas CBT/)).toBeVisible();
    fireEvent.click(within(dlg).getByRole("button", { name: "Matikan" }));
    await waitFor(() => expect(fiturMock.ubah).toHaveBeenCalledWith(false));
  });

  it("tidak mengubah fitur bila konfirmasi dibatalkan", async () => {
    tampil();
    fireEvent.click(await screen.findByRole("switch"));
    const dlg = await screen.findByRole("alertdialog");
    fireEvent.click(within(dlg).getByRole("button", { name: /Batal/ }));
    expect(fiturMock.ubah).not.toHaveBeenCalled();
  });

  it("super admin dan akun sendiri tidak bisa dicentang", async () => {
    tampil();
    expect(await screen.findByLabelText("Pilih Super Satu")).toBeDisabled();
    expect(screen.getByLabelText("Pilih Saya Sendiri")).toBeDisabled();
    expect(screen.getByLabelText("Pilih Calon Satu")).toBeEnabled();
  });

  it("mencentang pengguna lalu menjadikannya Keuangan", async () => {
    tampil();
    fireEvent.click(await screen.findByLabelText("Pilih Calon Satu"));
    fireEvent.click(screen.getByLabelText("Pilih Calon Dua"));
    expect(screen.getByText("2 pengguna dipilih")).toBeInTheDocument();

    const bar = screen.getByRole("region", {
      name: "Aksi untuk pengguna terpilih",
    });
    fireEvent.click(within(bar).getByRole("button", { name: "Keuangan" }));
    const dlg = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(dlg).getByRole("button", { name: /Jadikan Keuangan/ }),
    );

    await waitFor(() =>
      expect(svc.aturPeranMassal).toHaveBeenCalledWith(
        expect.arrayContaining(["c1", "c2"]),
        "keuangan",
      ),
    );
    expect(await screen.findByText(/2 pengguna kini Keuangan/)).toBeVisible();
  });

  it("'Pilih semua' hanya mencentang pengguna yang boleh diubah", async () => {
    tampil();
    fireEvent.click(await screen.findByLabelText("Pilih semua pengguna"));
    expect(screen.getByText("2 pengguna dipilih")).toBeInTheDocument();
  });

  it("menawarkan peran Admin PMB, Keuangan, dan Mahasiswa", async () => {
    tampil();
    fireEvent.click(await screen.findByLabelText("Pilih Calon Satu"));
    const bar = screen.getByRole("region", {
      name: "Aksi untuk pengguna terpilih",
    });
    for (const nama of ["Admin PMB", "Keuangan", "Mahasiswa"]) {
      expect(within(bar).getByRole("button", { name: nama })).toBeVisible();
    }
  });
  it("menambah pengguna dan menampilkan password sementara", async () => {
    svc.buatPengguna.mockResolvedValue({
      pengguna: u("n1", "Staf Baru", "keuangan"),
      password_sementara: "PmSementara7",
    });
    tampil();
    fireEvent.click(
      await screen.findByRole("button", { name: /Tambah Pengguna/ }),
    );
    const simpan = await screen.findByRole("button", { name: "Tambah" });
    expect((simpan as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Nama lengkap"), {
      target: { value: "Staf Baru" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "staf@contoh.id" },
    });
    fireEvent.change(screen.getByLabelText("Nomor HP"), {
      target: { value: "081234567890" },
    });
    fireEvent.change(screen.getByLabelText("Peran"), {
      target: { value: "keuangan" },
    });
    expect((simpan as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(simpan);
    await waitFor(() =>
      expect(svc.buatPengguna).toHaveBeenCalledWith({
        email: "staf@contoh.id",
        nama_lengkap: "Staf Baru",
        no_hp: "081234567890",
        role: "keuangan",
        password: "",
      }),
    );
    expect(await screen.findByText(/PmSementara7/)).toBeTruthy();
  });

  it("menonaktifkan pengguna setelah konfirmasi; akun sendiri tanpa aksi destruktif", async () => {
    svc.aturStatusPengguna.mockResolvedValue({
      ...u("c1", "Calon Satu", "calon_mahasiswa"),
      is_active: false,
    });
    tampil();
    await screen.findByText("Calon Satu");
    expect(screen.queryByLabelText("Hapus Saya Sendiri")).toBeNull();
    expect(screen.queryByLabelText("Nonaktifkan Super Satu")).toBeNull();
    fireEvent.click(screen.getByLabelText("Nonaktifkan Calon Satu"));
    const dlg = await screen.findByRole("alertdialog");
    fireEvent.click(within(dlg).getByRole("button", { name: "Nonaktifkan" }));
    await waitFor(() =>
      expect(svc.aturStatusPengguna).toHaveBeenCalledWith("c1", false),
    );
  });

  it("menghapus pengguna setelah konfirmasi", async () => {
    svc.hapusPengguna.mockResolvedValue(undefined);
    tampil();
    await screen.findByText("Calon Dua");
    fireEvent.click(screen.getByLabelText("Hapus Calon Dua"));
    const dlg = await screen.findByRole("alertdialog");
    fireEvent.click(within(dlg).getByRole("button", { name: "Hapus" }));
    await waitFor(() => expect(svc.hapusPengguna).toHaveBeenCalledWith("c2"));
  });
});
