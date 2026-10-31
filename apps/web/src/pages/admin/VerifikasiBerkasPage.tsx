import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  FileCheck2,
  ExternalLink,
  RotateCw,
} from "lucide-react";
import {
  Card,
  Button,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";
import { Input } from "@/components/ui";
import { useToast } from "@/components/ui/useToast";

interface BerkasDetail {
  id: string;
  pendaftar_id: string;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  email: string;
  nama_jalur: string;
  definisi_berkas_id?: string | null;
  kode_berkas: string;
  nama_berkas: string;
  wajib: boolean;
  file_key: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  status_verifikasi: string; // PENDING, VALID, INVALID, DITERIMA, DITOLAK
  catatan?: string | null;
  uploaded_at: string;
  verified_at?: string | null;
}

export const VerifikasiBerkasPage: React.FC = () => {
  const { toast } = useToast();

  const [berkasList, setBerkasList] = useState<BerkasDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("SEMUA");

  // Preview Modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [previewMime, setPreviewMime] = useState<string>("");

  // Verifikasi Modal (Tolak dengan catatan)
  const [rejectModalItem, setRejectModalItem] = useState<BerkasDetail | null>(
    null,
  );
  const [alasanTolak, setAlasanTolak] = useState<string>("");
  const [isSubmittingVerifikasi, setIsSubmittingVerifikasi] =
    useState<boolean>(false);

  const fetchBerkas = async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "SEMUA") {
        params.append("status", statusFilter);
      }
      if (search.trim()) {
        params.append("search", search.trim());
      }

      const res = await fetch(
        `/api/pendaftaran/admin/berkas-list?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("Gagal mengambil daftar berkas pendaftar");
      }

      const data = await res.json();
      setBerkasList(data);
    } catch (err: any) {
      console.error(err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBerkas();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBerkas();
  };

  const handleLihatBerkas = async (item: BerkasDetail) => {
    try {
      setPreviewTitle(`${item.nama_berkas} - ${item.nama_lengkap}`);
      setPreviewMime(item.mime_type || "application/pdf");

      const res = await fetch(
        `/api/pendaftaran/berkas/${item.id}/presign-download`,
      );
      if (!res.ok) {
        throw new Error("Gagal mendapatkan tautan berkas presigned");
      }
      const data = await res.json();
      setPreviewUrl(data.download_url);
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Kesalahan",
        description: err.message || "Gagal membuka pratinjau dokumen",
      });
    }
  };

  const handleVerifikasi = async (
    berkasId: string,
    status: "VALID" | "INVALID",
    catatan?: string,
  ) => {
    try {
      setIsSubmittingVerifikasi(true);

      const res = await fetch("/api/pendaftaran/admin/verifikasi-berkas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          berkas_id: berkasId,
          status_verifikasi: status,
          catatan: catatan || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan hasil verifikasi berkas");
      }

      toast({
        variant: "success",
        title: "Verifikasi Berhasil",
        description:
          status === "VALID"
            ? "Berkas berhasil disahkan (VALID)."
            : "Berkas ditolak dan catatan revisi telah dikirimkan ke calon mahasiswa.",
      });

      setRejectModalItem(null);
      setAlasanTolak("");
      fetchBerkas();
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Kesalahan",
        description: err.message || "Gagal memproses verifikasi",
      });
    } finally {
      setIsSubmittingVerifikasi(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-biru-100 pb-6">
        <div>
          <span className="text-xs font-semibold text-biru-800 tracking-wider uppercase">
            Operasional PMB • Administrator & Verifikator
          </span>
          <h1 className="font-serif text-3xl font-bold text-biru-950 mt-1">
            Verifikasi Dokumen Berkas PMB
          </h1>
          <p className="text-xs text-biru-800 mt-1">
            Periksa keabsahan pasfoto, identitas diri, ijazah, dan rapor yang
            diunggah calon mahasiswa baru.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchBerkas}
          className="flex items-center gap-2 border-biru-200 text-biru-900 hover:bg-biru-50 self-start md:self-auto text-xs"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Segarkan Data</span>
        </Button>
      </div>

      {/* Filter & Pencarian */}
      <Card className="p-4 border-biru-100 bg-putih shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-2 w-full md:w-96"
        >
          <Input
            placeholder="Cari no. pendaftaran, nama, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs"
          />
          <Button
            type="submit"
            className="bg-biru-900 text-putih hover:bg-biru-950 px-3 py-2 text-xs font-semibold shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
          </Button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-biru-700" />
          <span className="text-xs font-semibold text-biru-900">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-putih border border-biru-200 rounded-lg text-xs text-biru-950 focus:ring-2 focus:ring-biru-800"
          >
            <option value="SEMUA">Semua Status</option>
            <option value="PENDING">Menunggu Verifikasi</option>
            <option value="VALID">Diterima / Sah</option>
            <option value="INVALID">Perlu Perbaikan / Ditolak</option>
          </select>
        </div>
      </Card>

      {/* Konten Tabel Verifikasi */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : isError ? (
        <ErrorState
          title="Gagal Memuat Berkas"
          message="Tidak dapat mengambil daftar berkas dari database pendaftaran."
          onRetry={fetchBerkas}
        />
      ) : berkasList.length === 0 ? (
        <EmptyState
          title="Tidak Ada Berkas yang Cocok"
          description="Belum ada dokumen pendaftar yang memenuhi kriteria pencarian atau filter yang dipilih."
        />
      ) : (
        <Card className="overflow-hidden border-biru-100 bg-putih shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-biru-950 text-putih uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Calon Mahasiswa</th>
                  <th className="py-3 px-4">Nama Dokumen</th>
                  <th className="py-3 px-4">File & Ukuran</th>
                  <th className="py-3 px-4">Waktu Unggah</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-biru-100 text-biru-950">
                {berkasList.map((item) => {
                  const isPending =
                    item.status_verifikasi === "PENDING" ||
                    item.status_verifikasi === "BELUM";
                  const isValid =
                    item.status_verifikasi === "VALID" ||
                    item.status_verifikasi === "DITERIMA";
                  const isInvalid =
                    item.status_verifikasi === "INVALID" ||
                    item.status_verifikasi === "DITOLAK";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-biru-50/40 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-biru-950">
                          {item.nama_lengkap}
                        </div>
                        <div className="font-mono text-[11px] text-biru-800">
                          {item.nomor_pendaftaran}
                        </div>
                        <div className="text-[11px] text-biru-600">
                          {item.nama_jalur}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-biru-950">
                          {item.nama_berkas}
                        </div>
                        {item.wajib ? (
                          <span className="text-[10px] text-biru-900 bg-biru-100 px-1.5 py-0.5 rounded font-bold">
                            Wajib
                          </span>
                        ) : (
                          <span className="text-[10px] text-biru-700 bg-biru-50 px-1.5 py-0.5 rounded">
                            Opsional
                          </span>
                        )}
                        {item.catatan && (
                          <div className="text-[11px] text-biru-800 italic mt-1 bg-biru-50 p-1.5 rounded border border-biru-200">
                            Catatan: {item.catatan}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-xs text-biru-900 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-biru-700" />
                          <span className="truncate max-w-[160px]">
                            {item.file_name}
                          </span>
                        </div>
                        <div className="text-[11px] text-biru-600">
                          {(item.file_size_bytes / 1024).toFixed(0)} KB •{" "}
                          {item.mime_type}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-biru-800">
                        {new Date(item.uploaded_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-3 px-4">
                        {isPending && (
                          <StatusBadge status="warning" label="Menunggu" />
                        )}
                        {isValid && (
                          <StatusBadge
                            status="success"
                            label="Diterima (Sah)"
                          />
                        )}
                        {isInvalid && (
                          <StatusBadge status="error" label="Perlu Perbaikan" />
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLihatBerkas(item)}
                            className="text-xs border-biru-200 text-biru-900 hover:bg-biru-50 p-1.5"
                            title="Pratinjau Dokumen"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleVerifikasi(item.id, "VALID")}
                            disabled={isSubmittingVerifikasi || isValid}
                            className="bg-biru-900 text-putih hover:bg-biru-950 text-xs px-2.5 py-1 disabled:opacity-40"
                            title="Sahkan Berkas"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Terima
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectModalItem(item);
                              setAlasanTolak(item.catatan || "");
                            }}
                            disabled={isSubmittingVerifikasi}
                            className="border-biru-300 text-biru-700 hover:bg-biru-50 text-xs px-2 py-1"
                            title="Tolak dan Minta Revisi"
                          >
                            <AlertCircle className="w-3.5 h-3.5 mr-1" />
                            Tolak
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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

      {/* Modal Input Alasan Penolakan Berkas */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-biru-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-putih rounded-2xl shadow-2xl max-w-md w-full p-6 border border-biru-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-biru-100">
              <div className="flex items-center gap-2 text-biru-950">
                <AlertCircle className="w-5 h-5 text-biru-800" />
                <h3 className="font-serif text-base font-bold">
                  Tolak Berkas & Minta Perbaikan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="text-biru-400 hover:text-biru-900"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-biru-800 space-y-1">
              <div>
                Pendaftar:{" "}
                <strong className="font-semibold text-biru-950">
                  {rejectModalItem.nama_lengkap}
                </strong>
              </div>
              <div>
                Dokumen:{" "}
                <strong className="font-semibold text-biru-950">
                  {rejectModalItem.nama_berkas}
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-biru-900 mb-1">
                Catatan Revisi untuk Calon Mahasiswa *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Contoh: Foto buram / tidak jelas, atau dokumen ijazah belum berlegalisir."
                value={alasanTolak}
                onChange={(e) => setAlasanTolak(e.target.value)}
                className="w-full px-3 py-2 bg-putih border border-biru-200 rounded-lg text-xs text-biru-950 focus:ring-2 focus:ring-biru-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-biru-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectModalItem(null)}
                className="border-biru-200 text-biru-900 text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={isSubmittingVerifikasi || !alasanTolak.trim()}
                onClick={() =>
                  handleVerifikasi(rejectModalItem.id, "INVALID", alasanTolak)
                }
                className="bg-biru-900 text-putih hover:bg-biru-950 text-xs font-semibold"
              >
                Simpan Penolakan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
