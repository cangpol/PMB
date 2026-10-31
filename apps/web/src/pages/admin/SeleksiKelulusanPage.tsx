import React, { useState } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  RotateCw,
  X,
} from "lucide-react";
import {
  Card,
  Button,
  StatusBadge,
  EmptyState,
  TableSkeleton,
  ErrorState,
} from "../../components/common";

interface CalonSeleksi {
  id: string;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  prodi_pilihan: string;
  kode_fakultas: string;
  kode_prodi: string;
  jalur_masuk: string;
  skor_cbt: number;
  nilai_rapor: number;
  skor_akhir: number;
  passing_score_prodi: number;
  status_kelulusan: "BELUM_DIPUTUSKAN" | "LULUS" | "TIDAK_LULUS" | "CADANGAN";
  nim_diterbitkan?: string;
  nomor_loa?: string;
}

const MOCK_CALON_SELEKSI: CalonSeleksi[] = [
  {
    id: "s-101",
    nomor_pendaftaran: "PMB20260001",
    nama_lengkap: "Yohanes Baptista Pratama",
    prodi_pilihan: "S1 Sistem Informasi",
    kode_fakultas: "1",
    kode_prodi: "01",
    jalur_masuk: "Jalur Reguler Prestasi (RAPOR)",
    skor_cbt: 85,
    nilai_rapor: 88,
    skor_akhir: 86.8,
    passing_score_prodi: 70,
    status_kelulusan: "LULUS",
    nim_diterbitkan: "20261010001",
    nomor_loa: "LOA/UPT/2026/0001",
  },
  {
    id: "s-102",
    nomor_pendaftaran: "PMB20260002",
    nama_lengkap: "Maria Angela Kusuma",
    prodi_pilihan: "S1 Akuntansi Bisnis",
    kode_fakultas: "2",
    kode_prodi: "01",
    jalur_masuk: "Jalur Beasiswa Triputra Peduli",
    skor_cbt: 92,
    nilai_rapor: 94,
    skor_akhir: 93.2,
    passing_score_prodi: 75,
    status_kelulusan: "LULUS",
    nim_diterbitkan: "20262010001",
    nomor_loa: "LOA/UPT/2026/0002",
  },
  {
    id: "s-103",
    nomor_pendaftaran: "PMB20260003",
    nama_lengkap: "Ignatius Bagas Wicaksono",
    prodi_pilihan: "S1 Informatika",
    kode_fakultas: "1",
    kode_prodi: "02",
    jalur_masuk: "Jalur Tes Mandiri (CBT)",
    skor_cbt: 78,
    nilai_rapor: 81,
    skor_akhir: 79.2,
    passing_score_prodi: 75,
    status_kelulusan: "BELUM_DIPUTUSKAN",
  },
  {
    id: "s-104",
    nomor_pendaftaran: "PMB20260005",
    nama_lengkap: "Benedictus Alvin",
    prodi_pilihan: "S1 Informatika",
    kode_fakultas: "1",
    kode_prodi: "02",
    jalur_masuk: "Jalur Tes Mandiri (CBT)",
    skor_cbt: 58,
    nilai_rapor: 65,
    skor_akhir: 60.8,
    passing_score_prodi: 75,
    status_kelulusan: "BELUM_DIPUTUSKAN",
  },
  {
    id: "s-105",
    nomor_pendaftaran: "PMB20260006",
    nama_lengkap: "Clara Shinta Dewi",
    prodi_pilihan: "S1 Sistem Informasi",
    kode_fakultas: "1",
    kode_prodi: "01",
    jalur_masuk: "Jalur Reguler Prestasi (RAPOR)",
    skor_cbt: 69,
    nilai_rapor: 70,
    skor_akhir: 69.4,
    passing_score_prodi: 70,
    status_kelulusan: "BELUM_DIPUTUSKAN",
  },
];

export const SeleksiKelulusanPage: React.FC = () => {
  const [calonList, setCalonList] =
    useState<CalonSeleksi[]>(MOCK_CALON_SELEKSI);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProdi, setFilterProdi] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const filteredData = calonList.filter((item) => {
    const matchSearch =
      item.nomor_pendaftaran
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      item.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase());

    const matchProdi =
      filterProdi === "semua" ? true : item.prodi_pilihan === filterProdi;
    const matchStatus =
      filterStatus === "semua" ? true : item.status_kelulusan === filterStatus;

    return matchSearch && matchProdi && matchStatus;
  });

  const handleJalankanSeleksi = () => {
    setIsProcessing(true);

    setTimeout(() => {
      let counterUrut = 10;
      const updated = calonList.map((item) => {
        if (item.status_kelulusan === "LULUS") return item;

        // Evaluasi skor akhir terhadap passing score prodi
        if (item.skor_akhir >= item.passing_score_prodi) {
          counterUrut++;
          const nim = `2026${item.kode_fakultas}${item.kode_prodi}${String(counterUrut).padStart(4, "0")}`;
          const loa = `LOA/UPT/2026/${String(counterUrut).padStart(4, "0")}`;
          return {
            ...item,
            status_kelulusan: "LULUS" as const,
            nim_diterbitkan: nim,
            nomor_loa: loa,
          };
        } else if (item.skor_akhir >= item.passing_score_prodi - 5) {
          return {
            ...item,
            status_kelulusan: "CADANGAN" as const,
          };
        } else {
          return {
            ...item,
            status_kelulusan: "TIDAK_LULUS" as const,
          };
        }
      });

      setCalonList(updated);
      setIsProcessing(false);
      setFeedbackSuccess(
        "Algoritma seleksi dan kalkulasi passing score berhasil dijalankan! NIM & Nomor LoA otomatis di-generate.",
      );
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-biru-950">
            Seleksi Kelulusan & Penerbitan NIM
          </h1>
          <p className="text-biru-800 text-sm mt-1">
            Pleno kelulusan mahasiswa baru, evaluasi ambang batas passing score,
            dan auto-generate Nomor Induk Mahasiswa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={handleJalankanSeleksi}
            disabled={isProcessing}
            className="inline-flex items-center gap-2"
          >
            {isProcessing ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Jalankan Seleksi & Terbitkan NIM
          </Button>
        </div>
      </div>

      {/* Alert Success */}
      {feedbackSuccess && (
        <div className="p-4 bg-biru-50 border border-biru-500 rounded-xl flex items-center justify-between text-biru-950 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-biru-700 flex-shrink-0" />
            <span className="text-sm font-semibold">{feedbackSuccess}</span>
          </div>
          <button
            onClick={() => setFeedbackSuccess(null)}
            className="text-biru-700 hover:text-biru-950 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-biru-50/40 border border-biru-200">
          <p className="text-xs font-semibold text-biru-700 uppercase">
            Peserta Terdaftar
          </p>
          <p className="text-2xl font-bold text-biru-950 mt-1 font-serif">
            {calonList.length}
          </p>
        </Card>
        <Card className="p-4 bg-biru-50/40 border border-biru-200">
          <p className="text-xs font-semibold text-biru-700 uppercase">
            Dinyatakan Lulus
          </p>
          <p className="text-2xl font-bold text-biru-950 mt-1 font-serif">
            {calonList.filter((c) => c.status_kelulusan === "LULUS").length}
          </p>
        </Card>
        <Card className="p-4 bg-biru-50/40 border border-biru-200">
          <p className="text-xs font-semibold text-biru-700 uppercase">
            Cadangan
          </p>
          <p className="text-2xl font-bold text-biru-950 mt-1 font-serif">
            {calonList.filter((c) => c.status_kelulusan === "CADANGAN").length}
          </p>
        </Card>
        <Card className="p-4 bg-biru-50/40 border border-biru-200">
          <p className="text-xs font-semibold text-biru-700 uppercase">
            Belum Diputuskan
          </p>
          <p className="text-2xl font-bold text-biru-950 mt-1 font-serif">
            {
              calonList.filter((c) => c.status_kelulusan === "BELUM_DIPUTUSKAN")
                .length
            }
          </p>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-biru-600" />
            <input
              type="text"
              placeholder="Cari no. pendaftaran atau nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-biru-200 rounded-lg text-sm bg-putih text-biru-950 placeholder:text-biru-500 focus:outline-none focus:ring-2 focus:ring-biru-600 focus:border-biru-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-biru-700 flex-shrink-0" />
              <select
                value={filterProdi}
                onChange={(e) => setFilterProdi(e.target.value)}
                className="px-3 py-2 border border-biru-200 rounded-lg text-xs bg-putih text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
              >
                <option value="semua">Semua Program Studi</option>
                <option value="S1 Sistem Informasi">S1 Sistem Informasi</option>
                <option value="S1 Informatika">S1 Informatika</option>
                <option value="S1 Akuntansi Bisnis">S1 Akuntansi Bisnis</option>
              </select>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-biru-200 rounded-lg text-xs bg-putih text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
            >
              <option value="semua">Semua Status</option>
              <option value="BELUM_DIPUTUSKAN">Belum Diputuskan</option>
              <option value="LULUS">Lulus</option>
              <option value="CADANGAN">Cadangan</option>
              <option value="TIDAK_LULUS">Tidak Lulus</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={9} />
        ) : isError ? (
          <ErrorState
            title="Gagal Memuat Data Hasil Seleksi"
            message="Terjadi kendala saat mengambil data keputusan seleksi dari server."
            onRetry={() => {
              setIsError(false);
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 500);
            }}
          />
        ) : filteredData.length === 0 ? (
          <EmptyState
            title="Tidak Ada Calon Ditemukan"
            description="Tidak ada data seleksi yang memenuhi filter yang dipilih."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-biru-50 border-b border-biru-200 text-biru-950 font-semibold text-xs tracking-wider uppercase">
                  <th className="py-3 px-4">No. Pendaftaran</th>
                  <th className="py-3 px-4">Nama Calon Mahasiswa</th>
                  <th className="py-3 px-4">Pilihan Prodi</th>
                  <th className="py-3 px-4 text-center">Skor CBT</th>
                  <th className="py-3 px-4 text-center">Rapor</th>
                  <th className="py-3 px-4 text-center">Skor Akhir</th>
                  <th className="py-3 px-4 text-center">Ambang (Passing)</th>
                  <th className="py-3 px-4">Status Pleno</th>
                  <th className="py-3 px-4">NIM Diterbitkan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-biru-100 text-biru-950">
                {filteredData.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-biru-50/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-biru-700">
                      {item.nomor_pendaftaran}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {item.nama_lengkap}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-biru-900">
                      {item.prodi_pilihan}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-xs">
                      {item.skor_cbt}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-xs">
                      {item.nilai_rapor}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-xs text-biru-700 bg-biru-50/50">
                      {item.skor_akhir.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs text-biru-800">
                      {item.passing_score_prodi}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.status_kelulusan === "LULUS" && (
                        <StatusBadge
                          status="terverifikasi"
                          label="LULUS"
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        />
                      )}
                      {item.status_kelulusan === "CADANGAN" && (
                        <StatusBadge
                          status="menunggu"
                          label="CADANGAN"
                          icon={<Clock className="w-3.5 h-3.5" />}
                        />
                      )}
                      {item.status_kelulusan === "TIDAK_LULUS" && (
                        <StatusBadge
                          status="ditolak"
                          label="TIDAK LULUS"
                          icon={<AlertCircle className="w-3.5 h-3.5" />}
                        />
                      )}
                      {item.status_kelulusan === "BELUM_DIPUTUSKAN" && (
                        <span className="text-xs text-biru-700 font-medium italic">
                          Belum Evaluasi
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-biru-950">
                      {item.nim_diterbitkan || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
