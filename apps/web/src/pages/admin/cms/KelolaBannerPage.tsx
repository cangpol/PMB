import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardSkeleton,
  ErrorState,
} from "../../../components/common";
import { SeoHead } from "../../../components/common/SeoHead";
import type { components } from "../../../types/api";
import { useDialog } from "@/components/ui/useDialog";

type CmsBanner = components["schemas"]["CmsBannerResponse"];

export const KelolaBannerPage: React.FC = () => {
  const dialog = useDialog();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<CmsBanner | null>(null);

  const [form, setForm] = useState({
    judul: "",
    subjudul: "",
    gambar_url: "",
    link_url: "",
    urutan: 0,
    is_active: true,
  });

  const {
    data: banners,
    isLoading,
    isError,
    refetch,
  } = useQuery<CmsBanner[]>({
    queryKey: ["admin-cms-banners"],
    queryFn: async () => {
      const res = await fetch("/api/cms/admin/banners");
      if (!res.ok) throw new Error("Gagal mengambil banner");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const isEdit = !!editingBanner;
      const url = isEdit
        ? `/api/cms/admin/banners/${editingBanner.id}`
        : "/api/cms/admin/banners";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Gagal menyimpan banner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-banners"] });
      setModalOpen(false);
      setEditingBanner(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cms/admin/banners/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus banner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-banners"] });
    },
  });

  const openCreate = () => {
    setEditingBanner(null);
    setForm({
      judul: "",
      subjudul: "",
      gambar_url: "",
      link_url: "",
      urutan: (banners?.length || 0) + 1,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (b: CmsBanner) => {
    setEditingBanner(b);
    setForm({
      judul: b.judul,
      subjudul: b.subjudul || "",
      gambar_url: b.gambar_url,
      link_url: b.link_url || "",
      urutan: b.urutan,
      is_active: b.is_active,
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-20">
      <SeoHead title="Kelola Banner Slider Beranda | Admin CMS PMB" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-100 text-biru-800">
            CMS Publik
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-1">
            Banner Slider Beranda
          </h1>
          <p className="text-xs text-biru-700 font-sans mt-0.5">
            Atur gambar sorotan, promo gelombang pendaftaran, dan pengumuman
            prioritas di beranda utama.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreate}
          className="text-xs font-bold gap-1.5 shadow-soft-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Banner</span>
        </Button>
      </div>

      {/* Daftar Banner Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton className="h-48 w-full" />
          <CardSkeleton className="h-48 w-full" />
        </div>
      ) : isError ? (
        <Card className="p-8 border-biru-200">
          <ErrorState
            title="Gagal Memuat Banner"
            message="Terjadi gangguan saat mengambil data banner dari server."
            retryLabel="Coba Lagi"
            onRetry={() => {
              void refetch();
            }}
          />
        </Card>
      ) : !banners || banners.length === 0 ? (
        <Card className="p-10 text-center border-biru-200 text-biru-700 space-y-3">
          <Image className="w-10 h-10 text-biru-400 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-biru-950">
            Belum Ada Banner
          </h3>
          <p className="text-xs">
            Tambahkan banner promosi atau foto kampus untuk beranda publik.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={openCreate}
            className="text-xs"
          >
            Tambah Banner Pertama
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((banner) => (
            <Card
              key={banner.id}
              className="border-biru-200 overflow-hidden flex flex-col justify-between shadow-soft-xs hover:shadow-soft-md transition-all"
            >
              <div>
                <div className="relative h-44 bg-biru-950 overflow-hidden">
                  <img
                    src={banner.gambar_url}
                    alt={banner.judul}
                    className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/800x400/0a2540/ffffff?text=UPITRA+Banner";
                    }}
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-biru-900/90 text-putih backdrop-blur-xs">
                      Urutan: {banner.urutan}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        banner.is_active
                          ? "bg-emerald-600 text-putih"
                          : "bg-rose-600 text-putih"
                      }`}
                    >
                      {banner.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <h3 className="font-serif text-lg font-bold text-biru-950">
                    {banner.judul}
                  </h3>
                  {banner.subjudul && (
                    <p className="text-xs text-biru-700 font-sans leading-relaxed">
                      {banner.subjudul}
                    </p>
                  )}
                  {banner.link_url && (
                    <p className="text-[11px] text-biru-600 font-mono truncate">
                      Link: {banner.link_url}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-biru-50/50 border-t border-biru-100 flex items-center justify-between">
                <span className="text-[11px] text-biru-600">
                  {new Date(banner.created_at).toLocaleDateString("id-ID")}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(banner)}
                    className="text-xs font-semibold py-1 px-3"
                  >
                    Edit
                  </Button>
                  <button
                    type="button"
                    aria-label="Hapus banner"
                    onClick={async () => {
                      const ya = await dialog.konfirmasi({
                        judul: "Hapus banner?",
                        deskripsi: `Banner "${banner.judul}" akan dihapus permanen.`,
                        nada: "bahaya",
                        labelYa: "Ya, Hapus",
                      });
                      if (ya) {
                        deleteMutation.mutate(banner.id, {
                          onSuccess: () =>
                            void dialog.hasil({
                              nada: "sukses",
                              judul: "Banner dihapus",
                              autoTutupMs: 2000,
                            }),
                        });
                      }
                    }}
                    className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Dialog Form Tambah / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-biru-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 border-biru-200 bg-putih shadow-soft-lg space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-xl font-bold text-biru-950">
              {editingBanner ? "Edit Banner Slider" : "Tambah Banner Baru"}
            </h3>

            <div className="space-y-3 text-xs font-sans">
              <div>
                <label className="block font-bold text-biru-950 mb-1">
                  Judul Banner: *
                </label>
                <input
                  type="text"
                  required
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  placeholder="Contoh: Penerimaan Mahasiswa Baru 2026 Dibuka"
                  className="w-full rounded-xl border border-biru-200 px-3 py-2 text-xs focus:border-biru-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-biru-950 mb-1">
                  Subjudul:
                </label>
                <input
                  type="text"
                  value={form.subjudul}
                  onChange={(e) =>
                    setForm({ ...form, subjudul: e.target.value })
                  }
                  placeholder="Keterangan singkat tambahan"
                  className="w-full rounded-xl border border-biru-200 px-3 py-2 text-xs focus:border-biru-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-biru-950 mb-1">
                  URL Gambar Banner: *
                </label>
                <input
                  type="text"
                  required
                  value={form.gambar_url}
                  onChange={(e) =>
                    setForm({ ...form, gambar_url: e.target.value })
                  }
                  placeholder="https://... atau path gambar"
                  className="w-full rounded-xl border border-biru-200 px-3 py-2 text-xs focus:border-biru-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-biru-950 mb-1">
                    Urutan Tampil:
                  </label>
                  <input
                    type="number"
                    value={form.urutan}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        urutan: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-xl border border-biru-200 px-3 py-2 text-xs focus:border-biru-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-biru-950 mb-1">
                    Tautan Klik (Link URL):
                  </label>
                  <input
                    type="text"
                    value={form.link_url}
                    onChange={(e) =>
                      setForm({ ...form, link_url: e.target.value })
                    }
                    placeholder="/jalur-masuk"
                    className="w-full rounded-xl border border-biru-200 px-3 py-2 text-xs focus:border-biru-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-biru-950">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm({ ...form, is_active: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-biru-300 text-biru-800"
                  />
                  <span>Aktifkan dan Tampilkan di Slider Beranda</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-biru-100 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => saveMutation.mutate(form)}
                disabled={
                  saveMutation.isPending || !form.judul || !form.gambar_url
                }
                className="text-xs font-bold"
              >
                {saveMutation.isPending ? "Menyimpan..." : "Simpan Banner"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
