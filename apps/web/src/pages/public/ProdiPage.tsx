import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Briefcase,
  Users,
  Search,
  ArrowRight,
} from "lucide-react";
import {
  Button,
  Card,
  StatusBadge,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";

interface ProgramStudiItem {
  id: string;
  kode: string;
  nama: string;
  jenjang: "S1" | "D3";
  fakultas: string;
  passingScore: number;
  kuota: number;
  uktNominal: number;
  deskripsi: string;
  prospekKarier: string[];
}

const DAFTAR_PRODI: ProgramStudiItem[] = [
  {
    id: "s1-si",
    kode: "SI",
    nama: "Sistem Informasi",
    jenjang: "S1",
    fakultas: "Fakultas Sains & Teknologi",
    passingScore: 70.0,
    kuota: 80,
    uktNominal: 6500000,
    deskripsi:
      "Fokus pada integrasi strategi bisnis modern dan teknologi informasi enterprise, tata kelola data digital, analitik AI, dan arsitektur ERP tingkat industri.",
    prospekKarier: [
      "Enterprise System Analyst",
      "IT Business Consultant",
      "Product Manager",
      "Data Analyst & BI Specialist",
    ],
  },
  {
    id: "s1-if",
    kode: "IF",
    nama: "Informatika",
    jenjang: "S1",
    fakultas: "Fakultas Sains & Teknologi",
    passingScore: 75.0,
    kuota: 100,
    uktNominal: 7000000,
    deskripsi:
      "Mempelajari rekayasa perangkat lunak skala global, kecerdasan buatan (AI/ML), cloud computing, keamanan siber, dan infrastruktur sistem terdistribusi.",
    prospekKarier: [
      "Full-Stack Software Engineer",
      "AI/Machine Learning Engineer",
      "DevOps & Cloud Specialist",
      "Cybersecurity Analyst",
    ],
  },
  {
    id: "s1-akt",
    kode: "AKT",
    nama: "Akuntansi Bisnis Digital",
    jenjang: "S1",
    fakultas: "Fakultas Ekonomi & Bisnis",
    passingScore: 75.0,
    kuota: 60,
    uktNominal: 6000000,
    deskripsi:
      "Menggabungkan keahlian audit keuangan berstandar internasional dengan analitik data forensik digital, otomasi perpajakan, dan fintech systems.",
    prospekKarier: [
      "Auditor Kantor Akuntan Publik (KAP)",
      "Financial Controller",
      "Tax Consultant",
      "Fintech Risk Analyst",
    ],
  },
  {
    id: "d3-mnj",
    kode: "MNJ",
    nama: "Manajemen Pemasaran Digital",
    jenjang: "D3",
    fakultas: "Fakultas Ekonomi & Bisnis",
    passingScore: 65.0,
    kuota: 50,
    uktNominal: 5000000,
    deskripsi:
      "Program vokasi terapan 3 tahun yang membekali mahasiswa keahlian growth marketing, e-commerce operations, digital branding, dan supply chain retail.",
    prospekKarier: [
      "Digital Marketing Specialist",
      "E-commerce Brand Specialist",
      "Account Executive",
      "Supply Chain Associate",
    ],
  },
  {
    id: "d3-ti",
    kode: "TI",
    nama: "Teknologi Informasi Terapan",
    jenjang: "D3",
    fakultas: "Fakultas Sains & Teknologi",
    passingScore: 60.0,
    kuota: 50,
    uktNominal: 5000000,
    deskripsi:
      "Program pendidikan vokasi terapan 3 tahun siap kerja dengan penguasaan pemrograman web/mobile dan administrasi sistem basis data.",
    prospekKarier: [
      "Junior Full-Stack Web Developer",
      "Database Administrator",
      "IT Support Specialist",
      "Network Administrator",
    ],
  },
];

export const ProdiPage: React.FC = () => {
  const [filterJenjang, setFilterJenjang] = useState<"ALL" | "S1" | "D3">(
    "ALL",
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const filteredProdi = DAFTAR_PRODI.filter((p) => {
    const matchesJenjang =
      filterJenjang === "ALL" || p.jenjang === filterJenjang;
    const matchesSearch =
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fakultas.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesJenjang && matchesSearch;
  });

  return (
    <div className="bg-biru-50/30 flex flex-col">
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Header Halaman */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biru-100 text-biru-900 text-xs font-semibold">
            <GraduationCap className="w-4 h-4 text-biru-700" />
            <span>Fakultas & Kurikulum Industri</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-biru-950">
            Program Studi Berkualitas Tinggi
          </h1>
          <p className="text-base text-biru-800/90 leading-relaxed font-light">
            Setiap program studi dirancang bersama asosiasi industri dan
            Triputra Group untuk memastikan lulusan siap kerja dengan kompetensi
            yang paling dicari dunia profesional.
          </p>
        </div>

        {/* Filter & Bar Pencarian */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-biru-50/70 border border-biru-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {(["ALL", "S1", "D3"] as const).map((jenjang) => (
              <button
                key={jenjang}
                onClick={() => setFilterJenjang(jenjang)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filterJenjang === jenjang
                    ? "bg-biru-700 text-putih shadow-xs"
                    : "bg-putih text-biru-900 border border-biru-200 hover:bg-biru-100"
                }`}
              >
                {jenjang === "ALL" ? "Semua Jenjang" : jenjang}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-biru-600" />
            <input
              type="text"
              placeholder="Cari program studi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-putih border border-biru-200 rounded-xl text-xs text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
            />
          </div>
        </div>

        {/* Loading State (Skeleton) */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && (
          <ErrorState
            title="Gagal Memuat Program Studi"
            message="Terjadi kesalahan jaringan saat mengambil data program studi. Silakan coba kembali."
            onRetry={() => {
              setIsError(false);
              setIsLoading(false);
            }}
          />
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredProdi.length === 0 && (
          <EmptyState
            title="Program Studi Tidak Ditemukan"
            description="Tidak ada program studi yang cocok dengan kata kunci pencarian atau filter jenjang yang Anda tentukan."
            actionLabel="Reset Filter"
            onAction={() => {
              setFilterJenjang("ALL");
              setSearchQuery("");
            }}
          />
        )}

        {/* Data Grid Program Studi */}
        {!isLoading && !isError && filteredProdi.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProdi.map((prodi) => (
              <Card
                key={prodi.id}
                className="flex flex-col justify-between hover:border-biru-600 transition-all hover:shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-lg bg-biru-100 text-biru-950 font-bold text-xs border border-biru-200">
                      {prodi.jenjang} - {prodi.kode}
                    </span>
                    <StatusBadge
                      status="berhasil"
                      label={`Passing: ${prodi.passingScore}`}
                      size="sm"
                    />
                  </div>

                  <div>
                    <h3 className="font-serif text-2xl font-bold text-biru-950">
                      {prodi.nama}
                    </h3>
                    <p className="text-xs text-biru-800 font-medium">
                      {prodi.fakultas}
                    </p>
                  </div>

                  <p className="text-sm text-biru-900/80 leading-relaxed font-light">
                    {prodi.deskripsi}
                  </p>

                  <div className="pt-3 border-t border-biru-100 grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-biru-50/60 border border-biru-100">
                      <span className="text-biru-800 block">Daya Tampung</span>
                      <span className="font-bold text-biru-950 flex items-center gap-1 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-biru-700" />
                        {prodi.kuota} Mahasiswa
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-biru-50/60 border border-biru-100">
                      <span className="text-biru-800 block">
                        Biaya UKT / Smt
                      </span>
                      <span className="font-bold text-biru-950 block mt-0.5 font-mono">
                        Rp {prodi.uktNominal.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-biru-950 block flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-biru-700" />
                      Prospek Karier Lulusan:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {prodi.prospekKarier.map((karier, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md bg-biru-50 text-biru-900 text-[11px] font-medium border border-biru-200"
                        >
                          {karier}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-biru-100">
                  <Link to="/register">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full gap-2"
                    >
                      <span>Pilih Prodi Ini & Daftar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
