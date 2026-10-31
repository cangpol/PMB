import React, { useState, useEffect } from "react";
import {
  GraduationCap,
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
  getProdiAdminList,
  createProdi,
  updateProdi,
  deleteProdi,
  getFakultasList,
  createFakultas,
  updateFakultas,
  deleteFakultas,
  getKuotaProdiGelombangList,
  setKuotaProdiGelombang,
  getGelombangAdminList,
} from "@/services/konfigurasi";
import type {
  ProdiDetailResponse,
  FakultasResponse,
  KuotaProdiGelombangResponse,
  GelombangDetailResponse,
  CreateProdiKonfigurasiRequest,
  UpdateProdiKonfigurasiRequest,
  CreateFakultasRequest,
  SetKuotaProdiGelombangRequest,
} from "@/types";

export const FakultasProdiPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("prodi");

  // State Prodi
  const [prodiList, setProdiList] = useState<ProdiDetailResponse[]>([]);
  const [loadingProdi, setLoadingProdi] = useState(true);
  const [errorProdi, setErrorProdi] = useState<string | null>(null);
  const [searchProdi, setSearchProdi] = useState("");
  const [filterJenjangProdi, setFilterJenjangProdi] = useState("SEMUA");
  const [pageProdi, setPageProdi] = useState(1);

  // State Fakultas
  const [fakultasList, setFakultasList] = useState<FakultasResponse[]>([]);
  const [loadingFakultas, setLoadingFakultas] = useState(true);
  const [errorFakultas, setErrorFakultas] = useState<string | null>(null);
  const [searchFakultas, setSearchFakultas] = useState("");
  const [pageFakultas, setPageFakultas] = useState(1);

  // State Kuota Per Gelombang
  const [kuotaList, setKuotaList] = useState<KuotaProdiGelombangResponse[]>([]);
  const [gelombangList, setGelombangList] = useState<GelombangDetailResponse[]>(
    [],
  );
  const [loadingKuota, setLoadingKuota] = useState(true);
  const [errorKuota, setErrorKuota] = useState<string | null>(null);
  const [pageKuota, setPageKuota] = useState(1);
  const PAGE_SIZE = 8;

  // Modal Prodi
  const [isProdiModalOpen, setIsProdiModalOpen] = useState(false);
  const [editingProdi, setEditingProdi] = useState<ProdiDetailResponse | null>(
    null,
  );
  const [prodiForm, setProdiForm] = useState<CreateProdiKonfigurasiRequest>({
    kode_prodi: "",
    nama_prodi: "",
    jenjang: "S1",
    fakultas: "Fakultas Sains & Teknologi",
    kode_fakultas: "FST",
    fakultas_id: null,
    passing_score: 70.0,
    kuota: 60,
    ukt_nominal: 6000000,
    is_active: true,
  });

  // Modal Fakultas
  const [isFakultasModalOpen, setIsFakultasModalOpen] = useState(false);
  const [editingFakultas, setEditingFakultas] =
    useState<FakultasResponse | null>(null);
  const [fakultasForm, setFakultasForm] = useState<CreateFakultasRequest>({
    kode_fakultas: "",
    nama_fakultas: "",
    deskripsi: "",
    is_active: true,
  });

  // Modal Set Kuota
  const [isKuotaModalOpen, setIsKuotaModalOpen] = useState(false);
  const [kuotaForm, setKuotaForm] = useState<SetKuotaProdiGelombangRequest>({
    prodi_id: "",
    gelombang_id: "",
    kuota: 40,
  });

  // Dialog Konfirmasi Hapus
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "prodi" | "fakultas";
    id: string;
    nama: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProdiData = async () => {
    try {
      setLoadingProdi(true);
      setErrorProdi(null);
      const data = await getProdiAdminList();
      setProdiList(data);
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setErrorProdi(e.pesan || "Gagal memuat daftar program studi");
    } finally {
      setLoadingProdi(false);
    }
  };

  const fetchFakultasData = async () => {
    try {
      setLoadingFakultas(true);
      setErrorFakultas(null);
      const data = await getFakultasList();
      setFakultasList(data);
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setErrorFakultas(e.pesan || "Gagal memuat daftar fakultas");
    } finally {
      setLoadingFakultas(false);
    }
  };

  const fetchKuotaData = async () => {
    try {
      setLoadingKuota(true);
      setErrorKuota(null);
      const [kData, gData] = await Promise.all([
        getKuotaProdiGelombangList(),
        getGelombangAdminList(),
      ]);
      setKuotaList(kData);
      setGelombangList(gData);
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setErrorKuota(e.pesan || "Gagal memuat data alokasi kuota");
    } finally {
      setLoadingKuota(false);
    }
  };

  useEffect(() => {
    fetchProdiData();
    fetchFakultasData();
    fetchKuotaData();
  }, []);

  // Handlers Prodi
  const handleOpenAddProdi = () => {
    setEditingProdi(null);
    const defaultFak = fakultasList[0];
    setProdiForm({
      kode_prodi: "",
      nama_prodi: "",
      jenjang: "S1",
      fakultas: defaultFak?.nama_fakultas || "Fakultas Sains & Teknologi",
      kode_fakultas: defaultFak?.kode_fakultas || "FST",
      fakultas_id: defaultFak?.id || null,
      passing_score: 70.0,
      kuota: 60,
      ukt_nominal: 6000000,
      is_active: true,
    });
    setFormError(null);
    setIsProdiModalOpen(true);
  };

  const handleOpenEditProdi = (p: ProdiDetailResponse) => {
    setEditingProdi(p);
    setProdiForm({
      kode_prodi: p.kode_prodi,
      nama_prodi: p.nama_prodi,
      jenjang: p.jenjang,
      fakultas: p.fakultas,
      kode_fakultas: p.kode_fakultas,
      fakultas_id: p.fakultas_id || null,
      passing_score: p.passing_score,
      kuota: p.kuota,
      ukt_nominal: p.ukt_nominal,
      is_active: p.is_active,
    });
    setFormError(null);
    setIsProdiModalOpen(true);
  };

  const handleSaveProdi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingProdi) {
        const updatePayload: UpdateProdiKonfigurasiRequest = {
          nama_prodi: prodiForm.nama_prodi,
          jenjang: prodiForm.jenjang,
          fakultas: prodiForm.fakultas,
          kode_fakultas: prodiForm.kode_fakultas,
          fakultas_id: prodiForm.fakultas_id,
          passing_score: prodiForm.passing_score,
          kuota: prodiForm.kuota,
          ukt_nominal: prodiForm.ukt_nominal,
          is_active: prodiForm.is_active,
        };
        await updateProdi(editingProdi.id, updatePayload);
      } else {
        await createProdi(prodiForm);
      }
      setIsProdiModalOpen(false);
      await fetchProdiData();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setFormError(e.pesan || "Gagal menyimpan program studi");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers Fakultas
  const handleOpenAddFakultas = () => {
    setEditingFakultas(null);
    setFakultasForm({
      kode_fakultas: "",
      nama_fakultas: "",
      deskripsi: "",
      is_active: true,
    });
    setFormError(null);
    setIsFakultasModalOpen(true);
  };

  const handleOpenEditFakultas = (f: FakultasResponse) => {
    setEditingFakultas(f);
    setFakultasForm({
      kode_fakultas: f.kode_fakultas,
      nama_fakultas: f.nama_fakultas,
      deskripsi: f.deskripsi || "",
      is_active: f.is_active,
    });
    setFormError(null);
    setIsFakultasModalOpen(true);
  };

  const handleSaveFakultas = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingFakultas) {
        await updateFakultas(editingFakultas.id, fakultasForm);
      } else {
        await createFakultas(fakultasForm);
      }
      setIsFakultasModalOpen(false);
      await fetchFakultasData();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setFormError(e.pesan || "Gagal menyimpan fakultas");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers Kuota Per Gelombang
  const handleOpenSetKuota = (prodiId?: string, gelombangId?: string) => {
    setKuotaForm({
      prodi_id: prodiId || (prodiList[0]?.id ?? ""),
      gelombang_id: gelombangId || (gelombangList[0]?.id ?? ""),
      kuota: 30,
    });
    setFormError(null);
    setIsKuotaModalOpen(true);
  };

  const handleSaveKuota = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      await setKuotaProdiGelombang(kuotaForm);
      setIsKuotaModalOpen(false);
      await fetchKuotaData();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setFormError(e.pesan || "Gagal mengatur kuota gelombang prodi");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers Hapus
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      if (deleteTarget.type === "prodi") {
        await deleteProdi(deleteTarget.id);
        await fetchProdiData();
      } else {
        await deleteFakultas(deleteTarget.id);
        await fetchFakultasData();
      }
      setDeleteTarget(null);
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      alert(e.pesan || "Gagal menghapus data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProdi = prodiList.filter((p) => {
    const matchesSearch =
      p.nama_prodi.toLowerCase().includes(searchProdi.toLowerCase()) ||
      p.kode_prodi.toLowerCase().includes(searchProdi.toLowerCase());
    const matchesJenjang =
      filterJenjangProdi === "SEMUA" ||
      p.jenjang.toUpperCase() === filterJenjangProdi.toUpperCase();
    return matchesSearch && matchesJenjang;
  });

  const totalPagesProdi = Math.max(
    1,
    Math.ceil(filteredProdi.length / PAGE_SIZE),
  );
  const pagedProdi = filteredProdi.slice(
    (pageProdi - 1) * PAGE_SIZE,
    pageProdi * PAGE_SIZE,
  );

  const filteredFakultas = fakultasList.filter(
    (f) =>
      f.nama_fakultas.toLowerCase().includes(searchFakultas.toLowerCase()) ||
      f.kode_fakultas.toLowerCase().includes(searchFakultas.toLowerCase()),
  );

  const totalPagesFakultas = Math.max(
    1,
    Math.ceil(filteredFakultas.length / PAGE_SIZE),
  );
  const pagedFakultas = filteredFakultas.slice(
    (pageFakultas - 1) * PAGE_SIZE,
    pageFakultas * PAGE_SIZE,
  );

  const totalPagesKuota = Math.max(1, Math.ceil(kuotaList.length / PAGE_SIZE));
  const pagedKuota = kuotaList.slice(
    (pageKuota - 1) * PAGE_SIZE,
    pageKuota * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-biru-700 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Struktur Akademik PMB</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Fakultas, Program Studi & Kuota
          </h1>
          <p className="text-xs sm:text-sm text-biru-800 font-light mt-1">
            Konfigurasi prodi, passing score CBT, kuota daya tampung total, dan
            alokasi kuota per gelombang.
          </p>
        </div>
      </div>

      <Tabs
        defaultValue="prodi"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full sm:w-[500px] grid-cols-3">
          <TabsTrigger value="prodi">Program Studi</TabsTrigger>
          <TabsTrigger value="fakultas">Fakultas</TabsTrigger>
          <TabsTrigger value="kuota">Alokasi Kuota</TabsTrigger>
        </TabsList>

        {/* TAB 1: PROGRAM STUDI */}
        <TabsContent value="prodi" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-biru-600" />
                <Input
                  placeholder="Cari kode atau nama prodi..."
                  value={searchProdi}
                  onChange={(e) => {
                    setSearchProdi(e.target.value);
                    setPageProdi(1);
                  }}
                  className="pl-9 text-xs"
                />
              </div>
              <select
                value={filterJenjangProdi}
                onChange={(e) => {
                  setFilterJenjangProdi(e.target.value);
                  setPageProdi(1);
                }}
                className="rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
              >
                <option value="SEMUA">Semua Jenjang</option>
                <option value="S1">S1 (Sarjana)</option>
                <option value="D3">D3 (Diploma)</option>
                <option value="S2">S2 (Magister)</option>
              </select>
            </div>
            <Button
              onClick={handleOpenAddProdi}
              className="flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Program Studi</span>
            </Button>
          </div>

          {loadingProdi ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : errorProdi ? (
            <ErrorState
              title="Gagal Memuat Program Studi"
              message={errorProdi}
              onRetry={fetchProdiData}
            />
          ) : filteredProdi.length === 0 ? (
            <EmptyState
              title="Belum Ada Program Studi"
              description="Tambahkan program studi baru dan tetapkan passing score serta kuota mahasiswa."
              actionLabel="Tambah Prodi"
              onAction={handleOpenAddProdi}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode & Jenjang</TableHead>
                    <TableHead>Nama Program Studi</TableHead>
                    <TableHead>Fakultas</TableHead>
                    <TableHead className="text-center">Passing CBT</TableHead>
                    <TableHead className="text-center">Kuota Total</TableHead>
                    <TableHead className="text-right">UKT Pokok</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedProdi.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-biru-900">
                            {p.kode_prodi}
                          </span>
                          <Badge variant="netral">{p.jenjang}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-biru-950">
                          {p.nama_prodi}
                        </p>
                        <span className="text-[11px] text-biru-700">
                          {p.is_active ? "Aktif menerima PMB" : "Tidak aktif"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-biru-900">
                        {p.fakultas} ({p.kode_fakultas})
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-biru-950">
                        {p.passing_score}
                      </TableCell>
                      <TableCell className="text-center font-bold text-biru-950">
                        {p.kuota}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-biru-900">
                        Rp {p.ukt_nominal.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditProdi(p)}
                            title="Ubah Program Studi"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-biru-700" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteTarget({
                                type: "prodi",
                                id: p.id,
                                nama: p.nama_prodi,
                              })
                            }
                            title="Hapus Program Studi"
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
                  {filteredProdi.length === 0
                    ? 0
                    : (pageProdi - 1) * PAGE_SIZE + 1}{" "}
                  - {Math.min(filteredProdi.length, pageProdi * PAGE_SIZE)} dari{" "}
                  {filteredProdi.length} program studi
                </span>
                {totalPagesProdi > 1 && (
                  <Pagination
                    currentPage={pageProdi}
                    totalPages={totalPagesProdi}
                    onPageChange={setPageProdi}
                  />
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* TAB 2: FAKULTAS */}
        <TabsContent value="fakultas" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-biru-600" />
              <Input
                placeholder="Cari fakultas..."
                value={searchFakultas}
                onChange={(e) => setSearchFakultas(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <Button
              onClick={handleOpenAddFakultas}
              className="flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Fakultas</span>
            </Button>
          </div>

          {loadingFakultas ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : errorFakultas ? (
            <ErrorState
              title="Gagal Memuat Fakultas"
              message={errorFakultas}
              onRetry={fetchFakultasData}
            />
          ) : filteredFakultas.length === 0 ? (
            <EmptyState
              title="Belum Ada Fakultas"
              description="Tambahkan data fakultas sebagai payung program studi universitas."
              actionLabel="Tambah Fakultas"
              onAction={handleOpenAddFakultas}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Kode</TableHead>
                    <TableHead>Nama Fakultas</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedFakultas.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs font-bold text-biru-900">
                        {f.kode_fakultas}
                      </TableCell>
                      <TableCell className="font-semibold text-biru-950">
                        {f.nama_fakultas}
                      </TableCell>
                      <TableCell className="text-xs text-biru-800">
                        {f.deskripsi || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={f.is_active ? "berhasil" : "netral"}>
                          {f.is_active ? "AKTIF" : "NONAKTIF"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditFakultas(f)}
                            title="Ubah Fakultas"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-biru-700" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteTarget({
                                type: "fakultas",
                                id: f.id,
                                nama: f.nama_fakultas,
                              })
                            }
                            title="Hapus Fakultas"
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
                  {filteredFakultas.length === 0
                    ? 0
                    : (pageFakultas - 1) * PAGE_SIZE + 1}{" "}
                  -{" "}
                  {Math.min(filteredFakultas.length, pageFakultas * PAGE_SIZE)}{" "}
                  dari {filteredFakultas.length} fakultas
                </span>
                {totalPagesFakultas > 1 && (
                  <Pagination
                    currentPage={pageFakultas}
                    totalPages={totalPagesFakultas}
                    onPageChange={setPageFakultas}
                  />
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* TAB 3: ALOKASI KUOTA PER GELOMBANG */}
        <TabsContent value="kuota" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-biru-950">
                Alokasi Kuota Program Studi Per Gelombang
              </h2>
              <p className="text-xs text-biru-800 font-light">
                Batasi daya tampung per gelombang agar penerimaan mahasiswa
                terdistribusi secara terkontrol.
              </p>
            </div>
            <Button
              onClick={() => handleOpenSetKuota()}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Set Kuota Gelombang</span>
            </Button>
          </div>

          {loadingKuota ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : errorKuota ? (
            <ErrorState
              title="Gagal Memuat Kuota"
              message={errorKuota}
              onRetry={fetchKuotaData}
            />
          ) : kuotaList.length === 0 ? (
            <EmptyState
              title="Belum Ada Alokasi Kuota Gelombang"
              description="Tentukan alokasi kuota per gelombang untuk tiap program studi."
              actionLabel="Atur Kuota"
              onAction={() => handleOpenSetKuota()}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program Studi</TableHead>
                    <TableHead>Gelombang</TableHead>
                    <TableHead className="text-center">Kuota Alokasi</TableHead>
                    <TableHead className="text-center">Kuota Terisi</TableHead>
                    <TableHead className="text-center">Sisa Kursi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedKuota.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-semibold text-biru-950">
                        {k.nama_prodi}
                      </TableCell>
                      <TableCell className="text-xs text-biru-900 font-medium">
                        {k.nama_gelombang}
                      </TableCell>
                      <TableCell className="text-center font-bold text-biru-950">
                        {k.kuota}
                      </TableCell>
                      <TableCell className="text-center font-bold text-biru-700">
                        {k.kuota_terisi}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            k.kuota - k.kuota_terisi > 0 ? "berhasil" : "gagal"
                          }
                        >
                          {Math.max(0, k.kuota - k.kuota_terisi)} Kursi
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleOpenSetKuota(k.prodi_id, k.gelombang_id)
                          }
                        >
                          <Edit2 className="w-3.5 h-3.5 text-biru-700" />
                          <span className="ml-1 text-xs">Ubah Kuota</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-biru-100 text-xs text-biru-800 font-medium">
                <span>
                  Menampilkan{" "}
                  {kuotaList.length === 0 ? 0 : (pageKuota - 1) * PAGE_SIZE + 1}{" "}
                  - {Math.min(kuotaList.length, pageKuota * PAGE_SIZE)} dari{" "}
                  {kuotaList.length} alokasi kuota
                </span>
                {totalPagesKuota > 1 && (
                  <Pagination
                    currentPage={pageKuota}
                    totalPages={totalPagesKuota}
                    onPageChange={setPageKuota}
                  />
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL PROGRAM STUDI */}
      <Dialog open={isProdiModalOpen} onOpenChange={setIsProdiModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProdi
                ? "Ubah Program Studi"
                : "Tambah Program Studi Baru"}
            </DialogTitle>
            <DialogDescription>
              Tentukan rincian prodi, passing score tes CBT online, kuota total,
              dan biaya UKT.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProdi} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 rounded-xl bg-biru-100 border border-biru-300 flex items-center gap-2 text-xs text-biru-950 font-medium">
                <AlertCircle className="w-4 h-4 text-biru-800 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Kode Prodi
                </label>
                <Input
                  required
                  placeholder="misal: SI-01"
                  value={prodiForm.kode_prodi}
                  onChange={(e) =>
                    setProdiForm({ ...prodiForm, kode_prodi: e.target.value })
                  }
                  disabled={editingProdi !== null}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Nama Program Studi
                </label>
                <Input
                  required
                  placeholder="misal: [CONTOH] Sistem Informasi"
                  value={prodiForm.nama_prodi}
                  onChange={(e) =>
                    setProdiForm({ ...prodiForm, nama_prodi: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Jenjang
                </label>
                <select
                  className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                  value={prodiForm.jenjang}
                  onChange={(e) =>
                    setProdiForm({ ...prodiForm, jenjang: e.target.value })
                  }
                >
                  <option value="S1">S1 - Sarjana</option>
                  <option value="D3">D3 - Ahli Madya</option>
                  <option value="S2">S2 - Magister</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Fakultas
                </label>
                <select
                  className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                  value={prodiForm.fakultas_id || ""}
                  onChange={(e) => {
                    const sel = fakultasList.find(
                      (f) => f.id === e.target.value,
                    );
                    setProdiForm({
                      ...prodiForm,
                      fakultas_id: sel?.id || null,
                      fakultas: sel?.nama_fakultas || prodiForm.fakultas,
                      kode_fakultas:
                        sel?.kode_fakultas || prodiForm.kode_fakultas,
                    });
                  }}
                >
                  {fakultasList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.kode_fakultas} - {f.nama_fakultas}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Passing CBT
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={prodiForm.passing_score}
                  onChange={(e) =>
                    setProdiForm({
                      ...prodiForm,
                      passing_score: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  Kuota Total
                </label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={prodiForm.kuota}
                  onChange={(e) =>
                    setProdiForm({
                      ...prodiForm,
                      kuota: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-biru-900">
                  UKT Pokok (Rp)
                </label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={prodiForm.ukt_nominal}
                  onChange={(e) =>
                    setProdiForm({
                      ...prodiForm,
                      ukt_nominal: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active_prodi"
                checked={prodiForm.is_active}
                onChange={(e) =>
                  setProdiForm({ ...prodiForm, is_active: e.target.checked })
                }
                className="rounded border-biru-300 text-biru-700 focus:ring-biru-600"
              />
              <label
                htmlFor="is_active_prodi"
                className="text-xs font-semibold text-biru-950 cursor-pointer"
              >
                Aktif Dibuka untuk Pendaftaran PMB
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsProdiModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Program Studi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL FAKULTAS */}
      <Dialog open={isFakultasModalOpen} onOpenChange={setIsFakultasModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFakultas ? "Ubah Fakultas" : "Tambah Fakultas Baru"}
            </DialogTitle>
            <DialogDescription>
              Tentukan kode dan nama fakultas universitas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFakultas} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 rounded-xl bg-biru-100 border border-biru-300 flex items-center gap-2 text-xs text-biru-950 font-medium">
                <AlertCircle className="w-4 h-4 text-biru-800 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Kode Fakultas
              </label>
              <Input
                required
                placeholder="misal: FST"
                value={fakultasForm.kode_fakultas}
                onChange={(e) =>
                  setFakultasForm({
                    ...fakultasForm,
                    kode_fakultas: e.target.value,
                  })
                }
                disabled={editingFakultas !== null}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Nama Fakultas
              </label>
              <Input
                required
                placeholder="misal: [CONTOH] Fakultas Sains & Teknologi"
                value={fakultasForm.nama_fakultas}
                onChange={(e) =>
                  setFakultasForm({
                    ...fakultasForm,
                    nama_fakultas: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Deskripsi
              </label>
              <Input
                placeholder="Keterangan singkat fokus fakultas"
                value={fakultasForm.deskripsi || ""}
                onChange={(e) =>
                  setFakultasForm({
                    ...fakultasForm,
                    deskripsi: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active_fakultas"
                checked={fakultasForm.is_active}
                onChange={(e) =>
                  setFakultasForm({
                    ...fakultasForm,
                    is_active: e.target.checked,
                  })
                }
                className="rounded border-biru-300 text-biru-700 focus:ring-biru-600"
              />
              <label
                htmlFor="is_active_fakultas"
                className="text-xs font-semibold text-biru-950 cursor-pointer"
              >
                Fakultas Aktif
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsFakultasModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Fakultas"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL SET KUOTA PER GELOMBANG */}
      <Dialog open={isKuotaModalOpen} onOpenChange={setIsKuotaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Alokasi Kuota Gelombang</DialogTitle>
            <DialogDescription>
              Tentukan kuota daya tampung untuk prodi dan gelombang tertentu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveKuota} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 rounded-xl bg-biru-100 border border-biru-300 flex items-center gap-2 text-xs text-biru-950 font-medium">
                <AlertCircle className="w-4 h-4 text-biru-800 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Program Studi
              </label>
              <select
                className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                value={kuotaForm.prodi_id}
                onChange={(e) =>
                  setKuotaForm({ ...kuotaForm, prodi_id: e.target.value })
                }
              >
                {prodiList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kode_prodi} - {p.nama_prodi}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Gelombang Pendaftaran
              </label>
              <select
                className="w-full rounded-xl border border-biru-200 bg-putih px-3 py-2 text-xs font-medium text-biru-950 focus:border-biru-600 focus:outline-none"
                value={kuotaForm.gelombang_id}
                onChange={(e) =>
                  setKuotaForm({ ...kuotaForm, gelombang_id: e.target.value })
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
                Alokasi Kuota
              </label>
              <Input
                type="number"
                min="0"
                required
                value={kuotaForm.kuota}
                onChange={(e) =>
                  setKuotaForm({
                    ...kuotaForm,
                    kuota: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsKuotaModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Kuota"}
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
