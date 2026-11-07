import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Lock,
  XCircle,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { fetchApi } from "@/services/api";
import type { components } from "@/types/api";

export type AlurResponse = components["schemas"]["AlurResponse"];
export type LangkahAlur = components["schemas"]["LangkahAlur"];
export type StatusLangkah = components["schemas"]["StatusLangkah"];

interface AlurState {
  alur: AlurResponse | null;
  isLoading: boolean;
  error: string | null;
  muatUlang: () => Promise<void>;
}

/** Ambil alur dari server; tidak memanggil server bila `aktif` false. */
function useAlurFetch(aktif: boolean): AlurState {
  const [alur, setAlur] = useState<AlurResponse | null>(null);
  const [isLoading, setIsLoading] = useState(aktif);
  const [error, setError] = useState<string | null>(null);

  const muat = useCallback(async () => {
    try {
      setError(null);
      setAlur(await fetchApi<AlurResponse>("/api/pendaftaran/alur"));
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setError(e.pesan || "Gagal memuat alur pendaftaran.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (aktif) muat();
  }, [aktif, muat]);

  return { alur, isLoading, error, muatUlang: muat };
}

const AlurContext = createContext<AlurState | null>(null);

/**
 * Menyediakan satu state alur PMB untuk seluruh portal calon, sehingga
 * sidebar, gerbang halaman, dan stepper selalu menampilkan status yang sama.
 */
export const AlurProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const state = useAlurFetch(true);
  return <AlurContext.Provider value={state}>{children}</AlurContext.Provider>;
};

/** State alur PMB bersama (dari AlurProvider), atau null di luar portal. */
export function useAlurContext(): AlurState | null {
  return useContext(AlurContext);
}

/**
 * Stepper alur PMB (satu sumber kebenaran dari server). Di dalam AlurProvider
 * memakai state bersama, sehingga muatUlang() ikut memperbarui sidebar.
 */
export function useAlur(): AlurState {
  const ctx = useContext(AlurContext);
  const lokal = useAlurFetch(ctx === null);
  return ctx ?? lokal;
}

/**
 * Sebuah halaman terbuka bila minimal satu langkah terkaitnya tidak TERKUNCI.
 * Langkah yang tidak dikenal server dianggap terkunci.
 */
export function langkahTerbuka(
  alur: AlurResponse | null,
  kode: readonly string[],
): boolean {
  if (!alur) return false;
  return alur.langkah.some(
    (l) => kode.includes(l.kode) && l.status !== "TERKUNCI",
  );
}

const GAYA: Record<
  StatusLangkah,
  { icon: LucideIcon; bulat: string; label: string; teks: string }
> = {
  SELESAI: {
    icon: CheckCircle2,
    bulat: "bg-biru-700 text-putih",
    label: "Selesai",
    teks: "text-biru-800",
  },
  AKTIF: {
    icon: ArrowRight,
    bulat: "bg-biru-950 text-putih ring-4 ring-biru-100",
    label: "Langkah Anda",
    teks: "text-biru-950 font-bold",
  },
  MENUNGGU_ADMIN: {
    icon: Clock,
    bulat: "bg-amber-100 text-amber-800 border border-amber-300",
    label: "Menunggu admin",
    teks: "text-amber-900",
  },
  DITOLAK: {
    icon: XCircle,
    bulat: "bg-rose-100 text-rose-700 border border-rose-300",
    label: "Perlu perbaikan",
    teks: "text-rose-800",
  },
  TERKUNCI: {
    icon: Lock,
    bulat: "bg-biru-50 text-biru-400 border border-biru-200",
    label: "Terkunci",
    teks: "text-biru-400",
  },
};

interface Props {
  alur: AlurResponse;
  /** Tampilkan versi ringkas (tanpa pesan per langkah). */
  ringkas?: boolean;
}

/**
 * Stepper 9 langkah alur PMB: buat akun, pilih jalur & prodi, formulir, bayar formulir,
 * unggah berkas, CBT, pengumuman, bayar daftar ulang, registrasi ulang.
 */
export const AlurStepper: React.FC<Props> = ({ alur, ringkas = false }) => {
  const aktif = alur.langkah.find((l) => l.kode === alur.langkah_aktif);

  return (
    <div className="space-y-4">
      <ol
        className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2"
        aria-label="Tahapan pendaftaran PMB"
      >
        {alur.langkah.map((l) => {
          const g = GAYA[l.status];
          const Icon = g.icon;
          const isi = (
            <div
              className={`h-full flex lg:flex-col items-center lg:text-center gap-3 lg:gap-2 p-3 rounded-2xl border transition ${
                l.status === "AKTIF"
                  ? "border-biru-700 bg-biru-50"
                  : "border-biru-100 bg-putih"
              } ${l.aksi_url && l.status !== "TERKUNCI" ? "hover:border-biru-400" : ""}`}
              aria-current={l.status === "AKTIF" ? "step" : undefined}
            >
              <span
                className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${g.bulat}`}
              >
                <Icon className="w-4 h-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className={`block text-xs leading-tight ${g.teks}`}>
                  {l.nomor}. {l.judul}
                </span>
                <span className="block text-[10px] text-biru-700/70 mt-0.5">
                  {g.label}
                </span>
              </span>
            </div>
          );
          return (
            <li key={l.kode}>
              {l.aksi_url && l.status !== "TERKUNCI" ? (
                <Link to={l.aksi_url} className="block h-full">
                  {isi}
                </Link>
              ) : (
                isi
              )}
            </li>
          );
        })}
      </ol>

      {!ringkas && aktif && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border ${
            aktif.status === "DITOLAK"
              ? "bg-rose-50 border-rose-200"
              : aktif.status === "MENUNGGU_ADMIN"
                ? "bg-amber-50 border-amber-200"
                : "bg-biru-50 border-biru-200"
          }`}
          role="status"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-biru-700">
              Langkah {aktif.nomor} dari 9
            </p>
            <p className="text-sm font-bold text-biru-950">{aktif.judul}</p>
            <p className="text-xs text-biru-900 mt-0.5">{aktif.pesan}</p>
          </div>
          {aktif.aksi_url && aktif.status !== "MENUNGGU_ADMIN" && (
            <Link
              to={aktif.aksi_url}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-biru-950 text-putih text-xs font-bold hover:bg-biru-800 transition shrink-0"
            >
              Lanjutkan
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          )}
        </div>
      )}

      {!ringkas && !aktif && (
        <div className="p-4 rounded-2xl bg-biru-50 border border-biru-200 text-sm text-biru-950">
          Seluruh tahapan PMB telah selesai. Selamat bergabung di Universitas
          Pignatelli Triputra!
        </div>
      )}
    </div>
  );
};
