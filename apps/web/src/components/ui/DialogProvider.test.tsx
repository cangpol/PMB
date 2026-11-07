import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { DialogProvider } from "./DialogProvider";
import { useDialog } from "./useDialog";
import type { OpsiAlasan, OpsiHasil, OpsiKonfirmasi } from "./dialogContextDef";

/** Memanggil API popup dari tombol uji dan menyimpan hasilnya. */
const Uji: React.FC<{
  hasilKonfirmasi?: (v: boolean) => void;
  hasilAlasan?: (v: string | null) => void;
  hasilTutup?: () => void;
  konfirmasi?: OpsiKonfirmasi;
  alasan?: OpsiAlasan;
  tampil?: OpsiHasil;
}> = ({
  hasilKonfirmasi,
  hasilAlasan,
  hasilTutup,
  konfirmasi,
  alasan,
  tampil,
}) => {
  const d = useDialog();
  return (
    <>
      <button
        onClick={async () => {
          const v = await d.konfirmasi(konfirmasi ?? { judul: "Yakin?" });
          hasilKonfirmasi?.(v);
        }}
      >
        buka-konfirmasi
      </button>
      <button
        onClick={async () => {
          const v = await d.masukkanAlasan(alasan ?? { judul: "Alasan?" });
          hasilAlasan?.(v);
        }}
      >
        buka-alasan
      </button>
      <button
        onClick={async () => {
          await d.hasil(
            tampil ?? { nada: "sukses", judul: "Berhasil disetujui" },
          );
          hasilTutup?.();
        }}
      >
        buka-hasil
      </button>
    </>
  );
};

const pasang = (props: React.ComponentProps<typeof Uji> = {}) =>
  render(
    <DialogProvider>
      <Uji {...props} />
    </DialogProvider>,
  );

afterEach(() => {
  vi.useRealTimers();
  document.body.style.overflow = "";
});

describe("DialogProvider: konfirmasi", () => {
  it("resolve true bila dikonfirmasi dan false bila dibatalkan", async () => {
    const hasil = vi.fn();
    pasang({
      hasilKonfirmasi: hasil,
      konfirmasi: {
        judul: "Hapus data?",
        labelYa: "Ya, Hapus",
        nada: "bahaya",
      },
    });

    fireEvent.click(screen.getByText("buka-konfirmasi"));
    const dialog = await screen.findByRole("alertdialog", {
      name: "Hapus data?",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    fireEvent.click(screen.getByRole("button", { name: "Ya, Hapus" }));
    await waitFor(() => expect(hasil).toHaveBeenLastCalledWith(true));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("buka-konfirmasi"));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    await waitFor(() => expect(hasil).toHaveBeenLastCalledWith(false));
  });

  it("Escape dan klik latar membatalkan", async () => {
    const hasil = vi.fn();
    pasang({ hasilKonfirmasi: hasil });
    fireEvent.click(screen.getByText("buka-konfirmasi"));
    await screen.findByRole("alertdialog");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(hasil).toHaveBeenLastCalledWith(false));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("tombol utama mendapat fokus awal dan scroll halaman dikunci", async () => {
    pasang({ konfirmasi: { judul: "Setujui?", labelYa: "Ya, Setujui" } });
    fireEvent.click(screen.getByText("buka-konfirmasi"));
    const ya = await screen.findByRole("button", { name: "Ya, Setujui" });
    expect(ya).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
  });

  it("Tab tetap berputar di dalam popup", async () => {
    pasang();
    fireEvent.click(screen.getByText("buka-konfirmasi"));
    const ya = await screen.findByRole("button", { name: "Ya, Lanjutkan" });
    const batal = screen.getByRole("button", { name: "Batal" });
    ya.focus();
    fireEvent.keyDown(ya, { key: "Tab" }); // terakhir -> kembali ke pertama
    expect(batal).toHaveFocus();
    fireEvent.keyDown(batal, { key: "Tab", shiftKey: true }); // pertama -> terakhir
    expect(ya).toHaveFocus();
  });
});

describe("DialogProvider: alasan", () => {
  it("alasan wajib diisi: kosong ditolak dengan pesan, terisi dikirim tanpa spasi tepi", async () => {
    const hasil = vi.fn();
    pasang({
      hasilAlasan: hasil,
      alasan: { judul: "Tolak berkas?", labelKirim: "Tolak" },
    });
    fireEvent.click(screen.getByText("buka-alasan"));
    await screen.findByRole("alertdialog", { name: "Tolak berkas?" });

    fireEvent.click(screen.getByRole("button", { name: "Tolak" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Alasan wajib diisi.",
    );
    expect(hasil).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "  Foto buram  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tolak" }));
    await waitFor(() => expect(hasil).toHaveBeenCalledWith("Foto buram"));
  });

  it("dibatalkan menghasilkan null; textarea mendapat fokus awal", async () => {
    const hasil = vi.fn();
    pasang({ hasilAlasan: hasil });
    fireEvent.click(screen.getByText("buka-alasan"));
    expect(await screen.findByRole("textbox")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    await waitFor(() => expect(hasil).toHaveBeenCalledWith(null));
  });

  it("alasan boleh kosong bila wajib=false", async () => {
    const hasil = vi.fn();
    pasang({ hasilAlasan: hasil, alasan: { judul: "Catatan?", wajib: false } });
    fireEvent.click(screen.getByText("buka-alasan"));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));
    await waitFor(() => expect(hasil).toHaveBeenCalledWith(""));
  });
});

describe("DialogProvider: hasil", () => {
  it("menampilkan judul, deskripsi, dan rincian lalu menutup lewat tombol", async () => {
    const tutup = vi.fn();
    pasang({
      hasilTutup: tutup,
      tampil: {
        nada: "ditolak",
        judul: "Berkas ditolak",
        deskripsi: "Dikembalikan ke calon.",
        rincian: ["Alasan: foto buram"],
        labelTutup: "Oke",
      },
    });
    fireEvent.click(screen.getByText("buka-hasil"));
    const dialog = await screen.findByRole("dialog", {
      name: "Berkas ditolak",
    });
    expect(dialog).toHaveTextContent("Dikembalikan ke calon.");
    expect(dialog).toHaveTextContent("Alasan: foto buram");
    fireEvent.click(screen.getByRole("button", { name: "Oke" }));
    await waitFor(() => expect(tutup).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("tutup otomatis setelah waktunya", async () => {
    vi.useFakeTimers();
    const tutup = vi.fn();
    pasang({
      hasilTutup: tutup,
      tampil: { nada: "sukses", judul: "Disetujui", autoTutupMs: 2000 },
    });
    fireEvent.click(screen.getByText("buka-hasil"));
    expect(
      screen.getByRole("dialog", { name: "Disetujui" }),
    ).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1900);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(tutup).toHaveBeenCalledTimes(1);
  });

  it("tidak menutup otomatis selama kursor berada di atas popup", async () => {
    vi.useFakeTimers();
    pasang({
      tampil: { nada: "sukses", judul: "Disetujui", autoTutupMs: 1000 },
    });
    fireEvent.click(screen.getByText("buka-hasil"));
    const dialog = screen.getByRole("dialog");
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.mouseEnter(dialog);
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.mouseLeave(dialog);
    await act(async () => {
      vi.advanceTimersByTime(500); // sisa ~400 ms
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("DialogProvider: antrean", () => {
  it("beberapa popup ditampilkan satu per satu sesuai urutan", async () => {
    pasang();
    fireEvent.click(screen.getByText("buka-hasil"));
    fireEvent.click(screen.getByText("buka-konfirmasi"));
    // yang pertama dibuka: hasil
    expect(
      await screen.findByRole("dialog", { name: "Berhasil disetujui" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mengerti" }));
    expect(
      await screen.findByRole("alertdialog", { name: "Yakin?" }),
    ).toBeInTheDocument();
  });
});
