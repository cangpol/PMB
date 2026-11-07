import React, { useState, useEffect } from "react";
import { Search, Download, Sparkles, X, FileText } from "lucide-react";
import {
  Card,
  Button,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";
import { fetchApi } from "../../services/api";
import { useDialog } from "@/components/ui/useDialog";
import { BuktiPembayaranAdminPanel } from "../../components/admin/BuktiPembayaranAdminPanel";

interface BerkasDaftarUlang {
  id: string;
  pendaftar_id: string;
  jenis_berkas: string;
  file_key: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  status_verifikasi: "PENDING" | "VALID" | "INVALID";
  catatan?: string | null;
  uploaded_at: string;
}

interface MahasiswaDaftarUlangItem {
  pendaftar_id: string;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  prodi_diterima: string;
  jenjang: string;
  status_kelulusan: string;
  status_daftar_ulang: string;
  nim_resmi?: string | null;
  nomor_loa?: string | null;
  status_ukt: string;
  total_berkas_valid: number;
  total_berkas_pending: number;
}

export const VerifikasiDaftarUlangPage: React.FC = () => {
  const dialog = useDialog();
  const [items, setItems] = useState<MahasiswaDaftarUlangItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Inspection modal
  const [inspectStudent, setInspectStudent] =
    useState<MahasiswaDaftarUlangItem | null>(null);
  const [berkasList, setBerkasList] = useState<BerkasDaftarUlang[]>([]);
  const [isLoadingBerkas, setIsLoadingBerkas] = useState<boolean>(false);
  const [catatanVerifikasi, setCatatanVerifikasi] = useState<string>("");

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage("");
    try {
      const data = await fetchApi<MahasiswaDaftarUlangItem[]>(
        "/api/kelulusan/admin/daftar-ulang/list",
      );
      setItems(data || []);
    } catch (err: unknown) {
      setIsError(true);
      const e = err as { pesan?: string };
      setErrorMessage(
        e.pesan || "Gagal memuat daftar registrasi mahasiswa baru.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInspect = async (student: MahasiswaDaftarUlangItem) => {
    setInspectStudent(student);
    setIsLoadingBerkas(true);
    setCatatanVerifikasi("");
    try {
      const berkas = await fetchApi<BerkasDaftarUlang[]>(
        `/api/kelulusan/admin/daftar-ulang/berkas/${student.pendaftar_id}`,
      );
      setBerkasList(berkas || []);
    } catch {
      setBerkasList([]);
    } finally {
      setIsLoadingBerkas(false);
    }
  };

  const handleVerifikasiBerkas = async (
    berkasId: string,
    status: "VALID" | "INVALID",
  ) => {
    const berkas = berkasList.find((b) => b.id === berkasId);
    const namaBerkas = berkas?.jenis_berkas.replace(/_/g, " ") ?? "Berkas";
    let catatan = catatanVerifikasi.trim();
    if (status === "INVALID" && !catatan) {
      const alasan = await dialog.masukkanAlasan({
        judul: "Tolak berkas daftar ulang?",
        deskripsi: (
          <>
            <strong className="text-biru-950">{namaBerkas}</strong> milik{" "}
            {inspectStudent?.nama_lengkap ?? "calon"} akan ditolak. Alasan ini
            dikirim ke calon agar dapat memperbaiki berkasnya.
          </>
        ),
        label: "Alasan penolakan",
        placeholder: "Contoh: scan tidak terbaca atau belum dilegalisir.",
        labelKirim: "Tolak Berkas",
        nada: "bahaya",
      });
      if (alasan === null) return;
      catatan = alasan;
    }
    try {
      await fetchApi(
        `/api/kelulusan/admin/daftar-ulang/verifikasi/${berkasId}`,
        {
          method: "POST",
          body: JSON.stringify({
            status,
            catatan: status === "INVALID" ? catatan : null,
          }),
        },
      );

      setBerkasList((prev) =>
        prev.map((b) =>
          b.id === berkasId ? { ...b, status_verifikasi: status } : b,
        ),
      );
      await loadData();
      void dialog.hasil(
        status === "VALID"
          ? {
              nada: "sukses",
              judul: "Berkas disetujui",
              deskripsi: `${namaBerkas} dinyatakan sah.`,
              autoTutupMs: 2200,
            }
          : {
              nada: "ditolak",
              judul: "Berkas ditolak",
              deskripsi: `${namaBerkas} dikembalikan ke calon untuk diperbaiki.`,
              rincian: [`Alasan: ${catatan}`],
              autoTutupMs: 4500,
            },
      );
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      void dialog.hasil({
        nada: "gagal",
        judul: "Berkas gagal diverifikasi",
        deskripsi: e.pesan || "Gagal memverifikasi berkas",
      });
    }
  };

  const lihatBerkas = async (berkasId: string) => {
    try {
      const res = await fetchApi<{ download_url: string }>(
        `/api/kelulusan/admin/daftar-ulang/berkas/${berkasId}/unduh`,
      );
      window.open(res.download_url, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      void dialog.hasil({
        nada: "gagal",
        judul: "Berkas tidak dapat dibuka",
        deskripsi: (err as { pesan?: string }).pesan || "Gagal membuka berkas",
      });
    }
  };

  const handleGenerateNim = async (pendaftarId: string) => {
    const ya = await dialog.konfirmasi({
      judul: "Terbitkan NIM resmi?",
      deskripsi:
        "Nomor Induk Mahasiswa (NIM) resmi akan diterbitkan untuk calon mahasiswa ini dan tidak dapat diubah.",
      nada: "sukses",
      labelYa: "Ya, Terbitkan NIM",
    });
    if (!ya) return;
    try {
      const res = await fetchApi<{ nim_resmi: string }>(
        `/api/kelulusan/admin/generate-nim/${pendaftarId}`,
        { method: "POST" },
      );
      await loadData();
      if (inspectStudent?.pendaftar_id === pendaftarId) {
        setInspectStudent((prev) =>
          prev
            ? {
                ...prev,
                nim_resmi: res.nim_resmi,
                status_daftar_ulang: "TERDAFTAR_SEBAGAI_MAHASISWA",
              }
            : null,
        );
      }
      void dialog.hasil({
        nada: "sukses",
        judul: "NIM berhasil diterbitkan",
        deskripsi: "Calon kini terdaftar sebagai mahasiswa dengan NIM resmi:",
        rincian: [res.nim_resmi],
        labelTutup: "Selesai",
      });
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      void dialog.hasil({
        nada: "gagal",
        judul: "NIM gagal diterbitkan",
        deskripsi: e.pesan || "Gagal menerbitkan NIM",
      });
    }
  };

  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nomor_pendaftaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.nim_resmi && item.nim_resmi.includes(searchTerm));
    const matchStatus =
      filterStatus === "ALL" || item.status_daftar_ulang === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <BuktiPembayaranAdminPanel
        jenis="DAFTAR_ULANG_UKT"
        judul="Verifikasi Bukti Bayar Daftar Ulang"
        onChanged={loadData}
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-200">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Verifikasi Daftar Ulang & Penerbitan NIM
          </h1>
          <p className="text-xs sm:text-sm text-biru-800">
            Pengelolaan registrasi calon mahasiswa baru, verifikasi keabsahan
            dokumen, dan penomoran NIM atomik anti-duplikasi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              window.open(
                "/api/kelulusan/admin/ekspor-siakad?format=csv",
                "_blank",
              )
            }
            className="gap-1.5 text-xs text-biru-900 border-biru-300"
          >
            <Download className="w-3.5 h-3.5 text-biru-700" />
            <span>Ekspor SIAKAD</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-biru-200 bg-putih">
          <p className="text-xs font-medium text-biru-800">
            Total Mahasiswa Lulus
          </p>
          <p className="text-2xl font-bold text-biru-950 mt-1">
            {items.length}
          </p>
        </Card>
        <Card className="p-4 border-biru-200 bg-biru-50/50">
          <p className="text-xs font-medium text-biru-800">UKT Lunas</p>
          <p className="text-2xl font-bold text-biru-950 mt-1">
            {items.filter((i) => i.status_ukt === "PAID").length}
          </p>
        </Card>
        <Card className="p-4 border-biru-200 bg-biru-50/70">
          <p className="text-xs font-medium text-biru-800">Berkas Lengkap</p>
          <p className="text-2xl font-bold text-biru-950 mt-1">
            {
              items.filter((i) => i.status_daftar_ulang === "BERKAS_LENGKAP")
                .length
            }
          </p>
        </Card>
        <Card className="p-4 border-biru-300 bg-biru-100/60">
          <p className="text-xs font-medium text-biru-900">NIM Resmi Terbit</p>
          <p className="text-2xl font-bold text-biru-950 mt-1">
            {items.filter((i) => Boolean(i.nim_resmi)).length}
          </p>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="p-4 border-biru-200 bg-putih flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-biru-600" />
          <input
            type="text"
            placeholder="Cari nama, nomor pendaftaran, atau NIM..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-biru-300 rounded-xl text-xs text-biru-950 focus:ring-2 focus:ring-biru-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            "ALL",
            "TAGIHAN_TERBIT",
            "LUNAS",
            "BERKAS_LENGKAP",
            "TERDAFTAR_SEBAGAI_MAHASISWA",
          ].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === st
                  ? "bg-biru-900 text-putih shadow-sm"
                  : "bg-biru-100 text-biru-900 hover:bg-biru-200"
              }`}
            >
              {st === "ALL" ? "Semua Status" : st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </Card>

      {/* Loading & Error States */}
      {isLoading && <TableSkeleton />}

      {isError && (
        <ErrorState
          title="Gagal Memuat Data Registrasi"
          message={errorMessage}
          onRetry={loadData}
        />
      )}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          title="Belum Ada Mahasiswa Lulus"
          description="Lakukan proses sidang pleno kelulusan di menu 'Seleksi Kelulusan' terlebih dahulu untuk memulai alur daftar ulang."
        />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <Card className="overflow-hidden border-biru-200 bg-putih rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-biru-100/70 border-b border-biru-200 text-biru-950 font-semibold">
                  <th className="py-3 px-4">Calon Mahasiswa</th>
                  <th className="py-3 px-4">Program Studi</th>
                  <th className="py-3 px-4 text-center">Status UKT</th>
                  <th className="py-3 px-4 text-center">Status Daftar Ulang</th>
                  <th className="py-3 px-4 text-center">NIM Resmi</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-biru-100 text-biru-950">
                {filteredItems.map((item) => (
                  <tr
                    key={item.pendaftar_id}
                    className="hover:bg-biru-50/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-biru-950">
                        {item.nama_lengkap}
                      </div>
                      <div className="text-[11px] text-biru-700 font-mono">
                        {item.nomor_pendaftaran}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-biru-950">
                        {item.prodi_diterima}
                      </div>
                      <div className="text-[11px] text-biru-700">
                        {item.jenjang} Reguler
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge
                        status={
                          item.status_ukt === "PAID"
                            ? "berhasil"
                            : item.status_ukt === "PENDING"
                              ? "peringatan"
                              : "menunggu"
                        }
                        label={
                          item.status_ukt === "PAID"
                            ? "LUNAS"
                            : item.status_ukt.replace(/_/g, " ")
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge
                        status={
                          item.nim_resmi
                            ? "berhasil"
                            : item.status_daftar_ulang === "BERKAS_LENGKAP"
                              ? "info"
                              : "peringatan"
                        }
                        label={
                          item.nim_resmi
                            ? "TERDAFTAR RESMI"
                            : item.status_daftar_ulang.replace(/_/g, " ")
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      {item.nim_resmi ? (
                        <span className="text-biru-900 bg-biru-100 px-2 py-0.5 rounded border border-biru-300">
                          {item.nim_resmi}
                        </span>
                      ) : (
                        <span className="text-biru-600 font-normal italic">
                          Belum terbit
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleInspect(item)}
                          className="text-[11px] px-2 py-1 text-biru-900 border-biru-300"
                        >
                          Periksa Berkas
                        </Button>
                        {!item.nim_resmi && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleGenerateNim(item.pendaftar_id)}
                            className="bg-biru-900 hover:bg-biru-950 text-putih font-bold text-[11px] px-2.5 py-1 gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-putih" />
                            <span>Terbitkan NIM</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Periksa Berkas & Verifikasi */}
      {inspectStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-biru-950/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl bg-putih p-6 rounded-2xl shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-biru-200">
              <div>
                <h3 className="font-bold text-base text-biru-950 font-serif">
                  Verifikasi Berkas Registrasi Mahasiswa Baru
                </h3>
                <p className="text-xs text-biru-700 font-mono">
                  {inspectStudent.nama_lengkap} (
                  {inspectStudent.nomor_pendaftaran}) •{" "}
                  {inspectStudent.prodi_diterima}
                </p>
              </div>
              <button
                onClick={() => setInspectStudent(null)}
                className="text-biru-600 hover:text-biru-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {isLoadingBerkas && (
                <div className="py-8 text-center text-biru-700">
                  Memuat berkas pendaftar...
                </div>
              )}

              {!isLoadingBerkas && berkasList.length === 0 && (
                <div className="py-8 text-center space-y-2 border border-dashed border-biru-300 rounded-xl bg-biru-50/40">
                  <FileText className="w-8 h-8 text-biru-400 mx-auto" />
                  <p className="font-semibold text-biru-950">
                    Belum Ada Berkas Diunggah
                  </p>
                  <p className="text-biru-700 text-xs max-w-sm mx-auto">
                    Calon mahasiswa ini belum mengunggah dokumen persyaratan
                    daftar ulang di portal pendaftar.
                  </p>
                </div>
              )}

              {!isLoadingBerkas &&
                berkasList.map((berkas) => (
                  <div
                    key={berkas.id}
                    className="p-4 border border-biru-200 rounded-xl bg-biru-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-biru-950">
                          {berkas.jenis_berkas.replace(/_/g, " ")}
                        </p>
                        <p className="text-[11px] text-biru-700 font-mono">
                          {berkas.file_name} (
                          {Math.round(berkas.file_size_bytes / 1024)} KB)
                        </p>
                        <button
                          type="button"
                          onClick={() => lihatBerkas(berkas.id)}
                          className="text-[11px] font-semibold text-biru-800 underline"
                        >
                          Lihat berkas
                        </button>
                      </div>
                      <StatusBadge
                        status={
                          berkas.status_verifikasi === "VALID"
                            ? "berhasil"
                            : berkas.status_verifikasi === "INVALID"
                              ? "gagal"
                              : "peringatan"
                        }
                        label={berkas.status_verifikasi}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-biru-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleVerifikasiBerkas(berkas.id, "INVALID")
                        }
                        className="text-[11px] px-2.5 py-1 text-biru-900 border-biru-300 hover:bg-biru-100"
                      >
                        Tolak / Perlu Revisi
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          handleVerifikasiBerkas(berkas.id, "VALID")
                        }
                        className="bg-biru-900 hover:bg-biru-950 text-putih text-[11px] px-2.5 py-1"
                      >
                        Verifikasi Valid
                      </Button>
                    </div>
                  </div>
                ))}
            </div>

            <div className="pt-3 border-t border-biru-200 flex items-center justify-between">
              <div>
                {!inspectStudent.nim_resmi && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      handleGenerateNim(inspectStudent.pendaftar_id)
                    }
                    className="bg-biru-900 hover:bg-biru-950 text-putih font-bold gap-1 text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-putih" />
                    <span>Terbitkan NIM Sekarang</span>
                  </Button>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInspectStudent(null)}
              >
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
