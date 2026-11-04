import { useEffect, useRef, useState, useCallback } from "react";

export type JenisPelanggaran =
  | "TAB_PINDAH"
  | "WINDOW_BLUR"
  | "FULLSCREEN_KELUAR"
  | "COPY"
  | "PASTE"
  | "CUT"
  | "KLIK_KANAN"
  | "DEVTOOLS"
  | "CETAK"
  | "SHORTCUT";

interface Options {
  aktif: boolean;
  onPelanggaran: (jenis: JenisPelanggaran, detail?: string) => void;
}

const DEBOUNCE_MS = 1500;

/**
 * Pengawasan sisi klien selama ujian CBT. Klien hanya MELAPORKAN;
 * keputusan (hitung pelanggaran & auto-submit) tetap ada di server.
 */
export function useCbtAntiCheat({ aktif, onPelanggaran }: Options) {
  const lastRef = useRef<Record<string, number>>({});
  const cbRef = useRef(onPelanggaran);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    !!document.fullscreenElement,
  );

  useEffect(() => {
    cbRef.current = onPelanggaran;
  }, [onPelanggaran]);

  const lapor = useCallback((jenis: JenisPelanggaran, detail?: string) => {
    const now = Date.now();
    const last = lastRef.current[jenis] ?? 0;
    // blur + visibilitychange terpicu bersamaan: jangan dihitung ganda
    const kelompok = jenis === "WINDOW_BLUR" ? "TAB_PINDAH" : jenis;
    const lastKel = lastRef.current[kelompok] ?? 0;
    if (now - last < DEBOUNCE_MS || now - lastKel < DEBOUNCE_MS) return;
    lastRef.current[jenis] = now;
    lastRef.current[kelompok] = now;
    cbRef.current(jenis, detail);
  }, []);

  const masukFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser menolak (butuh gesture pengguna); tombol manual tersedia
    }
  }, []);

  useEffect(() => {
    if (!aktif) return;

    const onVisibility = () => {
      if (document.hidden) lapor("TAB_PINDAH", "Tab/jendela disembunyikan");
    };
    const onBlur = () => lapor("WINDOW_BLUR", "Fokus jendela hilang");
    const onFullscreen = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) lapor("FULLSCREEN_KELUAR", "Keluar dari layar penuh");
    };
    const block = (jenis: JenisPelanggaran) => (e: Event) => {
      e.preventDefault();
      lapor(jenis);
    };
    const onCopy = block("COPY");
    const onCut = block("CUT");
    const onPaste = block("PASTE");
    const onContext = block("KLIK_KANAN");
    const onDrag = (e: Event) => e.preventDefault();
    const onSelect = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA"].includes(t.tagName)) return;
      e.preventDefault();
    };
    const onBeforePrint = () => lapor("CETAK", "Percobaan mencetak halaman");
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const devtools =
        k === "f12" ||
        (ctrl && e.shiftKey && ["i", "j", "c", "k"].includes(k)) ||
        (ctrl && k === "u");
      if (devtools) {
        e.preventDefault();
        lapor("DEVTOOLS", "Percobaan membuka developer tools / lihat sumber");
        return;
      }
      if (k === "printscreen") {
        e.preventDefault();
        void navigator.clipboard?.writeText("").catch(() => undefined);
        lapor("SHORTCUT", "PrintScreen");
        return;
      }
      if (ctrl && ["p", "s", "a", "f"].includes(k)) {
        e.preventDefault();
        lapor(k === "p" ? "CETAK" : "SHORTCUT", `Ctrl+${k.toUpperCase()}`);
        return;
      }
      if (e.altKey && (k === "tab" || k === "arrowleft" || k === "arrowright")) {
        e.preventDefault();
        lapor("SHORTCUT", `Alt+${k}`);
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    // Deteksi devtools terdock lewat selisih ukuran jendela
    const devtoolsTimer = window.setInterval(() => {
      const lebar = window.outerWidth - window.innerWidth > 200;
      const tinggi = window.outerHeight - window.innerHeight > 200;
      if ((lebar || tinggi) && !document.fullscreenElement) {
        lapor("DEVTOOLS", "Dimensi jendela mencurigakan");
      }
    }, 3000);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("dragstart", onDrag);
    document.addEventListener("selectstart", onSelect);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.clearInterval(devtoolsTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("dragstart", onDrag);
      document.removeEventListener("selectstart", onSelect);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [aktif, lapor]);

  // Keluar dari fullscreen otomatis saat ujian berakhir
  useEffect(() => {
    if (!aktif && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, [aktif]);

  return { isFullscreen, masukFullscreen };
}
