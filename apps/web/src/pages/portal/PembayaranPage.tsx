import React, { useState } from "react";
import { CheckCircle2, Tag, Copy, Upload } from "lucide-react";
import {
  Button,
  Card,
  StatusBadge,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";

export const PembayaranPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [metode, setMetode] = useState<"VA" | "MANUAL">("VA");
  const [voucher, setVoucher] = useState<string>("TRIPUTRA2026");
  const [isVoucherApplied, setIsVoucherApplied] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [statusBayar, setStatusBayar] = useState<"PENDING" | "LUNAS">("LUNAS");
  const [hasInvoice] = useState<boolean>(true);

  const biayaAsli = 250000;
  const potonganVoucher =
    isVoucherApplied && voucher.trim().toUpperCase() === "TRIPUTRA2026"
      ? 50000
      : 0;
  const totalAkhir = biayaAsli - potonganVoucher;
  const nomorVA = "880010000042";

  const copyVA = () => {
    navigator.clipboard.writeText(nomorVA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-200">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Administrasi Pembayaran & Tagihan
          </h1>
          <p className="text-xs text-biru-800">
            Kelola tagihan biaya formulir pendaftaran dan biaya daftar ulang
            kuliah
          </p>
        </div>
        <StatusBadge
          status={statusBayar === "LUNAS" ? "lunas" : "menunggu"}
          label={
            statusBayar === "LUNAS"
              ? "Tagihan Formulir: Lunas"
              : "Menunggu Pelunasan"
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
          message="Terjadi kesalahan jaringan saat memuat rincian invoice pembayaran Anda."
          onRetry={() => {
            setIsError(false);
            setIsLoading(false);
          }}
        />
      )}

      {/* Empty State */}
      {!isLoading && !isError && !hasInvoice && (
        <EmptyState
          title="Tidak Ada Tagihan Aktif"
          description="Saat ini Anda belum memiliki tagihan pembayaran formulir maupun daftar ulang yang harus dilunasi."
        />
      )}

      {/* Konten Utama Tagihan */}
      {!isLoading && !isError && hasInvoice && (
        <>
          <Card className="border-2 border-biru-200 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-biru-100">
              <div>
                <span className="text-xs font-mono font-bold text-biru-700">
                  INV-2026-00042
                </span>
                <h2 className="font-serif text-2xl font-bold text-biru-950">
                  Biaya Formulir Pendaftaran PMB 2026
                </h2>
                <p className="text-xs text-biru-800">
                  Gelombang 1 (Early Bird) • Jalur Reguler
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-biru-800 block">
                  Total Tagihan
                </span>
                <span className="font-serif text-2xl font-bold text-biru-950 block">
                  Rp {totalAkhir.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Rincian Biaya */}
            <div className="p-4 rounded-xl bg-biru-50/60 border border-biru-100 space-y-2 text-xs">
              <div className="flex justify-between text-biru-800">
                <span>Biaya Formulir Standar:</span>
                <span className="font-mono">
                  Rp {biayaAsli.toLocaleString("id-ID")}
                </span>
              </div>
              {potonganVoucher > 0 && (
                <div className="flex justify-between text-biru-700 font-semibold">
                  <span>Potongan Kode Promo ({voucher.toUpperCase()}):</span>
                  <span className="font-mono">
                    - Rp {potonganVoucher.toLocaleString("id-ID")}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-biru-950 font-bold pt-2 border-t border-biru-200 text-sm">
                <span>Nominal Akhir Pelunasan:</span>
                <span className="font-mono">
                  Rp {totalAkhir.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Input Voucher */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-biru-950 block">
                Gunakan Kode Voucher / Beasiswa
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-biru-600" />
                  <input
                    type="text"
                    placeholder="Masukkan kode promo (contoh: TRIPUTRA2026)"
                    value={voucher}
                    onChange={(e) => setVoucher(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-putih border border-biru-200 rounded-xl text-xs text-biru-950 uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-biru-600"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsVoucherApplied(true)}
                  className="whitespace-nowrap"
                >
                  Terapkan
                </Button>
              </div>
            </div>

            {/* Pilihan Metode Bayar */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-biru-950 block">
                Metode Pembayaran Resmi
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMetode("VA")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    metode === "VA"
                      ? "border-biru-600 bg-biru-50/70 shadow-xs ring-1 ring-biru-600"
                      : "border-biru-200 bg-putih hover:bg-biru-50/30"
                  }`}
                >
                  <span className="font-bold text-sm text-biru-950 block">
                    Virtual Account Otomatis (BCA / Mandiri / BNI)
                  </span>
                  <span className="text-xs text-biru-800 block mt-1">
                    Verifikasi instan real-time 24 jam tanpa perlu upload bukti.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetode("MANUAL")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    metode === "MANUAL"
                      ? "border-biru-600 bg-biru-50/70 shadow-xs ring-1 ring-biru-600"
                      : "border-biru-200 bg-putih hover:bg-biru-50/30"
                  }`}
                >
                  <span className="font-bold text-sm text-biru-950 block">
                    Transfer Manual Rekening Yayasan
                  </span>
                  <span className="text-xs text-biru-800 block mt-1">
                    Verifikasi staf keuangan 1x24 jam kerja setelah upload
                    mutasi transfer.
                  </span>
                </button>
              </div>
            </div>

            {/* Detail Instruksi Metode */}
            {metode === "VA" ? (
              <div className="p-4 rounded-xl bg-biru-100/70 border border-biru-200 space-y-3">
                <span className="text-xs font-bold text-biru-950 block">
                  Nomor Virtual Account Universitas:
                </span>
                <div className="flex items-center justify-between p-3 bg-putih rounded-lg border border-biru-300">
                  <span className="font-mono text-lg font-bold text-biru-950 tracking-wider">
                    {nomorVA}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyVA}
                    className="gap-1.5 text-xs py-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? "Tersalin!" : "Salin Nomor"}</span>
                  </Button>
                </div>
                <p className="text-[11px] text-biru-800">
                  Batas waktu pembayaran: 24 jam sejak tagihan dibuat. Transaksi
                  akan otomatis terverifikasi sistem.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-biru-50 border border-biru-200 space-y-3">
                <span className="text-xs font-bold text-biru-950 block">
                  Nomor Rekening Resmi Yayasan Pignatelli Triputra:
                </span>
                <p className="font-mono text-sm font-bold text-biru-950">
                  Bank Mandiri: 138-00-1928374-1 (a.n. Yayasan Pignatelli
                  Triputra)
                </p>
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2 text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Bukti Transfer Manual</span>
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Simulasi Tombol Pelunasan untuk Demo */}
          <div className="p-4 rounded-xl bg-biru-50 border border-biru-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-biru-700" />
              <span className="text-biru-950 font-medium">
                Mode Pengujian Sandbox: Simulasikan pembayaran lunas dari
                gateway
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                setStatusBayar((prev) =>
                  prev === "LUNAS" ? "PENDING" : "LUNAS",
                )
              }
            >
              Ubah Status (
              {statusBayar === "LUNAS"
                ? "Jadikan Belum Bayar"
                : "Jadikan Lunas"}
              )
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
