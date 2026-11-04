import React, { useRef, useState } from "react";
import { Upload, Receipt, Copy, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, Button } from "../common";
import { fetchApi } from "../../services/api";

interface Props {
  nomorRegistrasi?: string | null;
  statusBukti?: string | null;
  catatanBukti?: string | null;
  nominal?: number;
  sudahLunas: boolean;
  onUploaded: () => void;
}

const TIPE_OK = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAKS_BYTES = 5 * 1024 * 1024;

export const BuktiBayarCard: React.FC<Props> = ({
  nomorRegistrasi,
  statusBukti,
  catatanBukti,
  nominal,
  sudahLunas,
  onUploaded,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const salin = async () => {
    if (!nomorRegistrasi) return;
    try {
      await navigator.clipboard.writeText(nomorRegistrasi);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file || !nomorRegistrasi) return;
    setError(null);

    if (!TIPE_OK.includes(file.type)) {
      setError("Format harus foto JPG/PNG/WEBP atau PDF.");
      input.value = "";
      return;
    }
    if (file.size > MAKS_BYTES) {
      setError("Ukuran file maksimal 5 MB.");
      input.value = "";
      return;
    }

    setUploading(true);
    try {
      const presign = await fetchApi<{ upload_url: string; file_key: string }>(
        "/api/kelulusan/daftar-ulang/bukti-bayar/presign",
        { method: "POST", body: JSON.stringify({ file_name: file.name }) },
      );
      const put = await fetch(presign.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Unggah gagal (HTTP ${put.status})`);

      await fetchApi("/api/kelulusan/daftar-ulang/bukti-bayar", {
        method: "POST",
        body: JSON.stringify({
          nomor_registrasi: nomorRegistrasi,
          file_name: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
          file_key: presign.file_key,
        }),
      });
      onUploaded();
    } catch (err: unknown) {
      const e2 = err as { pesan?: string; message?: string };
      setError(e2.pesan || e2.message || "Gagal mengunggah bukti bayar.");
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  const menunggu = statusBukti === "PENDING";
  const ditolak = statusBukti === "DITOLAK";
  const disetujui = statusBukti === "DISETUJUI" || sudahLunas;

  return (
    <Card className="p-6 border-biru-200 bg-putih rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-biru-200">
        <Receipt className="w-5 h-5 text-biru-800" />
        <h3 className="font-bold text-base text-biru-950 font-serif">
          Nomor Registrasi & Bukti Pembayaran
        </h3>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-biru-50 border border-biru-200">
        <div>
          <p className="text-xs text-biru-700">
            Nomor Registrasi Daftar Ulang Anda
          </p>
          <p className="text-xl font-extrabold tracking-wider text-biru-950">
            {nomorRegistrasi || "-"}
          </p>
          <p className="text-[11px] text-biru-700 mt-0.5">
            Simpan nomor ini; dipakai saat daftar ulang dan konfirmasi ke
            panitia.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={salin} className="gap-1.5">
          <Copy className="w-4 h-4" />
          {copied ? "Tersalin" : "Salin"}
        </Button>
      </div>

      {disetujui && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Pembayaran daftar ulang telah diverifikasi admin. NIM Anda
            diterbitkan otomatis.
          </span>
        </div>
      )}

      {menunggu && !disetujui && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <Clock className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Bukti bayar sedang diperiksa admin. NIM akan terbit otomatis setelah
            disetujui.
          </span>
        </div>
      )}

      {ditolak && !disetujui && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Bukti bayar ditolak{catatanBukti ? `: ${catatanBukti}` : "."} Silakan
            unggah ulang.
          </span>
        </div>
      )}

      {!disetujui && !menunggu && (
        <div className="space-y-2">
          <p className="text-xs text-biru-800">
            Transfer sebesar{" "}
            <strong>
              {nominal ? `Rp ${nominal.toLocaleString("id-ID")}` : "tagihan"}
            </strong>{" "}
            lalu unggah foto/screenshot bukti bayar (JPG, PNG, WEBP, atau PDF,
            maks. 5 MB).
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
          <Button
            variant="primary"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || !nomorRegistrasi}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Mengunggah..." : "Unggah Bukti Bayar"}
          </Button>
          {error && (
            <p className="text-xs font-semibold text-rose-700" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </Card>
  );
};
