import React, { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Briefcase,
  Users,
  Search,
  ArrowRight,
  Sparkles,
  X,
  Layers,
  Clock,
  Award,
  ChevronRight,
  Scale,
} from "lucide-react";
import {
  getProdiList,
  getFakultasWithProdiList,
  formatRupiah,
  formatDayaTampung,
  formatLamaStudi,
  type ProdiResponse,
} from "../../services/prodi";
import { SeoHead } from "../../components/common/SeoHead";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { CardSkeleton } from "../../components/ui/Skeleton";

export const ProdiPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Ambil parameter filter dari URL
  const fakultasParam = searchParams.get("fakultas") || "semua";
  const jenjangParam = searchParams.get("jenjang") || "semua";
  const queryParam = searchParams.get("q") || "";

  // State pencarian lokal yang disinkronkan ke URL
  const [searchInput, setSearchInput] = useState<string>(queryParam);

  // State perbandingan prodi (maks 3)
  const [selectedCompare, setSelectedCompare] = useState<ProdiResponse[]>([]);

  // Query API Dinamis: Daftar seluruh program studi
  const {
    data: prodiList = [],
    isLoading: isProdiLoading,
    isError: isProdiError,
    refetch: refetchProdi,
  } = useQuery({
    queryKey: ["public-prodi-list"],
    queryFn: getProdiList,
  });

  // Query API Dinamis: Pengelompokan Fakultas beserta prodi
  const {
    data: fakultasList = [],
    isLoading: isFakultasLoading,
    isError: isFakultasError,
    refetch: refetchFakultas,
  } = useQuery({
    queryKey: ["public-fakultas-with-prodi"],
    queryFn: getFakultasWithProdiList,
  });

  const isLoading = isProdiLoading || isFakultasLoading;
  const isError = isProdiError || isFakultasError;

  // Handler sinkronisasi filter ke URL Search Params
  const updateFilters = (updates: {
    fakultas?: string;
    jenjang?: string;
    q?: string;
  }) => {
    const nextParams = new URLSearchParams(searchParams);
    if (updates.fakultas !== undefined) {
      if (updates.fakultas === "semua") nextParams.delete("fakultas");
      else nextParams.set("fakultas", updates.fakultas);
    }
    if (updates.jenjang !== undefined) {
      if (updates.jenjang === "semua") nextParams.delete("jenjang");
      else nextParams.set("jenjang", updates.jenjang);
    }
    if (updates.q !== undefined) {
      if (!updates.q.trim()) nextParams.delete("q");
      else nextParams.set("q", updates.q.trim());
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchParams({}, { replace: true });
  };

  // Toggle seleksi pembanding
  const toggleCompare = (prodi: ProdiResponse) => {
    setSelectedCompare((prev) => {
      const exists = prev.some((p) => p.id === prodi.id);
      if (exists) {
        return prev.filter((p) => p.id !== prodi.id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, prodi];
    });
  };

  // Filter program studi berdasarkan jenjang, fakultas, dan kata kunci
  const filteredProdi = useMemo(() => {
    return prodiList.filter((prodi) => {
      // 1. Filter Jenjang
      if (
        jenjangParam !== "semua" &&
        prodi.jenjang.toLowerCase() !== jenjangParam.toLowerCase()
      ) {
        return false;
      }

      // 2. Filter Fakultas (berdasarkan slug atau kode/nama)
      if (fakultasParam !== "semua") {
        const matchesFakultas =
          (prodi.fakultas_id && prodi.fakultas_id === fakultasParam) ||
          prodi.fakultas.toLowerCase().includes(fakultasParam.toLowerCase()) ||
          (fakultasParam === "fst" &&
            prodi.fakultas.toLowerCase().includes("sains")) ||
          (fakultasParam === "feb" &&
            prodi.fakultas.toLowerCase().includes("ekonomi")) ||
          (fakultasParam === "fsh" &&
            prodi.fakultas.toLowerCase().includes("sosial")) ||
          (fakultasParam === "fkes" &&
            prodi.fakultas.toLowerCase().includes("kesehatan"));

        if (!matchesFakultas) return false;
      }

      // 3. Filter Kata Kunci
      if (queryParam) {
        const q = queryParam.toLowerCase();
        const namaMatch = prodi.nama_prodi.toLowerCase().includes(q);
        const kodeMatch =
          prodi.kode_prodi.toLowerCase().includes(q) ||
          (prodi.kode_singkat && prodi.kode_singkat.toLowerCase().includes(q));
        const fakultasMatch = prodi.fakultas.toLowerCase().includes(q);
        const karierMatch = prodi.prospek_karier.some((k) =>
          k.toLowerCase().includes(q),
        );
        const kompetensiMatch = prodi.kompetensi_lulusan.some((k) =>
          k.toLowerCase().includes(q),
        );
        if (
          !namaMatch &&
          !kodeMatch &&
          !fakultasMatch &&
          !karierMatch &&
          !kompetensiMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [prodiList, jenjangParam, fakultasParam, queryParam]);

  // Kelompokkan prodi berdasarkan fakultas untuk anchor scroll-spy
  const prodiByFakultas = useMemo(() => {
    const map = new Map<string, ProdiResponse[]>();
    fakultasList.forEach((f) => map.set(f.id, []));

    filteredProdi.forEach((prodi) => {
      const fakId = prodi.fakultas_id || "lainnya";
      if (!map.has(fakId)) map.set(fakId, []);
      map.get(fakId)!.push(prodi);
    });

    return map;
  }, [fakultasList, filteredProdi]);

  const hasActiveFilters =
    fakultasParam !== "semua" || jenjangParam !== "semua" || queryParam !== "";

  return (
    <div className="bg-putih flex flex-col min-h-screen">
      <SeoHead
        title="Program Studi Resmi & Akreditasi - PMB Universitas Pignatelli Triputra"
        description="Pilihan 10 program studi unggulan jenjang Sarjana (S1) dan Vokasi (D3) Universitas Pignatelli Triputra dengan kurikulum industri bersama Triputra Group."
      />

      {/* C1. BREADCRUMB & HEADER SECTION */}
      <section className="bg-gradient-to-b from-biru-50/80 via-biru-50/40 to-putih border-b border-biru-100 pt-8 pb-10 sm:pb-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigasi */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs text-biru-700 mb-6 font-medium"
          >
            <Link to="/" className="hover:text-biru-950 transition-colors">
              Beranda
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-biru-400" />
            <span className="text-biru-950 font-semibold" aria-current="page">
              Program Studi
            </span>
          </nav>

          {/* Judul & Deskripsi Utama */}
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-biru-100 text-biru-950 text-xs font-semibold shadow-soft-xs">
              <GraduationCap className="w-4 h-4 text-biru-700 shrink-0" />
              <span>Fakultas & Kurikulum Industri Terpadu</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-biru-950 tracking-tight leading-tight">
              Pilihan Program Studi Berkualitas Industri
            </h1>

            <p className="text-sm sm:text-base text-biru-800 leading-relaxed font-sans font-normal">
              Setiap program studi dirancang dan dibina bersama konsorsium industri{" "}
              <strong className="font-semibold text-biru-950">
                Triputra Group
              </strong>{" "}
              untuk memastikan penguasaan kompetensi aplikatif, sertifikasi
              profesional, serta peluang penempatan karier berstandar global.
            </p>

            {/* Strip Ringkasan Dinamis yang Dihitung Otomatis dari API */}
            <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-biru-800 font-medium">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-putih border border-biru-200 shadow-soft-xs">
                <Layers className="w-4 h-4 text-biru-600" />
                <span>
                  <strong className="font-bold text-biru-950 tabular-nums">
                    {fakultasList.length || 4}
                  </strong>{" "}
                  Fakultas
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-putih border border-biru-200 shadow-soft-xs">
                <Sparkles className="w-4 h-4 text-biru-600" />
                <span>
                  <strong className="font-bold text-biru-950 tabular-nums">
                    {prodiList.length || 10}
                  </strong>{" "}
                  Program Studi
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-putih border border-biru-200 shadow-soft-xs">
                <Award className="w-4 h-4 text-biru-600" />
                <span>Jenjang Sarjana (S1) & Vokasi (D3)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* C2. STICKY FILTER BAR TERPADU (SINKRON KE URL QUERY) */}
      <section className="sticky top-16 sm:top-[64px] z-30 bg-putih/95 backdrop-blur-md border-b border-biru-100 shadow-[0_4px_16px_rgba(11,37,89,0.04)] py-3">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Input Pencarian Berbasis Form */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative w-full lg:w-80 shrink-0"
            >
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-biru-500" />
              <input
                type="text"
                placeholder="Cari prodi, prospek, keahlian..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onBlur={() => updateFilters({ q: searchInput })}
                className="w-full pl-9 pr-9 py-2 bg-putih border border-biru-200 rounded-xl text-xs text-biru-950 placeholder:text-biru-400 focus:outline-none focus:ring-2 focus:ring-biru-600 focus:border-biru-600 transition-all shadow-soft-xs"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    updateFilters({ q: "" });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-biru-400 hover:text-biru-950"
                  aria-label="Hapus kata kunci pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Filter Tab Jenjang */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <span className="text-xs font-semibold text-biru-800 shrink-0 mr-1 hidden sm:inline">
                Jenjang:
              </span>
              {[
                { label: "Semua", value: "semua" },
                { label: "S1 (Sarjana)", value: "s1" },
                { label: "D3 (Vokasi)", value: "d3" },
              ].map((tab) => {
                const isActive = jenjangParam === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => updateFilters({ jenjang: tab.value })}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-biru-900 text-putih shadow-soft-xs"
                        : "bg-biru-50/80 text-biru-800 hover:bg-biru-100 hover:text-biru-950 border border-biru-200/60"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Filter Tab Fakultas */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <span className="text-xs font-semibold text-biru-800 shrink-0 mr-1 hidden sm:inline">
                Fakultas:
              </span>
              <button
                type="button"
                onClick={() => updateFilters({ fakultas: "semua" })}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  fakultasParam === "semua"
                    ? "bg-biru-900 text-putih shadow-soft-xs"
                    : "bg-biru-50/80 text-biru-800 hover:bg-biru-100 hover:text-biru-950 border border-biru-200/60"
                }`}
              >
                Semua Fakultas
              </button>
              {fakultasList.map((f) => {
                const isActive =
                  fakultasParam === f.slug || fakultasParam === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => updateFilters({ fakultas: f.slug || f.id })}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-biru-900 text-putih shadow-soft-xs"
                        : "bg-biru-50/80 text-biru-800 hover:bg-biru-100 hover:text-biru-950 border border-biru-200/60"
                    }`}
                  >
                    {f.kode_fakultas}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Counter Hasil & Tombol Reset */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-biru-100/70">
            <span className="text-biru-700">
              Menampilkan{" "}
              <strong className="font-bold text-biru-950 tabular-nums">
                {filteredProdi.length}
              </strong>{" "}
              dari {prodiList.length} program studi
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-biru-600 hover:text-biru-950 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Semua Filter</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* KONTEN UTAMA: DAFTAR PROGRAM STUDI */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Loading State Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && (
          <ErrorState
            title="Gagal Mengambil Data Program Studi"
            message="Terjadi gangguan saat memuat katalog program studi resmi dari server. Silakan muat ulang halaman."
            onRetry={() => {
              refetchProdi();
              refetchFakultas();
            }}
          />
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredProdi.length === 0 && (
          <EmptyState
            title="Program Studi Tidak Ditemukan"
            description="Tidak ada program studi yang cocok dengan kriteria filter atau kata kunci pencarian yang Anda tentukan."
            actionLabel="Tampilkan Semua Program Studi"
            onAction={handleClearFilters}
          />
        )}

        {/* Data Grid: Dikelompokkan per Fakultas bila tidak difilter spesifik */}
        {!isLoading && !isError && filteredProdi.length > 0 && (
          <>
            {fakultasParam === "semua" ? (
              // Tampilan Berkelompok per Fakultas dengan Anchor Navigation
              <div className="space-y-14">
                {/* Fast Anchor Navigation Bar */}
                <div className="p-3 rounded-2xl bg-biru-50/60 border border-biru-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
                  <span className="text-xs font-bold text-biru-800 shrink-0 px-2">
                    Lompat ke Fakultas:
                  </span>
                  {fakultasList.map((f) => (
                    <a
                      key={f.id}
                      href={`#fakultas-${f.slug || f.id}`}
                      className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-putih text-biru-800 hover:text-biru-950 text-xs font-semibold border border-biru-200/80 hover:bg-biru-50 shadow-soft-xs transition-colors"
                    >
                      {f.nama_fakultas}
                    </a>
                  ))}
                </div>

                {fakultasList.map((fakultas) => {
                  const items = prodiByFakultas.get(fakultas.id) || [];
                  if (items.length === 0) return null;

                  return (
                    <section
                      key={fakultas.id}
                      id={`fakultas-${fakultas.slug || fakultas.id}`}
                      className="space-y-6 scroll-mt-28"
                    >
                      {/* Fakultas Header */}
                      <div className="border-b border-biru-100 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                        <div>
                          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-biru-600 mb-1">
                            <span>{fakultas.kode_fakultas}</span>
                            <span>&middot;</span>
                            <span>{items.length} Program Studi</span>
                          </div>
                          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
                            {fakultas.nama_fakultas}
                          </h2>
                          {fakultas.deskripsi_singkat && (
                            <p className="text-xs sm:text-sm text-biru-700 mt-1 max-w-2xl font-sans">
                              {fakultas.deskripsi_singkat}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Grid Kartu Prodi dalam Fakultas */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map((prodi) => (
                          <ProdiCard
                            key={prodi.id}
                            prodi={prodi}
                            isCompared={selectedCompare.some(
                              (p) => p.id === prodi.id,
                            )}
                            onToggleCompare={() => toggleCompare(prodi)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              // Tampilan Grid Rata saat filter fakultas dipilih
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProdi.map((prodi) => (
                  <ProdiCard
                    key={prodi.id}
                    prodi={prodi}
                    isCompared={selectedCompare.some((p) => p.id === prodi.id)}
                    onToggleCompare={() => toggleCompare(prodi)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* C5. FLOATING COMPARISON BAR (MAKSIMAL 3 PROGRAM STUDI) */}
      {selectedCompare.length > 0 && (
        <aside
          role="region"
          aria-label="Panel Perbandingan Program Studi"
          className="fixed bottom-0 left-0 right-0 z-40 bg-biru-950/95 backdrop-blur-md border-t border-biru-800 text-putih px-4 py-3 shadow-2xl animate-in slide-in-from-bottom duration-200"
        >
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-biru-200 shrink-0">
                <Scale className="w-4 h-4 text-biru-400" />
                <span>
                  Bandingkan Prodi (
                  <strong className="text-putih font-bold tabular-nums">
                    {selectedCompare.length}
                  </strong>
                  /3):
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedCompare.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-biru-900 border border-biru-700 text-xs text-putih font-medium"
                  >
                    <span>
                      {item.jenjang} {item.nama_prodi}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCompare(item)}
                      className="text-biru-400 hover:text-putih p-0.5"
                      aria-label={`Hapus ${item.nama_prodi} dari perbandingan`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setSelectedCompare([])}
                className="text-xs text-biru-300 hover:text-putih px-3 py-1.5 transition-colors"
              >
                Hapus Semua
              </button>
              <Link
                to={`/program-studi/bandingkan?ids=${selectedCompare
                  .map((p) => p.id)
                  .join(",")}`}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-biru-500 to-biru-600 hover:from-biru-400 hover:to-biru-500 text-putih text-xs font-bold shadow-soft-sm transition-all"
                >
                  <span>Buka Pembanding</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

/**
 * Komponen Kartu Program Studi Terstandarisasi (C4)
 * Menjamin keseragaman tinggi, tipografi terukur, dan data fakta 2x2.
 */
interface ProdiCardProps {
  prodi: ProdiResponse;
  isCompared: boolean;
  onToggleCompare: () => void;
}

const ProdiCard: React.FC<ProdiCardProps> = ({
  prodi,
  isCompared,
  onToggleCompare,
}) => {
  const prodiDetailPath = `/program-studi/${prodi.slug || prodi.id}`;
  const registerPath = `/register?prodi=${prodi.kode_singkat || prodi.kode_prodi}`;

  return (
    <article className="group flex flex-col justify-between rounded-2xl bg-putih border border-biru-100 hover:border-biru-300 shadow-soft-xs hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-200 p-6">
      <div className="space-y-4">
        {/* Top Badges & Checkbox Bandingkan */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-biru-100 text-biru-950 font-bold text-xs">
              {prodi.jenjang} &middot; {prodi.kode_singkat || prodi.kode_prodi}
            </span>
            {prodi.akreditasi && (
              <span className="px-2 py-0.5 rounded-md bg-biru-50 text-biru-800 border border-biru-200/80 text-[11px] font-semibold">
                {prodi.akreditasi}
              </span>
            )}
          </div>

          <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-biru-700 hover:text-biru-950 select-none">
            <input
              type="checkbox"
              checked={isCompared}
              onChange={onToggleCompare}
              className="h-3.5 w-3.5 rounded border-biru-300 text-biru-700 focus:ring-biru-500"
            />
            <span>Bandingkan</span>
          </label>
        </div>

        {/* Nama Prodi & Gelar */}
        <div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-biru-950 group-hover:text-biru-700 transition-colors">
            <Link to={prodiDetailPath}>{prodi.nama_prodi}</Link>
          </h3>
          <p className="text-xs text-biru-700 font-medium mt-0.5">
            {prodi.gelar ? `${prodi.gelar} \u00B7 ` : ""}
            {prodi.fakultas}
          </p>
        </div>

        {/* Deskripsi Singkat */}
        <p className="text-xs sm:text-sm text-biru-900/80 leading-relaxed font-sans line-clamp-2">
          {prodi.deskripsi_singkat ||
            "Program studi unggulan berbasis industri dengan kurikulum terpadu dan pembinaan profesional siap kerja."}
        </p>

        {/* 2x2 Facts Grid (Masa Studi, Daya Tampung, Biaya UKT, Gelar) */}
        <div className="pt-2 border-t border-biru-100 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-biru-50/60 border border-biru-100/70">
            <span className="text-biru-700 block text-[11px] font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-biru-600" />
              Lama Studi
            </span>
            <span className="font-bold text-biru-950 block mt-0.5 font-sans tabular-nums">
              {formatLamaStudi(prodi.lama_studi_semester, prodi.jenjang)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-biru-50/60 border border-biru-100/70">
            <span className="text-biru-700 block text-[11px] font-medium flex items-center gap-1">
              <Users className="w-3 h-3 text-biru-600" />
              Daya Tampung
            </span>
            <span className="font-bold text-biru-950 block mt-0.5 font-sans tabular-nums">
              {formatDayaTampung(prodi.daya_tampung)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-biru-50/60 border border-biru-100/70 col-span-2">
            <span className="text-biru-700 block text-[11px] font-medium">
              Biaya UKT / Smt:
            </span>
            <span className="font-bold text-biru-950 block mt-0.5 font-sans tabular-nums text-sm">
              {prodi.biaya_ukt_min
                ? `${formatRupiah(prodi.biaya_ukt_min)} / semester`
                : "Segera diumumkan"}
            </span>
          </div>
        </div>

        {/* Prospek Karier Chips */}
        {prodi.prospek_karier && prodi.prospek_karier.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-biru-900 block flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-biru-600" />
              Peluang Karier Lulusan:
            </span>
            <div className="flex flex-wrap gap-1">
              {prodi.prospek_karier.slice(0, 3).map((karier, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-biru-50 text-biru-900 text-[11px] font-medium border border-biru-200/70 truncate max-w-[200px]"
                >
                  {karier}
                </span>
              ))}
              {prodi.prospek_karier.length > 3 && (
                <span className="px-1.5 py-0.5 text-[10px] text-biru-600 font-semibold self-center">
                  +{prodi.prospek_karier.length - 3} lainnya
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons Footer */}
      <div className="pt-5 mt-5 border-t border-biru-100 flex items-center gap-2">
        <Link to={prodiDetailPath} className="flex-1">
          <button
            type="button"
            className="w-full h-10 px-3 rounded-xl border border-biru-800 text-biru-800 hover:bg-biru-50 hover:text-biru-950 text-xs font-semibold transition-colors"
          >
            Detail Prodi
          </button>
        </Link>
        <Link to={registerPath} className="flex-1">
          <button
            type="button"
            className="w-full h-10 px-3 rounded-xl bg-gradient-to-r from-biru-700 to-biru-600 hover:from-biru-800 hover:to-biru-700 text-putih text-xs font-bold shadow-soft-sm inline-flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Daftar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </article>
  );
};
