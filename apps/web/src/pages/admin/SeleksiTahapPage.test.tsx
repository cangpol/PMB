import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { SeleksiTahapPage, kuotaPenuh, teksKuota } from "./SeleksiTahapPage";

const antreanMock = vi.hoisted(() => ({
  data: undefined as unknown,
}));
vi.mock("@/hooks/useAntreanVerifikasi", () => ({
  KUNCI_ANTREAN: ["antrean-verifikasi"],
  useAntreanVerifikasi: () => ({ data: antreanMock.data }),
}));

const fetchApi = vi.fn();
vi.mock("@/services/api", () => ({
  fetchApi: (...a: unknown[]) => fetchApi(...a),
}));
vi.mock("@/components/ui/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const kuota = [
  {
    jalur_id: "early",
    kode_jalur: "READY-EARLY",
    nama_jalur: "READY Early",
    kuota_maksimal: 70,
    terisi: 70,
    menunggu_pindah: 1,
  },
  {
    jalur_id: "adm",
    kode_jalur: "READY-ADMISSION",
    nama_jalur: "READY Admission",
    kuota_maksimal: null,
    terisi: 4,
    menunggu_pindah: 0,
  },
];

function render_(url = "/admin/seleksi-tahap") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[url]}>
      <QueryClientProvider client={qc}>
        <SeleksiTahapPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  antreanMock.data = undefined;
  fetchApi.mockReset();
  fetchApi.mockImplementation((url: string, opt?: { method?: string }) => {
    if (url.includes("/seleksi?tahap=RAPOR")) return Promise.resolve([]);
    if (url.endsWith("/kuota-jalur")) return Promise.resolve(kuota);
    if (url.endsWith("/pindah-jalur") && !opt?.method)
      return Promise.resolve([
        {
          pendaftar_id: "p1",
          nomor_pendaftaran: "270001-3132",
          nama_lengkap: "Budi",
          jalur_id: "early",
          nama_jalur: "READY Early",
        },
      ]);
    if (url.endsWith("/notifikasi"))
      return Promise.resolve([
        {
          id: "n1",
          judul: "Kuota READY Early penuh",
          pesan: "Budi perlu dipindahkan",
          sudah_dibaca: false,
          created_at: "2026-11-09T00:00:00Z",
        },
      ]);
    return Promise.resolve({ ok: true });
  });
});

describe("kuota", () => {
  it("teks dan status penuh", () => {
    expect(teksKuota(kuota[0])).toBe("70 dari 70 terisi");
    expect(teksKuota(kuota[1])).toBe("4 terisi · tanpa batas");
    expect(kuotaPenuh(kuota[0])).toBe(true);
    expect(kuotaPenuh(kuota[1])).toBe(false);
  });
});

describe("SeleksiTahapPage", () => {
  it("memindahkan calon ke jalur yang kuotanya masih ada", async () => {
    render_();
    fireEvent.click(screen.getByRole("tab", { name: "Kuota & Pindah Jalur" }));
    expect(await screen.findByText("Kuota READY Early penuh")).toBeTruthy();

    const pilih = await screen.findByLabelText("Jalur tujuan Budi");
    // jalur semula & jalur penuh tidak jadi pilihan
    const opsi = Array.from((pilih as HTMLSelectElement).options).map(
      (o) => o.text,
    );
    expect(opsi).toEqual(["Pilih jalur…", "READY Admission"]);

    const tombol = screen.getByRole("button", { name: "Pindahkan" });
    expect((tombol as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(pilih, { target: { value: "adm" } });
    fireEvent.click(tombol);

    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith(
        "/api/pendaftaran/admin/pindah-jalur/p1",
        { method: "POST", body: JSON.stringify({ jalur_id: "adm" }) },
      ),
    );
  });

  it("tab rapor menampilkan keadaan kosong", async () => {
    render_();
    expect(
      await screen.findByText("Belum ada calon untuk seleksi rapor & berkas"),
    ).toBeTruthy();
  });

  it("memberi tahu admin ada calon yang perlu seleksi rapor dan interview", async () => {
    const item = (n: number) => ({
      menunggu: n,
      calon: n,
      terlama_sejak: null,
    });
    antreanMock.data = { seleksi_rapor: item(3), seleksi_interview: item(2) };
    render_();
    const peringatan = await screen.findByRole("alert");
    expect(peringatan.textContent).toContain("3 calon menunggu seleksi rapor");
    expect(peringatan.textContent).toContain(
      "2 calon menunggu seleksi interview",
    );
    expect(
      screen.getByRole("tab", { name: /Seleksi Rapor & Berkas\s*3/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: /Seleksi Interview\s*2/ }),
    ).toBeTruthy();
  });

  it("tanpa antrean tidak ada peringatan, dan ?tab=INTERVIEW membuka tab interview", async () => {
    fetchApi.mockImplementation((url: string) =>
      Promise.resolve(url.includes("tahap=INTERVIEW") ? [] : []),
    );
    render_("/admin/seleksi-tahap?tab=INTERVIEW");
    expect(
      await screen.findByText("Belum ada calon untuk interview"),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  const calon = {
    pendaftar_id: "p1",
    nomor_pendaftaran: "260002-4331",
    nama_lengkap: "Sari",
    nama_jalur: "READY Early",
    status_pendaftaran: "BERKAS_VERIFIED",
    nilai_rapor_avg: 82.5,
    status_seleksi_rapor: "MENUNGGU",
    nilai_seleksi_rapor: null,
    catatan_seleksi_rapor: null,
    skor_cbt: 77.25,
    status_seleksi_interview: "MENUNGGU",
    nilai_seleksi_interview: null,
    catatan_seleksi_interview: null,
    berkas: [{ id: "b1", jenis_berkas: "RAPOR_X_XI", file_name: "rapor.pdf" }],
    kode_jalur: "READY-ADMISSION",
    alur_seleksi: "PENUH",
    rapor_minimal: null,
    potongan_tetap: null,
    potongan_maks: null,
    kriteria_seleksi: "Seleksi rapor, CBT online, lalu wawancara.",
    benefit_tambahan: null,
    potongan_persen: 0,
    tingkat_prestasi: null,
    jumlah_follower: null,
    cbt_dilewati: false,
    prodi_pilihan_1_nama: "Informatika",
    prodi_pilihan_2_nama: "Sistem Informasi",
    pilihan_ke_diterima: null,
  };

  it("seleksi rapor: menampilkan rata-rata rapor, admin dapat menyesuaikan lalu meluluskan", async () => {
    fetchApi.mockImplementation((url: string, opt?: { method?: string }) =>
      Promise.resolve(
        url.includes("tahap=RAPOR") ? [calon] : opt?.method ? { ok: true } : [],
      ),
    );
    render_();
    const input = (await screen.findByLabelText(
      "Rata-rata rapor Sari",
    )) as HTMLInputElement;
    expect(input.value).toBe("82.5");
    expect(screen.getByText("Rapor x xi")).toBeTruthy();

    // tidak sesuai dengan berkas: admin menyesuaikan angkanya
    fireEvent.change(input, { target: { value: "85,5" } });
    fireEvent.click(screen.getByRole("button", { name: /Setujui, Lulus/ }));
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith(
        "/api/pendaftaran/admin/seleksi/p1/RAPOR",
        {
          method: "PUT",
          body: JSON.stringify({ hasil: "LULUS", nilai: 85.5 }),
        },
      ),
    );
  });

  it("seleksi interview: menampilkan skor rapor & CBT, admin mengisi nilai dan menentukan pilihan program", async () => {
    fetchApi.mockImplementation((url: string, opt?: { method?: string }) =>
      Promise.resolve(
        url.includes("tahap=INTERVIEW")
          ? [{ ...calon, status_pendaftaran: "MENUNGGU_PENGUMUMAN" }]
          : opt?.method
            ? { ok: true }
            : [],
      ),
    );
    render_("/admin/seleksi-tahap?tab=INTERVIEW");
    await screen.findByLabelText("Nilai interview Sari");
    expect(screen.getByText("82.5")).toBeTruthy(); // skor rapor
    expect(screen.getByText("77.3")).toBeTruthy(); // skor CBT

    const lulus = screen.getByRole("button", { name: "Lulus" });
    expect((lulus as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Nilai interview Sari"), {
      target: { value: "88" },
    });
    // nilai saja belum cukup: penempatan harus ditentukan
    expect((lulus as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Penempatan Sari"), {
      target: { value: "2" },
    });
    expect((lulus as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(lulus);

    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith(
        "/api/pendaftaran/admin/seleksi/p1/INTERVIEW",
        {
          method: "PUT",
          body: JSON.stringify({ hasil: "LULUS", nilai: 88, pilihan_ke: 2 }),
        },
      ),
    );
  });

  it("READY Early: rapor di bawah 80 ditolak, lulus meluluskan CBT & wawancara dengan penempatan", async () => {
    const early = {
      ...calon,
      nama_jalur: "READY Early",
      kode_jalur: "READY-EARLY",
      alur_seleksi: "LANGSUNG_LULUS",
      rapor_minimal: 80,
      potongan_tetap: 100,
      nilai_rapor_avg: 79,
    };
    fetchApi.mockImplementation((url: string, opt?: { method?: string }) =>
      Promise.resolve(
        url.includes("tahap=RAPOR") ? [early] : opt?.method ? { ok: true } : [],
      ),
    );
    render_();
    const input = await screen.findByLabelText("Rata-rata rapor Sari");
    const tombol = screen.getByRole("button", { name: /Setujui, Lulus/ });
    expect((tombol as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Rata-rata rapor minimal 80/)).toBeTruthy();

    // admin menyesuaikan sesuai berkas
    fireEvent.change(input, { target: { value: "82" } });
    expect(screen.getByText("Potongan DPP & SKS: 100%")).toBeTruthy();
    // penempatan harus ditentukan karena CBT & wawancara ikut dinyatakan lulus
    expect((tombol as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Penempatan Sari"), {
      target: { value: "1" },
    });
    fireEvent.click(tombol);
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith(
        "/api/pendaftaran/admin/seleksi/p1/RAPOR",
        {
          method: "PUT",
          body: JSON.stringify({ hasil: "LULUS", nilai: 82, pilihan_ke: 1 }),
        },
      ),
    );
  });

  it("READY Achievement: potongan mengikuti rapor atau sertifikat yang terbesar", async () => {
    const ach = {
      ...calon,
      nama_jalur: "READY Achievement",
      kode_jalur: "READY-ACHIEVEMENT",
      alur_seleksi: "LANGSUNG_LULUS",
      nilai_rapor_avg: 80,
    };
    fetchApi.mockImplementation((url: string) =>
      Promise.resolve(url.includes("tahap=RAPOR") ? [ach] : []),
    );
    render_();
    await screen.findByLabelText("Rata-rata rapor Sari");
    expect(screen.getByText("Potongan DPP & SKS: 50%")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tingkat prestasi Sari"), {
      target: { value: "NASIONAL" },
    });
    expect(screen.getByText("Potongan DPP & SKS: 75%")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tingkat prestasi Sari"), {
      target: { value: "INTERNASIONAL" },
    });
    expect(screen.getByText("Potongan DPP & SKS: 100%")).toBeTruthy();
  });

  it("READY Creator: follower minimal 10K memberi potongan 50% dan hanya melewati CBT", async () => {
    const cr = {
      ...calon,
      nama_jalur: "READY Creator",
      kode_jalur: "READY-CREATOR",
      alur_seleksi: "TANPA_CBT",
      potongan_tetap: 50,
    };
    fetchApi.mockImplementation((url: string, opt?: { method?: string }) =>
      Promise.resolve(
        url.includes("tahap=RAPOR") ? [cr] : opt?.method ? { ok: true } : [],
      ),
    );
    render_();
    const f = await screen.findByLabelText("Jumlah follower Sari");
    expect(screen.queryByLabelText("Rata-rata rapor Sari")).toBeNull();
    expect(screen.getByText("Potongan DPP & SKS: 0%")).toBeTruthy();
    fireEvent.change(f, { target: { value: "12000" } });
    expect(screen.getByText("Potongan DPP & SKS: 50%")).toBeTruthy();
    expect(screen.getByText(/CBT dilewati \(lulus\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Setujui, Lulus/ }));
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith(
        "/api/pendaftaran/admin/seleksi/p1/RAPOR",
        {
          method: "PUT",
          body: JSON.stringify({
            hasil: "LULUS",
            nilai: null,
            jumlah_follower: 12000,
          }),
        },
      ),
    );
  });
});
