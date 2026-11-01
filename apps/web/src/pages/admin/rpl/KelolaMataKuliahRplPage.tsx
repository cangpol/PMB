import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ArrowLeft,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Search,
} from "lucide-react";
import {
  Card,
  Button,
  StatusBadge,
  EmptyState,
  TableSkeleton,
} from "../../../components/common";
import { fetchApi } from "../../../services/api";

interface MataKuliah {
  id: string;
  prodi_id: string;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  semester: number;
  silabus_ringkas?: string | null;
  is_active: boolean;
}

interface ProdiOption {
  id: string;
  nama: string;
  jenjang: string;
}

export const KelolaMataKuliahRplPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [courses, setCourses] = useState<MataKuliah[]>([]);
  const [prodis, setProdis] = useState<ProdiOption[]>([]);
  const [selectedProdi, setSelectedProdi] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Form Fields
  const [formProdiId, setFormProdiId] = useState<string>("");
  const [formKodeMk, setFormKodeMk] = useState<string>("");
  const [formNamaMk, setFormNamaMk] = useState<string>("");
  const [formSks, setFormSks] = useState<number>(3);
  const [formSemester, setFormSemester] = useState<number>(1);
  const [formSilabus, setFormSilabus] = useState<string>("");
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Prodis
      const prodiData = await fetchApi<any[]>("/api/master/prodi");
      const mappedProdis: ProdiOption[] = prodiData.map((p) => ({
        id: p.id,
        nama: p.nama_prodi || p.nama,
        jenjang: p.jenjang,
      }));
      setProdis(mappedProdis);

      // 2. Fetch all courses
      const courseData = await fetchApi<MataKuliah[]>(
        "/api/rpl/admin/mata-kuliah",
      );
      setCourses(courseData);
    } catch (err: any) {
      setError(err?.pesan || "Gagal memuat kurikulum mata kuliah RPL.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormProdiId(selectedProdi || prodis[0]?.id || "");
    setFormKodeMk("");
    setFormNamaMk("");
    setFormSks(3);
    setFormSemester(1);
    setFormSilabus("");
    setFormIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (mk: MataKuliah) => {
    setEditingId(mk.id);
    setFormProdiId(mk.prodi_id);
    setFormKodeMk(mk.kode_mk);
    setFormNamaMk(mk.nama_mk);
    setFormSks(mk.sks);
    setFormSemester(mk.semester);
    setFormSilabus(mk.silabus_ringkas || "");
    setFormIsActive(mk.is_active);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      if (editingId) {
        // Update existing course
        const payload = {
          nama_mk: formNamaMk,
          sks: formSks,
          semester: formSemester,
          silabus_ringkas: formSilabus || null,
          is_active: formIsActive,
        };

        await fetchApi(`/api/rpl/admin/mata-kuliah/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setSuccessMessage("Mata kuliah berhasil diperbarui.");
      } else {
        // Create new course
        const payload = {
          prodi_id: formProdiId,
          kode_mk: formKodeMk,
          nama_mk: formNamaMk,
          sks: formSks,
          semester: formSemester,
          silabus_ringkas: formSilabus || null,
        };

        await fetchApi("/api/rpl/admin/mata-kuliah", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccessMessage(
          "Mata kuliah baru berhasil ditambahkan ke kurikulum.",
        );
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err?.pesan || "Gagal menyimpan mata kuliah.");
    } finally {
      setSaving(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    const matchesProdi = !selectedProdi || c.prodi_id === selectedProdi;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      c.kode_mk.toLowerCase().includes(q) ||
      c.nama_mk.toLowerCase().includes(q);
    return matchesProdi && matchesQuery;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <Link
            to="/admin/rpl"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-biru-800 hover:text-biru-950 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Rekapitulasi RPL</span>
          </Link>
          <h1 className="text-2xl font-bold text-biru-950 font-serif">
            Master Kurikulum Mata Kuliah Jalur RPL
          </h1>
          <p className="text-sm text-biru-800">
            Daftar mata kuliah kurikulum program studi yang dibuka untuk
            pengajuan rekognisi dan konversi SKS.
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-1.5 inline" />
          Tambah Mata Kuliah
        </Button>
      </div>

      {/* Success & Error Alert */}
      {successMessage && (
        <div className="p-4 bg-biru-50 border border-biru-500 rounded-lg text-sm text-biru-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-biru-700" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-biru-700 hover:text-biru-950"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
              placeholder="Cari kode atau nama mata kuliah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-biru-200 text-biru-950 focus:outline-none focus:ring-1 focus:ring-biru-500"
            />
          </div>

          <div className="w-full md:w-auto">
            <select
              value={selectedProdi}
              onChange={(e) => setSelectedProdi(e.target.value)}
              className="text-xs rounded-lg border border-biru-200 py-2 px-3 text-biru-950 bg-putih focus:outline-none focus:ring-1 focus:ring-biru-500 w-full md:w-auto"
            >
              <option value="">Semua Program Studi</option>
              {prodis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({p.jenjang})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Tabel Mata Kuliah */}
      <Card className="overflow-hidden border border-biru-200 shadow-soft-sm">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={7} />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada mata kuliah kurikulum yang sesuai."
              description="Gunakan tombol 'Tambah Mata Kuliah' untuk menambahkan mata kuliah baru."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-biru-950">
              <thead className="bg-biru-50 border-b border-biru-200 text-[11px] uppercase font-semibold text-biru-900">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Kode MK</th>
                  <th className="py-3 px-4">Nama Mata Kuliah</th>
                  <th className="py-3 px-4 text-center">SKS</th>
                  <th className="py-3 px-4 text-center">Semester</th>
                  <th className="py-3 px-4">Silabus Ringkas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-biru-100">
                {filteredCourses.map((mk, idx) => (
                  <tr
                    key={mk.id}
                    className="hover:bg-biru-50/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-biru-700">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-biru-950">
                      {mk.kode_mk}
                    </td>
                    <td className="py-3 px-4 font-medium">{mk.nama_mk}</td>
                    <td className="py-3 px-4 text-center font-bold">
                      {mk.sks} SKS
                    </td>
                    <td className="py-3 px-4 text-center">
                      Semester {mk.semester}
                    </td>
                    <td className="py-3 px-4 text-biru-800 max-w-xs truncate">
                      {mk.silabus_ringkas || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={mk.is_active ? "Aktif" : "Non-Aktif"}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(mk)}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1 inline" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL TAMBAH / EDIT MATA KULIAH */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-biru-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-putih rounded-xl border border-biru-200 shadow-soft-lg w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-biru-100 pb-3">
              <div className="flex items-center gap-2 font-serif font-bold text-base text-biru-950">
                <BookOpen className="w-5 h-5 text-biru-700" />
                <h3>
                  {editingId
                    ? "Edit Mata Kuliah RPL"
                    : "Tambah Mata Kuliah RPL"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-biru-700 hover:text-biru-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {!editingId && (
                <div>
                  <label className="font-semibold text-biru-950 block mb-1">
                    Program Studi Target
                  </label>
                  <select
                    required
                    value={formProdiId}
                    onChange={(e) => setFormProdiId(e.target.value)}
                    className="w-full rounded-lg border border-biru-300 p-2 text-biru-950 bg-putih focus:outline-none focus:ring-1 focus:ring-biru-500"
                  >
                    {prodis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.jenjang})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-biru-950 block mb-1">
                    Kode Mata Kuliah
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingId}
                    value={formKodeMk}
                    placeholder="cth: IF101"
                    onChange={(e) => setFormKodeMk(e.target.value)}
                    className={`w-full rounded-lg border border-biru-300 p-2 text-biru-950 focus:outline-none focus:ring-1 focus:ring-biru-500 font-mono ${
                      editingId ? "bg-biru-50/50" : ""
                    }`}
                  />
                </div>

                <div>
                  <label className="font-semibold text-biru-950 block mb-1">
                    Bobot SKS
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={6}
                    value={formSks}
                    onChange={(e) => setFormSks(parseInt(e.target.value) || 3)}
                    className="w-full rounded-lg border border-biru-300 p-2 text-biru-950 focus:outline-none focus:ring-1 focus:ring-biru-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-biru-950 block mb-1">
                    Nama Mata Kuliah
                  </label>
                  <input
                    type="text"
                    required
                    value={formNamaMk}
                    placeholder="cth: Pemrograman Web & Aplikasi"
                    onChange={(e) => setFormNamaMk(e.target.value)}
                    className="w-full rounded-lg border border-biru-300 p-2 text-biru-950 focus:outline-none focus:ring-1 focus:ring-biru-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-biru-950 block mb-1">
                    Semester
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={8}
                    value={formSemester}
                    onChange={(e) =>
                      setFormSemester(parseInt(e.target.value) || 1)
                    }
                    className="w-full rounded-lg border border-biru-300 p-2 text-biru-950 focus:outline-none focus:ring-1 focus:ring-biru-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-biru-950 block mb-1">
                  Silabus Ringkas / CPMK
                </label>
                <textarea
                  rows={3}
                  value={formSilabus}
                  placeholder="Ringkasan pokok bahasan dan capaian pembelajaran mata kuliah..."
                  onChange={(e) => setFormSilabus(e.target.value)}
                  className="w-full rounded-lg border border-biru-300 p-2 text-biru-950 focus:outline-none focus:ring-1 focus:ring-biru-500"
                />
              </div>

              {editingId && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-biru-600 focus:ring-biru-500"
                  />
                  <label
                    htmlFor="is_active"
                    className="font-medium text-biru-950 cursor-pointer"
                  >
                    Mata kuliah aktif untuk diajukan rekognisi
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-biru-100">
                <Button
                  variant="outline"
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                >
                  Batal
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  <Save className="w-3.5 h-3.5 mr-1 inline" />
                  {saving ? "Menyimpan..." : "Simpan Mata Kuliah"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
