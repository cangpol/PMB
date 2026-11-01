import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  Button,
  Card,
  StatusBadge,
  CardSkeleton,
  ErrorState,
} from "../../../components/common";
import { SeoHead } from "../../../components/common/SeoHead";
import type { components } from "../../../types/api";

type CmsPost = components["schemas"]["CmsPostResponse"];

export const KelolaBeritaPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const {
    data: posts,
    isLoading,
    isError,
    refetch,
  } = useQuery<CmsPost[]>({
    queryKey: ["admin-cms-posts"],
    queryFn: async () => {
      const res = await fetch("/api/cms/admin/posts");
      if (!res.ok) throw new Error("Gagal memuat artikel CMS");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cms/admin/posts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus artikel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-posts"] });
    },
  });

  const handleDelete = (id: string, judul: string) => {
    if (
      window.confirm(`Apakah Anda yakin ingin menghapus artikel "${judul}"?`)
    ) {
      deleteMutation.mutate(id);
    }
  };

  const filteredPosts = (posts || []).filter((p) => {
    const matchesCategory =
      selectedCategory === "ALL" || p.kategori === selectedCategory;
    const matchesSearch =
      p.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ringkasan.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <SeoHead title="Kelola Berita & Pengumuman | Admin CMS PMB" />

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-100 text-biru-800">
              CMS Publik
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-1">
            Kelola Berita &amp; Pengumuman PMB
          </h1>
          <p className="text-xs text-biru-700 font-sans mt-0.5">
            Publikasikan pengumuman seleksi, berita kegiatan akademik, dan
            panduan calon mahasiswa.
          </p>
        </div>

        <Link to="/admin/cms/berita/baru">
          <Button
            variant="primary"
            size="sm"
            className="text-xs font-bold gap-1.5 shadow-soft-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Artikel Baru</span>
          </Button>
        </Link>
      </div>

      {/* Filter & Pencarian */}
      <Card className="p-4 border-biru-200">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-biru-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan judul atau ringkasan..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-biru-200 text-xs text-biru-950 focus:border-biru-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-44 rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs text-biru-950 focus:border-biru-600 focus:outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="PENGUMUMAN">Pengumuman</option>
              <option value="BERITA">Berita Kampus</option>
              <option value="BEASISWA">Beasiswa</option>
              <option value="PANDUAN">Panduan PMB</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Daftar Tabel Artikel */}
      <Card className="border-biru-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <CardSkeleton className="h-6 w-full" />
            <CardSkeleton className="h-6 w-full" />
            <CardSkeleton className="h-6 w-full" />
          </div>
        ) : isError ? (
          <div className="p-8">
            <ErrorState
              title="Gagal Memuat Berita & Pengumuman"
              message="Terjadi gangguan saat mengambil data artikel dari server."
              retryLabel="Coba Lagi"
              onRetry={() => {
                void refetch();
              }}
            />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <FileText className="w-10 h-10 text-biru-400 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-biru-950">
              Belum Ada Artikel
            </h3>
            <p className="text-xs text-biru-700">
              Mulai buat artikel atau pengumuman pertama Anda.
            </p>
            <Link to="/admin/cms/berita/baru">
              <Button variant="primary" size="sm" className="text-xs mt-2">
                Buat Artikel Sekarang
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-biru-200 bg-biru-50/70 text-biru-950 font-bold">
                  <th className="py-3 px-4">Judul &amp; Slug</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Penulis</th>
                  <th className="py-3 px-3">Tanggal Terbit</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-biru-100 text-biru-800 font-sans">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-biru-50/40">
                    <td className="py-3 px-4 max-w-sm">
                      <strong className="font-bold text-biru-950 block text-sm line-clamp-1">
                        {post.judul}
                      </strong>
                      <span className="text-[11px] text-biru-600 font-mono block">
                        /{post.slug}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-biru-100 text-biru-800">
                        {post.kategori}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge
                        status={post.is_published ? "TERVERIFIKASI" : "DRAFT"}
                        label={post.is_published ? "Publik" : "Draf"}
                      />
                    </td>
                    <td className="py-3 px-3 text-biru-700">
                      {post.author_nama}
                    </td>
                    <td className="py-3 px-3 text-biru-700">
                      {new Date(post.published_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/pengumuman/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-biru-600 hover:text-biru-950 hover:bg-biru-100 transition-colors"
                          title="Pratinjau Publik"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/cms/berita/${post.id}`}
                          className="p-1.5 rounded-lg text-biru-700 hover:text-biru-950 hover:bg-biru-100 transition-colors"
                          title="Edit Artikel"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id, post.judul)}
                          className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors"
                          title="Hapus Artikel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
