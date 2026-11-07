import React from "react";
import { Logo } from "../ui/Logo";

export interface DataKartu {
  nim: string;
  nama: string;
  prodi: string;
  fakultas: string;
  nomorPendaftaran: string;
  tahunMasuk?: string;
}

/**
 * Kartu Tanda Mahasiswa Sementara (KTMS) berukuran kartu ID (rasio 85,6 x 54 mm):
 * sisi depan berisi identitas, sisi belakang berisi QR verifikasi dan ketentuan.
 * Seluruh kartu ber-kelas `area-cetak kartu-mahasiswa` agar tercetak sebagai kartu saja.
 */
export const KartuMahasiswa: React.FC<DataKartu> = ({
  nim,
  nama,
  prodi,
  fakultas,
  nomorPendaftaran,
  tahunMasuk = "2026/2027",
}) => {
  const inisial = nama.trim().charAt(0).toUpperCase() || "M";
  return (
    <div className="area-cetak kartu-mahasiswa grid w-full max-w-[860px] gap-5 sm:grid-cols-2 print:grid-cols-1">
      {/* Sisi depan */}
      <section
        aria-label="Kartu mahasiswa sisi depan"
        className="relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-biru-950 via-biru-900 to-biru-800 p-4 text-putih shadow-xl ring-1 ring-biru-700 print:shadow-none"
      >
        <img
          src="/logo.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-6 -bottom-8 w-44 opacity-[0.07]"
        />
        <div className="absolute inset-x-0 top-0 h-1 bg-amber-400" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between">
            <Logo theme="dark" height={30} />
            <span className="rounded-full border border-amber-300/60 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-amber-300">
              KTM Sementara
            </span>
          </div>

          <div className="mt-3 flex flex-1 gap-3">
            <div className="flex h-[70px] w-[54px] shrink-0 items-center justify-center rounded-md border border-biru-600 bg-biru-800/70 font-serif text-2xl font-bold text-biru-200">
              {inisial}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate text-[11px] font-bold uppercase leading-tight tracking-wide">
                {nama}
              </p>
              <p className="text-[8px] uppercase tracking-widest text-biru-300">
                NIM
              </p>
              <p className="font-mono text-xl font-extrabold leading-none tracking-wider text-amber-300">
                {nim}
              </p>
              <p className="truncate pt-1 text-[10px] font-semibold leading-tight">
                {prodi}
              </p>
              <p className="truncate text-[9px] leading-tight text-biru-200">
                {fakultas}
              </p>
            </div>
          </div>

          <div className="mt-1 flex items-end justify-between border-t border-biru-700 pt-1.5 text-[8px] text-biru-300">
            <span>Angkatan {tahunMasuk}</span>
            <span className="font-mono">{nomorPendaftaran}</span>
          </div>
        </div>
      </section>

      {/* Sisi belakang */}
      <section
        aria-label="Kartu mahasiswa sisi belakang"
        className="relative flex aspect-[1.586/1] w-full flex-col overflow-hidden rounded-2xl border border-biru-200 bg-putih p-4 text-biru-950 shadow-xl print:shadow-none"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-biru-950" />
        <div className="mt-1 flex flex-1 items-center gap-3">
          <img
            src="/api/kelulusan/verifikasi-qr"
            alt="QR Code verifikasi kartu"
            className="h-[74px] w-[74px] shrink-0 rounded-md border border-biru-200 p-0.5"
          />
          <ul className="space-y-1 text-[8.5px] leading-snug text-biru-800">
            <li>
              Kartu ini sah sebagai identitas mahasiswa baru sampai KTM permanen
              diterbitkan.
            </li>
            <li>
              Wajib dibawa pada kegiatan orientasi dan registrasi akademik.
            </li>
            <li>
              Jika ditemukan, mohon kembalikan ke kampus Universitas Pignatelli
              Triputra.
            </li>
          </ul>
        </div>
        <div className="flex items-center justify-between border-t border-biru-100 pt-1.5">
          <Logo height={22} />
          <span className="text-[8px] text-biru-700">
            Jl. Bawean No. 9, Serengan, Surakarta
          </span>
        </div>
      </section>
    </div>
  );
};
