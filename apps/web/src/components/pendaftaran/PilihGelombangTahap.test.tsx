import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PilihGelombangTahap } from "./PilihGelombangTahap";
import type { GelombangBertahap } from "../../lib/gelombangTahap";

afterEach(cleanup);

const DAFTAR: GelombangBertahap[] = [
  {
    id: "g1",
    nama_gelombang: "Gelombang 1",
    tahap: [
      {
        id: "t1",
        nomor_tahap: 1,
        nama: "Tahap 1",
        tgl_mulai: "2026-10-31",
        tgl_selesai: "2026-11-05",
        status: "BERAKHIR",
      },
      {
        id: "t2",
        nomor_tahap: 2,
        nama: "Tahap 2",
        tgl_mulai: "2026-11-06",
        tgl_selesai: "2027-01-05",
        status: "DIBUKA",
      },
    ],
  },
];

describe("PilihGelombangTahap", () => {
  it("tahap yang sudah lewat tetap tampil tetapi dinonaktifkan; tahap 2 bisa dipilih", () => {
    const onChange = vi.fn();
    render(
      <PilihGelombangTahap
        daftar={DAFTAR}
        gelombangId="g1"
        tahapId="t2"
        onChange={onChange}
      />,
    );
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios).toHaveLength(2); // tahap 1 tidak hilang
    expect(screen.getByText("Gelombang 1 — Tahap 1")).toBeInTheDocument();
    expect(screen.getByText("Ditutup")).toBeInTheDocument();
    expect(radios[0]).toBeDisabled();
    expect(radios[1]).not.toBeDisabled();
    expect(radios[1]).toBeChecked();
    expect(
      screen.getByText(/Pendaftaran dilanjutkan pada tahap berikutnya/),
    ).toBeInTheDocument();

    fireEvent.click(radios[0]); // klik tahap yang ditutup tidak berpengaruh
    expect(onChange).not.toHaveBeenCalled();
  });

  it("memilih tahap yang dibuka memanggil onChange dengan gelombang & tahap", () => {
    const onChange = vi.fn();
    render(
      <PilihGelombangTahap
        daftar={DAFTAR}
        gelombangId="g1"
        tahapId=""
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(onChange).toHaveBeenCalledWith("g1", "t2");
  });

  it("gelombang tanpa tahap tampil sebagai satu pilihan biasa", () => {
    const onChange = vi.fn();
    render(
      <PilihGelombangTahap
        daftar={[{ id: "g0", nama_gelombang: "Gelombang Khusus" }]}
        gelombangId=""
        tahapId=""
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("radio"));
    expect(onChange).toHaveBeenCalledWith("g0", "");
  });

  it("gelombang tanpa tahap yang belum mulai / sudah selesai tidak dapat dipilih", () => {
    const onChange = vi.fn();
    const hariIni = Date.now();
    const iso = (hari: number) =>
      new Date(hariIni + hari * 86_400_000).toISOString();
    render(
      <PilihGelombangTahap
        daftar={[
          {
            id: "g1",
            nama_gelombang: "Gelombang 1",
            tgl_mulai: iso(-10),
            tgl_selesai: iso(10),
          },
          {
            id: "g2",
            nama_gelombang: "Gelombang 2",
            tgl_mulai: iso(11),
            tgl_selesai: iso(40),
          },
          {
            id: "g3",
            nama_gelombang: "Gelombang 3",
            tgl_mulai: iso(-60),
            tgl_selesai: iso(-30),
          },
        ]}
        gelombangId="g1"
        tahapId=""
        onChange={onChange}
      />,
    );
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3); // ketiga gelombang tetap tampil
    expect(radios[0]).not.toBeDisabled();
    expect(radios[1]).toBeDisabled();
    expect(radios[2]).toBeDisabled();
    expect(screen.getByText("Segera dibuka")).toBeInTheDocument();
    fireEvent.click(radios[1]);
    expect(onChange).not.toHaveBeenCalled();
  });
});
