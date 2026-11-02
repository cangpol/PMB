import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Upload,
  Search,
  FileSpreadsheet,
  X,
  RotateCw,
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

type BankSoal = components["schemas"]["BankSoal"];
type ImportResult = components["schemas"]["ImportSoalResultResponse"];

export const BankSoalPage: React.FC = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [soalList, setSoalList] = useState<BankSoal[]>([]);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedKategori, setSelectedKategori] = useState<string>("");
  const [selectedKesulitan, setSelectedKesulitan] = useState<string>("");

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Form Tambah Soal
  const [formKategori, setFormKategori] = useState<string>("TPA");
  const [formKesulitan, setFormKesulitan] = useState<string>("SEDANG");
  const [formPertanyaan, setFormPertanyaan] = useState<string>("");
  const [formOpsiA, setFormOpsiA] = useState<string>("");
  const [formOpsiB, setFormOpsiB] = useState<string>("");
  const [formOpsiC, setFormOpsiC] = useState<string>("");
  const [formOpsiD, setFormOpsiD] = useState<string>("");
  const [formOpsiE, setFormOpsiE] = useState<string>("");
  const [formKunci, setFormKunci] = useState<string>("A");
  const [formBobot, setFormBobot] = useState<number>(1.0);
  const [formPembahasan, setFormPembahasan] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Import File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // 1. Fetch Bank Soal
  const loadBankSoal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let queryParams = "";
      const params = new URLSearchParams();
      if (selectedKategori) params.append("kategori", selectedKategori);
      if (selectedKesulitan)
        params.append("tingkat_kesulitan", selectedKesulitan);
      if (params.toString()) queryParams = `?${params.toString()}`;

      const res = await fetchApi<
        { items?: BankSoal[]; total?: number } | BankSoal[]
      >(`/api/cbt/admin/bank-soal${queryParams}`);
      const items = Array.isArray(res) ? res : res.items || [];
      setSoalList(items);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr.pesan || "Gagal memuat daftar butir bank soal");
    } finally {
      setLoading(false);
    }
  }, [selectedKategori, selectedKesulitan]);

  useEffect(() => {
    loadBankSoal();
  }, [loadBankSoal]);

  // 2. Simpan Soal Baru
  const handleSaveSoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPertanyaan.trim() || !formOpsiA.trim() || !formOpsiB.trim()) {
      toast({
        title: "Validasi Gagal",
        description: "Pertanyaan, Opsi A, dan Opsi B wajib diisi.",
        type: "error",
      });
      return;
    }

    const opsiJawaban = [
      { id: "A", label: "A", teks: formOpsiA.trim() },
      { id: "B", label: "B", teks: formOpsiB.trim() },
    ];
    if (formOpsiC.trim())
      opsiJawaban.push({ id: "C", label: "C", teks: formOpsiC.trim() });
    if (formOpsiD.trim())
      opsiJawaban.push({ id: "D", label: "D", teks: formOpsiD.trim() });
    if (formOpsiE.trim())
      opsiJawaban.push({ id: "E", label: "E", teks: formOpsiE.trim() });

    try {
      setIsSubmitting(true);
      await fetchApi<BankSoal>("/api/cbt/admin/bank-soal", {
        method: "POST",
        body: JSON.stringify({
          kategori: formKategori,
          tingkat_kesulitan: formKesulitan,
          pertanyaan: formPertanyaan,
          opsi_jawaban: opsiJawaban,
          kunci_jawaban: formKunci,
          bobot: formBobot,
          pembahasan: formPembahasan.trim() || undefined,
        }),
      });

      toast({
        title: "Soal Tersimpan",
        description: "Butir soal baru berhasil ditambahkan ke bank soal.",
      });

      setShowAddModal(false);
      resetForm();
      loadBankSoal();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Gagal Menyimpan",
        description: apiErr.pesan || "Terjadi kesalahan saat menyimpan soal.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormPertanyaan("");
    setFormOpsiA("");
    setFormOpsiB("");
    setFormOpsiC("");
    setFormOpsiD("");
    setFormOpsiE("");
    setFormKunci("A");
    setFormBobot(1.0);
    setFormPembahasan("");
  };

  // 3. Impor Excel/CSV
  const handleUploadImport = async () => {
    if (!selectedFile) {
      toast({
        title: "Pilih Berkas",
        description: "Silakan pilih berkas Excel atau CSV terlebih dahulu.",
        type: "error",
      });
      return;
    }

    try {
      setIsImporting(true);
      setImportResult(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/cbt/admin/bank-soal/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw errJson;
      }

      const data: ImportResult = await res.json();
      setImportResult(data);

      toast({
        title: "Impor Selesai",
        description: `Berhasil mengimpor ${data.total_sukses} soal. Gagal: ${data.total_gagal}.`,
      });

      if (data.total_sukses > 0) {
        loadBankSoal();
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Impor Gagal",
        description: apiErr.pesan || "Terjadi kesalahan saat memproses berkas.",
        type: "error",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Filter teks di sisi klien (search bar)
  const filteredSoal = soalList.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.pertanyaan.toLowerCase().includes(q) ||
      s.kategori.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-biru-950">
            Bank Soal CBT
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola pustaka butir soal seleksi PMB berbasis komputer secara
            terstruktur.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setImportResult(null);
              setSelectedFile(null);
              setShowImportModal(true);
            }}
            className="flex items-center gap-2 border-biru-200 text-biru-800 hover:bg-biru-50"
          >
            <Upload className="w-4 h-4" />
            Impor Excel/CSV
          </Button>

          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-biru-600 hover:bg-biru-700 text-white"
          >
            <Plus className="w-4 h-4" />
            Tambah Soal
          </Button>
        </div>
      </div>

      {/* Filter & Pencarian */}
      <Card className="p-4 bg-white border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari teks pertanyaan atau materi..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-biru-600 focus:border-transparent"
            />
          </div>

          <div>
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-biru-600 focus:border-transparent bg-white"
            >
              <option value="">Semua Kategori Materi</option>
              <option value="TPA">Tes Potensi Akademik (TPA)</option>
              <option value="BAHASA_INGGRIS">Bahasa Inggris</option>
              <option value="MATEMATIKA">Matematika Dasar</option>
              <option value="LOGIKA">Penalaran & Logika</option>
            </select>
          </div>

          <div>
            <select
              value={selectedKesulitan}
              onChange={(e) => setSelectedKesulitan(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-biru-600 focus:border-transparent bg-white"
            >
              <option value="">Semua Tingkat Kesulitan</option>
              <option value="MUDAH">Mudah</option>
              <option value="SEDANG">Sedang</option>
              <option value="SULIT">Sulit</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Daftar Soal */}
      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState
          title="Gagal Memuat Soal"
          message={error}
          onRetry={loadBankSoal}
        />
      ) : filteredSoal.length === 0 ? (
        <EmptyState
          title="Belum Ada Butir Soal"
          description="Silakan buat soal baru secara manual atau impor dari berkas Excel/CSV."
        />
      ) : (
        <div className="space-y-4">
          {filteredSoal.map((soal, idx) => {
            const opsiArray = Array.isArray(soal.opsi_jawaban)
              ? (soal.opsi_jawaban as Array<{ label: string; teks: string }>)
              : [];

            return (
              <Card
                key={soal.id}
                className="p-5 bg-white border border-slate-200 hover:border-biru-300 transition-colors shadow-sm"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-biru-50 text-biru-700">
                      {soal.kategori}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        soal.tingkat_kesulitan === "SULIT"
                          ? "bg-rose-50 text-rose-700"
                          : soal.tingkat_kesulitan === "MUDAH"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {soal.tingkat_kesulitan}
                    </span>
                    <span className="text-xs text-slate-500">
                      Bobot: {soal.bobot}
                    </span>
                  </div>

                  <span className="text-xs font-semibold px-2 py-1 rounded bg-biru-100 text-biru-900">
                    Kunci: {soal.kunci_jawaban}
                  </span>
                </div>

                {/* Teks Pertanyaan */}
                <p className="text-slate-800 text-sm font-medium mb-4 whitespace-pre-wrap">
                  {soal.pertanyaan}
                </p>

                {/* Opsi Jawaban */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {opsiArray.map((opsi) => {
                    const isKunci = opsi.label === soal.kunci_jawaban;
                    return (
                      <div
                        key={opsi.label}
                        className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                          isKunci
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            isKunci
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {opsi.label}
                        </span>
                        <span className="mt-0.5">{opsi.teks}</span>
                      </div>
                    );
                  })}
                </div>

                {soal.pembahasan && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 italic">
                    <strong>Pembahasan:</strong> {soal.pembahasan}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: TAMBAH SOAL MANUAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <Card className="max-w-2xl w-full p-6 bg-white shadow-xl border border-slate-200 rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-lg font-serif font-bold text-biru-950">
                Tambah Butir Soal Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSoal} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Materi *
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600 bg-white"
                  >
                    <option value="TPA">TPA</option>
                    <option value="BAHASA_INGGRIS">Bahasa Inggris</option>
                    <option value="MATEMATIKA">Matematika Dasar</option>
                    <option value="LOGIKA">Penalaran Logika</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat Kesulitan
                  </label>
                  <select
                    value={formKesulitan}
                    onChange={(e) => setFormKesulitan(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600 bg-white"
                  >
                    <option value="MUDAH">Mudah</option>
                    <option value="SEDANG">Sedang</option>
                    <option value="SULIT">Sulit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bobot Soal (Poin)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formBobot}
                    onChange={(e) =>
                      setFormBobot(parseFloat(e.target.value) || 1.0)
                    }
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pertanyaan *
                </label>
                <textarea
                  rows={4}
                  value={formPertanyaan}
                  onChange={(e) => setFormPertanyaan(e.target.value)}
                  placeholder="Ketikkan isi teks pertanyaan di sini..."
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600"
                  required
                />
              </div>

              {/* Opsi Pilihan Jawaban */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Pilihan Jawaban
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center font-bold text-xs shrink-0">
                      A
                    </span>
                    <input
                      type="text"
                      value={formOpsiA}
                      onChange={(e) => setFormOpsiA(e.target.value)}
                      placeholder="Pilihan A (Wajib)"
                      className="flex-1 px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600 text-sm"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center font-bold text-xs shrink-0">
                      B
                    </span>
                    <input
                      type="text"
                      value={formOpsiB}
                      onChange={(e) => setFormOpsiB(e.target.value)}
                      placeholder="Pilihan B (Wajib)"
                      className="flex-1 px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600 text-sm"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center font-bold text-xs shrink-0">
                      C
                    </span>
                    <input
                      type="text"
                      value={formOpsiC}
                      onChange={(e) => setFormOpsiC(e.target.value)}
                      placeholder="Pilihan C (Opsional)"
                      className="flex-1 px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center font-bold text-xs shrink-0">
                      D
                    </span>
                    <input
                      type="text"
                      value={formOpsiD}
                      onChange={(e) => setFormOpsiD(e.target.value)}
                      placeholder="Pilihan D (Opsional)"
                      className="flex-1 px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center font-bold text-xs shrink-0">
                      E
                    </span>
                    <input
                      type="text"
                      value={formOpsiE}
                      onChange={(e) => setFormOpsiE(e.target.value)}
                      placeholder="Pilihan E (Opsional)"
                      className="flex-1 px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kunci Jawaban Benar *
                </label>
                <div className="flex items-center gap-4">
                  {["A", "B", "C", "D", "E"].map((k) => (
                    <label
                      key={k}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="kunci"
                        value={k}
                        checked={formKunci === k}
                        onChange={() => setFormKunci(k)}
                        className="text-biru-600 focus:ring-biru-500"
                      />
                      <span className="font-bold text-sm text-slate-800">
                        {k}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pembahasan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formPembahasan}
                  onChange={(e) => setFormPembahasan(e.target.value)}
                  placeholder="Catatan atau penjelasan jawaban benar..."
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-biru-600 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="bg-biru-600 hover:bg-biru-700 text-white"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan ke Bank Soal"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: IMPOR EXCEL / CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-xl w-full p-6 bg-white shadow-xl border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-biru-600" />
                <h3 className="text-lg font-serif font-bold text-biru-950">
                  Impor Bank Soal dari Excel / CSV
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Unggah berkas spreadsheet format <code>.xlsx</code> atau{" "}
              <code>.csv</code>. Kolom wajib:
              <strong>
                {" "}
                Kategori, Tingkat Kesulitan, Pertanyaan, Opsi A, Opsi B, Opsi C,
                Opsi D, Opsi E, Kunci Jawaban, Bobot
              </strong>
              .
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-biru-500 transition-colors mb-4 bg-slate-50">
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload-soal"
              />
              <label htmlFor="file-upload-soal" className="cursor-pointer">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <span className="text-sm font-semibold text-biru-600 hover:underline">
                  {selectedFile
                    ? selectedFile.name
                    : "Klik untuk pilih berkas spreadsheet"}
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Format didukung: XLSX, XLS, CSV (Maks 10 MB)
                </p>
              </label>
            </div>

            {/* Laporan Hasil Impor */}
            {importResult && (
              <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between font-semibold">
                  <span>Hasil Pemrosesan:</span>
                  <span className="text-biru-950">
                    Total {importResult.total_baris} Baris
                  </span>
                </div>
                <div className="flex gap-4">
                  <span className="text-emerald-600">
                    ✓ Berhasil: {importResult.total_sukses}
                  </span>
                  <span className="text-rose-600">
                    ✗ Gagal: {importResult.total_gagal}
                  </span>
                </div>

                {importResult.error_baris && importResult.error_baris.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="font-semibold text-rose-700 mb-1">
                      Rincian Baris Error:
                    </p>
                    <ul className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-rose-600">
                      {importResult.error_baris.map((err, i) => (
                        <li key={i}>
                          Baris {err.baris}: {err.pesan}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => setShowImportModal(false)}
                disabled={isImporting}
              >
                Tutup
              </Button>
              <Button
                variant="primary"
                onClick={handleUploadImport}
                disabled={!selectedFile || isImporting}
                className="bg-biru-600 hover:bg-biru-700 text-white flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" /> Mengimpor...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Proses Impor
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
