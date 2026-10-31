import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import {
  Button,
  Card,
  StatusBadge,
  CardSkeleton,
  ErrorState,
} from "../../components/common";
import { useAuth } from "@/context";

export const DashboardCalon: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  // Data status pendaftar
  const pendaftar = {
    nomorPendaftaran: "PMB-2026-0042",
    status: "SUBMITTED",
    jalur: "Jalur Reguler (Tes CBT & Rapor)",
    gelombang: "Gelombang 1 (Early Bird)",
    prodi1: "S1 Informatika",
    prodi2: "S1 Sistem Informasi",
    tagihanLunas: true,
    berkasLengkap: true,
    ujianSelesai: true,
    skorUjian: 85.0,
    lulus: true,
    nimResmi: "2601020042",
  };

  const steps = [
    {
      num: 1,
      title: "Pembuatan Akun",
      desc: "Akun pendaftar telah aktif dan terverifikasi",
      status: "berhasil",
      actionLabel: "Selesai",
      done: true,
    },
    {
      num: 2,
      title: "Biaya Formulir",
      desc: pendaftar.tagihanLunas
        ? "Tagihan formulir lunas (INV-2026-00042)"
        : "Menunggu pembayaran formulir Rp 200.000",
      status: pendaftar.tagihanLunas ? "berhasil" : "menunggu",
      actionLabel: pendaftar.tagihanLunas
        ? "Lihat Bukti Bayar"
        : "Bayar Tagihan",
      actionLink: "/portal/pembayaran",
      done: pendaftar.tagihanLunas,
    },
    {
      num: 3,
      title: "Pengisian Biodata & Pilihan Prodi",
      desc: "Data pribadi, asal sekolah, dan 2 pilihan prodi tersimpan",
      status: "berhasil",
      actionLabel: "Ubah Data",
      actionLink: "/portal/formulir",
      done: true,
    },
    {
      num: 4,
      title: "Unggah & Verifikasi Berkas",
      desc: pendaftar.berkasLengkap
        ? "Berkas pasfoto, KTP, dan rapor terverifikasi"
        : "Dokumen masih dalam antrean verifikasi",
      status: pendaftar.berkasLengkap ? "berhasil" : "menunggu",
      actionLabel: "Periksa Berkas",
      actionLink: "/portal/berkas",
      done: pendaftar.berkasLengkap,
    },
    {
      num: 5,
      title: "Ujian CBT Online",
      desc: pendaftar.ujianSelesai
        ? `Ujian seleksi selesai (Skor: ${pendaftar.skorUjian})`
        : "Pengerjaan tes online potensi akademik 60 menit",
      status: pendaftar.ujianSelesai ? "berhasil" : "menunggu",
      actionLabel: pendaftar.ujianSelesai ? "Hasil Tes" : "Mulai Ujian",
      actionLink: "/portal/ujian",
      done: pendaftar.ujianSelesai,
    },
    {
      num: 6,
      title: "Hasil Seleksi & LoA Resmi",
      desc: pendaftar.lulus
        ? `Selamat! Anda dinyatakan Lulus di ${pendaftar.prodi1} (NIM: ${pendaftar.nimResmi})`
        : "Menunggu sidang yudisium kelulusan resmi",
      status: pendaftar.lulus ? "berhasil" : "menunggu",
      actionLabel: "Lihat SK & Unduh LoA",
      actionLink: "/portal/hasil",
      done: pendaftar.lulus,
    },
  ];

  if (isLoading) {
    return <CardSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Gagal Memuat Status Pendaftaran"
        message="Tidak dapat memuat ringkasan data tahapan seleksi Anda. Silakan coba kembali."
        onRetry={() => {
          setIsError(false);
          setIsLoading(true);
          setTimeout(() => setIsLoading(false), 500);
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Kartu Selamat Datang & Status Utama */}
      <Card className="border-2 border-biru-200 bg-putih shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-100">
          <div>
            <span className="text-xs font-bold text-biru-800 uppercase tracking-wider block">
              Selamat Datang di Portal PMB
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
              {user?.nama_lengkap || "Calon Mahasiswa"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-biru-800">Status Pendaftaran:</span>
            <StatusBadge
              status="berhasil"
              label="Berkas Terverifikasi & Lulus"
            />
          </div>
        </div>

        {/* Informasi Pendaftaran Ringkas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
          <div className="p-3 rounded-xl bg-biru-50/60 border border-biru-100">
            <span className="text-biru-800 block">Nomor Pendaftaran</span>
            <span className="font-mono font-bold text-biru-950 text-sm mt-0.5 block">
              {pendaftar.nomorPendaftaran}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-biru-50/60 border border-biru-100">
            <span className="text-biru-800 block">Jalur Masuk</span>
            <span className="font-bold text-biru-950 mt-0.5 block truncate">
              {pendaftar.jalur}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-biru-50/60 border border-biru-100">
            <span className="text-biru-800 block">Pilihan Utama (1)</span>
            <span className="font-bold text-biru-950 mt-0.5 block truncate">
              {pendaftar.prodi1}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-biru-50/60 border border-biru-100">
            <span className="text-biru-800 block">NIM Resmi</span>
            <span className="font-mono font-bold text-biru-700 text-sm mt-0.5 block">
              {pendaftar.nimResmi}
            </span>
          </div>
        </div>
      </Card>

      {/* Stepper Progres Alur PMB */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-bold text-biru-950">
          Progres Tahapan Pendaftaran
        </h2>

        <div className="space-y-3">
          {steps.map((s) => (
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
