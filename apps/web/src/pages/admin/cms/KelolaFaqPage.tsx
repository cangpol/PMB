import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Plus, Trash2, Edit, Search } from "lucide-react";
import {
  Button,
  Card,
  CardSkeleton,
  StatusBadge,
  ErrorState,
} from "../../../components/common";
import { SeoHead } from "../../../components/common/SeoHead";
import type { components } from "../../../types/api";

type CmsFaq = components["schemas"]["CmsFaqResponse"];

export const KelolaFaqPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<CmsFaq | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const [form, setForm] = useState({
    kategori: "Pendaftaran",
    pertanyaan: "",
    jawaban: "",
    urutan: 0,
    is_active: true,
  });

  const {
    data: faqs,
    isLoading,
    isError,
    refetch,
  } = useQuery<CmsFaq[]>({
    queryKey: ["admin-cms-faqs"],
    queryFn: async () => {
      const res = await fetch("/api/cms/admin/faqs");
      if (!res.ok) throw new Error("Gagal mengambil FAQ");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const isEdit = !!editingFaq;
      const url = isEdit
        ? `/api/cms/admin/faqs/${editingFaq.id}`
        : "/api/cms/admin/faqs";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Gagal menyimpan FAQ");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-faqs"] });
      setModalOpen(false);
      setEditingFaq(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cms/admin/faqs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus FAQ");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-faqs"] });
    },
  });

  const openCreate = () => {
    setEditingFaq(null);
    setForm({
      kategori: "Pendaftaran",
      pertanyaan: "",
      jawaban: "",
      urutan: (faqs?.length || 0) + 1,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (f: CmsFaq) => {
    setEditingFaq(f);
    setForm({
      kategori: f.kategori,
      pertanyaan: f.pertanyaan,
      jawaban: f.jawaban,
      urutan: f.urutan,
      is_active: f.is_active,
    });
    setModalOpen(true);
  };

  const categories = [
    "ALL",
    ...Array.from(new Set(faqs?.map((f) => f.kategori) || [])),
  ];

  const filteredFaqs = (faqs || []).filter((f) => {
    const matchesCat =
      selectedCategory === "ALL" || f.kategori === selectedCategory;
    const matchesQuery =
      f.pertanyaan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.jawaban.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-6 pb-20">
      <SeoHead title="Kelola FAQ Pertanyaan Umum | Admin CMS PMB" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-100 text-biru-800">
            CMS Publik
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-1">
            Kelola Pertanyaan Umum (FAQ)
          </h1>
          <p className="text-xs text-biru-700 font-sans mt-0.5">
            Daftar pertanyaan dan jawaban resmi yang ditampilkan pada halaman
            bantuan &amp; beranda.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreate}
          className="text-xs font-bold gap-1.5 shadow-soft-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah FAQ</span>
        </Button>
      </div>

      {/* Filter & Search */}
      <Card className="p-4 border-biru-200">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-biru-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari dalam pertanyaan atau jawaban..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-biru-200 text-xs text-biru-950 focus:border-biru-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-44 rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs text-biru-950 focus:border-biru-600 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "Semua Kategori" : c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Tabel FAQ */}
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
              title="Gagal Memuat FAQ"
              message="Terjadi gangguan saat mengambil data tanya jawab dari server."
              retryLabel="Coba Lagi"
              onRetry={() => {
                void refetch();
              }}
            />
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <HelpCircle className="w-10 h-10 text-biru-400 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-biru-950">
              Belum Ada FAQ
            </h3>
            <p className="text-xs text-biru-700">
              Mulai buat tanya jawab umum untuk membantu pendaftar.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={openCreate}
              className="text-xs"
            >
              Buat FAQ Pertama
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-biru-200 bg-biru-50/70 text-biru-950 font-bold">
                  <th className="py-3 px-3 text-center">Urutan</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-4">Pertanyaan &amp; Jawaban</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-biru-100 text-biru-800 font-sans">
                {filteredFaqs.map((faq) => (
                  <tr key={faq.id} className="hover:bg-biru-50/40">
                    <td className="py-3 px-3 text-center font-bold font-mono text-biru-900">
                      {faq.urutan}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-biru-100 text-biru-800">
                        {faq.kategori}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-lg space-y-1">
                      <strong className="font-serif font-bold text-biru-950 block text-sm">
                        {faq.pertanyaan}
                      </strong>
                      <p className="text-xs text-biru-700 leading-relaxed line-clamp-2">
                        {faq.jawaban}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge
                        status={faq.is_active ? "TERVERIFIKASI" : "DRAFT"}
                        label={faq.is_active ? "Aktif" : "Nonaktif"}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(faq)}
                          className="text-xs font-semibold py-1 px-2.5"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Hapus pertanyaan ini?")) {
                              deleteMutation.mutate(faq.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors"
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

      {/* Modal Dialog Form Tambah / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-biru-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 border-biru-200 bg-putih shadow-soft-lg space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-xl font-bold text-biru-950">
              {editingFaq ? "Edit FAQ" : "Tambah FAQ Baru"}
            </h3>

            <div className="space-y-3 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-biru-950 mb-1">
                    Kategori: *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.kategori}
                    onChange={(e) =>
                      setForm({ ...form, kategori: e.target.value })
                    }
                    placeholder="Contoh: Pendaftaran"
                    className="w-full rounded-xl border border-biru-200 px-3 py-2 text-xs focus:border-biru-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-biru-950 mb-1">
                    Nomor Urut:
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
              </div>

              <div>
                <label className="block font-bold text-biru-950 mb-1">
                  Pertanyaan: *
                </label>
                <input
                  type="text"
                  required
                  value={form.pertanyaan}
                  onChange={(e) =>
                    setForm({ ...form, pertanyaan: e.target.value })
                  }
                  placeholder="Tuliskan pertanyaan yang sering diajukan..."
                  className="w-full rounded-xl border border-biru-200 px-3 py-2 text-xs focus:border-biru-600 focus:outline-none font-semibold text-biru-950"
                />
              </div>

              <div>
                <label className="block font-bold text-biru-950 mb-1">
                  Jawaban Lengkap: *
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.jawaban}
                  onChange={(e) =>
                    setForm({ ...form, jawaban: e.target.value })
                  }
                  placeholder="Tuliskan jawaban yang jelas dan informatif..."
                  className="w-full rounded-xl border border-biru-200 px-3 py-2 text-xs focus:border-biru-600 focus:outline-none leading-relaxed"
                />
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
                  <span>Tampilkan di Halaman FAQ Publik & Beranda</span>
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
                  saveMutation.isPending || !form.pertanyaan || !form.jawaban
                }
                className="text-xs font-bold"
              >
                {saveMutation.isPending ? "Menyimpan..." : "Simpan FAQ"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
