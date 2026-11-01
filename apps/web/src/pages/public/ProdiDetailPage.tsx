import React from "react";
import { useParams, Link } from "react-router-dom";
import {
  GraduationCap,
  Award,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Building2,
} from "lucide-react";
import { Button, Card } from "../../components/common";
import { SeoHead } from "../../components/common/SeoHead";

interface ProdiDetailInfo {
  id: string;
  kode: string;
  nama: string;
  jenjang: "S1" | "D3";
  fakultas: string;
  akreditasi: string;
  gelar: string;
  totalSks: number;
  kuota: number;
  passingScore: number;
  uktPerSemester: number;
  dppAwal: number;
  deskripsi: string;
  visi: string;
  misi: string[];
  kompetensiUnggulan: string[];
  mataKuliahKunci: { kode: string; nama: string; sks: number }[];
  prospekKarier: string[];
  fasilitasLab: string[];
}

const PRODI_DATABASE: Record<string, ProdiDetailInfo> = {
  "s1-sd": {
    id: "s1-sd",
    kode: "SD",
    nama: "Sains Data",
    jenjang: "S1",
    fakultas: "Fakultas Sains & Teknologi",
    akreditasi: "Baik Sekali (BAN-PT)",
    gelar: "S.Si. (Sarjana Sains)",
    totalSks: 144,
    kuota: 60,
    passingScore: 72.0,
    uktPerSemester: 5500000,
    dppAwal: 8000000,
    deskripsi:
      "Program Studi S1 Sains Data menghasilkan lulusan yang mahir dalam ekstraksi wawasan dari data skala besar (Big Data), pemodelan Machine Learning, Artificial Intelligence, dan visualisasi data bisnis untuk pengambilan keputusan strategis.",
    visi: "Menjadi program studi sains data terkemuka di tingkat nasional yang menghasilkan ilmuwan data berkarakter unggul dan inovatif berbasis kebutuhan industri pada tahun 2030.",
    misi: [
      "Menyelenggarakan pendidikan sains data berkualitas tinggi dengan kurikulum berbasis proyek industri nyata.",
      "Melaksanakan riset terapan bidang kecerdasan buatan dan analitik prediktif.",
      "Mengabdi pada masyarakat melalui pemanfaatan data untuk transformasi digital organisasi dan UMKM.",
    ],
    kompetensiUnggulan: [
      "Machine Learning & Deep Learning Terapan",
      "Big Data Engineering & Cloud Architecture (GCP & AWS)",
      "Business Intelligence & Executive Dashboarding",
      "Natural Language Processing (NLP) & Computer Vision",
    ],
    mataKuliahKunci: [
      { kode: "SD101", nama: "Pemrograman Python untuk Sains Data", sks: 3 },
      { kode: "SD204", nama: "Probabilitas & Statistika Multivariat", sks: 3 },
      { kode: "SD302", nama: "Machine Learning & Pemodelan Prediktif", sks: 4 },
      { kode: "SD308", nama: "Arsitektur Data Warehouse & Big Data", sks: 3 },
      {
        kode: "SD401",
        nama: "Deep Learning & Artificial Intelligence",
        sks: 4,
      },
    ],
    prospekKarier: [
      "Data Scientist & AI Specialist",
      "Machine Learning Engineer",
      "Business Intelligence Analyst",
      "Big Data Architect",
      "Quantitative Data Researcher",
    ],
    fasilitasLab: [
      "Laboratorium Komputasi AI & GPU High-Performance",
      "Laboratorium Big Data Analytics",
      "Studio Kolaborasi Inovasi Triputra",
    ],
  },
  "s1-ti": {
    id: "s1-ti",
    kode: "TI",
    nama: "Teknologi Informasi",
    jenjang: "S1",
    fakultas: "Fakultas Sains & Teknologi",
    akreditasi: "Baik Sekali (BAN-PT)",
    gelar: "S.Kom. (Sarjana Komputer)",
    totalSks: 144,
    kuota: 80,
    passingScore: 75.0,
    uktPerSemester: 5000000,
    dppAwal: 7500000,
    deskripsi:
      "Program Studi S1 Teknologi Informasi berfokus pada rekayasa perangkat lunak modern (Full-Stack Engineering), keamanan siber (Cybersecurity), komputasi awan (Cloud Computing), dan integrasi sistem enterprise.",
    visi: "Menjadi pusat unggulan pendidikan teknologi informasi yang adaptif terhadap revolusi industri dan menghasilkan perekayasa perangkat lunak berintegritas tinggi.",
    misi: [
      "Mendidik insinyur TI dengan kemampuan pemecahan masalah algoritma dan sistem terdistribusi.",
      "Mengembangkan ekosistem riset terapan di bidang keamanan siber dan Internet of Things (IoT).",
      "Menjalin sinergi kemitraan strategis dengan perusahaan teknologi nasional dan multinasional.",
    ],
    kompetensiUnggulan: [
      "Full-Stack Web & Mobile App Development",
      "DevOps & Cloud Infrastructure Engineering",
      "Cybersecurity Defense & Ethical Hacking",
      "Microservices & Enterprise System Integration",
    ],
    mataKuliahKunci: [
      { kode: "TI102", nama: "Struktur Data & Algoritma Lanjut", sks: 4 },
      {
        kode: "TI205",
        nama: "Pemrograman Web Modern (React & Node.js)",
        sks: 3,
      },
      { kode: "TI301", nama: "Rekayasa Perangkat Lunak Agile", sks: 3 },
      { kode: "TI307", nama: "Cloud Computing & DevOps", sks: 3 },
      { kode: "TI402", nama: "Keamanan Sistem Jaringan & Siber", sks: 3 },
    ],
    prospekKarier: [
      "Full-Stack Software Engineer",
      "Cloud & DevOps Engineer",
      "Cybersecurity Specialist",
      "Mobile Application Developer",
      "IT Infrastructure Specialist",
    ],
    fasilitasLab: [
      "Laboratorium Software Engineering Terpadu",
      "Laboratorium Cyber Security & Jaringan Komputer",
      "Laboratorium Cloud Infrastructure",
    ],
  },
  "s1-si": {
    id: "s1-si",
    kode: "SI",
    nama: "Sistem Informasi",
    jenjang: "S1",
    fakultas: "Fakultas Sains & Teknologi",
    akreditasi: "Baik Sekali (BAN-PT)",
    gelar: "S.Kom. (Sarjana Komputer)",
    totalSks: 144,
    kuota: 80,
    passingScore: 70.0,
    uktPerSemester: 4800000,
    dppAwal: 7000000,
    deskripsi:
      "Program Studi S1 Sistem Informasi menjembatani kebutuhan proses bisnis korporasi dengan solusi teknologi digital, perencanaan sistem enterprise (ERP), dan tata kelola TI.",
    visi: "Menjadi program studi sistem informasi yang unggul dalam integrasi bisnis digital dan kepemimpinan sistem enterprise.",
    misi: [
      "Menyelenggarakan pembelajaran sistem informasi yang menekankan analisis bisnis dan transformasi digital.",
      "Mengembangkan penelitian sistem informasi manajemen berbasis industri.",
      "Mendorong kewirausahaan digital (Technopreneurship) di kalangan mahasiswa.",
    ],
    kompetensiUnggulan: [
      "Enterprise Resource Planning (ERP)",
      "Business Process Management & Reengineering",
      "IT Governance, Risk & Compliance (GRC)",
      "Product Management & Digital Strategy",
    ],
    mataKuliahKunci: [
      { kode: "SI101", nama: "Konsep Sistem Informasi Bisnis", sks: 3 },
      { kode: "SI203", nama: "Analisis & Perancangan Sistem", sks: 4 },
      { kode: "SI301", nama: "Enterprise Resource Planning (ERP)", sks: 3 },
      { kode: "SI305", nama: "Manajemen Proyek TI", sks: 3 },
      { kode: "SI403", nama: "Tata Kelola & Audit TI", sks: 3 },
    ],
    prospekKarier: [
      "IT Business Analyst",
      "ERP Consultant",
      "Product Manager",
      "IT Auditor & Risk Consultant",
      "Digital Transformation Lead",
    ],
    fasilitasLab: [
      "Laboratorium Simulasi ERP SAP/Odoo",
      "Laboratorium Analisis Bisnis & Sistem",
      "Inkubator Bisnis & Technopreneurship",
    ],
  },
  "s1-mn": {
    id: "s1-mn",
    kode: "MN",
    nama: "Manajemen",
    jenjang: "S1",
    fakultas: "Fakultas Ekonomi & Bisnis",
    akreditasi: "Unggul (BAN-PT)",
    gelar: "S.M. (Sarjana Manajemen)",
    totalSks: 144,
    kuota: 90,
    passingScore: 70.0,
    uktPerSemester: 4500000,
    dppAwal: 6500000,
    deskripsi:
      "Program Studi S1 Manajemen membentuk calon pemimpin bisnis dan manajer profesional yang kompeten dalam manajemen rantai pasok (supply chain), pemasaran digital, dan strategi keuangan korporat.",
    visi: "Menjadi program studi manajemen terkemuka yang melahirkan wirausahawan dan manajer transformatif berintegritas tinggi.",
    misi: [
      "Menyediakan pendidikan manajemen terkini dengan studi kasus industri nyata.",
      "Menghasilkan riset manajerial yang berdampak pada peningkatan daya saing bisnis nasional.",
      "Membina jiwa kepemimpinan etis dan tangguh menghadapi dinamika global.",
    ],
    kompetensiUnggulan: [
      "Supply Chain & Operations Management",
      "Digital Marketing & Brand Strategy",
      "Corporate Financial Planning",
      "Strategic Human Resource Management",
    ],
    mataKuliahKunci: [
      { kode: "MN102", nama: "Pengantar Manajemen & Bisnis", sks: 3 },
      { kode: "MN204", nama: "Manajemen Pemasaran Digital", sks: 3 },
      { kode: "MN301", nama: "Manajemen Rantai Pasok (Supply Chain)", sks: 3 },
      { kode: "MN306", nama: "Manajemen Keuangan Korporat", sks: 3 },
      { kode: "MN401", nama: "Manajemen Strategik & Kepemimpinan", sks: 3 },
    ],
    prospekKarier: [
      "Management Trainee di Triputra Group",
      "Supply Chain & Logistics Specialist",
      "Digital Marketing Strategist",
      "Corporate Financial Analyst",
      "Business Founder / Entrepreneur",
    ],
    fasilitasLab: [
      "Laboratorium Simulasi Bisnis & Pasar Modal",
      "Studio Pemasaran Kreatif Digital",
      "Executive Leadership Center",
    ],
  },
  "s1-ak": {
    id: "s1-ak",
    kode: "AK",
    nama: "Akuntansi",
    jenjang: "S1",
    fakultas: "Fakultas Ekonomi & Bisnis",
    akreditasi: "Baik Sekali (BAN-PT)",
    gelar: "S.Ak. (Sarjana Akuntansi)",
    totalSks: 144,
    kuota: 70,
    passingScore: 70.0,
    uktPerSemester: 4500000,
    dppAwal: 6500000,
    deskripsi:
      "Program Studi S1 Akuntansi mengintegrasikan standar pelaporan keuangan internasional (IFRS), audit forensik, perpajakan modern, dan pemanfaatan sistem informasi akuntansi berbasis AI.",
    visi: "Menjadi program studi akuntansi terpercaya yang menghasilkan akuntan profesional dan auditor berintegritas tinggi.",
    misi: [
      "Menyelenggarakan pendidikan akuntansi berbasis sertifikasi profesional (CA, CPA, CMA).",
      "Mengembangkan keahlian analitika data keuangan dan forensik digital.",
      "Menegakkan etika profesi akuntan dalam setiap aktivitas tridharma.",
    ],
    kompetensiUnggulan: [
      "Financial Reporting & IFRS Compliance",
      "Forensic Accounting & Fraud Auditing",
      "Tax Planning & International Taxation",
      "Accounting Information Systems & Analytics",
    ],
    mataKuliahKunci: [
      { kode: "AK101", nama: "Pengantar Akuntansi Keuangan", sks: 3 },
      { kode: "AK203", nama: "Akuntansi Keuangan Menengah", sks: 4 },
      { kode: "AK301", nama: "Audit & Asurans", sks: 3 },
      { kode: "AK305", nama: "Perpajakan Indonesia & Internasional", sks: 3 },
      { kode: "AK402", nama: "Akuntansi Forensik & Investigasi", sks: 3 },
    ],
    prospekKarier: [
      "Auditor di KAP (Big Four & Nasional)",
      "Financial Controller & Corporate Accountant",
      "Tax Consultant",
      "Forensic Accounting Specialist",
      "Budget & Financial Planner",
    ],
    fasilitasLab: [
      "Laboratorium Tax Center & E-Filing",
      "Laboratorium Audit Komputer & Forensik",
      "Laboratorium Software Akuntansi Enterprise",
    ],
  },
  "d3-kp": {
    id: "d3-kp",
    kode: "KP",
    nama: "Keuangan & Perbankan",
    jenjang: "D3",
    fakultas: "Program Vokasi",
    akreditasi: "Baik Sekali (BAN-PT)",
    gelar: "A.Md.Ak. (Ahli Madya)",
    totalSks: 110,
    kuota: 50,
    passingScore: 65.0,
    uktPerSemester: 3500000,
    dppAwal: 5000000,
    deskripsi:
      "Program Diploma 3 Keuangan & Perbankan menekankan keterampilan operasional perbankan terapan, teknologi perbankan digital (FinTech), layanan nasabah prima, dan analisis kredit perbankan.",
    visi: "Menjadi program vokasi perbankan unggulan yang menghasilkan praktisi keuangan siap kerja dengan sertifikasi kompetensi profesi.",
    misi: [
      "Melaksanakan pendidikan vokasi dengan rasio 70% praktikum dan 30% teori.",
      "Membekali mahasiswa dengan sertifikasi General Banking Level 1 dari LSPP/BNSP.",
      "Menjalin kemitraan magang kerja di bank BUMN, swasta, dan lembaga keuangan mikro.",
    ],
    kompetensiUnggulan: [
      "Banking Operations & Customer Service Excellence",
      "Credit Analysis & Lending Management",
      "FinTech & Digital Payment Systems",
      "Treasury & Wealth Management Basics",
    ],
    mataKuliahKunci: [
      { kode: "KP101", nama: "Operasional Perbankan & Layanan", sks: 3 },
      { kode: "KP202", nama: "Analisis Kredit & Pembiayaan", sks: 3 },
      { kode: "KP205", nama: "FinTech & Inovasi Pembayaran Digital", sks: 3 },
      { kode: "KP301", nama: "Praktikum Bank Mini", sks: 4 },
      { kode: "KP304", nama: "Magang Industri Perbankan (6 Bulan)", sks: 6 },
    ],
    prospekKarier: [
      "Customer Service & Teller Perbankan",
      "Account Officer & Credit Analyst",
      "FinTech Operations Associate",
      "Back Office & Branch Operations Staff",
      "Treasury Operations Assistant",
    ],
    fasilitasLab: [
      "Laboratorium Bank Mini Terintegrasi",
      "Laboratorium Simulasi Transaksi FinTech",
      "Front Office & Customer Service Simulation",
    ],
  },
};

export const ProdiDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const prodiKey = (id || "s1-sd").toLowerCase();
  const prodi = PRODI_DATABASE[prodiKey] || PRODI_DATABASE["s1-sd"];

  return (
    <div className="space-y-16 pb-20">
      <SeoHead
        title={`${prodi.jenjang} ${prodi.nama} | Program Studi PMB UPITRA`}
        description={`Profil lengkap Program Studi ${prodi.jenjang} ${prodi.nama} Universitas Pignatelli Triputra. Akreditasi: ${prodi.akreditasi}, Kuota: ${prodi.kuota}, Kurikulum & Prospek Karier.`}
      />

      {/* Header Banner */}
      <section className="bg-gradient-to-br from-biru-950 via-biru-900 to-biru-800 text-putih py-14 border-b border-biru-800">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <Link
            to="/prodi"
            className="inline-flex items-center gap-1.5 text-xs text-biru-300 hover:text-putih transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Program Studi</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-800 text-biru-200 border border-biru-700">
              {prodi.fakultas}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-500/20 text-biru-300 border border-biru-400/30">
              Jenjang {prodi.jenjang}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-500/20 text-biru-300 border border-biru-400/30">
              Akreditasi: {prodi.akreditasi}
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-putih">
            Program Studi {prodi.jenjang} {prodi.nama}
          </h1>

          <p className="text-sm sm:text-base text-biru-100 max-w-3xl font-sans leading-relaxed">
            {prodi.deskripsi}
          </p>

          <div className="flex flex-wrap items-center gap-6 pt-4 text-xs text-biru-200 border-t border-biru-800/80">
            <div>
              <span className="text-biru-400">Gelar Kelulusan:</span>{" "}
              <strong className="text-putih">{prodi.gelar}</strong>
            </div>
            <div>
              <span className="text-biru-400">Total Beban Studi:</span>{" "}
              <strong className="text-putih">{prodi.totalSks} SKS</strong>
            </div>
            <div>
              <span className="text-biru-400">Daya Tampung / Kuota:</span>{" "}
              <strong className="text-putih">{prodi.kuota} Mahasiswa</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Kolom Kiri: Detail Akademik */}
          <div className="lg:col-span-8 space-y-10">
            {/* 1. Visi & Misi */}
            <Card className="p-6 sm:p-8 border-biru-200 space-y-5">
              <h2 className="font-serif text-2xl font-bold text-biru-950 flex items-center gap-2">
                <Award className="w-5 h-5 text-biru-700" />
                Visi &amp; Misi Program Studi
              </h2>
              <div className="rounded-xl bg-biru-50 p-4 border border-biru-200 text-xs text-biru-900 space-y-1.5">
                <strong className="text-sm font-bold text-biru-950 block">
                  Visi:
                </strong>
                <p className="italic leading-relaxed">{prodi.visi}</p>
              </div>
              <div className="space-y-2">
                <strong className="text-xs font-bold uppercase tracking-wider text-biru-800 block">
                  Misi Utama:
                </strong>
                <ul className="text-xs text-biru-800 space-y-2">
                  {prodi.misi.map((m, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-biru-100 text-biru-800 flex items-center justify-center font-bold shrink-0 mt-0.5 text-[11px]">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* 2. Kompetensi Unggulan */}
            <Card className="p-6 sm:p-8 border-biru-200 space-y-5">
              <h2 className="font-serif text-2xl font-bold text-biru-950 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-biru-700" />
                Kompetensi Unggulan Lulusan
              </h2>
              <p className="text-xs text-biru-700">
                Lulusan dibekali keahlian spesifik yang terhubung langsung
                dengan kebutuhan dunia industri masa kini.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {prodi.kompetensiUnggulan.map((comp, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-biru-200 bg-putih flex items-start gap-2.5 shadow-soft-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-biru-600 shrink-0 mt-0.5" />
                    <span className="font-medium text-biru-900 leading-snug">
                      {comp}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 3. Mata Kuliah Kunci & Kurikulum */}
            <Card className="p-6 sm:p-8 border-biru-200 space-y-5">
              <h2 className="font-serif text-2xl font-bold text-biru-950 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-biru-700" />
                Mata Kuliah Kunci / Praktikum Industri
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-biru-200 bg-biru-50/70 text-biru-950 font-bold">
                      <th className="py-2.5 px-3">Kode</th>
                      <th className="py-2.5 px-3">Nama Mata Kuliah</th>
                      <th className="py-2.5 px-3 text-center">Beban SKS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-biru-100 text-biru-800 font-sans">
                    {prodi.mataKuliahKunci.map((mk) => (
                      <tr key={mk.kode} className="hover:bg-biru-50/50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-biru-900">
                          {mk.kode}
                        </td>
                        <td className="py-2.5 px-3 font-medium">{mk.nama}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-biru-950">
                          {mk.sks} SKS
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* 4. Prospek Karier & Fasilitas Laboratorium */}
            <Card className="p-6 sm:p-8 border-biru-200 space-y-6">
              <div className="space-y-4">
                <h2 className="font-serif text-2xl font-bold text-biru-950 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-biru-700" />
                  Peluang &amp; Prospek Karier
                </h2>
                <div className="flex flex-wrap gap-2">
                  {prodi.prospekKarier.map((karier, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-biru-100 text-biru-900"
                    >
                      {karier}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-biru-100">
                <h3 className="font-serif text-lg font-bold text-biru-950 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-biru-700" />
                  Fasilitas Laboratorium Unggulan
                </h3>
                <ul className="text-xs text-biru-800 space-y-2">
                  {prodi.fasilitasLab.map((lab, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-biru-600 shrink-0" />
                      <span>{lab}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          {/* Kolom Kanan: Sticky Kartu Biaya & Aksi Pendaftaran */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <Card className="p-6 sm:p-7 border-biru-300 bg-gradient-to-b from-biru-50/60 to-putih space-y-5 shadow-soft-md">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-biru-600">
                  Estimasi Biaya Studi
                </span>
                <h3 className="font-serif text-2xl font-bold text-biru-950">
                  Rp {prodi.uktPerSemester.toLocaleString("id-ID")}
                  <span className="text-xs font-normal text-biru-700 font-sans ml-1">
                    / semester
                  </span>
                </h3>
              </div>

              <div className="space-y-2.5 text-xs text-biru-800 border-y border-biru-200 py-3.5">
                <div className="flex items-center justify-between">
                  <span>Dana Pengembangan (DPP):</span>
                  <span className="font-bold text-biru-950">
                    Rp {prodi.dppAwal.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Biaya Formulir PMB:</span>
                  <span className="font-bold text-biru-950">Rp 250.000</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sistem Pembayaran:</span>
                  <span className="text-biru-700 font-medium">
                    Bisa Diangsur 3x
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <Link to={`/register?prodi=${prodi.kode}`} className="block">
                  <Button
                    variant="primary"
                    className="w-full text-xs font-bold py-3 shadow-soft-sm"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Daftar ke Prodi Ini Sekarang
                  </Button>
                </Link>
                <Link to="/biaya" className="block">
                  <Button
                    variant="outline"
                    className="w-full text-xs font-semibold py-2.5"
                  >
                    Kalkulator Simulasi Biaya &rarr;
                  </Button>
                </Link>
              </div>

              <div className="rounded-xl border border-biru-200 bg-biru-50/70 p-3.5 text-xs text-biru-800 space-y-1">
                <p className="font-bold text-biru-950">
                  Butuh Konsultasi Penjurusan?
                </p>
                <p className="text-[11px] text-biru-700">
                  Hubungi konselor akademik PMB UPITRA via WhatsApp untuk info
                  prospek & beasiswa.
                </p>
                <a
                  href="https://wa.me/6281234567890?text=Halo%20Panitia%20PMB%20UPITRA,%20saya%20ingin%20konsultasi%20Program%20Studi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-biru-800 hover:text-biru-950 underline block pt-1"
                >
                  WhatsApp Konselor PMB &rarr;
                </a>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};
