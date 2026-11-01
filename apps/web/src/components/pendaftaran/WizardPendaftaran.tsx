import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  CreditCard,
  GraduationCap,
  Download,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button, Card, CardSkeleton, ErrorState } from "../common";
import { DynamicFormRenderer } from "../form/DynamicFormRenderer";
import type { DefinisiFieldItem } from "../form/DynamicFormRenderer";
import { BerkasUploader } from "../berkas/BerkasUploader";
import type { BerkasItem } from "../berkas/BerkasUploader";
import { useToast } from "@/components/ui/useToast";

interface JalurOption {
  id: string;
  kode: string;
  nama: string;
  deskripsi?: string;
  tipe_seleksi?: string;
}

interface GelombangOption {
  id: string;
  nama: string;
  status: string;
  tgl_mulai: string;
  tgl_selesai: string;
}

interface ProdiOption {
  id: string;
  nama: string;
  jenjang: string;
  kuota: number;
}

interface LangkahItem {
  id: string;
  kode_langkah: string;
  judul_langkah: string;
  deskripsi: string | null;
  tipe_langkah: string;
  urutan: number;
  wajib: boolean;
  status: "BELUM" | "SEDANG_BERJALAN" | "SELESAI";
  selesai_at: string | null;
}

interface DashboardSummary {
  pendaftar_id: string | null;
  nomor_pendaftaran: string | null;
  status_pendaftaran: string;
  jalur_nama: string | null;
  gelombang_nama: string | null;
  prodi_1_nama: string | null;
  prodi_2_nama: string | null;
  tagihan_lunas: boolean;
  nomor_tagihan: string | null;
  nominal_tagihan: number | null;
  jadwal_ujian: string | null;
  lokasi_ujian: string | null;
  pengumuman_status: string | null;
  nim_resmi: string | null;
  bisa_cetak_bukti: boolean;
  bisa_cetak_kartu: boolean;
}

export const WizardPendaftaran: React.FC = () => {
  const { toast } = useToast();

  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [langkahList, setLangkahList] = useState<LangkahItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [berkasList, setBerkasList] = useState<BerkasItem[]>([]);

  // Master Data Pilihan
  const [jalurList, setJalurList] = useState<JalurOption[]>([]);
  const [gelombangList, setGelombangList] = useState<GelombangOption[]>([]);
  const [prodiList, setProdiList] = useState<ProdiOption[]>([]);

  // State Pilihan Prodi
  const [selectedJalur, setSelectedJalur] = useState<string>("");
  const [selectedGelombang, setSelectedGelombang] = useState<string>("");
  const [selectedProdi1, setSelectedProdi1] = useState<string>("");
  const [selectedProdi2, setSelectedProdi2] = useState<string>("");

  // Dynamic Fields
  const [fields, setFields] = useState<DefinisiFieldItem[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const loadInitialData = async () => {
    try {
      setIsError(false);

      const [
        summaryRes,
        langkahRes,
        masterJalur,
        masterGel,
        masterProdi,
        fieldsRes,
        myRes,
        berkasRes,
      ] = await Promise.all([
        fetch("/api/pendaftaran/dashboard-summary"),
        fetch("/api/pendaftaran/langkah"),
        fetch("/api/master/jalur"),
        fetch("/api/master/gelombang"),
        fetch("/api/master/prodi"),
        fetch("/api/pendaftaran/fields"),
        fetch("/api/pendaftaran/my"),
        fetch("/api/pendaftaran/berkas/syarat"),
      ]);

      if (summaryRes.ok) {
        const sumData = await summaryRes.json();
        setSummary(sumData);
      }

      if (langkahRes.ok) {
        const lData = await langkahRes.json();
        setLangkahList(lData);
      }

      if (berkasRes.ok) {
        const bData = await berkasRes.json();
        setBerkasList(bData);
      }

      if (masterJalur.ok) {
        const jData = await masterJalur.json();
        setJalurList(jData);
        if (jData.length > 0 && !selectedJalur) setSelectedJalur(jData[0].id);
      }

      if (masterGel.ok) {
        const gData = await masterGel.json();
        setGelombangList(gData);
        const buka = gData.find((g: GelombangOption) => g.status === "BUKA");
        if (buka) setSelectedGelombang(buka.id);
        else if (gData.length > 0) setSelectedGelombang(gData[0].id);
      }

      if (masterProdi.ok) {
        const pData = await masterProdi.json();
        setProdiList(pData);
        if (pData.length > 0 && !selectedProdi1) setSelectedProdi1(pData[0].id);
      }

      if (fieldsRes.ok) {
        const fData = await fieldsRes.json();
        setFields(fData);
      }

      if (myRes.ok) {
        const myData = await myRes.json();
        if (myData.jalur_id) setSelectedJalur(myData.jalur_id);
        if (myData.gelombang_id) setSelectedGelombang(myData.gelombang_id);
        if (myData.prodi_pilihan_1) setSelectedProdi1(myData.prodi_pilihan_1);
        if (myData.prodi_pilihan_2) setSelectedProdi2(myData.prodi_pilihan_2);

        setFormValues(myData.data_formulir || {});
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Simpan Pilihan Prodi & Jalur (Langkah 1)
  const handleSavePilihanProdi = async () => {
    if (!selectedJalur || !selectedGelombang || !selectedProdi1) {
      toast({
        title: "Pilihan Belum Lengkap",
        description:
          "Harap tentukan Jalur, Gelombang, dan Program Studi Utama Anda.",
        variant: "peringatan",
      });
      return;
    }

    if (selectedProdi2 && selectedProdi2 === selectedProdi1) {
      toast({
        title: "Pilihan Prodi Tidak Valid",
        description: "Program Studi Pilihan 1 dan Pilihan 2 tidak boleh sama.",
        variant: "peringatan",
      });
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/pendaftaran/pilih-prodi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jalur_id: selectedJalur,
          gelombang_id: selectedGelombang,
          prodi_pilihan_1: selectedProdi1,
          prodi_pilihan_2: selectedProdi2 || null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.pesan || "Gagal menyimpan pilihan program studi",
        );
      }

      toast({
        title: "Pilihan Tersimpan",
        description:
          "Program studi berhasil disimpan. Silakan lanjutkan ke pengisian biodata.",
        variant: "success",
      });

      await loadInitialData();
      setActiveStepIndex(1); // Lanjut ke Biodata
    } catch (err: any) {
      toast({
        title: "Gagal Menyimpan",
        description: err.message || "Terjadi kesalahan saat menyimpan pilihan.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Simpan Biodata Form Dinamis (Langkah 2)
  const handleSaveBiodata = async (formData: Record<string, any>) => {
    try {
      setIsSaving(true);
      const res = await fetch("/api/pendaftaran/submit-dinamis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jalur_id: selectedJalur || undefined,
          gelombang_id: selectedGelombang || undefined,
          prodi_pilihan_1: selectedProdi1 || undefined,
          prodi_pilihan_2: selectedProdi2 || undefined,
          data: formData,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.detail?.join(", ") ||
            errJson.pesan ||
            "Gagal menyimpan biodata pendaftaran",
        );
      }

      toast({
        title: "Biodata Disimpan",
        description:
          "Data formulir berhasil diperbarui. Silakan unggah berkas persyaratan.",
        variant: "success",
      });

      await loadInitialData();
      setActiveStepIndex(2); // Lanjut ke Unggah Berkas
    } catch (err: any) {
      toast({
        title: "Validasi Formulir Gagal",
        description:
          err.message || "Mohon periksa kembali isian formulir Anda.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <CardSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Gagal Memuat Wizard Pendaftaran"
        message="Tidak dapat memuat tahapan alur pendaftaran PMB. Silakan periksa koneksi Anda dan coba kembali."
        onRetry={loadInitialData}
      />
    );
  }

  const stepsList = [
    { title: "Pilih Prodi & Jalur", icon: GraduationCap },
    { title: "Isi Biodata", icon: FileText },
    { title: "Unggah Berkas", icon: FileText },
    { title: "Biaya Formulir", icon: CreditCard },
    { title: "Ujian Seleksi", icon: Clock },
    { title: "Cetak Dokumen", icon: Download },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Alur Pendaftaran */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-100">
        <div>
          <span className="text-xs font-bold text-biru-800 uppercase tracking-wider block">
            Universitas Pignatelli Triputra
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-1">
            Alur Pendaftaran Mahasiswa Baru
          </h1>
          <p className="text-xs sm:text-sm text-biru-800/80 mt-1">
            Lengkapi tahapan pendaftaran secara berurutan. Progres tersimpan
            secara otomatis.
          </p>
        </div>
        {summary?.nomor_pendaftaran && (
          <div className="p-3 bg-biru-50 border border-biru-200 rounded-2xl shrink-0">
            <span className="text-[11px] font-bold text-biru-700 block uppercase tracking-wider">
              Nomor Pendaftaran Resmi
            </span>
            <span className="font-mono text-base font-bold text-biru-950">
              {summary.nomor_pendaftaran}
            </span>
          </div>
        )}
      </div>

      {/* Stepper Premium */}
      <div className="bg-putih border border-biru-200 rounded-3xl p-5 shadow-xs overflow-x-auto">
        <div className="flex items-center min-w-[620px] justify-between relative">
          <div className="absolute top-5 left-6 right-6 h-0.5 bg-biru-100 -z-0" />
          {stepsList.map((st, idx) => {
            const Icon = st.icon;
            const backendDone =
              idx === 0
                ? langkahList.find((l) => l.tipe_langkah === "pilih_prodi")
                    ?.status === "SELESAI" || !!summary?.prodi_1_nama
                : idx === 1
                  ? langkahList.find((l) => l.tipe_langkah === "biodata")
                      ?.status === "SELESAI" ||
                    summary?.status_pendaftaran !== "BELUM_DAFTAR"
                  : idx === 2
                    ? langkahList.find((l) => l.tipe_langkah === "berkas")
                        ?.status === "SELESAI" ||
                      (summary?.bisa_cetak_bukti ?? false)
                    : idx === 3
                      ? (summary?.tagihan_lunas ?? false)
                      : idx === 4
                        ? summary?.status_pendaftaran === "SELESAI_UJIAN" ||
                          summary?.status_pendaftaran === "LULUS"
                        : summary?.pengumuman_status === "LULUS";

            const isCurrent = idx === activeStepIndex;
            const isPassed =
              (idx < activeStepIndex || backendDone) && !isCurrent;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveStepIndex(idx)}
                className="relative z-10 flex flex-col items-center group cursor-pointer"
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    isPassed
                      ? "bg-biru-700 text-putih shadow-xs"
                      : isCurrent
                        ? "bg-biru-950 text-putih ring-4 ring-biru-100"
                        : "bg-biru-50 text-biru-400 border border-biru-200"
                  }`}
                >
                  {isPassed ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 font-medium transition-colors ${
                    isCurrent
                      ? "font-bold text-biru-950"
                      : isPassed
                        ? "text-biru-800"
                        : "text-biru-400"
                  }`}
                >
                  {st.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KONTEN LANGKAH 1: PILIH PRODI & JALUR */}
      {activeStepIndex === 0 && (
        <Card className="p-6 sm:p-8 bg-putih border border-biru-200 rounded-3xl space-y-6 shadow-xs">
          <div>
            <h2 className="font-serif text-xl font-bold text-biru-950">
              Tahap 1: Pemilihan Jalur, Gelombang & Program Studi
            </h2>
            <p className="text-xs text-biru-800/80 mt-1">
              Tentukan jalur seleksi dan program studi yang Anda minati. Anda
              dapat memilih hingga 2 program studi berbeda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Jalur Pendaftaran */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Jalur Seleksi PMB <span className="text-biru-700">*</span>
              </label>
              <select
                value={selectedJalur}
                onChange={(e) => setSelectedJalur(e.target.value)}
                className="w-full px-4 py-3 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              >
                {jalurList.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nama}{" "}
                    {j.tipe_seleksi ? `(${j.tipe_seleksi.toUpperCase()})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Gelombang PMB */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Gelombang Pendaftaran <span className="text-biru-700">*</span>
              </label>
              <select
                value={selectedGelombang}
                onChange={(e) => setSelectedGelombang(e.target.value)}
                className="w-full px-4 py-3 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              >
                {gelombangList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama} - {g.status === "BUKA" ? "Buka (Aktif)" : "Tutup"}{" "}
                    ({g.tgl_mulai} s.d. {g.tgl_selesai})
                  </option>
                ))}
              </select>
            </div>

            {/* Pilihan Prodi 1 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Program Studi Pilihan 1 (Prioritas Utama){" "}
                <span className="text-biru-700">*</span>
              </label>
              <select
                value={selectedProdi1}
                onChange={(e) => setSelectedProdi1(e.target.value)}
                className="w-full px-4 py-3 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              >
                {prodiList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.jenjang} {p.nama} (Kuota: {p.kuota})
                  </option>
                ))}
              </select>
            </div>

            {/* Pilihan Prodi 2 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Program Studi Pilihan 2 (Pilihan Cadangan)
              </label>
              <select
                value={selectedProdi2}
                onChange={(e) => setSelectedProdi2(e.target.value)}
                className="w-full px-4 py-3 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              >
                <option value="">
                  -- Tidak memilih program studi kedua --
                </option>
                {prodiList
                  .filter((p) => p.id !== selectedProdi1)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.jenjang} {p.nama}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {gelombangList.length === 0 && (
            <div className="p-4 rounded-2xl bg-biru-50 border border-biru-200 text-xs text-biru-900 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-biru-700 shrink-0" />
              <span>
                Saat ini belum ada gelombang pendaftaran PMB yang dibuka. Harap
                hubungi panitia PMB atau periksa kembali jadwal penerimaan.
              </span>
            </div>
          )}

          {prodiList.length === 0 && (
            <div className="p-4 rounded-2xl bg-biru-50 border border-biru-200 text-xs text-biru-900 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-biru-700 shrink-0" />
              <span>
                Data program studi belum tersedia. Harap hubungi administrator
                PMB.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-biru-100">
            <Button
              variant="primary"
              size="md"
              onClick={handleSavePilihanProdi}
              disabled={
                isSaving ||
                gelombangList.length === 0 ||
                prodiList.length === 0 ||
                !selectedProdi1
              }
              className="gap-2"
            >
              <span>{isSaving ? "Menyimpan..." : "Simpan & Lanjutkan"}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* KONTEN LANGKAH 2: BIODATA DINAMIS */}
      {activeStepIndex === 1 && (
        <Card className="p-6 sm:p-8 bg-putih border border-biru-200 rounded-3xl space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-bold text-biru-950">
                Tahap 2: Pengisian Biodata Calon Mahasiswa
              </h2>
              <p className="text-xs text-biru-800/80 mt-1">
                Kolom formulir dikonfigurasi dinamis oleh panitia PMB. Data
                disimpan ke sistem secara otomatis.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStepIndex(0)}
              className="gap-1.5 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Button>
          </div>

          <DynamicFormRenderer
            fields={fields}
            defaultValues={formValues}
            onSubmit={handleSaveBiodata}
            isSubmitting={isSaving}
          />
        </Card>
      )}

      {/* KONTEN LANGKAH 3: UNGGAH BERKAS */}
      {activeStepIndex === 2 && (
        <Card className="p-6 sm:p-8 bg-putih border border-biru-200 rounded-3xl space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-biru-100">
            <div>
              <h2 className="font-serif text-xl font-bold text-biru-950">
                Tahap 3: Unggah Berkas Persyaratan
              </h2>
              <p className="text-xs text-biru-800/80 mt-1">
                Unggah dokumen persyaratan resmi (PDF/JPG/PNG) melalui
                penyimpanan aman MinIO UPT.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveStepIndex(1)}
                className="gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveStepIndex(3)}
                className="gap-1.5"
              >
                <span>Lanjut ke Biaya</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <BerkasUploader
            berkasList={berkasList}
            onUploadSuccess={loadInitialData}
          />
        </Card>
      )}

      {/* KONTEN LANGKAH 4: PEMBAYARAN FORMULIR */}
      {activeStepIndex === 3 && (
        <Card className="p-6 sm:p-8 bg-putih border border-biru-200 rounded-3xl space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-biru-100">
            <div>
              <h2 className="font-serif text-xl font-bold text-biru-950">
                Tahap 4: Pembayaran & Konfirmasi Biaya Formulir
              </h2>
              <p className="text-xs text-biru-800/80 mt-1">
                Biaya pendaftaran formulir untuk memvalidasi kepesertaan seleksi
                masuk universitas.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStepIndex(2)}
              className="gap-1.5 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-biru-50/50 border border-biru-200 space-y-4">
              <span className="text-xs font-bold text-biru-800 uppercase tracking-wider block">
                Ringkasan Tagihan Formulir
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-biru-100">
                  <span className="text-biru-800">Nomor Invoice</span>
                  <span className="font-mono font-bold text-biru-950">
                    {summary?.nomor_tagihan || "INV-2026-FORMULIR"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-biru-100">
                  <span className="text-biru-800">Status Pembayaran</span>
                  <span className="font-bold text-biru-950">
                    {summary?.tagihan_lunas
                      ? "LUNAS (Terverifikasi)"
                      : "Menunggu Pembayaran"}
                  </span>
                </div>
                <div className="flex justify-between py-1 pt-2 text-sm font-bold">
                  <span className="text-biru-950">Total Nominal</span>
                  <span className="text-biru-800">
                    Rp{" "}
                    {(summary?.nominal_tagihan || 250000).toLocaleString(
                      "id-ID",
                    )}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link to="/portal/pembayaran">
                  <Button variant="primary" size="sm" className="w-full gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Buka Halaman Pembayaran & Voucher</span>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-putih border border-biru-200 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-bold text-biru-800 uppercase tracking-wider block">
                  Metode Pembayaran Tersedia
                </span>
                <ul className="text-xs text-biru-800/80 space-y-2 mt-3 list-disc list-inside">
                  <li>
                    Virtual Account Bank BCA, Mandiri, BNI, BRI otomatis lunas.
                  </li>
                  <li>Pembayaran tunai di Loket PMB Kampus UPT Surakarta.</li>
                  <li>
                    Dukungan klaim voucher potongan biaya bagi siswa
                    berprestasi.
                  </li>
                </ul>
              </div>

              <Button
                variant="outline"
                size="md"
                onClick={() => setActiveStepIndex(4)}
                className="w-full gap-2 justify-center"
              >
                <span>Lanjut ke Jadwal Ujian</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* KONTEN LANGKAH 5: JADWAL UJIAN CBT */}
      {activeStepIndex === 4 && (
        <Card className="p-6 sm:p-8 bg-putih border border-biru-200 rounded-3xl space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-biru-100">
            <div>
              <h2 className="font-serif text-xl font-bold text-biru-950">
                Tahap 5: Informasi & Pelaksanaan Ujian CBT
              </h2>
              <p className="text-xs text-biru-800/80 mt-1">
                Pelaksanaan tes potensi skolastik dan literasi secara daring
                atau di laboratorium komputer UPT.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStepIndex(3)}
              className="gap-1.5 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Button>
          </div>

          <div className="p-5 rounded-2xl bg-biru-50/50 border border-biru-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-biru-800 block">Jadwal Ujian Masuk</span>
                <span className="font-bold text-biru-950 text-sm mt-0.5 block">
                  {summary?.jadwal_ujian ||
                    "Ujian CBT Online / Sesuai Jadwal Gelombang"}
                </span>
              </div>
              <div>
                <span className="text-biru-800 block">Lokasi / Ruang</span>
                <span className="font-bold text-biru-950 text-sm mt-0.5 block">
                  {summary?.lokasi_ujian ||
                    "Laboratorium Komputer Kampus UPT Surakarta"}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Link to="/portal/ujian" className="w-full sm:w-auto">
                <Button variant="primary" size="md" className="gap-2 w-full">
                  <Clock className="w-4 h-4" />
                  <span>Masuk ke Modul CBT Ujian</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="md"
                onClick={() => setActiveStepIndex(5)}
                className="gap-2 w-full sm:w-auto"
              >
                <span>Lihat Hasil & Dokumen</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* KONTEN LANGKAH 6: CETAK DOKUMEN & PENGUMUMAN */}
      {activeStepIndex === 5 && (
        <Card className="p-6 sm:p-8 bg-putih border border-biru-200 rounded-3xl space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-biru-100">
            <div>
              <h2 className="font-serif text-xl font-bold text-biru-950">
                Tahap 6: Pengumuman Seleksi & Cetak Dokumen Resmi
              </h2>
              <p className="text-xs text-biru-800/80 mt-1">
                Unduh Bukti Pendaftaran dan Kartu Peserta Ujian berformat PDF
                resmi dengan QR Code vektor.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStepIndex(4)}
              className="gap-1.5 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kartu Bukti Pendaftaran */}
            <div className="p-5 rounded-2xl bg-biru-50/50 border border-biru-200 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-bold text-biru-800 uppercase tracking-wider block">
                  Bukti Pendaftaran Mahasiswa Baru
                </span>
                <p className="text-xs text-biru-800/80 mt-2 leading-relaxed">
                  Lembar tanda bukti sah pendaftaran calon mahasiswa baru dengan
                  Nomor Pendaftaran, data diri lengkap, serta rincian pilihan
                  program studi.
                </p>
              </div>

              {summary?.bisa_cetak_bukti && summary.pendaftar_id ? (
                <a
                  href={`/api/pendaftaran/${summary.pendaftar_id}/cetak/bukti-pendaftaran`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full gap-2 justify-center"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh PDF Bukti Pendaftaran</span>
                  </Button>
                </a>
              ) : (
                <div className="p-3 bg-biru-100/50 rounded-xl text-xs text-biru-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Selesaikan pemilihan program studi terlebih dahulu.
                  </span>
                </div>
              )}
            </div>

            {/* Kartu Peserta Ujian */}
            <div className="p-5 rounded-2xl bg-biru-50/50 border border-biru-200 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-bold text-biru-800 uppercase tracking-wider block">
                  Kartu Peserta Ujian Seleksi
                </span>
                <p className="text-xs text-biru-800/80 mt-2 leading-relaxed">
                  Dokumen wajib cetak untuk ditunjukkan kepada pengawas saat
                  mengikuti tes seleksi. Memuat nomor peserta, jadwal, dan QR
                  Code presensi.
                </p>
              </div>

              {summary?.bisa_cetak_kartu && summary.pendaftar_id ? (
                <a
                  href={`/api/pendaftaran/${summary.pendaftar_id}/cetak/kartu-peserta`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full gap-2 justify-center"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh PDF Kartu Peserta Ujian</span>
                  </Button>
                </a>
              ) : (
                <div className="p-3 bg-biru-100/50 rounded-xl text-xs text-biru-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Tersedia setelah pembayaran formulir lunas atau pendaftaran
                    loket offline.
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
