import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  HelpCircle,
  LogIn,
  RotateCcw,
} from "lucide-react";
import { fetchApi } from "../../services/api";
import { SeoHead } from "../../components/common/SeoHead";
import { Button } from "../../components/ui/Button";

export interface CekKelulusanPublikResponse {
  nomor_pendaftaran: string;
  nama_lengkap: string;
  jalur_nama: string;
  gelombang_nama: string;
  status_kelulusan: string;
  prodi_diterima: string | null;
  jenjang_diterima: string | null;
  fakultas_diterima: string | null;
  is_pengumuman_buka: boolean;
  tgl_pengumuman: string | null;
  pesan: string;
}

export const CekKelulusanPublikPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialNomor = searchParams.get("nomor") || "";

  const [nomorInput, setNomorInput] = useState<string>(initialNomor);
  const [data, setData] = useState<CekKelulusanPublikResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorNotFound, setErrorNotFound] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const handleSearch = async (targetNomor: string) => {
    const clean = targetNomor.trim();
    if (!clean) return;

    setIsLoading(true);
    setErrorNotFound(null);
    setHasSearched(true);
    setSearchParams({ nomor: clean }, { replace: true });

    try {
      const res = await fetchApi<CekKelulusanPublikResponse>(
        `/api/kelulusan/publik?nomor_pendaftaran=${encodeURIComponent(clean)}`,
      );
      setData(res);
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setData(null);
      setErrorNotFound(
        e.pesan ||
          `Nomor pendaftaran "${clean}" tidak ditemukan dalam sistem seleksi resmi PMB UPITRA. Harap periksa kembali nomor Anda.`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(nomorInput);
  };

  const handleReset = () => {
    setNomorInput("");
    setData(null);
    setErrorNotFound(null);
    setHasSearched(false);
    setSearchParams({}, { replace: true });
  };

  const isLulus =
    data?.status_kelulusan === "LULUS_PILIHAN_1" ||
    data?.status_kelulusan === "LULUS_PILIHAN_2";
  const isCadangan = data?.status_kelulusan === "CADANGAN";

  return (
    <div className="bg-putih flex flex-col min-h-screen">
      <SeoHead
        title="Pengumuman Kelulusan Seleksi PMB - Universitas Pignatelli Triputra"
        description="Pengecekan hasil resmi seleksi penerimaan mahasiswa baru (PMB) Universitas Pignatelli Triputra secara mandiri dan transparan."
      />

      {/* HERO & SEARCH SECTION */}
      <section className="bg-gradient-to-b from-biru-950 via-biru-900 to-biru-800 text-putih pt-12 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Dekorasi Aksen Halus */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-biru-600/20 blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-biru-800/80 border border-biru-600/50 text-biru-200 text-xs font-semibold backdrop-blur-sm">
            <GraduationCap className="w-4 h-4 text-biru-400" />
            <span>Pengumuman Hasil Seleksi PMB TA 2026/2027</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-putih">
            Cek Kelulusan Calon Mahasiswa
          </h1>
          <p className="text-biru-100 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Masukkan Nomor Pendaftaran resmi Anda untuk memverifikasi keputusan
            sidang pleno kelulusan Universitas Pignatelli Triputra.
          </p>

          {/* Form Pencarian */}
          <form
            onSubmit={onSubmit}
            className="pt-6 max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-2.5"
          >
            <div className="relative w-full">
              <Search className="w-5 h-5 text-biru-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={nomorInput}
                onChange={(e) => setNomorInput(e.target.value.toUpperCase())}
                placeholder="Contoh: 270031-3132"
                aria-label="Nomor Pendaftaran PMB"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-putih text-biru-950 placeholder:text-biru-400 border border-biru-200 focus:outline-none focus:ring-2 focus:ring-biru-400 text-sm font-semibold tracking-wide uppercase transition-all shadow-soft-sm"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || !nomorInput.trim()}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-biru-500 hover:bg-biru-400 text-putih font-bold text-sm shrink-0 shadow-soft-md transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Memeriksa...</span>
              ) : (
                <>
                  <span>Cek Status</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Shortcut Chip Demo */}
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-biru-200 flex-wrap">
            <span>Uji coba cepat:</span>
            <button
              type="button"
              onClick={() => {
                setNomorInput("PMB-2026-0001");
                handleSearch("PMB-2026-0001");
              }}
              className="underline font-mono text-biru-200 hover:text-putih transition-colors"
            >
              PMB-2026-0001
            </button>
          </div>
        </div>
      </section>

      {/* HASIL PENCARIAN & KONTEN */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="text-center py-16 space-y-4">
            <div className="w-10 h-10 rounded-full border-3 border-biru-200 border-t-biru-700 animate-spin mx-auto" />
            <p className="text-sm text-biru-800 font-medium">
              Memverifikasi data keputusan sidang kelulusan dari basis data
              resmi...
            </p>
          </div>
        )}

        {/* Not Found State */}
        {!isLoading && errorNotFound && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-biru-950">
                Nomor Pendaftaran Tidak Ditemukan
              </h2>
              <p className="text-xs sm:text-sm text-biru-800 max-w-md mx-auto leading-relaxed">
                {errorNotFound}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1.5 text-xs text-biru-800 border-biru-300"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cari Nomor Lain</span>
              </Button>
              <Link to="/portal/dashboard">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 text-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk ke Portal</span>
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Hasil Pengumuman Ditemukan */}
        {!isLoading && data && (
          <article className="rounded-3xl border border-biru-200 bg-putih shadow-soft-lg overflow-hidden animate-in fade-in-50 duration-300">
            {/* Header Pengumuman Berwarna */}
            <div
              className={`p-6 sm:p-8 text-putih ${
                isLulus
                  ? "bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700"
                  : isCadangan
                    ? "bg-gradient-to-r from-amber-700 via-amber-600 to-yellow-600"
                    : "bg-gradient-to-r from-biru-900 to-biru-800"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-putih/20 backdrop-blur-sm text-xs font-bold uppercase tracking-wider">
                    {isLulus && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    )}
                    {isCadangan && (
                      <Clock className="w-3.5 h-3.5 text-amber-200" />
                    )}
                    <span>
                      {isLulus
                        ? "SELAMAT! ANDA DINYATAKAN LULUS"
                        : isCadangan
                          ? "STATUS: KANDIDAT CADANGAN"
                          : "STATUS SELEKSI RESMI"}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold">
                    {data.nama_lengkap}
                  </h2>
                  <p className="text-xs sm:text-sm text-putih/80 font-mono tracking-wider">
                    Nomor Pendaftaran: {data.nomor_pendaftaran}
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="block text-[11px] uppercase tracking-wider text-putih/70">
                    Jalur Penerimaan
                  </span>
                  <span className="text-sm font-bold block">
                    {data.jalur_nama}
                  </span>
                  <span className="text-xs text-putih/80 block">
                    {data.gelombang_nama}
                  </span>
                </div>
              </div>
            </div>

            {/* Badan Hasil Pengumuman */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Program Studi yang Diterima (Bila Lulus) */}
              {isLulus && data.prodi_diterima && (
                <div className="rounded-2xl bg-biru-50/70 border border-biru-100 p-5 sm:p-6 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-biru-700 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-biru-600" />
                    Program Studi Diterima
                  </span>
                  <div>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
                      {data.jenjang_diterima ? `${data.jenjang_diterima} ` : ""}
                      {data.prodi_diterima}
                    </h3>
                    {data.fakultas_diterima && (
                      <p className="text-xs sm:text-sm text-biru-800 font-medium mt-0.5">
                        {data.fakultas_diterima}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Pesan Resmi Panitia */}
              <div className="text-sm text-biru-900 leading-relaxed p-4 rounded-xl bg-biru-50/40 border border-biru-100/60 font-sans">
                {data.pesan}
              </div>

              {/* Rincian Verifikasi */}
              <div className="pt-2 border-t border-biru-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-2 text-biru-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Keputusan Rektorat & Panitia PMB bersifat final</span>
                </div>
                <div className="flex items-center gap-2 text-biru-800">
                  <Clock className="w-4 h-4 text-biru-600 shrink-0" />
                  <span>
                    Diumumkan:{" "}
                    {data.tgl_pengumuman
                      ? new Date(data.tgl_pengumuman).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )
                      : "Resmi"}
                  </span>
                </div>
              </div>

              {/* Tindak Lanjut & CTA */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="w-full sm:w-auto text-xs text-biru-800 border-biru-300"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  <span>Periksa Nomor Lain</span>
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link to="/portal/hasil" className="w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full sm:w-auto gap-1.5 text-xs bg-biru-700 hover:bg-biru-800"
                    >
                      <span>Masuk ke Portal Calon (Unduh LoA)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </article>
        )}

        {/* PANDUAN & BANTUAN PMB */}
        {!data && !hasSearched && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
            <div className="p-6 rounded-2xl bg-biru-50/60 border border-biru-100 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-biru-100 text-biru-800 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-biru-700" />
              </div>
              <h3 className="font-serif text-lg font-bold text-biru-950">
                Perlindungan Privasi Calon
              </h3>
              <p className="text-xs text-biru-800 leading-relaxed font-sans">
                Nama peserta pada lembar pengecekan publik disensor sesuai
                regulasi perlindungan data pribadi. Surat keputusan (SK) dan
                Letter of Acceptance (LoA) lengkap dapat diunduh di Portal
                Calon.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-biru-50/60 border border-biru-100 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-biru-100 text-biru-800 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-biru-700" />
              </div>
              <h3 className="font-serif text-lg font-bold text-biru-950">
                Lupa Nomor Pendaftaran?
              </h3>
              <p className="text-xs text-biru-800 leading-relaxed font-sans">
                Nomor Pendaftaran tercantum pada bukti formulir pendaftaran yang
                dikirim ke email akun Anda atau di kartu peserta ujian. Anda
                juga dapat masuk langsung ke portal calon mahasiswa.
              </p>
              <div className="pt-1">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs font-bold text-biru-700 hover:text-biru-950"
                >
                  <span>Masuk ke Akun Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
