import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileText, Gift, ListOrdered } from "lucide-react";
import { Button, Card } from "../../components/common";
import { formatRupiah } from "../../services/prodi";
import { SeoHead } from "../../components/common/SeoHead";
import { JALUR_PENERIMAAN } from "../../content/beranda";
import {
  BERKAS_UMUM,
  DETAIL_JALUR,
  kodeDaftar,
  type KodeJalur,
} from "../../content/jalurMasuk";

export const JalurMasukPage: React.FC = () => {
  const [aktif, setAktif] = useState<KodeJalur>(JALUR_PENERIMAAN[0].kode);
  const jalur = JALUR_PENERIMAAN.find((j) => j.kode === aktif)!;
  const detail = DETAIL_JALUR[aktif];

  // Biaya formulir dari master data jalur (diatur admin)
  const { data: daftarJalur } = useQuery<
    { kode_jalur: string; biaya_formulir: number }[]
  >({
    queryKey: ["master-jalur-publik"],
    queryFn: async () => {
      const res = await fetch("/api/master/jalur");
      if (!res.ok) throw new Error("gagal");
      return res.json();
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
  const biaya = daftarJalur?.find(
    (j) => j.kode_jalur.toLowerCase() === kodeDaftar(aktif),
  )?.biaya_formulir;
  const labelBiaya =
    biaya === undefined ? null : biaya === 0 ? "Gratis" : formatRupiah(biaya);

  return (
    <div className="space-y-16 pb-20">
      <SeoHead
        title="Jalur Penerimaan Mahasiswa Baru 2026/2027"
        description="Tujuh jalur masuk PMB UPITRA: READY Early, Partner Scholarship, Achievement, Admission, Legacy Scholarship, Future Leader, dan Creator."
      />

      <section className="bg-gradient-to-br from-biru-950 via-biru-900 to-biru-800 text-putih py-16 border-b border-biru-800">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-800 text-biru-200 border border-biru-700">
            Penerimaan Mahasiswa Baru 2026
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-putih">
            Jalur Penerimaan Mahasiswa Baru
          </h1>
          <p className="text-sm sm:text-base text-biru-200 max-w-2xl mx-auto font-sans leading-relaxed">
            Pilih jalur READY yang paling sesuai dengan kualifikasi, prestasi,
            dan rencana masa depan Anda di Universitas Pignatelli Triputra.
          </p>
        </div>
      </section>

      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div
          role="tablist"
          aria-label="Jalur masuk"
          className="flex border-b border-biru-200 overflow-x-auto gap-2 sm:gap-4 pb-px"
        >
          {JALUR_PENERIMAAN.map((j) => {
            const dipilih = j.kode === aktif;
            return (
              <button
                key={j.kode}
                type="button"
                role="tab"
                aria-selected={dipilih}
                onClick={() => setAktif(j.kode)}
                className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                  dipilih
                    ? "border-biru-800 text-biru-950 font-bold bg-biru-50/60 rounded-t-lg"
                    : "border-transparent text-biru-600 hover:text-biru-900 hover:border-biru-300"
                }`}
              >
                {j.nama}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          <div className="lg:col-span-8 space-y-6">
            <Card className="p-6 sm:p-8 border-biru-200 space-y-5">
              <div>
                <h2 className="font-serif text-2xl font-bold text-biru-950">
                  {jalur.nama}
                </h2>
                <p className="text-xs text-biru-600 font-medium">
                  {jalur.keterangan}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-biru-100">
                <h3 className="text-sm font-bold text-biru-950">
                  Ketentuan Jalur:
                </h3>
                <ul className="text-xs text-biru-800 space-y-2">
                  {jalur.ketentuan.map((k) => (
                    <li key={k} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-biru-600 shrink-0 mt-0.5" />
                      <span>{k}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3 pt-3 border-t border-biru-100">
                <h3 className="text-sm font-bold text-biru-950 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-biru-700" />
                  Tahapan Seleksi
                </h3>
                <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {detail.tahapan.map((t, i) => (
                    <li
                      key={t}
                      className="flex items-start gap-3 p-3 rounded-xl bg-biru-50 border border-biru-200"
                    >
                      <span className="h-5 w-5 shrink-0 rounded-full bg-biru-800 text-putih text-[11px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-biru-800">{t}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-2 pt-3 border-t border-biru-100">
                <h3 className="text-sm font-bold text-biru-950 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-biru-700" />
                  Potongan &amp; Benefit
                </h3>
                <p className="text-xs text-biru-800">
                  <strong>Potongan:</strong> {detail.potongan}
                </p>
                {labelBiaya && (
                  <p className="text-xs text-biru-800">
                    <strong>Biaya formulir:</strong> {labelBiaya}
                  </p>
                )}
                {detail.benefit && (
                  <p className="text-xs text-biru-800">
                    <strong>Benefit:</strong> {detail.benefit}
                  </p>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card className="p-6 border-biru-200 space-y-4 bg-biru-50/50">
              <h3 className="font-serif text-lg font-bold text-biru-950 flex items-center gap-2">
                <FileText className="w-4 h-4 text-biru-700" />
                Persyaratan Berkas
              </h3>
              <ul className="text-xs text-biru-800 space-y-2.5">
                {[...detail.berkasKhusus, ...BERKAS_UMUM].map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
                {labelBiaya && (
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                    <span>Biaya formulir: {labelBiaya}</span>
                  </li>
                )}
              </ul>
              <div className="pt-4 border-t border-biru-200">
                <Link to={`/register?jalur=${kodeDaftar(aktif)}`}>
                  <Button
                    variant="primary"
                    className="w-full text-xs font-bold py-2.5"
                  >
                    Daftar {jalur.nama} &rarr;
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};
