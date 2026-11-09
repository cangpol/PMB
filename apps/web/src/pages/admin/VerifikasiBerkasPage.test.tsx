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
import { ToastProvider } from "@/components/ui/Toast";
import { DialogProvider } from "@/components/ui/DialogProvider";
import { VerifikasiBerkasPage } from "./VerifikasiBerkasPage";

const fetchApi = vi.fn();
vi.mock("@/services/api", () => ({
  fetchApi: (...a: unknown[]) => fetchApi(...a),
}));
vi.mock("@/hooks/useAntreanVerifikasi", async (asli) => ({
  ...(await asli<typeof import("@/hooks/useAntreanVerifikasi")>()),
  useAntreanVerifikasi: () => ({
    data: {
      berkas: { menunggu: 5, calon: 2, terlama_sejak: null },
      bukti_bayar: { menunggu: 0, calon: 0, terlama_sejak: null },
      daftar_ulang: { menunggu: 0, calon: 0, terlama_sejak: null },
      cbt_keputusan: { menunggu: 0, calon: 0, terlama_sejak: null },
      seleksi_rapor: { menunggu: 0, calon: 0, terlama_sejak: null },
      seleksi_interview: { menunggu: 0, calon: 0, terlama_sejak: null },
      total: 5,
    },
  }),
}));

const calon = (id: string, nama: string, menunggu: number, valid = 0) => ({
  pendaftar_id: id,
  nomor_pendaftaran: `PMB-2026-${id}`,
  nama_lengkap: nama,
  email: `${id}@contoh.id`,
  nama_jalur: "Jalur CBT",
  nama_prodi: "Informatika",
  status_pendaftaran: "MENUNGGU_VERIFIKASI_BERKAS",
  total: menunggu + valid,
  menunggu,
  valid,
  ditolak: 0,
  menunggu_sejak: menunggu
    ? new Date(Date.now() - 3600_000).toISOString()
    : null,
  terakhir_unggah: new Date().toISOString(),
});

const berkas = (
  id: string,
  pid: string,
  kode: string,
  status: string,
  jam: number,
) => ({
  id,
  pendaftar_id: pid,
  nomor_pendaftaran: `PMB-2026-${pid}`,
  nama_lengkap: "Budi Santoso",
  email: "b@contoh.id",
  nama_jalur: "Jalur CBT",
  kode_berkas: kode,
  nama_berkas: kode === "RAPOR" ? "Rapor" : "Pas Foto",
  wajib: true,
  file_key: `k/${id}`,
  file_name: `${id}.pdf`,
  mime_type: "application/pdf",
  file_size_bytes: 2048,
  status_verifikasi: status,
  uploaded_at: new Date(Date.now() - jam * 3600_000).toISOString(),
});

const LIST = [calon("a1", "Budi Santoso", 3), calon("b2", "Citra Lestari", 2)];

const jawab = (hasilSahkan?: unknown) =>
  fetchApi.mockImplementation(
    async (url: string, opt?: { method?: string }) => {
      if (url.includes("/berkas-per-calon")) return LIST;
      if (url.includes("/berkas-list"))
        return [
          berkas("r-lama", "a1", "RAPOR", "PENDING", 10), // sudah diganti unggahan baru
          berkas("r-baru", "a1", "RAPOR", "PENDING", 1),
          berkas("f1", "a1", "FOTO", "VALID", 2),
        ];
      if (url.includes("verifikasi-berkas-semua") && opt?.method === "POST")
        return hasilSahkan;
      return undefined;
    },
  );

const renderHalaman = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <DialogProvider>
          <VerifikasiBerkasPage />
        </DialogProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );

describe("VerifikasiBerkasPage: berkas per calon", () => {
  beforeEach(() => {
    fetchApi.mockReset();
  });

  it("mengelompokkan berkas per calon dengan ringkasan jumlahnya", async () => {
    jawab();
    renderHalaman();
    expect(await screen.findByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("Citra Lestari")).toBeInTheDocument();
    expect(screen.getByText("3 perlu diperiksa")).toBeInTheDocument();
    expect(screen.getByText("2 perlu diperiksa")).toBeInTheDocument();
    // Dimuat dengan filter bawaan: yang perlu diperiksa
    expect(fetchApi.mock.calls[0][0]).toContain("status=PENDING");
  });

  it("detail menampilkan unggahan terbaru tiap jenis saja", async () => {
    jawab();
    renderHalaman();
    await screen.findByText("Budi Santoso");
    fireEvent.click(screen.getAllByRole("button", { name: /Detail/ })[0]);

    const panel = await screen.findByRole("dialog", {
      name: /Berkas Budi Santoso/,
    });
    await waitFor(() =>
      expect(within(panel).getByText("Rapor")).toBeInTheDocument(),
    );
    expect(within(panel).getAllByText("Rapor")).toHaveLength(1);
    expect(within(panel).getByText("Pas Foto")).toBeInTheDocument();
    expect(within(panel).getByText("r-baru.pdf")).toBeInTheDocument();
    expect(within(panel).queryByText("r-lama.pdf")).not.toBeInTheDocument();
    expect(
      fetchApi.mock.calls.some((c) => String(c[0]).includes("pendaftar_id=a1")),
    ).toBe(true);
    // 1 berkas menunggu setelah unggahan lama diabaikan
    expect(
      within(panel).getByRole("button", { name: /Sahkan Semua \(1\)/ }),
    ).toBeEnabled();
  });

  it("Sahkan Semua per calon meminta konfirmasi lalu mengirim id calon", async () => {
    jawab({
      calon_diproses: 1,
      berkas_disahkan: 3,
      hasil: [
        {
          pendaftar_id: "a1",
          nama_lengkap: "Budi Santoso",
          berkas_disahkan: 3,
          lengkap: true,
          status_pendaftaran: "BERKAS_VERIFIED",
        },
      ],
    });
    renderHalaman();
    await screen.findByText("Budi Santoso");
    fireEvent.click(screen.getAllByRole("button", { name: /Sahkan Semua/ })[0]);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Budi Santoso")).toBeInTheDocument();
    expect(within(dialog).getByText("3 berkas")).toBeInTheDocument();
    // Belum ada permintaan sahkan sebelum dikonfirmasi
    expect(
      fetchApi.mock.calls.some((c) =>
        String(c[0]).includes("verifikasi-berkas-semua"),
      ),
    ).toBe(false);

    fireEvent.click(
      within(dialog).getByRole("button", { name: /Ya, Sahkan Semua/ }),
    );
    await waitFor(() => {
      const panggilan = fetchApi.mock.calls.find((c) =>
        String(c[0]).includes("verifikasi-berkas-semua"),
      );
      expect(panggilan).toBeTruthy();
      expect(JSON.parse(panggilan![1].body)).toEqual({ pendaftar_ids: ["a1"] });
    });
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
  });

  it("memilih beberapa calon lalu mengesahkan semuanya sekaligus", async () => {
    jawab({ calon_diproses: 2, berkas_disahkan: 5, hasil: [] });
    renderHalaman();
    await screen.findByText("Budi Santoso");
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Pilih semua calon/ }),
    );
    const bilah = screen.getByRole("region", {
      name: /Aksi untuk calon terpilih/,
    });
    expect(within(bilah).getByText("2 calon")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Sahkan semua berkas terpilih/ }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("5 berkas")).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Ya, Sahkan Semua/ }),
    );
    await waitFor(() => {
      const panggilan = fetchApi.mock.calls.find((c) =>
        String(c[0]).includes("verifikasi-berkas-semua"),
      );
      expect(JSON.parse(panggilan![1].body).pendaftar_ids.sort()).toEqual([
        "a1",
        "b2",
      ]);
    });
  });

  it("membatalkan konfirmasi tidak mengirim apa pun", async () => {
    jawab();
    renderHalaman();
    await screen.findByText("Budi Santoso");
    fireEvent.click(screen.getAllByRole("button", { name: /Sahkan Semua/ })[0]);
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Batal" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      fetchApi.mock.calls.some((c) =>
        String(c[0]).includes("verifikasi-berkas-semua"),
      ),
    ).toBe(false);
  });
});
