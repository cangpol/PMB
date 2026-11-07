import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCbtAntiCheat } from "./useCbtAntiCheat";

const atur = (lebar: number, tinggi: number) => {
  Object.defineProperty(window, "innerWidth", {
    value: lebar,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: tinggi,
    configurable: true,
  });
  Object.defineProperty(window.screen, "width", {
    value: 1440,
    configurable: true,
  });
  Object.defineProperty(window.screen, "height", {
    value: 900,
    configurable: true,
  });
};

describe("useCbtAntiCheat: gerbang layar penuh", () => {
  beforeEach(() => atur(1200, 700));

  it("menandai layar penuh bila jendela sudah memenuhi layar (F11/tombol hijau macOS)", () => {
    atur(1440, 880);
    const { result } = renderHook(() =>
      useCbtAntiCheat({ aktif: true, onPelanggaran: vi.fn() }),
    );
    expect(result.current.isFullscreen).toBe(true);
  });

  it("bila browser menolak layar penuh, peserta tidak terkunci dan bisa lanjut (tercatat)", async () => {
    const onPelanggaran = vi.fn();
    document.documentElement.requestFullscreen = vi
      .fn()
      .mockRejectedValue(new Error("ditolak"));
    const { result } = renderHook(() =>
      useCbtAntiCheat({ aktif: true, onPelanggaran }),
    );
    expect(result.current.isFullscreen).toBe(false);

    await act(async () => {
      await result.current.masukFullscreen();
    });
    expect(result.current.gagalFullscreen).toBe(true);
    expect(result.current.isFullscreen).toBe(false);

    act(() => result.current.lanjutTanpaLayarPenuh());
    await waitFor(() => expect(result.current.isFullscreen).toBe(true));
    expect(onPelanggaran).toHaveBeenCalledWith(
      "FULLSCREEN_KELUAR",
      expect.stringContaining("Lanjut tanpa layar penuh"),
    );
  });
});
