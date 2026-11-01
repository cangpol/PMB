import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Calendar, Search, ArrowRight } from "lucide-react";
import {
  Card,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";
import { SeoHead } from "../../components/common/SeoHead";
import type { components } from "../../types/api";

type CmsPost = components["schemas"]["CmsPostResponse"];

interface PengumumanItem {
  id: string;
  slug: string;
  judul: string;
  kategori: string;
  ringkasan: string;
  tanggal: string;
  gambar_url?: string;
  author_nama?: string;
}

const DAFTAR_PENGUMUMAN_FALLBACK: PengumumanItem[] = [
  {
    id: "1",
    slug: "penerimaan-mahasiswa-baru-2026-resmi-dibuka",
    judul:
      "Pembukaan Pendaftaran Mahasiswa Baru Gelombang 1 Tahun Akademik 2026/2027",
    kategori: "PENGUMUMAN",
    ringkasan:
      "Pendaftaran gelombang pertama resmi dibuka mulai 1 Oktober 2026 hingga 31 Desember 2026 dengan kuota beasiswa early bird.",
    tanggal: "01 Oktober 2026",
    author_nama: "Humas PMB",
  },
  {
    id: "2",
    slug: "beasiswa-prestasi-triputra-group",
    judul: "Program Beasiswa Penuh Kemitraan Triputra Group 2026",
    kategori: "BEASISWA",
    ringkasan:
      "Peluang beasiswa kuliah bebas UKT 100% dan penempatan kerja prioritas bagi 50 pendaftar terbaik jalur prestasi.",
    tanggal: "15 Oktober 2026",
    author_nama: "Panitia Beasiswa",
  },
  {
    id: "3",
    slug: "panduan-teknis-cbt-online",
    judul: "Petunjuk Teknis Pelaksanaan Ujian CBT Daring PMB 2026",
    kategori: "PANDUAN",
    ringkasan:
      "Tata tertib, spesifikasi perangkat minimal, dan simulasi pengerjaan tes potensi akademik daring calon mahasiswa.",
    tanggal: "20 Oktober 2026",
    author_nama: "Tim CBT",
  },
];

export const PengumumanPage: React.FC = () => {
  const [selectedKategori, setSelectedKategori] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const {
    data: postsData,
    isLoading,
    isError,
    refetch,
  } = useQuery<CmsPost[]>({
    queryKey: ["cms-posts-public-list"],
    queryFn: async () => {
      const res = await fetch("/api/cms/posts");
      if (!res.ok) throw new Error("Gagal mengambil data warta pengumuman");
      return res.json();
    },
  });

  const displayList: PengumumanItem[] =
    postsData && postsData.length > 0
      ? postsData.map((p) => ({
          id: p.id,
          slug: p.slug,
          judul: p.judul,
          kategori: p.kategori,
          ringkasan: p.ringkasan,
          tanggal: new Date(p.published_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          gambar_url: p.gambar_url || undefined,
          author_nama: p.author_nama,
        }))
      : DAFTAR_PENGUMUMAN_FALLBACK;

  const filteredList = displayList.filter((item) => {
    const matchesCat =
      selectedKategori === "ALL" ||
      item.kategori.toUpperCase() === selectedKategori.toUpperCase();
    const matchesQuery =
      item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ringkasan.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="bg-biru-50/30 flex flex-col min-h-screen">
      <SeoHead
        title="Warta PMB & Pengumuman Resmi | UPITRA"
        description="Pusat informasi dan pengumuman resmi Penerimaan Mahasiswa Baru Universitas Pignatelli Triputra."
      />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biru-100 text-biru-900 text-xs font-semibold">
            <Bell className="w-4 h-4 text-biru-700" />
            <span>Pusat Informasi &amp; Pengumuman Resmi</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-biru-950">
            Warta PMB &amp; Panduan Mahasiswa Baru
          </h1>
          <p className="text-base text-biru-800/90 leading-relaxed font-light">
            Temukan informasi jadwal gelombang, panduan teknis CBT, pengumuman
            beasiswa Triputra, dan artikel resmi kampus.
          </p>
        </div>

        {/* Filter Bar & Pencarian */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-biru-50/70 border border-biru-100">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {["ALL", "PENGUMUMAN", "BEASISWA", "BERITA", "PANDUAN"].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedKategori(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedKategori === cat
                      ? "bg-biru-700 text-putih shadow-xs"
                      : "bg-putih text-biru-900 border border-biru-200 hover:bg-biru-100"
                  }`}
                >
                  {cat === "ALL" ? "Semua Topik" : cat}
                </button>
              ),
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-biru-600" />
            <input
              type="text"
              placeholder="Cari pengumuman..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-putih border border-biru-200 text-xs text-biru-950 placeholder:text-biru-400 focus:outline-none focus:border-biru-600"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <CardSkeleton className="h-32 w-full" />
            <CardSkeleton className="h-32 w-full" />
            <CardSkeleton className="h-32 w-full" />
          </div>
        )}

        {/* Error State */}
        {isError && !postsData && (
          <ErrorState
            title="Gagal Memuat Warta Pengumuman"
            message="Terjadi gangguan saat mengambil data artikel resmi dari server."
            retryLabel="Coba Lagi"
            onRetry={() => {
              void refetch();
            }}
          />
        )}

        {/* Empty State */}
        {!isLoading && filteredList.length === 0 && (
          <EmptyState
            title="Tidak Ada Pengumuman Ditemukan"
            description={`Tidak ada artikel pengumuman yang sesuai dengan kata kunci "${searchQuery}".`}
            actionLabel="Reset Pencarian"
            onAction={() => {
              setSearchQuery("");
              setSelectedKategori("ALL");
            }}
          />
        )}

        {/* Data List */}
        {!isLoading && filteredList.length > 0 && (
          <div className="space-y-4">
            {filteredList.map((item) => (
              <Link
                key={item.id}
                to={`/pengumuman/${item.slug}`}
                className="block group"
              >
                <Card className="hover:border-biru-600 transition-all p-6 group-hover:shadow-soft-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-biru-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-biru-100 text-biru-900 text-xs font-bold border border-biru-200">
                        {item.kategori}
                      </span>
                      <span className="text-xs text-biru-800 flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-biru-700" />
                        {item.tanggal}
                      </span>
                      {item.author_nama && (
                        <span className="text-xs text-biru-600 hidden sm:inline">
                          &bull; Oleh {item.author_nama}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-biru-700 group-hover:text-biru-900 flex items-center gap-1 self-start sm:self-auto transition-colors">
                      <span>Baca Selengkapnya</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>

                  <div className="pt-3 space-y-2">
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-biru-950 group-hover:text-biru-700 transition-colors">
                      {item.judul}
                    </h3>
                    <p className="text-sm text-biru-900/80 leading-relaxed font-light">
                      {item.ringkasan}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
