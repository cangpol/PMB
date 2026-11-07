import React, { useState } from "react";
import {
  Upload,
  FileText,
  AlertCircle,
  Eye,
  FileCheck2,
  X,
  ExternalLink,
} from "lucide-react";
import { Button, Card, StatusBadge, EmptyState } from "../common";
import { useToast } from "@/components/ui/useToast";
import {
  atributAccept,
  labelFormat,
  mimeDariDaftar,
  periksaFormatBerkas,
  unggahKeStorage,
} from "@/lib/unggahBerkas";
import { PopupFormatSalah } from "./PopupFormatSalah";

export interface BerkasItem {
  id?: string | null;
  definisi_berkas_id: string;
  kode_berkas: string;
  nama: string;
  deskripsi?: string | null;
  wajib: boolean;
  tipe_file: string;
  ukuran_maks_kb: number;
  urutan: number;
  file_key?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  status_verifikasi: string; // BELUM_UNGGAH, PENDING, VALID, INVALID, DITERIMA, DITOLAK
  catatan?: string | null;
  uploaded_at?: string | null;
}

interface BerkasUploaderProps {
  berkasList: BerkasItem[];
  onUploadSuccess: () => void;
}

export const BerkasUploader: React.FC<BerkasUploaderProps> = ({
  berkasList,
  onUploadSuccess,
}) => {
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const [uploadError, setUploadError] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [formatSalah, setFormatSalah] = useState<string | null>(null);

  // State untuk modal pratinjau dokumen
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [previewMime, setPreviewMime] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    item: BerkasItem,
  ) => {
    const file = e.target.files?.[0];
    // Kosongkan input agar berkas yang sama dapat dipilih ulang
    e.target.value = "";
    if (!file) return;

    // Reset error
    setUploadError((prev) => ({ ...prev, [item.definisi_berkas_id]: "" }));

    // 1. Validasi format: ekstensi + isi berkas (pop up bila salah)
    const mimeDiizinkan = mimeDariDaftar(item.tipe_file);
    const cek = await periksaFormatBerkas(file, mimeDiizinkan);
    if (!cek.ok) {
      setFormatSalah(cek.alasan);
      return;
    }
    const mime = cek.mime;

    // 2. Validasi Ukuran File (KB ke Bytes)
    const maxBytes = item.ukuran_maks_kb * 1024;
    if (file.size > maxBytes) {
      setUploadError((prev) => ({
        ...prev,
        [item.definisi_berkas_id]: `Ukuran berkas (${(file.size / 1024).toFixed(0)} KB) melebihi batas maksimal ${item.ukuran_maks_kb} KB`,
      }));
      return;
    }

    try {
      setIsUploading((prev) => ({ ...prev, [item.definisi_berkas_id]: true }));
      setUploadProgress((prev) => ({ ...prev, [item.definisi_berkas_id]: 10 }));

      // 3. Minta Presigned Upload PUT URL dari API
      const presignRes = await fetch("/api/pendaftaran/berkas/presign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          definisi_berkas_id: item.definisi_berkas_id,
          file_name: file.name,
          mime_type: mime,
          file_size_bytes: file.size,
        }),
      });

      if (!presignRes.ok) {
        const errJson = await presignRes.json().catch(() => ({}));
        throw new Error(
          errJson.pesan || "Gagal mendapatkan izin unggah berkas",
        );
      }

      const { upload_url, file_key } = await presignRes.json();
      setUploadProgress((prev) => ({ ...prev, [item.definisi_berkas_id]: 30 }));

      // 4. Unggah langsung ke penyimpanan berkas (dengan progress bar)
      await unggahKeStorage(upload_url, file, mime, (persen) =>
        setUploadProgress((prev) => ({
          ...prev,
          [item.definisi_berkas_id]: Math.round(30 + persen * 0.6),
        })),
      );

      setUploadProgress((prev) => ({ ...prev, [item.definisi_berkas_id]: 95 }));

      // 5. Konfirmasi Selesai Unggah ke Backend
      const confirmRes = await fetch("/api/pendaftaran/berkas/konfirmasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          definisi_berkas_id: item.definisi_berkas_id,
          file_key,
          file_name: file.name,
          mime_type: mime,
          file_size_bytes: file.size,
        }),
      });

      if (!confirmRes.ok) {
        const errJson = await confirmRes.json().catch(() => ({}));
        throw new Error(errJson.pesan || "Gagal menyimpan data berkas");
      }

      setUploadProgress((prev) => ({
        ...prev,
        [item.definisi_berkas_id]: 100,
      }));
      onUploadSuccess();
    } catch (err: any) {
      setUploadError((prev) => ({
        ...prev,
        [item.definisi_berkas_id]: err.message || "Gagal mengunggah berkas",
      }));
    } finally {
      setIsUploading((prev) => ({ ...prev, [item.definisi_berkas_id]: false }));
    }
  };

  const handleLihatBerkas = async (item: BerkasItem) => {
    if (!item.id) return;
    try {
      setIsLoadingPreview(true);
      setPreviewTitle(item.nama);
      setPreviewMime(item.mime_type || "application/pdf");

      const res = await fetch(
        `/api/pendaftaran/berkas/${item.id}/presign-download`,
      );
      if (!res.ok) {
        throw new Error("Gagal mengambil tautan pratinjau berkas");
      }
      const data = await res.json();
      setPreviewUrl(data.download_url);
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Kesalahan",
        description: err.message || "Gagal memuat pratinjau dokumen",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  if (berkasList.length === 0) {
    return (
      <Card className="p-8 border-biru-200 bg-putih text-center shadow-xs">
        <EmptyState
          title="Tidak Ada Dokumen Persyaratan"
          description="Jalur pendaftaran ini saat ini tidak memerlukan unggahan berkas persyaratan tambahan."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5">
        {berkasList.map((item) => {
          const isBelum = item.status_verifikasi === "BELUM_UNGGAH" || !item.id;
          const isPending = item.status_verifikasi === "PENDING";
          const isValid =
            item.status_verifikasi === "VALID" ||
            item.status_verifikasi === "DITERIMA";
          const isDitolak =
            item.status_verifikasi === "INVALID" ||
            item.status_verifikasi === "DITOLAK";

          const uploading = isUploading[item.definisi_berkas_id];
          const progress = uploadProgress[item.definisi_berkas_id] || 0;
          const errorMsg = uploadError[item.definisi_berkas_id];

          return (
            <Card
              key={item.definisi_berkas_id}
              className={`p-6 border transition shadow-sm ${
                isDitolak
                  ? "border-biru-400 bg-biru-50/30"
                  : isValid
                    ? "border-biru-200 bg-putih"
                    : "border-biru-100 bg-putih"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif text-base font-bold text-biru-950">
                      {item.nama}
                    </span>
                    {item.wajib ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-biru-900 text-putih">
                        Wajib
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-biru-100 text-biru-800">
                        Opsional
                      </span>
                    )}

                    {/* Status Verifikasi Badge */}
                    {isBelum && (
                      <StatusBadge status="warning" label="Belum Diunggah" />
                    )}
                    {isPending && (
                      <StatusBadge
                        status="info"
                        label="Menunggu Verifikasi Panitia"
                      />
                    )}
                    {isValid && (
                      <StatusBadge
                        status="success"
                        label="Dokumen Diterima / Sah"
                      />
                    )}
                    {isDitolak && (
                      <StatusBadge
                        status="error"
                        label="Perlu Perbaikan / Ditolak"
                      />
                    )}
                  </div>

                  {item.deskripsi && (
                    <p className="text-xs text-biru-800">{item.deskripsi}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-biru-700 pt-1">
                    <span>
                      Format: {labelFormat(mimeDariDaftar(item.tipe_file))}
                    </span>
                    <span>•</span>
                    <span>
                      Maks: {(item.ukuran_maks_kb / 1024).toFixed(1)} MB
                    </span>
                    {item.file_name && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-biru-900 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {item.file_name}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Kotak Catatan Revisi Admin jika Ditolak */}
                  {isDitolak && item.catatan && (
                    <div className="mt-3 p-3 bg-biru-100/60 border border-biru-300 rounded-lg text-xs text-biru-950 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-biru-800 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">
                          Catatan Revisi dari Panitia PMB:
                        </strong>
                        <span>{item.catatan}</span>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {errorMsg && (
                    <p
                      className="text-xs text-rose-700 font-semibold pt-2"
                      role="alert"
                    >
                      {errorMsg}
                    </p>
                  )}

                  {/* Upload Progress Bar */}
                  {uploading && (
                    <div className="pt-3 space-y-1">
                      <div className="flex justify-between text-[11px] text-biru-800 font-medium">
                        <span>
                          Mengunggah langsung ke penyimpanan berkas...
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-biru-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-biru-900 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Tombol Aksi */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {item.id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleLihatBerkas(item)}
                      disabled={isLoadingPreview}
                      className="border-biru-200 text-biru-900 hover:bg-biru-50 flex items-center gap-1.5 text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Berkas</span>
                    </Button>
                  )}

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept={atributAccept(mimeDariDaftar(item.tipe_file))}
                      className="hidden"
                      disabled={uploading || isValid}
                      onChange={(e) => handleFileSelect(e, item)}
                    />
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition shadow-xs ${
                        isValid
                          ? "bg-biru-100 text-biru-400 cursor-not-allowed"
                          : uploading
                            ? "bg-biru-200 text-biru-600 cursor-wait"
                            : isDitolak || isPending
                              ? "bg-biru-900 text-putih hover:bg-biru-950"
                              : "bg-biru-900 text-putih hover:bg-biru-950"
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploading
                          ? "Mengunggah..."
                          : item.id
                            ? "Unggah Ulang"
                            : "Unggah Berkas"}
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <PopupFormatSalah
        alasan={formatSalah}
        onTutup={() => setFormatSalah(null)}
      />

      {/* Modal Pratinjau Dokumen Berkas */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-biru-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-putih rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden border border-biru-200">
            <div className="p-4 bg-biru-950 text-putih flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-biru-300" />
                <h3 className="font-serif text-base font-bold">
                  {previewTitle}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-biru-900 rounded-lg text-putih transition"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="p-1.5 hover:bg-biru-900 rounded-lg text-putih transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-biru-50/50 p-4 flex items-center justify-center overflow-auto">
              {previewMime.includes("image") ? (
                <img
                  src={previewUrl}
                  alt={previewTitle}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-md border border-biru-200"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={previewTitle}
                  className="w-full h-full rounded-lg border border-biru-200 shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
