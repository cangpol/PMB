import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  Calculator,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Building2,
  Users,
} from "lucide-react";
import { Button, Card, StatusBadge } from "../../components/common";

export const HomePage: React.FC = () => {
  // Query status kesehatan Backend API (/api/health)
  const {
    data: healthData,
    isLoading: isHealthLoading,
    isError: isHealthError,
  } = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error("API server unavailable");
      return res.json() as Promise<{
        status: string;
        service: string;
        institusi: string;
        versi: string;
        database: string;
        redis: string;
        timestamp: string;
      }>;
    },
    refetchInterval: 30000,
  });

  // Simulasi kalkulator voucher & biaya
  const [selectedProdiUkt, setSelectedProdiUkt] = useState<number>(6500000);
  const [voucherCode, setVoucherCode] = useState<string>("TRIPUTRA2026");
  const [voucherApplied, setVoucherApplied] = useState<boolean>(true);

  const biayaFormulir = 250000;
  const diskonFormulir =
    voucherApplied && voucherCode.toUpperCase() === "TRIPUTRA2026" ? 50000 : 0;
  const totalBiayaFormulir = biayaFormulir - diskonFormulir;

  return (
    <div className="space-y-20 pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden hero-pattern text-putih py-24 sm:py-32 border-b border-biru-800">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Teks Hero */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-biru-800/80 border border-biru-500/50 text-biru-100 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-biru-200" />
                  <span>Penerimaan Mahasiswa Baru T.A. 2026/2027</span>
                </div>

                {/* Status Sistem API */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-biru-900/90 border border-biru-500/60 text-xs text-biru-100 shadow-xs">
                  {isHealthLoading ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-biru-200 animate-pulse" />
                      <span className="font-mono text-[11px] text-biru-200">
                        Memeriksa API...
                      </span>
                    </>
                  ) : isHealthError ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-biru-200" />
                      <span className="font-medium text-[11px]">
                        API Offline
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-biru-200" />
                      <span className="font-medium text-[11px]">
                        API{" "}
                        {healthData?.status === "ok" ? "Online" : "Degraded"}
                        <span className="opacity-80 ml-1.5 font-mono text-[10px]">
                          (DB: {healthData?.database} | Redis:{" "}
                          {healthData?.redis})
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-putih leading-[1.15]">
                Membangun Pemimpin Unggul bersama{" "}
                <span className="text-biru-200 underline decoration-biru-500 underline-offset-8">
                  Triputra Group
                </span>
              </h1>

              <p className="text-base sm:text-lg text-biru-100 leading-relaxed max-w-2xl font-light">
                Universitas Pignatelli Triputra menghadirkan kurikulum berbasis
                industri, magang prioritas, dan beasiswa prestasi penuh untuk
                mencetak talenta masa depan yang berdaya saing global.
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link to="/register">
                  <Button
                    variant="primary"
                    size="lg"
                    className="gap-2 bg-biru-600 hover:bg-biru-500 border-biru-500 text-putih shadow-lg shadow-biru-950/40"
                  >
                    <span>Daftar Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/prodi">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-biru-200 text-biru-100 hover:bg-biru-800 hover:text-putih"
                  >
                    <span>Eksplorasi Program Studi</span>
                  </Button>
                </Link>
              </div>

              {/* Status Ringkas */}
              <div className="pt-6 border-t border-biru-800/80 grid grid-cols-3 gap-4 text-left">
                <div>
                  <p className="text-2xl font-serif font-bold text-putih">5</p>
                  <p className="text-xs text-biru-200">
                    Program Studi Unggulan
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-serif font-bold text-putih">
                    100%
                  </p>
                  <p className="text-xs text-biru-200">
                    Kemitraan Industri Nyata
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-serif font-bold text-putih">
                    Gel. 1
                  </p>
                  <p className="text-xs text-biru-200">Pendaftaran Dibuka</p>
                </div>
              </div>
            </div>

            {/* Hero Card Visual: Kartu Info PMB */}
            <div className="lg:col-span-5">
              <div className="bg-putih/95 backdrop-blur-md rounded-3xl p-8 border-2 border-biru-200 shadow-2xl text-biru-950 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-biru-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-biru-100 flex items-center justify-center text-biru-800">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-base text-biru-950">
                        Jalur Penerimaan Aktif
                      </h3>
                      <p className="text-xs text-biru-800">
                        Gelombang 1 (Early Bird)
                      </p>
                    </div>
                  </div>
                  <StatusBadge status="berhasil" label="Dibuka" size="sm" />
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-biru-50">
                    <span className="text-biru-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-biru-600" />
                      Periode Pendaftaran
                    </span>
                    <span className="font-semibold text-biru-950">
                      1 Okt - 31 Des 2026
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-biru-50">
                    <span className="text-biru-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-biru-600" />
                      Biaya Formulir
                    </span>
                    <span className="font-semibold text-biru-950">
                      Rp 250.000
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-biru-50">
                    <span className="text-biru-800 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-biru-600" />
                      Sistem Seleksi
                    </span>
                    <span className="font-semibold text-biru-950">
                      CBT & Nilai Rapor
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-biru-50 border border-biru-100 text-xs text-biru-900 leading-relaxed">
                  <span className="font-bold">Keuntungan Gelombang 1:</span>{" "}
                  Potongan biaya formulir Rp 50.000 dengan kode voucher{" "}
                  <span className="font-mono font-bold text-biru-700">
                    TRIPUTRA2026
                  </span>{" "}
                  dan prioritas penempatan kuota.
                </div>

                <Link to="/register" className="block">
                  <Button variant="primary" size="md" className="w-full">
                    Mulai Pendaftaran Online
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KEUNGGULAN INSTITUSI */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <h2 className="font-serif text-3xl font-bold text-biru-950">
            Mengapa Universitas Pignatelli Triputra?
          </h2>
          <p className="text-sm text-biru-800/90 leading-relaxed">
            Pendidikan terintegrasi yang menjembatani kurikulum akademis dengan
            kebutuhan nyata dunia usaha dan industri.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="hover:border-biru-500 transition-all hover:shadow-lg space-y-4">
            <div className="w-12 h-12 rounded-xl bg-biru-100 flex items-center justify-center text-biru-700 border border-biru-200">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-biru-950">
              Koneksi Ekosistem Triputra
            </h3>
            <p className="text-sm text-biru-800/80 leading-relaxed">
              Didukung langsung oleh jaringan puluhan anak perusahaan Triputra
              Group untuk program magang terstruktur, studi kasus industri, dan
              prioritas rekrutmen lulusan.
            </p>
          </Card>

          <Card className="hover:border-biru-500 transition-all hover:shadow-lg space-y-4">
            <div className="w-12 h-12 rounded-xl bg-biru-100 flex items-center justify-center text-biru-700 border border-biru-200">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-biru-950">
              Dosen Praktisi & Akademisi
            </h3>
            <p className="text-sm text-biru-800/80 leading-relaxed">
              Pengajar terdiri dari akademisi bergelar doktor dan master serta
              praktisi profesional berpengalaman di industri teknologi,
              agribisnis, manufaktur, dan keuangan.
            </p>
          </Card>

          <Card className="hover:border-biru-500 transition-all hover:shadow-lg space-y-4">
            <div className="w-12 h-12 rounded-xl bg-biru-100 flex items-center justify-center text-biru-700 border border-biru-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-biru-950">
              Beasiswa Berkelanjutan
            </h3>
            <p className="text-sm text-biru-800/80 leading-relaxed">
              Tersedia berbagai skema beasiswa prestasi akademik, beasiswa jalur
              kemitraan Triputra, dan bantuan biaya pendidikan untuk calon
              mahasiswa berpotensi tinggi.
            </p>
          </Card>
        </div>
      </section>

      {/* KALKULATOR VOUCHER & SIMULASI BIAYA */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-biru-50/70 border border-biru-200 rounded-3xl p-8 sm:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biru-100 text-biru-900 text-xs font-semibold">
                <Calculator className="w-3.5 h-3.5 text-biru-700" />
                <span>Simulasi Biaya & Diskon Voucher</span>
              </div>
              <h2 className="font-serif text-3xl font-bold text-biru-950 leading-tight">
                Transparansi Biaya Pendidikan Tanpa Biaya Tersembunyi
              </h2>
              <p className="text-sm text-biru-800/90 leading-relaxed">
                Kalkulasikan estimasi biaya pendaftaran formulir dan biaya
                kuliah semester awal (UKT) secara instan dengan memanfaatkan
                promo voucher resmi.
              </p>

              <div className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-biru-900 uppercase tracking-wider mb-2">
                    Pilih Program Studi
                  </label>
                  <select
                    className="w-full bg-putih border border-biru-200 rounded-xl px-4 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none"
                    value={selectedProdiUkt}
                    onChange={(e) =>
                      setSelectedProdiUkt(Number(e.target.value))
                    }
                  >
                    <option value={7000000}>
                      S1 Informatika (UKT Rp 7.000.000 / semester)
                    </option>
                    <option value={6800000}>
                      S1 Sistem Informasi (UKT Rp 6.800.000 / semester)
                    </option>
                    <option value={6500000}>
                      S1 Manajemen Bisnis (UKT Rp 6.500.000 / semester)
                    </option>
                    <option value={6500000}>
                      S1 Akuntansi (UKT Rp 6.500.000 / semester)
                    </option>
                    <option value={5000000}>
                      D3 Manajemen Informatika (UKT Rp 5.000.000 / semester)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-biru-900 uppercase tracking-wider mb-2">
                    Kode Voucher Diskon Formulir
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      placeholder="Masukkan kode voucher"
                      className="flex-1 bg-putih border border-biru-200 rounded-xl px-4 py-2 text-sm text-biru-950 focus:border-biru-600 uppercase"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setVoucherApplied(
                          voucherCode.trim().toUpperCase() === "TRIPUTRA2026",
                        )
                      }
                    >
                      Terapkan
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Hasil Ringkasan Biaya */}
            <div className="lg:col-span-6 bg-putih border-2 border-biru-200 rounded-2xl p-6 shadow-md space-y-4">
              <h3 className="font-serif text-xl font-bold text-biru-950 pb-3 border-b border-biru-100">
                Rincian Estimasi Biaya
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 text-biru-800">
                  <span>Biaya Formulir Pendaftaran:</span>
                  <span className="font-semibold text-biru-950">
                    Rp {biayaFormulir.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-biru-700">
                  <span>
                    Potongan Voucher (
                    {voucherApplied
                      ? voucherCode.toUpperCase()
                      : "Tanpa Voucher"}
                    ):
                  </span>
                  <span className="font-semibold">
                    - Rp {diskonFormulir.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t border-dashed border-biru-200 font-bold text-base text-biru-950">
                  <span>Total Biaya Formulir:</span>
                  <span className="text-biru-700">
                    Rp {totalBiayaFormulir.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t border-biru-100 text-sm text-biru-800">
                  <span>Estimasi UKT Semester 1:</span>
                  <span className="font-semibold text-biru-950">
                    Rp {selectedProdiUkt.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-biru-50 border border-biru-100 rounded-xl text-xs text-biru-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-biru-700 shrink-0" />
                <span>
                  Biaya UKT sudah termasuk SKS, praktikum laboratorium, dan
                  asuransi kemahasiswaan.
                </span>
              </div>

              <Link to="/register" className="block pt-2">
                <Button variant="primary" size="md" className="w-full">
                  Klaim Diskon & Daftar Sekarang
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
