import React from "react";
import { Link } from "react-router-dom";
import { BellRing, ArrowRight } from "lucide-react";
import {
  useAntreanVerifikasi,
  type JenisAntrean,
} from "@/hooks/useAntreanVerifikasi";
import { LencanaAntrean } from "./LencanaAntrean";

const BARIS: {
  kunci: JenisAntrean;
  judul: string;
  tujuan: string;
  satuan: string;
}[] = [
  {
    kunci: "berkas",
    judul: "Berkas pendaftaran",
    tujuan: "/admin/berkas",
    satuan: "berkas",
  },
  {
    kunci: "bukti_bayar",
    judul: "Bukti pembayaran",
    tujuan: "/admin/verifikasi-pembayaran",
    satuan: "bukti",
  },
  {
    kunci: "daftar_ulang",
    judul: "Berkas daftar ulang",
    tujuan: "/admin/daftar-ulang",
    satuan: "berkas",
  },
  {
    kunci: "cbt_keputusan",
    judul: "Hasil CBT di bawah passing grade",
    tujuan: "/admin/cbt/hasil",
    satuan: "hasil",
  },
];

/** "3 jam lalu" untuk waktu unggah tertua yang masih menunggu. */
export const sejak = (iso: string, sekarang = Date.now()): string => {
  const menit = Math.max(
    0,
    Math.floor((sekarang - new Date(iso).getTime()) / 60000),
  );
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return `${Math.floor(jam / 24)} hari lalu`;
};

/** Kartu "Perlu Diperiksa" di dashboard admin; tersembunyi bila tidak ada antrean. */
export const KartuAntrean: React.FC = () => {
  const { data } = useAntreanVerifikasi();
  if (!data || data.total <= 0) return null;
  const baris = BARIS.filter((b) => data[b.kunci].menunggu > 0);

  return (
    <section
      aria-label="Perlu diperiksa admin"
      className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 sm:p-5"
    >
      <div className="flex items-center gap-2 text-rose-800">
        <BellRing className="h-5 w-5" aria-hidden />
        <h2 className="font-serif text-base font-bold">
          Perlu diperiksa admin
        </h2>
        <LencanaAntrean jumlah={data.total} keterangan="menunggu diperiksa" />
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {baris.map((b) => {
          const a = data[b.kunci];
          return (
            <li key={b.kunci}>
              <Link
                to={b.tujuan}
                className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-putih px-3.5 py-3 transition hover:border-rose-400 hover:shadow-sm"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-biru-950">
                    {b.judul}
                  </span>
                  <span className="block text-[11px] text-biru-800">
                    {a.menunggu} {b.satuan} dari {a.calon} calon
                    {a.terlama_sejak
                      ? ` · tertua ${sejak(a.terlama_sejak)}`
                      : ""}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <LencanaAntrean
                    jumlah={a.menunggu}
                    keterangan={`${b.satuan} menunggu diperiksa`}
                  />
                  <ArrowRight className="h-4 w-4 text-biru-600" aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
