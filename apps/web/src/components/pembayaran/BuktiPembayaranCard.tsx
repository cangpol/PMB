import React, { useEffect, useRef, useState } from "react";
import {
  Upload,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  QrCode,
} from "lucide-react";
import { Card, Button } from "../common";
import { fetchApi } from "@/services/api";
import type { components } from "@/types/api";
import {
  atributAccept,
  periksaFormatBerkas,
  unggahKeStorage,
} from "@/lib/unggahBerkas";
import { PopupFormatSalah } from "@/components/berkas/PopupFormatSalah";

type Rekening = components["schemas"]["RekeningPembayaran"];
export type BuktiPembayaranItem = components["schemas"]["BuktiPembayaranItem"];
type Metode = "VA_MANDIRI" | "QRIS";

const TIPE_OK = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ACCEPT_BUKTI = atributAccept(TIPE_OK);
const MAKS_BYTES = 5 * 1024 * 1024;

export const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const hariIni = () => {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

interface Props {
  /** Tagihan yang dibayar */
  tagihanId: string;
  nomorTagihan: string;
  nominal: number;
  judul: string;
  /** Bukti terakhir untuk tagihan ini (bila ada) */
  buktiTerakhir?: BuktiPembayaranItem | null;
  /** Tagihan sudah lunas / pembayaran sudah disetujui */
  sudahDisetujui: boolean;
  /** Teks yang perlu dicantumkan di berita transfer (mis. nomor registrasi) */
  beritaTransfer?: string | null;
  /** Keterangan asal nominal, mis. "Rp 250.000 − voucher Rp 50.000" */
  rincian?: string | null;
  /** Batas waktu pembayaran (ISO) */
  tglJatuhTempo?: string | null;
  onTerkirim: () => void;
}

/**
 * Pembayaran manual alur PMB: transfer ke VA Mandiri / QRIS kampus,
 * lalu unggah bukti untuk diverifikasi admin PMB.
 */
export const BuktiPembayaranCard: React.FC<Props> = ({
  tagihanId,
  nomorTagihan,
  nominal,
  judul,
  buktiTerakhir,
  sudahDisetujui,
  beritaTransfer,
  rincian,
  tglJatuhTempo,
  onTerkirim,
}) => {
  const [rekening, setRekening] = useState<Rekening[]>([]);
  const [metode, setMetode] = useState<Metode>("VA_MANDIRI");
  const [nominalDibayar, setNominalDibayar] = useState<string>(String(nominal));
  const [tglBayar, setTglBayar] = useState<string>(hariIni());
  const [file, setFile] = useState<File | null>(null);
  const [mimeFile, setMimeFile] = useState<string>("");
  const [formatSalah, setFormatSalah] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tersalin, setTersalin] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchApi<Rekening[]>("/api/pembayaran/rekening")
      .then((r) => {
        setRekening(r);
        if (
          !r.some((x) => x.jenis === "VA_MANDIRI") &&
          r.some((x) => x.jenis === "QRIS")
        )
          setMetode("QRIS");
      })
      .catch(() => setRekening([]));
  }, []);

  useEffect(() => setNominalDibayar(String(nominal)), [nominal]);

  const va = rekening.find((r) => r.jenis === "VA_MANDIRI");
  const qris = rekening.find((r) => r.jenis === "QRIS");
  const menunggu = buktiTerakhir?.status === "PENDING";
  const ditolak = buktiTerakhir?.status === "DITOLAK" && !sudahDisetujui;

  const salin = async (teks: string) => {
    try {
      await navigator.clipboard.writeText(teks);
      setTersalin(teks);
      setTimeout(() => setTersalin(null), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  const pilihFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const f = input.files?.[0] ?? null;
    setError(null);
    if (!f) return setFile(null);
    const cek = await periksaFormatBerkas(f, TIPE_OK);
    if (!cek.ok) {
      setFormatSalah(cek.alasan);
      input.value = "";
      setFile(null);
      return;
    }
    if (f.size > MAKS_BYTES) {
      setError("Ukuran file maksimal 5 MB.");
      input.value = "";
      return;
    }
    setMimeFile(cek.mime);
    setFile(f);
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const nom = Number(nominalDibayar);
    if (!file) return setError("Pilih file bukti pembayaran terlebih dahulu.");
    if (!Number.isFinite(nom) || nom <= 0)
      return setError("Nominal yang dibayar tidak valid.");
    if (!tglBayar || tglBayar > hariIni())
      return setError("Tanggal bayar tidak boleh di masa depan.");

    setMengirim(true);
    try {
      const presign = await fetchApi<{ upload_url: string; file_key: string }>(
        "/api/pembayaran/bukti/presign",
        {
          method: "POST",
          body: JSON.stringify({ tagihan_id: tagihanId, file_name: file.name }),
        },
      );
      await unggahKeStorage(presign.upload_url, file, mimeFile);

      await fetchApi("/api/pembayaran/bukti", {
        method: "POST",
        body: JSON.stringify({
          tagihan_id: tagihanId,
          metode,
          nominal_dibayar: nom,
          tgl_bayar: tglBayar,
          file_key: presign.file_key,
          file_name: file.name,
          mime_type: mimeFile,
          file_size_bytes: file.size,
        }),
      });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onTerkirim();
    } catch (err: unknown) {
      const e2 = err as { pesan?: string; message?: string; detail?: string[] };
      setError(
        e2.detail?.length
          ? e2.detail.join(", ")
          : e2.pesan || e2.message || "Gagal mengirim bukti pembayaran.",
      );
    } finally {
      setMengirim(false);
    }
  };

  return (
    <Card className="p-6 border-biru-200 bg-putih rounded-2xl shadow-sm space-y-5">
      <PopupFormatSalah
        alasan={formatSalah}
        onTutup={() => setFormatSalah(null)}
      />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b border-biru-200">
        <div>
          <h3 className="font-bold text-base text-biru-950 font-serif">
            {judul}
          </h3>
          <p className="text-xs text-biru-700 font-mono">
            No. tagihan {nomorTagihan}
          </p>
          {tglJatuhTempo && !sudahDisetujui && !menunggu && (
            <p className="text-xs text-biru-800 mt-1">
              Bayar sebelum{" "}
              <strong>
                {new Date(tglJatuhTempo).toLocaleString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Jakarta",
                })}{" "}
                WIB
              </strong>
            </p>
          )}
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[11px] uppercase tracking-wider text-biru-700">
            {sudahDisetujui ? "Total dibayar" : "Total yang harus ditransfer"}
          </p>
          <div className="flex sm:justify-end items-center gap-2">
            <p className="text-2xl font-extrabold text-biru-950">
              {rupiah(nominal)}
            </p>
            {!sudahDisetujui && (
              <button
                type="button"
                onClick={() => salin(String(nominal))}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-biru-800 hover:text-biru-950"
                aria-label="Salin nominal"
              >
                <Copy className="w-3.5 h-3.5" />
                {tersalin === String(nominal) ? "Tersalin" : "Salin"}
              </button>
            )}
          </div>
          {rincian && <p className="text-[11px] text-biru-700">{rincian}</p>}
        </div>
      </div>

      {sudahDisetujui && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Pembayaran telah diverifikasi dan disetujui admin PMB.</span>
        </div>
      )}

      {menunggu && !sudahDisetujui && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900"
          role="status"
        >
          <Clock className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Bukti pembayaran ({buktiTerakhir?.file_name}) sudah terkirim dan
            sedang diperiksa admin PMB. Anda tidak perlu melakukan apa pun lagi;
            halaman ini dan email Anda akan diperbarui setelah diverifikasi.
          </span>
        </div>
      )}

      {ditolak && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900"
          role="alert"
        >
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Bukti pembayaran ditolak
            {buktiTerakhir?.catatan ? `: ${buktiTerakhir.catatan}` : "."}{" "}
            Silakan unggah ulang bukti yang benar.
          </span>
        </div>
      )}

      {!sudahDisetujui && !menunggu && (
        <>
          {/* 1. Tujuan transfer */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-bold text-biru-950">
                Transfer ke rekening kampus
              </p>
              <p className="text-xs text-biru-800">
                Pilih salah satu cara bayar, lalu transfer tepat{" "}
                <strong>{rupiah(nominal)}</strong>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2" role="tablist">
              {(
                [
                  {
                    id: "VA_MANDIRI",
                    label: "VA Mandiri",
                    icon: Building2,
                    ada: !!va,
                  },
                  { id: "QRIS", label: "QRIS", icon: QrCode, ada: !!qris },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={metode === m.id}
                  disabled={!m.ada}
                  onClick={() => setMetode(m.id)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    metode === m.id
                      ? "border-biru-700 bg-biru-50 text-biru-950"
                      : "border-biru-200 text-biru-700 hover:border-biru-400"
                  }`}
                >
                  <m.icon className="w-4 h-4" aria-hidden />
                  {m.label}
                </button>
              ))}
            </div>

            {rekening.length === 0 && (
              <p className="text-xs text-biru-800 p-3 rounded-xl bg-biru-50 border border-biru-200">
                Rekening pembayaran belum diatur panitia. Silakan hubungi admin
                PMB.
              </p>
            )}

            {metode === "VA_MANDIRI" && va && (
              <div className="p-4 rounded-xl bg-biru-50 border border-biru-200 space-y-2">
                <p className="text-xs text-biru-700">
                  Nomor Virtual Account {va.nama_bank}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-extrabold font-mono tracking-wider text-biru-950 break-all">
                    {va.nomor}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => salin(va.nomor ?? "")}
                  >
                    <Copy className="w-4 h-4" />
                    {tersalin === va.nomor ? "Tersalin" : "Salin"}
                  </Button>
                </div>
                <p className="text-xs text-biru-800">a.n. {va.atas_nama}</p>
                {va.instruksi && (
                  <p className="text-xs text-biru-800 whitespace-pre-line pt-1 border-t border-biru-200">
                    {va.instruksi}
                  </p>
                )}
              </div>
            )}

            {metode === "QRIS" && qris && (
              <div className="p-4 rounded-xl bg-biru-50 border border-biru-200 flex flex-col items-center gap-2 text-center">
                {qris.qris_image_url ? (
                  <img
                    src={qris.qris_image_url}
                    alt={`QRIS pembayaran a.n. ${qris.atas_nama}`}
                    className="w-56 h-56 object-contain bg-putih rounded-xl border border-biru-200"
                  />
                ) : (
                  <p className="text-xs text-biru-800">
                    Gambar QRIS belum tersedia.
                  </p>
                )}
                <p className="text-xs text-biru-800">
                  Pindai dengan aplikasi bank / e-wallet. a.n. {qris.atas_nama}
                </p>
                {qris.instruksi && (
                  <p className="text-xs text-biru-800 whitespace-pre-line">
                    {qris.instruksi}
                  </p>
                )}
              </div>
            )}

            {beritaTransfer && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-biru-200">
                <div>
                  <p className="text-[11px] text-biru-700">
                    Cantumkan pada berita transfer
                  </p>
                  <p className="font-mono font-bold text-biru-950">
                    {beritaTransfer}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => salin(beritaTransfer)}
                >
                  <Copy className="w-4 h-4" />
                  {tersalin === beritaTransfer ? "Tersalin" : "Salin"}
                </Button>
              </div>
            )}
          </div>

          {/* 2. Unggah bukti */}
          <form onSubmit={kirim} className="space-y-3" noValidate>
            <div className="pt-4 border-t border-biru-100">
              <p className="text-sm font-bold text-biru-950">
                Sudah transfer? Unggah buktinya
              </p>
              <p className="text-xs text-biru-800">
                Isi sesuai yang tertera pada bukti transfer Anda.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-xs text-biru-900">
                <span className="font-semibold">
                  Nominal yang Anda transfer (Rp)
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={nominalDibayar}
                  onChange={(e) => setNominalDibayar(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-biru-200 bg-putih text-sm text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
                  required
                />
              </label>
              <label className="space-y-1 text-xs text-biru-900">
                <span className="font-semibold">Tanggal transfer</span>
                <input
                  type="date"
                  max={hariIni()}
                  value={tglBayar}
                  onChange={(e) => setTglBayar(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-biru-200 bg-putih text-sm text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
                  required
                />
              </label>
            </div>
            <label className="block space-y-1 text-xs text-biru-900">
              <span className="font-semibold">
                Foto / screenshot / PDF bukti transfer (maks. 5 MB)
              </span>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_BUKTI}
                onChange={pilihFile}
                disabled={mengirim}
                className="block w-full text-xs text-biru-900 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-biru-100 file:text-biru-950 file:font-bold"
                required
              />
              {file && (
                <span className="block text-[11px] text-emerald-800 font-semibold">
                  Dipilih: {file.name}
                </span>
              )}
            </label>
            {Number(nominalDibayar) > 0 &&
              Number(nominalDibayar) !== nominal && (
                <p className="text-xs text-amber-800">
                  Nominal berbeda dari tagihan ({rupiah(nominal)}). Pastikan
                  sesuai bukti transfer; selisih akan diperiksa admin.
                </p>
              )}
            {error && (
              <p className="text-xs font-semibold text-rose-700" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={mengirim || rekening.length === 0}
              className="gap-2 w-full sm:w-auto"
            >
              <Upload className="w-4 h-4" />
              {mengirim ? "Mengirim..." : "Kirim Bukti Pembayaran"}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
};
