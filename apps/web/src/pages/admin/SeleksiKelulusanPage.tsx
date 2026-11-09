import React, { useState, useEffect } from "react";
import {
  Search,
  CheckCircle2,
  Clock,
  Play,
  X,
  Download,
  ShieldCheck,
  History,
  Sliders,
} from "lucide-react";
import {
  Card,
  Button,
  StatusBadge,
  EmptyState,
  TableSkeleton,
  ErrorState,
} from "../../components/common";
import { fetchApi } from "../../services/api";
import { useDialog } from "@/components/ui/useDialog";

interface RumusPenilaian {
  id: string;
  jalur_id: string;
  bobot_cbt: number;
  bobot_rapor: number;
  bobot_prestasi: number;
  bobot_wawancara: number;
  default_passing_score: number;
  keterangan?: string | null;
}

interface SidangKelulusan {
  id: string;
  gelombang_id?: string | null;
  nama_sidang: string;
  nomor_sk?: string | null;
  tanggal_sidang: string;
  tgl_pengumuman: string;
  status_sidang: "DRAFT" | "DISETUJUI" | "DIPUBLIKASIKAN" | "DIBATALKAN";
  total_peserta: number;
  total_lulus: number;
  total_cadangan: number;
  total_tidak_lulus: number;
  approved_by?: string | null;
  approved_at?: string | null;
  catatan_sidang?: string | null;
}

interface DrafKelulusanItem {
  pendaftar_id: string;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  jalur_id: string;
  jalur_nama: string;
  prodi_pilihan_1_id: string;
  prodi_pilihan_1_nama: string;
  prodi_pilihan_2_id?: string | null;
  prodi_pilihan_2_nama?: string | null;
  skor_cbt: number;
  nilai_rapor: number;
  nilai_prestasi: number;
  skor_akhir: number;
  ranking: number;
  status_kelulusan: string;
  prodi_diterima_id?: string | null;
  prodi_diterima_nama?: string | null;
  pilihan_ke?: number | null;
  catatan?: string | null;
  status_seleksi_rapor?: string;
  status_seleksi_interview?: string;
  nilai_seleksi_interview?: number | null;
  lulus_cbt?: boolean | null;
}

const labelHasil = (h?: string) =>
  h === "LULUS" ? "Lulus" : h === "TIDAK_LULUS" ? "Tidak lulus" : "Menunggu";

/** Ringkasan hasil tiga seleksi untuk pertimbangan pleno. */
export function ringkasanSeleksi(
  item: Pick<
    DrafKelulusanItem,
    "status_seleksi_rapor" | "status_seleksi_interview" | "lulus_cbt"
  >,
): string {
  const cbt =
    item.lulus_cbt == null
      ? "Menunggu"
      : item.lulus_cbt
        ? "Lulus"
        : "Tidak lulus";
  return `Rapor: ${labelHasil(item.status_seleksi_rapor)} · CBT: ${cbt} · Interview: ${labelHasil(item.status_seleksi_interview)}.`;
}

interface AuditLog {
  id: string;
  pendaftar_id: string;
  status_lama?: string | null;
  status_baru: string;
  actor_name: string;
  catatan?: string | null;
  created_at: string;
}

interface DrafResponse {
  sidang: SidangKelulusan;
  items: DrafKelulusanItem[];
  audit_logs: AuditLog[];
}

export const SeleksiKelulusanPage: React.FC = () => {
  const dialog = useDialog();
  const [data, setData] = useState<DrafResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Modals
  const [showProsesModal, setShowProsesModal] = useState<boolean>(false);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [showRumusModal, setShowRumusModal] = useState<boolean>(false);
  const [rumusList, setRumusList] = useState<RumusPenilaian[]>([]);
  const [editingRumus, setEditingRumus] = useState<RumusPenilaian | null>(null);
  const [isLoadingRumus, setIsLoadingRumus] = useState<boolean>(false);
  const [selectedKandidat, setSelectedKandidat] =
    useState<DrafKelulusanItem | null>(null);

  // Form States
  const [namaSidang, setNamaSidang] = useState<string>(
    "Sidang Pleno Kelulusan PMB 2026 Gelombang 1",
  );
  const [nomorSk, setNomorSk] = useState<string>("SK/PMB-UPT/2026/01");
  const [tglPengumuman, setTglPengumuman] = useState<string>(() =>
    new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  );
  const [catatanApproval] = useState<string>("");

  // Koreksi Kandidat Form
  const [statusKoreksi, setStatusKoreksi] = useState<string>("LULUS_PILIHAN_1");
  const [alasanKoreksi, setAlasanKoreksi] = useState<string>("");

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const drafRes = await fetchApi<DrafResponse>("/api/kelulusan/admin/draf");
      setData(drafRes);
    } catch {
      // If no draft exists yet, keep data null without blocking
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadRumus = async () => {
    setIsLoadingRumus(true);
    try {
      const list = await fetchApi<RumusPenilaian[]>(
        "/api/kelulusan/admin/rumus",
      );
      setRumusList(list || []);
      if (list && list.length > 0) {
        setEditingRumus(list[0]);
      }
    } catch {
      setRumusList([]);
    } finally {
      setIsLoadingRumus(false);
    }
  };

  const handleSaveRumus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRumus) return;
    const total =
      Number(editingRumus.bobot_cbt) +
      Number(editingRumus.bobot_rapor) +
      Number(editingRumus.bobot_prestasi) +
      Number(editingRumus.bobot_wawancara);
    if (Math.abs(total - 100) > 0.01) {
      const lanjut = await dialog.konfirmasi({
        judul: "Total bobot bukan 100%",
        deskripsi: `Total bobot saat ini ${total}%, bukan 100%. Tetap simpan konfigurasi ini?`,
        nada: "bahaya",
        labelYa: "Ya, Tetap Simpan",
      });
      if (!lanjut) return;
    }
    try {
      await fetchApi(`/api/kelulusan/admin/rumus/${editingRumus.jalur_id}`, {
        method: "POST",
        body: JSON.stringify({
          bobot_cbt: Number(editingRumus.bobot_cbt),
          bobot_rapor: Number(editingRumus.bobot_rapor),
          bobot_prestasi: Number(editingRumus.bobot_prestasi),
          bobot_wawancara: Number(editingRumus.bobot_wawancara),
          default_passing_score: Number(editingRumus.default_passing_score),
          keterangan: editingRumus.keterangan || null,
        }),
      });
      await loadRumus();
      void dialog.hasil({
        nada: "sukses",
        judul: "Rumus penilaian disimpan",
        deskripsi: "Konfigurasi rumus penilaian jalur berhasil disimpan.",
        autoTutupMs: 2500,
      });
    } catch (err: unknown) {
      const eObj = err as { pesan?: string };
      void dialog.hasil({
        nada: "gagal",
        judul: "Rumus gagal disimpan",
        deskripsi: eObj.pesan || "Gagal menyimpan konfigurasi rumus penilaian",
      });
    }
  };

  const handleProsesRanking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetchApi<DrafResponse>(
        "/api/kelulusan/admin/proses-ranking",
        {
          method: "POST",
          body: JSON.stringify({
            nama_sidang: namaSidang,
            nomor_sk: nomorSk || null,
            tgl_pengumuman: new Date(tglPengumuman).toISOString(),
          }),
        },
      );
      setData(res);
      setShowProsesModal(false);
    } catch (err: unknown) {
      const eObj = err as { pesan?: string };
      setErrorMessage(eObj.pesan || "Gagal memproses perankingan kelulusan");
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!data?.sidang?.id) return;
    const ya = await dialog.konfirmasi({
      judul: "Setujui hasil sidang?",
      deskripsi:
        "Hasil sidang kelulusan ini akan ditandai disetujui dan siap dipublikasikan.",
      nada: "sukses",
      labelYa: "Ya, Setujui",
    });
    if (!ya) return;
    setIsLoading(true);
    try {
      await fetchApi(`/api/kelulusan/admin/approve/${data.sidang.id}`, {
        method: "POST",
        body: JSON.stringify({
          catatan: catatanApproval || "Sidang disetujui oleh Administrator",
        }),
      });
      await loadData();
      void dialog.hasil({
        nada: "sukses",
        judul: "Sidang disetujui",
        deskripsi:
          "Hasil sidang kelulusan telah disetujui. Anda dapat mempublikasikannya kepada calon.",
        autoTutupMs: 3000,
      });
    } catch (err: unknown) {
      const eObj = err as { pesan?: string };
      void dialog.hasil({
        nada: "gagal",
        judul: "Sidang gagal disetujui",
        deskripsi: eObj.pesan || "Gagal menyetujui sidang",
      });
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!data?.sidang?.id) return;
    const ya = await dialog.konfirmasi({
      judul: "Publikasikan hasil kelulusan?",
      deskripsi:
        "Setelah dipublikasikan, calon mahasiswa dapat langsung melihat hasil kelulusan di portal mereka. Tindakan ini tidak dapat dibatalkan.",
      nada: "bahaya",
      labelYa: "Ya, Publikasikan",
    });
    if (!ya) return;
    setIsLoading(true);
    try {
      await fetchApi(`/api/kelulusan/admin/publish/${data.sidang.id}`, {
        method: "POST",
      });
      await loadData();
      void dialog.hasil({
        nada: "sukses",
        judul: "Hasil kelulusan dipublikasikan",
        deskripsi: "Calon mahasiswa kini dapat melihat hasilnya di portal.",
        autoTutupMs: 3500,
      });
    } catch (err: unknown) {
      const eObj = err as { pesan?: string };
      void dialog.hasil({
        nada: "gagal",
        judul: "Publikasi gagal",
        deskripsi: eObj.pesan || "Gagal mempublikasikan sidang",
      });
      setIsLoading(false);
    }
  };

  const handleKoreksiKandidat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKandidat) return;
    try {
      await fetchApi("/api/kelulusan/admin/kandidat/status", {
        method: "POST",
        body: JSON.stringify({
          pendaftar_id: selectedKandidat.pendaftar_id,
          status_baru: statusKoreksi,
          prodi_diterima_id:
            statusKoreksi === "LULUS_PILIHAN_2"
              ? selectedKandidat.prodi_pilihan_2_id
              : selectedKandidat.prodi_pilihan_1_id,
          catatan: alasanKoreksi,
        }),
      });
      const nama = selectedKandidat.nama_lengkap;
      setSelectedKandidat(null);
      setAlasanKoreksi("");
      await loadData();
      void dialog.hasil({
        nada: "sukses",
        judul: "Status kandidat diubah",
        deskripsi: `Status kelulusan ${nama} berhasil dikoreksi.`,
        autoTutupMs: 2800,
      });
    } catch (err: unknown) {
      const eObj = err as { pesan?: string };
      void dialog.hasil({
        nada: "gagal",
        judul: "Status kandidat gagal diubah",
        deskripsi: eObj.pesan || "Gagal mengubah status kandidat",
      });
    }
  };

  // Pleno menempatkan calon di pilihan 1 atau 2 berdasarkan hasil rapor, CBT, dan interview
  const handleTempatkan = async (item: DrafKelulusanItem, pilihan: 1 | 2) => {
    const prodiId =
      pilihan === 1 ? item.prodi_pilihan_1_id : item.prodi_pilihan_2_id;
    const prodiNama =
      pilihan === 1 ? item.prodi_pilihan_1_nama : item.prodi_pilihan_2_nama;
    if (!prodiId) return;
    const catatan = await dialog.masukkanAlasan({
      judul: `Tempatkan ${item.nama_lengkap} di pilihan ${pilihan}?`,
      deskripsi: `Calon diterima di ${prodiNama} (pilihan ${pilihan}), mendapat LoA, dan melanjutkan ke daftar ulang. ${ringkasanSeleksi(item)}`,
      label: "Catatan / dasar keputusan pleno",
      placeholder:
        pilihan === 1
          ? "Contoh: lulus ketiga seleksi, skor memenuhi passing grade pilihan 1"
          : "Contoh: kuota pilihan 1 penuh, calon bersedia pilihan 2",
      labelKirim: `Tempatkan di Pilihan ${pilihan}`,
    });
    if (!catatan) return;
    try {
      await fetchApi("/api/kelulusan/admin/kandidat/status", {
        method: "POST",
        body: JSON.stringify({
          pendaftar_id: item.pendaftar_id,
          status_baru: pilihan === 1 ? "LULUS_PILIHAN_1" : "LULUS_PILIHAN_2",
          prodi_diterima_id: prodiId,
          catatan,
        }),
      });
      await loadData();
      void dialog.hasil({
        nada: "sukses",
        judul: `Calon ditempatkan di pilihan ${pilihan}`,
        deskripsi: `${item.nama_lengkap} diterima di ${prodiNama}.`,
        autoTutupMs: 3000,
      });
    } catch (err: unknown) {
      void dialog.hasil({
        nada: "gagal",
        judul: "Penempatan prodi gagal",
        deskripsi:
          (err as { pesan?: string }).pesan ||
          "Calon tidak dapat ditempatkan di program studi tersebut.",
      });
    }
  };

  const handleDownloadSiakad = () => {
    window.open("/api/kelulusan/admin/ekspor-siakad?format=csv", "_blank");
  };

  // Filter items
  const filteredItems = (data?.items || []).filter((item) => {
    const matchSearch =
      item.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nomor_pendaftaran.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter =
      filterStatus === "ALL" ||
      (filterStatus === "LULUS" && item.status_kelulusan.startsWith("LULUS")) ||
      item.status_kelulusan === filterStatus;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-200">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Seleksi Kelulusan & Sidang Pleno PMB
          </h1>
          <p className="text-xs sm:text-sm text-biru-800">
            Konfigurasi rumus bobot, evaluasi kuota prodi, hierarki tie-breaker,
            dan penerbitan LoA resmi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowRumusModal(true);
              loadRumus();
            }}
            className="gap-1.5 text-xs text-biru-900 border-biru-300"
          >
            <Sliders className="w-4 h-4 text-biru-700" />
            <span>Rumus Penilaian</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAuditModal(true)}
            className="gap-1.5 text-xs text-biru-900 border-biru-300"
          >
            <History className="w-4 h-4 text-biru-700" />
            <span>Audit Trail</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadSiakad}
            className="gap-1.5 text-xs text-biru-900 border-biru-300"
          >
            <Download className="w-4 h-4 text-biru-700" />
            <span>Ekspor SIAKAD</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowProsesModal(true)}
            className="gap-1.5 text-xs bg-biru-900 hover:bg-biru-950 text-putih"
          >
            <Play className="w-4 h-4 text-putih" />
            <span>Proses Ranking & Sidang Baru</span>
          </Button>
        </div>
      </div>

      {/* Sidang Status Banner Card */}
      {data?.sidang && (
        <Card className="bg-gradient-to-r from-biru-900 to-biru-950 text-putih p-6 rounded-2xl shadow-lg border border-biru-800">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-putih/20 text-putih">
                  Status Sidang: {data.sidang.status_sidang}
                </span>
                {data.sidang.nomor_sk && (
                  <span className="text-xs text-biru-200 font-mono">
                    SK: {data.sidang.nomor_sk}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-putih">
                {data.sidang.nama_sidang}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-biru-200">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Jadwal Pengumuman:{" "}
                  {new Date(data.sidang.tgl_pengumuman).toLocaleString("id-ID")}
                </span>
                {data.sidang.approved_at && (
                  <span className="flex items-center gap-1.5 text-biru-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-biru-300" />
                    Disetujui pada:{" "}
                    {new Date(data.sidang.approved_at).toLocaleString("id-ID")}
                  </span>
                )}
              </div>
            </div>

            {/* Workflow Action Controls */}
            <div className="flex items-center gap-3">
              {data.sidang.status_sidang === "DRAFT" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApprove}
                  className="bg-putih hover:bg-biru-50 text-biru-950 font-bold gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-biru-900" />
                  <span>Setujui Hasil Sidang</span>
                </Button>
              )}
              {data.sidang.status_sidang === "DISETUJUI" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePublish}
                  className="bg-putih hover:bg-biru-50 text-biru-950 font-bold gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-biru-900" />
                  <span>Publikasikan ke Calon</span>
                </Button>
              )}
              {data.sidang.status_sidang === "DIPUBLIKASIKAN" && (
                <span className="flex items-center gap-2 bg-putih/20 text-putih px-4 py-2 rounded-xl text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-putih" />
                  Hasil Telah Dipublikasikan ke Portal Calon
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-biru-200 bg-putih">
          <p className="text-xs font-medium text-biru-800">
            Total Peserta Dinilai
          </p>
          <p className="text-2xl font-bold text-biru-950 mt-1">
            {data?.sidang ? data.sidang.total_peserta : 0}
          </p>
        </Card>
        <Card className="p-4 border-biru-200 bg-biru-50/50">
          <p className="text-xs font-medium text-biru-800">
            Total Lulus (P1 & P2)
          </p>
          <p className="text-2xl font-bold text-biru-950 mt-1">
            {data?.sidang ? data.sidang.total_lulus : 0}
          </p>
        </Card>
        <Card className="p-4 border-biru-200 bg-biru-50/70">
          <p className="text-xs font-medium text-biru-800">Total Cadangan</p>
          <p className="text-2xl font-bold text-biru-950 mt-1">
            {data?.sidang ? data.sidang.total_cadangan : 0}
          </p>
        </Card>
        <Card className="p-4 border-biru-300 bg-biru-100/60">
          <p className="text-xs font-medium text-biru-900">Tidak Lulus</p>
          <p className="text-2xl font-bold text-biru-950 mt-1">
            {data?.sidang ? data.sidang.total_tidak_lulus : 0}
          </p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-biru-200 bg-putih flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-biru-600" />
          <input
            type="text"
            placeholder="Cari nama atau nomor pendaftaran..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-biru-300 rounded-xl text-xs text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "LULUS", "CADANGAN", "TIDAK_LULUS"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === st
                  ? "bg-biru-900 text-putih shadow-sm"
                  : "bg-biru-100 text-biru-900 hover:bg-biru-200"
              }`}
            >
              {st === "ALL" ? "Semua Status" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </Card>

      {/* Loading & Error States */}
      {isLoading && <TableSkeleton />}

      {!isLoading && isError && (
        <ErrorState
          title="Terjadi Kesalahan"
          message={errorMessage || "Gagal memuat draf pleno kelulusan."}
          onRetry={loadData}
        />
      )}

      {/* Empty State */}
      {!isLoading && !isError && (!data || data.items.length === 0) && (
        <EmptyState
          title="Belum Ada Sidang Pleno Kelulusan"
          description="Klik tombol 'Proses Ranking & Sidang Baru' untuk menjalankan perankingan otomatis berdasarkan bobot CBT, rapor, dan kuota prodi."
          actionLabel="Proses Ranking Sekarang"
          onAction={() => setShowProsesModal(true)}
        />
      )}

      {/* Ranking Candidates Table */}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <Card className="overflow-hidden border-biru-200 bg-putih shadow-sm rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-biru-100/70 border-b border-biru-200 text-biru-950 font-semibold">
                  <th className="py-3 px-4 text-center">Rank</th>
                  <th className="py-3 px-4">Calon Mahasiswa</th>
                  <th className="py-3 px-4">Pilihan Prodi</th>
                  <th className="py-3 px-4 text-center">CBT</th>
                  <th className="py-3 px-4 text-center">Rapor</th>
                  <th className="py-3 px-4 text-center">Prestasi</th>
                  <th className="py-3 px-4">Hasil 3 Seleksi</th>
                  <th className="py-3 px-4 text-center">Skor Akhir</th>
                  <th className="py-3 px-4 text-center">Status Keputusan</th>
                  <th className="py-3 px-4">Prodi Diterima</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-biru-100 text-biru-950">
                {filteredItems.map((item) => (
                  <tr
                    key={item.pendaftar_id}
                    className="hover:bg-biru-50/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-bold font-mono">
                      {item.ranking <= 3 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-biru-100 text-biru-950 border border-biru-300 font-bold text-xs">
                          {item.ranking}
                        </span>
                      ) : (
                        `#${item.ranking}`
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-biru-950">
                        {item.nama_lengkap}
                      </div>
                      <div className="text-[11px] text-biru-700 font-mono">
                        {item.nomor_pendaftaran} • {item.jalur_nama}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-biru-950 font-medium">
                        1. {item.prodi_pilihan_1_nama}
                      </div>
                      {item.prodi_pilihan_2_nama && (
                        <div className="text-[11px] text-biru-700">
                          2. {item.prodi_pilihan_2_nama}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {item.skor_cbt.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {item.nilai_rapor.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {item.nilai_prestasi.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-[11px] leading-relaxed">
                      <div>Rapor: {labelHasil(item.status_seleksi_rapor)}</div>
                      <div>
                        CBT:{" "}
                        {item.lulus_cbt == null
                          ? "Menunggu"
                          : item.lulus_cbt
                            ? "Lulus"
                            : "Tidak lulus"}
                      </div>
                      <div>
                        Interview: {labelHasil(item.status_seleksi_interview)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-biru-950 font-mono text-sm">
                      {item.skor_akhir.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge
                        status={
                          item.status_kelulusan.startsWith("LULUS")
                            ? "berhasil"
                            : item.status_kelulusan === "CADANGAN"
                              ? "peringatan"
                              : "gagal"
                        }
                        label={
                          item.status_kelulusan === "LULUS_PILIHAN_1"
                            ? "Lulus Pil. 1"
                            : item.status_kelulusan === "LULUS_PILIHAN_2"
                              ? "Lulus Pil. 2"
                              : item.status_kelulusan === "CADANGAN"
                                ? "Cadangan"
                                : "Tidak Lulus"
                        }
                      />
                    </td>
                    <td className="py-3 px-4">
                      {item.prodi_diterima_nama ? (
                        <div className="font-semibold text-biru-950">
                          {item.prodi_diterima_nama}
                        </div>
                      ) : (
                        <span className="text-biru-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {([1, 2] as const).map((n) => {
                          const prodiId =
                            n === 1
                              ? item.prodi_pilihan_1_id
                              : item.prodi_pilihan_2_id;
                          if (!prodiId) return null;
                          const aktif =
                            item.status_kelulusan.startsWith("LULUS") &&
                            item.prodi_diterima_id === prodiId;
                          return (
                            <Button
                              key={n}
                              variant={aktif ? "primary" : "outline"}
                              size="sm"
                              disabled={aktif}
                              onClick={() => void handleTempatkan(item, n)}
                              title={`Tempatkan di pilihan ${n}: ${
                                n === 1
                                  ? item.prodi_pilihan_1_nama
                                  : item.prodi_pilihan_2_nama
                              }`}
                              className="text-[11px] px-2 py-1"
                            >
                              Pil. {n}
                            </Button>
                          );
                        })}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedKandidat(item);
                            setStatusKoreksi(item.status_kelulusan);
                          }}
                          className="text-[11px] px-2 py-1"
                        >
                          Koreksi
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Proses Ranking & Sidang Baru */}
      {showProsesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-biru-950/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-putih p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-biru-200">
              <h3 className="font-bold text-base text-biru-950">
                Proses Ranking & Buat Draf Sidang Pleno
              </h3>
              <button
                onClick={() => setShowProsesModal(false)}
                className="text-biru-600 hover:text-biru-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProsesRanking} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-biru-950 mb-1">
                  Nama Sidang Pleno
                </label>
                <input
                  type="text"
                  required
                  value={namaSidang}
                  onChange={(e) => setNamaSidang(e.target.value)}
                  className="w-full px-3 py-2 border border-biru-300 rounded-xl text-biru-950 focus:ring-2 focus:ring-biru-500"
                />
              </div>

              <div>
                <label className="block font-medium text-biru-950 mb-1">
                  Nomor Surat Keputusan (SK) Pleno
                </label>
                <input
                  type="text"
                  value={nomorSk}
                  onChange={(e) => setNomorSk(e.target.value)}
                  className="w-full px-3 py-2 border border-biru-300 rounded-xl text-biru-950 focus:ring-2 focus:ring-biru-500"
                />
              </div>

              <div>
                <label className="block font-medium text-biru-950 mb-1">
                  Waktu Publikasi Pengumuman ke Calon Mahasiswa
                </label>
                <input
                  type="datetime-local"
                  required
                  value={tglPengumuman}
                  onChange={(e) => setTglPengumuman(e.target.value)}
                  className="w-full px-3 py-2 border border-biru-300 rounded-xl text-biru-950 focus:ring-2 focus:ring-biru-500"
                />
                <p className="text-[11px] text-biru-700 mt-1">
                  Sebelum tanggal ini tiba, portal calon akan menampilkan status
                  "Pengumuman Terjadwal" dan mengunci hasil (IDOR-safe).
                </p>
              </div>

              <div className="bg-biru-50 border border-biru-200 p-3 rounded-xl text-[11px] text-biru-800 space-y-1">
                <p className="font-semibold text-biru-950">
                  Aturan Ranking Otomatis:
                </p>
                <p>
                  1. Skor akhir dihitung berdasarkan bobot CBT, rapor, dan
                  prestasi per jalur.
                </p>
                <p>
                  2. Nilai seri diselesaikan berurutan: skor CBT &gt; rata-rata
                  rapor &gt; waktu submit.
                </p>
                <p>
                  3. Kuota prodi pilihan 1 dialokasikan terlebih dahulu, jika
                  penuh dilempar ke pilihan 2.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-biru-200">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setShowProsesModal(false)}
                >
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Jalankan Perankingan
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Koreksi Status Kandidat */}
      {selectedKandidat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-biru-950/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-putih p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-biru-200">
              <h3 className="font-bold text-base text-biru-950">
                Koreksi Status Keputusan Kandidat
              </h3>
              <button
                onClick={() => setSelectedKandidat(null)}
                className="text-biru-600 hover:text-biru-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleKoreksiKandidat}
              className="space-y-4 text-xs"
            >
              <div className="bg-biru-50 p-3 rounded-xl">
                <p className="font-bold text-biru-950">
                  {selectedKandidat.nama_lengkap}
                </p>
                <p className="text-biru-700 text-[11px]">
                  {selectedKandidat.nomor_pendaftaran}
                </p>
                <p className="text-biru-900 mt-1">
                  Skor Akhir: <b>{selectedKandidat.skor_akhir.toFixed(2)}</b>{" "}
                  (Rank #{selectedKandidat.ranking})
                </p>
              </div>

              <div>
                <label className="block font-medium text-biru-950 mb-1">
                  Status Keputusan Baru
                </label>
                <select
                  value={statusKoreksi}
                  onChange={(e) => setStatusKoreksi(e.target.value)}
                  className="w-full px-3 py-2 border border-biru-300 rounded-xl text-biru-950"
                >
                  <option value="LULUS_PILIHAN_1">
                    Lulus Pilihan 1 ({selectedKandidat.prodi_pilihan_1_nama})
                  </option>
                  {selectedKandidat.prodi_pilihan_2_nama && (
                    <option value="LULUS_PILIHAN_2">
                      Lulus Pilihan 2 ({selectedKandidat.prodi_pilihan_2_nama})
                    </option>
                  )}
                  <option value="CADANGAN">Cadangan (Waitlist)</option>
                  <option value="TIDAK_LULUS">Tidak Lulus</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-biru-950 mb-1">
                  Alasan Koreksi / Catatan Pleno (Wajib diisi untuk Audit Log)
                </label>
                <textarea
                  required
                  rows={3}
                  value={alasanKoreksi}
                  onChange={(e) => setAlasanKoreksi(e.target.value)}
                  placeholder="Misal: Penyesuaian kuota afirmatif rektorat sesuai surat edaran..."
                  className="w-full px-3 py-2 border border-biru-300 rounded-xl text-biru-950 focus:ring-2 focus:ring-biru-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-biru-200">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedKandidat(null)}
                >
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Audit Trail History */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-biru-950/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl bg-putih p-6 rounded-2xl shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-biru-200">
              <h3 className="font-bold text-base text-biru-950 flex items-center gap-2">
                <History className="w-5 h-5 text-biru-700" />
                <span>Histori Keputusan & Log Audit Pleno</span>
              </h3>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-biru-600 hover:text-biru-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1 text-xs">
              {data?.audit_logs && data.audit_logs.length > 0 ? (
                data.audit_logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-biru-50 border border-biru-200 rounded-xl space-y-1"
                  >
                    <div className="flex items-center justify-between text-biru-950 font-semibold">
                      <span>{log.actor_name}</span>
                      <span className="text-[11px] text-biru-700 font-mono">
                        {new Date(log.created_at).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="text-[11px] text-biru-800">
                      Perubahan Status:{" "}
                      <span className="font-mono bg-biru-200/60 px-1.5 py-0.5 rounded">
                        {log.status_lama || "DRAFT"}
                      </span>{" "}
                      ➔{" "}
                      <span className="font-mono bg-biru-100 text-biru-950 border border-biru-300 font-bold px-1.5 py-0.5 rounded">
                        {log.status_baru}
                      </span>
                    </div>
                    {log.catatan && (
                      <p className="text-[11px] text-biru-900 italic mt-1 bg-putih p-2 rounded border border-biru-200">
                        "{log.catatan}"
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-biru-700 py-6">
                  Belum ada catatan log audit.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-biru-200 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAuditModal(false)}
              >
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Konfigurasi Rumus Penilaian */}
      {showRumusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-biru-950/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xl bg-putih p-6 rounded-2xl shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-biru-200">
              <div>
                <h3 className="font-bold text-base text-biru-950 font-serif">
                  Konfigurasi Rumus Penilaian & Bobot Jalur
                </h3>
                <p className="text-xs text-biru-700">
                  Tentukan persentase bobot komponen penilaian dan passing score
                  minimum.
                </p>
              </div>
              <button
                onClick={() => setShowRumusModal(false)}
                className="text-biru-600 hover:text-biru-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {isLoadingRumus && (
                <div className="py-8 text-center text-biru-700">
                  Memuat data konfigurasi rumus...
                </div>
              )}

              {!isLoadingRumus && rumusList.length > 0 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-biru-950 block">
                      Pilih Jalur Pendaftaran
                    </label>
                    <select
                      value={editingRumus?.id || ""}
                      onChange={(e) => {
                        const found = rumusList.find(
                          (r) => r.id === e.target.value,
                        );
                        if (found) setEditingRumus({ ...found });
                      }}
                      className="w-full p-2 border border-biru-300 rounded-xl text-biru-950 focus:ring-2 focus:ring-biru-500"
                    >
                      {rumusList.map((r, i) => (
                        <option key={r.id} value={r.id}>
                          Jalur PMB {i + 1} (Passing Score:{" "}
                          {r.default_passing_score})
                        </option>
                      ))}
                    </select>
                  </div>

                  {editingRumus && (
                    <form onSubmit={handleSaveRumus} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 p-4 bg-biru-50/50 rounded-xl border border-biru-200">
                        <div className="space-y-1">
                          <label className="font-semibold text-biru-950 block">
                            Bobot CBT / Tes Online (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editingRumus.bobot_cbt}
                            onChange={(e) =>
                              setEditingRumus({
                                ...editingRumus,
                                bobot_cbt: Number(e.target.value),
                              })
                            }
                            className="w-full p-2 border border-biru-300 rounded-lg text-biru-950 focus:ring-2 focus:ring-biru-500"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-biru-950 block">
                            Bobot Rapor (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editingRumus.bobot_rapor}
                            onChange={(e) =>
                              setEditingRumus({
                                ...editingRumus,
                                bobot_rapor: Number(e.target.value),
                              })
                            }
                            className="w-full p-2 border border-biru-300 rounded-lg text-biru-950 focus:ring-2 focus:ring-biru-500"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-biru-950 block">
                            Bobot Prestasi (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editingRumus.bobot_prestasi}
                            onChange={(e) =>
                              setEditingRumus({
                                ...editingRumus,
                                bobot_prestasi: Number(e.target.value),
                              })
                            }
                            className="w-full p-2 border border-biru-300 rounded-lg text-biru-950 focus:ring-2 focus:ring-biru-500"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-biru-950 block">
                            Bobot Wawancara (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editingRumus.bobot_wawancara}
                            onChange={(e) =>
                              setEditingRumus({
                                ...editingRumus,
                                bobot_wawancara: Number(e.target.value),
                              })
                            }
                            className="w-full p-2 border border-biru-300 rounded-lg text-biru-950 focus:ring-2 focus:ring-biru-500"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-biru-100/60 rounded-xl border border-biru-300">
                        <span className="font-semibold text-biru-950">
                          Total Akumulasi Bobot:
                        </span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            editingRumus.bobot_cbt +
                              editingRumus.bobot_rapor +
                              editingRumus.bobot_prestasi +
                              editingRumus.bobot_wawancara ===
                            100
                              ? "text-biru-950"
                              : "text-biru-700"
                          }`}
                        >
                          {editingRumus.bobot_cbt +
                            editingRumus.bobot_rapor +
                            editingRumus.bobot_prestasi +
                            editingRumus.bobot_wawancara}
                          % (Standar: 100%)
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-biru-950 block">
                          Nilai Batas Lulus Standar (Default Passing Score)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={editingRumus.default_passing_score}
                          onChange={(e) =>
                            setEditingRumus({
                              ...editingRumus,
                              default_passing_score: Number(e.target.value),
                            })
                          }
                          className="w-full p-2 border border-biru-300 rounded-lg text-biru-950 focus:ring-2 focus:ring-biru-500"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-biru-950 block">
                          Catatan / Keterangan
                        </label>
                        <input
                          type="text"
                          value={editingRumus.keterangan || ""}
                          onChange={(e) =>
                            setEditingRumus({
                              ...editingRumus,
                              keterangan: e.target.value,
                            })
                          }
                          placeholder="Misal: Komposisi reguler gelombang 1"
                          className="w-full p-2 border border-biru-300 rounded-lg text-biru-950 focus:ring-2 focus:ring-biru-500"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => setShowRumusModal(false)}
                        >
                          Batal
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          type="submit"
                          className="bg-biru-900 hover:bg-biru-950 text-putih"
                        >
                          Simpan Perubahan
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {!isLoadingRumus && rumusList.length === 0 && (
                <div className="py-6 text-center text-biru-700">
                  Belum ada rumus penilaian terdaftar di database.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
