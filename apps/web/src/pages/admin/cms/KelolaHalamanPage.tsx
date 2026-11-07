import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Save } from "lucide-react";
import {
  Button,
  Card,
  CardSkeleton,
  StatusBadge,
  ErrorState,
} from "../../../components/common";
import { SeoHead } from "../../../components/common/SeoHead";
import type { components } from "../../../types/api";
import { useDialog } from "@/components/ui/useDialog";

type CmsPage = components["schemas"]["CmsPageResponse"];

export const KelolaHalamanPage: React.FC = () => {
  const dialog = useDialog();
  const queryClient = useQueryClient();
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);

  const [form, setForm] = useState({
    judul: "",
    konten: "",
    meta_title: "",
    meta_description: "",
    is_published: true,
  });

  const {
    data: pages,
    isLoading,
    isError,
    refetch,
  } = useQuery<CmsPage[]>({
    queryKey: ["admin-cms-pages"],
    queryFn: async () => {
      const res = await fetch("/api/cms/admin/pages");
      if (!res.ok) throw new Error("Gagal mengambil halaman statis");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: typeof form;
    }) => {
      const res = await fetch(`/api/cms/admin/pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Gagal memperbarui halaman");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-pages"] });
      void dialog.hasil({
        nada: "sukses",
        judul: "Halaman diperbarui",
        deskripsi: "Perubahan halaman berhasil disimpan.",
        autoTutupMs: 2200,
      });
      setEditingPage(null);
    },
  });

  const openEdit = (p: CmsPage) => {
    setEditingPage(p);
    setForm({
      judul: p.judul,
      konten: p.konten,
      meta_title: p.meta_title || "",
      meta_description: p.meta_description || "",
      is_published: p.is_published,
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <SeoHead title="Kelola Halaman Statis & Kebijakan | Admin CMS PMB" />

      {/* Header */}
      <div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-100 text-biru-800">
          CMS Publik
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-1">
          Halaman Statis &amp; Dokumen Kebijakan
        </h1>
        <p className="text-xs text-biru-700 font-sans mt-0.5">
          Kelola konten resmi Syarat &amp; Ketentuan, Kebijakan Privasi, dan
          Profil Kampus.
        </p>
      </div>

      {editingPage ? (
        /* Form Editor Halaman Statis */
        <Card className="p-6 sm:p-8 border-biru-200 shadow-soft-sm space-y-6">
          <div className="flex items-center justify-between border-b border-biru-100 pb-4">
            <div>
              <span className="text-xs font-mono text-biru-600 font-bold uppercase">
                /{editingPage.slug}
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-biru-950">
                Edit Halaman: {editingPage.judul}
              </h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingPage(null)}
                className="text-xs"
              >
                Kembali
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  updateMutation.mutate({ id: editingPage.id, payload: form })
                }
                disabled={updateMutation.isPending}
                className="text-xs font-bold gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>
                  {updateMutation.isPending
                    ? "Menyimpan..."
                    : "Simpan Perubahan"}
                </span>
              </Button>
            </div>
          </div>

          <div className="space-y-4 text-xs font-sans">
            <div>
              <label className="block font-bold text-biru-950 mb-1">
                Judul Halaman: *
              </label>
              <input
                type="text"
                required
                value={form.judul}
                onChange={(e) => setForm({ ...form, judul: e.target.value })}
                className="w-full rounded-xl border border-biru-200 px-3.5 py-2.5 text-xs text-biru-950 focus:border-biru-600 focus:outline-none font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-biru-950 mb-1">
                  SEO Meta Title:
                </label>
                <input
                  type="text"
                  value={form.meta_title}
                  onChange={(e) =>
                    setForm({ ...form, meta_title: e.target.value })
                  }
                  placeholder="Judul untuk mesin pencari Google"
                  className="w-full rounded-xl border border-biru-200 px-3 py-2 text-xs focus:border-biru-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-biru-950 mb-1">
                  SEO Meta Description:
                </label>
                <input
                  type="text"
                  value={form.meta_description}
                  onChange={(e) =>
                    setForm({ ...form, meta_description: e.target.value })
                  }
                  placeholder="Deskripsi singkat untuk Google search"
                  className="w-full rounded-xl border border-biru-200 px-3 py-2 text-xs focus:border-biru-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-biru-950 mb-1">
                Konten Halaman (HTML): *
              </label>
              <textarea
                rows={14}
                required
                value={form.konten}
                onChange={(e) => setForm({ ...form, konten: e.target.value })}
                className="w-full rounded-xl border border-biru-200 p-3.5 text-xs font-mono text-biru-950 focus:border-biru-600 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-biru-950">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) =>
                    setForm({ ...form, is_published: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-biru-300 text-biru-800"
                />
                <span>Halaman Terpublikasi Aktif</span>
              </label>
            </div>
          </div>
        </Card>
      ) : (
        /* Tabel Daftar Halaman */
        <Card className="border-biru-200 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <CardSkeleton className="h-6 w-full" />
              <CardSkeleton className="h-6 w-full" />
            </div>
          ) : isError ? (
            <div className="p-8">
              <ErrorState
                title="Gagal Memuat Halaman Statis"
                message="Terjadi gangguan saat mengambil data halaman statis dari server."
                retryLabel="Coba Lagi"
                onRetry={() => {
                  void refetch();
                }}
              />
            </div>
          ) : !pages || pages.length === 0 ? (
            <div className="p-10 text-center text-xs text-biru-700">
              Belum ada halaman statis yang terdaftar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-biru-200 bg-biru-50/70 text-biru-950 font-bold">
                    <th className="py-3 px-4">Judul Halaman</th>
                    <th className="py-3 px-3">Slug URL</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Terakhir Diperbarui</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-biru-100 text-biru-800 font-sans">
                  {pages.map((page) => (
                    <tr key={page.id} className="hover:bg-biru-50/40">
                      <td className="py-3 px-4">
                        <strong className="font-bold text-biru-950 block text-sm">
                          {page.judul}
                        </strong>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-biru-700">
                        /{page.slug}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StatusBadge
                          status={page.is_published ? "TERVERIFIKASI" : "DRAFT"}
                          label={page.is_published ? "Publik" : "Draf"}
                        />
                      </td>
                      <td className="py-3 px-3 text-biru-700">
                        {new Date(page.updated_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-biru-600 hover:text-biru-950 hover:bg-biru-100 transition-colors"
                            title="Buka Halaman Publik"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(page)}
                            className="text-xs font-semibold py-1 px-3"
                          >
                            Edit Konten
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
