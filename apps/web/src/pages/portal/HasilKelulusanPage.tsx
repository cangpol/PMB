import React, { useState, useEffect } from "react";
import {
  Printer,
  Download,
  Clock,
  AlertCircle,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  CardSkeleton,
  ErrorState,
  Card,
} from "../../components/common";
import { fetchApi } from "../../services/api";
import logoPlaceholder from "../../assets/logo-placeholder.svg";

interface CekKelulusanResponse {
  pendaftar_id: string;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  jalur_nama: string;
  gelombang_nama: string;
  status_kelulusan: string; // 'LULUS_PILIHAN_1', 'LULUS_PILIHAN_2', 'CADANGAN', 'TIDAK_LULUS', 'BELUM_DIPUTUSKAN'
  prodi_diterima?: string | null;
  jenjang_diterima?: string | null;
  fakultas_diterima?: string | null;
  pilihan_ke?: number | null;
  skor_akhir: number;
  nim_resmi?: string | null;
  nomor_surat_loa?: string | null;
  tanggal_sk?: string | null;
  is_published: boolean;
  tgl_pengumuman?: string | null;
  is_pengumuman_buka: boolean;
  status_daftar_ulang: string;
  pesan: string;
}

export const HasilKelulusanPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<CekKelulusanResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [hasNoForm, setHasNoForm] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadHasil = async () => {
    setIsLoading(true);
    setIsError(false);
    setHasNoForm(false);
    try {
      const res = await fetchApi<CekKelulusanResponse>("/api/kelulusan/cek");
      setData(res);
    } catch (err: unknown) {
      const e = err as { kode?: string; pesan?: string };
      if (
        e.kode === "DATA_TIDAK_DITEMUKAN" ||
        (e.pesan && e.pesan.toLowerCase().includes("formulir"))
      ) {
        setHasNoForm(true);
      } else {
        setErrorMessage(e.pesan || "Gagal memuat pengumuman kelulusan.");
        setIsError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHasil();
  }, []);

  const handleDownloadLoa = () => {
    window.open("/api/kelulusan/loa/pdf", "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  const isLulus =
    data?.status_kelulusan === "LULUS_PILIHAN_1" ||
    data?.status_kelulusan === "LULUS_PILIHAN_2";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-200">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Pengumuman Kelulusan Seleksi PMB
          </h1>
          <p className="text-xs sm:text-sm text-biru-800">
            Hasil Seleksi Penerimaan Mahasiswa Baru Universitas Pignatelli
            Triputra Tahun Akademik 2026/2027
          </p>
        </div>
        {data && data.is_pengumuman_buka && isLulus && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadLoa}
              className="gap-1.5 text-xs text-biru-900 border-biru-300"
            >
              <Download className="w-3.5 h-3.5 text-biru-700" />
              <span>Unduh LoA PDF</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs text-biru-900 border-biru-300"
            >
              <Printer className="w-3.5 h-3.5 text-biru-700" />
              <span>Cetak SK</span>
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <ErrorState
          title="Gagal Memuat Hasil Kelulusan"
          message={errorMessage}
          onRetry={loadHasil}
        />
      )}

      {/* State Belum Ada Formulir Pendaftaran */}
      {!isLoading && hasNoForm && (
        <Card className="p-8 sm:p-12 text-center border-biru-200 bg-putih rounded-3xl shadow-sm space-y-5 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-biru-100 flex items-center justify-center mx-auto text-biru-900">
            <AlertCircle className="w-8 h-8 text-biru-700" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-biru-950 font-serif">
              Belum Ada Formulir Pendaftaran
            </h2>
            <p className="text-sm text-biru-800 mt-2 leading-relaxed">
              Akun Anda belum memiliki berkas formulir pendaftaran PMB yang terdaftar. Silakan lengkapi formulir pendaftaran untuk mengikuti seleksi penerimaan mahasiswa baru.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => navigate("/portal/pendaftaran")}
              className="gap-2 mx-auto"
            >
              <span>Isi Formulir Pendaftaran</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Pengumuman Belum Buka / Belum Diputuskan */}
      {!isLoading && !isError && data && !data.is_pengumuman_buka && (
        <Card className="p-8 sm:p-12 text-center border-biru-200 bg-putih rounded-3xl shadow-sm space-y-4 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-biru-100 flex items-center justify-center mx-auto text-biru-900">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-biru-950 font-serif">
            Pengumuman Belum Dibuka
          </h2>
          <p className="text-sm text-biru-800 max-w-md mx-auto leading-relaxed">
            {data.pesan ||
              "Hasil sidang pleno kelulusan sedang dalam proses verifikasi akhir panitia PMB. Harap periksa kembali sesuai jadwal yang telah ditentukan."}
          </p>
          {data.tgl_pengumuman && (
            <div className="inline-block bg-biru-50 border border-biru-200 px-4 py-2 rounded-xl text-xs font-semibold text-biru-900">
              Jadwal Rilis:{" "}
              {new Date(data.tgl_pengumuman).toLocaleString("id-ID")}
            </div>
          )}
        </Card>
      )}

      {/* Status: CADANGAN */}
      {!isLoading &&
        !isError &&
        data &&
        data.is_pengumuman_buka &&
        data.status_kelulusan === "CADANGAN" && (
          <Card className="p-8 border-biru-200 bg-biru-50/70 rounded-3xl space-y-4 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 text-biru-950">
              <AlertCircle className="w-8 h-8 flex-shrink-0 text-biru-700" />
              <div>
                <h2 className="text-xl font-bold font-serif text-biru-950">
                  Status Anda: CADANGAN (Waitlist)
                </h2>
                <p className="text-xs text-biru-800">
                  Nomor Pendaftaran: {data.nomor_pendaftaran}
                </p>
              </div>
            </div>
            <p className="text-sm text-biru-900 leading-relaxed">
              Nilai seleksi Anda telah memenuhi standar kelulusan, namun kuota
              utama program studi pilihan saat ini telah terpenuhi. Anda
              ditempatkan pada daftar cadangan. Panitia PMB akan menghubungi
              Anda melalui email dan WhatsApp apabila terdapat kuota yang
              tersedia dari calon mahasiswa yang tidak melakukan daftar ulang.
            </p>
            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/portal/dashboard")}
              >
                Kembali ke Dashboard
              </Button>
            </div>
          </Card>
        )}

      {/* Status: TIDAK LULUS */}
      {!isLoading &&
        !isError &&
        data &&
        data.is_pengumuman_buka &&
        data.status_kelulusan === "TIDAK_LULUS" && (
          <Card className="p-8 border-biru-200 bg-putih rounded-3xl space-y-4 max-w-3xl mx-auto text-center">
            <div className="w-14 h-14 rounded-full bg-biru-100 flex items-center justify-center mx-auto text-biru-800">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold font-serif text-biru-950">
              Terima Kasih Atas Partisipasi Anda
            </h2>
            <p className="text-sm text-biru-800 max-w-lg mx-auto leading-relaxed">
              Mohon maaf, berdasarkan hasil evaluasi sidang pleno, saat ini
              nilai seleksi Anda belum memenuhi batas kuota penerimaan pada
              jalur ini. Jangan berkecil hati, Anda masih dapat mendaftar pada
              gelombang berikutnya atau berkonsultasi dengan tim konselor PMB
              kami.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/portal/dashboard")}
              >
                Ke Dashboard
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  window.open("https://wa.me/6281234567890", "_blank")
                }
              >
                Konsultasi Jalur Lain
              </Button>
            </div>
          </Card>
        )}

      {/* Status: LULUS (Pilihan 1 atau Pilihan 2) */}
      {!isLoading && !isError && data && data.is_pengumuman_buka && isLulus && (
        <div className="space-y-6">
          {/* Banner Selamat */}
          <Card className="bg-gradient-to-r from-biru-900 to-biru-950 text-putih p-6 sm:p-8 rounded-3xl shadow-xl border border-biru-800">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-putih/20 text-putih px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {data.status_kelulusan === "LULUS_PILIHAN_1"
                      ? "Lulus Pilihan 1"
                      : "Lulus Pilihan 2"}
                  </span>
                  <span className="text-xs text-biru-200">
                    Skor Seleksi: {data.skor_akhir.toFixed(2)}
                  </span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-putih">
                  Selamat, {data.nama_lengkap}!
                </h2>
                <p className="text-xs sm:text-sm text-biru-200 leading-relaxed max-w-2xl">
                  Anda resmi dinyatakan diterima sebagai calon mahasiswa baru{" "}
                  <strong className="text-putih font-semibold">
                    {data.jenjang_diterima} {data.prodi_diterima}
                  </strong>{" "}
                  ({data.fakultas_diterima}) Universitas Pignatelli Triputra.
                </p>
              </div>

              {/* Call to action: Daftar Ulang */}
              <div className="flex-shrink-0 w-full md:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate("/portal/daftar-ulang")}
                  className="w-full md:w-auto bg-putih hover:bg-biru-50 text-biru-950 font-bold gap-2 px-6 py-3 shadow-lg"
                >
                  <span>Lanjut ke Daftar Ulang</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Dokumen Fisik Letter of Acceptance (LoA) */}
          <div className="bg-putih border-2 border-biru-300 rounded-3xl p-8 sm:p-12 shadow-xl space-y-8 print:border-none print:shadow-none print:p-0">
            {/* KOP Surat Resmi Universitas */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b-2 border-biru-950 text-center sm:text-left">
              <div className="flex items-center gap-4">
                <img
                  src={logoPlaceholder}
                  alt="Logo Universitas Pignatelli Triputra"
                  className="h-16 w-auto object-contain"
                />
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-biru-950 tracking-wide uppercase">
                    Universitas Pignatelli Triputra
                  </h3>
                  <p className="text-xs text-biru-800">
                    Panitia Penerimaan Mahasiswa Baru (PMB) TA 2026/2027
                  </p>
                  <p className="text-[11px] text-biru-700 font-sans">
                    Jl. Bawean No.9, Danukusuman, Kec. Serengan, Surakarta, Jawa
                    Tengah 57156
                  </p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-biru-950 font-mono">
                  {data.nomor_surat_loa || "SK/PMB-UPT/2026/0001"}
                </p>
                <p className="text-[11px] text-biru-700">
                  Surakarta, {data.tanggal_sk || "2026"}
                </p>
              </div>
            </div>

            {/* Judul Surat Resmi */}
            <div className="text-center space-y-1">
              <h4 className="font-serif text-base sm:text-lg font-bold text-biru-950 uppercase tracking-wider underline">
                Surat Keputusan Penerimaan Mahasiswa Baru
              </h4>
              <p className="text-xs font-mono text-biru-800">
                Nomor: {data.nomor_surat_loa || "SK/PMB-UPT/2026/0001"}
              </p>
            </div>

            {/* Narasi Keputusan */}
            <div className="space-y-4 text-xs sm:text-sm text-biru-950 leading-relaxed font-sans">
              <p>
                Rektor Universitas Pignatelli Triputra, berdasarkan hasil
                evaluasi dan rapat sidang pleno seleksi penerimaan mahasiswa
                baru tahun akademik 2026/2027, dengan ini menerbitkan keputusan
                penerimaan resmi kepada:
              </p>

              {/* Tabel Biodata Penerima */}
              <div className="bg-biru-50/60 border border-biru-200 rounded-2xl p-4 sm:p-6 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 border-b border-biru-100">
                  <span className="text-biru-700 font-medium">
                    Nomor Pendaftaran
                  </span>
                  <span className="sm:col-span-2 font-mono font-bold text-biru-950">
                    {data.nomor_pendaftaran}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 border-b border-biru-100">
                  <span className="text-biru-700 font-medium">
                    Nama Lengkap
                  </span>
                  <span className="sm:col-span-2 font-bold text-biru-950 uppercase">
                    {data.nama_lengkap}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 border-b border-biru-100">
                  <span className="text-biru-700 font-medium">
                    Jalur Pendaftaran
                  </span>
                  <span className="sm:col-span-2 text-biru-950">
                    {data.jalur_nama}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 border-b border-biru-100">
                  <span className="text-biru-700 font-medium">
                    Program Studi Diterima
                  </span>
                  <span className="sm:col-span-2 font-bold text-biru-950 text-sm">
                    {data.jenjang_diterima} {data.prodi_diterima}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 border-b border-biru-100">
                  <span className="text-biru-700 font-medium">Fakultas</span>
                  <span className="sm:col-span-2 text-biru-950">
                    {data.fakultas_diterima}
                  </span>
                </div>
                {data.nim_resmi && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1">
                    <span className="text-biru-900 font-bold">
                      NIM Resmi Terbit
                    </span>
                    <span className="sm:col-span-2 font-mono font-extrabold text-biru-950 text-sm">
                      {data.nim_resmi}
                    </span>
                  </div>
                )}
              </div>

              <p>
                Kepada calon mahasiswa yang bersangkutan diwajibkan untuk
                menyelesaikan tahapan registrasi ulang administrasi dan
                pembayaran Uang Kuliah Tunggal (UKT) sebelum batas waktu yang
                ditentukan.
              </p>
            </div>

            {/* Tanda Tangan & QR Verifikasi Otentisitas */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-biru-200">
              <div className="flex items-center gap-4 text-left">
                <div className="w-20 h-20 bg-biru-100 border border-biru-300 rounded-xl flex items-center justify-center p-2 text-center text-[10px] text-biru-800 font-mono">
                  [QR-CODE VERIFIKASI]
                </div>
                <div className="text-[11px] text-biru-800 space-y-0.5">
                  <p className="font-semibold text-biru-950">
                    Dokumen Digital Terverifikasi
                  </p>
                  <p>Keabsahan dokumen ini dapat diverifikasi di:</p>
                  <p className="font-mono text-biru-700 text-[10px]">
                    https://pmb.pignatelli.ac.id/verifikasi-loa/
                    {data.pendaftar_id}
                  </p>
                </div>
              </div>

              <div className="text-center sm:text-right space-y-1">
                <p className="text-xs text-biru-800">
                  Surakarta, {data.tanggal_sk || "2026"}
                </p>
                <p className="text-xs font-bold text-biru-950">
                  Rektor Universitas Pignatelli Triputra
                </p>
                <div className="h-14 flex items-center justify-center sm:justify-end">
                  <span className="px-3 py-1 rounded border border-biru-400 bg-biru-50 text-[11px] font-serif italic text-biru-800">
                    [Tanda Tangan Digital Resmi]
                  </span>
                </div>
                <p className="text-xs font-bold text-biru-950 underline">
                  Rektorat PMB Universitas Pignatelli Triputra
                </p>
                <p className="text-[11px] text-biru-700">
                  NIP. 197805122005011002
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
