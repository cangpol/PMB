import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Tag,
  Copy,
  Clock,
  QrCode,
  Building2,
  ChevronDown,
  ChevronUp,
  RotateCw,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  Button,
  Card,
  StatusBadge,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";
import { fetchApi, type ApiError } from "@/services/api";
import { useToast } from "@/components/ui/useToast";
import type { components } from "@/types/api";

type TagihanWithTransaksi =
  components["schemas"]["TagihanWithTransaksiResponse"];
type TransaksiDetail = components["schemas"]["TransaksiDetailResponse"];

interface VoucherCheckResult {
  valid: boolean;
  kode?: string;
  tipe_diskon?: string;
  nilai_diskon?: number;
  potongan?: number;
  nominal_akhir?: number;
  pesan: string;
}

export const PembayaranPage: React.FC = () => {
  const { toast } = useToast();

  const [tagihan, setTagihan] = useState<TagihanWithTransaksi | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Voucher state
  const [voucherCode, setVoucherCode] = useState<string>("");
  const [isCheckingVoucher, setIsCheckingVoucher] = useState<boolean>(false);
  const [voucherResult, setVoucherResult] = useState<VoucherCheckResult | null>(
    null,
  );

  // Method & Charge
  const [selectedMetode, setSelectedMetode] = useState<string>("va_bca");
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [isCreatingTagihan, setIsCreatingTagihan] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Instruction accordion state
  const [openAccordion, setOpenAccordion] = useState<string>("mbanking");

  // Polling ref
  const pollingRef = useRef<number | null>(null);

  const fetchTagihan = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
        setIsError(false);
      }
      const data = await fetchApi<TagihanWithTransaksi>(
        "/api/pembayaran/my-tagihan",
      );
      setTagihan(data);

      if (data.status === "LUNAS" && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.kode === "DATA_TIDAK_DITEMUKAN") {
        setTagihan(null);
      } else {
        if (!silent) {
          setIsError(true);
          setErrorMessage(
            apiErr.pesan || "Gagal memuat rincian tagihan pembayaran.",
          );
        }
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchTagihan();
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchTagihan]);

  // Set up polling when waiting for payment
  useEffect(() => {
    const isMenunggu = tagihan?.status === "MENUNGGU_PEMBAYARAN";
    if (isMenunggu) {
      if (!pollingRef.current) {
        pollingRef.current = window.setInterval(() => {
          fetchTagihan(true);
        }, 4000);
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [tagihan?.status, fetchTagihan]);

  const handleBuatTagihan = async (kodeVoucher?: string) => {
    try {
      setIsCreatingTagihan(true);
      await fetchApi("/api/pembayaran/buat-tagihan", {
        method: "POST",
        body: JSON.stringify({
          kode_voucher: kodeVoucher || undefined,
        }),
      });
      toast({
        title: "Tagihan Dibuat",
        description:
          "Invoice tagihan pembayaran formulir pendaftaran berhasil diterbitkan.",
      });
      await fetchTagihan();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Gagal Membuat Tagihan",
        description: apiErr.pesan || "Terjadi kesalahan saat membuat tagihan.",
      });
    } finally {
      setIsCreatingTagihan(false);
    }
  };

  const handleCekVoucher = async () => {
    if (!voucherCode.trim()) return;
    try {
      setIsCheckingVoucher(true);
      const res = await fetchApi<VoucherCheckResult>(
        "/api/pembayaran/cek-voucher",
        {
          method: "POST",
          body: JSON.stringify({
            kode: voucherCode.trim().toUpperCase(),
            subtotal: tagihan ? tagihan.nominal_asli : 250000,
          }),
        },
      );
      setVoucherResult(res);
      if (res.valid) {
        toast({
          title: "Voucher Valid!",
          description: res.pesan,
        });
      } else {
        toast({
          title: "Voucher Tidak Berlaku",
          description: res.pesan,
        });
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Pengecekan Gagal",
        description: apiErr.pesan || "Tidak dapat memvalidasi kode voucher.",
      });
    } finally {
      setIsCheckingVoucher(false);
    }
  };

  const handleTerapkanVoucherKeTagihan = async () => {
    if (!voucherResult?.valid || !voucherCode.trim()) return;
    await handleBuatTagihan(voucherCode.trim().toUpperCase());
  };

  const handleCharge = async (metode: string) => {
    if (!tagihan) return;
    try {
      setIsCharging(true);
      const res = await fetchApi<TransaksiDetail>("/api/pembayaran/charge", {
        method: "POST",
        body: JSON.stringify({
          tagihan_id: tagihan.id,
          metode_pembayaran: metode,
        }),
      });
      setTagihan((prev) =>
        prev
          ? {
              ...prev,
              active_transaksi: res,
            }
          : prev,
      );
      toast({
        title: "Metode Terpilih",
        description: `Instruksi pembayaran ${metode.toUpperCase().replace("_", " ")} telah aktif. Silakan lakukan pembayaran.`,
      });
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Gagal Menghubungi Gateway",
        description:
          apiErr.pesan || "Terjadi kesalahan koneksi ke payment gateway.",
      });
    } finally {
      setIsCharging(false);
    }
  };

  const handleSimulasiLunas = async () => {
    if (!tagihan) return;
    try {
      setIsSimulating(true);
      await fetchApi(`/api/pembayaran/simulasi-va-bayar/${tagihan.id}`, {
        method: "POST",
      });
      toast({
        title: "Simulasi Pembayaran Berhasil",
        description:
          "Status tagihan telah otomatis menjadi LUNAS dan pendaftaran maju ke langkah berikutnya.",
      });
      await fetchTagihan();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Simulasi Gagal",
        description: apiErr.pesan || "Gagal memproses simulasi pelunasan.",
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeTx = tagihan?.active_transaksi;
  const isLunas = tagihan?.status === "LUNAS";
  const isKedaluwarsa = tagihan?.status === "KEDALUWARSA";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-200">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Administrasi Pembayaran & Tagihan
          </h1>
          <p className="text-xs text-biru-800">
            Biaya formulir pendaftaran dan administrasi seleksi PMB Universitas
            Pignatelli Triputra
          </p>
        </div>
        <StatusBadge
          status={
            isLunas
              ? "lunas"
              : isKedaluwarsa
                ? "ditolak"
                : tagihan
                  ? "menunggu"
                  : "draft"
          }
          label={
            isLunas
              ? "Lunas (Terverifikasi)"
              : isKedaluwarsa
                ? "Tagihan Kedaluwarsa"
                : tagihan
                  ? "Menunggu Pelunasan"
                  : "Belum Ada Tagihan"
          }
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <ErrorState
          title="Gagal Memuat Informasi Tagihan"
          message={errorMessage}
          onRetry={() => fetchTagihan()}
        />
      )}

      {/* Empty State: Belum ada tagihan */}
      {!isLoading && !isError && !tagihan && (
        <EmptyState
          title="Belum Ada Tagihan Pembayaran"
          description="Tagihan biaya pendaftaran Anda belum diterbitkan. Klik tombol di bawah untuk mengaktifkan tagihan sesuai jalur seleksi Anda."
          action={{
            label: isCreatingTagihan
              ? "Menerbitkan Invoice..."
              : "Terbitkan Tagihan Sekarang",
            onClick: () => handleBuatTagihan(),
          }}
        />
      )}

      {/* Konten Utama Tagihan */}
      {!isLoading && !isError && tagihan && (
        <>
          {/* Banner Tagihan Kedaluwarsa */}
          {isKedaluwarsa && (
            <div className="p-4 rounded-xl bg-biru-100/80 border border-biru-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-biru-700 shrink-0" />
                <div>
                  <span className="font-bold text-biru-950 block">
                    Batas Waktu Pembayaran Tagihan Telah Berakhir
                  </span>
                  <span className="text-biru-800 text-[11px] block">
                    Masa berlaku invoice ini telah kedaluwarsa. Terbitkan ulang
                    tagihan baru untuk memperpanjang batas waktu pembayaran
                    Anda.
                  </span>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleBuatTagihan()}
                disabled={isCreatingTagihan}
                className="whitespace-nowrap"
              >
                {isCreatingTagihan ? (
                  <span className="flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    Menerbitkan...
                  </span>
                ) : (
                  "Terbitkan Ulang Tagihan"
                )}
              </Button>
            </div>
          )}

          {/* Banner Tagihan Kedaluwarsa */}
          {isKedaluwarsa && (
            <div className="p-4 rounded-xl bg-biru-100/80 border border-biru-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-biru-700 shrink-0" />
                <div>
                  <span className="font-bold text-biru-950 block">
                    Batas Waktu Pembayaran Tagihan Telah Berakhir
                  </span>
                  <span className="text-biru-800 text-[11px] block">
                    Masa berlaku invoice ini telah kedaluwarsa. Terbitkan ulang
                    tagihan baru untuk memperpanjang batas waktu pembayaran
                    Anda.
                  </span>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleBuatTagihan()}
                disabled={isCreatingTagihan}
                className="whitespace-nowrap"
              >
                {isCreatingTagihan ? (
                  <span className="flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    Menerbitkan...
                  </span>
                ) : (
                  "Terbitkan Ulang Tagihan"
                )}
              </Button>
            </div>
          )}

          {/* Polling Live Indicator */}
          {!isLunas && !isKedaluwarsa && (
            <div className="p-3.5 rounded-xl bg-biru-50 border border-biru-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-biru-600 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-biru-700" />
                </span>
                <span className="text-biru-950 font-semibold">
                  Menunggu Pembayaran: Gateway memeriksa status transaksi secara
                  real-time.
                </span>
              </div>
              <button
                type="button"
                onClick={() => fetchTagihan(true)}
                className="text-biru-700 hover:text-biru-900 font-bold flex items-center gap-1.5 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Perbarui Status</span>
              </button>
            </div>
          )}

          {/* Card Invoice Rincian */}
          <Card className="border-2 border-biru-200 shadow-soft-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-100">
              <div>
                <span className="text-xs font-mono font-bold text-biru-700">
                  {tagihan.nomor_tagihan}
                </span>
                <h2 className="font-serif text-2xl font-bold text-biru-950">
                  Biaya Formulir Pendaftaran PMB 2026
                </h2>
                <p className="text-xs text-biru-800">
                  Jatuh tempo:{" "}
                  <span className="font-semibold text-biru-950">
                    {new Date(tagihan.tgl_jatuh_tempo).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </p>
              </div>
              <div className="sm:text-right">
                <span className="text-xs text-biru-800 block">
                  Total Pelunasan
                </span>
                <span className="font-serif text-3xl font-bold text-biru-950 block">
                  Rp {tagihan.nominal_akhir.toLocaleString("id-ID")}
                </span>
                {tagihan.diskon_voucher > 0 && (
                  <span className="text-xs text-biru-700 font-semibold block mt-0.5">
                    Hemat Rp {tagihan.diskon_voucher.toLocaleString("id-ID")}{" "}
                    dari voucher
                  </span>
                )}
              </div>
            </div>

            {/* Rincian Komponen Biaya */}
            <div className="p-4 rounded-xl bg-biru-50/70 border border-biru-200 space-y-2.5 text-xs">
              <div className="flex justify-between text-biru-800">
                <span>Biaya Formulir Standar:</span>
                <span className="font-mono font-medium">
                  Rp {tagihan.nominal_asli.toLocaleString("id-ID")}
                </span>
              </div>
              {tagihan.diskon_voucher > 0 && (
                <div className="flex justify-between text-biru-700 font-bold">
                  <span>Potongan Voucher Promo:</span>
                  <span className="font-mono">
                    - Rp {tagihan.diskon_voucher.toLocaleString("id-ID")}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-biru-950 font-bold pt-2.5 border-t border-biru-200 text-sm">
                <span>Total Akhir Tagihan:</span>
                <span className="font-mono text-base">
                  Rp {tagihan.nominal_akhir.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Section Voucher Promo (Hanya jika belum lunas & belum kedaluwarsa) */}
            {!isLunas && !isKedaluwarsa && (
              <div className="p-4 rounded-xl bg-biru-50/40 border border-biru-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-biru-700" />
                  <label className="text-xs font-bold text-biru-950">
                    Punya Kode Voucher / Beasiswa?
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: TRIPUTRA2026 atau BEASISWA100"
                    value={voucherCode}
                    onChange={(e) => {
                      setVoucherCode(e.target.value);
                      setVoucherResult(null);
                    }}
                    className="flex-1 px-3 py-2 bg-putih border border-biru-200 rounded-xl text-xs text-biru-950 uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-biru-600"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCekVoucher}
                    disabled={isCheckingVoucher || !voucherCode.trim()}
                    className="whitespace-nowrap"
                  >
                    {isCheckingVoucher ? "Memeriksa..." : "Cek Kode"}
                  </Button>
                </div>

                {voucherResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                      voucherResult.valid
                        ? "bg-biru-50 border-biru-300 text-biru-950"
                        : "bg-biru-100 border-biru-200 text-biru-900"
                    }`}
                  >
                    <div>
                      <p className="font-bold">{voucherResult.pesan}</p>
                      {voucherResult.valid &&
                        voucherResult.potongan !== undefined && (
                          <p className="text-[11px] text-biru-800 mt-0.5">
                            Diskon: Rp{" "}
                            {voucherResult.potongan.toLocaleString("id-ID")} •
                            Total baru: Rp{" "}
                            {(voucherResult.nominal_akhir || 0).toLocaleString(
                              "id-ID",
                            )}
                          </p>
                        )}
                    </div>
                    {voucherResult.valid && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleTerapkanVoucherKeTagihan}
                        disabled={isCreatingTagihan}
                        className="whitespace-nowrap py-1 px-3 text-xs"
                      >
                        Terapkan ke Tagihan
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Jika LUNAS: Tampilan Bukti Lunas Resmi */}
            {isLunas ? (
              <div className="p-6 rounded-2xl bg-biru-50 border-2 border-biru-600 space-y-4 text-center">
                <div className="inline-flex p-3 rounded-full bg-biru-600 text-putih shadow-soft-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold text-biru-950">
                    Pembayaran Lunas Terverifikasi
                  </h3>
                  <p className="text-xs text-biru-800 mt-1 max-w-md mx-auto">
                    Tagihan biaya formulir pendaftaran Anda telah lunas dan
                    terverifikasi otomatis oleh sistem gateway PMB Universitas
                    Pignatelli Triputra.
                  </p>
                </div>

                <div className="max-w-md mx-auto p-4 rounded-xl bg-putih border border-biru-200 text-xs text-left space-y-2">
                  <div className="flex justify-between text-biru-800">
                    <span>Nomor Tagihan:</span>
                    <span className="font-mono font-bold text-biru-950">
                      {tagihan.nomor_tagihan}
                    </span>
                  </div>
                  {tagihan.active_transaksi && (
                    <div className="flex justify-between text-biru-800">
                      <span>Nomor Transaksi:</span>
                      <span className="font-mono font-bold text-biru-950">
                        {tagihan.active_transaksi.nomor_transaksi}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-biru-800">
                    <span>Waktu Pelunasan:</span>
                    <span className="font-medium text-biru-950">
                      {tagihan.lunas_at
                        ? new Date(tagihan.lunas_at).toLocaleString("id-ID")
                        : "Baru saja"}
                    </span>
                  </div>
                  <div className="flex justify-between text-biru-800 pt-2 border-t border-biru-100">
                    <span>Nominal Dibayarkan:</span>
                    <span className="font-mono font-bold text-biru-950 text-sm">
                      Rp {tagihan.nominal_akhir.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link to="/portal/dashboard">
                    <Button variant="primary" size="md" className="gap-2">
                      <span>Ke Dashboard Calon</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to="/portal/ujian-cbt">
                    <Button variant="outline" size="md" className="gap-2">
                      <span>Cek Jadwal Ujian CBT</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ) : isKedaluwarsa ? null : (
              /* Pilihan Metode Bayar (Jika Belum Lunas) */
              <div className="space-y-4 pt-2">
                <label className="text-xs font-bold text-biru-950 block">
                  Pilih Saluran Pembayaran Gateway:
                </label>

                {/* Metode Tabs / Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      id: "va_bca",
                      label: "Virtual Account BCA",
                      desc: "Verifikasi instan via BCA Mobile & ATM",
                      icon: Building2,
                    },
                    {
                      id: "va_mandiri",
                      label: "Virtual Account Mandiri",
                      desc: "Livin' by Mandiri & ATM Mandiri",
                      icon: Building2,
                    },
                    {
                      id: "va_bni",
                      label: "Virtual Account BNI",
                      desc: "BNI Mobile Banking & ATM BNI",
                      icon: Building2,
                    },
                    {
                      id: "va_bri",
                      label: "Virtual Account BRI",
                      desc: "BRImo & Seluruh Agen BRILink",
                      icon: Building2,
                    },
                    {
                      id: "va_permata",
                      label: "Virtual Account Permata",
                      desc: "PermataMobile X & ATM Bersama",
                      icon: Building2,
                    },
                    {
                      id: "qris",
                      label: "QRIS Bebas Admin",
                      desc: "Scan GoPay, OVO, Dana, ShopeePay",
                      icon: QrCode,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedMetode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedMetode(item.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-biru-600 bg-biru-50/80 shadow-soft-sm ring-2 ring-biru-600"
                            : "border-biru-200 bg-putih hover:bg-biru-50/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            className={`w-4 h-4 ${isSelected ? "text-biru-700" : "text-biru-800"}`}
                          />
                          <span className="font-bold text-xs text-biru-950">
                            {item.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-biru-800">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleCharge(selectedMetode)}
                    disabled={isCharging}
                    className="w-full sm:w-auto"
                  >
                    {isCharging ? (
                      <span className="flex items-center gap-2">
                        <RotateCw className="w-4 h-4 animate-spin" />
                        Mengaktifkan Instruksi Pembayaran...
                      </span>
                    ) : (
                      `Lanjutkan Pembayaran (${selectedMetode.toUpperCase().replace("_", " ")})`
                    )}
                  </Button>
                </div>

                {/* Detail Instruksi Transaksi Aktif */}
                {activeTx && activeTx.status === "PENDING" && (
                  <div className="mt-6 p-5 rounded-2xl bg-biru-100/60 border-2 border-biru-300 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-biru-200">
                      <div>
                        <span className="text-[11px] font-bold text-biru-700 uppercase tracking-wider block">
                          Instruksi Pembayaran Aktif (
                          {activeTx.metode_pembayaran})
                        </span>
                        <span className="text-xs text-biru-950 font-mono">
                          Order ID: {activeTx.nomor_transaksi}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-biru-800">
                        <Clock className="w-3.5 h-3.5 text-biru-700" />
                        <span>
                          Berlaku sampai:{" "}
                          <strong className="text-biru-950">
                            {new Date(
                              activeTx.waktu_berlaku_sampai,
                            ).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            WIB
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Jika VA */}
                    {activeTx.nomor_va && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-biru-950 block">
                          Nomor Virtual Account Anda:
                        </span>
                        <div className="flex items-center justify-between p-3.5 bg-putih rounded-xl border border-biru-300 shadow-soft-sm">
                          <span className="font-mono text-xl sm:text-2xl font-bold text-biru-950 tracking-wider">
                            {activeTx.nomor_va}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyText(activeTx.nomor_va || "")}
                            className="gap-1.5 text-xs py-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copied ? "Tersalin!" : "Salin VA"}</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Jika QRIS */}
                    {activeTx.qr_url && (
                      <div className="space-y-3 flex flex-col items-center p-4 bg-putih rounded-xl border border-biru-200">
                        <span className="text-xs font-bold text-biru-950">
                          Pindai Kode QRIS Menggunakan Aplikasi E-Wallet /
                          Mobile Banking:
                        </span>
                        <img
                          src={activeTx.qr_url}
                          alt="QRIS Code PMB Universitas Pignatelli Triputra"
                          className="w-56 h-56 rounded-lg border border-biru-200 shadow-soft-sm object-contain"
                        />
                        <p className="text-[11px] text-biru-800 text-center max-w-sm">
                          Mendukung pembayaran langsung dari BCA Mobile, Livin
                          Mandiri, BRImo, BNI Mobile, GoPay, OVO, DANA, LinkAja,
                          dan ShopeePay.
                        </p>
                      </div>
                    )}

                    {/* Petunjuk Cara Bayar (Accordion) */}
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-biru-950 block">
                        Panduan Langkah Pembayaran:
                      </span>

                      <div className="space-y-2 text-xs">
                        {/* Mobile Banking */}
                        <div className="border border-biru-200 rounded-xl bg-putih overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenAccordion(
                                openAccordion === "mbanking" ? "" : "mbanking",
                              )
                            }
                            className="w-full px-4 py-2.5 flex items-center justify-between text-left font-semibold text-biru-950 bg-biru-50/50 hover:bg-biru-50"
                          >
                            <span>Pembayaran via Mobile Banking</span>
                            {openAccordion === "mbanking" ? (
                              <ChevronUp className="w-4 h-4 text-biru-700" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-biru-700" />
                            )}
                          </button>
                          {openAccordion === "mbanking" && (
                            <ol className="p-4 space-y-1.5 list-decimal list-inside text-biru-800 text-[11px] leading-relaxed">
                              <li>
                                Buka aplikasi Mobile Banking bank Anda dan
                                lakukan login.
                              </li>
                              <li>
                                Pilih menu <strong>Transfer</strong> &gt;{" "}
                                <strong>Virtual Account</strong>.
                              </li>
                              <li>
                                Masukkan nomor VA:{" "}
                                <span className="font-mono font-bold text-biru-950">
                                  {activeTx.nomor_va || "880010000042"}
                                </span>
                                .
                              </li>
                              <li>
                                Pastikan nama tagihan sesuai dengan nama lengkap
                                Anda di PMB.
                              </li>
                              <li>
                                Masukkan PIN dan simpan resi bukti transfer
                                digital.
                              </li>
                            </ol>
                          )}
                        </div>

                        {/* ATM */}
                        <div className="border border-biru-200 rounded-xl bg-putih overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenAccordion(
                                openAccordion === "atm" ? "" : "atm",
                              )
                            }
                            className="w-full px-4 py-2.5 flex items-center justify-between text-left font-semibold text-biru-950 bg-biru-50/50 hover:bg-biru-50"
                          >
                            <span>Pembayaran via Mesin ATM</span>
                            {openAccordion === "atm" ? (
                              <ChevronUp className="w-4 h-4 text-biru-700" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-biru-700" />
                            )}
                          </button>
                          {openAccordion === "atm" && (
                            <ol className="p-4 space-y-1.5 list-decimal list-inside text-biru-800 text-[11px] leading-relaxed">
                              <li>Masukkan kartu ATM dan 6 digit PIN Anda.</li>
                              <li>
                                Pilih menu <strong>Transaksi Lainnya</strong>{" "}
                                &gt; <strong>Transfer / Pembayaran</strong> &gt;{" "}
                                <strong>Virtual Account</strong>.
                              </li>
                              <li>Masukkan nomor VA Anda dan tekan Benar.</li>
                              <li>
                                Periksa nominal tagihan yang tertera di layar
                                ATM.
                              </li>
                              <li>
                                Konfirmasi transaksi dan simpan struk fisik ATM.
                              </li>
                            </ol>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Sandbox Dev Simulator Box (Untuk mempermudah verifikasi end-to-end tanpa kredensial bank) */}
          {!isLunas && !isKedaluwarsa && (
            <div className="p-4 rounded-xl bg-biru-50 border border-biru-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-biru-700" />
                <div>
                  <span className="text-biru-950 font-bold block">
                    Mode Pengujian Sandbox (Mock Gateway)
                  </span>
                  <span className="text-biru-800 text-[11px] block">
                    Simulasikan callback lunas dari bank gateway untuk menguji
                    transisi pendaftaran secara instan.
                  </span>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSimulasiLunas}
                disabled={isSimulating}
                className="whitespace-nowrap"
              >
                {isSimulating ? (
                  <span className="flex items-center gap-2">
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    Menyinkronkan...
                  </span>
                ) : (
                  "⚡ Simulasikan Bayar Lunas (Dev Mock)"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
