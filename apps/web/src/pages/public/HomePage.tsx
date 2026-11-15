import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Award,
  BadgePercent,
  Globe,
  UserPlus,
  LogIn,
  Banknote,
  CloudUpload,
  MonitorCheck,
  Megaphone,
  CreditCard,
  IdCard,
} from "lucide-react";
import { Button, Card } from "../../components/common";
import { PopupMinatCalon } from "../../components/pendaftaran/PopupMinatCalon";
import { SeoHead } from "../../components/common/SeoHead";
import {
  STATISTIK_BERANDA,
  HERO_CONTENT,
  GELOMBANG_CONTENT,
  JALUR_PENERIMAAN,
} from "../../content/beranda";
import { getProdiList } from "../../services/prodi";
import { DaftarTahapRingkas } from "../../components/pendaftaran/DaftarTahapRingkas";
import {
  batasPenutupan,
  judulGelombang,
  statusGelombang,
  type GelombangPublik,
} from "../../lib/gelombangTahap";

type MasterGelombangItem = GelombangPublik & { kuota: number };

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface LangkahAlurPublik {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  desc: string;
  list?: readonly string[];
  tag: string;
}

/** Alur resmi PMB UPITRA (sama dengan stepper di portal calon). */
const ALUR_PMB: readonly LangkahAlurPublik[] = [
  {
    icon: UserPlus,
    title: "Buat Akun PMB",
    desc: "Buka pmb.upitra.ac.id, klik Daftar, lalu buat akun dengan email aktif Anda.",
    tag: "Calon",
  },
  {
    icon: Globe,
    title: "Pilih Jalur & Program Studi",
    desc: "Login ke portal, lalu pilih jalur masuk, gelombang, dan program studi tujuan. Jalur yang Anda pilih di halaman Jalur Masuk otomatis terisi.",
    tag: "Calon",
  },
  {
    icon: LogIn,
    title: "Isi Formulir",
    desc: "Lengkapi formulir pendaftaran:",
    list: [
      "Data diri",
      "Data sekolah",
      "Data orang tua",
      "Tanggal seleksi (sesi CBT)",
    ],
    tag: "Calon",
  },
  {
    icon: Banknote,
    title: "Bayar Formulir & Unggah Bukti",
    desc: "Bayar biaya formulir melalui VA Mandiri atau QRIS, lalu unggah bukti pembayaran. Admin PMB memeriksa dan menyetujui pembayaran Anda.",
    tag: "Calon + verifikasi admin",
  },
  {
    icon: CloudUpload,
    title: "Unggah Berkas",
    desc: "Setelah pembayaran disetujui, unggah berkas persyaratan:",
    list: [
      "Rapor kelas X - XI",
      "Pas foto berwarna",
      "Surat rekomendasi sekolah",
      "Sertifikat (bila ada)",
      "Surat bebas buta warna (khusus Fisioterapi)",
      "Surat keterangan sehat (khusus D3 Keperawatan)",
    ],
    tag: "Calon + verifikasi admin",
  },
  {
    icon: MonitorCheck,
    title: "Ujian CBT Online",
    desc: "Ikuti CBT sesuai jadwal yang dipilih. Sesi online dikerjakan dari rumah; sesi luring di lab kampus.",
    tag: "Calon",
  },
  {
    icon: Megaphone,
    title: "Cek Pengumuman",
    desc: "Cek hasil seleksi sesuai jadwal di portal PMB dan unduh surat penerimaan.",
    tag: "Panitia PMB",
  },
  {
    icon: CreditCard,
    title: "Bayar Daftar Ulang",
    desc: "Bayar sesuai surat penerimaan (jadwal pembayaran & VA Mandiri / QRIS), lalu unggah bukti untuk diverifikasi admin.",
    tag: "Calon + verifikasi admin",
  },
  {
    icon: IdCard,
    title: "Registrasi Ulang",
    desc: "Lengkapi berkas registrasi ulang di sistem dan terima NIM resmi.",
    tag: "Calon + verifikasi admin",
  },
];

export const HomePage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  // Motion wrapper props honoring prefers-reduced-motion
  const motionSectionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-40px" },
        transition: { duration: 0.45, ease: "easeOut" as const },
      };

  // 1. Fetch Gelombang Aktif dari API Master
  const {
    data: gelombangList,
    isLoading: isGelombangLoading,
    isError: isGelombangError,
  } = useQuery<MasterGelombangItem[]>({
    queryKey: ["master-gelombang-home"],
    queryFn: async () => {
      const res = await fetch("/api/master/gelombang");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const activeGelombang = useMemo(() => {
    if (!gelombangList || gelombangList.length === 0) return null;
    const now = Date.now();
    // Aktif = gelombang yang menerima pendaftaran saat ini (tahap yang dibuka bila bertahap)
    return (
      gelombangList.find(
        (g) => g.is_active && statusGelombang(g, now) === "AKTIF",
      ) || null
    );
  }, [gelombangList]);

  // Target timestamp: jika ada gelombang aktif gunakan tgl_selesai-nya, jika tidak fallback ke 31 Juli 2026
  const targetTimestamp = useMemo(() => {
    if (activeGelombang) {
      return batasPenutupan(activeGelombang);
    }
    return new Date("2026-07-31T23:59:59").getTime();
  }, [activeGelombang]);

  const [isGelombangClosed, setIsGelombangClosed] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const difference = targetTimestamp - now;

      // State Berakhir: Jika waktu habis, error terjadi, atau tidak ada gelombang aktif
      if (
        difference <= 0 ||
        isGelombangError ||
        (!isGelombangLoading &&
          !activeGelombang &&
          gelombangList &&
          gelombangList.length > 0)
      ) {
        setIsGelombangClosed(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setIsGelombangClosed(false);
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [
    targetTimestamp,
    isGelombangLoading,
    isGelombangError,
    activeGelombang,
    gelombangList,
  ]);

  // 5. Query Daftar Program Studi untuk Statistik & Kalkulator Otomatis
  const { data: prodiApiList = [] } = useQuery({
    queryKey: ["public-prodi-list"],
    queryFn: getProdiList,
  });

  const prodiCount = prodiApiList.length > 0 ? prodiApiList.length : 10;

  const statistikDinamis = useMemo(() => {
    return STATISTIK_BERANDA.map((item) => {
      if (item.label.toLowerCase().includes("program studi")) {
        return {
          ...item,
          nilai: `${prodiCount} Prodi`,
        };
      }
      return item;
    });
  }, [prodiCount]);

  // 6. State Filter Program Studi

  // 7. State Simulasi Kalkulator UKT
  const [selectedProdi, setSelectedProdi] = useState<string>("S1-IF");
  const [selectedJalur, setSelectedJalur] = useState<string>(
    JALUR_PENERIMAAN[3].kode,
  );
  const [voucherCode, setVoucherCode] = useState<string>("TRIPUTRA2026");
  const [voucherApplied, setVoucherApplied] = useState<boolean>(true);

  // 10 Program Studi Resmi Universitas Pignatelli Triputra
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
    "S1-IF": {
      nama: "Informatika",
      jenjang: "S1",
      fakultas: "Sains & Teknologi",
      akreditasi: "Baik Sekali",
      uktMin: 7000000,
      uktMax: 7000000,
      dpp: 7500000,
    },
    "S1-SI": {
      nama: "Sistem Informasi",
      jenjang: "S1",
      fakultas: "Sains & Teknologi",
      akreditasi: "Baik Sekali",
      uktMin: 6500000,
      uktMax: 6500000,
      dpp: 7000000,
    },
    "S1-SE": {
      nama: "Software Engineering",
      jenjang: "S1",
      fakultas: "Sains & Teknologi",
      akreditasi: "Baik",
      uktMin: 7000000,
      uktMax: 7000000,
      dpp: 7500000,
    },
    "S1-MNJ": {
      nama: "Manajemen",
      jenjang: "S1",
      fakultas: "Ekonomika Bisnis",
      akreditasi: "Baik Sekali",
      uktMin: 5500000,
      uktMax: 5500000,
      dpp: 6500000,
    },
    "S1-AKT": {
      nama: "Akuntansi",
      jenjang: "S1",
      fakultas: "Ekonomika Bisnis",
      akreditasi: "Baik Sekali",
      uktMin: 6000000,
      uktMax: 6000000,
      dpp: 6500000,
    },
    "S1-PAR": {
      nama: "Pariwisata",
      jenjang: "S1",
      fakultas: "Sosial Humaniora",
      akreditasi: "Baik",
      uktMin: 5000000,
      uktMax: 5000000,
      dpp: 6000000,
    },
    "S1-BIG": {
      nama: "Bahasa Inggris",
      jenjang: "S1",
      fakultas: "Sosial Humaniora",
      akreditasi: "Baik",
      uktMin: 5000000,
      uktMax: 5000000,
      dpp: 6000000,
    },
    "S1-K3": {
      nama: "Keselamatan & Kesehatan Kerja (K3)",
      jenjang: "S1",
      fakultas: "Kesehatan",
      akreditasi: "Baik",
      uktMin: 6000000,
      uktMax: 6000000,
      dpp: 7000000,
    },
    "S1-FIS": {
      nama: "Fisioterapi",
      jenjang: "S1",
      fakultas: "Kesehatan",
      akreditasi: "Baik",
      uktMin: 6500000,
      uktMax: 6500000,
      dpp: 7500000,
    },
    "D3-KEP": {
      nama: "Keperawatan",
      jenjang: "D3",
      fakultas: "Kesehatan",
      akreditasi: "Baik Sekali",
      uktMin: 5000000,
      uktMax: 5000000,
      dpp: 5500000,
    },
  };

  const currentProdi = PRODI_DATA[selectedProdi] || PRODI_DATA["S1-IF"];

  // Perhitungan diskon & simulasi biaya formulir
  const biayaFormulir = 250000;
  const diskonFormulir =
    voucherApplied && voucherCode.trim().toUpperCase() === "TRIPUTRA2026"
      ? 50000
      : 0;
  const totalFormulir = biayaFormulir - diskonFormulir;

  return (
    <div className="space-y-20 lg:space-y-28">
      <PopupMinatCalon />
      <SeoHead
        title="PMB UPITRA 2026/2027 | Universitas Pignatelli Triputra"
        description="Penerimaan Mahasiswa Baru Universitas Pignatelli Triputra Surakarta. Tersedia Jalur Reguler, Prestasi Rapor, Beasiswa Triputra Group, dan Jalur RPL."
      />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION DENGAN ROYAL BLUE GRADIENT, POLA SVG, & COUNTDOWN */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-biru-950 via-biru-900 to-biru-800 text-putih min-h-[calc(100dvh-var(--navbar-h,72px))] pt-8 sm:pt-12 pb-24 sm:pb-28 lg:pb-32 border-b border-biru-800 shadow-soft-lg flex items-center">
        {/* Subtle Geometric SVG Pattern (Pure CSS/SVG, 4-5% Opacity) */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="hero-grid-pattern"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.75"
                  className="text-putih"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid-pattern)" />
          </svg>
        </div>

        {/* Soft Radial Ambient Lighting */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-biru-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-biru-500/15 blur-3xl pointer-events-none" />

        {/* Local Abstract Decorative SVG (Concentric Rings & Diamond Accent di Sisi Kanan) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] pointer-events-none opacity-[0.08] hidden lg:block">
          <svg
            viewBox="0 0 600 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full text-biru-300"
          >
            <circle
              cx="300"
              cy="300"
              r="280"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <circle
              cx="300"
              cy="300"
              r="220"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle
              cx="300"
              cy="300"
              r="160"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <circle
              cx="300"
              cy="300"
              r="100"
              stroke="currentColor"
              strokeWidth="1"
            />
            <rect
              x="200"
              y="200"
              width="200"
              height="200"
              transform="rotate(45 300 300)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Teks Hero Utama (Kiri) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Eyebrow Chip Konfigurasi */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-biru-800/80 border border-biru-500/40 text-biru-100 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm shadow-soft-sm">
                <Sparkles className="w-3.5 h-3.5 text-biru-300" />
                <span>{HERO_CONTENT.eyebrow}</span>
              </div>

              {/* H1 Serif Bersih (Tanpa Wavy Underline) */}
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-putih leading-[1.12] max-w-2xl">
                {HERO_CONTENT.judulUtama}{" "}
                <span className="text-biru-200">
                  {HERO_CONTENT.kampusSorot}
                </span>
              </h1>

              {/* Paragraf Keterangan: Sans, 18px, Line-height 1.7, Letter-spacing 0 */}
              <p className="text-base sm:text-lg text-biru-100 leading-[1.7] font-sans tracking-normal max-w-[56ch]">
                {HERO_CONTENT.deskripsi}
                <strong className="text-putih font-semibold">
                  {HERO_CONTENT.mitraIndustri}
                </strong>
                .
              </p>

              {/* Action Buttons (Kontras Tinggi, Mobile Full Width Stacked) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to={HERO_CONTENT.ctaPrimer.href}
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="white"
                    size="lg"
                    className="w-full sm:w-auto h-[52px] px-7 text-sm sm:text-base font-bold shadow-soft-md"
                    rightIcon={<ArrowRight className="w-4 h-4 text-biru-900" />}
                  >
                    {HERO_CONTENT.ctaPrimer.label}
                  </Button>
                </Link>
                <Link
                  to={HERO_CONTENT.ctaSekunder.href}
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="outline-white"
                    size="lg"
                    className="w-full sm:w-auto h-[52px] px-7 text-sm sm:text-base font-semibold"
                  >
                    {HERO_CONTENT.ctaSekunder.label}
                  </Button>
                </Link>
                <Link
                  to={HERO_CONTENT.ctaKelulusan.href}
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full sm:w-auto h-[52px] text-biru-200 hover:text-putih hover:bg-biru-800/40 text-sm sm:text-base font-medium"
                    leftIcon={
                      <GraduationCap className="w-4 h-4 text-biru-300" />
                    }
                  >
                    {HERO_CONTENT.ctaKelulusan.label}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Countdown Box & Card Gelombang (Kanan - Glass Card) */}
            <div className="lg:col-span-5">
              <div className="rounded-[20px] border border-biru-700/50 bg-biru-900/60 backdrop-blur-md p-6 sm:p-8 shadow-soft-lg space-y-6">
                <div className="flex items-center justify-between border-b border-biru-800/80 pb-4">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-biru-500/20 text-biru-200 border border-biru-400/30 mb-1">
                      {activeGelombang
                        ? judulGelombang(activeGelombang)
                        : GELOMBANG_CONTENT.badgeDefault}
                    </span>
                    <h2 className="font-serif text-xl font-bold text-putih">
                      {GELOMBANG_CONTENT.judulDefault}
                    </h2>
                  </div>
                  <BadgePercent className="w-6 h-6 text-biru-300" />
                </div>

                {/* State Gelombang Loading */}
                {isGelombangLoading ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="h-8 w-3/4 mx-auto rounded-lg bg-biru-800/60 animate-pulse" />
                    <div className="h-4 w-1/2 mx-auto rounded bg-biru-800/40 animate-pulse" />
                  </div>
                ) : isGelombangClosed ? (
                  /* STATE BERAKHIR / DITUTUP: Tidak menampilkan 00:00:00:00 */
                  <div className="space-y-4">
                    <div className="rounded-xl border border-biru-700/80 bg-biru-950/80 p-4 space-y-2 text-center">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-800 text-biru-200 border border-biru-700">
                        {GELOMBANG_CONTENT.stateDitutup.badge}
                      </span>
                      <h3 className="font-serif text-lg font-bold text-putih">
                        {GELOMBANG_CONTENT.stateDitutup.judul}
                      </h3>
                      <p className="text-xs text-biru-200 leading-relaxed">
                        {GELOMBANG_CONTENT.stateDitutup.subjudul}
                      </p>
                    </div>

                    <div className="rounded-xl bg-biru-950/60 border border-biru-800/80 p-3.5 text-xs text-biru-200 flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-biru-400 shrink-0" />
                      <span>
                        {GELOMBANG_CONTENT.stateDitutup.jadwalBerikutnya}
                      </span>
                    </div>

                    <Link
                      to={GELOMBANG_CONTENT.stateDitutup.ctaHref}
                      className="block"
                    >
                      <Button
                        variant="white"
                        className="w-full font-bold text-sm h-[48px]"
                        rightIcon={
                          <ArrowRight className="w-4 h-4 text-biru-900" />
                        }
                      >
                        {GELOMBANG_CONTENT.stateDitutup.cta}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  /* STATE GELOMBANG AKTIF DENGAN HITUNG MUNDUR SANS TABULAR-NUMS */
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <p className="text-xs text-biru-200 font-medium">
                        {GELOMBANG_CONTENT.subjudulTarget}
                      </p>
                      <p className="text-sm font-semibold text-putih">
                        {activeGelombang
                          ? new Date(
                              batasPenutupan(activeGelombang),
                            ).toLocaleDateString("id-ID", {
                              timeZone: "Asia/Jakarta",
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }) + " • 23:59 WIB"
                          : "Jumat, 31 Juli 2026 • 23:59 WIB"}
                      </p>
                    </div>

                    {activeGelombang?.tahap?.length ? (
                      <DaftarTahapRingkas tahap={activeGelombang.tahap} gelap />
                    ) : null}

                    {/* Counter Grid Tabular (4 Kotak Berbobot Visual Sama, Font Sans) */}
                    <div className="grid grid-cols-4 gap-2.5 text-center">
                      <div className="rounded-xl bg-biru-950/80 border border-biru-800 p-2.5">
                        <span className="font-sans text-2xl sm:text-3xl font-extrabold text-putih tabular-nums block">
                          {String(timeLeft.days).padStart(2, "0")}
                        </span>
                        <span className="block text-[10px] uppercase tracking-wider text-biru-300 mt-0.5">
                          Hari
                        </span>
                      </div>
                      <div className="rounded-xl bg-biru-950/80 border border-biru-800 p-2.5">
                        <span className="font-sans text-2xl sm:text-3xl font-extrabold text-putih tabular-nums block">
                          {String(timeLeft.hours).padStart(2, "0")}
                        </span>
                        <span className="block text-[10px] uppercase tracking-wider text-biru-300 mt-0.5">
                          Jam
                        </span>
                      </div>
                      <div className="rounded-xl bg-biru-950/80 border border-biru-800 p-2.5">
                        <span className="font-sans text-2xl sm:text-3xl font-extrabold text-putih tabular-nums block">
                          {String(timeLeft.minutes).padStart(2, "0")}
                        </span>
                        <span className="block text-[10px] uppercase tracking-wider text-biru-300 mt-0.5">
                          Menit
                        </span>
                      </div>
                      <div className="rounded-xl bg-biru-950/80 border border-biru-800 p-2.5">
                        <span className="font-sans text-2xl sm:text-3xl font-extrabold text-putih tabular-nums block">
                          {String(timeLeft.seconds).padStart(2, "0")}
                        </span>
                        <span className="block text-[10px] uppercase tracking-wider text-biru-300 mt-0.5">
                          Detik
                        </span>
                      </div>
                    </div>

                    <Link to="/register" className="block">
                      <Button
                        variant="white"
                        className="w-full font-bold text-sm h-[48px]"
                        rightIcon={
                          <ArrowRight className="w-4 h-4 text-biru-900" />
                        }
                      >
                        {GELOMBANG_CONTENT.ctaAktif}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. STRIP STATISTIK MENGAMBANG (OVERLAP -MT-12 SM:-MT-14 BG-PUTIH SHADOW-SOFT-XL) */}
      {/* ========================================================================= */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 -mt-12 sm:-mt-14 relative z-20">
        <div className="rounded-2xl border border-biru-100 bg-putih p-6 sm:p-8 shadow-soft-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-biru-100 text-center">
            {statistikDinamis.map((item, idx) => (
              <div key={idx} className="p-3 sm:px-4">
                <div className="font-sans text-2xl sm:text-3xl lg:text-4xl font-extrabold text-biru-950 tabular-nums tracking-tight">
                  {item.nilai}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-biru-900 mt-1">
                  {item.label}
                </div>
                <div className="text-[11px] text-biru-600 mt-0.5">
                  {item.deskripsi}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. RINGKASAN JALUR PENERIMAAN (RITME: BG-PUTIH) */}
      {/* ========================================================================= */}
      <motion.section
        {...motionSectionProps}
        className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-100 text-biru-800">
            Pilihan Jalur Masuk
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-biru-950">
            Jalur Penerimaan Sesuai Potensi Anda
          </h2>
          <p className="text-sm text-biru-700 leading-relaxed font-sans">
            Tersedia pilihan jalur seleksi yang objektif, transparan, dan
            dilengkapi fasilitas beasiswa prestasi unggulan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {JALUR_PENERIMAAN.map((j) => (
            <Card
              key={j.nama}
              className="p-6 flex flex-col justify-between hover:shadow-soft-lg transition-all border-biru-200 hover:border-biru-400"
            >
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-xl bg-biru-100 flex items-center justify-center text-biru-800">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-biru-950">
                  {j.nama}
                </h3>
                <p className="text-xs font-semibold uppercase tracking-wider text-biru-600">
                  {j.keterangan}
                </p>
                <ul className="space-y-1.5 border-t border-biru-100 pt-3 text-xs text-biru-800">
                  {j.ketentuan.map((k) => (
                    <li key={k} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-biru-600" />
                      <span>{k}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </motion.section>

      {/* ========================================================================= */}
      {/* 4. ALUR PENDAFTARAN TIMELINE BERNOMOR (RITME: BG-PUTIH) */}
      {/* ========================================================================= */}
      <motion.section
        {...motionSectionProps}
        className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-100 text-biru-800">
            Proses Mudah & Transparan
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-biru-950">
            Alur Pendaftaran PMB
          </h2>
          <p className="text-sm text-biru-700 leading-relaxed font-sans">
            Sembilan langkah dari pendaftaran online hingga registrasi ulang.
            Setiap tahap dapat dipantau langsung melalui portal calon mahasiswa.
          </p>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALUR_PMB.map((item) => (
            <li
              key={item.title}
              className="relative p-5 rounded-2xl border border-biru-200 bg-putih shadow-soft-sm hover:shadow-soft-md transition-all flex gap-4"
            >
              <span className="w-12 h-12 shrink-0 rounded-2xl bg-biru-100 text-biru-800 flex items-center justify-center">
                <item.icon className="w-6 h-6" aria-hidden />
              </span>
              <div className="space-y-1.5">
                <h3 className="font-serif text-lg font-bold text-biru-950 leading-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-biru-700 leading-relaxed font-sans">
                  {item.desc}
                </p>
                {item.list && (
                  <ul className="text-xs text-biru-700 list-disc list-inside space-y-0.5">
                    {item.list.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                )}
                <span className="inline-block text-[11px] font-semibold text-biru-600">
                  {item.tag}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </motion.section>

      {/* ========================================================================= */}
      {/* 5. SIMULASI BIAYA & UKT INTERAKTIF (RITME: BG-BIRU-950 KONTRASTING) */}
      {/* ========================================================================= */}
      <motion.section
        {...motionSectionProps}
        className="bg-biru-950 text-putih py-16 sm:py-20 border-y border-biru-900"
      >
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
                  <span>
                    Tidak ada biaya tersembunyi atau praktikum tambahan
                  </span>
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
                  <Button variant="outline-white" size="sm">
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
                      {JALUR_PENERIMAAN.map((j) => (
                        <option key={j.kode} value={j.kode}>
                          {j.nama}
                        </option>
                      ))}
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

                {/* Rincian Hasil Perhitungan Tabular */}
                <div className="rounded-xl bg-biru-950/70 border border-biru-800 p-4 space-y-2.5 text-xs text-biru-200">
                  <div className="flex items-center justify-between">
                    <span>Biaya Formulir Pendaftaran:</span>
                    <span className="font-sans text-sm text-putih font-semibold tabular-nums">
                      Rp {totalFormulir.toLocaleString("id-ID")}
                      {diskonFormulir > 0 && (
                        <span className="line-through text-biru-400 text-xs ml-2 tabular-nums">
                          Rp 250.000
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estimasi UKT per Semester:</span>
                    <span className="font-sans text-sm text-putih font-bold tabular-nums">
                      Rp {currentProdi.uktMin.toLocaleString("id-ID")} &ndash;
                      Rp {currentProdi.uktMax.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Dana Pengembangan Pendidikan (DPP):</span>
                    <span className="font-sans text-sm text-putih font-semibold tabular-nums">
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
                    <Button variant="white" className="w-full text-sm py-2.5">
                      Lanjutkan Pendaftaran dengan Pilihan Ini &rarr;
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ========================================================================= */}
      {/* 9. CALL TO ACTION FINAL RIBBON (RITME: BG-BIRU ROYAL GRADIENT) */}
      {/* ========================================================================= */}
      <motion.section
        {...motionSectionProps}
        className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pb-16"
      >
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
                variant="white"
                size="lg"
                className="px-8"
                rightIcon={<ArrowRight className="w-4 h-4 text-biru-900" />}
              >
                Daftar Sekarang
              </Button>
            </Link>
            <Link to="/kontak">
              <Button variant="outline-white" size="lg">
                Konsultasi Pendaftaran
              </Button>
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
};
