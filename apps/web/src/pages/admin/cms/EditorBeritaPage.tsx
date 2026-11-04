import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Upload } from "lucide-react";
import {
  Button,
  Card,
  CardSkeleton,
  ErrorState,
} from "../../../components/common";
import { SeoHead } from "../../../components/common/SeoHead";
import type { components } from "../../../types/api";

type CmsPost = components["schemas"]["CmsPostResponse"];
type CreatePostReq = components["schemas"]["CreateCmsPostRequest"];

export const EditorBeritaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "baru";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<
    CreatePostReq & { is_published: boolean }
  >({
    judul: "",
    kategori: "PENGUMUMAN",
    ringkasan: "",
    konten: "",
    gambar_url: "",
    tags: [],
    is_published: true,
  });

  const [tagInput, setTagInput] = useState("");
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [uploadLoading, setUploadLoading] = useState(false);
  const contentEditorRef = useRef<HTMLTextAreaElement>(null);

  // Fetch post data jika mode Edit
  const {
    data: existingPost,
    isLoading,
    isError,
    refetch,
  } = useQuery<CmsPost>({
    queryKey: ["admin-cms-post-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/cms/admin/posts/${id}`);
      if (!res.ok) throw new Error("Gagal mengambil data artikel");
      return res.json();
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (existingPost) {
      setFormData({
        judul: existingPost.judul,
        kategori: existingPost.kategori,
        ringkasan: existingPost.ringkasan,
        konten: existingPost.konten,
        gambar_url: existingPost.gambar_url || "",
        tags: existingPost.tags || [],
        is_published: existingPost.is_published,
      });
    }
  }, [existingPost]);

  const saveMutation = useMutation({
    mutationFn: async (payload: CreatePostReq) => {
      const url = isNew ? "/api/cms/admin/posts" : `/api/cms/admin/posts/${id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Gagal menyimpan artikel" }));
        throw new Error(err.message || "Gagal menyimpan artikel");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-posts"] });
      alert("Artikel berhasil disimpan!");
      navigate("/admin/cms/berita");
    },
    onError: (err: Error) => {
      alert(`Error: ${err.message}`);
    },
  });

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tagToRemove) || [],
    });
  };

  const insertFormatting = (before: string, after = "", placeholder = "") => {
    const editor = contentEditorRef.current;
    const content = formData.konten;
    const start = editor?.selectionStart ?? content.length;
    const end = editor?.selectionEnd ?? content.length;
    const selectedText = content.slice(start, end);
    const insertion = `${before}${selectedText || placeholder}${after}`;
    const updatedContent =
      content.slice(0, start) + insertion + content.slice(end);

    setFormData((prev) => ({ ...prev, konten: updatedContent }));
    requestAnimationFrame(() => {
      editor?.focus();
      const cursorPosition = start + insertion.length;
      editor?.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  // Upload gambar featured ke S3 via Presigned URL
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const TIPE_OK = ["image/png", "image/jpeg", "image/webp"];
    if (!TIPE_OK.includes(file.type)) {
      alert("Format gambar harus PNG, JPG, atau WEBP.");
      input.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 5 MB.");
      input.value = "";
      return;
    }

    try {
      setUploadLoading(true);
      // 1. Minta Presigned URL dari backend
      const presignRes = await fetch("/api/cms/admin/upload-presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: file.name }),
      });
      if (!presignRes.ok) throw new Error("Gagal membuat presigned upload URL");
      const presignData = await presignRes.json();

      // 2. Upload file bytes langsung ke MinIO S3
      const uploadRes = await fetch(presignData.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Unggah gambar gagal (HTTP ${uploadRes.status})`);
      }

      setFormData((prev) => ({
        ...prev,
        gambar_url: presignData.url,
      }));
      alert("Gambar berhasil diunggah!");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan yang tidak diketahui";
      alert(`Gagal mengunggah gambar: ${message}`);
    } finally {
      setUploadLoading(false);
      input.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul.trim() || !formData.konten.trim()) {
      alert("Judul dan Konten wajib diisi!");
      return;
    }
    saveMutation.mutate(formData);
  };

  if (!isNew && isLoading) {
    return (
      <div className="max-w-[950px] mx-auto p-8 space-y-6">
        <CardSkeleton className="h-8 w-1/3" />
        <CardSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isNew && isError) {
    return (
      <div className="max-w-[800px] mx-auto p-8">
        <ErrorState
          title="Artikel Tidak Ditemukan"
          message="Artikel yang ingin disunting tidak ditemukan atau gagal dimuat dari server."
          retryLabel="Coba Lagi"
          onRetry={() => {
            void refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-20">
      <SeoHead
        title={
          isNew ? "Tulis Artikel Baru | CMS PMB" : "Edit Artikel | CMS PMB"
        }
      />

      {/* Header Form */}
      <div className="flex items-center justify-between border-b border-biru-200 pb-4">
        <div className="space-y-1">
          <Link
            to="/admin/cms/berita"
            className="inline-flex items-center gap-1.5 text-xs text-biru-600 hover:text-biru-900 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Artikel</span>
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            {isNew ? "Buat Artikel / Pengumuman Baru" : "Edit Artikel"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="text-xs font-bold gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>
              {saveMutation.isPending
                ? "Menyimpan..."
                : "Simpan & Publikasikan"}
            </span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 border-biru-200 space-y-5">
          {/* Judul & Kategori */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8">
              <label className="block text-xs font-bold text-biru-950 mb-1">
                Judul Artikel: *
              </label>
              <input
                type="text"
                required
                value={formData.judul}
                onChange={(e) =>
                  setFormData({ ...formData, judul: e.target.value })
                }
                placeholder="Contoh: Jadwal Pelaksanaan Ujian CBT Gelombang 1 Dibuka"
                className="w-full rounded-xl border border-biru-200 bg-putih px-3.5 py-2.5 text-sm font-semibold text-biru-950 focus:border-biru-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-biru-950 mb-1">
                Kategori: *
              </label>
              <select
                value={formData.kategori}
                onChange={(e) =>
                  setFormData({ ...formData, kategori: e.target.value })
                }
                className="w-full rounded-xl border border-biru-200 bg-putih px-3.5 py-2.5 text-sm font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
              >
                <option value="PENGUMUMAN">Pengumuman</option>
                <option value="BERITA">Berita Kampus</option>
                <option value="BEASISWA">Beasiswa</option>
                <option value="PANDUAN">Panduan PMB</option>
              </select>
            </div>
          </div>

          {/* Ringkasan Singkat */}
          <div>
            <label className="block text-xs font-bold text-biru-950 mb-1">
              Ringkasan Singkat (Meta Description): *
            </label>
            <textarea
              required
              rows={2}
              value={formData.ringkasan}
              onChange={(e) =>
                setFormData({ ...formData, ringkasan: e.target.value })
              }
              placeholder="Ringkasan 1-2 kalimat untuk pratinjau kartu dan hasil pencarian Google..."
              className="w-full rounded-xl border border-biru-200 bg-putih px-3.5 py-2 text-xs text-biru-900 focus:border-biru-600 focus:outline-none resize-none"
            />
          </div>

          {/* Gambar Sampul (Featured Image) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-biru-950">
              Gambar Sampul (Featured Image):
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="text"
                value={formData.gambar_url || ""}
                onChange={(e) =>
                  setFormData({ ...formData, gambar_url: e.target.value })
                }
                placeholder="https://... atau unggah file langsung"
                className="flex-1 w-full rounded-xl border border-biru-200 bg-putih px-3.5 py-2 text-xs text-biru-950 focus:border-biru-600 focus:outline-none"
              />
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-biru-300 bg-biru-50 text-biru-900 text-xs font-semibold hover:bg-biru-100 transition-colors shrink-0">
                <Upload className="w-4 h-4 text-biru-700" />
                <span>{uploadLoading ? "Mengunggah..." : "Unggah Gambar"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadLoading}
                />
              </label>
            </div>
          </div>

          {/* Editor Konten Teks Kaya dengan Tab Pratinjau */}
          <div className="space-y-2 pt-2 border-t border-biru-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-biru-950">
                Konten Lengkap (Format HTML Aman): *
              </label>
              <div className="flex rounded-lg border border-biru-200 p-0.5 bg-biru-50 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("editor")}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    activeTab === "editor"
                      ? "bg-putih text-biru-950 shadow-soft-xs"
                      : "text-biru-700 hover:text-biru-950"
                  }`}
                >
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    activeTab === "preview"
                      ? "bg-putih text-biru-950 shadow-soft-xs"
                      : "text-biru-700 hover:text-biru-950"
                  }`}
                >
                  Pratinjau Hasil
                </button>
              </div>
            </div>

            {/* Quick Helper Toolbar */}
            {activeTab === "editor" && (
              <div className="flex flex-wrap items-center gap-1 p-2 rounded-xl bg-biru-50/70 border border-biru-200 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    insertFormatting("<h2>", "</h2>", "Judul Bagian")
                  }
                  className="px-2 py-1 rounded bg-putih border border-biru-200 text-biru-900 font-bold hover:bg-biru-100"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("<h3>", "</h3>", "Subjudul")}
                  className="px-2 py-1 rounded bg-putih border border-biru-200 text-biru-900 font-bold hover:bg-biru-100"
                >
                  H3
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertFormatting("<p>", "</p>", "Teks paragraf baru...")
                  }
                  className="px-2 py-1 rounded bg-putih border border-biru-200 text-biru-900 font-medium hover:bg-biru-100"
                >
                  Paragraf
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertFormatting("<strong>", "</strong>", "Teks Tebal")
                  }
                  className="px-2 py-1 rounded bg-putih border border-biru-200 text-biru-900 font-bold hover:bg-biru-100"
                >
                  Bold
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertFormatting(
                      "<ul>\n  <li>Poin 1</li>\n  <li>Poin 2</li>\n</ul>",
                    )
                  }
                  className="px-2 py-1 rounded bg-putih border border-biru-200 text-biru-900 hover:bg-biru-100"
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertFormatting(
                      '<a href="https://..." target="_blank">',
                      "</a>",
                      "Tautan Web",
                    )
                  }
                  className="px-2 py-1 rounded bg-putih border border-biru-200 text-biru-900 hover:bg-biru-100"
                >
                  Link
                </button>
              </div>
            )}

            {activeTab === "editor" ? (
              <textarea
                ref={contentEditorRef}
                required
                rows={12}
                value={formData.konten}
                onChange={(e) =>
                  setFormData({ ...formData, konten: e.target.value })
                }
                placeholder="Tuliskan konten pengumuman di sini..."
                className="w-full font-mono text-xs rounded-xl border border-biru-200 bg-putih p-3.5 text-biru-950 focus:border-biru-600 focus:outline-none"
              />
            ) : (
              <div className="rounded-xl border border-biru-200 bg-putih p-6 min-h-[300px] prose prose-biru max-w-none text-xs text-biru-950 font-sans">
                {formData.konten ? (
                  <div dangerouslySetInnerHTML={{ __html: formData.konten }} />
                ) : (
                  <p className="text-biru-400 italic">Konten masih kosong.</p>
                )}
              </div>
            )}
          </div>

          {/* Tags & Status Publikasi */}
          <div className="pt-4 border-t border-biru-100 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-biru-950 mb-1">
                Tags Artikel:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), handleAddTag())
                  }
                  placeholder="Tambahkan tag (tekan enter)"
                  className="flex-1 rounded-xl border border-biru-200 bg-putih px-3 py-1.5 text-xs text-biru-950 focus:border-biru-600 focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  className="text-xs"
                >
                  Tambah
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.tags?.map((t) => (
                  <span
                    key={t}
                    onClick={() => handleRemoveTag(t)}
                    className="cursor-pointer px-2 py-0.5 rounded text-[11px] font-semibold bg-biru-100 text-biru-900 hover:bg-rose-100 hover:text-rose-800 transition-colors"
                  >
                    #{t} &times;
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 sm:pt-0 sm:justify-end">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-biru-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) =>
                    setFormData({ ...formData, is_published: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-biru-300 text-biru-800 focus:ring-biru-500"
                />
                <span>Terbitkan Langsung ke Website Publik</span>
              </label>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
};
