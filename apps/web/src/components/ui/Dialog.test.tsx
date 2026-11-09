import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Dialog, DialogContent } from "./Dialog";

afterEach(cleanup);

const Form = () => {
  const [nama, setNama] = useState("");
  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent>
        <input
          aria-label="Nama gelombang"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />
        <input aria-label="Kuota" />
      </DialogContent>
    </Dialog>
  );
};

describe("Dialog", () => {
  it("fokus awal ke isian pertama, bukan tombol tutup", () => {
    render(<Form />);
    expect(screen.getByLabelText("Nama gelombang")).toHaveFocus();
  });

  it("fokus tidak berpindah ke tombol X saat mengetik (Shift/CapsLock/huruf)", () => {
    render(<Form />);
    const nama = screen.getByLabelText("Nama gelombang") as HTMLInputElement;
    nama.focus();
    for (const ch of ["G", "e", "L"]) {
      fireEvent.keyDown(nama, { key: "Shift", shiftKey: true });
      fireEvent.keyDown(nama, { key: "CapsLock" });
      fireEvent.change(nama, { target: { value: nama.value + ch } }); // render ulang parent
      expect(nama).toHaveFocus();
    }
    expect(nama.value).toBe("GeL");
    expect(screen.getByLabelText("Tutup dialog")).not.toHaveFocus();
  });

  it("fokus pada isian kedua tidak ditarik kembali saat parent render ulang", () => {
    render(<Form />);
    const kuota = screen.getByLabelText("Kuota");
    kuota.focus();
    fireEvent.change(screen.getByLabelText("Nama gelombang"), {
      target: { value: "x" },
    });
    expect(kuota).toHaveFocus();
  });
});
