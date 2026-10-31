import React, { useState } from "react";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  X,
  FileCheck2,
  ExternalLink,
  RotateCw,
} from "lucide-react";
import {
  Card,
  Button,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";

interface DokumenPendaftar {
  id: string;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  jalur_masuk: string;
  prodi_pilihan: string;
  tgl_unggah: string;
  status_berkas: "menunggu" | "terverifikasi" | "perbaikan";
  catatan_admin?: string;
  berkas_list: {
    jenis: string;
    nama_file: string;
    ukuran: string;
    status: "menunggu" | "valid" | "tidak_valid";
    file_url: string;
  }[];
}

const MOCK_DATA_BERKAS: DokumenPendaftar[] = [
  {
    id: "d-101",
    nomor_pendaftaran: "PMB20260001",
    nama_lengkap: "Yohanes Baptista Pratama",
    jalur_masuk: "Jalur Reguler Prestasi (RAPOR)",
    prodi_pilihan: "S1 Sistem Informasi",
    tgl_unggah: "30 Oktober 2026, 14:20 WIB",
    status_berkas: "menunggu",
    berkas_list: [
      {
        jenis: "Kartu Tanda Penduduk (KTP)",
        nama_file: "ktp_yohanes.pdf",
        ukuran: "850 KB",
        status: "menunggu",
        file_url: "#",
      },
      {
        jenis: "Kartu Keluarga (KK)",
        nama_file: "kk_keluarga.pdf",
        ukuran: "1.2 MB",
        status: "menunggu",
        file_url: "#",
      },
      {
        jenis: "Ijazah / SKL Legalisir",
        nama_file: "skl_smak_santoyosef.pdf",
        ukuran: "2.1 MB",
        status: "menunggu",
        file_url: "#",
      },
      {
        jenis: "Rapor Semester 1-5",
        nama_file: "rapor_lengkap.pdf",
        ukuran: "4.5 MB",
        status: "menunggu",
        file_url: "#",
      },
      {
        jenis: "Pasfoto Formal (4x6 latar biru)",
        nama_file: "pasfoto_resmi.jpg",
        ukuran: "450 KB",
        status: "menunggu",
        file_url: "#",
      },
    ],
  },
  {
    id: "d-102",
    nomor_pendaftaran: "PMB20260002",
    nama_lengkap: "Maria Angela Kusuma",
    jalur_masuk: "Jalur Beasiswa Triputra Peduli",
    prodi_pilihan: "S1 Akuntansi Bisnis",
    tgl_unggah: "31 Oktober 2026, 09:15 WIB",
    status_berkas: "menunggu",
    berkas_list: [
      {
        jenis: "Kartu Tanda Penduduk (KTP)",
        nama_file: "ktp_maria.pdf",
        ukuran: "720 KB",
        status: "menunggu",
        file_url: "#",
      },
      {
        jenis: "Kartu Keluarga (KK)",
        nama_file: "kk_maria.pdf",
        ukuran: "1.0 MB",
        status: "menunggu",
        file_url: "#",
      },
      {
        jenis: "Sertifikat Prestasi Nasional",
        nama_file: "piagam_olimpiade.pdf",
        ukuran: "3.4 MB",
        status: "menunggu",
        file_url: "#",
      },
      {
        jenis: "Surat Rekomendasi Sekolah",
        nama_file: "surat_rekomendasi.pdf",
        ukuran: "980 KB",
        status: "menunggu",
        file_url: "#",
      },
    ],
  },
  {
    id: "d-103",
    nomor_pendaftaran: "PMB20260003",
    nama_lengkap: "Ignatius Bagas Wicaksono",
    jalur_masuk: "Jalur Tes Mandiri (CBT)",
    prodi_pilihan: "S1 Informatika",
    tgl_unggah: "29 Oktober 2026, 16:45 WIB",
    status_berkas: "perbaikan",
    catatan_admin:
      "Pasfoto buram dan scan KTP terpotong bagian NIK. Mohon unggah ulang berkas asli yang jelas.",
    berkas_list: [
      {
        jenis: "Kartu Tanda Penduduk (KTP)",
        nama_file: "ktp_potong.pdf",
        ukuran: "300 KB",
        status: "tidak_valid",
        file_url: "#",
      },
      {
        jenis: "Kartu Keluarga (KK)",
        nama_file: "kk_bagas.pdf",
        ukuran: "1.1 MB",
        status: "valid",
        file_url: "#",
      },
      {
        jenis: "Ijazah SMA",
        nama_file: "ijazah_resmi.pdf",
        ukuran: "1.8 MB",
        status: "valid",
        file_url: "#",
      },
    ],
  },
  {
    id: "d-104",
    nomor_pendaftaran: "PMB20260004",
    nama_lengkap: "Theresia Cindy Melati",
    jalur_masuk: "Jalur Kemitraan Sekolah",
    prodi_pilihan: "D3 Manajemen Pemasaran",
    tgl_unggah: "28 Oktober 2026, 11:10 WIB",
    status_berkas: "terverifikasi",
    berkas_list: [
      {
        jenis: "Kartu Tanda Penduduk (KTP)",
        nama_file: "ktp_theresia.pdf",
        ukuran: "680 KB",
        status: "valid",
        file_url: "#",
      },
      {
        jenis: "Kartu Keluarga (KK)",
        nama_file: "kk_theresia.pdf",
        ukuran: "950 KB",
        status: "valid",
        file_url: "#",
      },
      {
        jenis: "Ijazah / SKL",
        nama_file: "skl_valid.pdf",
        ukuran: "1.4 MB",
        status: "valid",
        file_url: "#",
      },
    ],
  },
];

export const VerifikasiBerkasPage: React.FC = () => {
  const [dataBerkas, setDataBerkas] =
    useState<DokumenPendaftar[]>(MOCK_DATA_BERKAS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [selectedPendaftar, setSelectedPendaftar] =
    useState<DokumenPendaftar | null>(null);
  const [catatanPerbaikan, setCatatanPerbaikan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  // Filter logic
  const filteredData = dataBerkas.filter((item) => {
    const matchSearch =
      item.nomor_pendaftaran
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      item.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.prodi_pilihan.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus =
      filterStatus === "semua" ? true : item.status_berkas === filterStatus;

    return matchSearch && matchStatus;
  });

  const handleOpenModal = (pendaftar: DokumenPendaftar) => {
    setSelectedPendaftar(pendaftar);
    setCatatanPerbaikan(pendaftar.catatan_admin || "");
    setFeedbackSuccess(null);
  };

  const handleVerifikasi = (status: "terverifikasi" | "perbaikan") => {
    if (!selectedPendaftar) return;
    setIsSubmitting(true);

    setTimeout(() => {
      setDataBerkas((prev) =>
        prev.map((item) =>
          item.id === selectedPendaftar.id
            ? {
                ...item,
                status_berkas: status,
                catatan_admin:
                  status === "perbaikan" ? catatanPerbaikan : undefined,
              }
            : item,
        ),
      );

      setIsSubmitting(false);
      setFeedbackSuccess(
        status === "terverifikasi"
          ? `Berkas pendaftar ${selectedPendaftar.nomor_pendaftaran} berhasil disetujui!`
          : `Permintaan revisi berkas pendaftar ${selectedPendaftar.nomor_pendaftaran} berhasil dikirim.`,
      );
      setSelectedPendaftar(null);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-biru-950">
            Verifikasi Berkas Calon Mahasiswa
          </h1>
          <p className="text-biru-800 text-sm mt-1">
            Validasi kelengkapan dan keabsahan dokumen persyaratan administratif
            pendaftar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-biru-50 border border-biru-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-biru-900">
            <FileCheck2 className="w-4 h-4 text-biru-700" />
            Total Antrean:{" "}
            {
              dataBerkas.filter((d) => d.status_berkas === "menunggu").length
            }{" "}
            Berkas
          </div>
        </div>
      </div>

      {/* Alert Notifikasi Sukses */}
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

      {/* Filter & Pencarian Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-biru-600" />
            <input
              type="text"
              placeholder="Cari nomor pendaftaran, nama, atau prodi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-biru-200 rounded-lg text-sm bg-putih text-biru-950 placeholder:text-biru-500 focus:outline-none focus:ring-2 focus:ring-biru-600 focus:border-biru-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-biru-700 flex-shrink-0" />
            <span className="text-xs font-semibold text-biru-900">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-biru-200 rounded-lg text-sm bg-putih text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
            >
              <option value="semua">Semua Status</option>
              <option value="menunggu">Menunggu Verifikasi</option>
              <option value="terverifikasi">Terverifikasi</option>
              <option value="perbaikan">Perlu Revisi</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tabel Data Berkas */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : isError ? (
          <ErrorState
            title="Gagal Memuat Data Berkas"
            message="Terjadi kendala saat mengambil data dokumen pendaftar dari server."
            onRetry={() => {
              setIsError(false);
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 500);
            }}
          />
        ) : filteredData.length === 0 ? (
          <EmptyState
            title="Tidak Ada Dokumen Ditemukan"
            description="Tidak ada pendaftar yang cocok dengan filter pencarian saat ini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-biru-50 border-b border-biru-200 text-biru-950 font-semibold text-xs tracking-wider uppercase">
                  <th className="py-3 px-4">No. Pendaftaran</th>
                  <th className="py-3 px-4">Nama Calon Mahasiswa</th>
                  <th className="py-3 px-4">Pilihan Prodi</th>
                  <th className="py-3 px-4">Jalur Pendaftaran</th>
                  <th className="py-3 px-4">Waktu Unggah</th>
                  <th className="py-3 px-4">Status Berkas</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
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
                    <td className="py-3.5 px-4 text-xs text-biru-800">
                      {item.jalur_masuk}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-biru-800">
                      {item.tgl_unggah}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.status_berkas === "terverifikasi" && (
                        <StatusBadge
                          status="terverifikasi"
                          label="Terverifikasi"
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        />
                      )}
                      {item.status_berkas === "menunggu" && (
                        <StatusBadge
                          status="menunggu"
                          label="Menunggu"
                          icon={<Clock className="w-3.5 h-3.5" />}
                        />
                      )}
                      {item.status_berkas === "perbaikan" && (
                        <StatusBadge
                          status="perbaikan"
                          label="Perlu Revisi"
                          icon={<AlertCircle className="w-3.5 h-3.5" />}
                        />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenModal(item)}
                        className="inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Periksa
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Pemeriksaan Dokumen */}
      {selectedPendaftar && (
        <div className="fixed inset-0 z-50 bg-biru-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-putih border border-biru-200 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-biru-100 flex items-center justify-between bg-biru-50/50">
              <div>
                <span className="text-xs font-semibold text-biru-700 uppercase tracking-wider">
                  Panel Verifikasi Dokumen
                </span>
                <h2 className="font-serif text-xl font-bold text-biru-950">
                  {selectedPendaftar.nama_lengkap} (
                  {selectedPendaftar.nomor_pendaftaran})
                </h2>
                <p className="text-xs text-biru-800 mt-0.5">
                  {selectedPendaftar.prodi_pilihan} •{" "}
                  {selectedPendaftar.jalur_masuk}
                </p>
              </div>
              <button
                onClick={() => setSelectedPendaftar(null)}
                className="p-2 text-biru-700 hover:text-biru-950 hover:bg-biru-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-biru-950">
              <div>
                <h3 className="font-bold text-biru-950 text-sm mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-biru-700" />
                  Daftar Berkas Terunggah
                </h3>
                <div className="space-y-2.5">
                  {selectedPendaftar.berkas_list.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-biru-200 rounded-xl bg-biru-50/30 flex items-center justify-between hover:border-biru-500 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-biru-100 flex items-center justify-center text-biru-700 flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-biru-950 text-xs md:text-sm">
                            {file.jenis}
                          </p>
                          <p className="text-xs text-biru-700">
                            {file.nama_file} ({file.ukuran})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-xs border border-biru-200 bg-putih text-biru-800 rounded-lg hover:bg-biru-50 hover:text-biru-950 inline-flex items-center gap-1 font-medium"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Buka Berkas
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catatan Admin / Catatan Perbaikan */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-biru-950 uppercase tracking-wider">
                  Catatan Verifikator / Instruksi Revisi
                </label>
                <textarea
                  rows={3}
                  value={catatanPerbaikan}
                  onChange={(e) => setCatatanPerbaikan(e.target.value)}
                  placeholder="Tuliskan catatan detail jika berkas memerlukan perbaikan atau instruksi khusus kepada calon mahasiswa..."
                  className="w-full p-3 border border-biru-200 rounded-xl text-xs bg-putih text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-biru-100 bg-biru-50/30 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPendaftar(null)}
                disabled={isSubmitting}
              >
                Tutup
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleVerifikasi("perbaikan")}
                  disabled={isSubmitting || !catatanPerbaikan.trim()}
                  className="inline-flex items-center gap-1.5"
                >
                  <AlertCircle className="w-4 h-4 text-biru-700" />
                  Minta Perbaikan Berkas
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleVerifikasi("terverifikasi")}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Setujui & Verifikasi
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
