import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { Card, CardSkeleton } from "../common";
import { langkahTerbuka, useAlur } from "./AlurStepper";

/**
 * Langkah alur PMB (kode dari GET /api/pendaftaran/alur) yang membuka tiap
 * halaman portal calon. Halaman terbuka bila salah satu langkahnya tidak
 * TERKUNCI, jadi halaman langkah yang sudah selesai tetap bisa dilihat.
 */
export const LANGKAH_HALAMAN = {
  formulir: ["pilih_jalur", "formulir"],
  rpl: ["pilih_jalur", "formulir"],
  pembayaran: ["pembayaran"],
  berkas: ["berkas"],
  ujian: ["ujian"],
  hasil: ["pengumuman"],
  daftarUlang: ["bayar_daftar_ulang", "registrasi_ulang"],
} as const satisfies Record<string, readonly string[]>;

interface Props {
  langkah: readonly string[];
  /** Halaman hanya untuk calon Jalur RPL. */
  khususRpl?: boolean;
  children: React.ReactNode;
}

/**
 * Menahan halaman portal sampai langkah alurnya terbuka. Server tetap
 * menegakkan gerbang yang sama; ini mencegah calon membuka halaman lewat URL
 * langsung sebelum waktunya.
 */
export const GerbangLangkah: React.FC<Props> = ({
  langkah,
  khususRpl = false,
  children,
}) => {
  const { alur, isLoading } = useAlur();

  if (isLoading && !alur) return <CardSkeleton />;
  if (khususRpl && !alur?.jalur_rpl) {
    return (
      <Card className="max-w-2xl mx-auto p-6 sm:p-8 border-biru-200 rounded-2xl text-center space-y-4">
        <span className="mx-auto w-12 h-12 rounded-2xl bg-biru-50 border border-biru-200 text-biru-500 flex items-center justify-center">
          <Lock className="w-5 h-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <h1 className="font-serif text-xl font-bold text-biru-950">
            Khusus Jalur RPL
          </h1>
          <p className="text-sm text-biru-800">
            Portofolio & pengajuan RPL (Rekognisi Pembelajaran Lampau) hanya
            tersedia bagi calon yang mendaftar melalui Jalur RPL. Jalur
            pendaftaran Anda tidak memerlukan langkah ini.
          </p>
        </div>
        <Link
          to="/portal/dashboard"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-biru-950 text-putih text-xs font-bold hover:bg-biru-800 transition"
        >
          Kembali ke dashboard
          <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      </Card>
    );
  }
  if (langkahTerbuka(alur, langkah)) return <>{children}</>;

  const aktif = alur?.langkah.find((l) => l.kode === alur.langkah_aktif);
  const dituju = alur?.langkah.find((l) => langkah.includes(l.kode));

  return (
    <Card className="max-w-2xl mx-auto p-6 sm:p-8 border-biru-200 rounded-2xl text-center space-y-4">
      <span className="mx-auto w-12 h-12 rounded-2xl bg-biru-50 border border-biru-200 text-biru-500 flex items-center justify-center">
        <Lock className="w-5 h-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <h1 className="font-serif text-xl font-bold text-biru-950">
          {dituju ? `${dituju.nomor}. ${dituju.judul}` : "Halaman"} masih
          terkunci
        </h1>
        <p className="text-sm text-biru-800">
          Selesaikan langkah sebelumnya terlebih dahulu. Halaman ini terbuka
          otomatis begitu langkah sebelumnya selesai.
        </p>
      </div>
      {aktif && (
        <div className="p-4 rounded-xl bg-biru-50 border border-biru-200 text-left">
          <p className="text-[11px] font-bold uppercase tracking-wider text-biru-700">
            Langkah Anda sekarang: {aktif.nomor} dari 9
          </p>
          <p className="text-sm font-bold text-biru-950">{aktif.judul}</p>
          <p className="text-xs text-biru-900 mt-0.5">{aktif.pesan}</p>
        </div>
      )}
      <Link
        to={aktif?.aksi_url ?? "/portal/dashboard"}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-biru-950 text-putih text-xs font-bold hover:bg-biru-800 transition"
      >
        {aktif?.aksi_url ? "Ke langkah saya" : "Kembali ke dashboard"}
        <ArrowRight className="w-4 h-4" aria-hidden />
      </Link>
    </Card>
  );
};
