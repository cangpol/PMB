import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  X,
  RotateCw,
  CheckCheck,
  Download,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  Button,
  StatusBadge,
  EmptyState,
  TableSkeleton,
  ErrorState,
} from "../../components/common";
import { fetchApi, type ApiError } from "@/services/api";
import { useToast } from "@/components/ui/useToast";
import type { components } from "@/types/api";

type AdminTransaksiItem = components["schemas"]["AdminTransaksiItem"];
type ListTransaksiAdminResponse =
  components["schemas"]["ListTransaksiAdminResponse"];
type RingkasanKeuanganResponse =
  components["schemas"]["RingkasanKeuanganResponse"];
type RekonsiliasiResponse = components["schemas"]["RekonsiliasiResponse"];

export const VerifikasiKeuanganPage: React.FC = () => {
  const { toast } = useToast();

  const [transaksiList, setTransaksiList] = useState<AdminTransaksiItem[]>([]);
  const [ringkasan, setRingkasan] = useState<RingkasanKeuanganResponse>({
    total_dana_masuk: 0,
    total_transaksi_lunas: 0,
    total_transaksi_pending: 0,
    total_transaksi_expired: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("SEMUA");
  const [filterMetode, setFilterMetode] = useState<string>("SEMUA");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const limit = 15;

  // Modal Detail & Rekonsiliasi
  const [selectedTx, setSelectedTx] = useState<AdminTransaksiItem | null>(null);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);

  // Manual Confirmation Modal state
  const [manualModalTx, setManualModalTx] = useState<AdminTransaksiItem | null>(
    null,
  );
  const [catatanManual, setCatatanManual] = useState<string>("");
  const [referensiManual, setReferensiManual] = useState<string>("");
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false);

  // Export loading state
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchTransaksi = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (filterStatus !== "SEMUA") params.append("status", filterStatus);
      if (filterMetode !== "SEMUA") params.append("metode", filterMetode);
      params.append("page", currentPage.toString());
      params.append("limit", limit.toString());

      const res = await fetchApi<ListTransaksiAdminResponse>(
        `/api/pembayaran/admin/list?${params.toString()}`,
      );
      setTransaksiList(res.items);
      setRingkasan(res.ringkasan);
      setTotalItems(res.total);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setIsError(true);
      setErrorMessage(
        apiErr.pesan || "Gagal memuat daftar transaksi keuangan dari server.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterStatus, filterMetode, currentPage]);

  useEffect(() => {
    fetchTransaksi();
  }, [fetchTransaksi]);

  const handleRekonsiliasi = async (item: AdminTransaksiItem) => {
    try {
      setIsReconciling(true);
      const res = await fetchApi<RekonsiliasiResponse>(
        `/api/pembayaran/admin/rekonsiliasi/${item.id}`,
        { method: "POST" },
      );

      toast({
        title: res.berhasil_disinkronkan
          ? "Rekonsiliasi Berhasil"
          : "Status Terverifikasi",
        description: res.pesan,
      });

      await fetchTransaksi();
      if (selectedTx?.id === item.id) {
        setSelectedTx(null);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Gagal Rekonsiliasi",
        description:
          apiErr.pesan ||
          "Terjadi kesalahan saat memeriksa status transaksi ke gateway.",
      });
    } finally {
      setIsReconciling(false);
    }
  };

  const handleKonfirmasiManual = async () => {
    if (!manualModalTx) return;
    try {
      setIsSubmittingManual(true);
      await fetchApi("/api/pembayaran/admin/konfirmasi-manual", {
        method: "POST",
        body: JSON.stringify({
          pembayaran_id: manualModalTx.tagihan_id,
          status: "LUNAS",
          catatan: catatanManual.trim()
            ? `${catatanManual.trim()} [Ref: ${referensiManual.trim() || "Kasir Loket"}]`
            : `Diverifikasi tunai loket [Ref: ${referensiManual.trim() || "Kasir"}]`,
        }),
      });

      toast({
        title: "Pelunasan Manual Berhasil",
        description: `Tagihan ${manualModalTx.nomor_tagihan} milik ${manualModalTx.nama_pendaftar} berhasil diverifikasi Lunas.`,
      });

      setManualModalTx(null);
      setCatatanManual("");
      setReferensiManual("");
      await fetchTransaksi();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Gagal Konfirmasi Manual",
        description:
          apiErr.pesan ||
          "Terjadi kesalahan saat memverifikasi pembayaran tunai.",
      });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleEksporCsv = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (filterStatus !== "SEMUA") params.append("status", filterStatus);
      if (filterMetode !== "SEMUA") params.append("metode", filterMetode);

      const response = await fetch(
        `/api/pembayaran/admin/ekspor?${params.toString()}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Gagal mengunduh berkas laporan");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rekap_keuangan_pmb_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Laporan Terunduh",
        description:
          "File CSV rekap mutasi dan transaksi pembayaran berhasil disimpan.",
      });
    } catch {
      toast({
        title: "Gagal Mengunduh Laporan",
        description: "Terjadi gangguan saat mengunduh data ekspor.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-biru-200 pb-5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-biru-950">
            Verifikasi & Rekonsiliasi Keuangan
          </h1>
          <p className="text-biru-800 text-xs sm:text-sm mt-1">
            Monitoring real-time transaksi tagihan formulir pendaftaran,
            verifikasi mutasi bank, dan audit pembayaran.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTransaksi()}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Segarkan</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleEksporCsv}
            disabled={isExporting}
            className="gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? "Mengunduh..." : "Ekspor CSV / Excel"}</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-biru-50/70 border border-biru-200 shadow-soft-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-biru-700 uppercase tracking-wider">
              Total Dana Masuk
            </p>
            <DollarSign className="w-4 h-4 text-biru-700" />
          </div>
          <p className="text-2xl font-bold text-biru-950 mt-1 font-serif">
            Rp {ringkasan.total_dana_masuk.toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-biru-800 mt-1">
            Akumulasi transaksi status Lunas
          </p>
        </Card>

        <Card className="p-4 bg-biru-50/70 border border-biru-200 shadow-soft-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-biru-700 uppercase tracking-wider">
              Transaksi Lunas
            </p>
            <CheckCircle2 className="w-4 h-4 text-biru-700" />
          </div>
          <p className="text-2xl font-bold text-biru-950 mt-1 font-serif">
            {ringkasan.total_transaksi_lunas.toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-biru-800 mt-1">
            Terverifikasi otomatis / manual
          </p>
        </Card>

        <Card className="p-4 bg-biru-50/70 border border-biru-200 shadow-soft-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-biru-700 uppercase tracking-wider">
              Menunggu Pelunasan
            </p>
            <Clock className="w-4 h-4 text-biru-700" />
          </div>
          <p className="text-2xl font-bold text-biru-950 mt-1 font-serif">
            {ringkasan.total_transaksi_pending.toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-biru-800 mt-1">
            VA aktif atau tagihan belum bayar
          </p>
        </Card>

        <Card className="p-4 bg-biru-50/70 border border-biru-200 shadow-soft-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-biru-700 uppercase tracking-wider">
              Kadaluarsa / Gagal
            </p>
            <AlertCircle className="w-4 h-4 text-biru-700" />
          </div>
          <p className="text-2xl font-bold text-biru-950 mt-1 font-serif">
            {ringkasan.total_transaksi_expired.toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-biru-800 mt-1">
            Melewati batas waktu transfer
          </p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border border-biru-200">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-biru-600" />
            <input
              type="text"
              placeholder="Cari no. tagihan, no. pendaftaran, atau nama..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-biru-200 rounded-xl text-xs bg-putih text-biru-950 placeholder:text-biru-600 focus:outline-none focus:ring-2 focus:ring-biru-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs">
            {/* Filter Status */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-biru-900">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 border border-biru-200 rounded-lg bg-putih text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="LUNAS">Lunas</option>
                <option value="MENUNGGU_PEMBAYARAN">Menunggu Pembayaran</option>
                <option value="KEDALUWARSA">Kedaluwarsa</option>
              </select>
            </div>

            {/* Filter Metode */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-biru-900">Metode:</span>
              <select
                value={filterMetode}
                onChange={(e) => {
                  setFilterMetode(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 border border-biru-200 rounded-lg bg-putih text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
              >
                <option value="SEMUA">Semua Metode</option>
                <option value="VA_BCA">VA BCA</option>
                <option value="VA_MANDIRI">VA Mandiri</option>
                <option value="VA_BNI">VA BNI</option>
                <option value="VA_BRI">VA BRI</option>
                <option value="VA_PERMATA">VA Permata</option>
                <option value="QRIS">QRIS</option>
                <option value="TUNAI_LOKET">Tunai Loket</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden border border-biru-200">
        {isLoading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : isError ? (
          <ErrorState
            title="Gagal Memuat Data Transaksi"
            message={errorMessage}
            onRetry={() => fetchTransaksi()}
          />
        ) : transaksiList.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Transaksi"
            description="Tidak ditemukan riwayat transaksi yang cocok dengan kriteria filter pencarian."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-biru-50/80 border-b border-biru-200 text-biru-950 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">No. Tagihan</th>
                  <th className="py-3 px-4">Pendaftar</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Metode Bayar</th>
                  <th className="py-3 px-4">Gateway</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Waktu Dibuat</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-biru-100 text-biru-950">
                {transaksiList.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-biru-50/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-biru-700">
                      <div>{item.nomor_tagihan}</div>
                      {item.nomor_transaksi && (
                        <div className="text-[10px] text-biru-800">
                          {item.nomor_transaksi}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-biru-950">
                        {item.nama_pendaftar}
                      </div>
                      <div className="font-mono text-[11px] text-biru-800">
                        {item.nomor_pendaftaran}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-biru-950">
                        Rp {item.nominal.toLocaleString("id-ID")}
                      </div>
                      {item.diskon_voucher > 0 && (
                        <div className="text-[10px] text-biru-700 font-semibold">
                          Voucher: -Rp{" "}
                          {item.diskon_voucher.toLocaleString("id-ID")}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold">
                        {item.metode_pembayaran}
                      </span>
                      {item.nomor_va && (
                        <div className="font-mono text-[10px] text-biru-800">
                          VA: {item.nomor_va}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded border border-biru-200 bg-biru-50 font-mono text-[11px] font-semibold text-biru-900 uppercase">
                        {item.gateway_provider}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.status === "SETTLEMENT" ||
                      item.status === "LUNAS" ? (
                        <StatusBadge
                          status="terverifikasi"
                          label="Lunas"
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        />
                      ) : item.status === "PENDING" ||
                        item.status === "MENUNGGU_PEMBAYARAN" ? (
                        <StatusBadge
                          status="menunggu"
                          label="Menunggu"
                          icon={<Clock className="w-3.5 h-3.5" />}
                        />
                      ) : (
                        <StatusBadge
                          status="ditolak"
                          label={item.status}
                          icon={<AlertCircle className="w-3.5 h-3.5" />}
                        />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-biru-800 text-[11px]">
                      {new Date(item.waktu_dibuat).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedTx(item)}
                          className="py-1 px-2 text-xs"
                          title="Lihat Detail Transaksi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* Tombol Rekonsiliasi Gateway */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRekonsiliasi(item)}
                          disabled={isReconciling}
                          className="py-1 px-2 text-xs"
                          title="Cek Status Terkini ke Gateway"
                        >
                          <RotateCw
                            className={`w-3.5 h-3.5 ${isReconciling ? "animate-spin" : ""}`}
                          />
                        </Button>

                        {/* Tombol Konfirmasi Manual jika status belum lunas */}
                        {item.status !== "SETTLEMENT" &&
                          item.status !== "LUNAS" && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setManualModalTx(item)}
                              className="py-1 px-2.5 text-xs font-semibold whitespace-nowrap"
                            >
                              <CheckCheck className="w-3.5 h-3.5 mr-1" />
                              Loket
                            </Button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && !isError && totalItems > 0 && (
          <div className="p-3 border-t border-biru-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-biru-800">
            <div>
              Menampilkan {Math.min(transaksiList.length, limit)} dari{" "}
              <strong className="text-biru-950">{totalItems}</strong> transaksi
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="py-1 px-2.5 text-xs"
              >
                Sebelumnya
              </Button>
              <span className="px-2 font-semibold text-biru-950">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage >= totalPages}
                className="py-1 px-2.5 text-xs"
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Detail & Rekonsiliasi */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-biru-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-putih border border-biru-200 rounded-2xl shadow-soft-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-5 border-b border-biru-100 flex items-center justify-between bg-biru-50/60">
              <div>
                <span className="text-xs font-semibold text-biru-700 uppercase tracking-wider">
                  Rincian Transaksi Keuangan
                </span>
                <h2 className="font-serif text-xl font-bold text-biru-950">
                  {selectedTx.nomor_tagihan}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="p-1.5 text-biru-700 hover:text-biru-950 hover:bg-biru-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs text-biru-950 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-4 bg-biru-50/50 border border-biru-200 rounded-xl">
                <div>
                  <p className="text-biru-700">Nama Pendaftar</p>
                  <p className="font-semibold text-biru-950 text-sm mt-0.5">
                    {selectedTx.nama_pendaftar}
                  </p>
                </div>
                <div>
                  <p className="text-biru-700">No. Pendaftaran</p>
                  <p className="font-mono font-medium text-biru-950 mt-0.5">
                    {selectedTx.nomor_pendaftaran}
                  </p>
                </div>
                <div>
                  <p className="text-biru-700">Nomor Transaksi Gateway</p>
                  <p className="font-mono font-medium text-biru-950 mt-0.5">
                    {selectedTx.nomor_transaksi || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-biru-700">Penyedia Gateway</p>
                  <p className="font-semibold text-biru-950 uppercase mt-0.5">
                    {selectedTx.gateway_provider}
                  </p>
                </div>
                <div>
                  <p className="text-biru-700">Metode Bayar</p>
                  <p className="font-semibold text-biru-950 mt-0.5">
                    {selectedTx.metode_pembayaran}
                  </p>
                </div>
                <div>
                  <p className="text-biru-700">Status Pembayaran</p>
                  <p className="font-bold text-biru-950 mt-0.5">
                    {selectedTx.status}
                  </p>
                </div>
                {selectedTx.nomor_va && (
                  <div className="col-span-2">
                    <p className="text-biru-700">Nomor Virtual Account</p>
                    <p className="font-mono font-bold text-sm text-biru-950 bg-putih p-2 border border-biru-200 rounded-lg mt-0.5">
                      {selectedTx.nomor_va}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-biru-700">Nominal Asli</p>
                  <p className="font-mono text-biru-950 mt-0.5">
                    Rp {selectedTx.nominal_asli.toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <p className="text-biru-700">Diskon Voucher</p>
                  <p className="font-mono text-biru-700 font-semibold mt-0.5">
                    - Rp {selectedTx.diskon_voucher.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="col-span-2 pt-2 border-t border-biru-200 flex justify-between items-center">
                  <span className="font-bold text-biru-950 text-sm">
                    Nominal Pelunasan:
                  </span>
                  <span className="font-mono font-bold text-base text-biru-950">
                    Rp {selectedTx.nominal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-biru-100 bg-biru-50/40 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTx(null)}
              >
                Tutup
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRekonsiliasi(selectedTx)}
                disabled={isReconciling}
                className="gap-1.5"
              >
                <RotateCw
                  className={`w-3.5 h-3.5 ${isReconciling ? "animate-spin" : ""}`}
                />
                <span>Rekonsiliasi Status Gateway</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Manual / Loket */}
      {manualModalTx && (
        <div className="fixed inset-0 z-50 bg-biru-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-putih border border-biru-200 rounded-2xl shadow-soft-xl w-full max-w-lg overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-5 border-b border-biru-100 flex items-center justify-between bg-biru-50/60">
              <div>
                <span className="text-xs font-semibold text-biru-700 uppercase tracking-wider">
                  Verifikasi Loket Fisik / Manual
                </span>
                <h2 className="font-serif text-lg font-bold text-biru-950">
                  Konfirmasi Pembayaran Kasir
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setManualModalTx(null)}
                className="p-1.5 text-biru-700 hover:text-biru-950 hover:bg-biru-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4 text-xs text-biru-950">
              <div className="p-3.5 rounded-xl bg-biru-50 border border-biru-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-biru-800">Nama Calon:</span>
                  <span className="font-bold text-biru-950">
                    {manualModalTx.nama_pendaftar}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-biru-800">Nomor Pendaftaran:</span>
                  <span className="font-mono text-biru-950">
                    {manualModalTx.nomor_pendaftaran}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-biru-800">Nomor Tagihan:</span>
                  <span className="font-mono text-biru-950">
                    {manualModalTx.nomor_tagihan}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-biru-200 font-bold">
                  <span className="text-biru-950">Total Pelunasan:</span>
                  <span className="font-mono text-sm text-biru-950">
                    Rp {manualModalTx.nominal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-biru-950 block">
                  Nomor Referensi Struk Kasir / Bukti Transfer
                </label>
                <input
                  type="text"
                  placeholder="Contoh: KSR-LOKET-20261101-001"
                  value={referensiManual}
                  onChange={(e) => setReferensiManual(e.target.value)}
                  className="w-full px-3 py-2 border border-biru-200 rounded-xl bg-putih text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-biru-950 block">
                  Catatan Verifikasi Keuangan
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Diterima tunai di loket administrasi kampus utama oleh Staf Keuangan."
                  value={catatanManual}
                  onChange={(e) => setCatatanManual(e.target.value)}
                  className="w-full px-3 py-2 border border-biru-200 rounded-xl bg-putih text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-biru-100 bg-biru-50/40 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManualModalTx(null)}
                disabled={isSubmittingManual}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleKonfirmasiManual}
                disabled={isSubmittingManual}
                className="gap-1.5"
              >
                {isSubmittingManual ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>Simpan Pelunasan Lunas</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
