import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  Briefcase,
  ChevronDown,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Button, Card } from "../../components/common";
import { SeoHead } from "../../components/common/SeoHead";
import type { components } from "../../types/api";

type CmsPost = components["schemas"]["CmsPostResponse"];
type CmsFaq = components["schemas"]["CmsFaqResponse"];

// Mock closing date gelombang aktif: 31 Juli 2026 (atau 30 hari ke depan)
const GELOMBANG_TARGET_DATE = new Date("2026-07-31T23:59:59").getTime();

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const HomePage: React.FC = () => {
  // 1. Countdown Timer Gelombang Aktif
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = Math.max(0, GELOMBANG_TARGET_DATE - now);

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch Berita / Pengumuman CMS
  const { data: postsData } = useQuery<CmsPost[]>({
    queryKey: ["cms-posts-home"],
    queryFn: async () => {
      const res = await fetch("/api/cms/posts");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 3. Fetch FAQ CMS
  const { data: faqsData } = useQuery<CmsFaq[]>({
    queryKey: ["cms-faqs-home"],
    queryFn: async () => {
      const res = await fetch("/api/cms/faqs");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 4. State FAQ Akordion
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // 5. State Simulasi Kalkulator UKT
  const [selectedProdi, setSelectedProdi] = useState<string>("S1-SD");
  const [selectedJalur, setSelectedJalur] = useState<string>("reguler");
  const [voucherCode, setVoucherCode] = useState<string>("TRIPUTRA2026");
  const [voucherApplied, setVoucherApplied] = useState<boolean>(true);

  const PRODI_DATA: Record<
    string,
    {
      nama: string;
      jenjang: string;
      fakultas: string;
      akreditasi: string;
      uktMin: number;
      uktMax: number;
      dpp: number;
    }
  > = {
    "S1-SD": {
      nama: "Sains Data",
      jenjang: "S1",
      fakultas: "Sains & Teknologi",
      akreditasi: "Baik Sekali",
      uktMin: 5500000,
      uktMax: 7000000,
      dpp: 8000000,
    },
    "S1-TI": {
      nama: "Teknologi Informasi",
      jenjang: "S1",
      fakultas: "Sains & Teknologi",
      akreditasi: "Baik Sekali",
      uktMin: 5000000,
      uktMax: 6500000,
      dpp: 7500000,
    },
    "S1-SI": {
      nama: "Sistem Informasi",
      jenjang: "S1",
      fakultas: "Sains & Teknologi",
      akreditasi: "Baik Sekali",
      uktMin: 4800000,
      uktMax: 6200000,
      dpp: 7000000,
    },
    "S1-MN": {
      nama: "Manajemen",
      jenjang: "S1",
      fakultas: "Ekonomi & Bisnis",
      akreditasi: "Unggul",
      uktMin: 4500000,
      uktMax: 6000000,
      dpp: 6500000,
    },
    "S1-AK": {
      nama: "Akuntansi",
      jenjang: "S1",
      fakultas: "Ekonomi & Bisnis",
      akreditasi: "Baik Sekali",
      uktMin: 4500000,
      uktMax: 6000000,
      dpp: 6500000,
    },
    "D3-KP": {
      nama: "Keuangan & Perbankan",
      jenjang: "D3",
      fakultas: "Vokasi",
      akreditasi: "Baik Sekali",
      uktMin: 3500000,
      uktMax: 4800000,
      dpp: 5000000,
    },
  };

  const currentProdi = PRODI_DATA[selectedProdi] || PRODI_DATA["S1-SD"];

  // Perhitungan diskon & simulasi biaya formulir
  const biayaFormulir = 250000;
  const diskonFormulir =
    voucherApplied && voucherCode.trim().toUpperCase() === "TRIPUTRA2026"
      ? 50000
      : 0;
  const totalFormulir = biayaFormulir - diskonFormulir;

  return (
    <div className="space-y-24 pb-20">
      <SeoHead
        title="PMB UPITRA 2026/2027 | Universitas Pignatelli Triputra"
        description="Penerimaan Mahasiswa Baru Universitas Pignatelli Triputra Surakarta. Tersedia Jalur Reguler, Prestasi Rapor, Beasiswa Triputra Group, dan Jalur RPL."
      />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION DENGAN ROYAL BLUE GRADIENT & COUNTDOWN */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-biru-950 via-biru-900 to-biru-800 text-putih py-20 lg:py-28 border-b border-biru-800 shadow-soft-lg">
        {/* Subtle Background Elements */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-biru-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-biru-500/15 blur-3xl pointer-events-none" />

        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Teks Hero */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-biru-800/80 border border-biru-500/40 text-biru-100 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-biru-300" />
                <span>Penerimaan Mahasiswa Baru T.A. 2026/2027 Dibuka</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-putih leading-[1.12]">
                Membangun Pemimpin Unggul bersama{" "}
                <span className="text-biru-200 underline decoration-biru-400 decoration-wavy decoration-1 underline-offset-8">
                  Universitas Pignatelli Triputra
                </span>
              </h1>

              <p className="text-base sm:text-lg text-biru-100 leading-relaxed font-sans max-w-2xl">
                Wujudkan masa depan gemilang dengan pendidikan tinggi
                berkarakter, fasilitas laboratorium mutakhir, dan jalur karier
                langsung bersama jejaring industri{" "}
                <strong>Triputra Group</strong>.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link to="/register">
                  <Button
                    variant="primary"
                    size="lg"
                    className="shadow-soft-md bg-putih text-biru-950 hover:bg-biru-50 font-bold"
                    rightIcon={<ArrowRight className="w-4 h-4 text-biru-900" />}
                  >
                    Daftar Sekarang
                  </Button>
                </Link>
                <Link to="/jalur-masuk">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-biru-300 text-putih hover:bg-biru-800/60 font-semibold"
                  >
                    Pelajari Jalur Masuk
                  </Button>
                </Link>
                <Link to="/cek-kelulusan">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="text-biru-200 hover:text-putih hover:bg-biru-800/40 font-medium"
                    leftIcon={
                      <GraduationCap className="w-4 h-4 text-biru-300" />
                    }
                  >
                    Cek Hasil Kelulusan
                  </Button>
                </Link>
              </div>

              {/* Keunggulan Ringkas */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-biru-800/80 text-xs text-biru-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-biru-400 shrink-0" />
                  <span>Akreditasi Institusi Baik Sekali</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-biru-400 shrink-0" />
                  <span>Beasiswa s.d. 100% UKT</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-biru-400 shrink-0" />
                  <span>Kemitraan Industri Nyata</span>
                </div>
              </div>
            </div>

            {/* Countdown Box & Card Gelombang */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-biru-700/60 bg-biru-900/90 backdrop-blur-md p-6 sm:p-8 shadow-soft-lg space-y-6">
                <div className="flex items-center justify-between border-b border-biru-800 pb-4">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-biru-500/20 text-biru-200 border border-biru-400/30 mb-1">
                      Gelombang 1
                    </span>
                    <h2 className="font-serif text-xl font-bold text-putih">
                      Early Bird Admissions
                    </h2>
                  </div>
                  <Calendar className="w-6 h-6 text-biru-300" />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-biru-200 font-medium">
                    Batas Akhir Pendaftaran & Verifikasi:
                  </p>
                  <p className="text-sm font-semibold text-putih">
                    Jumat, 31 Juli 2026 &bull; 23:59 WIB
                  </p>
                </div>

                {/* Counter Grid */}
                <div className="grid grid-cols-4 gap-2.5 text-center">
                  <div className="rounded-xl bg-biru-950/80 border border-biru-800 p-2.5">
                    <span className="font-mono text-2xl sm:text-3xl font-extrabold text-putih">
                      {String(timeLeft.days).padStart(2, "0")}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-biru-300 mt-0.5">
                      Hari
                    </span>
                  </div>
                  <div className="rounded-xl bg-biru-950/80 border border-biru-800 p-2.5">
                    <span className="font-mono text-2xl sm:text-3xl font-extrabold text-putih">
                      {String(timeLeft.hours).padStart(2, "0")}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-biru-300 mt-0.5">
                      Jam
                    </span>
                  </div>
                  <div className="rounded-xl bg-biru-950/80 border border-biru-800 p-2.5">
                    <span className="font-mono text-2xl sm:text-3xl font-extrabold text-putih">
                      {String(timeLeft.minutes).padStart(2, "0")}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-biru-300 mt-0.5">
                      Menit
                    </span>
                  </div>
                  <div className="rounded-xl bg-biru-950/80 border border-biru-800 p-2.5">
                    <span className="font-mono text-2xl sm:text-3xl font-extrabold text-biru-300 animate-pulse">
                      {String(timeLeft.seconds).padStart(2, "0")}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-biru-300 mt-0.5">
                      Detik
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-biru-950/60 border border-biru-800/80 p-3.5 text-xs text-biru-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-putih">
                    <Clock className="w-3.5 h-3.5 text-biru-400" />
                    <span>Keuntungan Gelombang 1:</span>
                  </div>
                  <p>
                    &bull; Potongan Dana Pengembangan Pendidikan (DPP) Rp
                    2.000.000
                  </p>
                  <p>&bull; Peluang beasiswa kemitraan prioritas utama</p>
                </div>

                <Link to="/register" className="block">
                  <Button
                    variant="primary"
                    className="w-full bg-putih text-biru-950 hover:bg-biru-50 font-bold text-sm py-2.5"
                    rightIcon={<ArrowRight className="w-4 h-4 text-biru-900" />}
                  >
                    Amankan Kuota Anda Sekarang
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. RINGKASAN JALUR PENERIMAAN (4 JALUR MASUK) */}
      {/* ========================================================================= */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-100 text-biru-800">
            Pilihan Jalur Masuk
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-biru-950">
            Jalur Penerimaan Sesuai Potensi Anda
          </h2>
          <p className="text-sm text-biru-700 leading-relaxed font-sans">
            Tersedia berbagai pilihan jalur masuk dengan seleksi objektif,
            fleksibel, serta fasilitas beasiswa prestasi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Jalur 1: Reguler CBT */}
          <Card className="p-6 flex flex-col justify-between hover:shadow-soft-lg transition-all border-biru-200 hover:border-biru-400">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-biru-100 flex items-center justify-center text-biru-800">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-biru-600">
                  Ujian Mandiri
                </span>
                <h3 className="font-serif text-xl font-bold text-biru-950 mt-1">
                  Jalur Reguler (CBT)
                </h3>
              </div>
              <p className="text-xs text-biru-700 leading-relaxed">
                Seleksi berbasis ujian Computer-Based Test online mandiri. Ujian
                fleksibel dapat dikerjakan dari rumah atau laboratorium kampus.
              </p>
              <ul className="text-xs text-biru-800 space-y-1.5 pt-2 border-t border-biru-100">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-biru-600 shrink-0" />
                  <span>Terbuka semua jurusan SMA/SMK/MA</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-biru-600 shrink-0" />
                  <span>Hasil nilai langsung diumumkan</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link to="/jalur-masuk#reguler" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold"
                >
                  Detail Jalur Reguler &rarr;
                </Button>
              </Link>
            </div>
          </Card>

          {/* Jalur 2: Prestasi Unggul */}
          <Card className="p-6 flex flex-col justify-between hover:shadow-soft-lg transition-all border-biru-200 hover:border-biru-400">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-biru-100 flex items-center justify-center text-biru-800">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-biru-600">
                  Bebas Tes CBT
                </span>
                <h3 className="font-serif text-xl font-bold text-biru-950 mt-1">
                  Jalur Prestasi Rapor
                </h3>
              </div>
              <p className="text-xs text-biru-700 leading-relaxed">
                Seleksi penilaian nilai rapor semester 1-5 atau sertifikat
                kejuaraan akademik/non-akademik tingkat kota, provinsi, dan
                nasional.
              </p>
              <ul className="text-xs text-biru-800 space-y-1.5 pt-2 border-t border-biru-100">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-biru-600 shrink-0" />
                  <span>Rata-rata nilai rapor &ge; 80.0</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-biru-600 shrink-0" />
                  <span>Peluang beasiswa potongan UKT</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link to="/jalur-masuk#prestasi" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold"
                >
                  Detail Jalur Prestasi &rarr;
                </Button>
              </Link>
            </div>
          </Card>

          {/* Jalur 3: Beasiswa Triputra */}
          <Card className="p-6 flex flex-col justify-between hover:shadow-soft-lg transition-all border-biru-300 bg-gradient-to-b from-biru-50/50 to-putih">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-biru-900 text-putih flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-biru-700">
                  Beasiswa Penuh & Ikatan Kerja
                </span>
                <h3 className="font-serif text-xl font-bold text-biru-950 mt-1">
                  Kemitraan Triputra
                </h3>
              </div>
              <p className="text-xs text-biru-700 leading-relaxed">
                Program beasiswa prestisius dari Triputra Group mencakup biaya
                pendidikan penuh, uang saku, dan program magang bersertifikasi.
              </p>
              <ul className="text-xs text-biru-800 space-y-1.5 pt-2 border-t border-biru-200">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-biru-600 shrink-0" />
                  <span>Biaya kuliah 100% ditanggung</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-biru-600 shrink-0" />
                  <span>Kesempatan karier di Triputra</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link to="/jalur-masuk#beasiswa" className="block">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full text-xs font-bold"
                >
                  Daftar Beasiswa &rarr;
                </Button>
              </Link>
            </div>
          </Card>

          {/* Jalur 4: Jalur RPL */}
          <Card className="p-6 flex flex-col justify-between hover:shadow-soft-lg transition-all border-biru-200 hover:border-biru-400">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-biru-100 flex items-center justify-center text-biru-800">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-biru-600">
                  Konversi Pengalaman Kerja
                </span>
                <h3 className="font-serif text-xl font-bold text-biru-950 mt-1">
                  Jalur RPL (Tipe A)
                </h3>
              </div>
              <p className="text-xs text-biru-700 leading-relaxed">
                Rekognisi Pembelajaran Lampau untuk pekerja, profesional, atau
                lulusan D3/pindahan. Pengalaman kerja diakui hingga puluhan SKS.
              </p>
              <ul className="text-xs text-biru-800 space-y-1.5 pt-2 border-t border-biru-100">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-biru-600 shrink-0" />
                  <span>Lulus Sarjana dalam 2-3 semester</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-biru-600 shrink-0" />
                  <span>Asesmen portofolio terstruktur</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link to="/jalur-masuk#rpl" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold"
                >
                  Detail Jalur RPL &rarr;
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PROGRAM STUDI UNGGULAN & AKREDITASI */}
      {/* ========================================================================= */}
      <section className="bg-biru-50/70 py-16 border-y border-biru-100">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-200 text-biru-900 mb-2">
                Fakultas & Jurusan
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-biru-950">
                Program Studi Unggulan
              </h2>
              <p className="text-sm text-biru-700 font-sans mt-1">
                Kurikulum terapan berstandar industri dengan fokus teknologi
                masa depan.
              </p>
            </div>
            <Link to="/prodi">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold"
              >
                Lihat Seluruh Prodi (6) &rarr;
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(PRODI_DATA).map(([key, prodi]) => (
              <Card
                key={key}
                className="p-6 bg-putih border-biru-200 hover:border-biru-400 hover:shadow-soft-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-biru-100 text-biru-900">
                      {prodi.jenjang}
                    </span>
                    <span className="text-[11px] font-semibold text-biru-700 bg-biru-50 px-2 py-0.5 rounded border border-biru-200">
                      Akreditasi: {prodi.akreditasi}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-biru-950">
                      {prodi.nama}
                    </h3>
                    <p className="text-xs text-biru-600 mt-0.5 font-medium">
                      Fakultas {prodi.fakultas}
                    </p>
                  </div>
                  <p className="text-xs text-biru-700 leading-relaxed">
                    Mempersiapkan lulusan berdaya saing dengan kompetensi
                    praktis, sertifikasi internasional, dan bimbingan praktisi
                    Triputra.
                  </p>
                  <div className="pt-2 text-xs border-t border-biru-100 flex items-center justify-between text-biru-800">
                    <span>Estimasi UKT:</span>
                    <span className="font-semibold text-biru-950">
                      Rp {(prodi.uktMin / 1000000).toFixed(1)} &ndash;{" "}
                      {(prodi.uktMax / 1000000).toFixed(1)} Jt / smt
                    </span>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-biru-100 flex items-center justify-between">
                  <Link
                    to={`/prodi/${key}`}
                    className="text-xs font-bold text-biru-800 hover:text-biru-950 hover:underline inline-flex items-center gap-1"
                  >
                    Profil Lengkap & Kurikulum
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link to={`/register?prodi=${key}`}>
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs py-1.5 px-3"
                    >
                      Pilih Prodi
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. ALUR PENDAFTARAN (5 LANGKAH MUDAH) */}
      {/* ========================================================================= */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-100 text-biru-800">
            Proses Mudah & Transparan
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-biru-950">
            5 Langkah Alur Pendaftaran PMB
          </h2>
          <p className="text-sm text-biru-700 leading-relaxed font-sans">
            Seluruh tahapan seleksi dilakukan secara digital, transparan, dan
            dapat dipantau langsung melalui portal calon mahasiswa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {[
            {
              step: "01",
              title: "Buat Akun",
              desc: "Daftar dengan email dan nomor WhatsApp aktif untuk mendapatkan akses portal PMB.",
            },
            {
              step: "02",
              title: "Biaya Formulir",
              desc: "Bayar tagihan formulir melalui Virtual Account (BCA, Mandiri, BRI) atau QRIS instan.",
            },
            {
              step: "03",
              title: "Isi Biodata & Berkas",
              desc: "Lengkapi formulir dinamis, pilih program studi pilihan, dan unggah dokumen pendukung.",
            },
            {
              step: "04",
              title: "Ujian CBT Online",
              desc: "Ikuti tes potensi akademik online dengan sistem CBT modern yang aman dan otomatis.",
            },
            {
              step: "05",
              title: "Pengumuman & NIM",
              desc: "Dapatkan Letter of Acceptance (LoA) resmi, registrasi ulang, dan peroleh NIM resmi.",
            },
          ].map((item, idx) => (
            <div
              key={item.step}
              className="relative p-5 rounded-2xl border border-biru-200 bg-putih shadow-soft-sm hover:shadow-soft-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <span className="font-mono text-3xl font-extrabold text-biru-200 block">
                  {item.step}
                </span>
                <h3 className="font-serif text-lg font-bold text-biru-950">
                  {item.title}
                </h3>
                <p className="text-xs text-biru-700 leading-relaxed font-sans">
                  {item.desc}
                </p>
              </div>
              <div className="pt-4 text-[11px] font-semibold text-biru-600 flex items-center gap-1">
                <span>Tahap {idx + 1}</span>
                <span className="h-1 w-1 rounded-full bg-biru-400" />
                <span className="text-biru-500">100% Online</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SIMULASI BIAYA & UKT INTERAKTIF */}
      {/* ========================================================================= */}
      <section className="bg-biru-950 text-putih py-16 border-y border-biru-900">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Info Kiri */}
            <div className="lg:col-span-5 space-y-5">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-800 text-biru-200 border border-biru-700">
                Transparansi Biaya
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-putih">
                Simulasi Biaya &amp; Skema Pembayaran
              </h2>
              <p className="text-sm text-biru-200 leading-relaxed font-sans">
                Kalkulasikan estimasi biaya kuliah per semester untuk program
                studi pilihan Anda. Tersedia skema cicilan 0% dan voucher
                potongan pendaftaran.
              </p>

              <div className="space-y-3 pt-2 text-xs text-biru-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-biru-400 shrink-0" />
                  <span>Tidak ada biaya tersembunyi / praktikum tambahan</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-biru-400 shrink-0" />
                  <span>
                    Dukungan cicilan hingga 3x pembayaran per semester
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-biru-400 shrink-0" />
                  <span>
                    Beasiswa berlaku selama masa studi aktif sesuai IPK
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link to="/biaya">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-biru-400 text-putih hover:bg-biru-900"
                  >
                    Lihat Matriks Biaya Selengkapnya &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            {/* Kotak Interaktif Kanan */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-biru-800 bg-biru-900/90 p-6 sm:p-8 shadow-soft-lg space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Program Studi */}
                  <div>
                    <label className="block text-xs font-semibold text-biru-200 mb-1.5">
                      Pilih Program Studi:
                    </label>
                    <select
                      value={selectedProdi}
                      onChange={(e) => setSelectedProdi(e.target.value)}
                      className="w-full rounded-xl border border-biru-700 bg-biru-950 px-3.5 py-2.5 text-sm text-putih focus:border-biru-400 focus:outline-none"
                    >
                      {Object.entries(PRODI_DATA).map(([key, p]) => (
                        <option
                          key={key}
                          value={key}
                          className="bg-biru-950 text-putih"
                        >
                          {p.jenjang} - {p.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Jalur Masuk */}
                  <div>
                    <label className="block text-xs font-semibold text-biru-200 mb-1.5">
                      Pilih Jalur Masuk:
                    </label>
                    <select
                      value={selectedJalur}
                      onChange={(e) => setSelectedJalur(e.target.value)}
                      className="w-full rounded-xl border border-biru-700 bg-biru-950 px-3.5 py-2.5 text-sm text-putih focus:border-biru-400 focus:outline-none"
                    >
                      <option value="reguler">Jalur Reguler (Tes CBT)</option>
                      <option value="prestasi">Jalur Prestasi Rapor</option>
                      <option value="beasiswa">Beasiswa Triputra</option>
                      <option value="rpl">Jalur RPL (Konversi SKS)</option>
                    </select>
                  </div>
                </div>

                {/* Input Kode Voucher */}
                <div className="rounded-xl border border-biru-800 bg-biru-950 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-biru-200">
                      Gunakan Kode Voucher Pendaftaran:
                    </span>
                    <span className="text-[11px] text-biru-400">
                      Contoh: TRIPUTRA2026
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      placeholder="Masukkan kode voucher"
                      className="flex-1 rounded-lg border border-biru-700 bg-biru-900 px-3 py-2 text-xs text-putih uppercase focus:border-biru-400 focus:outline-none"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setVoucherApplied(true)}
                      className="text-xs bg-biru-700 hover:bg-biru-600 text-putih"
                    >
                      Terapkan
                    </Button>
                  </div>
                  {voucherApplied && diskonFormulir > 0 && (
                    <p className="text-xs text-biru-300 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-biru-400" />
                      Voucher berhasil! Potongan Rp 50.000 untuk formulir
                      pendaftaran.
                    </p>
                  )}
                </div>

                {/* Rincian Hasil Perhitungan */}
                <div className="rounded-xl bg-biru-950/70 border border-biru-800 p-4 space-y-2.5 text-xs text-biru-200">
                  <div className="flex items-center justify-between">
                    <span>Biaya Formulir Pendaftaran:</span>
                    <span className="font-mono text-sm text-putih font-semibold">
                      Rp {totalFormulir.toLocaleString("id-ID")}
                      {diskonFormulir > 0 && (
                        <span className="line-through text-biru-400 text-xs ml-2">
                          Rp 250.000
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estimasi UKT per Semester:</span>
                    <span className="font-mono text-sm text-putih font-bold">
                      Rp {currentProdi.uktMin.toLocaleString("id-ID")} &ndash;
                      Rp {currentProdi.uktMax.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Dana Pengembangan Pendidikan (DPP):</span>
                    <span className="font-mono text-sm text-putih font-semibold">
                      Rp {currentProdi.dpp.toLocaleString("id-ID")}
                      <span className="text-[11px] text-biru-400 ml-1.5">
                        (Hanya semester 1)
                      </span>
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to={`/register?prodi=${selectedProdi}&jalur=${selectedJalur}`}
                  >
                    <Button
                      variant="primary"
                      className="w-full bg-putih text-biru-950 hover:bg-biru-50 font-bold text-sm py-2.5"
                    >
                      Lanjutkan Pendaftaran dengan Pilihan Ini &rarr;
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. BERITA & PENGUMUMAN PMB TERKINI */}
      {/* ========================================================================= */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-100 text-biru-800 mb-2">
              Kabar Kampus
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-biru-950">
              Berita &amp; Pengumuman Terbaru
            </h2>
            <p className="text-sm text-biru-700 font-sans mt-1">
              Informasi terkini mengenai jadwal seleksi, beasiswa, dan panduan
              akademik.
            </p>
          </div>
          <Link to="/pengumuman">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold"
            >
              Lihat Semua Berita &rarr;
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(postsData && postsData.length > 0
            ? postsData.slice(0, 3)
            : [
                {
                  id: "1",
                  slug: "penerimaan-mahasiswa-baru-2026-resmi-dibuka",
                  judul:
                    "Pendaftaran Mahasiswa Baru T.A. 2026/2027 Resmi Dibuka",
                  kategori: "PENGUMUMAN",
                  ringkasan:
                    "Universitas Pignatelli Triputra membuka kesempatan emas bagi calon mahasiswa baru berprestasi untuk bergabung.",
                  published_at: "2026-11-01T08:00:00Z",
                  author_nama: "Humas PMB",
                },
                {
                  id: "2",
                  slug: "panduan-beasiswa-kemitraan-triputra-group",
                  judul: "Panduan Beasiswa Penuh Kemitraan Triputra Group",
                  kategori: "BEASISWA",
                  ringkasan:
                    "Dapatkan pembebasan biaya kuliah 100% dan program kepemimpinan intensif bersama jajaran pimpinan Triputra.",
                  published_at: "2026-10-28T09:00:00Z",
                  author_nama: "Humas PMB",
                },
                {
                  id: "3",
                  slug: "jalur-rpl-kesempatan-sarjana-praktisi",
                  judul:
                    "Jalur Rekognisi Pembelajaran Lampau (RPL) untuk Praktisi Kerja",
                  kategori: "BERITA",
                  ringkasan:
                    "Konversikan pengalaman kerja nyata Anda menjadi SKS perkuliahan resmi di UPITRA.",
                  published_at: "2026-10-25T10:00:00Z",
                  author_nama: "Tim Akademik",
                },
              ]
          ).map((post) => (
            <Card
              key={post.id}
              className="p-6 border-biru-200 hover:border-biru-400 hover:shadow-soft-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-biru-600">
                  <span className="font-semibold px-2 py-0.5 rounded bg-biru-100 text-biru-800">
                    {post.kategori}
                  </span>
                  <span>
                    {new Date(post.published_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-biru-950 leading-snug hover:text-biru-800">
                  <Link to={`/pengumuman/${post.slug}`}>{post.judul}</Link>
                </h3>
                <p className="text-xs text-biru-700 leading-relaxed line-clamp-3">
                  {post.ringkasan}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-biru-100 flex items-center justify-between text-xs">
                <span className="text-biru-600 font-medium">
                  {post.author_nama}
                </span>
                <Link
                  to={`/pengumuman/${post.slug}`}
                  className="font-bold text-biru-800 hover:text-biru-950 inline-flex items-center gap-1"
                >
                  Baca Selengkapnya
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FAQ AKORDION INTERAKTIF */}
      {/* ========================================================================= */}
      <section className="bg-biru-50/70 py-16 border-t border-biru-100">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6">
          <div className="text-center space-y-3 mb-12">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-200 text-biru-900">
              Pertanyaan Umum
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-biru-950">
              Kerap Ditanyakan Calon Mahasiswa (FAQ)
            </h2>
            <p className="text-sm text-biru-700 font-sans">
              Jawaban cepat untuk hal-hal seputar pendaftaran, biaya, ujian CBT,
              dan beasiswa.
            </p>
          </div>

          <div className="space-y-3.5">
            {(faqsData && faqsData.length > 0
              ? faqsData.slice(0, 6)
              : [
                  {
                    id: "1",
                    pertanyaan:
                      "Apakah pendaftaran PMB UPITRA bisa dilakukan secara online penuh?",
                    jawaban:
                      "Ya! Seluruh proses pendaftaran, pembayaran formulir, pengunggahan berkas, pelaksanaan ujian CBT potensi akademik, hingga pengumuman kelulusan dapat diselesaikan 100% online.",
                  },
                  {
                    id: "2",
                    pertanyaan:
                      "Bagaimana cara mendapatkan Beasiswa Penuh Kemitraan Triputra?",
                    jawaban:
                      "Pilih Jalur Beasiswa Kemitraan saat mendaftar, unggah bukti prestasi akademik (rata-rata rapor minimal 85.0), dan ikuti wawancara motivasi bersama panelis rektorat & Triputra Group.",
                  },
                  {
                    id: "3",
                    pertanyaan:
                      "Apakah ada biaya praktikum atau biaya SKS terpisah selain UKT?",
                    jawaban:
                      "Tidak ada. Sistem Uang Kuliah Tunggal (UKT) di UPITRA sudah mencakup seluruh biaya perkuliahan, praktikum laboratorium, ujian semester, serta akses perpustakaan digital.",
                  },
                  {
                    id: "4",
                    pertanyaan:
                      "Berapa lama masa tunggu pengumuman kelulusan setelah ujian CBT?",
                    jawaban:
                      "Nilai ujian CBT dihitung secara instan. Hasil sidang penetapan kelulusan resmi dapat dicek di portal dalam waktu 1x24 jam setelah sesi ujian selesai.",
                  },
                  {
                    id: "5",
                    pertanyaan:
                      "Apa syarat utama untuk mendaftar melalui Jalur Rekognisi Pembelajaran Lampau (RPL)?",
                    jawaban:
                      "Memiliki pengalaman kerja relevan minimal 2 tahun atau sertifikat kompetensi profesional. Calon dapat mengajukan mata kuliah untuk dikonversi menjadi SKS resmi.",
                  },
                ]
            ).map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={faq.id}
                  className="rounded-xl border border-biru-200 bg-putih overflow-hidden shadow-soft-xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-serif text-base font-bold text-biru-950 hover:bg-biru-50/50 transition-colors"
                  >
                    <span>{faq.pertanyaan}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-biru-600 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-biru-900" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 pt-0 text-sm text-biru-800 leading-relaxed font-sans border-t border-biru-100/60 mt-1">
                      <p>{faq.jawaban}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-biru-700">
              Masih memiliki pertanyaan lain yang belum terjawab?{" "}
              <Link
                to="/faq"
                className="font-bold text-biru-900 underline hover:text-biru-700"
              >
                Kunjungi Halaman FAQ Lengkap
              </Link>{" "}
              atau{" "}
              <Link
                to="/kontak"
                className="font-bold text-biru-900 underline hover:text-biru-700"
              >
                Hubungi Panitia PMB
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. CALL TO ACTION FINAL */}
      {/* ========================================================================= */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-biru-900 via-biru-850 to-biru-950 p-8 sm:p-12 text-center text-putih shadow-soft-lg border border-biru-800 space-y-6">
          <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-800 text-biru-200 border border-biru-700">
            Mulai Perjalanan Anda
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-putih max-w-2xl mx-auto">
            Siap Menjadi Bagian dari Universitas Pignatelli Triputra?
          </h2>
          <p className="text-sm sm:text-base text-biru-200 max-w-xl mx-auto font-sans leading-relaxed">
            Daftarkan diri Anda hari ini dan amankan kuota program studi idaman
            bersama beasiswa prestasi sebelum periode Gelombang 1 berakhir.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/register">
              <Button
                variant="primary"
                size="lg"
                className="bg-putih text-biru-950 hover:bg-biru-50 font-bold px-8"
                rightIcon={<ArrowRight className="w-4 h-4 text-biru-900" />}
              >
                Daftar Sekarang
              </Button>
            </Link>
            <Link to="/kontak">
              <Button
                variant="outline"
                size="lg"
                className="border-biru-400 text-putih hover:bg-biru-900"
              >
                Konsultasi Pendaftaran
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
