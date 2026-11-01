import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ArrowRight,
  Download,
  Printer,
  FileText,
} from "lucide-react";
import {
  Button,
  Card,
  StatusBadge,
  CardSkeleton,
  ErrorState,
} from "../../components/common";
import { useAuth } from "@/context";

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

interface LangkahProgressItem {
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

export const DashboardCalon: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [langkahList, setLangkahList] = useState<LangkahProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      const [sumRes, langRes] = await Promise.all([
        fetch("/api/pendaftaran/dashboard-summary"),
        fetch("/api/pendaftaran/langkah"),
      ]);

      if (!sumRes.ok) {
        throw new Error("Gagal mengambil ringkasan dashboard");
      }

      const sumData: DashboardSummary = await sumRes.json();
      setSummary(sumData);

      if (langRes.ok) {
        const langData: LangkahProgressItem[] = await langRes.json();
        setLangkahList(langData);
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <CardSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Gagal Memuat Status Pendaftaran"
        message="Tidak dapat memuat ringkasan data tahapan seleksi Anda. Silakan periksa koneksi dan coba kembali."
        onRetry={fetchDashboardData}
      />
    );
  }

  const pendaftar = {
    nomorPendaftaran: summary?.nomor_pendaftaran || "-",
    status: summary?.status_pendaftaran || "BELUM_DAFTAR",
    jalur: summary?.jalur_nama || "Belum Memilih Jalur",
    gelombang: summary?.gelombang_nama || "Gelombang Aktif",
    prodi1: summary?.prodi_1_nama || "Belum Memilih",
    prodi2: summary?.prodi_2_nama,
    tagihanLunas: summary?.tagihan_lunas || false,
    nominalTagihan: summary?.nominal_tagihan || 250000,
    jadwalUjian: summary?.jadwal_ujian,
    lokasiUjian: summary?.lokasi_ujian,
    lulus: summary?.pengumuman_status === "LULUS",
    nimResmi: summary?.nim_resmi,
  };

  // Stepper dinamis
  const defaultSteps = [
    {
      num: 1,
      title: "Pilih Jalur & Prodi",
      desc:
        pendaftar.prodi1 !== "Belum Memilih"
          ? `Pilihan: ${pendaftar.prodi1}`
          : "Tentukan jalur dan program studi pilihan Anda",
      status: pendaftar.prodi1 !== "Belum Memilih" ? "berhasil" : "menunggu",
      actionLabel:
        pendaftar.prodi1 !== "Belum Memilih" ? "Ubah Pilihan" : "Pilih Prodi",
      actionLink: "/portal/formulir",
      done: pendaftar.prodi1 !== "Belum Memilih",
    },
    {
      num: 2,
      title: "Pengisian Biodata",
      desc:
        summary?.status_pendaftaran !== "BELUM_DAFTAR"
          ? "Biodata diri, orang tua, dan sekolah tersimpan"
          : "Isi data formulir pendaftaran secara lengkap",
      status:
        summary?.status_pendaftaran !== "BELUM_DAFTAR"
          ? "berhasil"
          : "menunggu",
      actionLabel: "Buka Formulir",
      actionLink: "/portal/formulir",
      done: summary?.status_pendaftaran !== "BELUM_DAFTAR",
    },
    {
      num: 3,
      title: "Biaya Formulir",
      desc: pendaftar.tagihanLunas
        ? `Lunas (${summary?.nomor_tagihan || "TUNAI_LOKET"})`
        : `Menunggu pembayaran Rp ${pendaftar.nominalTagihan.toLocaleString("id-ID")}`,
      status: pendaftar.tagihanLunas ? "berhasil" : "menunggu",
      actionLabel: pendaftar.tagihanLunas ? "Detail Tagihan" : "Bayar Tagihan",
      actionLink: "/portal/pembayaran",
      done: pendaftar.tagihanLunas,
    },
    {
      num: 4,
      title: "Unggah & Verifikasi Berkas",
      desc: "Unggah dokumen persyaratan (Pasfoto, KTP, Rapor)",
      status: summary?.bisa_cetak_bukti ? "berhasil" : "menunggu",
      actionLabel: "Kelola Berkas",
      actionLink: "/portal/berkas",
      done: summary?.bisa_cetak_bukti || false,
    },
    {
      num: 5,
      title: "Ujian CBT Online",
      desc:
        pendaftar.jadwalUjian ||
        "Ujian seleksi masuk potensi skolastik dan literasi",
      status:
        summary?.status_pendaftaran === "SELESAI_UJIAN" ||
        summary?.status_pendaftaran === "LULUS"
          ? "berhasil"
          : "menunggu",
      actionLabel: "Masuk CBT",
      actionLink: "/portal/ujian",
      done:
        summary?.status_pendaftaran === "SELESAI_UJIAN" ||
        summary?.status_pendaftaran === "LULUS",
    },
    {
      num: 6,
      title: "Hasil Seleksi & LoA Resmi",
      desc: pendaftar.lulus
        ? `Selamat! Dinyatakan Lulus di ${pendaftar.prodi1} (NIM: ${pendaftar.nimResmi || "-"})`
        : "Menunggu sidang yudisium kelulusan resmi universitas",
      status: pendaftar.lulus ? "berhasil" : "menunggu",
      actionLabel: "Lihat Pengumuman",
      actionLink: "/portal/hasil",
      done: pendaftar.lulus,
    },
  ];

  const stepsToRender =
    langkahList.length > 0
      ? langkahList.map((l, idx) => ({
          num: idx + 1,
          title: l.judul_langkah,
          desc:
            l.deskripsi ||
            (l.status === "SELESAI"
              ? "Tahapan telah selesai"
              : "Silakan selesaikan tahapan ini"),
          status: l.status === "SELESAI" ? "berhasil" : "menunggu",
          actionLabel:
            l.status === "SELESAI" ? "Lihat Tahapan" : "Lanjutkan Tahapan",
          actionLink:
            l.tipe_langkah === "pilih_prodi" || l.tipe_langkah === "biodata"
              ? "/portal/formulir"
              : l.tipe_langkah === "rpl"
                ? "/portal/rpl"
                : l.tipe_langkah === "berkas"
                  ? "/portal/berkas"
                  : l.tipe_langkah === "pembayaran"
                    ? "/portal/pembayaran"
                    : l.tipe_langkah === "ujian"
                      ? "/portal/ujian"
                      : "/portal/hasil",
          done: l.status === "SELESAI",
        }))
      : defaultSteps;

  return (
    <div className="space-y-8">
      {/* Kartu Utama & Status */}
      <Card className="border-2 border-biru-200 bg-putih shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-100">
          <div>
            <span className="text-xs font-bold text-biru-800 uppercase tracking-wider block">
              Portal Calon Mahasiswa Baru
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-0.5">
              {user?.nama_lengkap || "Calon Mahasiswa"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-biru-800">Status Pendaftaran:</span>
            <StatusBadge
              status={pendaftar.lulus ? "berhasil" : "menunggu"}
              label={
                pendaftar.lulus
                  ? "Dinyatakan Lulus Seleksi"
                  : pendaftar.status === "SUBMITTED"
                    ? "Berkas Diajukan"
                    : pendaftar.status === "MENUNGGU_UJIAN"
                      ? "Menunggu Ujian"
                      : pendaftar.status === "DRAFT"
                        ? "Draf Pendaftaran"
                        : "Calon Terdaftar"
              }
            />
          </div>
        </div>

        {/* Info Pendaftaran Ringkas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
          <div className="p-3.5 rounded-2xl bg-biru-50/60 border border-biru-100">
            <span className="text-biru-800 block text-[11px] uppercase tracking-wider font-semibold">
              Nomor Pendaftaran
            </span>
            <span className="font-mono font-bold text-biru-950 text-sm mt-0.5 block">
              {pendaftar.nomorPendaftaran}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-biru-50/60 border border-biru-100">
            <span className="text-biru-800 block text-[11px] uppercase tracking-wider font-semibold">
              Jalur Masuk
            </span>
            <span className="font-bold text-biru-950 mt-0.5 block truncate">
              {pendaftar.jalur}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-biru-50/60 border border-biru-100">
            <span className="text-biru-800 block text-[11px] uppercase tracking-wider font-semibold">
              Pilihan Utama (1)
            </span>
            <span className="font-bold text-biru-950 mt-0.5 block truncate">
              {pendaftar.prodi1}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-biru-50/60 border border-biru-100">
            <span className="text-biru-800 block text-[11px] uppercase tracking-wider font-semibold">
              {pendaftar.nimResmi ? "NIM Resmi" : "Biaya Formulir"}
            </span>
            <span className="font-mono font-bold text-biru-800 text-sm mt-0.5 block">
              {pendaftar.nimResmi
                ? pendaftar.nimResmi
                : pendaftar.tagihanLunas
                  ? "LUNAS"
                  : "BELUM LUNAS"}
            </span>
          </div>
        </div>

        {/* Action Bar Unduh PDF Resmi */}
        {summary?.pendaftar_id && (
          <div className="pt-3 border-t border-biru-100 flex flex-wrap items-center gap-3">
            {summary.bisa_cetak_bukti && (
              <a
                href={`/api/pendaftaran/${summary.pendaftar_id}/cetak/bukti-pendaftaran`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <Printer className="w-4 h-4" />
                  <span>Cetak Bukti Pendaftaran (PDF)</span>
                </Button>
              </a>
            )}

            {summary.bisa_cetak_kartu && (
              <a
                href={`/api/pendaftaran/${summary.pendaftar_id}/cetak/kartu-peserta`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="primary" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  <span>Cetak Kartu Peserta Ujian (PDF)</span>
                </Button>
              </a>
            )}

            <Link to="/portal/formulir" className="ml-auto">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="w-4 h-4" />
                <span>Buka Wizard Pendaftaran</span>
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Stepper Progres Alur PMB */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-biru-950">
            Tahapan & Progres Pendaftaran
          </h2>
          <span className="text-xs text-biru-800 font-medium">
            Tersimpan Otomatis
          </span>
        </div>

        <div className="space-y-3">
          {stepsToRender.map((s) => (
            <div
              key={s.num}
              className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                s.done
                  ? "bg-putih border-biru-200 shadow-xs"
                  : "bg-biru-50/40 border-biru-100"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                    s.done
                      ? "bg-biru-700 text-putih shadow-xs"
                      : "bg-biru-100 text-biru-800 border border-biru-200"
                  }`}
                >
                  {s.done ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-base text-biru-950">
                      {s.title}
                    </h3>
                    <StatusBadge status={s.status} size="sm" />
                  </div>
                  <p className="text-xs text-biru-800/90 leading-relaxed font-light">
                    {s.desc}
                  </p>
                </div>
              </div>

              {s.actionLink && (
                <Link to={s.actionLink} className="shrink-0">
                  <Button
                    variant={s.done ? "outline" : "primary"}
                    size="sm"
                    className="gap-2 w-full sm:w-auto"
                  >
                    <span>{s.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
