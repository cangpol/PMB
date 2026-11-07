import React, { useState, useEffect, useMemo } from "react";
import {
  Ticket,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  Clock,
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
  getVouchersList,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  getProdiAdminList,
  getJalurAdminList,
} from "@/services/konfigurasi";
import type {
  VoucherDetailResponse,
  CreateVoucherRequest,
  UpdateVoucherRequest,
  ProdiDetailResponse,
  JalurDetailResponse,
} from "@/types";
import { useDialog } from "@/components/ui/useDialog";

export const VoucherPage: React.FC = () => {
  const dialog = useDialog();
  const [voucherList, setVoucherList] = useState<VoucherDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTipe, setFilterTipe] = useState("SEMUA");
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const [prodiList, setProdiList] = useState<ProdiDetailResponse[]>([]);
  const [jalurList, setJalurList] = useState<JalurDetailResponse[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] =
    useState<VoucherDetailResponse | null>(null);
  const [form, setForm] = useState<CreateVoucherRequest>({
    kode_voucher: "",
    tipe_diskon: "NOMINAL",
    nilai_diskon: 50000,
    kuota: 100,
    tgl_kadaluarsa: "",
    batas_jalur_id: null,
    batas_prodi_id: null,
    deskripsi: "",
    is_active: true,
  });

  const [deleteTarget, setDeleteTarget] =
    useState<VoucherDetailResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchVoucherData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [vData, pData, jData] = await Promise.all([
        getVouchersList(),
        getProdiAdminList(),
        getJalurAdminList(),
      ]);
      setVoucherList(vData);
      setProdiList(pData);
      setJalurList(jData);
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setError(e.pesan || "Gagal memuat daftar voucher diskon");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoucherData();
  }, []);

  const handleOpenAdd = () => {
    setEditingVoucher(null);
    setForm({
      kode_voucher: "",
      tipe_diskon: "NOMINAL",
      nilai_diskon: 50000,
      kuota: 100,
      tgl_kadaluarsa: new Date(Date.now() + 180 * 86400000)
        .toISOString()
        .slice(0, 16),
      batas_jalur_id: null,
      batas_prodi_id: null,
      deskripsi: "",
      is_active: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: VoucherDetailResponse) => {
    setEditingVoucher(v);
    setForm({
      kode_voucher: v.kode_voucher,
      tipe_diskon: v.tipe_diskon,
      nilai_diskon: v.nilai_diskon,
      kuota: v.kuota,
      tgl_kadaluarsa: new Date(v.tgl_kadaluarsa).toISOString().slice(0, 16),
      batas_jalur_id: v.batas_jalur_id || null,
      batas_prodi_id: v.batas_prodi_id || null,
      deskripsi: v.deskripsi || "",
      is_active: v.is_active,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: CreateVoucherRequest = {
        ...form,
        kode_voucher: form.kode_voucher.trim().toUpperCase(),
        tgl_kadaluarsa: new Date(form.tgl_kadaluarsa).toISOString(),
      };

      if (editingVoucher) {
        const updatePayload: UpdateVoucherRequest = {
          nilai_diskon: payload.nilai_diskon,
          tipe_diskon: payload.tipe_diskon,
          kuota: payload.kuota,
          tgl_kadaluarsa: payload.tgl_kadaluarsa,
          batas_jalur_id: payload.batas_jalur_id,
          batas_prodi_id: payload.batas_prodi_id,
          deskripsi: payload.deskripsi,
          is_active: payload.is_active,
        };
        await updateVoucher(editingVoucher.id, updatePayload);
      } else {
        await createVoucher(payload);
      }
      setIsModalOpen(false);
      await fetchVoucherData();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setFormError(e.pesan || "Gagal menyimpan voucher");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await deleteVoucher(deleteTarget.id);
      setDeleteTarget(null);
      await fetchVoucherData();
      void dialog.hasil({
        nada: "sukses",
        judul: "Voucher dihapus",
        deskripsi: "Voucher berhasil dihapus.",
        autoTutupMs: 2000,
      });
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      void dialog.hasil({
        nada: "gagal",
        judul: "Penghapusan gagal",
        deskripsi: e.pesan || "Gagal menghapus voucher",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nowIso = useMemo(() => new Date().toISOString(), []);

  const filteredVouchers = voucherList.filter((v) => {
    const matchesSearch =
      v.kode_voucher.toLowerCase().includes(search.toLowerCase()) ||
      (v.deskripsi && v.deskripsi.toLowerCase().includes(search.toLowerCase()));
    const matchesTipe = filterTipe === "SEMUA" || v.tipe_diskon === filterTipe;

    const isExpired = v.tgl_kadaluarsa < nowIso;
    const isHabis = v.kuota_terpakai >= v.kuota;

    let matchesStatus = true;
    if (filterStatus === "AKTIF") {
      matchesStatus = v.is_active && !isExpired && !isHabis;
    } else if (filterStatus === "KEDALUWARSA") {
      matchesStatus = isExpired;
    } else if (filterStatus === "HABIS") {
      matchesStatus = isHabis;
    } else if (filterStatus === "NONAKTIF") {
      matchesStatus = !v.is_active;
    }

    return matchesSearch && matchesTipe && matchesStatus;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVouchers.length / PAGE_SIZE),
  );
  const pagedVouchers = filteredVouchers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-biru-700 uppercase tracking-wider mb-1">
            <Ticket className="w-4 h-4" />
            <span>Kupon & Diskon PMB</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Voucher Promosi & Beasiswa
          </h1>
          <p className="text-xs sm:text-sm text-biru-800 font-light mt-1">
            Kelola kode promo potongan biaya formulir pendaftaran, kuota
            pemakaian (aman dari race condition), dan batas masa berlaku.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-biru-600" />
            <Input
              placeholder="Cari kode voucher..."
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
            <option value="SEMUA">Semua Tipe Diskon</option>
            <option value="NOMINAL">Nominal (Rp)</option>
            <option value="PERCENT">Persentase (%)</option>
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
            <option value="KEDALUWARSA">Kedaluwarsa</option>
            <option value="HABIS">Habis Kuota</option>
            <option value="NONAKTIF">Nonaktif</option>
          </select>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Voucher</span>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? (
        <ErrorState
          title="Gagal Memuat Voucher"
          message={error}
          onRetry={fetchVoucherData}
        />
      ) : filteredVouchers.length === 0 ? (
        <EmptyState
          title="Belum Ada Voucher Diskon"
          description="Buat kode voucher baru untuk memberikan diskon biaya pendaftaran kepada calon mahasiswa."
          actionLabel="Tambah Voucher"
          onAction={handleOpenAdd}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode Voucher</TableHead>
                <TableHead className="text-center">Tipe Diskon</TableHead>
                <TableHead className="text-right">Nilai Potongan</TableHead>
                <TableHead className="w-48">Penggunaan Kuota</TableHead>
                <TableHead>Kedaluwarsa</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedVouchers.map((v) => {
                const persentasePakai =
                  v.kuota > 0
                    ? Math.min(
                        100,
                        Math.round((v.kuota_terpakai / v.kuota) * 100),
                      )
                    : 0;
                const isExpired = v.tgl_kadaluarsa < nowIso;

                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-biru-950 px-2 py-0.5 rounded bg-biru-100 border border-biru-200">
                          {v.kode_voucher}
                        </span>
                      </div>
                      {v.deskripsi && (
                        <span className="text-[11px] text-biru-800 line-clamp-1 mt-0.5 font-light">
                          {v.deskripsi}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          v.tipe_diskon === "PERCENT" ? "menunggu" : "netral"
                        }
                      >
                        {v.tipe_diskon === "PERCENT" ? "PERSENTASE" : "NOMINAL"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-biru-950">
                      {v.tipe_diskon === "PERCENT"
                        ? `${v.nilai_diskon}%`
                        : `Rp ${v.nilai_diskon.toLocaleString("id-ID")}`}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono text-biru-900">
                          <span>
                            {v.kuota_terpakai} / {v.kuota}
                          </span>
                          <span>{persentasePakai}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-biru-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-biru-700 transition-all"
                            style={{ width: `${persentasePakai}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-biru-900">
                        <Clock className="w-3.5 h-3.5 text-biru-600" />
                        <span>
                          {new Date(v.tgl_kadaluarsa).toLocaleDateString(
                            "id-ID",
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {isExpired ? (
                        <Badge variant="gagal">KEDALUWARSA</Badge>
                      ) : v.kuota_terpakai >= v.kuota ? (
                        <Badge variant="gagal">HABIS</Badge>
                      ) : (
                        <Badge variant={v.is_active ? "berhasil" : "netral"}>
                          {v.is_active ? "AKTIF" : "NONAKTIF"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(v)}
                          title="Ubah Voucher"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-biru-700" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(v)}
                          title="Hapus Voucher"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-biru-900" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-biru-100 text-xs text-biru-800 font-medium">
            <span>
              Menampilkan{" "}
              {filteredVouchers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} -{" "}
              {Math.min(filteredVouchers.length, page * PAGE_SIZE)} dari{" "}
              {filteredVouchers.length} voucher diskon
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

      {/* MODAL TAMBAH/UBAH VOUCHER */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingVoucher ? "Ubah Voucher Diskon" : "Tambah Voucher Baru"}
            </DialogTitle>
            <DialogDescription>
              Tentukan kode promo, besaran diskon, kuota pemakaian, dan batas
              waktu berlaku.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 rounded-xl bg-biru-100 border border-biru-300 flex items-center gap-2 text-xs text-biru-950 font-medium">
                <AlertCircle className="w-4 h-4 text-biru-800 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Kode Voucher
              </label>
              <Input
                required
                placeholder="misal: HEMAT50"
                value={form.kode_voucher}
                onChange={(e) =>
                  setForm({
                    ...form,
                    kode_voucher: e.target.value.toUpperCase(),
                  })
                }
                disabled={editingVoucher !== null}
              />
              <p className="text-[11px] text-biru-700">
                Kode inilah yang diketik calon. Gunakan huruf, angka, atau tanda
                hubung (-), tanpa spasi. Kode tidak dapat diubah setelah
                disimpan.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Jenis Diskon
                </label>
                <select
                  className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                  value={form.tipe_diskon}
                  onChange={(e) =>
                    setForm({ ...form, tipe_diskon: e.target.value })
                  }
                >
                  <option value="NOMINAL">Nominal Rupiah (Rp)</option>
                  <option value="PERCENT">Persentase (%)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  {form.tipe_diskon === "PERCENT"
                    ? "Besaran Diskon (%)"
                    : "Besaran Diskon (Rp)"}
                </label>
                <Input
                  type="number"
                  min="1"
                  max={form.tipe_diskon === "PERCENT" ? 100 : undefined}
                  required
                  value={form.nilai_diskon}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nilai_diskon: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <p className="text-[11px] text-biru-700 -mt-1">
              Potongan berlaku untuk <strong>biaya formulir pendaftaran</strong>
              .{" "}
              {form.tipe_diskon === "PERCENT"
                ? `Contoh: biaya Rp 250.000 dengan diskon ${form.nilai_diskon || 0}% → calon membayar Rp ${Math.max(0, Math.round(250000 * (1 - (form.nilai_diskon || 0) / 100))).toLocaleString("id-ID")}.`
                : `Contoh: biaya Rp 250.000 dikurangi Rp ${(form.nilai_diskon || 0).toLocaleString("id-ID")} → calon membayar Rp ${Math.max(0, 250000 - (form.nilai_diskon || 0)).toLocaleString("id-ID")}.`}{" "}
              Bila hasilnya Rp 0, calon tidak perlu transfer. Mengubah potongan
              tidak memengaruhi tagihan yang sudah terbit.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Total Kuota Pemakaian
                </label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={form.kuota}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      kuota: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Masa Berlaku Hingga
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={form.tgl_kadaluarsa}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tgl_kadaluarsa: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Pembatasan Jalur (Opsional)
                </label>
                <select
                  className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                  value={form.batas_jalur_id || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      batas_jalur_id: e.target.value || null,
                    })
                  }
                >
                  <option value="">Berlaku untuk Semua Jalur</option>
                  {jalurList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nama_jalur}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Pembatasan Prodi (Opsional)
                </label>
                <select
                  className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                  value={form.batas_prodi_id || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      batas_prodi_id: e.target.value || null,
                    })
                  }
                >
                  <option value="">Berlaku untuk Semua Prodi</option>
                  {prodiList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_prodi}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Nama / Keterangan Voucher
              </label>
              <Input
                placeholder="misal: Potongan biaya pendaftaran early bird gelombang 1"
                value={form.deskripsi || ""}
                onChange={(e) =>
                  setForm({ ...form, deskripsi: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active_voucher"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                className="rounded border-biru-300 text-biru-700 focus:ring-biru-600"
              />
              <label
                htmlFor="is_active_voucher"
                className="text-xs font-semibold text-biru-950 cursor-pointer"
              >
                Voucher Aktif
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
                {isSubmitting ? "Menyimpan..." : "Simpan Voucher"}
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
              Hapus voucher{" "}
              <strong className="text-biru-950 font-mono">
                {deleteTarget?.kode_voucher}
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
