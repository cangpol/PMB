import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { formatRupiah } from "../../services/prodi";
import {
  kelompokkanPerFakultas,
  type RincianBiayaKuliah,
} from "../../lib/biayaKuliah";
import { RiwayatBiayaKuliah } from "../../components/biaya/RiwayatBiayaKuliah";
import { SeoHead } from "../../components/common/SeoHead";

export const BiayaJalurPage: React.FC = () => {
  // Rincian biaya kuliah per program studi (diatur admin)
  const { data: biayaList = [], isLoading: isBiayaLoading } = useQuery<
    RincianBiayaKuliah[]
  >({
    queryKey: ["rincian-biaya-kuliah"],
    queryFn: async () => {
      const res = await fetch("/api/master/rincian-biaya-kuliah");
      if (!res.ok) throw new Error("Gagal memuat rincian biaya kuliah");
      return res.json();
    },
  });
  const rupiah = (n: number) => (n > 0 ? formatRupiah(n) : "-");
  const kelompokFakultas = kelompokkanPerFakultas(biayaList);

  return (
    <div className="bg-putih flex flex-col min-h-screen">
      <SeoHead
        title="Rincian Biaya Kuliah - PMB Universitas Pignatelli Triputra"
        description="Rincian biaya kuliah per program studi: admisi, biaya tiap semester, dan total pembayaran hingga lulus di Universitas Pignatelli Triputra."
      />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Rincian Biaya Kuliah per Program Studi */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-biru-950">
              Rincian Biaya Kuliah
            </h1>
            <p className="text-xs sm:text-sm text-biru-800">
              Biaya per program studi: admisi, biaya setiap semester, serta
              total pembayaran hingga lulus.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-biru-200 bg-putih shadow-soft-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-biru-950 text-putih">
                  <th className="py-3.5 px-4 font-bold">Program Studi</th>
                  <th className="py-3.5 px-4 font-bold text-right">Admisi</th>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <th
                      key={n}
                      className="py-3.5 px-3 font-bold text-right whitespace-nowrap"
                    >
                      Semester {n}
                    </th>
                  ))}
                  <th className="py-3.5 px-4 font-bold text-right">
                    Total Pembayaran hingga Lulus
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-biru-100 text-biru-950 font-sans">
                {isBiayaLoading ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-biru-700">
                      Memuat rincian biaya kuliah...
                    </td>
                  </tr>
                ) : biayaList.length > 0 ? (
                  kelompokFakultas.map(({ fakultas, prodi }) => (
                    <React.Fragment key={fakultas}>
                      <tr className="bg-biru-100">
                        <th
                          colSpan={11}
                          scope="colgroup"
                          className="py-2.5 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-biru-900"
                        >
                          {fakultas}
                        </th>
                      </tr>
                      {prodi.map((b) => (
                        <tr
                          key={b.prodi_id}
                          className="hover:bg-biru-50/60 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-bold text-biru-950">
                            <Link
                              to={`/program-studi/${b.slug || b.prodi_id}`}
                              className="hover:text-biru-700 hover:underline"
                            >
                              {b.jenjang} {b.nama_prodi}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 text-right tabular-nums">
                            {rupiah(b.admisi)}
                          </td>
                          {b.semester.map((nilai, i) => (
                            <td
                              key={i}
                              className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap"
                            >
                              {i < b.jumlah_semester ? rupiah(nilai) : "-"}
                            </td>
                          ))}
                          <td className="py-3.5 px-4 text-right font-bold tabular-nums">
                            {rupiah(b.total_hingga_lulus)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-biru-700">
                      Data biaya program studi sedang dipersiapkan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <ul className="space-y-1.5 text-xs sm:text-sm text-biru-900 font-sans">
            <li className="flex gap-2">
              <span aria-hidden="true">*</span>
              <span>
                Rincian biaya diatas merupakan <strong>BIAYA NORMAL</strong>{" "}
                (Tanpa Potongan Beasiswa)
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true">*</span>
              <span>
                Tersedia Program Jalur Early Bird 2026 berupa potongan Beasiswa
                100% SKS dan DPP
              </span>
            </li>
          </ul>

          <RiwayatBiayaKuliah />

          <div className="p-4 rounded-2xl bg-biru-50 border border-biru-200 text-xs text-biru-800 flex items-start sm:items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-biru-600 shrink-0 mt-0.5 sm:mt-0" />
            <p>
              Tersedia fasilitas cicilan UKT hingga 3 kali per semester tanpa
              bunga, serta beasiswa penuh hingga 100% untuk calon mahasiswa
              berprestasi.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
