import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileCheck2, ArrowRight, RotateCw } from "lucide-react";
import {
  Button,
  StatusBadge,
  TableSkeleton,
  ErrorState,
} from "../../components/common";
import { BerkasUploader } from "../../components/berkas/BerkasUploader";
import type { BerkasItem } from "../../components/berkas/BerkasUploader";
import { useToast } from "@/components/ui/useToast";

export const UploadBerkasPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [berkasList, setBerkasList] = useState<BerkasItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const fetchBerkasSyarat = async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      const res = await fetch("/api/pendaftaran/berkas/syarat");
      if (!res.ok) {
        if (res.status === 400) {
          // Belum isi biodata
          throw new Error(
            "Silakan isi formulir biodata terlebih dahulu sebelum mengunggah berkas",
          );
        }
        throw new Error("Gagal memuat daftar syarat berkas");
      }

      const data = await res.json();
      setBerkasList(data);
    } catch (err: any) {
      console.error(err);
      setIsError(true);
      toast({
        variant: "error",
        title: "Pemberitahuan",
        description: err.message || "Gagal memuat dokumen berkas",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBerkasSyarat();
  }, []);

  const semuaWajibTerunggah =
    berkasList.length > 0 &&
    berkasList
      .filter((b) => b.wajib)
      .every((b) => b.id && b.status_verifikasi !== "BELUM_UNGGAH");

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        <div className="h-8 w-64 bg-biru-100 animate-pulse rounded-md" />
        <TableSkeleton rows={5} cols={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <ErrorState
          title="Belum Dapat Mengakses Unggah Berkas"
          message="Anda perlu mengisi dan menyimpan data pada formulir biodata terlebih dahulu."
          onRetry={fetchBerkasSyarat}
          retryLabel="Segarkan Halaman"
        >
          <Button
            onClick={() => navigate("/portal/formulir")}
            className="bg-biru-900 text-putih hover:bg-biru-950 font-semibold"
          >
            Buka Formulir Biodata
          </Button>
        </ErrorState>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-biru-100 pb-6">
        <div>
          <span className="text-xs font-semibold text-biru-800 tracking-wider uppercase">
            Portal Calon Mahasiswa • Tahap 3
          </span>
          <h1 className="font-serif text-3xl font-bold text-biru-950 mt-1">
            Unggah Berkas Persyaratan
          </h1>
          <p className="text-xs text-biru-800 mt-1">
            Unggah seluruh dokumen persyaratan asli dalam format PDF atau gambar
            (JPG/PNG). Berkas disimpan secara privat dan terenkripsi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchBerkasSyarat}
            className="flex items-center gap-2 border-biru-200 text-biru-900 hover:bg-biru-50 text-xs"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Segarkan</span>
          </Button>

          {semuaWajibTerunggah && (
            <Button
              onClick={() => navigate("/portal/pembayaran")}
              className="bg-biru-900 text-putih hover:bg-biru-950 font-semibold px-4 py-2 text-xs flex items-center gap-1.5 shadow-sm"
            >
              <span>Lanjut ke Pembayaran</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Info Status Kelengkapan */}
      {berkasList.length > 0 && (
        <div className="p-4 rounded-xl border border-biru-200 bg-biru-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCheck2 className="w-5 h-5 text-biru-900" />
            <div className="text-xs text-biru-950">
              <strong className="font-semibold block">
                Status Berkas:{" "}
                {semuaWajibTerunggah
                  ? "Seluruh Dokumen Wajib Telah Terunggah"
                  : "Masih Ada Dokumen Wajib yang Belum Diunggah"}
              </strong>
              <span>
                Panitia PMB akan memverifikasi dokumen setelah seluruh berkas
                wajib diunggah.
              </span>
            </div>
          </div>

          {semuaWajibTerunggah ? (
            <StatusBadge status="success" label="Lengkap" />
          ) : (
            <StatusBadge status="warning" label="Belum Lengkap" />
          )}
        </div>
      )}

      {/* Komponen Unggah Berkas Presigned MinIO */}
      <BerkasUploader
        berkasList={berkasList}
        onUploadSuccess={() => {
          toast({
            variant: "success",
            title: "Unggah Berhasil",
            description:
              "Dokumen telah berhasil diunggah langsung ke penyimpanan berkas.",
          });
          fetchBerkasSyarat();
        }}
      />
    </div>
  );
};
