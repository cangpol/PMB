import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  Plus,
  Users,
  Building2,
  Tv,
  UserCheck,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "../../../components/common";
import { fetchApi, type ApiError } from "@/services/api";
import { useToast } from "@/components/ui/useToast";
import type { components } from "@/types/api";

type SesiUjian = components["schemas"]["SesiUjian"];
type PaketUjian = components["schemas"]["PaketUjian"];

export const JadwalSesiPage: React.FC = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sesiList, setSesiList] = useState<SesiUjian[]>([]);
  const [paketList, setPaketList] = useState<PaketUjian[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [selectedSesi, setSelectedSesi] = useState<SesiUjian | null>(null);

  // Form Tambah Sesi
  const [formPaketId, setFormPaketId] = useState<string>("");
  const [formNamaSesi, setFormNamaSesi] = useState<string>("");
  const [formRuang, setFormRuang] = useState<string>("Online (dari rumah)");
  const [formKuota, setFormKuota] = useState<number>(40);
  const [formMulai, setFormMulai] = useState<string>("");
  const [formSelesai, setFormSelesai] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [formGelombangId, setFormGelombangId] = useState<string>("");
  const [formJalurId, setFormJalurId] = useState<string>("");
  const [formDibuka, setFormDibuka] = useState<boolean>(true);
  const [gelombangList, setGelombangList] = useState<
    { id: string; nama_gelombang: string }[]
  >([]);
  const [jalurList, setJalurList] = useState<
    { id: string; nama_jalur: string }[]
  >([]);

  // Assign Peserta Form
  const [inputPendaftarIds, setInputPendaftarIds] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // 1. Fetch Sesi & Paket Ujian
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [sesiRes, paketRes] = await Promise.all([
        fetchApi<SesiUjian[]>("/api/cbt/admin/sesi"),
        fetchApi<PaketUjian[]>("/api/cbt/admin/paket"),
      ]);
      setSesiList(sesiRes);
      setPaketList(paketRes);
      const [gel, jal] = await Promise.all([
        fetchApi<{ id: string; nama_gelombang: string }[]>(
          "/api/master/gelombang",
        ).catch(() => []),
        fetchApi<{ id: string; nama_jalur: string }[]>(
          "/api/master/jalur",
        ).catch(() => []),
      ]);
      setGelombangList(gel);
      setJalurList(jal);
      if (paketRes.length > 0 && !formPaketId) {
        setFormPaketId(paketRes[0].id);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr.pesan || "Gagal memuat jadwal sesi ujian CBT");
    } finally {
      setLoading(false);
    }
  }, [formPaketId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Buat Sesi Baru
  const handleCreateSesi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPaketId || !formNamaSesi.trim() || !formMulai || !formSelesai) {
      toast({
        title: "Validasi Gagal",
        description: "Semua field formulir sesi wajib diisi.",
        type: "error",
      });
      return;
    }

    try {
      setIsCreating(true);
      await fetchApi<SesiUjian>("/api/cbt/admin/sesi", {
        method: "POST",
        body: JSON.stringify({
          paket_id: formPaketId,
          nama_sesi: formNamaSesi.trim(),
          jadwal_mulai: new Date(formMulai).toISOString(),
          jadwal_selesai: new Date(formSelesai).toISOString(),
          ruang: formRuang.trim() || "Online (dari rumah)",
          kuota: formKuota,
          mode: "ONLINE",
          gelombang_id: formGelombangId || null,
          jalur_id: formJalurId || null,
          is_dibuka_pendaftaran: formDibuka,
        }),
      });

      toast({
        title: "Sesi Dijadwalkan",
        description: "Sesi ujian CBT berhasil dibuat dan aktif.",
      });

      setShowCreateModal(false);
      setFormNamaSesi("");
      loadData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Gagal Membuat Sesi",
        description: apiErr.pesan || "Terjadi kesalahan sistem.",
        type: "error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // 3. Alokasikan Peserta ke Sesi
  const handleAssignPeserta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSesi) return;

    const ids = inputPendaftarIds
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (ids.length === 0) {
      toast({
        title: "Pendaftar Kosong",
        description: "Masukkan setidaknya satu UUID ID pendaftar.",
        type: "error",
      });
      return;
    }

    try {
      setIsAssigning(true);
      const res = await fetchApi<{ pesan: string }>(
        `/api/cbt/admin/sesi/${selectedSesi.id}/assign`,
        {
          method: "POST",
          body: JSON.stringify({ pendaftar_ids: ids }),
        },
      );

      toast({
        title: "Peserta Dialokasikan",
        description: res.pesan || "Peserta berhasil dialokasikan ke sesi ini.",
      });

      setShowAssignModal(false);
      setInputPendaftarIds("");
      loadData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Alokasi Gagal",
        description: apiErr.pesan || "Gagal mengalokasikan peserta.",
        type: "error",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-biru-950">
            Jadwal Sesi Ujian CBT
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Atur jadwal, alokasi ruangan, kuota peserta, dan monitoring
            pelaksanaan tes online.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-biru-600 hover:bg-biru-700 text-white"
        >
          <Plus className="w-4 h-4" />
          Jadwalkan Sesi Baru
        </Button>
      </div>

      {/* Konten Daftar Sesi */}
      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState
          title="Gagal Memuat Jadwal"
          message={error}
          onRetry={loadData}
        />
      ) : sesiList.length === 0 ? (
        <EmptyState
          title="Belum Ada Jadwal Sesi"
          description="Silakan buat jadwal sesi ujian baru untuk memulai alokasi calon mahasiswa."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sesiList.map((sesi) => (
            <Card
              key={sesi.id}
              className="p-6 bg-white border border-slate-200 shadow-sm hover:border-biru-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-biru-50 text-biru-700">
                      {sesi.status}
                    </span>
                    <h3 className="text-lg font-serif font-bold text-biru-950 mt-1">
                      {sesi.nama_sesi}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-400">
                      Kuota: {sesi.kuota} Peserta
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-biru-600 shrink-0" />
                    <span>
                      Mulai:{" "}
                      <strong>{formatDateTime(sesi.jadwal_mulai)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      Selesai:{" "}
                      <strong>{formatDateTime(sesi.jadwal_selesai)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      {sesi.mode === "ONLINE" ? (
                        <strong>
                          Online dari rumah (tanpa presensi pengawas)
                        </strong>
                      ) : (
                        <>
                          Luring - Ruangan: <strong>{sesi.ruang}</strong>
                        </>
                      )}
                      {sesi.is_dibuka_pendaftaran
                        ? " - dapat dipilih calon"
                        : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
                <Link to={`/admin/cbt/monitor/${sesi.id}`} className="w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center gap-1.5 text-xs border-biru-600 text-biru-700 hover:bg-biru-50"
                  >
                    <Tv className="w-3.5 h-3.5" /> Live Monitor
                  </Button>
                </Link>

                <Link
                  to={`/admin/cbt/presensi?sesi_id=${sesi.id}`}
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Presensi
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSesi(sesi);
                    setShowAssignModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Users className="w-3.5 h-3.5" /> Alokasi
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL: BUAT SESI BARU */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 bg-white shadow-xl border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-lg font-serif font-bold text-biru-950">
                Jadwalkan Sesi Ujian Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSesi} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paket Ujian *
                </label>
                <select
                  value={formPaketId}
                  onChange={(e) => setFormPaketId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600 bg-white"
                  required
                >
                  {paketList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_paket} ({p.durasi_menit} Menit, Passing Grade:{" "}
                      {p.passing_grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Sesi Ujian *
                </label>
                <input
                  type="text"
                  value={formNamaSesi}
                  onChange={(e) => setFormNamaSesi(e.target.value)}
                  placeholder="Contoh: Gelombang 1 - Sesi Pagi 01"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ruangan Ujian *
                  </label>
                  <input
                    type="text"
                    value={formRuang}
                    onChange={(e) => setFormRuang(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kapasitas / Kuota *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formKuota}
                    onChange={(e) =>
                      setFormKuota(parseInt(e.target.value) || 40)
                    }
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jadwal Mulai *
                  </label>
                  <input
                    type="datetime-local"
                    value={formMulai}
                    onChange={(e) => setFormMulai(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jadwal Selesai *
                  </label>
                  <input
                    type="datetime-local"
                    value={formSelesai}
                    onChange={(e) => setFormSelesai(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-1">
                    Mode pelaksanaan
                  </span>
                  <p className="px-3 py-2 rounded-lg bg-biru-50 border border-biru-200 text-xs text-biru-900">
                    Ujian CBT diselenggarakan online dari rumah (tanpa
                    presensi).
                  </p>
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold text-slate-700 mb-1"
                    htmlFor="sesi-gelombang"
                  >
                    Khusus gelombang
                  </label>
                  <select
                    id="sesi-gelombang"
                    value={formGelombangId}
                    onChange={(e) => setFormGelombangId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600"
                  >
                    <option value="">Semua gelombang</option>
                    {gelombangList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama_gelombang}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold text-slate-700 mb-1"
                    htmlFor="sesi-jalur"
                  >
                    Khusus jalur
                  </label>
                  <select
                    id="sesi-jalur"
                    value={formJalurId}
                    onChange={(e) => setFormJalurId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600"
                  >
                    <option value="">Semua jalur</option>
                    {jalurList.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nama_jalur}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700 sm:pt-6">
                  <input
                    type="checkbox"
                    checked={formDibuka}
                    onChange={(e) => setFormDibuka(e.target.checked)}
                    className="accent-biru-700"
                  />
                  Dapat dipilih calon sebagai jadwal seleksi
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isCreating}
                  className="bg-biru-600 hover:bg-biru-700 text-white"
                >
                  {isCreating ? "Menyimpan..." : "Jadwalkan Sesi"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: ASSIGN PESERTA */}
      {showAssignModal && selectedSesi && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 bg-white shadow-xl border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-biru-950">
                  Alokasikan Peserta ke Sesi
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedSesi.nama_sesi}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignPeserta} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Pendaftar (UUID dipisahkan koma atau baris baru) *
                </label>
                <textarea
                  rows={6}
                  value={inputPendaftarIds}
                  onChange={(e) => setInputPendaftarIds(e.target.value)}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000&#10;550e8400-e29b-41d4-a716-446655440001"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600 font-mono text-xs"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Peserta yang dialokasikan akan otomatis menerima nomor peserta
                  ujian CBT unik.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAssignModal(false)}
                  disabled={isAssigning}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isAssigning}
                  className="bg-biru-600 hover:bg-biru-700 text-white"
                >
                  {isAssigning ? "Mengalokasikan..." : "Simpan Alokasi"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
