import React from "react";
import { Logo } from "../ui/Logo";

export interface DataLoa {
  nomor_surat_loa?: string | null;
  tanggal_sk?: string | null;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  jalur_nama: string;
  jenjang_diterima?: string | null;
  prodi_diterima?: string | null;
  fakultas_diterima?: string | null;
  pilihan_ke?: number | null;
  skor_akhir: number;
  nim_resmi?: string | null;
  pendaftar_id: string;
}

/** "2026-11-07" -> "7 November 2026"; kosong/tidak valid -> tahun berjalan. */
export const formatTanggalSk = (iso?: string | null): string => {
  if (!iso) return String(new Date().getFullYear());
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
};

const Baris: React.FC<{
  label: string;
  children: React.ReactNode;
  ganjil?: boolean;
}> = ({ label, children, ganjil }) => (
  <div
    className={`grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-[190px_1fr] sm:gap-4 ${
      ganjil ? "bg-biru-50/70" : ""
    }`}
  >
    <dt className="text-biru-700">{label}</dt>
    <dd className="font-semibold text-biru-950">{children}</dd>
  </div>
);

/**
 * Surat Keputusan Penerimaan Mahasiswa Baru (LoA) untuk tampilan layar dan cetak.
 * Kop surat berlogo, tabel biodata, kotak keputusan, ketentuan, QR verifikasi, dan pengesahan.
 * Bagian yang dicetak ditandai `area-cetak` (lihat gaya @media print di index.css).
 */
export const DokumenLoa: React.FC<{ data: DataLoa }> = ({ data }) => {
  const tanggal = formatTanggalSk(data.tanggal_sk);
  const nomor = data.nomor_surat_loa || "-";
  const pilihan2 = data.pilihan_ke === 2;

  return (
    <article
      aria-label="Surat Keputusan Penerimaan Mahasiswa Baru"
      className="area-cetak dokumen-a4 relative mx-auto w-full max-w-[860px] overflow-hidden rounded-2xl border border-biru-200 bg-putih shadow-xl"
    >
      {/* Pita aksen */}
      <div className="h-2 bg-biru-950" />
      <div className="h-0.5 bg-amber-400" />

      {/* Watermark logo */}
      <img
        src="/logo.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 w-[60%] -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.045]"
      />

      <div className="relative space-y-6 px-6 py-8 sm:px-12 sm:py-10 print:space-y-3 print:px-9 print:py-4 print:text-[11px]">
        {/* Kop surat */}
        <header>
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
            <Logo height={64} />
            <p className="text-[11px] leading-snug text-biru-700 sm:ml-2 sm:border-l sm:border-biru-200 sm:pl-5">
              Panitia Penerimaan Mahasiswa Baru (PMB) Tahun Akademik 2026/2027
              <br />
              Jl. Bawean No. 9, Danukusuman, Serengan, Surakarta, Jawa Tengah
              57156
            </p>
          </div>
          <div className="mt-4 h-0.5 bg-biru-950" />
          <div className="mt-1 h-px bg-amber-400" />
        </header>

        {/* Judul */}
        <div className="space-y-1 text-center">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-biru-950 sm:text-xl">
            Surat Keputusan Penerimaan Mahasiswa Baru
          </h2>
          <p className="text-xs italic text-biru-700">
            Official Letter of Acceptance
          </p>
          <p className="font-mono text-sm font-bold text-biru-950">
            Nomor: {nomor}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-biru-950">
          Rektor Universitas Pignatelli Triputra, berdasarkan hasil seleksi
          penerimaan mahasiswa baru Tahun Akademik 2026/2027, dengan ini
          menetapkan bahwa calon mahasiswa berikut:
        </p>

        {/* Biodata */}
        <dl className="divide-y divide-biru-100 overflow-hidden rounded-xl border border-biru-200 text-sm">
          <Baris label="Nomor Pendaftaran">
            <span className="font-mono">{data.nomor_pendaftaran}</span>
          </Baris>
          <Baris label="Nama Lengkap" ganjil>
            <span className="uppercase">{data.nama_lengkap}</span>
          </Baris>
          <Baris label="Jalur Penerimaan">{data.jalur_nama}</Baris>
          {data.nim_resmi && (
            <Baris label="Nomor Induk Mahasiswa" ganjil>
              <span className="font-mono">{data.nim_resmi}</span>
            </Baris>
          )}
        </dl>

        {/* Keputusan */}
        <section className="relative overflow-hidden rounded-xl bg-biru-950 p-5 text-putih sm:p-6 print:p-3">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-amber-400" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
            Dinyatakan diterima sebagai mahasiswa baru
          </p>
          <p className="mt-2 font-serif text-2xl font-bold sm:text-3xl print:mt-1 print:text-xl">
            {data.jenjang_diterima} {data.prodi_diterima}
          </p>
          <p className="mt-1 text-sm text-biru-200">
            {data.fakultas_diterima} · Pilihan ke-{data.pilihan_ke ?? 1} · Skor
            seleksi {data.skor_akhir.toFixed(2)}
          </p>
          {pilihan2 && (
            <p className="mt-3 rounded-lg bg-putih/10 px-3 py-2 text-xs leading-relaxed text-biru-100">
              Penerimaan ini pada program studi pilihan kedua berdasarkan
              keputusan panitia seleksi.
            </p>
          )}
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-biru-950">
          <h3 className="flex items-center gap-2 text-sm font-bold text-biru-950">
            <span className="h-3.5 w-1 rounded bg-amber-400" />
            Ketentuan
          </h3>
          <ol className="list-decimal space-y-1 pl-5 text-biru-900">
            <li>
              Calon mahasiswa wajib menyelesaikan pembayaran dan registrasi
              ulang melalui portal PMB sebelum batas waktu yang ditetapkan.
            </li>
            <li>
              Penerimaan dinyatakan gugur apabila registrasi ulang tidak
              diselesaikan tanpa pemberitahuan tertulis kepada panitia.
            </li>
            <li>
              Rincian biaya dan batas waktu daftar ulang tertera pada menu
              Daftar Ulang dan pada surat versi PDF.
            </li>
          </ol>
        </section>

        {/* Pengesahan & QR */}
        <footer className="flex flex-col gap-6 print:gap-3 print:flex-row print:items-end print:justify-between border-t border-biru-200 pt-6 print:pt-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/api/kelulusan/verifikasi-qr"
              alt="QR Code verifikasi keaslian surat"
              width={96}
              height={96}
              className="h-24 w-24 rounded-lg border border-biru-200 bg-putih p-1"
            />
            <div className="space-y-0.5 text-[11px] text-biru-800">
              <p className="font-bold text-biru-950">
                Dokumen Digital Terverifikasi
              </p>
              <p>Pindai QR Code untuk memeriksa</p>
              <p>keaslian surat keputusan ini.</p>
              <p className="break-all font-mono text-[10px] text-biru-700">
                pmb.pignatelli.ac.id/verifikasi-loa/
                {data.pendaftar_id.slice(0, 8)}…
              </p>
            </div>
          </div>
          <div className="space-y-1 text-sm sm:text-right">
            <p className="text-biru-800">Surakarta, {tanggal}</p>
            <p className="font-bold text-biru-950">
              Ketua Panitia Seleksi PMB,
            </p>
            <div className="my-2 flex h-14 print:h-10 items-center justify-center rounded-md border border-biru-300 bg-biru-50 px-4 sm:ml-auto sm:w-52">
              <span className="text-[11px] font-bold tracking-wider text-biru-700">
                TERTANDA SECARA DIGITAL
              </span>
            </div>
            <p className="font-bold text-biru-950">
              Dr. Ir. Fransiskus Xaverius, M.Kom.
            </p>
            <p className="text-xs text-biru-700">NIDN: 0612087501</p>
          </div>
        </footer>

        <p className="border-t border-biru-100 pt-3 text-center text-[10px] text-biru-600">
          Dokumen ini sah dan diterbitkan secara resmi melalui Sistem Informasi
          PMB Universitas Pignatelli Triputra.
        </p>
      </div>
    </article>
  );
};
