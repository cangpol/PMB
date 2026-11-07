import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Briefcase,
  FileText,
  BookOpen,
  CheckCircle2,
  Plus,
  Trash2,
  AlertCircle,
  Download,
  Save,
  Send,
  HelpCircle,
  Upload,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  Button,
  StatusBadge,
  EmptyState,
  ErrorState,
  CardSkeleton,
} from "../../components/common";
import { fetchApi } from "../../services/api";
import type { components } from "@/types/api";
import {
  atributAccept,
  periksaFormatBerkas,
  unggahKeStorage,
} from "@/lib/unggahBerkas";
import { PopupFormatSalah } from "@/components/berkas/PopupFormatSalah";

type RiwayatPendidikanItem = components["schemas"]["RiwayatPendidikanItem"];
type PengalamanKerjaItem = components["schemas"]["PengalamanKerjaItem"];
type BerkasRplItem = components["schemas"]["BerkasRplItem"];

/** Jenis dokumen portofolio RPL yang dapat diunggah. */
const JENIS_DOKUMEN_RPL = [
  { kode: "IJAZAH", label: "Ijazah" },
  { kode: "TRANSKRIP", label: "Transkrip nilai" },
  { kode: "SERTIFIKAT", label: "Sertifikat kompetensi / pelatihan" },
  { kode: "SURAT_KETERANGAN_KERJA", label: "Surat keterangan kerja" },
  { kode: "PORTOFOLIO", label: "Portofolio karya" },
  { kode: "LAINNYA", label: "Dokumen lainnya" },
] as const;

const MAKS_UKURAN_BERKAS = 5 * 1024 * 1024;
const TIPE_BERKAS = ["application/pdf", "image/jpeg", "image/png"];

const labelJenis = (kode: string) =>
  JENIS_DOKUMEN_RPL.find((j) => j.kode === kode)?.label ?? kode;

const ukuranFile = (b: number) =>
  b >= 1024 * 1024
    ? `${(b / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;

/** Pesan error dari fetchApi, termasuk rincian validasi server. */
const pesanError = (err: unknown, cadangan: string) => {
  const e = err as { pesan?: string; detail?: string[]; message?: string };
  if (e.detail && e.detail.length > 0) return e.detail.join("; ");
  return e.pesan || e.message || cadangan;
};

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

interface MataKuliahDiajukanDetail {
  id: string;
  mata_kuliah_id: string;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  semester: number;
  silabus_ringkas?: string | null;
  keterangan_pemohon?: string | null;
  status_kelayakan: string;
  nilai_transfer?: string | null;
  bobot_nilai?: number | null;
  catatan_asesor?: string | null;
}

interface PermohonanDetail {
  id: string;
  pendaftar_id: string;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  prodi_id: string;
  prodi_nama: string;
  jenjang: string;
  tipe_rpl: string;
  status: string;
  riwayat_pendidikan: RiwayatPendidikanItem[];
  pengalaman_kerja: PengalamanKerjaItem[];
  berkas_pendukung: BerkasRplItem[];
  mata_kuliah_list: MataKuliahDiajukanDetail[];
  total_sks_diajukan: number;
  total_sks_diakui: number;
  ipk_konversi: number;
  persentase_rekognisi: number;
  asesor_id?: string | null;
  asesor_nama?: string | null;
  catatan_asesor?: string | null;
  catatan_admin?: string | null;
  submitted_at?: string | null;
  assessed_at?: string | null;
}

export const FormulirRplPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [formatSalah, setFormatSalah] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [permohonan, setPermohonan] = useState<PermohonanDetail | null>(null);
  const [availableMataKuliah, setAvailableMataKuliah] = useState<MataKuliah[]>(
    [],
  );

  // Form States
  const [tipeRpl, setTipeRpl] = useState<string>("TIPE_A");
  const [riwayatPendidikan, setRiwayatPendidikan] = useState<
    RiwayatPendidikanItem[]
  >([]);
  const [pengalamanKerja, setPengalamanKerja] = useState<PengalamanKerjaItem[]>(
    [],
  );
  const [berkasPendukung, setBerkasPendukung] = useState<BerkasRplItem[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<
    Record<string, { sks: number; keterangan: string }>
  >({});

  // Server menolak perubahan saat permohonan sedang/sudah dinilai
  const isReadOnly =
    permohonan?.status === "SELESAI_DINILAI" ||
    permohonan?.status === "DALAM_PENILAIAN";
  const [jenisUnggah, setJenisUnggah] = useState<string>("IJAZAH");
  const [mengunggah, setMengunggah] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Ambil data permohonan RPL milik pendaftar login
      const res = await fetchApi<PermohonanDetail>("/api/rpl/my-permohonan");
      setPermohonan(res);
      setTipeRpl(res.tipe_rpl || "TIPE_A");
      setRiwayatPendidikan(res.riwayat_pendidikan || []);
      setPengalamanKerja(res.pengalaman_kerja || []);
      setBerkasPendukung(res.berkas_pendukung || []);

      // Mapping mata kuliah diajukan yang sudah tersimpan
      const courseMap: Record<string, { sks: number; keterangan: string }> = {};
      if (res.mata_kuliah_list && res.mata_kuliah_list.length > 0) {
        res.mata_kuliah_list.forEach((mk) => {
          courseMap[mk.mata_kuliah_id] = {
            sks: mk.sks,
            keterangan: mk.keterangan_pemohon || "",
          };
        });
      }
      setSelectedCourses(courseMap);

      // 2. Ambil kurikulum program studi target
      if (res.prodi_id) {
        const mkList = await fetchApi<MataKuliah[]>(
          `/api/rpl/mata-kuliah/${res.prodi_id}`,
        );
        setAvailableMataKuliah(mkList);
      }
    } catch (err: any) {
      setError(err?.pesan || "Gagal memuat formulir RPL calon mahasiswa.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Hitung total SKS yang sedang dipilih
  const totalSksDipilih = Object.values(selectedCourses).reduce(
    (acc, c) => acc + (c.sks || 0),
    0,
  );

  const handleToggleCourse = (mk: MataKuliah) => {
    if (isReadOnly) return;
    const copy = { ...selectedCourses };
    if (copy[mk.id]) {
      delete copy[mk.id];
    } else {
      copy[mk.id] = { sks: mk.sks, keterangan: "" };
    }
    setSelectedCourses(copy);
  };

  const handleKeteranganChange = (mkId: string, val: string) => {
    if (isReadOnly) return;
    setSelectedCourses((prev) => {
      if (!prev[mkId]) return prev;
      return {
        ...prev,
        [mkId]: { ...prev[mkId], keterangan: val },
      };
    });
  };

  // Handler Riwayat Pendidikan
  const handleAddPendidikan = () => {
    if (isReadOnly) return;
    setRiwayatPendidikan((prev) => [
      ...prev,
      {
        jenjang: "D3",
        nama_institusi: "",
        program_studi: "",
        tahun_lulus: new Date().getFullYear(),
        ipk_nilai: 3.0,
        nomor_ijazah: "",
      },
    ]);
  };

  const handleRemovePendidikan = (index: number) => {
    if (isReadOnly) return;
    setRiwayatPendidikan((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdatePendidikan = (
    index: number,
    field: keyof RiwayatPendidikanItem,
    val: any,
  ) => {
    if (isReadOnly) return;
    setRiwayatPendidikan((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Handler Pengalaman Kerja
  const handleAddKerja = () => {
    if (isReadOnly) return;
    setPengalamanKerja((prev) => [
      ...prev,
      {
        nama_perusahaan: "",
        jabatan: "",
        deskripsi_pekerjaan: "",
        tanggal_mulai: "",
        tanggal_selesai: null,
        masih_bekerja: true,
      },
    ]);
  };

  const handleRemoveKerja = (index: number) => {
    if (isReadOnly) return;
    setPengalamanKerja((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateKerja = (
    index: number,
    field: keyof PengalamanKerjaItem,
    val: any,
  ) => {
    if (isReadOnly) return;
    setPengalamanKerja((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Handler Berkas Pendukung: unggah file ke storage lewat URL presign
  const handleUnggahBerkas = async (file: File) => {
    if (isReadOnly) return;
    const cek = await periksaFormatBerkas(file, TIPE_BERKAS);
    if (!cek.ok) {
      setFormatSalah(cek.alasan);
      return;
    }
    const mime = cek.mime;
    if (file.size > MAKS_UKURAN_BERKAS) {
      setError("Ukuran file maksimal 5 MB.");
      return;
    }
    try {
      setMengunggah(true);
      setError(null);
      const p = await fetchApi<{ upload_url: string; file_key: string }>(
        "/api/rpl/berkas/presign",
        { method: "POST", body: JSON.stringify({ file_name: file.name }) },
      );
      await unggahKeStorage(p.upload_url, file, mime);
      setBerkasPendukung((prev) => [
        ...prev,
        {
          jenis_dokumen: jenisUnggah,
          nama_file: file.name,
          file_key: p.file_key,
          mime_type: mime,
          ukuran_bytes: file.size,
          keterangan: null,
        },
      ]);
      setSuccessMessage(
        `"${file.name}" terunggah. Simpan draf agar dokumen tercatat pada permohonan.`,
      );
    } catch (err: unknown) {
      setError(pesanError(err, "Gagal mengunggah dokumen."));
    } finally {
      setMengunggah(false);
    }
  };

  const handleRemoveBerkas = (index: number) => {
    if (isReadOnly) return;
    setBerkasPendukung((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePermohonan = async (isDraft: boolean) => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const mataKuliahList = Object.entries(selectedCourses).map(
        ([mkId, val]) => ({
          mata_kuliah_id: mkId,
          keterangan_pemohon:
            val.keterangan.trim().length >= 3
              ? val.keterangan.trim()
              : "Pengajuan pengakuan capaian pembelajaran mata kuliah.",
        }),
      );

      if (mataKuliahList.length === 0) {
        throw {
          pesan:
            "Pilihlah minimal 1 mata kuliah yang ingin diajukan rekognisi.",
        };
      }

      const payload = {
        tipe_rpl: tipeRpl,
        riwayat_pendidikan: riwayatPendidikan,
        pengalaman_kerja: pengalamanKerja,
        berkas_pendukung: berkasPendukung,
        mata_kuliah_list: mataKuliahList,
        is_draft: isDraft,
      };

      const res = await fetchApi<PermohonanDetail>("/api/rpl/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setPermohonan(res);
      setSuccessMessage(
        isDraft
          ? "Draf permohonan RPL berhasil disimpan. Anda dapat memperbaruinya sewaktu-waktu."
          : "Permohonan RPL berhasil diajukan! Berkas Anda sedang menunggu penugasan dan evaluasi asesor.",
      );
    } catch (err: any) {
      setError(
        pesanError(err, "Terjadi kesalahan saat menyimpan permohonan RPL."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <PopupFormatSalah
          alasan={formatSalah}
          onTutup={() => setFormatSalah(null)}
        />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error && !permohonan) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <ErrorState
          message={error}
          onRetry={loadData}
          retryLabel="Muat Ulang Formulir"
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PopupFormatSalah
        alasan={formatSalah}
        onTutup={() => setFormatSalah(null)}
      />
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-biru-50 text-biru-900 border border-biru-200">
              Jalur Rekognisi Pembelajaran Lampau (RPL)
            </span>
            <span className="text-xs text-biru-700">
              {permohonan?.prodi_nama} ({permohonan?.jenjang})
            </span>
          </div>
          <h1 className="text-2xl font-bold text-biru-950 font-serif">
            Formulir Pengajuan & Portofolio RPL
          </h1>
          <p className="text-sm text-biru-800">
            Unggah riwayat pendidikan, pengalaman profesional, portofolio karya,
            serta pilih mata kuliah kurikulum yang diajukan untuk rekognisi SKS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={permohonan?.status || "DRAFT"} />
        </div>
      </div>

      {/* Banner Notifikasi Status Selesai Dinilai */}
      {permohonan?.status === "SELESAI_DINILAI" && (
        <Card className="p-5 border-biru-600 bg-biru-50/70 shadow-soft-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-biru-950 font-semibold text-base">
                <CheckCircle2 className="w-5 h-5 text-biru-700" />
                <span>Hasil Penilaian & Konversi SKS RPL Telah Terbit</span>
              </div>
              <p className="text-sm text-biru-800">
                Tim asesor telah menyelesaikan penilaian konversi capaian
                pembelajaran Anda.
              </p>
              <div className="flex flex-wrap gap-4 pt-2 text-xs text-biru-900">
                <span className="bg-putih px-2.5 py-1 rounded border border-biru-200">
                  Total SKS Diakui:{" "}
                  <strong>{permohonan.total_sks_diakui} SKS</strong> (dari{" "}
                  {permohonan.total_sks_diajukan} SKS)
                </span>
                <span className="bg-putih px-2.5 py-1 rounded border border-biru-200">
                  IPK Konversi:{" "}
                  <strong>{permohonan.ipk_konversi.toFixed(2)}</strong>
                </span>
                <span className="bg-putih px-2.5 py-1 rounded border border-biru-200">
                  Efisiensi Rekognisi:{" "}
                  <strong>{permohonan.persentase_rekognisi.toFixed(1)}%</strong>
                </span>
                <span className="bg-putih px-2.5 py-1 rounded border border-biru-200">
                  Asesor:{" "}
                  <strong>{permohonan.asesor_nama || "Asesor PMB"}</strong>
                </span>
              </div>
            </div>

            <a
              href={`/api/rpl/admin/laporan/${permohonan.id}/export`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="primary">
                <Download className="w-4 h-4 mr-1.5 inline" />
                Unduh Berita Acara (CSV)
              </Button>
            </a>
          </div>
        </Card>
      )}

      {/* Banner Info Read-Only */}
      {isReadOnly && (
        <div className="p-3.5 bg-biru-50 border border-biru-200 rounded-lg flex items-center gap-3 text-xs text-biru-900">
          <AlertCircle className="w-4 h-4 text-biru-700 shrink-0" />
          <span>
            Formulir ini dalam mode baca (read-only) karena proses penilaian
            telah difinalisasi oleh asesor.
          </span>
        </div>
      )}

      {/* Error & Success Alerts */}
      {error && (
        <div className="p-4 bg-biru-50 border-2 border-biru-600 rounded-lg text-sm text-biru-950 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-biru-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Terjadi Kesalahan</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-biru-50 border border-biru-500 rounded-lg text-sm text-biru-950 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-biru-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Berhasil Disimpan</div>
            <div>{successMessage}</div>
          </div>
        </div>
      )}

      {/* SEKSI 1: TIPE PENGAJUAN RPL */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-biru-950 font-serif font-bold text-lg">
          <HelpCircle className="w-5 h-5 text-biru-700" />
          <h2>1. Tipe Rekognisi Pembelajaran Lampau</h2>
        </div>
        <p className="text-sm text-biru-800">
          Pilih kategori pengakuan yang paling sesuai dengan riwayat
          pembelajaran Anda:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              tipeRpl === "TIPE_A"
                ? "border-biru-600 bg-biru-50/60 shadow-soft-sm"
                : "border-biru-200 hover:border-biru-300 bg-putih"
            } ${isReadOnly ? "opacity-75 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="tipe_rpl"
                value="TIPE_A"
                checked={tipeRpl === "TIPE_A"}
                disabled={isReadOnly}
                onChange={(e) => setTipeRpl(e.target.value)}
                className="mt-1 text-biru-600 focus:ring-biru-500"
              />
              <div className="space-y-1">
                <span className="font-semibold text-biru-950 text-sm block">
                  Tipe A — Perolehan SKS (Pengalaman Kerja / Portofolio)
                </span>
                <span className="text-xs text-biru-800 block leading-relaxed">
                  Pengakuan kompetensi dari pendidikan non-formal, pelatihan
                  profesi, sertifikasi kompetensi, atau pengalaman kerja nyata
                  menjadi SKS mata kuliah.
                </span>
              </div>
            </div>
          </label>

          <label
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              tipeRpl === "TIPE_B"
                ? "border-biru-600 bg-biru-50/60 shadow-soft-sm"
                : "border-biru-200 hover:border-biru-300 bg-putih"
            } ${isReadOnly ? "opacity-75 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="tipe_rpl"
                value="TIPE_B"
                checked={tipeRpl === "TIPE_B"}
                disabled={isReadOnly}
                onChange={(e) => setTipeRpl(e.target.value)}
                className="mt-1 text-biru-600 focus:ring-biru-500"
              />
              <div className="space-y-1">
                <span className="font-semibold text-biru-950 text-sm block">
                  Tipe B — Alih Kredit (Transfer dari Perguruan Tinggi Lain)
                </span>
                <span className="text-xs text-biru-800 block leading-relaxed">
                  Pengakuan SKS yang telah ditempuh pada perguruan tinggi
                  sebelumnya (lulusan D3/D4 atau pindahan sarjana) berdasarkan
                  transkrip nilai resmi.
                </span>
              </div>
            </div>
          </label>
        </div>
      </Card>

      {/* SEKSI 2: RIWAYAT PENDIDIKAN FORMAL */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-biru-950 font-serif font-bold text-lg">
            <GraduationCap className="w-5 h-5 text-biru-700" />
            <h2>2. Riwayat Pendidikan Formal Sebelumnya</h2>
          </div>
          {!isReadOnly && (
            <Button variant="outline" size="sm" onClick={handleAddPendidikan}>
              <Plus className="w-3.5 h-3.5 mr-1 inline" />
              Tambah Pendidikan
            </Button>
          )}
        </div>

        {riwayatPendidikan.length === 0 ? (
          <EmptyState
            title="Belum ada riwayat pendidikan yang ditambahkan."
            description="Klik tombol 'Tambah Pendidikan' untuk melampirkan riwayat D3/D4/PT sebelumnya."
          />
        ) : (
          <div className="space-y-3">
            {riwayatPendidikan.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-biru-200 bg-putih space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-biru-50 text-biru-900 border border-biru-200">
                    Pendidikan #{idx + 1}
                  </span>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemovePendidikan(idx)}
                      className="text-biru-800 hover:text-biru-950 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <label className="text-xs font-medium text-biru-900 block mb-1">
                      Jenjang
                    </label>
                    <select
                      value={item.jenjang}
                      disabled={isReadOnly}
                      onChange={(e) =>
                        handleUpdatePendidikan(idx, "jenjang", e.target.value)
                      }
                      className="w-full text-xs rounded border border-biru-200 p-2 text-biru-950 bg-putih"
                    >
                      <option value="D3">Diploma 3 (D3)</option>
                      <option value="D4">Sarjana Terapan (D4)</option>
                      <option value="S1">Sarjana (S1 / Pindahan)</option>
                      <option value="SMA_SMK">SMA / SMK / Sederajat</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-biru-900 block mb-1">
                      Nama Perguruan Tinggi / Sekolah
                    </label>
                    <input
                      type="text"
                      value={item.nama_institusi}
                      disabled={isReadOnly}
                      placeholder="cth: Politeknik Negeri..."
                      onChange={(e) =>
                        handleUpdatePendidikan(
                          idx,
                          "nama_institusi",
                          e.target.value,
                        )
                      }
                      className="w-full text-xs rounded border border-biru-200 p-2 text-biru-950"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-biru-900 block mb-1">
                      Program Studi Asal
                    </label>
                    <input
                      type="text"
                      value={item.program_studi}
                      disabled={isReadOnly}
                      placeholder="cth: Manajemen Informatika"
                      onChange={(e) =>
                        handleUpdatePendidikan(
                          idx,
                          "program_studi",
                          e.target.value,
                        )
                      }
                      className="w-full text-xs rounded border border-biru-200 p-2 text-biru-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-biru-900 block mb-1">
                        Tahun Lulus
                      </label>
                      <input
                        type="number"
                        value={item.tahun_lulus}
                        disabled={isReadOnly}
                        onChange={(e) =>
                          handleUpdatePendidikan(
                            idx,
                            "tahun_lulus",
                            parseInt(e.target.value) || 2020,
                          )
                        }
                        className="w-full text-xs rounded border border-biru-200 p-2 text-biru-950"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-biru-900 block mb-1">
                        IPK Terakhir
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.ipk_nilai || ""}
                        disabled={isReadOnly}
                        placeholder="3.50"
                        onChange={(e) =>
                          handleUpdatePendidikan(
                            idx,
                            "ipk_nilai",
                            parseFloat(e.target.value) || null,
                          )
                        }
                        className="w-full text-xs rounded border border-biru-200 p-2 text-biru-950"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* SEKSI 3: PENGALAMAN KERJA & SERTIFIKASI PROFESI */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-biru-950 font-serif font-bold text-lg">
            <Briefcase className="w-5 h-5 text-biru-700" />
            <h2>3. Pengalaman Kerja & Sertifikasi Profesi</h2>
          </div>
          {!isReadOnly && (
            <Button variant="outline" size="sm" onClick={handleAddKerja}>
              <Plus className="w-3.5 h-3.5 mr-1 inline" />
              Tambah Pengalaman
            </Button>
          )}
        </div>

        {pengalamanKerja.length === 0 ? (
          <EmptyState
            title="Belum ada riwayat pengalaman kerja yang dicantumkan."
            description="Sangat dianjurkan untuk Tipe A agar asesor dapat menilai kesesuaian capaian pembelajaran."
          />
        ) : (
          <div className="space-y-3">
            {pengalamanKerja.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-biru-200 bg-putih space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-biru-50 text-biru-900 border border-biru-200">
                    Pekerjaan #{idx + 1}
                  </span>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKerja(idx)}
                      className="text-biru-800 hover:text-biru-950 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <label className="text-xs font-medium text-biru-900 block mb-1">
                      Nama Perusahaan / Organisasi
                    </label>
                    <input
                      type="text"
                      value={item.nama_perusahaan}
                      disabled={isReadOnly}
                      placeholder="cth: PT Solusi Teknologi"
                      onChange={(e) =>
                        handleUpdateKerja(
                          idx,
                          "nama_perusahaan",
                          e.target.value,
                        )
                      }
                      className="w-full text-xs rounded border border-biru-200 p-2 text-biru-950"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-biru-900 block mb-1">
                      Posisi / Jabatan
                    </label>
                    <input
                      type="text"
                      value={item.jabatan}
                      disabled={isReadOnly}
                      placeholder="cth: Fullstack Developer"
                      onChange={(e) =>
                        handleUpdateKerja(idx, "jabatan", e.target.value)
                      }
                      className="w-full text-xs rounded border border-biru-200 p-2 text-biru-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-biru-900 block mb-1">
                        Mulai
                      </label>
                      <input
                        type="date"
                        value={item.tanggal_mulai}
                        disabled={isReadOnly}
                        onChange={(e) =>
                          handleUpdateKerja(
                            idx,
                            "tanggal_mulai",
                            e.target.value,
                          )
                        }
                        className="w-full text-xs rounded border border-biru-200 p-2 text-biru-950"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-biru-900 block mb-1">
                        Selesai
                      </label>
                      <input
                        type="date"
                        value={item.tanggal_selesai ?? ""}
                        disabled={isReadOnly || item.masih_bekerja}
                        onChange={(e) =>
                          handleUpdateKerja(
                            idx,
                            "tanggal_selesai",
                            e.target.value || null,
                          )
                        }
                        className="w-full text-xs rounded border border-biru-200 p-2 text-biru-950 disabled:bg-biru-50"
                      />
                    </div>
                    <label className="col-span-2 flex items-center gap-2 text-xs text-biru-900">
                      <input
                        type="checkbox"
                        checked={item.masih_bekerja}
                        disabled={isReadOnly}
                        onChange={(e) => {
                          handleUpdateKerja(
                            idx,
                            "masih_bekerja",
                            e.target.checked,
                          );
                          if (e.target.checked)
                            handleUpdateKerja(idx, "tanggal_selesai", null);
                        }}
                        className="accent-biru-700"
                      />
                      Masih bekerja di sini
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-biru-900 block mb-1">
                    Uraian Tugas & Capaian Kerja
                  </label>
                  <textarea
                    rows={2}
                    value={item.deskripsi_pekerjaan}
                    disabled={isReadOnly}
                    placeholder="Jelaskan ruang lingkup teknologi, peran, dan hasil kerja..."
                    onChange={(e) =>
                      handleUpdateKerja(
                        idx,
                        "deskripsi_pekerjaan",
                        e.target.value,
                      )
                    }
                    className="w-full text-xs rounded border border-biru-200 p-2 text-biru-950"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* SEKSI 4: BERKAS DOKUMEN & PORTOFOLIO */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-biru-950 font-serif font-bold text-lg">
          <FileText className="w-5 h-5 text-biru-700" />
          <h2>4. Dokumen Pendukung & Portofolio</h2>
        </div>
        <p className="text-xs text-biru-800">
          Unggah ijazah, transkrip, sertifikat, surat keterangan kerja, atau
          contoh karya. Format PDF, JPG, atau PNG, maksimal 5 MB per file.
        </p>

        {!isReadOnly && (
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 p-3.5 rounded-lg border border-dashed border-biru-300 bg-biru-50/40">
            <label className="flex-1 text-xs text-biru-900 space-y-1">
              <span className="font-medium block">Jenis dokumen</span>
              <select
                value={jenisUnggah}
                onChange={(e) => setJenisUnggah(e.target.value)}
                className="w-full rounded border border-biru-200 p-2 text-biru-950 bg-putih"
              >
                {JENIS_DOKUMEN_RPL.map((j) => (
                  <option key={j.kode} value={j.kode}>
                    {j.label}
                  </option>
                ))}
              </select>
            </label>
            <label
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                mengunggah
                  ? "bg-biru-200 text-biru-700 cursor-wait"
                  : "bg-biru-950 text-putih hover:bg-biru-800 cursor-pointer"
              }`}
            >
              <Upload className="w-4 h-4" aria-hidden />
              {mengunggah ? "Mengunggah..." : "Pilih & Unggah File"}
              <input
                type="file"
                accept={atributAccept(TIPE_BERKAS)}
                className="sr-only"
                disabled={mengunggah}
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  e.currentTarget.value = "";
                  if (f) handleUnggahBerkas(f);
                }}
              />
            </label>
          </div>
        )}

        {berkasPendukung.length === 0 ? (
          <EmptyState
            title="Belum ada dokumen yang diunggah."
            description="Minimal satu dokumen pendukung wajib diunggah sebelum permohonan diajukan."
          />
        ) : (
          <ul className="space-y-2">
            {berkasPendukung.map((b, idx) => (
              <li
                key={b.file_key || idx}
                className="p-3 rounded-lg border border-biru-200 bg-putih flex items-center gap-3 text-xs"
              >
                <FileText
                  className="w-4 h-4 text-biru-700 shrink-0"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-biru-950 truncate">
                    {b.nama_file}
                  </p>
                  <p className="text-biru-800">
                    {labelJenis(b.jenis_dokumen)}
                    {(b.ukuran_bytes ?? 0) > 0 && (
                      <> · {ukuranFile(b.ukuran_bytes ?? 0)}</>
                    )}
                  </p>
                </div>
                {b.url_unduh && (
                  <a
                    href={b.url_unduh}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-biru-800 hover:text-biru-950 shrink-0"
                  >
                    Lihat <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                  </a>
                )}
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveBerkas(idx)}
                    aria-label={`Hapus ${b.nama_file}`}
                    className="text-biru-800 hover:text-biru-950 shrink-0 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* SEKSI 5: PEMILIHAN MATA KULIAH KURIKULUM TARGET */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-biru-100 pb-3">
          <div className="flex items-center gap-2 text-biru-950 font-serif font-bold text-lg">
            <BookOpen className="w-5 h-5 text-biru-700" />
            <h2>5. Pemilihan Mata Kuliah yang Diajukan untuk Rekognisi</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-biru-800">Total Diajukan:</span>
            <span className="text-sm font-bold px-3 py-1 rounded-full bg-biru-50 text-biru-950 border border-biru-400">
              {totalSksDipilih} SKS
            </span>
          </div>
        </div>

        <p className="text-sm text-biru-800">
          Centang mata kuliah kurikulum program studi{" "}
          <strong>{permohonan?.prodi_nama}</strong> yang telah Anda kuasai
          materinya, lalu berikan penjelasan portofolio atau pengalaman
          pendukung:
        </p>

        {availableMataKuliah.length === 0 ? (
          <EmptyState
            title="Belum ada kurikulum mata kuliah RPL untuk prodi ini."
            description="Hubungi administrator PMB untuk mengonfigurasi daftar mata kuliah."
          />
        ) : (
          <div className="space-y-3">
            {availableMataKuliah.map((mk) => {
              const isSelected = !!selectedCourses[mk.id];
              return (
                <div
                  key={mk.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "border-biru-500 bg-biru-50/50 shadow-soft-sm"
                      : "border-biru-200 bg-putih hover:border-biru-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`mk-${mk.id}`}
                      checked={isSelected}
                      disabled={isReadOnly}
                      onChange={() => handleToggleCourse(mk)}
                      className="mt-1 rounded text-biru-600 focus:ring-biru-500"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <label
                            htmlFor={`mk-${mk.id}`}
                            className="font-semibold text-biru-950 text-sm cursor-pointer hover:underline"
                          >
                            {mk.kode_mk} — {mk.nama_mk}
                          </label>
                          <div className="text-xs text-biru-700 mt-0.5">
                            Semester {mk.semester} • Bobot:{" "}
                            <strong>{mk.sks} SKS</strong>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-biru-50 text-biru-900 border border-biru-300">
                            Terpilih ({mk.sks} SKS)
                          </span>
                        )}
                      </div>

                      {mk.silabus_ringkas && (
                        <p className="text-xs text-biru-800 bg-putih/80 p-2 rounded border border-biru-100">
                          <strong>Silabus Ringkas:</strong> {mk.silabus_ringkas}
                        </p>
                      )}

                      {/* Input Keterangan Pemohon saat dipilih */}
                      {isSelected && (
                        <div className="pt-2">
                          <label className="text-xs font-medium text-biru-950 block mb-1">
                            Keterangan / Alasan Pengajuan (Portofolio,
                            Sertifikasi, atau Pengalaman Relevan):
                          </label>
                          <textarea
                            rows={2}
                            value={selectedCourses[mk.id]?.keterangan || ""}
                            disabled={isReadOnly}
                            placeholder="Jelaskan bukti relevan yang mendasari permohonan mata kuliah ini..."
                            onChange={(e) =>
                              handleKeteranganChange(mk.id, e.target.value)
                            }
                            className="w-full text-xs rounded border border-biru-300 p-2 text-biru-950 bg-putih"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* FOOTER ACTIONS */}
      {!isReadOnly && (
        <div className="p-4 bg-putih rounded-xl border border-biru-200 shadow-soft-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-biru-800">
            Pastikan berkas dan mata kuliah yang Anda ajukan telah lengkap
            sebelum mengirim.
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => handleSavePermohonan(true)}
            >
              <Save className="w-4 h-4 mr-1.5 inline" />
              Simpan sebagai Draf
            </Button>
            <Button
              variant="primary"
              disabled={saving || totalSksDipilih === 0}
              onClick={() => handleSavePermohonan(false)}
            >
              <Send className="w-4 h-4 mr-1.5 inline" />
              Ajukan Permohonan RPL ({totalSksDipilih} SKS)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
