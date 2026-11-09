import * as React from "react";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Download,
  Mail,
  User,
  Sparkles,
  Info,
} from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Switch,
  FormField,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Drawer,
  useToast,
  CardSkeleton,
  TableSkeleton,
  Stepper,
  Pagination,
  EmptyState,
  ErrorState,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  FileUpload,
  Logo,
} from "../../components/ui";
import {
  H3,
  Body,
  Caption,
  TypographyLabel,
  Numeric,
} from "../../components/ui/Typography";
import { Sparkline } from "../../components/ui/Sparkline";

export const StyleguidePage: React.FC = () => {
  const { toast } = useToast();

  // State for interactive demos
  const [inputText, setInputText] = React.useState("");
  const [selectValue, setSelectValue] = React.useState("s1-ti");
  const [isChecked, setIsChecked] = React.useState(true);
  const [radioChoice, setRadioChoice] = React.useState("reguler");
  const [switchActive, setSwitchActive] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(2);
  const [stepperStep, setStepperStep] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [previewWidth, setPreviewWidth] = React.useState<
    "full" | "1280" | "768" | "375"
  >("full");

  const COLOR_TOKENS = [
    {
      name: "biru-950",
      hex: "#061633",
      desc: "Teks utama, judul paling pekat, background footer/hero terdalam",
      bg: "bg-biru-950",
      text: "text-putih",
    },
    {
      name: "biru-900",
      hex: "#0B2559",
      desc: "Sidebar navigasi utama, tombol primer, header institusi",
      bg: "bg-biru-900",
      text: "text-putih",
    },
    {
      name: "biru-800",
      hex: "#12378A",
      desc: "Hover tombol primer, gradien hero, border pekat",
      bg: "bg-biru-800",
      text: "text-putih",
    },
    {
      name: "biru-700",
      hex: "#1A4BB5",
      desc: "Teks sekunder tegas, tautan interaktif, border aktif",
      bg: "bg-biru-700",
      text: "text-putih",
    },
    {
      name: "biru-600",
      hex: "#2563EB",
      desc: "Aksen interaktif, fokus ring, indikator langkah aktif",
      bg: "bg-biru-600",
      text: "text-putih",
    },
    {
      name: "biru-500",
      hex: "#3B82F6",
      desc: "Focus ring aksen, ikon sekunder, pendar halus",
      bg: "bg-biru-500",
      text: "text-putih",
    },
    {
      name: "biru-200",
      hex: "#BFD4F8",
      desc: "Border standar, garis pemisah, input borders",
      bg: "bg-biru-200",
      text: "text-biru-950",
    },
    {
      name: "biru-100",
      hex: "#DCE8FC",
      desc: "Background badge, hover item, container halus",
      bg: "bg-biru-100",
      text: "text-biru-950",
    },
    {
      name: "biru-50",
      hex: "#F1F6FE",
      desc: "Background halaman, card hover, zebra table",
      bg: "bg-biru-50",
      text: "text-biru-950",
    },
    {
      name: "putih",
      hex: "#FFFFFF",
      desc: "Background kartu, modal, input, teks tombol",
      bg: "bg-putih border border-biru-200",
      text: "text-biru-950",
    },
  ];

  const STEPPER_STEPS = [
    { id: 1, title: "Registrasi Akun", description: "Email & data dasar" },
    { id: 2, title: "Isi Formulir", description: "Biodata & nilai rapor" },
    { id: 3, title: "Unggah Dokumen", description: "Ijazah & pasfoto" },
    { id: 4, title: "Pembayaran", description: "Biaya seleksi & registrasi" },
    { id: 5, title: "Selesai", description: "Cetak kartu ujian" },
  ];

  return (
    <div className="min-h-screen bg-biru-50/40 text-biru-950 font-sans pb-24">
      {/* Dev Bar for Breakpoint Preview */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-biru-800 bg-biru-950 px-4 py-2.5 text-xs text-biru-200 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-biru-400" />
          <span className="font-semibold text-putih">
            PMB Design System Styleguide
          </span>
          <span className="rounded bg-biru-800 px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider text-biru-200">
            BLUE & WHITE ONLY
          </span>
        </div>

        {/* Viewport Width Controls */}
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline text-biru-300 mr-2">
            Simulasi Viewport:
          </span>
          <button
            type="button"
            onClick={() => setPreviewWidth("full")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              previewWidth === "full"
                ? "bg-biru-700 text-putih"
                : "bg-biru-900 text-biru-200 hover:bg-biru-800"
            }`}
          >
            Full (100%)
          </button>
          <button
            type="button"
            onClick={() => setPreviewWidth("1280")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              previewWidth === "1280"
                ? "bg-biru-700 text-putih"
                : "bg-biru-900 text-biru-200 hover:bg-biru-800"
            }`}
          >
            Desktop (1280px)
          </button>
          <button
            type="button"
            onClick={() => setPreviewWidth("768")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              previewWidth === "768"
                ? "bg-biru-700 text-putih"
                : "bg-biru-900 text-biru-200 hover:bg-biru-800"
            }`}
          >
            Tablet (768px)
          </button>
          <button
            type="button"
            onClick={() => setPreviewWidth("375")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              previewWidth === "375"
                ? "bg-biru-700 text-putih"
                : "bg-biru-900 text-biru-200 hover:bg-biru-800"
            }`}
          >
            Mobile (375px)
          </button>
        </div>
      </div>

      {/* Main Container Wrapper */}
      <div
        className={`mx-auto transition-all duration-300 p-4 sm:p-6 lg:p-8 ${
          previewWidth === "full"
            ? "max-w-[1240px]"
            : previewWidth === "1280"
              ? "max-w-[1280px] shadow-soft-xl border border-biru-200 my-4 bg-putih rounded-2xl"
              : previewWidth === "768"
                ? "max-w-[768px] shadow-soft-xl border border-biru-200 my-4 bg-putih rounded-2xl"
                : "max-w-[375px] shadow-soft-xl border border-biru-200 my-4 bg-putih rounded-2xl"
        }`}
      >
        {/* Header Section */}
        <div className="mb-10 rounded-2xl border border-biru-200 bg-putih p-6 shadow-soft-sm sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-biru-200 bg-biru-50 px-3 py-1 text-xs font-semibold text-biru-800 mb-2">
                <Info className="h-3.5 w-3.5" />
                <span>Dokumentasi Komponen Resmi</span>
              </div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-biru-950 sm:text-4xl">
                Sistem Desain PMB Universitas Pignatelli Triputra
              </h1>
              <p className="mt-2 text-sm text-biru-700 sm:text-base max-w-2xl">
                Koleksi 26 komponen antarmuka, layout, dan token warna yang
                dirancang khusus dengan filosofi akademik yang berwibawa,
                aksesibel (WCAG AA), dan strictly biru & putih.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast({
                    title: "Status Desain",
                    description:
                      "Semua 26 komponen telah lolos uji aksesibilitas dan gerbang kualitas.",
                    variant: "berhasil",
                  })
                }
              >
                Uji Toast Berhasil
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  toast({
                    title: "Peringatan Berkas",
                    description: "Ukuran berkas melebihi batas 5MB.",
                    variant: "peringatan",
                  })
                }
              >
                Uji Toast Peringatan
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation for Sections */}
        <Tabs defaultValue="tokens" className="space-y-8">
          <TabsList className="w-full flex flex-wrap justify-start border-b border-biru-200 pb-px">
            <TabsTrigger value="tokens">1. Token Warna & Tipografi</TabsTrigger>
            <TabsTrigger value="buttons-badges">
              2. Tombol & Lencana
            </TabsTrigger>
            <TabsTrigger value="forms">3. Formulir & Input</TabsTrigger>
            <TabsTrigger value="navigation">4. Navigasi & Struktur</TabsTrigger>
            <TabsTrigger value="overlays">
              5. Dialog, Drawer & Notifikasi
            </TabsTrigger>
            <TabsTrigger value="states">
              6. State: Skeleton, Kosong, Error
            </TabsTrigger>
          </TabsList>

          {/* 1. COLOR TOKENS & TYPOGRAPHY */}
          <TabsContent value="tokens" className="space-y-8">
            {/* Color Palette Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Palet Token Warna (Strict Blue & White)</CardTitle>
                <CardDescription>
                  Sesuai aturan desain proyek: hanya menggunakan 10 token biru &
                  putih. Tidak ada warna lain (tanpa
                  merah/hijau/kuning/oranye/abu-abu netral).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {COLOR_TOKENS.map((token) => (
                    <div
                      key={token.name}
                      className="overflow-hidden rounded-xl border border-biru-200 bg-putih shadow-soft-sm"
                    >
                      <div
                        className={`h-20 w-full ${token.bg} flex items-end p-2.5`}
                      >
                        <span
                          className={`text-xs font-mono font-bold ${token.text}`}
                        >
                          {token.hex}
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-biru-950 font-mono">
                          {token.name}
                        </p>
                        <p className="mt-1 text-xs text-biru-700 leading-snug">
                          {token.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Typography Scale */}
            <Card>
              <CardHeader>
                <CardTitle>Tipografi Akademik Berwibawa</CardTitle>
                <CardDescription>
                  Kombinasi font serif untuk heading terhormat dan sans-serif
                  modern untuk keterbacaan optimal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-b border-biru-100 pb-4">
                  <span className="text-xs font-mono font-semibold text-biru-600 uppercase">
                    Heading 1 (Serif - 36px / 2.25rem)
                  </span>
                  <h1 className="font-serif text-4xl font-bold text-biru-950 mt-1">
                    Universitas Pignatelli Triputra
                  </h1>
                </div>

                <div className="border-b border-biru-100 pb-4">
                  <span className="text-xs font-mono font-semibold text-biru-600 uppercase">
                    Heading 2 (Serif - 30px / 1.875rem)
                  </span>
                  <h2 className="font-serif text-3xl font-semibold text-biru-950 mt-1">
                    Penerimaan Mahasiswa Baru Tahun Akademik 2026/2027
                  </h2>
                </div>

                <div className="border-b border-biru-100 pb-4">
                  <span className="text-xs font-mono font-semibold text-biru-600 uppercase">
                    Heading 3 (Serif - 24px / 1.5rem)
                  </span>
                  <h3 className="font-serif text-2xl font-semibold text-biru-950 mt-1">
                    Program Studi Unggulan Berbasis Industri
                  </h3>
                </div>

                <div className="border-b border-biru-100 pb-4">
                  <span className="text-xs font-mono font-semibold text-biru-600 uppercase">
                    Body Regular (Sans - 16px / 1rem)
                  </span>
                  <p className="font-sans text-base text-biru-950 leading-relaxed mt-1">
                    Sistem pendaftaran dirancang untuk memberikan pengalaman
                    terpadu, transparan, dan akurat bagi calon mahasiswa baru
                    mulai dari pengisian formulir, unggah berkas portofolio,
                    verifikasi dokumen, hingga seleksi potensi akademik.
                  </p>
                </div>

                <div>
                  <span className="text-xs font-mono font-semibold text-biru-600 uppercase">
                    Body Muted / Small (Sans - 14px / 0.875rem)
                  </span>
                  <p className="font-sans text-sm text-biru-700 leading-relaxed mt-1">
                    Batas akhir penyerahan berkas fisik dan pelunasan uang
                    kuliah tunggal semester pertama adalah 30 hari kalender
                    sejak pengumuman resmi dikeluarkan oleh panitia PMB.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Komponen Typography Terpadu & Tabular Numbers */}
            <Card>
              <CardHeader>
                <CardTitle>Komponen Typography &amp; Tabular Nums</CardTitle>
                <CardDescription>
                  Komponen tipe data teks standar (H1–H4, Body, Caption,
                  TypographyLabel, Numeric) yang menjamin konsistensi skala
                  tipografi dan alignment angka di tabel/KPI.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-biru-200 bg-biru-50/50 space-y-2">
                    <TypographyLabel>Komponen Semantik Heading</TypographyLabel>
                    <H3 className="text-biru-950 font-serif">
                      Judul Halaman Publik (H3 Serif)
                    </H3>
                    <Body className="text-biru-700">
                      Teks paragraf menggunakan komponen Body standar dengan
                      warna muted yang nyaman dibaca.
                    </Body>
                    <Caption>
                      Catatan kaki atau label bantuan via komponen Caption.
                    </Caption>
                  </div>
                  <div className="p-4 rounded-xl border border-biru-200 bg-putih space-y-2">
                    <TypographyLabel>
                      Tabular Numeric (font-variant-numeric: tabular-nums)
                    </TypographyLabel>
                    <div className="flex items-center justify-between text-sm py-1 border-b border-biru-100">
                      <span>Total Pendaftar Terverifikasi:</span>
                      <Numeric className="font-bold text-biru-950 text-base">
                        1.482 Calon
                      </Numeric>
                    </div>
                    <div className="flex items-center justify-between text-sm py-1 border-b border-biru-100">
                      <span>Penerimaan Pembayaran Loket:</span>
                      <Numeric className="font-bold text-biru-950 text-base">
                        Rp 370.500.000
                      </Numeric>
                    </div>
                    <div className="flex items-center justify-between text-sm py-1">
                      <span>Rasio Kelulusan Seleksi:</span>
                      <Numeric className="font-bold text-biru-950 text-base">
                        92,4%
                      </Numeric>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logo Component Demo */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Identitas Institusi & Logo (Official Logo & Monogram Fallback)
                </CardTitle>
                <CardDescription>
                  Komponen Logo resmi berbasis SVG dengan dimensi eksplisit
                  (mencegah CLS) dan fallback monogram institusi jika terjadi
                  kegagalan pemuatan gambar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Mode Standar (Latar Terang / Navbar)
                  </h4>
                  <div className="p-4 rounded-xl border border-biru-100 bg-putih inline-block">
                    <Logo width={220} height={44} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Mode Gelap (Latar Gelap / Hero / Footer)
                  </h4>
                  <div className="p-4 rounded-xl bg-biru-950 border border-biru-900 inline-block">
                    <Logo width={220} height={44} theme="dark" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Fallback Monogram Otomatis (Saat URL Gambar Invalid)
                  </h4>
                  <div className="p-4 rounded-xl border border-biru-100 bg-biru-50/50 inline-block">
                    <Logo
                      width={220}
                      height={44}
                      src="/invalid-path-to-logo.svg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sparkline KPI Micro Visualizer */}
            <Card>
              <CardHeader>
                <CardTitle>Sparkline KPI Micro Visualizer</CardTitle>
                <CardDescription>
                  Komponen visualisasi mikro berbasis SVG murni bernuansa biru
                  untuk kartu analitik ringkas di Dashboard Admin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-biru-200 bg-putih flex items-center justify-between">
                    <div>
                      <div className="text-xs text-biru-600 font-medium">
                        Tren Pendaftaran
                      </div>
                      <div className="font-mono text-xl font-bold text-biru-950 tabular-nums">
                        +24.5%
                      </div>
                    </div>
                    <Sparkline
                      data={[12, 19, 15, 25, 22, 30, 38]}
                      width={90}
                      height={32}
                    />
                  </div>
                  <div className="p-4 rounded-xl border border-biru-200 bg-putih flex items-center justify-between">
                    <div>
                      <div className="text-xs text-biru-600 font-medium">
                        Peserta Ujian CBT
                      </div>
                      <div className="font-mono text-xl font-bold text-biru-950 tabular-nums">
                        412 Sesi
                      </div>
                    </div>
                    <Sparkline
                      data={[40, 35, 55, 60, 48, 70, 85]}
                      width={90}
                      height={32}
                    />
                  </div>
                  <div className="p-4 rounded-xl border border-biru-200 bg-putih flex items-center justify-between">
                    <div>
                      <div className="text-xs text-biru-600 font-medium">
                        Pelunasan UKT
                      </div>
                      <div className="font-mono text-xl font-bold text-biru-950 tabular-nums">
                        88.2%
                      </div>
                    </div>
                    <Sparkline
                      data={[20, 25, 45, 60, 75, 80, 92]}
                      width={90}
                      height={32}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logo Component Demo */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Identitas Institusi & Logo (Official Logo & Monogram Fallback)
                </CardTitle>
                <CardDescription>
                  Komponen Logo resmi berbasis SVG dengan dimensi eksplisit
                  (mencegah CLS) dan fallback monogram institusi jika terjadi
                  kegagalan pemuatan gambar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Mode Standar (Latar Terang / Navbar)
                  </h4>
                  <div className="p-4 rounded-xl border border-biru-100 bg-putih inline-block">
                    <Logo width={220} height={44} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Mode Gelap (Latar Gelap / Hero / Footer)
                  </h4>
                  <div className="p-4 rounded-xl bg-biru-950 border border-biru-900 inline-block">
                    <Logo width={220} height={44} theme="dark" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Fallback Monogram Otomatis (Saat URL Gambar Invalid)
                  </h4>
                  <div className="p-4 rounded-xl border border-biru-100 bg-biru-50/50 inline-block">
                    <Logo
                      width={220}
                      height={44}
                      src="/invalid-path-to-logo.svg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Elevation & Soft Blue Shadows */}
            <Card>
              <CardHeader>
                <CardTitle>Elevasi & Bayangan Bernuansa Biru</CardTitle>
                <CardDescription>
                  Semua bayangan menggunakan hint warna biru halus
                  (--shadow-soft-*) untuk nuansa sejuk dan kedalaman yang
                  natural.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="rounded-xl border border-biru-100 bg-putih p-6 text-center shadow-soft-sm">
                    <p className="font-semibold text-sm text-biru-950">
                      shadow-soft-sm
                    </p>
                    <p className="mt-1 text-xs text-biru-700">
                      Kartu default, tombol, input
                    </p>
                  </div>
                  <div className="rounded-xl border border-biru-100 bg-putih p-6 text-center shadow-soft-md">
                    <p className="font-semibold text-sm text-biru-950">
                      shadow-soft-md
                    </p>
                    <p className="mt-1 text-xs text-biru-700">
                      Dropdown, popover, hover kartu
                    </p>
                  </div>
                  <div className="rounded-xl border border-biru-100 bg-putih p-6 text-center shadow-soft-lg">
                    <p className="font-semibold text-sm text-biru-950">
                      shadow-soft-lg
                    </p>
                    <p className="mt-1 text-xs text-biru-700">
                      Dialog modal, drawer, floating bar
                    </p>
                  </div>
                  <div className="rounded-xl border border-biru-100 bg-putih p-6 text-center shadow-soft-xl">
                    <p className="font-semibold text-sm text-biru-950">
                      shadow-soft-xl
                    </p>
                    <p className="mt-1 text-xs text-biru-700">
                      Hero banner highlight, panel utama
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logo Component Demo */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Identitas Institusi & Logo (Official Logo & Monogram Fallback)
                </CardTitle>
                <CardDescription>
                  Komponen Logo resmi berbasis SVG dengan dimensi eksplisit
                  (mencegah CLS) dan fallback monogram institusi jika terjadi
                  kegagalan pemuatan gambar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Mode Standar (Latar Terang / Navbar)
                  </h4>
                  <div className="p-4 rounded-xl border border-biru-100 bg-putih inline-block">
                    <Logo width={220} height={44} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Mode Gelap (Latar Gelap / Hero / Footer)
                  </h4>
                  <div className="p-4 rounded-xl bg-biru-950 border border-biru-900 inline-block">
                    <Logo width={220} height={44} theme="dark" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Fallback Monogram Otomatis (Saat URL Gambar Invalid)
                  </h4>
                  <div className="p-4 rounded-xl border border-biru-100 bg-biru-50/50 inline-block">
                    <Logo
                      width={220}
                      height={44}
                      src="/invalid-path-to-logo.svg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. BUTTONS & BADGES */}
          <TabsContent value="buttons-badges" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Varian & Ukuran Tombol (Button)</CardTitle>
                <CardDescription>
                  Mendukung varian primary, secondary, outline, dan ghost dengan
                  status loading, ikon, dan fokus keyboard terlihat jelas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Variants */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Varian Gaya
                  </h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="primary">Tombol Primary</Button>
                    <Button variant="secondary">Tombol Secondary</Button>
                    <Button variant="outline">Tombol Outline</Button>
                    <Button variant="ghost">Tombol Ghost</Button>
                  </div>
                  <div className="mt-3 p-4 rounded-xl bg-biru-950 flex flex-wrap items-center gap-3">
                    <span className="text-xs text-biru-300 mr-2">
                      Varian Hero (Latar Gelap):
                    </span>
                    <Button variant="white">Tombol White (Hero CTA)</Button>
                    <Button variant="outline-white">
                      Tombol Outline White
                    </Button>
                  </div>
                  {/* Varian Hero / Latar Gelap */}
                  <div className="mt-3 p-4 rounded-xl bg-biru-950 flex flex-wrap items-center gap-3">
                    <span className="text-xs text-biru-300 mr-2">
                      Varian Hero (Latar Gelap):
                    </span>
                    <Button variant="white">Tombol White (Hero CTA)</Button>
                    <Button variant="outline-white">
                      Tombol Outline White
                    </Button>
                  </div>
                </div>

                {/* Sizes */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Ukuran (sm, md, lg)
                  </h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="primary" size="sm">
                      Kecil (sm)
                    </Button>
                    <Button variant="primary" size="md">
                      Standar (md)
                    </Button>
                    <Button variant="primary" size="lg">
                      Besar (lg)
                    </Button>
                  </div>
                </div>

                {/* With Icons & States */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Dengan Ikon & State
                  </h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="primary"
                      leftIcon={<Download className="h-4 w-4" />}
                    >
                      Unduh Formulir
                    </Button>
                    <Button
                      variant="outline"
                      rightIcon={<Mail className="h-4 w-4" />}
                    >
                      Kirim Notifikasi
                    </Button>
                    <Button variant="primary" isLoading>
                      Memproses Data...
                    </Button>
                    <Button variant="secondary" disabled>
                      Tombol Dinonaktifkan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logo Component Demo */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Identitas Institusi & Logo (Official Logo & Monogram Fallback)
                </CardTitle>
                <CardDescription>
                  Komponen Logo resmi berbasis SVG dengan dimensi eksplisit
                  (mencegah CLS) dan fallback monogram institusi jika terjadi
                  kegagalan pemuatan gambar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Mode Standar (Latar Terang / Navbar)
                  </h4>
                  <div className="p-4 rounded-xl border border-biru-100 bg-putih inline-block">
                    <Logo width={220} height={44} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Mode Gelap (Latar Gelap / Hero / Footer)
                  </h4>
                  <div className="p-4 rounded-xl bg-biru-950 border border-biru-900 inline-block">
                    <Logo width={220} height={44} theme="dark" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Fallback Monogram Otomatis (Saat URL Gambar Invalid)
                  </h4>
                  <div className="p-4 rounded-xl border border-biru-100 bg-biru-50/50 inline-block">
                    <Logo
                      width={220}
                      height={44}
                      src="/invalid-path-to-logo.svg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Badges / Status */}
            <Card>
              <CardHeader>
                <CardTitle>Lencana Status (Badge)</CardTitle>
                <CardDescription>
                  Status dibedakan lewat IKON + LABEL TEKS + variasi tingkat
                  biru & outline (tanpa merah/hijau/kuning sesuai aturan
                  desain).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    variant="berhasil"
                    icon={<CheckCircle className="h-3.5 w-3.5" />}
                  >
                    Berkas Diverifikasi
                  </Badge>
                  <Badge
                    variant="menunggu"
                    icon={<Clock className="h-3.5 w-3.5" />}
                  >
                    Menunggu Verifikasi
                  </Badge>
                  <Badge
                    variant="peringatan"
                    icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  >
                    Perlu Perbaikan Data
                  </Badge>
                  <Badge
                    variant="gagal"
                    icon={<XCircle className="h-3.5 w-3.5" />}
                  >
                    Tidak Memenuhi Syarat
                  </Badge>
                  <Badge
                    variant="netral"
                    icon={<HelpCircle className="h-3.5 w-3.5" />}
                  >
                    Draft Pendaftaran
                  </Badge>
                  <Badge variant="outline">Jalur Reguler</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. FORMS & INPUTS */}
          <TabsContent value="forms" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Komponen Formulir & Input</CardTitle>
                <CardDescription>
                  Semua input memiliki state fokus terlihat (ring-2
                  ring-biru-500), label, hint bantuan, dan pesan error
                  terintegrasi.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Text Input */}
                  <FormField
                    label="Nama Lengkap Sesuai KTP"
                    required
                    hint="Masukkan nama tanpa gelar kehormatan."
                  >
                    <Input
                      placeholder="Contoh: Budi Santoso"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                  </FormField>

                  {/* Input with Error */}
                  <FormField
                    label="Nomor Induk Kependudukan (NIK)"
                    required
                    error={
                      inputText.length > 0 && inputText.length < 16
                        ? "NIK harus terdiri dari 16 digit angka."
                        : undefined
                    }
                  >
                    <Input
                      placeholder="16 digit NIK"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      aria-invalid={
                        inputText.length > 0 && inputText.length < 16
                      }
                    />
                  </FormField>

                  {/* Select Dropdown */}
                  <FormField label="Pilihan Program Studi" required>
                    <Select
                      value={selectValue}
                      onChange={(e) => setSelectValue(e.target.value)}
                    >
                      <option value="s1-ti">S1 - Teknologi Informasi</option>
                      <option value="s1-si">S1 - Sistem Informasi</option>
                      <option value="s1-manajemen">
                        S1 - Manajemen Bisnis
                      </option>
                      <option value="s1-akuntansi">
                        S1 - Akuntansi Keuangan
                      </option>
                    </Select>
                  </FormField>

                  {/* Textarea */}
                  <FormField label="Alamat Tempat Tinggal Saat Ini">
                    <Textarea
                      placeholder="Tuliskan alamat lengkap beserta kode pos..."
                      rows={3}
                    />
                  </FormField>
                </div>

                {/* Selection Controls */}
                <div className="mt-8 border-t border-biru-100 pt-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-4">
                    Kontrol Pemilihan (Checkbox, Radio, Switch)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Checkbox */}
                    <div className="space-y-3">
                      <Checkbox
                        id="agree-checkbox"
                        checked={isChecked}
                        onChange={(e) => setIsChecked(e.target.checked)}
                        label="Saya menyetujui syarat & ketentuan"
                        description="Data yang diisi adalah benar dan dapat dipertanggungjawabkan."
                      />
                      <Checkbox
                        id="disabled-checkbox"
                        disabled
                        checked
                        label="Persetujuan Beasiswa (Terkunci)"
                      />
                    </div>

                    {/* Radio Group */}
                    <div className="space-y-2">
                      <Radio
                        id="radio-reguler"
                        name="jalur"
                        value="reguler"
                        checked={radioChoice === "reguler"}
                        onChange={() => setRadioChoice("reguler")}
                        label="Jalur Ujian Reguler"
                        description="Seleksi berbasis tes potensi akademik."
                      />
                      <Radio
                        id="radio-prestasi"
                        name="jalur"
                        value="prestasi"
                        checked={radioChoice === "prestasi"}
                        onChange={() => setRadioChoice("prestasi")}
                        label="Jalur Prestasi Rapor"
                        description="Seleksi berbasis nilai rapor semester 1-5."
                      />
                    </div>

                    {/* Switch */}
                    <div className="space-y-3">
                      <Switch
                        id="notif-switch"
                        checked={switchActive}
                        onChange={(checked) => setSwitchActive(checked)}
                        label="Notifikasi WhatsApp"
                        description="Kirim pembaruan status kelulusan via WA."
                      />
                    </div>
                  </div>
                </div>

                {/* File Upload Component */}
                <div className="mt-8 border-t border-biru-100 pt-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-4">
                    Komponen Unggah Berkas (FileUpload Drag-and-Drop)
                  </h4>
                  <FileUpload
                    onFilesSelected={(files) => {
                      toast({
                        title: "Berkas Dipilih",
                        description: `${files.length} berkas siap diunggah.`,
                        variant: "berhasil",
                      });
                    }}
                    accept=".pdf,.jpg,.jpeg,.png"
                    maxSizeMB={5}
                    multiple
                    label="Unggah Pasfoto & Scan Ijazah"
                    helperText="Mendukung PDF, JPG, PNG hingga 5MB. Maksimal 3 dokumen."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. NAVIGATION & STRUCTURE */}
          <TabsContent value="navigation" className="space-y-8">
            {/* Stepper */}
            <Card>
              <CardHeader>
                <CardTitle>Alur Pendaftaran (Stepper)</CardTitle>
                <CardDescription>
                  Menunjukkan progres pendaftaran bertahap dengan status
                  selesai, aktif, dan berikutnya.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Stepper
                  steps={STEPPER_STEPS}
                  currentStep={stepperStep}
                  onStepClick={(step) => setStepperStep(step)}
                />
                <div className="flex justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={stepperStep === 0}
                    onClick={() =>
                      setStepperStep((prev) => Math.max(0, prev - 1))
                    }
                  >
                    Langkah Sebelumnya
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={stepperStep === STEPPER_STEPS.length - 1}
                    onClick={() =>
                      setStepperStep((prev) =>
                        Math.min(STEPPER_STEPS.length - 1, prev + 1),
                      )
                    }
                  >
                    Langkah Selanjutnya
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Breadcrumb & Avatar */}
            <Card>
              <CardHeader>
                <CardTitle>Breadcrumb & Avatar</CardTitle>
                <CardDescription>
                  Penunjuk jalur navigasi rekam jejak dan visual profil
                  pengguna.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Breadcrumb
                  </h4>
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="#home">Beranda</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="#pmb">
                          Portal Pendaftaran
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Biodata Calon Mahasiswa</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Ukuran Avatar (sm, md, lg, xl)
                  </h4>
                  <div className="flex items-center gap-4">
                    <Avatar size="sm">
                      <AvatarFallback initials="AP" />
                    </Avatar>
                    <Avatar size="md">
                      <AvatarFallback initials="BS" />
                    </Avatar>
                    <Avatar size="lg">
                      <AvatarFallback initials="UP" />
                    </Avatar>
                    <Avatar size="xl">
                      <AvatarFallback initials="TR" />
                    </Avatar>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logo Component Demo */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Identitas Institusi & Logo (Official Logo & Monogram Fallback)
                </CardTitle>
                <CardDescription>
                  Komponen Logo resmi berbasis SVG dengan dimensi eksplisit
                  (mencegah CLS) dan fallback monogram institusi jika terjadi
                  kegagalan pemuatan gambar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Mode Standar (Latar Terang / Navbar)
                  </h4>
                  <div className="p-4 rounded-xl border border-biru-100 bg-putih inline-block">
                    <Logo width={220} height={44} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Mode Gelap (Latar Gelap / Hero / Footer)
                  </h4>
                  <div className="p-4 rounded-xl bg-biru-950 border border-biru-900 inline-block">
                    <Logo width={220} height={44} theme="dark" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Fallback Monogram Otomatis (Saat URL Gambar Invalid)
                  </h4>
                  <div className="p-4 rounded-xl border border-biru-100 bg-biru-50/50 inline-block">
                    <Logo
                      width={220}
                      height={44}
                      src="/invalid-path-to-logo.svg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logo Component Demo */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Identitas Institusi & Logo (Official Logo & Monogram Fallback)
                </CardTitle>
                <CardDescription>
                  Komponen Logo resmi berbasis SVG dengan dimensi eksplisit
                  (mencegah CLS) dan fallback monogram institusi jika terjadi
                  kegagalan pemuatan gambar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Mode Standar (Latar Terang / Navbar)
                  </h4>
                  <div className="p-4 rounded-xl border border-biru-100 bg-putih inline-block">
                    <Logo width={220} height={44} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Mode Gelap (Latar Gelap / Hero / Footer)
                  </h4>
                  <div className="p-4 rounded-xl bg-biru-950 border border-biru-900 inline-block">
                    <Logo width={220} height={44} theme="dark" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Fallback Monogram Otomatis (Saat URL Gambar Invalid)
                  </h4>
                  <div className="p-4 rounded-xl border border-biru-100 bg-biru-50/50 inline-block">
                    <Logo
                      width={220}
                      height={44}
                      src="/invalid-path-to-logo.svg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table & Pagination */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Tabel Responsif & Navigasi Halaman (Table & Pagination)
                </CardTitle>
                <CardDescription>
                  Tabel data dengan zebra striping halus dan pagination berbasis
                  nomor.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Pendaftaran</TableHead>
                      <TableHead>Nama Calon Mahasiswa</TableHead>
                      <TableHead>Program Studi</TableHead>
                      <TableHead>Jalur</TableHead>
                      <TableHead>Status Verifikasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono font-medium text-biru-950">
                        PMB-2026-001
                      </TableCell>
                      <TableCell>Ahmad Fauzi Pratama</TableCell>
                      <TableCell>S1 Teknologi Informasi</TableCell>
                      <TableCell>Prestasi Unggul</TableCell>
                      <TableCell>
                        <Badge
                          variant="berhasil"
                          icon={<CheckCircle className="h-3.5 w-3.5" />}
                        >
                          Lolos Berkas
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono font-medium text-biru-950">
                        PMB-2026-002
                      </TableCell>
                      <TableCell>Citra Dewi Lestari</TableCell>
                      <TableCell>S1 Sistem Informasi</TableCell>
                      <TableCell>Ujian Mandiri</TableCell>
                      <TableCell>
                        <Badge
                          variant="menunggu"
                          icon={<Clock className="h-3.5 w-3.5" />}
                        >
                          Menunggu Ujian
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono font-medium text-biru-950">
                        PMB-2026-003
                      </TableCell>
                      <TableCell>Bambang Sudarmono</TableCell>
                      <TableCell>S1 Akuntansi Keuangan</TableCell>
                      <TableCell>Beasiswa Triputra</TableCell>
                      <TableCell>
                        <Badge
                          variant="peringatan"
                          icon={<AlertTriangle className="h-3.5 w-3.5" />}
                        >
                          Perbaiki Ijazah
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="pt-2">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={8}
                    onPageChange={(page) => setCurrentPage(page)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. OVERLAYS, DIALOGS, DRAWER & TOOLTIPS */}
          <TabsContent value="overlays" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Dialog Modal & Drawer Sheet</CardTitle>
                <CardDescription>
                  Komponen overlay aksesibel dengan penutupan Escape, fokus
                  trap, dan backdrop biru halus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-4">
                  {/* Dialog Trigger */}
                  <Button variant="primary" onClick={() => setDialogOpen(true)}>
                    Buka Dialog Modal
                  </Button>

                  {/* Drawer Trigger */}
                  <Button variant="outline" onClick={() => setDrawerOpen(true)}>
                    Buka Drawer (Sheet Kanan)
                  </Button>

                  {/* Dropdown Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-10 items-center justify-center rounded-xl border border-biru-200 bg-putih px-4 text-sm font-medium text-biru-900 shadow-soft-sm transition-colors hover:bg-biru-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500">
                      Menu Aksi Dropdown
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="left">
                      <DropdownMenuLabel>Pilihan Tindakan</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() =>
                          toast({ title: "Lihat Detail", variant: "info" })
                        }
                      >
                        <User className="h-4 w-4" />
                        <span>Lihat Biodata</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          toast({ title: "Unduh Formulir", variant: "info" })
                        }
                      >
                        <Download className="h-4 w-4" />
                        <span>Unduh Bukti PDF</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled>
                        <span>Cetak Kartu Ujian (Terkunci)</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Tooltip */}
                  <Tooltip>
                    <TooltipTrigger className="inline-flex h-10 items-center justify-center rounded-xl border border-dashed border-biru-300 bg-biru-50 px-4 text-sm font-medium text-biru-800">
                      Arahkan Kursor / Fokus Ke Sini
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Informasi bantuan ringkas via tooltip
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Dialog Content */}
                <Dialog
                  isOpen={dialogOpen}
                  onClose={() => setDialogOpen(false)}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Konfirmasi Pengiriman Berkas</DialogTitle>
                      <DialogDescription>
                        Pastikan seluruh data dan dokumen yang Anda unggah sudah
                        benar. Setelah dikirim, Anda tidak dapat mengubah data
                        hingga diverifikasi panitia.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-xl border border-biru-200 bg-biru-50 p-4 text-xs text-biru-800">
                      <p className="font-semibold text-biru-950">
                        Perhatian Penting:
                      </p>
                      <p className="mt-1">
                        Pemeriksaan berkas membutuhkan waktu 1-3 hari kerja.
                        Notifikasi hasil verifikasi akan dikirimkan ke email
                        terdaftar.
                      </p>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() => setDialogOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setDialogOpen(false);
                          toast({
                            title: "Berkas Berhasil Terkirim",
                            description:
                              "Panitia sedang memproses verifikasi berkas Anda.",
                            variant: "berhasil",
                          });
                        }}
                      >
                        Ya, Kirim Sekarang
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Drawer Content */}
                <Drawer
                  isOpen={drawerOpen}
                  onClose={() => setDrawerOpen(false)}
                  side="right"
                  title="Panel Informasi PMB"
                >
                  <div className="space-y-4 py-2">
                    <p className="text-sm text-biru-700">
                      Drawer sheet ini dapat digunakan untuk ringkasan biaya,
                      formulir cepat samping, atau menu navigasi mobile.
                    </p>
                    <div className="rounded-xl border border-biru-200 bg-biru-50 p-4 space-y-2">
                      <p className="text-xs font-semibold text-biru-950">
                        Statistik Kuota Prodi:
                      </p>
                      <p className="text-xs text-biru-800">
                        S1 Teknik Informatika: 45 / 80 Kursi Terisi
                      </p>
                      <p className="text-xs text-biru-800">
                        S1 Sistem Informasi: 30 / 60 Kursi Terisi
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setDrawerOpen(false)}
                    >
                      Tutup Panel
                    </Button>
                  </div>
                </Drawer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 6. STATES: SKELETON, EMPTY, ERROR */}
          <TabsContent value="states" className="space-y-8">
            {/* Loading / Skeleton States */}
            <Card>
              <CardHeader>
                <CardTitle>State Memuat Data (Skeleton Loaders)</CardTitle>
                <CardDescription>
                  Placeholder animasi pulsa halus saat data API sedang di-fetch.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Card Skeleton
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CardSkeleton />
                    <CardSkeleton />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-biru-700 mb-3">
                    Table Skeleton
                  </h4>
                  <TableSkeleton rows={3} cols={4} />
                </div>
              </CardContent>
            </Card>

            {/* Empty State */}
            <Card>
              <CardHeader>
                <CardTitle>State Kosong (EmptyState)</CardTitle>
                <CardDescription>
                  Tampilan informatif saat belum ada data pendaftaran atau
                  riwayat pembayaran.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  title="Belum Ada Dokumen Terunggah"
                  description="Silakan unggah pasfoto formal dan scan ijazah SMA/SMK sederajat untuk melanjutkan proses verifikasi."
                  action={{
                    label: "Mulai Unggah Dokumen",
                    onClick: () =>
                      toast({
                        title: "Membuka Upload",
                        description: "Aksi unggah dokumen dijalankan.",
                      }),
                  }}
                />
              </CardContent>
            </Card>

            {/* Error State */}
            <Card>
              <CardHeader>
                <CardTitle>State Gagal / Error (ErrorState)</CardTitle>
                <CardDescription>
                  Tampilan ramah pengguna dengan tombol coba lagi saat koneksi
                  API gagal atau terjadi kendala server.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorState
                  title="Gagal Mengambil Data Pendaftaran"
                  message="Server tidak dapat dihubungi atau sesi Anda telah berakhir. Silakan periksa koneksi internet Anda dan coba kembali."
                  onRetry={() =>
                    toast({
                      title: "Mencoba Kembali",
                      description: "Mengirim ulang request ke server...",
                    })
                  }
                  retryLabel="Muat Ulang Data"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
