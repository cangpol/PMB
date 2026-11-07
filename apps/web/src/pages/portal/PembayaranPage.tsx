import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, CheckCircle2, Tag, X } from "lucide-react";
import {
  Button,
  Card,
  CardSkeleton,
  ErrorState,
} from "../../components/common";
import { fetchApi, type ApiError } from "@/services/api";
import type { components } from "@/types/api";
import {
  BuktiPembayaranCard,
  rupiah,
  type BuktiPembayaranItem,
} from "../../components/pembayaran/BuktiPembayaranCard";
import { AlurStepper, useAlur } from "../../components/pendaftaran/AlurStepper";

type Tagihan = components["schemas"]["TagihanWithTransaksiResponse"];
type CekVoucher = components["schemas"]["CekVoucherResponse"];
type Ringkasan = components["schemas"]["DashboardSummaryResponse"];

const SUB_LANGKAH = [
  "Cek biaya",
  "Transfer",
  "Unggah bukti",
  "Verifikasi admin",
] as const;

/** Penanda posisi calon di dalam langkah pembayaran (1–4). */
const SubLangkah: React.FC<{ aktif: number; selesai: boolean }> = ({
  aktif,
  selesai,
}) => (
  <ol
    className="grid grid-cols-2 sm:grid-cols-4 gap-2"
    aria-label="Tahapan pembayaran"
  >
    {SUB_LANGKAH.map((label, i) => {
      const nomor = i + 1;
      const lewat = selesai || nomor < aktif;
      const kini = !selesai && nomor === aktif;
      return (
        <li
          key={label}
          aria-current={kini ? "step" : undefined}
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${
            kini
              ? "border-biru-700 bg-biru-50 font-bold text-biru-950"
              : lewat
                ? "border-biru-200 text-biru-800"
                : "border-biru-100 text-biru-400"
          }`}
        >
          <span
            className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${
              lewat
                ? "bg-biru-700 text-putih"
                : kini
                  ? "bg-biru-950 text-putih"
                  : "bg-biru-50 text-biru-400 border border-biru-200"
            }`}
          >
            {lewat ? <CheckCircle2 className="w-3.5 h-3.5" /> : nomor}
          </span>
          {label}
        </li>
      );
    })}
  </ol>
);

/**
 * Langkah 4 alur PMB: lihat biaya (opsional voucher), transfer ke VA Mandiri /
 * QRIS kampus, unggah bukti, lalu tunggu persetujuan admin PMB.
 */
export const PembayaranPage: React.FC = () => {
  const { alur, isLoading: alurLoading, muatUlang: muatAlur } = useAlur();
  const [tagihan, setTagihan] = useState<Tagihan | null>(null);
  const [bukti, setBukti] = useState<BuktiPembayaranItem[]>([]);
  const [biayaFormulir, setBiayaFormulir] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [kodeVoucher, setKodeVoucher] = useState("");
  const [voucher, setVoucher] = useState<CekVoucher | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [mengecekVoucher, setMengecekVoucher] = useState(false);
  const [lanjutError, setLanjutError] = useState<string | null>(null);
  const [menerbitkan, setMenerbitkan] = useState(false);

  const muat = useCallback(async () => {
    try {
      setLoadError(null);
      const [t, b, r] = await Promise.all([
        fetchApi<Tagihan>("/api/pembayaran/my-tagihan").catch(
          (err: ApiError) => {
            if (err.kode === "DATA_TIDAK_DITEMUKAN") return null;
            throw err;
          },
        ),
        fetchApi<BuktiPembayaranItem[]>("/api/pembayaran/bukti/my"),
        fetchApi<Ringkasan>("/api/pendaftaran/dashboard-summary"),
      ]);
      const formulir =
        t && t.jenis_tagihan === "FORMULIR" && t.status !== "KEDALUWARSA"
          ? t
          : null;
      setTagihan(formulir);
      setBukti(b);
      setBiayaFormulir(
        r.biaya.find((x) => x.jenis === "FORMULIR")?.nominal ?? null,
      );
    } catch (err: unknown) {
      setLoadError((err as ApiError).pesan || "Gagal memuat data pembayaran.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  const muatSemua = async () => {
    await Promise.all([muat(), muatAlur()]);
  };

  const terapkanVoucher = async () => {
    const kode = kodeVoucher.trim();
    if (kode.length < 3) {
      setVoucherError("Kode voucher minimal 3 karakter.");
      return;
    }
    try {
      setMengecekVoucher(true);
      setVoucherError(null);
      setVoucher(
        await fetchApi<CekVoucher>("/api/pembayaran/cek-voucher", {
          method: "POST",
          body: JSON.stringify({
            kode_voucher: kode,
            nominal_asli: biayaFormulir ?? 0,
          }),
        }),
      );
    } catch (err: unknown) {
      setVoucher(null);
      setVoucherError(
        (err as ApiError).pesan || "Voucher tidak dapat digunakan.",
      );
    } finally {
      setMengecekVoucher(false);
    }
  };

  const hapusVoucher = () => {
    setVoucher(null);
    setVoucherError(null);
    setKodeVoucher("");
  };

  const lanjutBayar = async () => {
    try {
      setMenerbitkan(true);
      setLanjutError(null);
      await fetchApi("/api/pembayaran/buat-tagihan", {
        method: "POST",
        body: JSON.stringify({
          metode_pembayaran: "TRANSFER_MANUAL",
          kode_voucher: voucher?.kode_voucher ?? null,
        }),
      });
      await muatSemua();
    } catch (err: unknown) {
      setLanjutError(
        (err as ApiError).pesan || "Gagal melanjutkan ke pembayaran.",
      );
    } finally {
      setMenerbitkan(false);
    }
  };

  if (isLoading || alurLoading) return <CardSkeleton />;

  const langkahBayar = alur?.langkah.find((l) => l.kode === "pembayaran");
  const terkunci = !langkahBayar || langkahBayar.status === "TERKUNCI";
  // Berkas yang sudah diunggah lengkap (menunggu/selesai diverifikasi): tombol unggah dinonaktifkan
  const langkahBerkas = alur?.langkah.find((l) => l.kode === "berkas");
  const berkasSudahDiunggah =
    langkahBerkas?.status === "SELESAI" ||
    langkahBerkas?.status === "MENUNGGU_ADMIN";
  const selesai =
    langkahBayar?.status === "SELESAI" || tagihan?.status === "LUNAS";
  const buktiTagihan = tagihan
    ? (bukti.find((b) => b.tagihan_id === tagihan.id) ?? null)
    : null;
  const menungguAdmin = buktiTagihan?.status === "PENDING";

  // Posisi calon: 1 cek biaya, 2–3 transfer & unggah (satu layar), 4 verifikasi
  const subAktif = !tagihan ? 1 : menungguAdmin ? 4 : 2;
  const totalSetelahVoucher = voucher
    ? voucher.nominal_setelah_diskon
    : (biayaFormulir ?? 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <span className="text-xs font-bold text-biru-800 uppercase tracking-wider">
          Langkah 4 dari 9
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-1">
          Pembayaran Biaya Formulir
        </h1>
        <p className="text-xs sm:text-sm text-biru-800/80 mt-1">
          Bayar biaya formulir lewat VA Mandiri atau QRIS kampus, lalu unggah
          bukti transfernya. Admin PMB memeriksa bukti Anda, biasanya dalam 1×24
          jam kerja.
        </p>
      </div>

      {alur && <AlurStepper alur={alur} ringkas />}

      {loadError && (
        <ErrorState
          title="Gagal Memuat"
          message={loadError}
          onRetry={muatSemua}
        />
      )}

      {terkunci && (
        <Card className="p-6 border-biru-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-biru-700 shrink-0" />
          <div className="space-y-3">
            <p className="text-sm text-biru-950">
              Pembayaran dibuka setelah formulir pendaftaran Anda dikirim.
            </p>
            <Link to="/portal/formulir">
              <Button variant="primary" size="sm" className="gap-2">
                Lengkapi Formulir <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {!terkunci && <SubLangkah aktif={subAktif} selesai={selesai} />}

      {/* Sub-langkah 1: cek biaya & voucher */}
      {!terkunci && !tagihan && !selesai && (
        <Card className="p-6 border-biru-200 rounded-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="font-serif font-bold text-lg text-biru-950">
                Biaya formulir pendaftaran
              </h2>
              <p className="text-xs text-biru-800">
                Ditetapkan sesuai jalur masuk yang Anda pilih.
              </p>
            </div>
            <p className="text-2xl font-extrabold text-biru-950">
              {biayaFormulir !== null ? rupiah(biayaFormulir) : "-"}
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-xl bg-biru-50/60 border border-biru-200">
            <p className="text-xs font-semibold text-biru-900 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Punya kode voucher? (opsional)
            </p>
            {voucher ? (
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-emerald-800 font-semibold">
                  Voucher {voucher.kode_voucher} diterapkan: potongan{" "}
                  {rupiah(voucher.jumlah_potongan)}
                </span>
                <button
                  type="button"
                  onClick={hapusVoucher}
                  className="inline-flex items-center gap-1 font-bold text-biru-800 hover:text-biru-950"
                >
                  <X className="w-3.5 h-3.5" /> Hapus
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={kodeVoucher}
                  onChange={(e) => {
                    setKodeVoucher(e.target.value.toUpperCase());
                    setVoucherError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      terapkanVoucher();
                    }
                  }}
                  aria-label="Kode voucher"
                  aria-invalid={!!voucherError}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-biru-200 bg-putih text-sm font-mono text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
                  placeholder="Masukkan kode voucher"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={terapkanVoucher}
                  disabled={mengecekVoucher || !kodeVoucher.trim()}
                >
                  {mengecekVoucher ? "Memeriksa..." : "Terapkan"}
                </Button>
              </div>
            )}
            {voucherError && (
              <p className="text-xs font-semibold text-rose-700" role="alert">
                {voucherError}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-biru-100">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-biru-700">
                Total yang harus dibayar
              </p>
              <p className="text-xl font-extrabold text-biru-950">
                {rupiah(totalSetelahVoucher)}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={lanjutBayar}
              disabled={menerbitkan || biayaFormulir === null}
              className="gap-2"
            >
              {menerbitkan
                ? "Memproses..."
                : totalSetelahVoucher === 0
                  ? "Konfirmasi (tanpa biaya)"
                  : "Lanjut ke Pembayaran"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          {totalSetelahVoucher === 0 && (
            <p className="text-xs text-biru-800">
              Anda tidak perlu transfer atau mengunggah bukti. Pembayaran
              langsung dinyatakan lunas.
            </p>
          )}
          {lanjutError && (
            <p className="text-xs font-semibold text-rose-700" role="alert">
              {lanjutError}
            </p>
          )}
        </Card>
      )}

      {/* Sub-langkah 2–4: transfer, unggah bukti, verifikasi */}
      {tagihan && !selesai && (
        <BuktiPembayaranCard
          tagihanId={tagihan.id}
          nomorTagihan={tagihan.nomor_tagihan}
          nominal={tagihan.nominal_akhir}
          judul="Biaya Formulir Pendaftaran"
          rincian={
            tagihan.diskon_voucher > 0
              ? `${rupiah(tagihan.nominal_asli)} − voucher ${rupiah(tagihan.diskon_voucher)}`
              : null
          }
          tglJatuhTempo={tagihan.tgl_jatuh_tempo}
          buktiTerakhir={buktiTagihan}
          sudahDisetujui={false}
          beritaTransfer={alur?.nomor_pendaftaran}
          onTerkirim={muatSemua}
        />
      )}

      {selesai && (
        <Card className="p-6 border-emerald-200 bg-emerald-50/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <p className="text-sm font-bold text-biru-950">
                {tagihan?.nominal_akhir === 0
                  ? "Jalur Anda tanpa biaya formulir."
                  : `Pembayaran formulir lunas${tagihan ? ` (${rupiah(tagihan.nominal_akhir)})` : ""}.`}
              </p>
              <p className="text-xs text-biru-800">
                {berkasSudahDiunggah
                  ? "Berkas persyaratan sudah Anda unggah."
                  : "Langkah berikutnya: unggah berkas persyaratan."}
              </p>
            </div>
          </div>
          {berkasSudahDiunggah ? (
            <Button
              variant="primary"
              size="sm"
              className="gap-2"
              disabled
              title="Berkas sudah diunggah"
            >
              <CheckCircle2 className="w-4 h-4" /> Berkas Sudah Diunggah
            </Button>
          ) : (
            <Link to="/portal/berkas">
              <Button variant="primary" size="sm" className="gap-2">
                Unggah Berkas <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </Card>
      )}
    </div>
  );
};

export default PembayaranPage;
