import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Award,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Clock,
  Users,
  CreditCard,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import {
  getProdiBySlug,
  getProdiList,
  formatRupiah,
  formatDayaTampung,
  formatLamaStudi,
} from "../../services/prodi";
import { SeoHead } from "../../components/common/SeoHead";
import { ErrorState } from "../../components/common/ErrorState";
import { Skeleton } from "../../components/ui/Skeleton";

export const ProdiDetailPage: React.FC = () => {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const prodiIdentifier = slug || id || "";

  // Ambil detail program studi dari API
  const {
    data: prodi,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["public-prodi-detail", prodiIdentifier],
    queryFn: () => getProdiBySlug(prodiIdentifier),
    enabled: Boolean(prodiIdentifier),
  });

  // Ambil seluruh prodi untuk rekomendasi prodi se-fakultas
  const { data: allProdi = [] } = useQuery({
    queryKey: ["public-prodi-list"],
    queryFn: getProdiList,
  });

  // Rekomendasi prodi dalam fakultas yang sama
  const relatedProdi = React.useMemo(() => {
    if (!prodi) return [];
    return allProdi
      .filter((p) => p.id !== prodi.id && p.fakultas === prodi.fakultas)
      .slice(0, 3);
  }, [prodi, allProdi]);

  if (isLoading) {
    return (
      <div className="bg-putih min-h-screen py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl pt-6" />
        </div>
      </div>
    );
  }

  if (isError || !prodi) {
    return (
      <div className="bg-putih min-h-screen py-16">
        <div className="max-w-2xl mx-auto px-4">
          <ErrorState
            title="Program Studi Tidak Ditemukan"
            message={`Program studi dengan identifikasi "${prodiIdentifier}" tidak ditemukan atau belum aktif dalam sistem PMB.`}
            onRetry={() => refetch()}
          />
          <div className="text-center mt-6">
            <Link
              to="/program-studi"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-biru-700 hover:text-biru-950"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Katalog Program Studi</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const registerUrl = `/register?prodi=${prodi.kode_singkat || prodi.kode_prodi}`;

  return (
    <div className="bg-putih min-h-screen flex flex-col font-sans">
      <SeoHead
        title={`${prodi.jenjang} ${prodi.nama_prodi} - PMB Universitas Pignatelli Triputra`}
        description={
          prodi.deskripsi_singkat ||
          `Program studi ${prodi.jenjang} ${prodi.nama_prodi} di bawah ${prodi.fakultas} Universitas Pignatelli Triputra.`
        }
      />

      {/* Hero Header Section */}
      <section className="bg-gradient-to-b from-biru-50/80 via-biru-50/40 to-putih border-b border-biru-100 py-10 sm:py-14">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs text-biru-700 font-medium"
          >
            <Link to="/" className="hover:text-biru-950 transition-colors">
              Beranda
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-biru-400" />
            <Link
              to="/program-studi"
              className="hover:text-biru-950 transition-colors"
            >
              Program Studi
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-biru-400" />
            <span className="text-biru-950 font-semibold" aria-current="page">
              {prodi.nama_prodi}
            </span>
          </nav>

          {/* Judul & Gelar */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-lg bg-biru-100 text-biru-950 font-bold text-xs">
                  {prodi.jenjang} &middot; {prodi.kode_singkat || prodi.kode_prodi}
                </span>
                {prodi.akreditasi && (
                  <span className="px-2.5 py-1 rounded-lg bg-putih border border-biru-200 text-biru-800 font-semibold text-xs shadow-soft-xs">
                    {prodi.akreditasi}
                  </span>
                )}
                <span className="text-xs text-biru-700 font-medium">
                  {prodi.fakultas}
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-biru-950 leading-tight">
                {prodi.jenjang} {prodi.nama_prodi}
              </h1>

              <p className="text-sm sm:text-base text-biru-800 leading-relaxed font-normal">
                {prodi.deskripsi_singkat ||
                  "Program studi unggulan berbasis riset terapan dan kurikulum industri bersama jejaring kemitraan Triputra Group."}
              </p>
            </div>

            {/* Tombol Aksi Cepat Hero */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to={`/program-studi/bandingkan?ids=${prodi.id}`}
                className="inline-flex items-center justify-center h-11 px-4 rounded-xl border border-biru-800 text-xs font-semibold text-biru-800 hover:bg-biru-50 transition-colors"
              >
                Bandingkan Prodi
              </Link>
              <Link to={registerUrl}>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-biru-700 to-biru-600 hover:from-biru-800 hover:to-biru-700 text-putih text-xs font-bold shadow-soft-md transition-all"
                >
                  <span>Daftar Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

          {/* Strip Fakta Kunci (4 Kotak Ringkasan) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-putih border border-biru-200/90 shadow-soft-xs">
              <div className="flex items-center gap-2 text-xs text-biru-700 font-medium mb-1">
                <Clock className="w-4 h-4 text-biru-600" />
                <span>Masa Studi</span>
              </div>
              <div className="font-sans font-bold text-base sm:text-lg text-biru-950 tabular-nums">
                {formatLamaStudi(prodi.lama_studi_semester, prodi.jenjang)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-putih border border-biru-200/90 shadow-soft-xs">
              <div className="flex items-center gap-2 text-xs text-biru-700 font-medium mb-1">
                <GraduationCap className="w-4 h-4 text-biru-600" />
                <span>Gelar Lulusan</span>
              </div>
              <div className="font-sans font-bold text-base sm:text-lg text-biru-950">
                {prodi.gelar || "Segera diumumkan"}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-putih border border-biru-200/90 shadow-soft-xs">
              <div className="flex items-center gap-2 text-xs text-biru-700 font-medium mb-1">
                <Users className="w-4 h-4 text-biru-600" />
                <span>Daya Tampung</span>
              </div>
              <div className="font-sans font-bold text-base sm:text-lg text-biru-950 tabular-nums">
                {formatDayaTampung(prodi.daya_tampung)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-putih border border-biru-200/90 shadow-soft-xs">
              <div className="flex items-center gap-2 text-xs text-biru-700 font-medium mb-1">
                <CreditCard className="w-4 h-4 text-biru-600" />
                <span>Biaya UKT / Smt</span>
              </div>
              <div className="font-sans font-bold text-base sm:text-lg text-biru-950 tabular-nums">
                {prodi.biaya_ukt_min
                  ? formatRupiah(prodi.biaya_ukt_min)
                  : "Segera diumumkan"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Konten Rinci Berbasis Kartu & Grid */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Kolom Kiri: Uraian Program & Kompetensi (2 Kolom) */}
          <div className="lg:col-span-2 space-y-10">
            {/* 1. Tentang Program Studi */}
            <section className="space-y-4 rounded-2xl bg-putih border border-biru-100 p-6 sm:p-8 shadow-soft-xs">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-biru-600" />
                <h2 className="font-serif text-2xl font-bold text-biru-950">
                  Tentang Program Studi
                </h2>
              </div>
              <p className="text-sm sm:text-base text-biru-900/90 leading-relaxed font-sans">
                {prodi.tentang_prodi ||
                  prodi.deskripsi_singkat ||
                  "Program studi ini dirancang untuk menjawab kebutuhan talenta profesional terampil dengan fondasi keilmuan yang kokoh dan pembentukan integritas karakter unggul."}
              </p>
            </section>

            {/* 2. Kompetensi Utama Lulusan */}
            <section className="space-y-4 rounded-2xl bg-putih border border-biru-100 p-6 sm:p-8 shadow-soft-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-biru-600" />
                <h2 className="font-serif text-2xl font-bold text-biru-950">
                  Kompetensi Utama Lulusan
                </h2>
              </div>
              {prodi.kompetensi_lulusan &&
              prodi.kompetensi_lulusan.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {prodi.kompetensi_lulusan.map((komp, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-biru-50/60 border border-biru-100"
                    >
                      <CheckCircle2 className="w-4 h-4 text-biru-600 shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-biru-900 font-medium">
                        {komp}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-biru-600 italic">
                  Daftar kompetensi kurikulum resmi sedang dalam sinkronisasi
                  dan akan segera diumumkan.
                </p>
              )}
            </section>

            {/* 3. Prospek Karier Industri */}
            <section className="space-y-4 rounded-2xl bg-putih border border-biru-100 p-6 sm:p-8 shadow-soft-xs">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-biru-600" />
                <h2 className="font-serif text-2xl font-bold text-biru-950">
                  Peluang Karier & Jalur Industri
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-biru-800 font-sans">
                Lulusan memiliki kesempatan magang terarah dan rekrutmen jalur
                prioritas di unit bisnis kemitraan Triputra Group serta jejaring
                industri multinasional:
              </p>
              {prodi.prospek_karier && prodi.prospek_karier.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {prodi.prospek_karier.map((karier, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-1.5 rounded-xl bg-biru-50 text-biru-950 text-xs font-semibold border border-biru-200 shadow-soft-xs"
                    >
                      {karier}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-biru-600 italic">
                  Prospek karier lulusan akan segera diumumkan.
                </p>
              )}
            </section>

            {/* 4. Fasilitas & Laboratorium */}
            <section className="space-y-4 rounded-2xl bg-putih border border-biru-100 p-6 sm:p-8 shadow-soft-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-biru-600" />
                <h2 className="font-serif text-2xl font-bold text-biru-950">
                  Fasilitas & Laboratorium Pendukung
                </h2>
              </div>
              {prodi.fasilitas && prodi.fasilitas.length > 0 ? (
                <ul className="space-y-2 pt-1">
                  {prodi.fasilitas.map((f, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2.5 text-xs sm:text-sm text-biru-900 font-medium"
                    >
                      <div className="w-2 h-2 rounded-full bg-biru-600 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-biru-600 italic">
                  Fasilitas laboratorium terpadu sedang dalam persiapan rilis.
                </p>
              )}
            </section>
          </div>

          {/* Kolom Kanan: Card Pendaftaran & Biaya */}
          <div className="space-y-6">
            <div className="rounded-2xl border-2 border-biru-200 bg-biru-50/40 p-6 sm:p-8 space-y-6 shadow-soft-sm sticky top-28">
              <div className="space-y-2">
                <span className="px-2.5 py-1 rounded-md bg-biru-100 text-biru-950 font-bold text-xs inline-block">
                  Pendaftaran T.A. 2026/2027
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-biru-950">
                  Daftar ke Program Studi Ini
                </h3>
                <p className="text-xs text-biru-700 leading-relaxed font-sans">
                  Dapatkan bimbingan pendaftaran langsung, opsi beasiswa, dan
                  fleksibilitas jadwal seleksi online.
                </p>
              </div>

              {/* Rincian Finansial Transparan */}
              <div className="border-y border-biru-200 py-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-biru-800">Biaya Formulir CBT:</span>
                  <span className="font-bold text-biru-950 tabular-nums">
                    Rp 250.000
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-biru-800">Uang Gedung (SPI):</span>
                  <span className="font-bold text-biru-700">
                    Bebas Uang Gedung (Rp 0)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-biru-800">Perkiraan UKT / Smt:</span>
                  <span className="font-bold text-biru-950 tabular-nums text-sm">
                    {prodi.biaya_ukt_min
                      ? formatRupiah(prodi.biaya_ukt_min)
                      : "Segera diumumkan"}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <Link to={registerUrl} className="block">
                  <button
                    type="button"
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-biru-700 to-biru-600 hover:from-biru-800 hover:to-biru-700 text-putih text-xs font-bold shadow-soft-md inline-flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Daftar Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link to="/biaya" className="block text-center">
                  <span className="text-xs font-semibold text-biru-700 hover:text-biru-950 hover:underline">
                    Pelajari Rincian Skema Biaya & Cicilan &rarr;
                  </span>
                </Link>
              </div>

              <div className="pt-2 text-[11px] text-biru-600 flex items-center gap-1.5 border-t border-biru-200/60">
                <ShieldCheck className="w-4 h-4 text-biru-500 shrink-0" />
                <span>
                  Didukung program beasiswa prestasi & kemitraan Triputra Group
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rekomendasi Program Studi Se-Fakultas */}
        {relatedProdi.length > 0 && (
          <section className="pt-8 border-t border-biru-100 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-biru-950">
                  Program Studi Lain di {prodi.fakultas}
                </h2>
                <p className="text-xs text-biru-700 mt-0.5">
                  Jelajahi program studi sejenis dalam lingkup fakultas yang sama
                </p>
              </div>
              <Link
                to={`/program-studi?fakultas=${prodi.fakultas_id || ""}`}
                className="text-xs font-bold text-biru-700 hover:text-biru-950 hover:underline hidden sm:inline"
              >
                Lihat Semua &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedProdi.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-biru-100 bg-putih p-5 space-y-3 hover:border-biru-300 hover:shadow-soft-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-biru-100 text-biru-950">
                      {p.jenjang}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-biru-950">
                      <Link to={`/program-studi/${p.slug || p.id}`}>
                        {p.nama_prodi}
                      </Link>
                    </h3>
                    <p className="text-xs text-biru-800 line-clamp-2">
                      {p.deskripsi_singkat ||
                        "Program studi unggulan berbasis industri."}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-biru-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-biru-950 tabular-nums">
                      {p.biaya_ukt_min
                        ? formatRupiah(p.biaya_ukt_min)
                        : "Segera diumumkan"}
                    </span>
                    <Link
                      to={`/program-studi/${p.slug || p.id}`}
                      className="text-xs font-bold text-biru-700 hover:text-biru-950 hover:underline"
                    >
                      Detail &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
