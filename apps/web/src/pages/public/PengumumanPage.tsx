import React, { useState } from "react";
import {
  Bell,
  Calendar,
  Download,
  FileText,
  Search,
  ArrowRight,
} from "lucide-react";
import {
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";

interface PengumumanItem {
  id: string;
  slug: string;
  judul: string;
  kategori: "PENGUMUMAN" | "BEASISWA" | "PANDUAN" | "FAQ";
  ringkasan: string;
  konten: string;
  tanggal: string;
}

const DAFTAR_PENGUMUMAN: PengumumanItem[] = [
  {
    id: "1",
    slug: "pembukaan-pmb-gelombang-1-2026",
    judul:
      "Pembukaan Pendaftaran Mahasiswa Baru Gelombang 1 Tahun Akademik 2026/2027",
    kategori: "PENGUMUMAN",
    ringkasan:
      "Pendaftaran gelombang pertama resmi dibuka mulai 1 Oktober 2026 hingga 31 Desember 2026 dengan kuota beasiswa early bird.",
    konten:
      "Universitas Pignatelli Triputra membuka kesempatan bagi lulusan SMA/SMK/MA sederajat untuk bergabung pada Gelombang 1. Peserta berkesempatan memperoleh diskon formulir dengan kode voucher TRIPUTRA2026 dan kemudahan seleksi Computer-Based Test daring dari rumah.",
    tanggal: "01 Oktober 2026",
  },
  {
    id: "2",
    slug: "beasiswa-prestasi-triputra-group",
    judul: "Program Beasiswa Penuh Kemitraan Triputra Group 2026",
    kategori: "BEASISWA",
    ringkasan:
      "Peluang beasiswa kuliah bebas UKT 100% dan penempatan kerja prioritas bagi 50 pendaftar terbaik jalur prestasi.",
    konten:
      "Program beasiswa ini mencakup pembebasan biaya kuliah selama 8 semester, uang saku buku per semester, serta program kepemimpinan Triputra Young Leaders. Seleksi dilakukan berdasarkan portofolio prestasi dan wawancara panel industri.",
    tanggal: "15 Oktober 2026",
  },
  {
    id: "3",
    slug: "panduan-teknis-cbt-online",
    judul: "Petunjuk Teknis Pelaksanaan Ujian CBT Daring PMB 2026",
    kategori: "PANDUAN",
    ringkasan:
      "Tata tertib, spesifikasi perangkat minimal, dan simulasi pengerjaan tes potensi akademik daring calon mahasiswa.",
    konten:
      "Ujian CBT daring dapat diakses langsung melalui Portal Calon Mahasiswa setelah pembayaran formulir diverifikasi. Peserta diberikan waktu 60 menit untuk menyelesaikan 40 butir soal tes penalaran logis, bahasa Inggris, dan kemampuan kuantitatif dasar.",
    tanggal: "20 Oktober 2026",
  },
  {
    id: "4",
    slug: "faq-pertanyaan-sering-diajukan",
    judul: "FAQ: Pertanyaan yang Sering Diajukan Seputar Pendaftaran PMB",
    kategori: "FAQ",
    ringkasan:
      "Kumpulan jawaban pertanyaan umum terkait validasi rapor, pengunggahan berkas, konfirmasi pembayaran, dan penerbitan NIM.",
    konten:
      "Apakah siswa yang belum lulus boleh mendaftar? Ya, menggunakan rapor semester 1-5 atau surat keterangan aktif kelas 12. Berkas fisik dapat disusulkan saat proses daftar ulang setelah kelulusan diumumkan.",
    tanggal: "25 Oktober 2026",
  },
];

export const PengumumanPage: React.FC = () => {
  const [selectedKategori, setSelectedKategori] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<PengumumanItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const filteredList = DAFTAR_PENGUMUMAN.filter((item) => {
    const matchesCat =
      selectedKategori === "ALL" || item.kategori === selectedKategori;
    const matchesQuery =
      item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ringkasan.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="bg-biru-50/30 flex flex-col">
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biru-100 text-biru-900 text-xs font-semibold">
            <Bell className="w-4 h-4 text-biru-700" />
            <span>Pusat Informasi & Pengumuman Resmi</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-biru-950">
            Warta PMB & Panduan Mahasiswa Baru
          </h1>
          <p className="text-base text-biru-800/90 leading-relaxed font-light">
            Temukan informasi jadwal gelombang, panduan teknis CBT, pengumuman
            beasiswa Triputra, dan jawaban pertanyaan umum.
          </p>
        </div>

        {/* Filter Bar & Pencarian */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-biru-50/70 border border-biru-100">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {["ALL", "PENGUMUMAN", "BEASISWA", "PANDUAN", "FAQ"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedKategori(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedKategori === cat
                    ? "bg-biru-700 text-putih shadow-xs"
                    : "bg-putih text-biru-900 border border-biru-200 hover:bg-biru-100"
                }`}
              >
                {cat === "ALL" ? "Semua Topik" : cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-biru-600" />
            <input
              type="text"
              placeholder="Cari berita atau pengumuman..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-putih border border-biru-200 rounded-xl text-xs text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && (
          <ErrorState
            title="Gagal Memuat Pengumuman"
            message="Terjadi kesalahan jaringan saat mengambil warta pengumuman."
            onRetry={() => {
              setIsError(false);
              setIsLoading(false);
            }}
          />
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredList.length === 0 && (
          <EmptyState
            title="Pengumuman Tidak Ditemukan"
            description="Tidak ada artikel atau pengumuman yang sesuai dengan filter atau kata kunci pencarian Anda."
            actionLabel="Tampilkan Semua Pengumuman"
            onAction={() => {
              setSelectedKategori("ALL");
              setSearchQuery("");
            }}
          />
        )}

        {/* Data List */}
        {!isLoading && !isError && filteredList.length > 0 && (
          <div className="space-y-4">
            {filteredList.map((item) => (
              <Card
                key={item.id}
                className="hover:border-biru-600 transition-all cursor-pointer p-6"
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-biru-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-biru-100 text-biru-900 text-xs font-bold border border-biru-200">
                      {item.kategori}
                    </span>
                    <span className="text-xs text-biru-800 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-biru-700" />
                      {item.tanggal}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-biru-700 flex items-center gap-1 self-start sm:self-auto">
                    <span>Baca Selengkapnya</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div className="pt-3 space-y-2">
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-biru-950 hover:text-biru-700 transition-colors">
                    {item.judul}
                  </h3>
                  <p className="text-sm text-biru-900/80 leading-relaxed font-light">
                    {item.ringkasan}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal Baca Pengumuman Lengkap */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 bg-biru-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-putih border border-biru-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-3 pb-4 border-b border-biru-100">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-md bg-biru-100 text-biru-900 text-xs font-bold border border-biru-200">
                    {selectedItem.kategori}
                  </span>
                  <span className="text-xs text-biru-800 font-mono flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-biru-700" />
                    {selectedItem.tanggal}
                  </span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
                  {selectedItem.judul}
                </h2>
              </div>

              <div className="space-y-4 text-sm text-biru-900 leading-relaxed font-light">
                <p>{selectedItem.konten}</p>
                <div className="p-4 rounded-xl bg-biru-50/70 border border-biru-200 text-xs text-biru-950 font-medium flex items-start gap-3">
                  <FileText className="w-5 h-5 text-biru-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      Dokumen Lampiran Resmi PMB
                    </span>
                    <span>
                      Surat Keputusan Panitia PMB TA 2026/2027 dapat diunduh
                      melalui tautan di bawah ini.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-biru-100 flex items-center justify-between gap-4">
                <Button variant="secondary" size="sm" className="gap-2">
                  <Download className="w-4 h-4 text-biru-700" />
                  <span>Unduh Dokumen PDF</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItem(null)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
