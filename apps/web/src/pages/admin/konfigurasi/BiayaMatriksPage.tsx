import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  Calculator,
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
  getMatriksBiayaList,
  createMatriksBiaya,
  updateMatriksBiaya,
  deleteMatriksBiaya,
  getKomponenBiayaList,
  createKomponenBiaya,
  updateKomponenBiaya,
  deleteKomponenBiaya,
  getProdiAdminList,
  getJalurAdminList,
  getGelombangAdminList,
  hitungSimulasiBiaya,
} from "@/services/konfigurasi";
import type {
  MatriksBiayaResponse,
  KomponenBiayaResponse,
  ProdiDetailResponse,
  JalurDetailResponse,
  GelombangDetailResponse,
  CreateMatriksBiayaRequest,
  UpdateMatriksBiayaRequest,
  CreateKomponenBiayaRequest,
  HitungBiayaResponse,
} from "@/types";

export const BiayaMatriksPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("matriks");

  // State Matriks Biaya
  const [matriksList, setMatriksList] = useState<MatriksBiayaResponse[]>([]);
  const [loadingMatriks, setLoadingMatriks] = useState(true);
  const [errorMatriks, setErrorMatriks] = useState<string | null>(null);
  const [searchMatriks, setSearchMatriks] = useState("");
  const [filterProdiMatriks, setFilterProdiMatriks] = useState("SEMUA");
  const [pageMatriks, setPageMatriks] = useState(1);

  // State Komponen Biaya
  const [komponenList, setKomponenList] = useState<KomponenBiayaResponse[]>([]);
  const [searchKomponen, setSearchKomponen] = useState("");
  const [pageKomponen, setPageKomponen] = useState(1);
  const PAGE_SIZE = 8;

  // Reference lists
  const [prodiList, setProdiList] = useState<ProdiDetailResponse[]>([]);
  const [jalurList, setJalurList] = useState<JalurDetailResponse[]>([]);
  const [gelombangList, setGelombangList] = useState<GelombangDetailResponse[]>(
    [],
  );

  // Modal Matriks
  const [isMatriksModalOpen, setIsMatriksModalOpen] = useState(false);
  const [editingMatriks, setEditingMatriks] =
    useState<MatriksBiayaResponse | null>(null);
  const [matriksForm, setMatriksForm] = useState<CreateMatriksBiayaRequest>({
    prodi_id: "",
    jalur_id: "",
    gelombang_id: "",
    komponen_id: "",
    nominal: 5000000,
    bisa_dicicil: true,
    maksimal_cicilan: 3,
    nominal_cicilan_pertama: 2500000,
  });

  // Modal Komponen Biaya
  const [isKomponenModalOpen, setIsKomponenModalOpen] = useState(false);
  const [editingKomponen, setEditingKomponen] =
    useState<KomponenBiayaResponse | null>(null);
  const [komponenForm, setKomponenForm] = useState<CreateKomponenBiayaRequest>({
    kode_komponen: "",
    nama_komponen: "",
    deskripsi: "",
    is_active: true,
  });

  // State Simulator Biaya
  const [simulasiProdi, setSimulasiProdi] = useState("");
  const [simulasiJalur, setSimulasiJalur] = useState("");
  const [simulasiGelombang, setSimulasiGelombang] = useState("");
  const [simulasiVoucher, setSimulasiVoucher] = useState("");
  const [simulasiResult, setSimulasiResult] =
    useState<HitungBiayaResponse | null>(null);
  const [loadingSimulasi, setLoadingSimulasi] = useState(false);
  const [simulasiError, setSimulasiError] = useState<string | null>(null);

  // Dialog Konfirmasi Hapus
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "matriks" | "komponen";
    id: string;
    nama: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoadingMatriks(true);
      const [m, k, p, j, g] = await Promise.all([
        getMatriksBiayaList(),
        getKomponenBiayaList(),
        getProdiAdminList(),
        getJalurAdminList(),
        getGelombangAdminList(),
      ]);
      setMatriksList(m);
      setKomponenList(k);
      setProdiList(p);
      setJalurList(j);
      setGelombangList(g);

      if (p.length > 0) setSimulasiProdi((prev) => prev || p[0].id);
      if (j.length > 0) setSimulasiJalur((prev) => prev || j[0].id);
      if (g.length > 0) setSimulasiGelombang((prev) => prev || g[0].id);
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setErrorMatriks(e.pesan || "Gagal memuat matriks biaya");
    } finally {
      setLoadingMatriks(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers Matriks Biaya
  const handleOpenAddMatriks = () => {
    setEditingMatriks(null);
    setMatriksForm({
      prodi_id: prodiList[0]?.id || "",
      jalur_id: jalurList[0]?.id || "",
      gelombang_id: gelombangList[0]?.id || "",
      komponen_id: komponenList[0]?.id || "",
      nominal: 5000000,
      bisa_dicicil: true,
      maksimal_cicilan: 3,
      nominal_cicilan_pertama: 2500000,
    });
    setFormError(null);
    setIsMatriksModalOpen(true);
  };

  const handleOpenEditMatriks = (m: MatriksBiayaResponse) => {
    setEditingMatriks(m);
    setMatriksForm({
      prodi_id: m.prodi_id,
      jalur_id: m.jalur_id,
      gelombang_id: m.gelombang_id,
      komponen_id: m.komponen_id,
      nominal: m.nominal,
      bisa_dicicil: m.bisa_dicicil,
      maksimal_cicilan: m.maksimal_cicilan,
      nominal_cicilan_pertama: m.nominal_cicilan_pertama,
    });
    setFormError(null);
    setIsMatriksModalOpen(true);
  };

  const handleSaveMatriks = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingMatriks) {
        const updatePayload: UpdateMatriksBiayaRequest = {
          nominal: matriksForm.nominal,
          bisa_dicicil: matriksForm.bisa_dicicil,
          maksimal_cicilan: matriksForm.maksimal_cicilan,
          nominal_cicilan_pertama: matriksForm.nominal_cicilan_pertama,
        };
        await updateMatriksBiaya(editingMatriks.id, updatePayload);
      } else {
        await createMatriksBiaya(matriksForm);
      }
      setIsMatriksModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setFormError(e.pesan || "Gagal menyimpan matriks biaya");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers Komponen Biaya
  const handleOpenAddKomponen = () => {
    setEditingKomponen(null);
    setKomponenForm({
      kode_komponen: "",
      nama_komponen: "",
      deskripsi: "",
      is_active: true,
    });
    setFormError(null);
    setIsKomponenModalOpen(true);
  };

  const handleOpenEditKomponen = (k: KomponenBiayaResponse) => {
    setEditingKomponen(k);
    setKomponenForm({
      kode_komponen: k.kode_komponen,
      nama_komponen: k.nama_komponen,
      deskripsi: k.deskripsi || "",
      is_active: k.is_active,
    });
    setFormError(null);
    setIsKomponenModalOpen(true);
  };

  const handleSaveKomponen = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingKomponen) {
        await updateKomponenBiaya(editingKomponen.id, komponenForm);
      } else {
        await createKomponenBiaya(komponenForm);
      }
      setIsKomponenModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setFormError(e.pesan || "Gagal menyimpan komponen biaya");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulator Handler
  const handleHitungSimulasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulasiProdi || !simulasiJalur || !simulasiGelombang) return;

    setLoadingSimulasi(true);
    setSimulasiError(null);
    try {
      const res = await hitungSimulasiBiaya({
        prodi_id: simulasiProdi,
        jalur_id: simulasiJalur,
        gelombang_id: simulasiGelombang,
        voucher_kode: simulasiVoucher.trim() || undefined,
      });
      setSimulasiResult(res);
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setSimulasiError(e.pesan || "Gagal menghitung simulasi biaya");
      setSimulasiResult(null);
    } finally {
      setLoadingSimulasi(false);
    }
  };

  // Hapus Handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      if (deleteTarget.type === "matriks") {
        await deleteMatriksBiaya(deleteTarget.id);
      } else {
        await deleteKomponenBiaya(deleteTarget.id);
      }
      setDeleteTarget(null);
      await fetchData();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      alert(e.pesan || "Gagal menghapus item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMatriks = matriksList.filter((m) => {
    const matchesSearch =
      m.nama_prodi.toLowerCase().includes(searchMatriks.toLowerCase()) ||
      m.nama_komponen.toLowerCase().includes(searchMatriks.toLowerCase()) ||
      m.nama_jalur.toLowerCase().includes(searchMatriks.toLowerCase());
    const matchesProdi =
      filterProdiMatriks === "SEMUA" || m.prodi_id === filterProdiMatriks;
    return matchesSearch && matchesProdi;
  });

  const totalPagesMatriks = Math.max(
    1,
    Math.ceil(filteredMatriks.length / PAGE_SIZE),
  );
  const pagedMatriks = filteredMatriks.slice(
    (pageMatriks - 1) * PAGE_SIZE,
    pageMatriks * PAGE_SIZE,
  );

  const filteredKomponen = komponenList.filter(
    (k) =>
      k.nama_komponen.toLowerCase().includes(searchKomponen.toLowerCase()) ||
      k.kode_komponen.toLowerCase().includes(searchKomponen.toLowerCase()),
  );

  const totalPagesKomponen = Math.max(
    1,
    Math.ceil(filteredKomponen.length / PAGE_SIZE),
  );
  const pagedKomponen = filteredKomponen.slice(
    (pageKomponen - 1) * PAGE_SIZE,
    pageKomponen * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-biru-700 uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" />
            <span>Keuangan & Tarif Kuliah</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Matriks Biaya & Skema Cicilan
          </h1>
          <p className="text-xs sm:text-sm text-biru-800 font-light mt-1">
            Atur tarif biaya per prodi, jalur pendaftaran, dan gelombang serta
            skema cicilan pembayaran bagi mahasiswa baru.
          </p>
        </div>
      </div>

      <Tabs
        defaultValue="matriks"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full sm:w-[500px] grid-cols-3">
          <TabsTrigger value="matriks">Matriks Biaya</TabsTrigger>
          <TabsTrigger value="komponen">Komponen Biaya</TabsTrigger>
          <TabsTrigger value="kalkulator">Kalkulator Simulasi</TabsTrigger>
        </TabsList>

        {/* TAB 1: MATRIKS BIAYA */}
        <TabsContent value="matriks" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-biru-600" />
                <Input
                  placeholder="Cari prodi, jalur, komponen..."
                  value={searchMatriks}
                  onChange={(e) => {
                    setSearchMatriks(e.target.value);
                    setPageMatriks(1);
                  }}
                  className="pl-9 text-xs"
                />
              </div>
              <select
                value={filterProdiMatriks}
                onChange={(e) => {
                  setFilterProdiMatriks(e.target.value);
                  setPageMatriks(1);
                }}
                className="rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
              >
                <option value="SEMUA">Semua Program Studi</option>
                {prodiList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_prodi}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleOpenAddMatriks}
              className="flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Matriks Biaya</span>
            </Button>
          </div>

          {loadingMatriks ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : errorMatriks ? (
            <ErrorState
              title="Gagal Memuat Matriks Biaya"
              message={errorMatriks}
              onRetry={fetchData}
            />
          ) : filteredMatriks.length === 0 ? (
            <EmptyState
              title="Belum Ada Matriks Biaya"
              description="Konfigurasikan tarif komponen biaya untuk program studi, jalur, dan gelombang."
              actionLabel="Tambah Matriks"
              onAction={handleOpenAddMatriks}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program Studi</TableHead>
                    <TableHead>Jalur & Gelombang</TableHead>
                    <TableHead>Komponen Biaya</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead className="text-center">Skema Cicilan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedMatriks.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-semibold text-biru-950">
                        {m.nama_prodi}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-medium text-biru-900">
                          {m.nama_jalur}
                        </p>
                        <span className="text-[11px] text-biru-700">
                          {m.nama_gelombang}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-biru-950">
                          {m.nama_komponen}
                        </p>
                        <span className="text-[11px] font-mono text-biru-700">
                          [{m.kode_komponen}]
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-biru-950">
                        Rp {m.nominal.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-center">
                        {m.bisa_dicicil ? (
                          <div className="inline-flex flex-col items-center">
                            <Badge variant="menunggu">
                              Hingga {m.maksimal_cicilan}x
                            </Badge>
                            {m.nominal_cicilan_pertama && (
                              <span className="text-[10px] text-biru-800 font-mono mt-0.5">
                                Termin 1: Rp{" "}
                                {m.nominal_cicilan_pertama.toLocaleString(
                                  "id-ID",
                                )}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="netral">Lunas di Awal</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditMatriks(m)}
                            title="Ubah Tarif"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-biru-700" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteTarget({
                                type: "matriks",
                                id: m.id,
                                nama: `${m.nama_komponen} - ${m.nama_prodi}`,
                              })
                            }
                            title="Hapus Tarif"
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
                  {filteredMatriks.length === 0
                    ? 0
                    : (pageMatriks - 1) * PAGE_SIZE + 1}{" "}
                  - {Math.min(filteredMatriks.length, pageMatriks * PAGE_SIZE)}{" "}
                  dari {filteredMatriks.length} matriks biaya
                </span>
                {totalPagesMatriks > 1 && (
                  <Pagination
                    currentPage={pageMatriks}
                    totalPages={totalPagesMatriks}
                    onPageChange={setPageMatriks}
                  />
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* TAB 2: KOMPONEN BIAYA */}
        <TabsContent value="komponen" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-biru-600" />
              <Input
                placeholder="Cari kode atau nama komponen..."
                value={searchKomponen}
                onChange={(e) => {
                  setSearchKomponen(e.target.value);
                  setPageKomponen(1);
                }}
                className="pl-9 text-xs"
              />
            </div>
            <Button
              onClick={handleOpenAddKomponen}
              className="flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Komponen</span>
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Kode</TableHead>
                <TableHead>Nama Komponen Biaya</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedKomponen.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-mono text-xs font-bold text-biru-900">
                    {k.kode_komponen}
                  </TableCell>
                  <TableCell className="font-semibold text-biru-950">
                    {k.nama_komponen}
                  </TableCell>
                  <TableCell className="text-xs text-biru-800">
                    {k.deskripsi || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={k.is_active ? "berhasil" : "netral"}>
                      {k.is_active ? "AKTIF" : "NONAKTIF"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditKomponen(k)}
                        title="Ubah Komponen"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-biru-700" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeleteTarget({
                            type: "komponen",
                            id: k.id,
                            nama: k.nama_komponen,
                          })
                        }
                        title="Hapus Komponen"
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
              {filteredKomponen.length === 0
                ? 0
                : (pageKomponen - 1) * PAGE_SIZE + 1}{" "}
              - {Math.min(filteredKomponen.length, pageKomponen * PAGE_SIZE)}{" "}
              dari {filteredKomponen.length} komponen biaya
            </span>
            {totalPagesKomponen > 1 && (
              <Pagination
                currentPage={pageKomponen}
                totalPages={totalPagesKomponen}
                onPageChange={setPageKomponen}
              />
            )}
          </div>
        </TabsContent>

        {/* TAB 3: KALKULATOR & SIMULASI BIAYA */}
        <TabsContent value="kalkulator" className="space-y-6 mt-6">
          <div className="bg-putih border border-biru-200 rounded-2xl p-6 shadow-soft-sm space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-biru-700 uppercase tracking-wider mb-1">
                <Calculator className="w-4 h-4" />
                <span>Simulasi Biaya & Diskon Otomatis</span>
              </div>
              <h2 className="text-lg font-serif font-bold text-biru-950">
                Kalkulator Estimasi Biaya Kuliah Mahasiswa Baru
              </h2>
              <p className="text-xs text-biru-800 font-light mt-0.5">
                Hitung rincian biaya riil berdasarkan kombinasi prodi, jalur,
                gelombang dan kupon voucher.
              </p>
            </div>

            <form
              onSubmit={handleHitungSimulasi}
              className="grid grid-cols-1 sm:grid-cols-4 gap-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Program Studi
                </label>
                <select
                  className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                  value={simulasiProdi}
                  onChange={(e) => setSimulasiProdi(e.target.value)}
                >
                  {prodiList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_prodi}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Jalur Masuk
                </label>
                <select
                  className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                  value={simulasiJalur}
                  onChange={(e) => setSimulasiJalur(e.target.value)}
                >
                  {jalurList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nama_jalur}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Gelombang
                </label>
                <select
                  className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                  value={simulasiGelombang}
                  onChange={(e) => setSimulasiGelombang(e.target.value)}
                >
                  {gelombangList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama_gelombang}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Kode Voucher (Opsional)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="misal: [CONTOH] TRIPUTRA50"
                    value={simulasiVoucher}
                    onChange={(e) => setSimulasiVoucher(e.target.value)}
                    className="text-xs"
                  />
                  <Button type="submit" disabled={loadingSimulasi}>
                    {loadingSimulasi ? "Menghitung..." : "Hitung"}
                  </Button>
                </div>
              </div>
            </form>

            {simulasiError && (
              <div className="p-3 rounded-xl bg-biru-100 border border-biru-300 flex items-center gap-2 text-xs text-biru-950 font-medium">
                <AlertCircle className="w-4 h-4 text-biru-800 shrink-0" />
                <span>{simulasiError}</span>
              </div>
            )}

            {simulasiResult && (
              <div className="border-t border-biru-100 pt-5 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-bold text-biru-950">
                    Rincian Komponen Biaya & Skema Pembayaran
                  </h3>
                  {simulasiResult.voucher_pesan && (
                    <Badge variant="menunggu">
                      {simulasiResult.voucher_pesan}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 border border-biru-100 rounded-xl p-4 bg-biru-50/30">
                    <span className="text-xs font-bold text-biru-900 uppercase tracking-wider">
                      Komponen Biaya Terdaftar
                    </span>
                    <div className="divide-y divide-biru-100 text-xs">
                      {simulasiResult.rincian_komponen.map((item) => (
                        <div
                          key={item.komponen_id}
                          className="py-2 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-semibold text-biru-950">
                              {item.nama_komponen}
                            </p>
                            <span className="text-[11px] text-biru-700">
                              {item.bisa_dicicil
                                ? `Bisa dicicil ${item.maksimal_cicilan}x`
                                : "Lunas di muka"}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-biru-950">
                            Rp {item.nominal.toLocaleString("id-ID")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-biru-950 text-putih rounded-xl p-5 space-y-3 flex flex-col justify-between">
                    <span className="text-xs font-bold text-biru-200 uppercase tracking-wider">
                      Ringkasan Kewajiban Pembayaran
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-biru-200">
                        <span>Total Biaya Asli:</span>
                        <span className="font-mono">
                          Rp{" "}
                          {simulasiResult.total_nominal_asli.toLocaleString(
                            "id-ID",
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-biru-300">
                        <span>Diskon Kupon Voucher:</span>
                        <span className="font-mono">
                          - Rp{" "}
                          {simulasiResult.diskon_voucher.toLocaleString(
                            "id-ID",
                          )}
                        </span>
                      </div>
                      <div className="border-t border-biru-800 pt-2 flex justify-between font-bold text-sm text-putih">
                        <span>Total Akhir:</span>
                        <span className="font-mono text-base text-biru-300">
                          Rp{" "}
                          {simulasiResult.total_akhir.toLocaleString(
                            "id-ID",
                          )}
                        </span>
                      </div>
                      <div className="border-t border-biru-800/60 pt-2 flex justify-between text-xs text-biru-200">
                        <span>Minimal Pembayaran Pertama:</span>
                        <span className="font-mono font-bold text-putih">
                          Rp{" "}
                          {simulasiResult.estimasi_cicilan_pertama.toLocaleString(
                            "id-ID",
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!simulasiResult && !simulasiError && !loadingSimulasi && (
              <div className="border border-dashed border-biru-200 rounded-xl p-8 text-center space-y-2 bg-biru-50/20">
                <Calculator className="w-8 h-8 text-biru-400 mx-auto" />
                <p className="text-xs font-semibold text-biru-900">
                  Belum Ada Hasil Simulasi Biaya
                </p>
                <p className="text-[11px] text-biru-700 max-w-md mx-auto">
                  Pilih Program Studi, Jalur Masuk, dan Gelombang di atas, lalu
                  tekan tombol Hitung untuk menguji matriks biaya, potongan
                  diskon voucher, dan skema cicilan termin.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL MATRIKS BIAYA */}
      <Dialog open={isMatriksModalOpen} onOpenChange={setIsMatriksModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMatriks ? "Ubah Matriks Biaya" : "Tambah Matriks Biaya"}
            </DialogTitle>
            <DialogDescription>
              Tentukan nominal dan skema cicilan untuk kombinasi prodi, jalur,
              dan komponen biaya.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMatriks} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 rounded-xl bg-biru-100 border border-biru-300 flex items-center gap-2 text-xs text-biru-950 font-medium">
                <AlertCircle className="w-4 h-4 text-biru-800 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {!editingMatriks && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-biru-900">
                      Program Studi
                    </label>
                    <select
                      className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                      value={matriksForm.prodi_id}
                      onChange={(e) =>
                        setMatriksForm({
                          ...matriksForm,
                          prodi_id: e.target.value,
                        })
                      }
                    >
                      {prodiList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama_prodi}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-biru-900">
                      Jalur Masuk
                    </label>
                    <select
                      className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                      value={matriksForm.jalur_id}
                      onChange={(e) =>
                        setMatriksForm({
                          ...matriksForm,
                          jalur_id: e.target.value,
                        })
                      }
                    >
                      {jalurList.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.nama_jalur}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-biru-900">
                      Gelombang
                    </label>
                    <select
                      className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                      value={matriksForm.gelombang_id}
                      onChange={(e) =>
                        setMatriksForm({
                          ...matriksForm,
                          gelombang_id: e.target.value,
                        })
                      }
                    >
                      {gelombangList.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nama_gelombang}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-biru-900">
                      Komponen Biaya
                    </label>
                    <select
                      className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                      value={matriksForm.komponen_id}
                      onChange={(e) =>
                        setMatriksForm({
                          ...matriksForm,
                          komponen_id: e.target.value,
                        })
                      }
                    >
                      {komponenList.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nama_komponen}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Nominal Biaya (Rp)
              </label>
              <Input
                type="number"
                min="0"
                required
                value={matriksForm.nominal}
                onChange={(e) =>
                  setMatriksForm({
                    ...matriksForm,
                    nominal: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="bisa_dicicil"
                checked={matriksForm.bisa_dicicil}
                onChange={(e) =>
                  setMatriksForm({
                    ...matriksForm,
                    bisa_dicicil: e.target.checked,
                  })
                }
                className="rounded border-biru-300 text-biru-700 focus:ring-biru-600"
              />
              <label
                htmlFor="bisa_dicicil"
                className="text-xs font-semibold text-biru-950 cursor-pointer"
              >
                Komponen ini dapat dicicil
              </label>
            </div>

            {matriksForm.bisa_dicicil && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-biru-900">
                    Maksimal Termin Cicilan
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={matriksForm.maksimal_cicilan}
                    onChange={(e) =>
                      setMatriksForm({
                        ...matriksForm,
                        maksimal_cicilan: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-biru-900">
                    Nominal Termin Pertama (Rp)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Opsional (otomatis dibagi)"
                    value={matriksForm.nominal_cicilan_pertama || ""}
                    onChange={(e) =>
                      setMatriksForm({
                        ...matriksForm,
                        nominal_cicilan_pertama: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsMatriksModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Matriks Biaya"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL KOMPONEN BIAYA */}
      <Dialog open={isKomponenModalOpen} onOpenChange={setIsKomponenModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingKomponen
                ? "Ubah Komponen Biaya"
                : "Tambah Komponen Biaya"}
            </DialogTitle>
            <DialogDescription>
              Tentukan nama baku jenis biaya tagihan penerimaan mahasiswa baru.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveKomponen} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 rounded-xl bg-biru-100 border border-biru-300 flex items-center gap-2 text-xs text-biru-950 font-medium">
                <AlertCircle className="w-4 h-4 text-biru-800 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Kode Komponen
              </label>
              <Input
                required
                placeholder="misal: DPK"
                value={komponenForm.kode_komponen}
                onChange={(e) =>
                  setKomponenForm({
                    ...komponenForm,
                    kode_komponen: e.target.value,
                  })
                }
                disabled={editingKomponen !== null}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Nama Komponen
              </label>
              <Input
                required
                placeholder="misal: [CONTOH] Dana Pengembangan Kampus"
                value={komponenForm.nama_komponen}
                onChange={(e) =>
                  setKomponenForm({
                    ...komponenForm,
                    nama_komponen: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Deskripsi
              </label>
              <Input
                placeholder="Keterangan alokasi biaya"
                value={komponenForm.deskripsi || ""}
                onChange={(e) =>
                  setKomponenForm({
                    ...komponenForm,
                    deskripsi: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active_komponen"
                checked={komponenForm.is_active}
                onChange={(e) =>
                  setKomponenForm({
                    ...komponenForm,
                    is_active: e.target.checked,
                  })
                }
                className="rounded border-biru-300 text-biru-700 focus:ring-biru-600"
              />
              <label
                htmlFor="is_active_komponen"
                className="text-xs font-semibold text-biru-950 cursor-pointer"
              >
                Komponen Biaya Aktif
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsKomponenModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Komponen"}
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
