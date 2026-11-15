import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PratinjauBuktiDialog } from "./PratinjauBuktiDialog";

const gambar = {
  url: "http://s3/bukti.png",
  namaFile: "bukti.png",
  mimeType: "image/png",
  keterangan: "Calon A · INV-1",
};

describe("PratinjauBuktiDialog", () => {
  it("tidak tampil tanpa bukti", () => {
    render(<PratinjauBuktiDialog bukti={null} onClose={vi.fn()} />);
    expect(screen.queryByText("Pratinjau Bukti Pembayaran")).toBeNull();
  });

  it("menampilkan gambar, zoom lewat klik, dan tombol unduh", () => {
    render(<PratinjauBuktiDialog bukti={gambar} onClose={vi.fn()} />);
    expect(screen.getByText("Pratinjau Bukti Pembayaran")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Unduh/ })).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    fireEvent.click(screen.getByAltText("bukti.png"));
    expect(screen.getByText("200%")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Atur ulang zoom"));
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("PDF memakai iframe tanpa kontrol zoom", () => {
    render(
      <PratinjauBuktiDialog
        bukti={{ ...gambar, namaFile: "b.pdf", mimeType: "application/pdf" }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTitle("b.pdf")).toBeTruthy();
    expect(screen.queryByLabelText("Perbesar")).toBeNull();
  });
});
