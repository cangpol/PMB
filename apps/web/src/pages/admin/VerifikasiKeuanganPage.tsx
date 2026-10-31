import React, { useState } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  X,
  RotateCw,
  CheckCheck,
} from "lucide-react";
import {
  Card,
  Button,
  StatusBadge,
  EmptyState,
  TableSkeleton,
  ErrorState,
} from "../../components/common";

interface TransaksiKeuangan {
  id: string;
  nomor_tagihan: string;
  nomor_pendaftaran: string;
  nama_pendaftar: string;
  jenis_tagihan: "FORMULIR" | "UKT_REGISTRASI";
  nominal: number;
  metode: string;
  nomor_va?: string;
  status: "LUNAS" | "MENUNGGU" | "KADALUARSA";
  waktu_dibuat: string;
  waktu_lunas?: string;
  bukti_transfer_url?: string;
}

const MOCK_TRANSAKSI: TransaksiKeuangan[] = [
  {
    id: "tx-001",
    nomor_tagihan: "INV-202610-001",
    nomor_pendaftaran: "PMB20260001",
    nama_pendaftar: "Yohanes Baptista Pratama",
    jenis_tagihan: "FORMULIR",
    nominal: 250000,
    metode: "Virtual Account BCA",
    nomor_va: "88012398472910",
    status: "LUNAS",
    waktu_dibuat: "30 Okt 2026, 10:00 WIB",
    waktu_lunas: "30 Okt 2026, 10:15 WIB",
  },
  {
    id: "tx-002",
    nomor_tagihan: "INV-202610-002",
    nomor_pendaftaran: "PMB20260002",
    nama_pendaftar: "Maria Angela Kusuma",
    jenis_tagihan: "FORMULIR",
    nominal: 0,
    metode: "Voucher Beasiswa 100%",
    status: "LUNAS",
    waktu_dibuat: "31 Okt 2026, 08:30 WIB",
    waktu_lunas: "31 Okt 2026, 08:30 WIB",
  },
  {
    id: "tx-003",
    nomor_tagihan: "INV-202610-003",
    nomor_pendaftaran: "PMB20260003",
    nama_pendaftar: "Ignatius Bagas Wicaksono",
    jenis_tagihan: "FORMULIR",
    nominal: 250000,
    metode: "Transfer Manual Bank Mandiri",
    status: "MENUNGGU",
    waktu_dibuat: "31 Okt 2026, 11:20 WIB",
    bukti_transfer_url: "#",
  },
  {
    id: "tx-004",
    nomor_tagihan: "INV-202610-004",
    nomor_pendaftaran: "PMB20260004",
    nama_pendaftar: "Theresia Cindy Melati",
    jenis_tagihan: "UKT_REGISTRASI",
    nominal: 7500000,
    metode: "Virtual Account BRI",
    nomor_va: "12893847291002",
    status: "LUNAS",
    waktu_dibuat: "28 Okt 2026, 09:00 WIB",
    waktu_lunas: "28 Okt 2026, 13:45 WIB",
  },
  {
    id: "tx-005",
    nomor_tagihan: "INV-202610-005",
    nomor_pendaftaran: "PMB20260005",
    nama_pendaftar: "Benedictus Alvin",
    jenis_tagihan: "FORMULIR",
    nominal: 250000,
    metode: "Virtual Account BNI",
    nomor_va: "98823482716354",
    status: "KADALUARSA",
    waktu_dibuat: "25 Okt 2026, 14:00 WIB",
  },
];

export const VerifikasiKeuanganPage: React.FC = () => {
  const [transaksiList, setTransaksiList] =
    useState<TransaksiKeuangan[]>(MOCK_TRANSAKSI);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [selectedTx, setSelectedTx] = useState<TransaksiKeuangan | null>(null);
  const [nomorReferensiBank, setNomorReferensiBank] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const filteredData = transaksiList.filter((tx) => {
    const matchSearch =
      tx.nomor_tagihan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.nomor_pendaftaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.nama_pendaftar.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus =
      filterStatus === "semua" ? true : tx.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPenerimaan = transaksiList
    .filter((t) => t.status === "LUNAS")
    .reduce((acc, curr) => acc + curr.nominal, 0);

  const totalMenunggu = transaksiList.filter(
    (t) => t.status === "MENUNGGU",
  ).length;

  const handleKonfirmasiManual = () => {
    if (!selectedTx) return;
    setIsSubmitting(true);

    setTimeout(() => {
      setTransaksiList((prev) =>
        prev.map((t) =>
          t.id === selectedTx.id
            ? {
                ...t,
                status: "LUNAS",
                waktu_lunas: "31 Okt 2026, 14:30 WIB (Verifikasi Manual Admin)",
              }
            : t,
        ),
      );

      setIsSubmitting(false);
      setFeedbackSuccess(
        `Pembayaran tagihan ${selectedTx.nomor_tagihan} berhasil dikonfirmasi lunas!`,
      );
      setSelectedTx(null);
      setNomorReferensiBank("");
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-biru-950">
            Verifikasi & Rekonsiliasi Keuangan
          </h1>
          <p className="text-biru-800 text-sm mt-1">
            Monitoring transaksi formulir pendaftaran, pembayaran UKT registrasi
            ulang, dan verifikasi mutasi bank.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-biru-50/50 border border-biru-200">
          <p className="text-xs font-semibold text-biru-700 uppercase tracking-wider">
            Total Dana Terverifikasi
          </p>
          <p className="text-2xl font-bold text-biru-950 mt-1 font-serif">
            Rp {totalPenerimaan.toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-biru-800 mt-1">
            Akumulasi transaksi status lunas
          </p>
        </Card>

        <Card className="p-4 bg-biru-50/50 border border-biru-200">
          <p className="text-xs font-semibold text-biru-700 uppercase tracking-wider">
            Menunggu Verifikasi Manual
          </p>
          <p className="text-2xl font-bold text-biru-950 mt-1 font-serif">
            {totalMenunggu} Transaksi
          </p>
          <p className="text-xs text-biru-800 mt-1">
            Memerlukan pencocokan bukti transfer
          </p>
        </Card>

        <Card className="p-4 bg-biru-50/50 border border-biru-200">
          <p className="text-xs font-semibold text-biru-700 uppercase tracking-wider">
            Total Transaksi Masuk
          </p>
          <p className="text-2xl font-bold text-biru-950 mt-1 font-serif">
            {transaksiList.length} Tagihan
          </p>
          <p className="text-xs text-biru-800 mt-1">
            Formulir & UKT Mahasiswa Baru
          </p>
        </Card>
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

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-biru-600" />
            <input
              type="text"
              placeholder="Cari no. tagihan, no. pendaftaran, atau nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-biru-200 rounded-lg text-sm bg-putih text-biru-950 placeholder:text-biru-500 focus:outline-none focus:ring-2 focus:ring-biru-600 focus:border-biru-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-biru-700 flex-shrink-0" />
            <span className="text-xs font-semibold text-biru-900">
              Status Tagihan:
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-biru-200 rounded-lg text-sm bg-putih text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
            >
              <option value="semua">Semua Status</option>
              <option value="LUNAS">Lunas</option>
              <option value="MENUNGGU">Menunggu Pembayaran</option>
              <option value="KADALUARSA">Kadaluarsa</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={8} />
        ) : isError ? (
          <ErrorState
            title="Gagal Memuat Data Keuangan"
            message="Terjadi kendala saat mengambil data transaksi pembayaran dari server."
            onRetry={() => {
              setIsError(false);
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 500);
            }}
          />
        ) : filteredData.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Tagihan"
            description="Tidak ditemukan riwayat transaksi yang cocok dengan kriteria filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-biru-50 border-b border-biru-200 text-biru-950 font-semibold text-xs tracking-wider uppercase">
                  <th className="py-3 px-4">No. Tagihan</th>
                  <th className="py-3 px-4">No. Pendaftaran</th>
                  <th className="py-3 px-4">Nama Pendaftar</th>
                  <th className="py-3 px-4">Jenis Tagihan</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Metode Bayar</th>
                  <th className="py-3 px-4">Status</th>
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
                      {item.nomor_tagihan}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {item.nomor_pendaftaran}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {item.nama_pendaftar}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="px-2 py-0.5 rounded border border-biru-200 bg-biru-50 font-semibold text-biru-900">
                        {item.jenis_tagihan === "FORMULIR"
                          ? "Formulir PMB"
                          : "UKT Registrasi"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-biru-950 font-mono">
                      Rp {item.nominal.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-biru-800">
                      {item.metode}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.status === "LUNAS" && (
                        <StatusBadge
                          status="terverifikasi"
                          label="Lunas"
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        />
                      )}
                      {item.status === "MENUNGGU" && (
                        <StatusBadge
                          status="menunggu"
                          label="Menunggu"
                          icon={<Clock className="w-3.5 h-3.5" />}
                        />
                      )}
                      {item.status === "KADALUARSA" && (
                        <StatusBadge
                          status="ditolak"
                          label="Kadaluarsa"
                          icon={<AlertCircle className="w-3.5 h-3.5" />}
                        />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedTx(item)}
                        className="inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Rincian
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Detail & Konfirmasi */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-biru-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-putih border border-biru-200 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-5 border-b border-biru-100 flex items-center justify-between bg-biru-50/50">
              <div>
                <span className="text-xs font-semibold text-biru-700 uppercase tracking-wider">
                  Detail Tagihan & Pembayaran
                </span>
                <h2 className="font-serif text-xl font-bold text-biru-950">
                  {selectedTx.nomor_tagihan}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-2 text-biru-700 hover:text-biru-950 hover:bg-biru-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-sm text-biru-950 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-4 bg-biru-50/40 border border-biru-100 rounded-xl">
                <div>
                  <p className="text-xs text-biru-700">Nama Pendaftar</p>
                  <p className="font-semibold text-biru-950">
                    {selectedTx.nama_pendaftar}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-biru-700">No. Pendaftaran</p>
                  <p className="font-mono font-medium text-biru-950">
                    {selectedTx.nomor_pendaftaran}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-biru-700">Nominal Tagihan</p>
                  <p className="font-bold text-biru-950 text-base font-mono">
                    Rp {selectedTx.nominal.toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-biru-700">Metode Pembayaran</p>
                  <p className="font-medium text-biru-950">
                    {selectedTx.metode}
                  </p>
                </div>
                {selectedTx.nomor_va && (
                  <div className="col-span-2">
                    <p className="text-xs text-biru-700">
                      Nomor Rekening / Virtual Account
                    </p>
                    <p className="font-mono font-semibold text-biru-900 bg-putih p-2 border border-biru-200 rounded-lg mt-0.5">
                      {selectedTx.nomor_va}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-biru-700">Waktu Tagihan Dibuat</p>
                  <p className="text-xs text-biru-900">
                    {selectedTx.waktu_dibuat}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-biru-700">Status Saat Ini</p>
                  <p className="font-semibold text-biru-900">
                    {selectedTx.status}
                  </p>
                </div>
              </div>

              {selectedTx.status === "MENUNGGU" && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-biru-950">
                    Konfirmasi Pelunasan Manual Bank
                  </h4>
                  <p className="text-xs text-biru-800">
                    Masukkan nomor referensi transaksi atau mutasi bank untuk
                    mencocokkan pembayaran.
                  </p>
                  <input
                    type="text"
                    placeholder="Contoh: REF-BCA-98372019"
                    value={nomorReferensiBank}
                    onChange={(e) => setNomorReferensiBank(e.target.value)}
                    className="w-full p-2.5 border border-biru-200 rounded-lg text-xs bg-putih text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-biru-100 bg-biru-50/30 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTx(null)}
                disabled={isSubmitting}
              >
                Tutup
              </Button>

              {selectedTx.status === "MENUNGGU" ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleKonfirmasiManual}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCheck className="w-4 h-4" />
                  )}
                  Verifikasi Pembayaran Lunas
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-biru-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Tagihan Selesai
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
