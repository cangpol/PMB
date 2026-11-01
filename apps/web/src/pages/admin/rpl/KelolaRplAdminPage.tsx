import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileCheck2,
  Users,
  Clock,
  CheckCircle2,
  Search,
  UserCheck,
  Download,
  Eye,
  AlertCircle,
  X,
  Send,
  BookOpen,
} from "lucide-react";
import {
  Card,
  Button,
  StatusBadge,
  EmptyState,
  TableSkeleton,
} from "../../../components/common";
import { fetchApi } from "../../../services/api";
import { useAuth } from "@/context";

interface RplItemRekap {
  id: string;
  pendaftar_id: string;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  prodi_nama: string;
  jenjang: string;
  tipe_rpl: string;
  status: string;
  total_sks_diajukan: number;
  total_sks_diakui: number;
  ipk_konversi: number;
  persentase_rekognisi: number;
  asesor_id?: string | null;
  asesor_nama?: string | null;
  submitted_at?: string | null;
  assessed_at?: string | null;
}

interface ProdiOption {
  id: string;
  nama: string;
  jenjang: string;
}

interface UserOption {
  id: string;
  nama_lengkap: string;
  email: string;
  role: string;
}

export const KelolaRplAdminPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin_pmb" || user?.role === "super_admin";
  const isAsesor = user?.role === "asesor_rpl";

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<RplItemRekap[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedProdi, setSelectedProdi] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [prodiList, setProdiList] = useState<ProdiOption[]>([]);
  const [asesorList, setAsesorList] = useState<UserOption[]>([]);

  // Assign Modal
  const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
  const [selectedPermohonan, setSelectedPermohonan] =
    useState<RplItemRekap | null>(null);
  const [selectedAsesorId, setSelectedAsesorId] = useState<string>("");
  const [catatanAdmin, setCatatanAdmin] = useState<string>("");
  const [assigning, setAssigning] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch RPL Applications
      let endpoint = "/api/rpl/admin/permohonan";
      const params = new URLSearchParams();
      if (selectedProdi) params.append("prodi_id", selectedProdi);
      if (selectedStatus) params.append("status", selectedStatus);
      if (params.toString()) endpoint += `?${params.toString()}`;

      const res = await fetchApi<RplItemRekap[]>(endpoint);
      setData(res);

      // 2. Fetch Prodi & Users for Assessor selection if not yet loaded (Admin only)
      if (prodiList.length === 0) {
        try {
          const prodis = await fetchApi<any[]>("/api/master/prodi");
          setProdiList(
            prodis.map((p) => ({
              id: p.id,
              nama: p.nama_prodi || p.nama,
              jenjang: p.jenjang,
            })),
          );
        } catch {
          // ignore
        }
      }

      if (isAdmin && asesorList.length === 0) {
        try {
          const usersRes = await fetchApi<any>("/api/auth/users");
          const allUsers = usersRes?.users || usersRes || [];
          const asesors = allUsers.filter(
            (u: any) =>
              u.role === "asesor_rpl" ||
              u.role === "admin_pmb" ||
              u.role === "super_admin",
          );
          setAsesorList(asesors);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setError(err?.pesan || "Gagal memuat rekapitulasi permohonan RPL.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProdi, selectedStatus]);

  const handleOpenAssignModal = (item: RplItemRekap) => {
    setSelectedPermohonan(item);
    setSelectedAsesorId(item.asesor_id || "");
    setCatatanAdmin("");
    setAssignModalOpen(true);
  };

  const handleAssignAsesor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPermohonan || !selectedAsesorId) return;

    try {
      setAssigning(true);
      setError(null);

      await fetchApi(`/api/rpl/admin/assign-asesor/${selectedPermohonan.id}`, {
        method: "POST",
        body: JSON.stringify({
          asesor_id: selectedAsesorId,
          catatan_admin: catatanAdmin || null,
        }),
      });

      setActionSuccess(
        `Asesor berhasil ditugaskan untuk pendaftar ${selectedPermohonan.nama_lengkap}.`,
      );
      setAssignModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err?.pesan || "Gagal menugaskan asesor.");
    } finally {
      setAssigning(false);
    }
  };

  // Filter Search
  const filteredData = data.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.nomor_pendaftaran.toLowerCase().includes(q) ||
      item.nama_lengkap.toLowerCase().includes(q) ||
      item.prodi_nama.toLowerCase().includes(q) ||
      (item.asesor_nama && item.asesor_nama.toLowerCase().includes(q))
    );
  });

  // Statistik Ringkas
  const totalPermohonan = data.length;
  const menungguPenugasan = data.filter(
    (d) => d.status === "DIAJUKAN" && !d.asesor_id,
  ).length;
  const dalamPenilaian = data.filter(
    (d) =>
      d.status === "DALAM_PENILAIAN" ||
      (d.status === "DIAJUKAN" && d.asesor_id),
  ).length;
  const selesaiDinilai = data.filter(
    (d) => d.status === "SELESAI_DINILAI",
  ).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-biru-950 font-serif">
            {isAsesor
              ? "Penilaian & Evaluasi Jalur RPL"
              : "Rekapitulasi & Evaluasi Jalur RPL"}
          </h1>
          <p className="text-sm text-biru-800">
            {isAsesor
              ? "Daftar permohonan calon mahasiswa jalur RPL yang ditugaskan kepada Anda untuk dinilai."
              : "Penugasan asesor, pemantauan penilaian per mata kuliah, dan penerbitan berita acara konversi SKS Rekognisi Pembelajaran Lampau."}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <Link to="/admin/rpl/mata-kuliah">
              <Button variant="outline">
                <BookOpen className="w-4 h-4 mr-1.5 inline" />
                Kelola Kurikulum RPL
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Kartu Metrik Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-biru-50 text-biru-700 border border-biru-200">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-biru-950">
              {totalPermohonan}
            </div>
            <div className="text-xs text-biru-800 font-medium">
              Total Permohonan
            </div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-biru-50 text-biru-700 border border-biru-200">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-biru-950">
              {menungguPenugasan}
            </div>
            <div className="text-xs text-biru-800 font-medium">
              Menunggu Asesor
            </div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-biru-50 text-biru-700 border border-biru-200">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-biru-950">
              {dalamPenilaian}
            </div>
            <div className="text-xs text-biru-800 font-medium">
              Sedang Dinilai
            </div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-biru-50 text-biru-700 border border-biru-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-biru-950">
              {selesaiDinilai}
            </div>
            <div className="text-xs text-biru-800 font-medium">
              Selesai Dikonversi
            </div>
          </div>
        </Card>
      </div>

      {/* Action Success Alert */}
      {actionSuccess && (
        <div className="p-4 bg-biru-50 border border-biru-500 rounded-lg text-sm text-biru-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-biru-700" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-biru-700 hover:text-biru-950"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-biru-50 border-2 border-biru-600 rounded-lg text-sm text-biru-950 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-biru-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold">Terjadi Kesalahan</div>
            <div>{error}</div>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-biru-700 hover:text-biru-950"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-biru-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan nomor pendaftaran, nama calon, atau asesor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-biru-200 text-biru-950 focus:outline-none focus:ring-1 focus:ring-biru-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedProdi}
              onChange={(e) => setSelectedProdi(e.target.value)}
              className="text-xs rounded-lg border border-biru-200 py-2 px-3 text-biru-950 bg-putih focus:outline-none focus:ring-1 focus:ring-biru-500"
            >
              <option value="">Semua Program Studi</option>
              {prodiList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({p.jenjang})
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs rounded-lg border border-biru-200 py-2 px-3 text-biru-950 bg-putih focus:outline-none focus:ring-1 focus:ring-biru-500"
            >
              <option value="">Semua Status</option>
              <option value="DRAFT">DRAFT</option>
              <option value="DIAJUKAN">DIAJUKAN</option>
              <option value="DALAM_PENILAIAN">DALAM PENILAIAN</option>
              <option value="SELESAI_DINILAI">SELESAI DINILAI</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tabel Permohonan RPL */}
      <Card className="overflow-hidden border border-biru-200 shadow-soft-sm">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={8} />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada permohonan RPL yang sesuai filter."
              description="Coba ubah kata kunci pencarian atau sesuaikan pilihan filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-biru-950">
              <thead className="bg-biru-50 border-b border-biru-200 text-[11px] uppercase font-semibold text-biru-900">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Pendaftar</th>
                  <th className="py-3 px-4">Program Studi</th>
                  <th className="py-3 px-4">Tipe RPL</th>
                  <th className="py-3 px-4 text-center">Diajukan</th>
                  <th className="py-3 px-4 text-center">Diakui</th>
                  <th className="py-3 px-4 text-center">IPK Konversi</th>
                  <th className="py-3 px-4">Asesor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-biru-100">
                {filteredData.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-biru-50/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-biru-700">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-biru-950">
                        {item.nama_lengkap}
                      </div>
                      <div className="text-[11px] text-biru-700 font-mono">
                        {item.nomor_pendaftaran}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{item.prodi_nama}</div>
                      <div className="text-[11px] text-biru-700">
                        {item.jenjang}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-biru-50 text-biru-900 border border-biru-200">
                        {item.tipe_rpl}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-medium">
                      {item.total_sks_diajukan} SKS
                    </td>
                    <td className="py-3 px-4 text-center font-semibold">
                      {item.total_sks_diakui > 0 ? (
                        <span className="text-biru-950 font-bold">
                          {item.total_sks_diakui} SKS
                        </span>
                      ) : (
                        <span className="text-biru-700">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold">
                      {item.ipk_konversi > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-biru-50 text-biru-950 font-bold border border-biru-200">
                          {item.ipk_konversi.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-biru-700">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.asesor_nama ? (
                        <div className="flex items-center gap-1.5 text-biru-950">
                          <UserCheck className="w-3.5 h-3.5 text-biru-700" />
                          <span>{item.asesor_nama}</span>
                        </div>
                      ) : (
                        <span className="text-biru-600 italic text-[11px]">
                          Belum ditugaskan
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Tugaskan Asesor (Hanya Admin dan jika bukan DRAFT) */}
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={item.status === "DRAFT"}
                            title={
                              item.status === "DRAFT"
                                ? "Permohonan masih berstatus DRAFT dan belum diajukan oleh calon"
                                : undefined
                            }
                            onClick={() => handleOpenAssignModal(item)}
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1 inline" />
                            {item.asesor_id ? "Ganti Asesor" : "Tugaskan"}
                          </Button>
                        )}

                        {/* Tombol Buka Lembar Penilaian */}
                        <Link to={`/admin/rpl/penilaian/${item.id}`}>
                          <Button variant="primary" size="sm">
                            <Eye className="w-3.5 h-3.5 mr-1 inline" />
                            Evaluasi
                          </Button>
                        </Link>

                        {/* Tombol Unduh CSV Berita Acara */}
                        {item.status === "SELESAI_DINILAI" && (
                          <a
                            href={`/api/rpl/admin/laporan/${item.id}/export`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              <Download className="w-3.5 h-3.5 mr-1 inline" />
                              CSV
                            </Button>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* DIALOG / MODAL PENUGASAN ASESOR */}
      {assignModalOpen && selectedPermohonan && (
        <div className="fixed inset-0 z-50 bg-biru-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-putih rounded-xl border border-biru-200 shadow-soft-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-biru-100 pb-3">
              <div className="flex items-center gap-2 font-serif font-bold text-base text-biru-950">
                <UserCheck className="w-5 h-5 text-biru-700" />
                <h3>Penugasan Asesor RPL</h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="text-biru-700 hover:text-biru-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-biru-800 bg-biru-50/50 p-3 rounded-lg border border-biru-200">
              <div>
                <strong>Pendaftar:</strong> {selectedPermohonan.nama_lengkap} (
                {selectedPermohonan.nomor_pendaftaran})
              </div>
              <div>
                <strong>Program Studi:</strong> {selectedPermohonan.prodi_nama}{" "}
                ({selectedPermohonan.jenjang})
              </div>
              <div>
                <strong>Mata Kuliah Diajukan:</strong>{" "}
                {selectedPermohonan.total_sks_diajukan} SKS
              </div>
            </div>

            <form onSubmit={handleAssignAsesor} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-biru-950 block mb-1">
                  Pilih Asesor RPL Terakreditasi
                </label>
                <select
                  required
                  value={selectedAsesorId}
                  onChange={(e) => setSelectedAsesorId(e.target.value)}
                  className="w-full rounded-lg border border-biru-300 p-2 text-biru-950 bg-putih focus:outline-none focus:ring-1 focus:ring-biru-500"
                >
                  <option value="">-- Pilih Asesor --</option>
                  {asesorList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nama_lengkap} ({a.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-biru-950 block mb-1">
                  Catatan / Instruksi dari Admin (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={catatanAdmin}
                  placeholder="Misal: Mohon prioritaskan verifikasi konversi silabus pemrograman..."
                  onChange={(e) => setCatatanAdmin(e.target.value)}
                  className="w-full rounded-lg border border-biru-300 p-2 text-biru-950 focus:outline-none focus:ring-1 focus:ring-biru-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-biru-100">
                <Button
                  variant="outline"
                  type="button"
                  disabled={assigning}
                  onClick={() => setAssignModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={assigning || !selectedAsesorId}
                >
                  <Send className="w-3.5 h-3.5 mr-1 inline" />
                  {assigning ? "Menugaskan..." : "Simpan Penugasan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
