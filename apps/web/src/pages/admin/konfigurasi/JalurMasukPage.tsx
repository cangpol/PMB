import React, { useState, useEffect } from "react";
import {
  Compass,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Input,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Badge,
  EmptyState,
  ErrorState,
  Skeleton,
  Pagination,
} from "@/components/ui";
import {
  getJalurAdminList,
  createJalur,
  updateJalur,
  deleteJalur,
} from "@/services/konfigurasi";
import type {
  JalurDetailResponse,
  CreateJalurKonfigurasiRequest,
  UpdateJalurKonfigurasiRequest,
} from "@/types";

export const JalurMasukPage: React.FC = () => {
  const [jalurList, setJalurList] = useState<JalurDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTipe, setFilterTipe] = useState("SEMUA");
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJalur, setEditingJalur] = useState<JalurDetailResponse | null>(
    null,
  );
  const [form, setForm] = useState<CreateJalurKonfigurasiRequest>({
    kode_jalur: "",
    nama_jalur: "",
    deskripsi: "",
    biaya_formulir: 250000,
    tipe_seleksi: "cbt",
    syarat: "",
    kuota_maksimal: null,
    is_active: true,
  });

  const [deleteTarget, setDeleteTarget] = useState<JalurDetailResponse | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchJalurData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getJalurAdminList();
      setJalurList(data);
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setError(e.pesan || "Gagal memuat daftar jalur masuk");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJalurData();
  }, []);

  const handleOpenAdd = () => {
    setEditingJalur(null);
    setForm({
      kode_jalur: "",
      nama_jalur: "",
      deskripsi: "",
      biaya_formulir: 250000,
      tipe_seleksi: "cbt",
      syarat: "",
      kuota_maksimal: null,
      is_active: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (j: JalurDetailResponse) => {
    setEditingJalur(j);
    setForm({
      kode_jalur: j.kode_jalur,
      nama_jalur: j.nama_jalur,
      deskripsi: j.deskripsi,
      biaya_formulir: j.biaya_formulir,
      tipe_seleksi: j.tipe_seleksi,
      syarat: j.syarat || "",
      kuota_maksimal: j.kuota_maksimal || null,
      is_active: j.is_active,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingJalur) {
        const updatePayload: UpdateJalurKonfigurasiRequest = {
          kode_jalur: form.kode_jalur,
          nama_jalur: form.nama_jalur,
          deskripsi: form.deskripsi,
          biaya_formulir: form.biaya_formulir,
          tipe_seleksi: form.tipe_seleksi,
          syarat: form.syarat,
          kuota_maksimal: form.kuota_maksimal,
          is_active: form.is_active,
        };
        await updateJalur(editingJalur.id, updatePayload);
      } else {
        await createJalur(form);
      }
      setIsModalOpen(false);
      await fetchJalurData();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setFormError(e.pesan || "Gagal menyimpan jalur masuk");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await deleteJalur(deleteTarget.id);
      setDeleteTarget(null);
      await fetchJalurData();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      alert(e.pesan || "Gagal menghapus jalur masuk");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredJalur = jalurList.filter((j) => {
    const matchesSearch =
      j.nama_jalur.toLowerCase().includes(search.toLowerCase()) ||
      j.kode_jalur.toLowerCase().includes(search.toLowerCase());
    const matchesTipe =
      filterTipe === "SEMUA" ||
      j.tipe_seleksi.toLowerCase() === filterTipe.toLowerCase();
    const matchesStatus =
      filterStatus === "SEMUA" ||
      (filterStatus === "AKTIF" ? j.is_active : !j.is_active);
    return matchesSearch && matchesTipe && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredJalur.length / PAGE_SIZE));
  const pagedJalur = filteredJalur.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-biru-700 uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>Mekanisme Pendaftaran</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Jalur Masuk & Skema Seleksi
          </h1>
          <p className="text-xs sm:text-sm text-biru-800 font-light mt-1">
            Kelola jalur pendaftaran PMB: CBT online, seleksi rapor/berkas,
            campuran, serta RPL (Rekognisi Pembelajaran Lampau).
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-biru-600" />
            <Input
              placeholder="Cari jalur masuk..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs"
            />
          </div>
          <select
            value={filterTipe}
            onChange={(e) => {
              setFilterTipe(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
          >
            <option value="SEMUA">Semua Tipe Seleksi</option>
            <option value="cbt">CBT (Ujian Online)</option>
            <option value="berkas">Berkas / Rapor</option>
            <option value="campuran">Campuran</option>
            <option value="rpl">RPL (Rekognisi)</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
          >
            <option value="SEMUA">Semua Status</option>
            <option value="AKTIF">Hanya Aktif</option>
            <option value="NONAKTIF">Nonaktif</option>
          </select>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jalur Masuk</span>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? (
        <ErrorState
          title="Gagal Memuat Jalur Masuk"
          message={error}
          onRetry={fetchJalurData}
        />
      ) : filteredJalur.length === 0 ? (
        <EmptyState
          title="Belum Ada Jalur Masuk"
          description="Tambahkan jalur masuk baru untuk membuka pilihan seleksi bagi calon mahasiswa."
          actionLabel="Tambah Jalur"
          onAction={handleOpenAdd}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Jalur Masuk</TableHead>
                <TableHead className="text-center">Tipe Seleksi</TableHead>
                <TableHead className="text-right">Biaya Formulir</TableHead>
                <TableHead>Persyaratan Singkat</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedJalur.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-mono text-xs font-bold text-biru-900">
                    {j.kode_jalur}
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-biru-950">
                      {j.nama_jalur}
                    </p>
                    <span className="text-[11px] text-biru-800 line-clamp-1 font-light">
                      {j.deskripsi}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        j.tipe_seleksi === "cbt"
                          ? "menunggu"
                          : j.tipe_seleksi === "berkas"
                            ? "berhasil"
                            : j.tipe_seleksi === "rpl"
                              ? "peringatan"
                              : "netral"
                      }
                    >
                      {j.tipe_seleksi.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-biru-950">
                    {j.biaya_formulir === 0
                      ? "GRATIS"
                      : `Rp ${j.biaya_formulir.toLocaleString("id-ID")}`}
                  </TableCell>
                  <TableCell className="text-xs text-biru-800 max-w-xs truncate">
                    {j.syarat || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={j.is_active ? "berhasil" : "netral"}>
                      {j.is_active ? "AKTIF" : "NONAKTIF"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(j)}
                        title="Ubah Jalur"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-biru-700" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(j)}
                        title="Hapus Jalur"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-biru-900" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-biru-100 text-xs text-biru-800 font-medium">
            <span>
              Menampilkan{" "}
              {filteredJalur.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} -{" "}
              {Math.min(filteredJalur.length, page * PAGE_SIZE)} dari{" "}
              {filteredJalur.length} jalur masuk
            </span>
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </div>
        </>
      )}

      {/* MODAL TAMBAH/UBAH JALUR */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingJalur ? "Ubah Jalur Masuk" : "Tambah Jalur Masuk Baru"}
            </DialogTitle>
            <DialogDescription>
              Tentukan kode, nama, jenis seleksi, dan biaya formulir untuk jalur
              ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 rounded-xl bg-biru-100 border border-biru-300 flex items-center gap-2 text-xs text-biru-950 font-medium">
                <AlertCircle className="w-4 h-4 text-biru-800 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Kode Jalur
                </label>
                <Input
                  required
                  placeholder="misal: JALUR-CBT"
                  value={form.kode_jalur}
                  onChange={(e) =>
                    setForm({ ...form, kode_jalur: e.target.value })
                  }
                  disabled={editingJalur !== null}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Nama Jalur Masuk
                </label>
                <Input
                  required
                  placeholder="misal: [CONTOH] Jalur Mandiri CBT Online"
                  value={form.nama_jalur}
                  onChange={(e) =>
                    setForm({ ...form, nama_jalur: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Tipe Seleksi
                </label>
                <select
                  className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                  value={form.tipe_seleksi}
                  onChange={(e) =>
                    setForm({ ...form, tipe_seleksi: e.target.value })
                  }
                >
                  <option value="cbt">
                    CBT (Computer-Based Testing Online)
                  </option>
                  <option value="berkas">
                    Berkas (Nilai Rapor / Prestasi)
                  </option>
                  <option value="campuran">Campuran (Tes & Portofolio)</option>
                  <option value="rpl">
                    RPL (Rekognisi Pembelajaran Lampau)
                  </option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Biaya Formulir (Rp)
                </label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={form.biaya_formulir}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      biaya_formulir: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Deskripsi Jalur
              </label>
              <Input
                required
                placeholder="Penjelasan ringkas mengenai jalur pendaftaran ini"
                value={form.deskripsi}
                onChange={(e) =>
                  setForm({ ...form, deskripsi: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Persyaratan Khusus
              </label>
              <Textarea
                placeholder="Syarat dokumen atau kualifikasi nilai rapor..."
                rows={3}
                value={form.syarat || ""}
                onChange={(e) => setForm({ ...form, syarat: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active_jalur"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                className="rounded border-biru-300 text-biru-700 focus:ring-biru-600"
              />
              <label
                htmlFor="is_active_jalur"
                className="text-xs font-semibold text-biru-950 cursor-pointer"
              >
                Jalur Masuk Aktif Dibuka
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Jalur Masuk"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG KONFIRMASI HAPUS */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmasi Penghapusan</DialogTitle>
            <DialogDescription>
              Hapus jalur masuk{" "}
              <strong className="text-biru-950">
                {deleteTarget?.nama_jalur}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
