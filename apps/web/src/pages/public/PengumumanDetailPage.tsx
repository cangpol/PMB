import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, User, ArrowLeft, Share2, Tag } from "lucide-react";
import {
  Button,
  Card,
  CardSkeleton,
  ErrorState,
} from "../../components/common";
import { SeoHead } from "../../components/common/SeoHead";
import type { components } from "../../types/api";

type CmsPost = components["schemas"]["CmsPostResponse"];

const FALLBACK_POSTS: Record<string, Partial<CmsPost>> = {
  "penerimaan-mahasiswa-baru-2026-resmi-dibuka": {
    judul: "Pendaftaran Mahasiswa Baru T.A. 2026/2027 Resmi Dibuka",
    kategori: "PENGUMUMAN",
    ringkasan:
      "Universitas Pignatelli Triputra membuka kesempatan emas bagi calon mahasiswa baru berprestasi untuk bergabung pada Gelombang 1.",
    konten: `<h2>Selamat Datang Calon Pemimpin Masa Depan!</h2>
<p>Universitas Pignatelli Triputra (UPITRA) secara resmi membuka Penerimaan Mahasiswa Baru (PMB) untuk Tahun Akademik 2026/2027. Tersedia berbagai jalur masuk unggulan mulai dari Jalur Reguler (Tes CBT Mandiri), Jalur Prestasi Rapor, Beasiswa Penuh Kemitraan Triputra Group, hingga Rekognisi Pembelajaran Lampau (RPL).</p>
<h3>Jadwal Penting Gelombang 1:</h3>
<ul>
  <li><strong>Periode Pendaftaran:</strong> 1 Mei 2026 s.d. 31 Juli 2026</li>
  <li><strong>Pelaksanaan Ujian CBT:</strong> Fleksibel mandiri secara daring</li>
  <li><strong>Pengumuman Kelulusan:</strong> 1x24 jam setelah ujian</li>
  <li><strong>Batas Daftar Ulang & Terbit NIM:</strong> 15 Agustus 2026</li>
</ul>
<p>Dapatkan potongan Dana Pengembangan Pendidikan (DPP) sebesar Rp 2.000.000 khusus bagi pendaftar di Gelombang 1!</p>`,
    author_nama: "Humas PMB UPITRA",
    published_at: "2026-11-01T08:00:00Z",
    tags: ["PMB 2026", "Gelombang 1", "Pendaftaran"],
  },
};

export const PengumumanDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const {
    data: post,
    isLoading,
    isError,
  } = useQuery<CmsPost>({
    queryKey: ["cms-post-detail", slug],
    queryFn: async () => {
      const res = await fetch(`/api/cms/posts/${slug}`);
      if (!res.ok) {
        // Fallback jika API belum seed artikel ini
        if (slug && FALLBACK_POSTS[slug]) {
          return FALLBACK_POSTS[slug] as CmsPost;
        }
        throw new Error("Artikel tidak ditemukan");
      }
      return res.json();
    },
    enabled: !!slug,
  });

  const displayPost =
    post ||
    (slug && FALLBACK_POSTS[slug] ? (FALLBACK_POSTS[slug] as CmsPost) : null);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: displayPost?.judul || "Pengumuman PMB UPITRA",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Tautan artikel berhasil disalin ke clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[850px] mx-auto px-4 py-16 space-y-6">
        <CardSkeleton className="h-10 w-3/4" />
        <CardSkeleton className="h-6 w-1/3" />
        <CardSkeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!displayPost || isError) {
    return (
      <div className="max-w-[850px] mx-auto px-4 py-16">
        <ErrorState
          title="Pengumuman Tidak Ditemukan"
          message="Artikel atau pengumuman yang Anda cari tidak tersedia atau telah diarsipkan."
          retryLabel="Kembali ke Berita & Pengumuman"
          onRetry={() => window.history.back()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <SeoHead
        title={displayPost.judul}
        description={displayPost.ringkasan}
        ogType="article"
      />

      {/* Header Artikel */}
      <section className="bg-gradient-to-br from-biru-950 via-biru-900 to-biru-800 text-putih py-14 border-b border-biru-800">
        <div className="max-w-[850px] mx-auto px-4 sm:px-6 space-y-4">
          <Link
            to="/pengumuman"
            className="inline-flex items-center gap-1.5 text-xs text-biru-300 hover:text-putih transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Semua Berita &amp; Pengumuman</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-800 text-biru-200 border border-biru-700">
              {displayPost.kategori}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-biru-300">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {new Date(displayPost.published_at).toLocaleDateString(
                  "id-ID",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-biru-300">
              <User className="w-3.5 h-3.5" />
              <span>{displayPost.author_nama || "Humas PMB"}</span>
            </div>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-putih leading-tight">
            {displayPost.judul}
          </h1>

          <p className="text-sm sm:text-base text-biru-100 font-sans leading-relaxed">
            {displayPost.ringkasan}
          </p>
        </div>
      </section>

      {/* Konten Artikel Utama */}
      <section className="max-w-[850px] mx-auto px-4 sm:px-6">
        <Card className="p-6 sm:p-10 border-biru-200 shadow-soft-sm space-y-8">
          {displayPost.gambar_url && (
            <div className="rounded-2xl overflow-hidden border border-biru-100">
              <img
                src={displayPost.gambar_url}
                alt={displayPost.judul}
                className="w-full h-auto max-h-[450px] object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Isi Konten HTML (Sudah Disanitasi di Server) */}
          <div
            className="prose prose-biru max-w-none text-sm text-biru-900 leading-relaxed font-sans space-y-4"
            dangerouslySetInnerHTML={{ __html: displayPost.konten }}
          />

          {/* Tags */}
          {displayPost.tags && displayPost.tags.length > 0 && (
            <div className="pt-6 border-t border-biru-100 flex flex-wrap items-center gap-2">
              <Tag className="w-4 h-4 text-biru-600" />
              {displayPost.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-biru-50 text-biru-800 border border-biru-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Share & Callout */}
          <div className="pt-4 border-t border-biru-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 text-xs font-bold text-biru-800 hover:text-biru-950 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Bagikan Pengumuman</span>
            </button>
            <Link to="/register">
              <Button variant="primary" size="sm" className="text-xs font-bold">
                Daftar PMB Sekarang &rarr;
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
};
