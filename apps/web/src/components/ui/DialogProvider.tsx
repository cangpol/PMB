import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  DialogContext,
  type DialogApi,
  type NadaHasil,
  type OpsiAlasan,
  type OpsiHasil,
  type OpsiKonfirmasi,
} from "./dialogContextDef";

type Permintaan =
  | { jenis: "konfirmasi"; opsi: OpsiKonfirmasi; selesai: (v: boolean) => void }
  | { jenis: "alasan"; opsi: OpsiAlasan; selesai: (v: string | null) => void }
  | { jenis: "hasil"; opsi: OpsiHasil; selesai: () => void };

interface Gaya {
  Ikon: LucideIcon;
  lingkaran: string;
  ikon: string;
  cincin: string;
  bar: string;
}

const GAYA_HASIL: Record<NadaHasil, Gaya> = {
  sukses: {
    Ikon: CheckCircle2,
    lingkaran: "bg-emerald-50 border-emerald-200",
    ikon: "text-emerald-600",
    cincin: "rgba(16, 185, 129, 0.35)",
    bar: "bg-emerald-500",
  },
  ditolak: {
    Ikon: XCircle,
    lingkaran: "bg-rose-50 border-rose-200",
    ikon: "text-rose-600",
    cincin: "rgba(244, 63, 94, 0.30)",
    bar: "bg-rose-500",
  },
  gagal: {
    Ikon: XCircle,
    lingkaran: "bg-rose-50 border-rose-200",
    ikon: "text-rose-600",
    cincin: "rgba(244, 63, 94, 0.30)",
    bar: "bg-rose-500",
  },
  peringatan: {
    Ikon: AlertTriangle,
    lingkaran: "bg-amber-50 border-amber-200",
    ikon: "text-amber-600",
    cincin: "rgba(245, 158, 11, 0.35)",
    bar: "bg-amber-500",
  },
  info: {
    Ikon: Info,
    lingkaran: "bg-biru-50 border-biru-200",
    ikon: "text-biru-700",
    cincin: "rgba(37, 99, 235, 0.30)",
    bar: "bg-biru-600",
  },
};

const GAYA_TANYA = {
  default: {
    Ikon: HelpCircle,
    lingkaran: "bg-biru-50 border-biru-200",
    ikon: "text-biru-700",
    cincin: "rgba(37, 99, 235, 0.30)",
    tombol: "bg-biru-700 hover:bg-biru-800 border-biru-800 text-putih",
  },
  bahaya: {
    Ikon: AlertTriangle,
    lingkaran: "bg-rose-50 border-rose-200",
    ikon: "text-rose-600",
    cincin: "rgba(244, 63, 94, 0.30)",
    tombol: "bg-rose-600 hover:bg-rose-700 border-rose-700 text-putih",
  },
  sukses: {
    Ikon: CheckCircle2,
    lingkaran: "bg-emerald-50 border-emerald-200",
    ikon: "text-emerald-600",
    cincin: "rgba(16, 185, 129, 0.35)",
    tombol: "bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-putih",
  },
} as const;

const FOKUS =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const TOMBOL =
  "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold shadow-soft-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const TOMBOL_NETRAL = `${TOMBOL} border-biru-200 bg-putih text-biru-950 hover:bg-biru-50`;

interface KerangkaProps {
  labelId: string;
  deskripsiId?: string;
  role: "alertdialog" | "dialog";
  onBatal: () => void;
  children: React.ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/** Latar gelap + panel: kunci scroll, jebakan fokus Tab, Escape, kembalikan fokus. */
const Kerangka: React.FC<KerangkaProps> = ({
  labelId,
  deskripsiId,
  role,
  onBatal,
  children,
  onMouseEnter,
  onMouseLeave,
}) => {
  const panel = useRef<HTMLDivElement>(null);
  const batalRef = useRef(onBatal);
  batalRef.current = onBatal;

  useEffect(() => {
    const sebelumnya = document.activeElement as HTMLElement | null;
    const overflowLama = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Fokus: elemen bertanda data-fokus-awal, atau elemen fokus pertama
    const awal =
      panel.current?.querySelector<HTMLElement>("[data-fokus-awal]") ??
      panel.current?.querySelector<HTMLElement>(FOKUS);
    awal?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        batalRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const el = Array.from(panel.current.querySelectorAll<HTMLElement>(FOKUS));
      if (el.length === 0) return;
      const pertama = el[0];
      const terakhir = el[el.length - 1];
      if (e.shiftKey && document.activeElement === pertama) {
        e.preventDefault();
        terakhir.focus();
      } else if (!e.shiftKey && document.activeElement === terakhir) {
        e.preventDefault();
        pertama.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflowLama;
      sebelumnya?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <div
        className="pmb-fade fixed inset-0 bg-biru-950/60 backdrop-blur-xs"
        onClick={onBatal}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role={role}
        aria-modal="true"
        aria-labelledby={labelId}
        aria-describedby={deskripsiId}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="pmb-pop relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-biru-200 bg-putih text-center shadow-soft-xl"
      >
        {children}
      </div>
    </div>
  );
};

const LingkaranIkon: React.FC<{
  Ikon: LucideIcon;
  lingkaran: string;
  ikon: string;
  cincin: string;
}> = ({ Ikon, lingkaran, ikon, cincin }) => (
  <div
    className={`pmb-ring mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${lingkaran}`}
    style={{ "--pmb-ring": cincin } as React.CSSProperties}
    aria-hidden="true"
  >
    <Ikon className={`h-8 w-8 ${ikon}`} strokeWidth={2} />
  </div>
);

/* ------------------------------ Hasil ------------------------------ */

const TampilanHasil: React.FC<{
  opsi: OpsiHasil;
  selesai: () => void;
}> = ({ opsi, selesai }) => {
  const id = useId();
  const g = GAYA_HASIL[opsi.nada];
  const [jeda, setJeda] = useState(false);
  const sisa = useRef(opsi.autoTutupMs ?? 0);
  const mulai = useRef(0);
  const selesaiRef = useRef(selesai);
  selesaiRef.current = selesai;

  // Tutup otomatis; berhenti saat kursor/fokus di atas popup
  useEffect(() => {
    if (!opsi.autoTutupMs || jeda) return;
    mulai.current = Date.now();
    const t = window.setTimeout(() => selesaiRef.current(), sisa.current);
    return () => {
      window.clearTimeout(t);
      sisa.current = Math.max(0, sisa.current - (Date.now() - mulai.current));
    };
  }, [opsi.autoTutupMs, jeda]);

  return (
    <Kerangka
      labelId={`${id}-judul`}
      deskripsiId={opsi.deskripsi ? `${id}-desk` : undefined}
      role="dialog"
      onBatal={selesai}
      onMouseEnter={() => setJeda(true)}
      onMouseLeave={() => setJeda(false)}
    >
      <div className="space-y-4 px-6 pb-6 pt-8" aria-live="polite">
        <LingkaranIkon {...g} cincin={g.cincin} />
        <div className="space-y-1.5">
          <h2
            id={`${id}-judul`}
            className="font-serif text-xl font-bold text-biru-950"
          >
            {opsi.judul}
          </h2>
          {opsi.deskripsi && (
            <div
              id={`${id}-desk`}
              className="text-sm leading-relaxed text-biru-800"
            >
              {opsi.deskripsi}
            </div>
          )}
        </div>
        {opsi.rincian && opsi.rincian.length > 0 && (
          <ul className="space-y-1 rounded-xl border border-biru-100 bg-biru-50/60 p-3 text-left text-xs text-biru-900">
            {opsi.rincian.map((r) => (
              <li key={r} className="flex gap-2">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${g.bar}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words">{r}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          data-fokus-awal
          onClick={selesai}
          className={`${TOMBOL} w-full border-biru-800 bg-biru-700 text-putih hover:bg-biru-800`}
        >
          {opsi.labelTutup ?? "Mengerti"}
        </button>
      </div>
      {opsi.autoTutupMs ? (
        <div className="h-1 w-full bg-biru-100" aria-hidden="true">
          <div
            className={`pmb-bar h-full ${g.bar}`}
            style={
              {
                "--pmb-dur": `${opsi.autoTutupMs}ms`,
                animationPlayState: jeda ? "paused" : "running",
              } as React.CSSProperties
            }
          />
        </div>
      ) : null}
    </Kerangka>
  );
};

/* ----------------------------- Konfirmasi ---------------------------- */

const TampilanKonfirmasi: React.FC<{
  opsi: OpsiKonfirmasi;
  selesai: (v: boolean) => void;
}> = ({ opsi, selesai }) => {
  const id = useId();
  const g = GAYA_TANYA[opsi.nada ?? "default"];
  return (
    <Kerangka
      labelId={`${id}-judul`}
      deskripsiId={opsi.deskripsi ? `${id}-desk` : undefined}
      role="alertdialog"
      onBatal={() => selesai(false)}
    >
      <div className="space-y-4 px-6 pb-6 pt-8">
        <LingkaranIkon {...g} />
        <div className="space-y-1.5">
          <h2
            id={`${id}-judul`}
            className="font-serif text-xl font-bold text-biru-950"
          >
            {opsi.judul}
          </h2>
          {opsi.deskripsi && (
            <div
              id={`${id}-desk`}
              className="text-sm leading-relaxed text-biru-800"
            >
              {opsi.deskripsi}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => selesai(false)}
            className={TOMBOL_NETRAL}
          >
            {opsi.labelBatal ?? "Batal"}
          </button>
          <button
            type="button"
            data-fokus-awal
            onClick={() => selesai(true)}
            className={`${TOMBOL} ${g.tombol}`}
          >
            {opsi.labelYa ?? "Ya, Lanjutkan"}
          </button>
        </div>
      </div>
    </Kerangka>
  );
};

/* ------------------------------- Alasan ------------------------------ */

const TampilanAlasan: React.FC<{
  opsi: OpsiAlasan;
  selesai: (v: string | null) => void;
}> = ({ opsi, selesai }) => {
  const id = useId();
  const g = GAYA_TANYA[opsi.nada ?? "bahaya"];
  const [teks, setTeks] = useState(opsi.nilaiAwal ?? "");
  const [sudahCoba, setSudahCoba] = useState(false);
  const wajib = opsi.wajib ?? true;
  const kosong = wajib && teks.trim() === "";

  const kirim = () => {
    if (kosong) {
      setSudahCoba(true);
      return;
    }
    selesai(teks.trim());
  };

  return (
    <Kerangka
      labelId={`${id}-judul`}
      deskripsiId={opsi.deskripsi ? `${id}-desk` : undefined}
      role="alertdialog"
      onBatal={() => selesai(null)}
    >
      <div className="space-y-4 px-6 pb-6 pt-8">
        <LingkaranIkon {...g} />
        <div className="space-y-1.5">
          <h2
            id={`${id}-judul`}
            className="font-serif text-xl font-bold text-biru-950"
          >
            {opsi.judul}
          </h2>
          {opsi.deskripsi && (
            <div
              id={`${id}-desk`}
              className="text-sm leading-relaxed text-biru-800"
            >
              {opsi.deskripsi}
            </div>
          )}
        </div>
        <div className="space-y-1 text-left">
          <label
            htmlFor={`${id}-teks`}
            className="block text-xs font-semibold text-biru-900"
          >
            {opsi.label ?? "Alasan"}
            {wajib ? " *" : ""}
          </label>
          <textarea
            id={`${id}-teks`}
            data-fokus-awal
            rows={3}
            value={teks}
            maxLength={500}
            placeholder={opsi.placeholder}
            aria-invalid={sudahCoba && kosong}
            aria-describedby={sudahCoba && kosong ? `${id}-err` : undefined}
            onChange={(e) => setTeks(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") kirim();
            }}
            className={`w-full rounded-xl border bg-putih px-3 py-2 text-sm text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 ${
              sudahCoba && kosong ? "border-rose-400" : "border-biru-200"
            }`}
          />
          <div className="flex items-center justify-between text-[11px]">
            <span
              id={`${id}-err`}
              role={sudahCoba && kosong ? "alert" : undefined}
              className="font-semibold text-rose-700"
            >
              {sudahCoba && kosong ? "Alasan wajib diisi." : ""}
            </span>
            <span className="text-biru-600">{teks.length}/500</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => selesai(null)}
            className={TOMBOL_NETRAL}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={kirim}
            aria-disabled={kosong}
            className={`${TOMBOL} ${g.tombol} ${kosong ? "opacity-60" : ""}`}
          >
            {opsi.labelKirim ?? "Kirim"}
          </button>
        </div>
      </div>
    </Kerangka>
  );
};

/* ------------------------------ Penyedia ----------------------------- */

/**
 * Menyediakan popup yang rapi untuk konfirmasi, input alasan, dan hasil tindakan
 * (pengganti alert/confirm/prompt bawaan browser). Beberapa permintaan antre dan
 * ditampilkan satu per satu.
 */
export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [antre, setAntre] = useState<Permintaan[]>([]);

  const tambah = useCallback((p: Permintaan) => {
    setAntre((lama) => [...lama, p]);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      konfirmasi: (opsi) =>
        new Promise<boolean>((selesai) =>
          tambah({ jenis: "konfirmasi", opsi, selesai }),
        ),
      masukkanAlasan: (opsi) =>
        new Promise<string | null>((selesai) =>
          tambah({ jenis: "alasan", opsi, selesai }),
        ),
      hasil: (opsi) =>
        new Promise<void>((selesai) =>
          tambah({ jenis: "hasil", opsi, selesai }),
        ),
    }),
    [tambah],
  );

  const aktif = antre[0];
  const tutup = () => setAntre((lama) => lama.slice(1));

  return (
    <DialogContext.Provider value={api}>
      {children}
      {aktif?.jenis === "konfirmasi" && (
        <TampilanKonfirmasi
          key={antre.length + "k"}
          opsi={aktif.opsi}
          selesai={(v) => {
            aktif.selesai(v);
            tutup();
          }}
        />
      )}
      {aktif?.jenis === "alasan" && (
        <TampilanAlasan
          key={antre.length + "a"}
          opsi={aktif.opsi}
          selesai={(v) => {
            aktif.selesai(v);
            tutup();
          }}
        />
      )}
      {aktif?.jenis === "hasil" && (
        <TampilanHasil
          key={antre.length + "h"}
          opsi={aktif.opsi}
          selesai={() => {
            aktif.selesai();
            tutup();
          }}
        />
      )}
    </DialogContext.Provider>
  );
};
