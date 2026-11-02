import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  EmptyState,
  ErrorState,
  Skeleton,
  Pagination,
} from "@/components/ui";
import {
  getGelombangAdminList,
  createGelombang,
  updateGelombang,
  deleteGelombang,
  getTahunAkademikList,
  createTahunAkademik,
  updateTahunAkademik,
  deleteTahunAkademik,
} from "@/services/konfigurasi";
import type {
  GelombangDetailResponse,
  TahunAkademikResponse,
  CreateGelombangRequest,
  UpdateGelombangRequest,
  CreateTahunAkademikRequest,
} from "@/types";

export const TahunGelombangPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("gelombang");

  // State Gelombang
  const [gelombangList, setGelombangList] = useState<GelombangDetailResponse[]>(
    [],
  );
  const [loadingGelombang, setLoadingGelombang] = useState(true);
  const [errorGelombang, setErrorGelombang] = useState<string | null>(null);
  const [searchGelombang, setSearchGelombang] = useState("");
  const [filterStatusGelombang, setFilterStatusGelombang] = useState("SEMUA");
  const [pageGelombang, setPageGelombang] = useState(1);

  // State Tahun Akademik
  const [tahunList, setTahunList] = useState<TahunAkademikResponse[]>([]);
  const [loadingTahun, setLoadingTahun] = useState(true);
  const [errorTahun, setErrorTahun] = useState<string | null>(null);
  const [searchTahun, setSearchTahun] = useState("");
  const [filterStatusTahun, setFilterStatusTahun] = useState("SEMUA");
  const [pageTahun, setPageTahun] = useState(1);
  const PAGE_SIZE = 8;

  // Modal Gelombang
  const [isGelombangModalOpen, setIsGelombangModalOpen] = useState(false);
  const [editingGelombang, setEditingGelombang] =
    useState<GelombangDetailResponse | null>(null);
  const [gelombangForm, setGelombangForm] = useState<CreateGelombangRequest>({
    nama_gelombang: "",
    tahun_akademik_id: null,
    nomor_gelombang: 1,
    status: "buka",
    tgl_mulai: "",
    tgl_selesai: "",
    kuota: 100,
    is_active: true,
  });

  // Modal Tahun Akademik
  const [isTahunModalOpen, setIsTahunModalOpen] = useState(false);
  const [editingTahun, setEditingTahun] =
    useState<TahunAkademikResponse | null>(null);
  const [tahunForm, setTahunForm] = useState<CreateTahunAkademikRequest>({
    kode: "",
    nama: "",
    tgl_mulai: "2026-09-01",
    tgl_selesai: "2027-08-31",
    is_active: true,
  });

  // Dialog Konfirmasi Hapus
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "gelombang" | "tahun";
    id: string;
    nama: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchGelombangData = async () => {
    try {
      setLoadingGelombang(true);
      setErrorGelombang(null);
      const data = await getGelombangAdminList();
      setGelombangList(data);
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setErrorGelombang(e.pesan || "Gagal memuat daftar gelombang pendaftaran");
    } finally {
      setLoadingGelombang(false);
    }
  };

  const fetchTahunData = async () => {
    try {
      setLoadingTahun(true);
      setErrorTahun(null);
      const data = await getTahunAkademikList();
      setTahunList(data);
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setErrorTahun(e.pesan || "Gagal memuat daftar tahun akademik");
    } finally {
      setLoadingTahun(false);
    }
  };

  useEffect(() => {
    fetchGelombangData();
    fetchTahunData();
  }, []);

  // Handler Gelombang
  const handleOpenAddGelombang = () => {
    setEditingGelombang(null);
    setGelombangForm({
      nama_gelombang: "",
      tahun_akademik_id: tahunList.length > 0 ? tahunList[0].id : null,
      nomor_gelombang: gelombangList.length + 1,
      status: "buka",
      tgl_mulai: new Date().toISOString().slice(0, 16),
      tgl_selesai: new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .slice(0, 16),
      kuota: 100,
      is_active: true,
    });
    setFormError(null);
    setIsGelombangModalOpen(true);
  };

  const handleOpenEditGelombang = (g: GelombangDetailResponse) => {
    setEditingGelombang(g);
    setGelombangForm({
      nama_gelombang: g.nama_gelombang,
      tahun_akademik_id: g.tahun_akademik_id || null,
      nomor_gelombang: g.nomor_gelombang,
      status: g.status,
      tgl_mulai: new Date(g.tgl_mulai).toISOString().slice(0, 16),
      tgl_selesai: new Date(g.tgl_selesai).toISOString().slice(0, 16),
      kuota: g.kuota,
      is_active: g.is_active,
    });
    setFormError(null);
    setIsGelombangModalOpen(true);
  };

  const handleSaveGelombang = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: CreateGelombangRequest = {
        ...gelombangForm,
        tgl_mulai: new Date(gelombangForm.tgl_mulai).toISOString(),
        tgl_selesai: new Date(gelombangForm.tgl_selesai).toISOString(),
      };

      if (editingGelombang) {
        const updatePayload: UpdateGelombangRequest = {
          nama_gelombang: payload.nama_gelombang,
          nomor_gelombang: payload.nomor_gelombang,
          tahun_akademik_id: payload.tahun_akademik_id,
          status: payload.status,
          tgl_mulai: payload.tgl_mulai,
          tgl_selesai: payload.tgl_selesai,
          kuota: payload.kuota,
          is_active: payload.is_active,
        };
        await updateGelombang(editingGelombang.id, updatePayload);
      } else {
        await createGelombang(payload);
      }
      setIsGelombangModalOpen(false);
      await fetchGelombangData();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setFormError(e.pesan || "Terjadi kesalahan saat menyimpan gelombang");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Tahun Akademik
  const handleOpenAddTahun = () => {
    setEditingTahun(null);
    setTahunForm({
      kode: "",
      nama: "",
      tgl_mulai: "2026-09-01",
      tgl_selesai: "2027-08-31",
      is_active: true,
    });
    setFormError(null);
    setIsTahunModalOpen(true);
  };

  const handleOpenEditTahun = (t: TahunAkademikResponse) => {
    setEditingTahun(t);
    setTahunForm({
      kode: t.kode,
      nama: t.nama,
      tgl_mulai: t.tgl_mulai,
      tgl_selesai: t.tgl_selesai,
      is_active: t.is_active,
    });
    setFormError(null);
    setIsTahunModalOpen(true);
  };

  const handleSaveTahun = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingTahun) {
        await updateTahunAkademik(editingTahun.id, tahunForm);
      } else {
        await createTahunAkademik(tahunForm);
      }
      setIsTahunModalOpen(false);
      await fetchTahunData();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setFormError(
        e.pesan || "Terjadi kesalahan saat menyimpan tahun akademik",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Hapus
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      if (deleteTarget.type === "gelombang") {
        await deleteGelombang(deleteTarget.id);
        await fetchGelombangData();
      } else {
        await deleteTahunAkademik(deleteTarget.id);
        await fetchTahunData();
      }
      setDeleteTarget(null);
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      alert(e.pesan || "Gagal menghapus data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredGelombang = gelombangList.filter((g) => {
    const matchesSearch = g.nama_gelombang
      .toLowerCase()
      .includes(searchGelombang.toLowerCase());
    const matchesStatus =
      filterStatusGelombang === "SEMUA" ||
      g.status.toLowerCase() === filterStatusGelombang.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalPagesGelombang = Math.max(
    1,
    Math.ceil(filteredGelombang.length / PAGE_SIZE),
  );
  const pagedGelombang = filteredGelombang.slice(
    (pageGelombang - 1) * PAGE_SIZE,
    pageGelombang * PAGE_SIZE,
  );

  const filteredTahun = tahunList.filter((t) => {
    const matchesSearch =
      t.nama.toLowerCase().includes(searchTahun.toLowerCase()) ||
      t.kode.toLowerCase().includes(searchTahun.toLowerCase());
    const matchesStatus =
      filterStatusTahun === "SEMUA" ||
      (filterStatusTahun === "AKTIF" ? t.is_active : !t.is_active);
    return matchesSearch && matchesStatus;
  });

  const totalPagesTahun = Math.max(
    1,
    Math.ceil(filteredTahun.length / PAGE_SIZE),
  );
  const pagedTahun = filteredTahun.slice(
    (pageTahun - 1) * PAGE_SIZE,
    pageTahun * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-biru-700 uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Konfigurasi PMB</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Tahun Akademik & Gelombang
          </h1>
          <p className="text-xs sm:text-sm text-biru-800 font-light mt-1">
            Kelola periode pendaftaran, masa berlaku gelombang, kuota, dan
            status buka/tutup.
          </p>
        </div>
      </div>

      <Tabs
        defaultValue="gelombang"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
          <TabsTrigger value="gelombang">Gelombang Pendaftaran</TabsTrigger>
          <TabsTrigger value="tahun">Tahun Akademik</TabsTrigger>
        </TabsList>

        {/* TAB 1: GELOMBANG PENDAFTARAN */}
        <TabsContent value="gelombang" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-biru-600" />
                <Input
                  placeholder="Cari nama gelombang..."
                  value={searchGelombang}
                  onChange={(e) => {
                    setSearchGelombang(e.target.value);
                    setPageGelombang(1);
                  }}
                  className="pl-9 text-xs"
                />
              </div>
              <select
                value={filterStatusGelombang}
                onChange={(e) => {
                  setFilterStatusGelombang(e.target.value);
                  setPageGelombang(1);
                }}
                className="rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="buka">Buka</option>
                <option value="tutup">Tutup</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <Button
              onClick={handleOpenAddGelombang}
              className="flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Gelombang</span>
            </Button>
          </div>

          {loadingGelombang ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : errorGelombang ? (
            <ErrorState
              title="Gagal Memuat Gelombang"
              message={errorGelombang}
              onRetry={fetchGelombangData}
            />
          ) : filteredGelombang.length === 0 ? (
            <EmptyState
              title="Belum Ada Gelombang Pendaftaran"
              description="Buat gelombang pendaftaran baru untuk membuka penerimaan mahasiswa baru."
              actionLabel="Tambah Gelombang"
              onAction={handleOpenAddGelombang}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>Nama Gelombang</TableHead>
                    <TableHead>Tahun Akademik</TableHead>
                    <TableHead>Periode Buka - Tutup</TableHead>
                    <TableHead className="text-center">Kuota</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedGelombang.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="text-center font-mono text-xs font-bold text-biru-900">
                        #{g.nomor_gelombang}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-biru-950">
                          {g.nama_gelombang}
                        </p>
                        <span className="text-[11px] text-biru-700">
                          ID: {g.id.slice(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-biru-900 font-medium">
                          {g.tahun_akademik_nama || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-biru-900">
                          <Clock className="w-3.5 h-3.5 text-biru-600" />
                          <span>
                            {new Date(g.tgl_mulai).toLocaleDateString("id-ID")}{" "}
                            s/d{" "}
                            {new Date(g.tgl_selesai).toLocaleDateString(
                              "id-ID",
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-biru-950">
                        {g.kuota}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            g.status === "buka"
                              ? "berhasil"
                              : g.status === "tutup"
                                ? "gagal"
                                : "netral"
                          }
                        >
                          {g.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditGelombang(g)}
                            title="Ubah Gelombang"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-biru-700" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteTarget({
                                type: "gelombang",
                                id: g.id,
                                nama: g.nama_gelombang,
                              })
                            }
                            title="Hapus Gelombang"
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
                  {filteredGelombang.length === 0
                    ? 0
                    : (pageGelombang - 1) * PAGE_SIZE + 1}{" "}
                  -{" "}
                  {Math.min(
                    filteredGelombang.length,
                    pageGelombang * PAGE_SIZE,
                  )}{" "}
                  dari {filteredGelombang.length} gelombang
                </span>
                {totalPagesGelombang > 1 && (
                  <Pagination
                    currentPage={pageGelombang}
                    totalPages={totalPagesGelombang}
                    onPageChange={setPageGelombang}
                  />
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* TAB 2: TAHUN AKADEMIK */}
        <TabsContent value="tahun" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-biru-600" />
                <Input
                  placeholder="Cari kode atau nama tahun..."
                  value={searchTahun}
                  onChange={(e) => {
                    setSearchTahun(e.target.value);
                    setPageTahun(1);
                  }}
                  className="pl-9 text-xs"
                />
              </div>
              <select
                value={filterStatusTahun}
                onChange={(e) => {
                  setFilterStatusTahun(e.target.value);
                  setPageTahun(1);
                }}
                className="rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="AKTIF">Hanya Aktif</option>
                <option value="NONAKTIF">Nonaktif</option>
              </select>
            </div>
            <Button
              onClick={handleOpenAddTahun}
              className="flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tahun Akademik</span>
            </Button>
          </div>

          {loadingTahun ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : errorTahun ? (
            <ErrorState
              title="Gagal Memuat Tahun Akademik"
              message={errorTahun}
              onRetry={fetchTahunData}
            />
          ) : filteredTahun.length === 0 ? (
            <EmptyState
              title="Belum Ada Tahun Akademik"
              description="Tambahkan tahun akademik baru untuk memulai siklus penerimaan mahasiswa baru."
              actionLabel="Tambah Tahun Akademik"
              onAction={handleOpenAddTahun}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Tahun Akademik</TableHead>
                    <TableHead>Rentang Tanggal</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedTahun.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs font-bold text-biru-900">
                        {t.kode}
                      </TableCell>
                      <TableCell className="font-semibold text-biru-950">
                        {t.nama}
                      </TableCell>
                      <TableCell className="text-xs text-biru-900">
                        {t.tgl_mulai} s/d {t.tgl_selesai}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={t.is_active ? "berhasil" : "netral"}>
                          {t.is_active ? "AKTIF" : "NONAKTIF"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditTahun(t)}
                            title="Ubah Tahun Akademik"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-biru-700" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteTarget({
                                type: "tahun",
                                id: t.id,
                                nama: t.nama,
                              })
                            }
                            title="Hapus Tahun Akademik"
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
                  {filteredTahun.length === 0
                    ? 0
                    : (pageTahun - 1) * PAGE_SIZE + 1}{" "}
                  - {Math.min(filteredTahun.length, pageTahun * PAGE_SIZE)} dari{" "}
                  {filteredTahun.length} tahun akademik
                </span>
                {totalPagesTahun > 1 && (
                  <Pagination
                    currentPage={pageTahun}
                    totalPages={totalPagesTahun}
                    onPageChange={setPageTahun}
                  />
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL GELOMBANG */}
      <Dialog
        open={isGelombangModalOpen}
        onOpenChange={setIsGelombangModalOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingGelombang
                ? "Ubah Gelombang Pendaftaran"
                : "Tambah Gelombang Baru"}
            </DialogTitle>
            <DialogDescription>
              Tentukan periode tanggal buka/tutup dan kuota pendaftaran. Sistem
              akan memvalidasi agar tanggal tidak tumpang tindih.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGelombang} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 rounded-xl bg-biru-100 border border-biru-300 flex items-center gap-2 text-xs text-biru-950 font-medium">
                <AlertCircle className="w-4 h-4 text-biru-800 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Nama Gelombang
              </label>
              <Input
                required
                placeholder="misal: [CONTOH] Gelombang I (Early Bird)"
                value={gelombangForm.nama_gelombang}
                onChange={(e) =>
                  setGelombangForm({
                    ...gelombangForm,
                    nama_gelombang: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Nomor Gelombang
                </label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={gelombangForm.nomor_gelombang}
                  onChange={(e) =>
                    setGelombangForm({
                      ...gelombangForm,
                      nomor_gelombang: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Kuota Gelombang
                </label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={gelombangForm.kuota}
                  onChange={(e) =>
                    setGelombangForm({
                      ...gelombangForm,
                      kuota: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Tanggal & Jam Mulai
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={gelombangForm.tgl_mulai}
                  onChange={(e) =>
                    setGelombangForm({
                      ...gelombangForm,
                      tgl_mulai: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Tanggal & Jam Selesai
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={gelombangForm.tgl_selesai}
                  onChange={(e) =>
                    setGelombangForm({
                      ...gelombangForm,
                      tgl_selesai: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Tahun Akademik
                </label>
                <select
                  className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                  value={gelombangForm.tahun_akademik_id || ""}
                  onChange={(e) =>
                    setGelombangForm({
                      ...gelombangForm,
                      tahun_akademik_id: e.target.value || null,
                    })
                  }
                >
                  <option value="">Pilih Tahun Akademik</option>
                  {tahunList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.kode} - {t.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Status Gelombang
                </label>
                <select
                  className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                  value={gelombangForm.status}
                  onChange={(e) =>
                    setGelombangForm({
                      ...gelombangForm,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="buka">Buka (Menerima Pendaftar)</option>
                  <option value="tutup">Tutup Sementara</option>
                  <option value="selesai">Selesai / Berakhir</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsGelombangModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Gelombang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL TAHUN AKADEMIK */}
      <Dialog open={isTahunModalOpen} onOpenChange={setIsTahunModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTahun
                ? "Ubah Tahun Akademik"
                : "Tambah Tahun Akademik Baru"}
            </DialogTitle>
            <DialogDescription>
              Tentukan kode dan nama tahun akademik serta rentang tanggal
              berlaku.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTahun} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 rounded-xl bg-biru-100 border border-biru-300 flex items-center gap-2 text-xs text-biru-950 font-medium">
                <AlertCircle className="w-4 h-4 text-biru-800 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Kode Tahun Akademik
              </label>
              <Input
                required
                placeholder="misal: 2026/2027"
                value={tahunForm.kode}
                onChange={(e) =>
                  setTahunForm({ ...tahunForm, kode: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Nama Tahun Akademik
              </label>
              <Input
                required
                placeholder="misal: [CONTOH] Tahun Akademik 2026/2027"
                value={tahunForm.nama}
                onChange={(e) =>
                  setTahunForm({ ...tahunForm, nama: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Tanggal Mulai
                </label>
                <Input
                  type="date"
                  required
                  value={tahunForm.tgl_mulai}
                  onChange={(e) =>
                    setTahunForm({ ...tahunForm, tgl_mulai: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Tanggal Selesai
                </label>
                <Input
                  type="date"
                  required
                  value={tahunForm.tgl_selesai}
                  onChange={(e) =>
                    setTahunForm({ ...tahunForm, tgl_selesai: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active_tahun"
                checked={tahunForm.is_active}
                onChange={(e) =>
                  setTahunForm({ ...tahunForm, is_active: e.target.checked })
                }
                className="rounded border-biru-300 text-biru-700 focus:ring-biru-600"
              />
              <label
                htmlFor="is_active_tahun"
                className="text-xs font-semibold text-biru-950 cursor-pointer"
              >
                Tahun Akademik Aktif
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsTahunModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Tahun Akademik"}
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
              Apakah Anda yakin ingin menghapus{" "}
              <strong className="text-biru-950">{deleteTarget?.nama}</strong>?
              Data yang terhapus tidak dapat dikembalikan.
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
