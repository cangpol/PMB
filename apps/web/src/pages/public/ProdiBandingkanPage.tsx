import React, { useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Scale,
  Trash2,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Building2,
  Clock,
  Users,
  CreditCard,
  Briefcase,
} from "lucide-react";
import {
  getProdiList,
  formatRupiah,
  formatDayaTampung,
  formatLamaStudi,
  type ProdiResponse,
} from "../../services/prodi";
import { SeoHead } from "../../components/common/SeoHead";
import { EmptyState } from "../../components/common/EmptyState";
import { TableSkeleton } from "../../components/ui/Skeleton";

export const ProdiBandingkanPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Ambil daftar id dari search params
  const rawIds = searchParams.get("ids") || "";
  const selectedIds = useMemo(() => {
    return rawIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }, [rawIds]);

  // Ambil daftar seluruh program studi aktif
  const { data: allProdi = [], isLoading } = useQuery({
    queryKey: ["public-prodi-list"],
    queryFn: getProdiList,
  });

  // Filter prodi yang dipilih untuk dibandingkan (maksimal 3)
  const comparedProdi = useMemo(() => {
    return selectedIds
      .map((id) =>
        allProdi.find(
          (p) =>
            p.id === id ||
            p.slug === id ||
            p.kode_prodi.toLowerCase() === id.toLowerCase() ||
            (p.kode_singkat &&
              p.kode_singkat.toLowerCase() === id.toLowerCase()),
        ),
      )
      .filter((p): p is ProdiResponse => Boolean(p))
      .slice(0, 3);
  }, [selectedIds, allProdi]);

  // Hapus satu prodi dari perbandingan
  const handleRemoveProdi = (idToRemove: string) => {
    const nextIds = selectedIds.filter((id) => id !== idToRemove);
    if (nextIds.length === 0) {
      navigate("/program-studi");
    } else {
      setSearchParams({ ids: nextIds.join(",") });
    }
  };

  // Tambah prodi ke perbandingan
  const handleAddProdi = (newId: string) => {
    if (!newId || selectedIds.includes(newId) || selectedIds.length >= 3) return;
    const nextIds = [...selectedIds, newId];
    setSearchParams({ ids: nextIds.join(",") });
  };

  // Prodi yang belum dipilih untuk opsi dropdown penambahan
  const availableToAdd = useMemo(() => {
    return allProdi.filter((p) => !comparedProdi.some((cp) => cp.id === p.id));
  }, [allProdi, comparedProdi]);

  return (
    <div className="bg-putih min-h-screen flex flex-col">
      <SeoHead
        title="Bandingkan Program Studi - PMB Universitas Pignatelli Triputra"
        description="Bandingkan kurikulum, daya tampung, biaya UKT, dan prospek karier antar program studi Universitas Pignatelli Triputra."
      />

      {/* Header Section */}
      <section className="bg-gradient-to-b from-biru-50/80 to-putih border-b border-biru-100 py-8">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <Link
            to="/program-studi"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-biru-700 hover:text-biru-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Katalog Program Studi</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biru-100 text-biru-950 text-xs font-semibold mb-2">
                <Scale className="w-3.5 h-3.5 text-biru-700" />
                <span>Pembanding Komprehensif</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-biru-950">
                Bandingkan Program Studi Pilihan
              </h1>
              <p className="text-xs sm:text-sm text-biru-800 mt-1">
                Bandingkan informasi akademik, kuota, biaya UKT, dan prospek
                karier hingga 3 program studi sekaligus.
              </p>
            </div>

            {/* Selector Tambah Prodi */}
            {comparedProdi.length < 3 && availableToAdd.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  aria-label="Pilih program studi untuk dibandingkan"
                  onChange={(e) => {
                    handleAddProdi(e.target.value);
                    e.target.value = "";
                  }}
                  className="rounded-xl border border-biru-300 bg-putih px-3 py-2 text-xs text-biru-950 font-medium focus:border-biru-600 focus:outline-none shadow-soft-xs"
                >
                  <option value="">+ Tambah Prodi Pembanding...</option>
                  {availableToAdd.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.jenjang} {p.nama_prodi} ({p.fakultas})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && <TableSkeleton rows={8} cols={4} />}

        {!isLoading && comparedProdi.length === 0 && (
          <EmptyState
            title="Belum Ada Program Studi yang Dipilih"
            description="Silakan pilih minimal satu atau dua program studi dari katalog untuk mulai membandingkan kurikulum dan peluang karier."
            actionLabel="Jelajahi Program Studi"
            onAction={() => navigate("/program-studi")}
          />
        )}

        {!isLoading && comparedProdi.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-biru-200 bg-putih shadow-soft-sm">
            <table className="w-full text-left border-collapse min-w-[720px]">
              {/* Header Kolom Prodi */}
              <thead>
                <tr className="bg-biru-950 text-putih">
                  <th className="sticky left-0 z-20 bg-biru-950 p-4 sm:p-5 w-56 text-xs font-bold uppercase tracking-wider text-biru-300 border-r border-biru-800">
                    Kriteria Evaluasi
                  </th>
                  {comparedProdi.map((p) => (
                    <th
                      key={p.id}
                      className="p-4 sm:p-5 text-left border-r last:border-r-0 border-biru-800 align-top"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-biru-800 text-biru-200">
                            {p.jenjang} &middot; {p.kode_singkat || p.kode_prodi}
                          </span>
                          <h3 className="font-serif text-lg font-bold text-putih mt-1.5 leading-snug">
                            {p.nama_prodi}
                          </h3>
                          <p className="text-xs text-biru-300 mt-0.5">
                            {p.fakultas}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProdi(p.id)}
                          className="text-biru-400 hover:text-putih p-1 rounded-lg hover:bg-biru-900 transition-colors"
                          title={`Hapus ${p.nama_prodi}`}
                          aria-label={`Hapus ${p.nama_prodi}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4 pt-3 border-t border-biru-800/80">
                        <Link
                          to={`/register?prodi=${p.kode_singkat || p.kode_prodi}`}
                        >
                          <button
                            type="button"
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-biru-500 to-biru-600 hover:from-biru-400 hover:to-biru-500 text-putih text-xs font-bold shadow-soft-xs transition-all inline-flex items-center justify-center gap-1.5"
                          >
                            <span>Daftar Prodi Ini</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Baris Kriteria Perbandingan */}
              <tbody className="divide-y divide-biru-100 text-xs text-biru-950 font-sans">
                {/* Gelar Lulusan */}
                <tr className="hover:bg-biru-50/50">
                  <td className="sticky left-0 z-10 bg-putih p-4 font-semibold text-biru-900 border-r border-biru-100">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-biru-600" />
                      <span>Gelar Akademik</span>
                    </div>
                  </td>
                  {comparedProdi.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 font-bold text-biru-950 border-r last:border-r-0 border-biru-100"
                    >
                      {p.gelar || "Segera diumumkan"}
                    </td>
                  ))}
                </tr>

                {/* Akreditasi */}
                <tr className="hover:bg-biru-50/50">
                  <td className="sticky left-0 z-10 bg-putih p-4 font-semibold text-biru-900 border-r border-biru-100">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-biru-600" />
                      <span>Status Akreditasi</span>
                    </div>
                  </td>
                  {comparedProdi.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 border-r last:border-r-0 border-biru-100"
                    >
                      {p.akreditasi ? (
                        <span className="px-2.5 py-1 rounded-lg bg-biru-100 text-biru-950 font-bold text-xs">
                          {p.akreditasi}
                        </span>
                      ) : (
                        <span className="text-biru-500 font-medium italic">
                          Segera diumumkan
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Masa Studi */}
                <tr className="hover:bg-biru-50/50">
                  <td className="sticky left-0 z-10 bg-putih p-4 font-semibold text-biru-900 border-r border-biru-100">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-biru-600" />
                      <span>Masa Tempuh Studi</span>
                    </div>
                  </td>
                  {comparedProdi.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 border-r last:border-r-0 border-biru-100 font-medium tabular-nums"
                    >
                      {formatLamaStudi(p.lama_studi_semester, p.jenjang)}
                    </td>
                  ))}
                </tr>

                {/* Daya Tampung */}
                <tr className="hover:bg-biru-50/50">
                  <td className="sticky left-0 z-10 bg-putih p-4 font-semibold text-biru-900 border-r border-biru-100">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-biru-600" />
                      <span>Daya Tampung / Kuota</span>
                    </div>
                  </td>
                  {comparedProdi.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 font-bold text-biru-950 border-r last:border-r-0 border-biru-100 tabular-nums"
                    >
                      {formatDayaTampung(p.daya_tampung)}
                    </td>
                  ))}
                </tr>

                {/* Biaya UKT per Semester */}
                <tr className="hover:bg-biru-50/50">
                  <td className="sticky left-0 z-10 bg-putih p-4 font-semibold text-biru-900 border-r border-biru-100">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-biru-600" />
                      <span>Biaya UKT / Smt</span>
                    </div>
                  </td>
                  {comparedProdi.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 font-bold text-biru-950 border-r last:border-r-0 border-biru-100 tabular-nums text-sm"
                    >
                      {p.biaya_ukt_min
                        ? `${formatRupiah(p.biaya_ukt_min)} / semester`
                        : "Segera diumumkan"}
                    </td>
                  ))}
                </tr>

                {/* Deskripsi Singkat */}
                <tr className="hover:bg-biru-50/50">
                  <td className="sticky left-0 z-10 bg-putih p-4 font-semibold text-biru-900 border-r border-biru-100">
                    <span>Fokus Program</span>
                  </td>
                  {comparedProdi.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 text-biru-800 leading-relaxed border-r last:border-r-0 border-biru-100"
                    >
                      {p.deskripsi_singkat ||
                        p.tentang_prodi ||
                        "Segera diumumkan"}
                    </td>
                  ))}
                </tr>

                {/* Kompetensi Lulusan */}
                <tr className="hover:bg-biru-50/50">
                  <td className="sticky left-0 z-10 bg-putih p-4 font-semibold text-biru-900 border-r border-biru-100">
                    <span>Kompetensi Utama</span>
                  </td>
                  {comparedProdi.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 border-r last:border-r-0 border-biru-100"
                    >
                      {p.kompetensi_lulusan && p.kompetensi_lulusan.length > 0 ? (
                        <ul className="space-y-1.5">
                          {p.kompetensi_lulusan.map((k, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-biru-600 shrink-0 mt-0.5" />
                              <span className="text-biru-900">{k}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-biru-500 italic">
                          Segera diumumkan
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Prospek Karier */}
                <tr className="hover:bg-biru-50/50">
                  <td className="sticky left-0 z-10 bg-putih p-4 font-semibold text-biru-900 border-r border-biru-100">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-biru-600" />
                      <span>Prospek Karier</span>
                    </div>
                  </td>
                  {comparedProdi.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 border-r last:border-r-0 border-biru-100"
                    >
                      {p.prospek_karier && p.prospek_karier.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {p.prospek_karier.map((karier, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-md bg-biru-50 text-biru-900 text-[11px] font-medium border border-biru-200/70"
                            >
                              {karier}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-biru-500 italic">
                          Segera diumumkan
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Fasilitas & Laboratorium */}
                <tr className="hover:bg-biru-50/50">
                  <td className="sticky left-0 z-10 bg-putih p-4 font-semibold text-biru-900 border-r border-biru-100">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-biru-600" />
                      <span>Fasilitas & Lab</span>
                    </div>
                  </td>
                  {comparedProdi.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 border-r last:border-r-0 border-biru-100"
                    >
                      {p.fasilitas && p.fasilitas.length > 0 ? (
                        <ul className="space-y-1">
                          {p.fasilitas.map((f, idx) => (
                            <li
                              key={idx}
                              className="text-biru-800 list-disc list-inside"
                            >
                              {f}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-biru-500 italic">
                          Segera diumumkan
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};
