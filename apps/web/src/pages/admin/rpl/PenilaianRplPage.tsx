import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  GraduationCap,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  ShieldCheck,
  Send,
  X,
} from "lucide-react";
import {
  Card,
  Button,
  StatusBadge,
  ErrorState,
  CardSkeleton,
} from "../../../components/common";
import { fetchApi } from "../../../services/api";
import type { components } from "@/types/api";

type RiwayatPendidikanItem = components["schemas"]["RiwayatPendidikanItem"];
type PengalamanKerjaItem = components["schemas"]["PengalamanKerjaItem"];
type BerkasRplItem = components["schemas"]["BerkasRplItem"];

const periodeKerja = (k: PengalamanKerjaItem) =>
  `${k.tanggal_mulai || "?"} s.d. ${k.masih_bekerja ? "sekarang" : k.tanggal_selesai || "?"}`;

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

interface PenilaianItemState {
  mata_kuliah_id: string;
  status_kelayakan: string;
  nilai_transfer: string;
  catatan_asesor: string;
  sks: number;
}

const BOBOT_MAP: Record<string, number> = {
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
};

export const PenilaianRplPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [permohonan, setPermohonan] = useState<PermohonanDetail | null>(null);
  const [evaluasiMap, setEvaluasiMap] = useState<
    Record<string, PenilaianItemState>
  >({});
  const [catatanAsesorUmum, setCatatanAsesorUmum] = useState<string>("");
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] =
    useState<boolean>(false);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const res = await fetchApi<PermohonanDetail>(
        `/api/rpl/admin/permohonan/${id}`,
      );
      setPermohonan(res);
      setCatatanAsesorUmum(res.catatan_asesor || "");

      const initMap: Record<string, PenilaianItemState> = {};
      res.mata_kuliah_list.forEach((mk) => {
        initMap[mk.mata_kuliah_id] = {
          mata_kuliah_id: mk.mata_kuliah_id,
          status_kelayakan: mk.status_kelayakan || "MENUNGGU",
          nilai_transfer: mk.nilai_transfer || "A",
          catatan_asesor: mk.catatan_asesor || "",
          sks: mk.sks,
        };
      });
      setEvaluasiMap(initMap);
    } catch (err: any) {
      setError(err?.pesan || "Gagal memuat lembar penilaian permohonan RPL.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleUpdateEvaluasi = (
    mkId: string,
    field: keyof PenilaianItemState,
    value: string,
  ) => {
    setEvaluasiMap((prev) => ({
      ...prev,
      [mkId]: {
        ...prev[mkId],
        [field]: value,
      },
    }));
  };

  // Kalkulasi Live Metrik Konversi SKS & IPK
  const totalSksDiajukan = permohonan?.total_sks_diajukan || 0;

  let totalSksDiakui = 0;
  let totalMutu = 0;

  Object.values(evaluasiMap).forEach((item) => {
    if (item.status_kelayakan === "DIAKUI") {
      totalSksDiakui += item.sks;
      const bobot = BOBOT_MAP[item.nilai_transfer] || 0.0;
      totalMutu += bobot * item.sks;
    }
  });

  const ipkKonversi =
    totalSksDiakui > 0
      ? Math.round((totalMutu / totalSksDiakui) * 100) / 100
      : 0.0;

  const persentaseRekognisi =
    totalSksDiajukan > 0
      ? Math.round((totalSksDiakui / totalSksDiajukan) * 100 * 100) / 100
      : 0.0;

  const unassessedCount = Object.values(evaluasiMap).filter(
    (it) => it.status_kelayakan === "MENUNGGU",
  ).length;

  const handleSubmitPenilaian = async (isFinal: boolean) => {
    if (!id) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const items = Object.values(evaluasiMap).map((it) => ({
        mata_kuliah_id: it.mata_kuliah_id,
        status_kelayakan: it.status_kelayakan,
        nilai_transfer:
          it.status_kelayakan === "DIAKUI" ? it.nilai_transfer : null,
        catatan_asesor: it.catatan_asesor || null,
      }));

      const payload = {
        items,
        catatan_asesor: catatanAsesorUmum || null,
        finalisasi: isFinal,
      };

      const res = await fetchApi<PermohonanDetail>(
        `/api/rpl/asesor/penilaian/${id}`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      setPermohonan(res);
      setConfirmFinalizeOpen(false);
      setSuccessMessage(
        isFinal
          ? "Penilaian RPL telah difinalisasi! Berita Acara Rekognisi SKS resmi diterbitkan."
          : "Draf penilaian per mata kuliah berhasil disimpan.",
      );
    } catch (err: any) {
      setError(err?.pesan || "Terjadi kesalahan saat menyimpan penilaian RPL.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error && !permohonan) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <ErrorState
          message={error}
          onRetry={loadData}
          retryLabel="Muat Ulang Halaman"
        />
      </div>
    );
  }

  const isFinalized = permohonan?.status === "SELESAI_DINILAI";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Tombol Kembali & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/rpl"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-biru-800 hover:text-biru-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Permohonan RPL</span>
        </Link>

        <div className="flex items-center gap-2">
          <StatusBadge status={permohonan?.status || "DRAFT"} />
        </div>
      </div>

      {/* Profil Calon Mahasiswa & Status Pengajuan */}
      <Card className="p-6 bg-biru-50/50 border-biru-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-biru-200 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-biru-50 text-biru-950 border border-biru-300">
                {permohonan?.tipe_rpl === "TIPE_A"
                  ? "Tipe A (Pengalaman Kerja)"
                  : "Tipe B (Transfer Kredit)"}
              </span>
              <span className="text-xs text-biru-800 font-mono">
                {permohonan?.nomor_pendaftaran}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-biru-950 font-serif">
              {permohonan?.nama_lengkap}
            </h1>
            <p className="text-sm text-biru-800">
              Program Studi: <strong>{permohonan?.prodi_nama}</strong> (
              {permohonan?.jenjang})
            </p>
          </div>

          {isFinalized && (
            <a
              href={`/api/rpl/admin/laporan/${permohonan?.id}/export`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="primary">
                <Download className="w-4 h-4 mr-1.5 inline" />
                Unduh Berita Acara (CSV)
              </Button>
            </a>
          )}
        </div>

        {/* Notifikasi / Instruksi Asesor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs text-biru-900">
          <div>
            <span className="text-biru-700 block">Asesor yang Ditugaskan:</span>
            <strong className="text-biru-950 font-medium text-sm">
              {permohonan?.asesor_nama || "Belum Ditugaskan"}
            </strong>
          </div>
          <div>
            <span className="text-biru-700 block">
              Catatan Administrator PMB:
            </span>
            <span className="text-biru-900 italic">
              {permohonan?.catatan_admin || "-"}
            </span>
          </div>
          <div>
            <span className="text-biru-700 block">Waktu Pengajuan:</span>
            <span>
              {permohonan?.submitted_at
                ? new Date(permohonan.submitted_at).toLocaleString("id-ID")
                : "-"}
            </span>
          </div>
        </div>
      </Card>

      {/* Error & Success Messages */}
      {error && (
        <div className="p-4 bg-biru-50 border-2 border-biru-600 rounded-lg text-sm text-biru-950 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-biru-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold">Kesalahan</div>
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

      {/* TABEL LIVE METRIK KONVERSI SKS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-putih border border-biru-200">
          <div className="text-xs text-biru-800">Total SKS Diajukan</div>
          <div className="text-2xl font-bold text-biru-950 mt-1">
            {totalSksDiajukan} SKS
          </div>
        </Card>

        <Card className="p-4 bg-biru-50/70 border border-biru-400 shadow-soft-sm">
          <div className="text-xs text-biru-900 font-semibold">
            Total SKS Diakui
          </div>
          <div className="text-2xl font-bold text-biru-950 mt-1">
            {totalSksDiakui} SKS
          </div>
        </Card>

        <Card className="p-4 bg-biru-50/70 border border-biru-400 shadow-soft-sm">
          <div className="text-xs text-biru-900 font-semibold">
            IPK Konversi
          </div>
          <div className="text-2xl font-bold text-biru-950 mt-1">
            {ipkKonversi.toFixed(2)}
          </div>
        </Card>

        <Card className="p-4 bg-putih border border-biru-200">
          <div className="text-xs text-biru-800">Persentase Rekognisi</div>
          <div className="text-2xl font-bold text-biru-950 mt-1">
            {persentaseRekognisi.toFixed(1)}%
          </div>
        </Card>
      </div>

      {/* SEKSI DOKUMEN BUKTI & PORTOFOLIO PENDAFTAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Riwayat Pendidikan & Pengalaman */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 font-serif font-bold text-sm text-biru-950 border-b border-biru-100 pb-2">
            <GraduationCap className="w-4 h-4 text-biru-700" />
            <h3>Riwayat Pendidikan & Pengalaman Calon</h3>
          </div>

          <div className="space-y-3 text-xs max-h-60 overflow-y-auto pr-1">
            {permohonan?.riwayat_pendidikan &&
            permohonan.riwayat_pendidikan.length > 0 ? (
              permohonan.riwayat_pendidikan.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded bg-biru-50/40 border border-biru-200"
                >
                  <div className="font-semibold text-biru-950">
                    {edu.jenjang} — {edu.nama_institusi}
                  </div>
                  <div className="text-biru-800">
                    Prodi: {edu.program_studi} • Lulus: {edu.tahun_lulus} • IPK:{" "}
                    {edu.ipk_nilai || "-"}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-biru-700 italic">
                Tidak ada data riwayat pendidikan.
              </div>
            )}

            {permohonan?.pengalaman_kerja &&
            permohonan.pengalaman_kerja.length > 0 ? (
              permohonan.pengalaman_kerja.map((krj, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded bg-biru-50/40 border border-biru-200"
                >
                  <div className="font-semibold text-biru-950">
                    {krj.jabatan} di {krj.nama_perusahaan}
                  </div>
                  <div className="text-biru-700 text-[11px]">
                    {periodeKerja(krj)}
                  </div>
                  <div className="text-biru-800">{krj.deskripsi_pekerjaan}</div>
                </div>
              ))
            ) : (
              <div className="text-biru-700 italic">
                Tidak ada data pengalaman kerja.
              </div>
            )}
          </div>
        </Card>

        {/* Tautan Berkas Portofolio */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 font-serif font-bold text-sm text-biru-950 border-b border-biru-100 pb-2">
            <FileText className="w-4 h-4 text-biru-700" />
            <h3>Dokumen & Portofolio Pendukung</h3>
          </div>

          <div className="space-y-2 text-xs max-h-60 overflow-y-auto pr-1">
            {permohonan?.berkas_pendukung &&
            permohonan.berkas_pendukung.length > 0 ? (
              permohonan.berkas_pendukung.map((b, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded bg-putih border border-biru-200 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-biru-950">
                      {b.nama_file}
                    </div>
                    <div className="text-biru-700 text-[11px]">
                      {b.jenis_dokumen}
                    </div>
                  </div>
                  {b.url_unduh ? (
                    <a
                      href={b.url_unduh}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-biru-700 hover:text-biru-950"
                      title="Buka dokumen"
                      aria-label={`Buka ${b.nama_file}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-biru-700/70">
                      Tidak tersedia
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-biru-700 italic">
                Tidak ada berkas pendukung yang dilampirkan.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* LEMBAR EVALUASI MATA KULIAH */}
      <Card className="overflow-hidden border border-biru-200 shadow-soft-sm space-y-4 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-biru-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-biru-950 font-serif">
              Lembar Evaluasi Mata Kuliah Diajukan
            </h2>
            <p className="text-xs text-biru-800">
              Tentukan status kelayakan (DIAKUI/DITOLAK), nilai transfer huruf,
              dan berikan catatan telaah asesor untuk setiap mata kuliah.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {permohonan?.mata_kuliah_list.map((mk, idx) => {
            const ev = evaluasiMap[mk.mata_kuliah_id] || {
              mata_kuliah_id: mk.mata_kuliah_id,
              status_kelayakan: "MENUNGGU",
              nilai_transfer: "A",
              catatan_asesor: "",
              sks: mk.sks,
            };

            const isDiakui = ev.status_kelayakan === "DIAKUI";
            const bobotCurrent = isDiakui
              ? BOBOT_MAP[ev.nilai_transfer] || 0.0
              : 0.0;

            return (
              <div
                key={mk.mata_kuliah_id}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  isDiakui
                    ? "border-biru-500 bg-biru-50/30"
                    : ev.status_kelayakan === "DITOLAK"
                      ? "border-biru-300 bg-putih opacity-80"
                      : "border-biru-200 bg-putih"
                }`}
              >
                {/* Header Mata Kuliah */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-biru-100 text-biru-950 font-bold flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-biru-950">
                        {mk.kode_mk} — {mk.nama_mk}
                      </div>
                      <div className="text-[11px] text-biru-700">
                        Semester {mk.semester} • Beban:{" "}
                        <strong>{mk.sks} SKS</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDiakui && (
                      <span className="text-xs px-2.5 py-1 rounded bg-biru-50 text-biru-950 border border-biru-400 font-bold">
                        Bobot Mutu: {(bobotCurrent * mk.sks).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Keterangan Pemohon */}
                <div className="text-xs bg-biru-50/60 p-2.5 rounded-lg border border-biru-100 text-biru-900">
                  <strong>Klaim Capaian Pemohon:</strong>{" "}
                  {mk.keterangan_pemohon || "Tidak ada keterangan."}
                </div>

                {/* Kontrol Penilaian Asesor */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <label className="font-semibold text-biru-950 block mb-1">
                      Status Kelayakan
                    </label>
                    <select
                      value={ev.status_kelayakan}
                      disabled={isFinalized}
                      onChange={(e) =>
                        handleUpdateEvaluasi(
                          mk.mata_kuliah_id,
                          "status_kelayakan",
                          e.target.value,
                        )
                      }
                      className="w-full rounded border border-biru-300 p-2 font-medium text-biru-950 bg-putih focus:outline-none focus:ring-1 focus:ring-biru-500"
                    >
                      <option value="MENUNGGU">MENUNGGU EVALUASI</option>
                      <option value="DIAKUI">DIAKUI (DISETUJUI)</option>
                      <option value="DITOLAK">DITOLAK</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-biru-950 block mb-1">
                      Nilai Transfer
                    </label>
                    <select
                      value={ev.nilai_transfer}
                      disabled={!isDiakui || isFinalized}
                      onChange={(e) =>
                        handleUpdateEvaluasi(
                          mk.mata_kuliah_id,
                          "nilai_transfer",
                          e.target.value,
                        )
                      }
                      className={`w-full rounded border border-biru-300 p-2 font-medium text-biru-950 bg-putih focus:outline-none focus:ring-1 focus:ring-biru-500 ${
                        !isDiakui ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <option value="A">A (4.00)</option>
                      <option value="A-">A- (3.70)</option>
                      <option value="B+">B+ (3.30)</option>
                      <option value="B">B (3.00)</option>
                      <option value="B-">B- (2.70)</option>
                      <option value="C+">C+ (2.30)</option>
                      <option value="C">C (2.00)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="font-semibold text-biru-950 block mb-1">
                      Catatan / Pertimbangan Asesor
                    </label>
                    <input
                      type="text"
                      value={ev.catatan_asesor}
                      disabled={isFinalized}
                      placeholder="cth: Bukti portofolio memadai memenuhi CPMK..."
                      onChange={(e) =>
                        handleUpdateEvaluasi(
                          mk.mata_kuliah_id,
                          "catatan_asesor",
                          e.target.value,
                        )
                      }
                      className="w-full rounded border border-biru-300 p-2 text-biru-950 bg-putih focus:outline-none focus:ring-1 focus:ring-biru-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Catatan Asesor Rekomendasi Keseluruhan */}
        <div className="pt-4 border-t border-biru-100">
          <label className="text-xs font-semibold text-biru-950 block mb-1">
            Catatan Rekomendasi Asesor untuk Berita Acara:
          </label>
          <textarea
            rows={3}
            value={catatanAsesorUmum}
            disabled={isFinalized}
            placeholder="Tuliskan rekomendasi akhir untuk sidang pleno kelulusan dan registrasi..."
            onChange={(e) => setCatatanAsesorUmum(e.target.value)}
            className="w-full text-xs rounded-lg border border-biru-300 p-2.5 text-biru-950 bg-putih focus:outline-none focus:ring-1 focus:ring-biru-500"
          />
        </div>
      </Card>

      {/* FOOTER ACTIONS */}
      {!isFinalized && (
        <div className="p-4 bg-putih rounded-xl border border-biru-200 shadow-soft-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-biru-800">
            Hasil penilaian ini dapat disimpan sebagai draf sementara atau
            difinalisasi menjadi Berita Acara Rekognisi resmi.
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => handleSubmitPenilaian(false)}
            >
              <Save className="w-4 h-4 mr-1.5 inline" />
              Simpan Draf Penilaian
            </Button>
            <Button
              variant="primary"
              disabled={saving}
              onClick={() => setConfirmFinalizeOpen(true)}
            >
              <ShieldCheck className="w-4 h-4 mr-1.5 inline" />
              Finalisasi Konversi & Terbitkan BA
            </Button>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI FINALISASI */}
      {confirmFinalizeOpen && (
        <div className="fixed inset-0 z-50 bg-biru-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-putih rounded-xl border border-biru-200 shadow-soft-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-biru-100 pb-3">
              <div className="flex items-center gap-2 font-serif font-bold text-base text-biru-950">
                <ShieldCheck className="w-5 h-5 text-biru-700" />
                <h3>Konfirmasi Finalisasi Penilaian RPL</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmFinalizeOpen(false)}
                className="text-biru-700 hover:text-biru-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-biru-800">
              <p>
                Anda akan memfinalisasi hasil konversi SKS untuk pendaftar{" "}
                <strong>{permohonan?.nama_lengkap}</strong> dengan ringkasan:
              </p>
              <div className="bg-biru-50/60 p-3 rounded-lg border border-biru-200 space-y-1">
                <div>
                  • Total SKS Diakui: <strong>{totalSksDiakui} SKS</strong>{" "}
                  (dari {totalSksDiajukan} SKS)
                </div>
                <div>
                  • IPK Hasil Konversi:{" "}
                  <strong>{ipkKonversi.toFixed(2)}</strong>
                </div>
                <div>
                  • Persentase Rekognisi:{" "}
                  <strong>{persentaseRekognisi.toFixed(1)}%</strong>
                </div>
              </div>
              <p className="text-biru-900 font-semibold pt-1">
                Perhatian: Setelah difinalisasi, Berita Acara Rekognisi akan
                terbit dan data penilaian dikunci untuk integrasi seleksi
                kelulusan.
              </p>

              {unassessedCount > 0 && (
                <div className="p-3 bg-biru-50 border border-biru-500 rounded-lg text-xs text-biru-950 flex items-start gap-2 mt-2">
                  <AlertCircle className="w-4 h-4 text-biru-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">
                      Mata Kuliah Belum Lengkap Dinilai:
                    </span>{" "}
                    Masih ada <strong>{unassessedCount} mata kuliah</strong>{" "}
                    dengan status <em>MENUNGGU EVALUASI</em>. Seluruh mata
                    kuliah harus diputuskan (DIAKUI atau DITOLAK) sebelum Berita
                    Acara dapat difinalisasi.
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-biru-100">
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => setConfirmFinalizeOpen(false)}
              >
                Kembali Periksa
              </Button>
              <Button
                variant="primary"
                disabled={saving || unassessedCount > 0}
                onClick={() => handleSubmitPenilaian(true)}
              >
                <Send className="w-3.5 h-3.5 mr-1 inline" />
                {saving ? "Memproses..." : "Ya, Finalisasi Sekarang"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
