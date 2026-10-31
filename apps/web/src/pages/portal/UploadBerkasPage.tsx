import React, { useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  Button,
  Card,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";

interface DokumenItem {
  id: string;
  nama: string;
  wajib: boolean;
  format: string;
  ukuranMax: string;
  status: "VALID" | "PENDING" | "EMPTY";
  fileName?: string;
  fileSize?: string;
  catatan?: string;
}

export const UploadBerkasPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const [dokumenList, setDokumenList] = useState<DokumenItem[]>([
    {
      id: "pasfoto",
      nama: "Pasfoto Formal Berwarna (Latar Biru atau Putih)",
      wajib: true,
      format: "JPG, PNG",
      ukuranMax: "2 MB",
      status: "VALID",
      fileName: "pasfoto_formal_budi.jpg",
      fileSize: "840 KB",
      catatan: "Foto formal jelas, memenuhi ketentuan pakaian rapi.",
    },
    {
      id: "ktp",
      nama: "KTP / Kartu Pelajar Asli",
      wajib: true,
      format: "JPG, PNG, PDF",
      ukuranMax: "5 MB",
      status: "VALID",
      fileName: "ktp_budi_santoso.pdf",
      fileSize: "1.2 MB",
      catatan: "Identitas NIK terbaca sangat jelas.",
    },
    {
      id: "rapor",
      nama: "Buku Rapor Semester 1 - 5 (Legalisir)",
      wajib: true,
      format: "PDF",
      ukuranMax: "5 MB",
      status: "VALID",
      fileName: "rapor_semester_1_5.pdf",
      fileSize: "3.4 MB",
      catatan: "Nilai dan stempel legalisir kepala sekolah valid.",
    },
    {
      id: "ijazah",
      nama: "Ijazah SMA/SMK atau Surat Keterangan Lulus (SKL)",
      wajib: false,
      format: "PDF, JPG",
      ukuranMax: "5 MB",
      status: "PENDING",
      fileName: "surat_keterangan_lulus_sementara.pdf",
      fileSize: "1.1 MB",
      catatan: "Sedang diverifikasi oleh tim panitia pendaftaran.",
    },
    {
      id: "prestasi",
      nama: "Sertifikat Prestasi Sains / Olahraga / Seni (Jika Ada)",
      wajib: false,
      format: "PDF, JPG",
      ukuranMax: "5 MB",
      status: "EMPTY",
    },
  ]);

  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleSimulasiUpload = (id: string) => {
    setUploadingId(id);
    setTimeout(() => {
      setDokumenList((prev) =>
        prev.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                status: "PENDING",
                fileName: `unggah_${id}_baru.pdf`,
                fileSize: "1.5 MB",
                catatan: "Berkas baru diunggah, menunggu verifikasi panitia.",
              }
            : doc,
        ),
      );
      setUploadingId(null);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="pb-4 border-b border-biru-200">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
          Unggah Persyaratan Berkas Administrasi
        </h1>
        <p className="text-xs text-biru-800 mt-1">
          Format berkas yang diterima: PDF, JPG, PNG dengan ukuran maksimum 5 MB
          per dokumen.
        </p>
      </div>

      {/* Loading State */}
      {isLoading && <TableSkeleton rows={5} />}

      {/* Error State */}
      {!isLoading && isError && (
        <ErrorState
          title="Gagal Memuat Berkas Pendaftaran"
          message="Terjadi gangguan saat mengambil data dokumen persyaratan Anda."
          onRetry={() => {
            setIsError(false);
            setIsLoading(false);
          }}
        />
      )}

      {/* Empty State */}
      {!isLoading && !isError && dokumenList.length === 0 && (
        <EmptyState
          title="Belum Ada Dokumen Ditugaskan"
          description="Jalur pendaftaran yang Anda pilih saat ini tidak memerlukan berkas tambahan."
        />
      )}

      {/* Data List Dokumen */}
      {!isLoading && !isError && dokumenList.length > 0 && (
        <div className="space-y-4">
          {dokumenList.map((doc) => (
            <Card
              key={doc.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:border-biru-500 transition-all border border-biru-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-biru-100 flex items-center justify-center text-biru-700 flex-shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-biru-950 text-sm sm:text-base">
                      {doc.nama}
                    </h3>
                    {doc.wajib ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-biru-900 text-putih">
                        Wajib
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-biru-100 text-biru-900">
                        Opsional
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-biru-800">
                    Format: {doc.format} • Maks: {doc.ukuranMax}
                  </p>

                  {doc.fileName && (
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                      <span className="font-mono text-biru-950 font-bold bg-biru-50 px-2.5 py-1 rounded-md border border-biru-200">
                        {doc.fileName} ({doc.fileSize})
                      </span>
                      {doc.catatan && (
                        <span className="text-biru-800 italic">
                          “{doc.catatan}”
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {doc.status === "VALID" && (
                  <StatusBadge
                    status="terverifikasi"
                    label="Terverifikasi Sah"
                    size="sm"
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  />
                )}
                {doc.status === "PENDING" && (
                  <StatusBadge
                    status="menunggu"
                    label="Menunggu Pemeriksaan"
                    size="sm"
                    icon={<Clock className="w-3.5 h-3.5" />}
                  />
                )}
                {doc.status === "EMPTY" && (
                  <StatusBadge
                    status="ditolak"
                    label="Belum Diunggah"
                    size="sm"
                    icon={<AlertCircle className="w-3.5 h-3.5" />}
                  />
                )}

                <Button
                  variant={doc.status === "EMPTY" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => handleSimulasiUpload(doc.id)}
                  disabled={uploadingId === doc.id}
                  className="gap-1.5 whitespace-nowrap text-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {uploadingId === doc.id
                      ? "Mengunggah..."
                      : doc.status === "EMPTY"
                        ? "Pilih & Unggah"
                        : "Unggah Ulang"}
                  </span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
