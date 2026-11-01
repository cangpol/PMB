import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Upload,
  CreditCard,
  FileCheck,
  Printer,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  StatusBadge,
  CardSkeleton,
  ErrorState,
} from "../../components/common";
import { fetchApi } from "../../services/api";
import logoPlaceholder from "../../assets/logo-placeholder.svg";

interface TagihanDto {
  id: string;
  nomor_tagihan: string;
  nominal_asli: number;
  nominal_akhir: number;
  diskon: number;
  status: string; // 'PENDING' | 'PAID' | 'MENUNGGU_PEMBAYARAN' | 'LUNAS'
  metode_pembayaran: string;
  payment_url?: string | null;
  va_number?: string | null;
}

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

interface DaftarUlangResponse {
  pendaftar_id: string;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  prodi_diterima: string;
  jenjang: string;
  fakultas: string;
  status_kelulusan: string;
  status_daftar_ulang: string; // 'BELUM_DAFTAR_ULANG' | 'TAGIHAN_TERBIT' | 'LUNAS' | 'BERKAS_LENGKAP' | 'TERDAFTAR_SEBAGAI_MAHASISWA'
  nim_resmi?: string | null;
  nomor_loa?: string | null;
  tagihan?: TagihanDto | null;
  berkas_list: BerkasDaftarUlang[];
}

const REQUIRED_DOCS = [
  {
    jenis: "SURAT_PERNYATAAN_MABA",
    title: "Surat Pernyataan Mahasiswa Baru",
    desc: "Format resmi bermaterai Rp 10.000 yang telah ditandatangani orang tua dan calon maba.",
  },
  {
    jenis: "SURAT_BEBAS_NARKOBA",
    title: "Surat Keterangan Bebas Narkoba (SKBN)",
    desc: "Diterbitkan dari Rumah Sakit / Puskesmas / BNN resmi.",
  },
  {
    jenis: "AKTA_KELAHIRAN",
    title: "Salinan Akta Kelahiran",
    desc: "Scan dokumen asli akta kelahiran calon mahasiswa.",
  },
  {
    jenis: "IJAZAH_LEGALISIR",
    title: "Ijazah / Surat Keterangan Lulus Legalisir",
    desc: "Scan ijazah SMA/SMK/MA yang telah dilegalisasi kepala sekolah.",
  },
];

export const DaftarUlangPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DaftarUlangResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [uploadingJenis, setUploadingJenis] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await fetchApi<DaftarUlangResponse>(
        "/api/kelulusan/daftar-ulang",
      );
      setData(res);
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setErrorMessage(
        e.pesan || "Gagal memuat informasi registrasi daftar ulang.",
      );
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSimulatedUpload = async (jenis: string) => {
    setUploadingJenis(jenis);
    try {
      const fakeFileName = `${jenis.toLowerCase()}_pmb_2026.pdf`;
      await fetchApi("/api/kelulusan/daftar-ulang/berkas", {
        method: "POST",
        body: JSON.stringify({
          jenis_berkas: jenis,
          file_name: fakeFileName,
          mime_type: "application/pdf",
          file_size_bytes: 524288,
          file_key: `daftar_ulang/${data?.pendaftar_id}/${fakeFileName}`,
        }),
      });
      await loadData();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      alert(e.pesan || "Gagal mengunggah berkas");
    } finally {
      setUploadingJenis(null);
    }
  };

  const getDocStatus = (jenis: string) => {
    return data?.berkas_list.find((b) => b.jenis_berkas === jenis);
  };

  const isLunas =
    data?.status_daftar_ulang === "LUNAS" ||
    data?.status_daftar_ulang === "BERKAS_LENGKAP" ||
    data?.status_daftar_ulang === "TERDAFTAR_SEBAGAI_MAHASISWA" ||
    data?.tagihan?.status === "LUNAS" ||
    data?.tagihan?.status === "PAID";

  const isBerkasLengkap =
    data?.status_daftar_ulang === "BERKAS_LENGKAP" ||
    data?.status_daftar_ulang === "TERDAFTAR_SEBAGAI_MAHASISWA";

  const isTerdaftarMaba =
    data?.status_daftar_ulang === "TERDAFTAR_SEBAGAI_MAHASISWA";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-200">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Daftar Ulang & Registrasi Mahasiswa Baru
          </h1>
          <p className="text-xs sm:text-sm text-biru-800">
            Tahapan penyelesaian administrasi UKT, verifikasi berkas, dan
            perolehan NIM resmi PMB 2026
          </p>
        </div>
        {data && (
          <StatusBadge
            status={
              isTerdaftarMaba
                ? "berhasil"
                : isBerkasLengkap
                  ? "info"
                  : isLunas
                    ? "peringatan"
                    : "standar"
            }
            label={data.status_daftar_ulang.replace(/_/g, " ")}
          />
        )}
      </div>

      {isLoading && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!isLoading && isError && (
        <ErrorState
          title="Gagal Memuat Halaman Daftar Ulang"
          message={errorMessage}
          onRetry={loadData}
        />
      )}

      {!isLoading && !isError && data && (
        <div className="space-y-6">
          {/* Stepper Progres */}
          <Card className="p-4 sm:p-6 border-biru-200 bg-putih rounded-2xl shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-putih flex items-center justify-center font-bold text-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-biru-700">Langkah 1</p>
                  <p className="text-xs font-bold text-biru-950">
                    Lulus Seleksi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    isLunas
                      ? "bg-emerald-600 text-putih"
                      : "bg-biru-100 text-biru-900 border border-biru-300"
                  }`}
                >
                  {isLunas ? <CheckCircle2 className="w-5 h-5" /> : "2"}
                </div>
                <div>
                  <p className="text-[11px] text-biru-700">Langkah 2</p>
                  <p className="text-xs font-bold text-biru-950">
                    Pembayaran UKT
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    isBerkasLengkap
                      ? "bg-emerald-600 text-putih"
                      : isLunas
                        ? "bg-biru-900 text-putih"
                        : "bg-biru-100 text-biru-600 border border-biru-300"
                  }`}
                >
                  {isBerkasLengkap ? <CheckCircle2 className="w-5 h-5" /> : "3"}
                </div>
                <div>
                  <p className="text-[11px] text-biru-700">Langkah 3</p>
                  <p className="text-xs font-bold text-biru-950">Berkas Maba</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    isTerdaftarMaba
                      ? "bg-amber-400 text-biru-950 font-extrabold"
                      : "bg-biru-100 text-biru-600 border border-biru-300"
                  }`}
                >
                  {isTerdaftarMaba ? <Sparkles className="w-5 h-5" /> : "4"}
                </div>
                <div>
                  <p className="text-[11px] text-biru-700">Langkah 4</p>
                  <p className="text-xs font-bold text-biru-950">
                    Terbit NIM Resmi
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Kartu Mahasiswa Sementara (Jika Sudah Terbit NIM Resmi) */}
          {isTerdaftarMaba && data.nim_resmi && (
            <Card className="bg-gradient-to-br from-biru-900 via-biru-950 to-biru-900 text-putih p-8 rounded-3xl shadow-2xl border-2 border-amber-400/60 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-biru-700/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-biru-800">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <img
                    src={logoPlaceholder}
                    alt="Logo UPT"
                    className="h-14 w-auto object-contain bg-putih/10 p-1 rounded-xl"
                  />
                  <div>
                    <h3 className="font-serif text-lg font-bold uppercase tracking-wider text-amber-300">
                      Universitas Pignatelli Triputra
                    </h3>
                    <p className="text-xs text-biru-200">
                      Kartu Tanda Mahasiswa Sementara (KTMS) PMB 2026
                    </p>
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-semibold">
                    TERDAFTAR RESMI
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                <div className="flex flex-col items-center justify-center p-4 bg-putih/5 border border-biru-800 rounded-2xl">
                  <div className="w-24 h-28 bg-biru-800/60 rounded-xl flex items-center justify-center border border-biru-700 text-biru-300 text-xs">
                    [Pasfoto 3x4]
                  </div>
                  <p className="text-[11px] text-biru-300 mt-2 font-mono">
                    {data.nomor_pendaftaran}
                  </p>
                </div>

                <div className="md:col-span-2 space-y-3 flex flex-col justify-center">
                  <div>
                    <p className="text-xs text-biru-300 font-medium">
                      Nomor Induk Mahasiswa (NIM)
                    </p>
                    <p className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-300 tracking-wider">
                      {data.nim_resmi}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                    <div>
                      <p className="text-biru-300">Nama Lengkap</p>
                      <p className="font-bold text-putih text-sm uppercase">
                        {data.nama_lengkap}
                      </p>
                    </div>
                    <div>
                      <p className="text-biru-300">Program Studi</p>
                      <p className="font-bold text-putih">
                        {data.jenjang} {data.prodi_diterima}
                      </p>
                    </div>
                    <div>
                      <p className="text-biru-300">Fakultas</p>
                      <p className="font-medium text-putih">{data.fakultas}</p>
                    </div>
                    <div>
                      <p className="text-biru-300">Tahun Akademik Masuk</p>
                      <p className="font-medium text-putih">
                        2026/2027 (Ganjil)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-biru-800 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-putih/10 hover:bg-putih/20 text-putih border-biru-700 gap-1.5 text-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Kartu Tanda Mahasiswa</span>
                </Button>
              </div>
            </Card>
          )}

          {/* Section 1: Tagihan Pembayaran UKT */}
          <Card className="p-6 border-biru-200 bg-putih rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-biru-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-biru-800" />
                <h3 className="font-bold text-base text-biru-950 font-serif">
                  Tagihan Biaya Registrasi & UKT Semester 1
                </h3>
              </div>
              <StatusBadge
                status={isLunas ? "berhasil" : "peringatan"}
                label={isLunas ? "LUNAS" : "MENUNGGU PEMBAYARAN"}
              />
            </div>

            {data.tagihan ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-biru-50/70 border border-biru-200 rounded-xl text-xs">
                  <div>
                    <span className="text-biru-700">Nomor Tagihan</span>
                    <p className="font-mono font-bold text-biru-950 mt-0.5">
                      {data.tagihan.nomor_tagihan}
                    </p>
                  </div>
                  <div>
                    <span className="text-biru-700">Nominal UKT</span>
                    <p className="font-mono font-bold text-biru-950 mt-0.5">
                      Rp {data.tagihan.nominal_asli.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div>
                    <span className="text-biru-700">Potongan / Beasiswa</span>
                    <p className="font-mono font-bold text-emerald-700 mt-0.5">
                      Rp {data.tagihan.diskon.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div>
                    <span className="text-biru-700">Total Wajib Bayar</span>
                    <p className="font-mono text-base font-extrabold text-biru-950 mt-0.5">
                      Rp {data.tagihan.nominal_akhir.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {!isLunas && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="text-xs text-amber-950">
                      <p className="font-bold">
                        Nomor Virtual Account Pembayaran:
                      </p>
                      <p className="font-mono text-base font-extrabold text-biru-950 mt-0.5">
                        {data.tagihan.va_number || "880812345678"} (Bank Mandiri
                        / BCA / BNI)
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/portal/pembayaran?invoice=${data.tagihan?.nomor_tagihan}`,
                        )
                      }
                      className="bg-biru-900 hover:bg-biru-950 text-putih gap-1.5"
                    >
                      <span>Buka Gerbang Pembayaran</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-biru-700">
                Tidak ada tagihan daftar ulang aktif.
              </p>
            )}
          </Card>

          {/* Section 2: Unggah Berkas Registrasi Mahasiswa Baru */}
          <Card className="p-6 border-biru-200 bg-putih rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-biru-200">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-biru-800" />
                <h3 className="font-bold text-base text-biru-950 font-serif">
                  Berkas Registrasi Mahasiswa Baru
                </h3>
              </div>
              <span className="text-xs text-biru-800">
                Wajib dilengkapi seluruhnya untuk penerbitan NIM
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REQUIRED_DOCS.map((doc) => {
                const statusDoc = getDocStatus(doc.jenis);
                const isUploaded = Boolean(statusDoc);
                const isValid = statusDoc?.status_verifikasi === "VALID";
                const isPending = statusDoc?.status_verifikasi === "PENDING";
                const isInvalid = statusDoc?.status_verifikasi === "INVALID";

                return (
                  <div
                    key={doc.jenis}
                    className="p-4 border border-biru-200 rounded-2xl bg-putih hover:border-biru-400 transition-colors space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-xs text-biru-950">
                          {doc.title}
                        </h4>
                        {isValid && (
                          <StatusBadge status="berhasil" label="VALID" />
                        )}
                        {isPending && (
                          <StatusBadge
                            status="peringatan"
                            label="MENUNGGU VERIFIKASI"
                          />
                        )}
                        {isInvalid && (
                          <StatusBadge status="gagal" label="REVISI" />
                        )}
                        {!isUploaded && (
                          <StatusBadge status="standar" label="BELUM UNGGAH" />
                        )}
                      </div>
                      <p className="text-[11px] text-biru-700 mt-1 leading-relaxed">
                        {doc.desc}
                      </p>
                    </div>

                    {statusDoc?.catatan && (
                      <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                        Catatan Verifikator: {statusDoc.catatan}
                      </p>
                    )}

                    <div className="pt-2 border-t border-biru-100 flex items-center justify-between">
                      {isUploaded ? (
                        <div className="text-[11px] text-biru-900 font-mono truncate max-w-[180px]">
                          {statusDoc.file_name}
                        </div>
                      ) : (
                        <span className="text-[11px] text-biru-600 italic">
                          Format PDF maks 5MB
                        </span>
                      )}

                      {!isValid && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={uploadingJenis === doc.jenis}
                          onClick={() => handleSimulatedUpload(doc.jenis)}
                          className="gap-1 text-[11px] px-3 py-1"
                        >
                          <Upload className="w-3.5 h-3.5 text-biru-700" />
                          <span>
                            {uploadingJenis === doc.jenis
                              ? "Mengunggah..."
                              : isUploaded
                                ? "Unggah Ulang"
                                : "Unggah Dokumen"}
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
