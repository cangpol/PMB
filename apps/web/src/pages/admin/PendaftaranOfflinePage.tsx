import React, { useState, useEffect } from "react";
import {
  UserPlus,
  CheckCircle2,
  Download,
  Save,
  RotateCcw,
  Printer,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import {
  Button,
  Card,
  CardSkeleton,
  ErrorState,
} from "../../components/common";
import { useToast } from "@/components/ui/useToast";
import { boleh_pilihan_2, PESAN_HANYA_PILIHAN_1 } from "../../lib/aturanProdi";

interface MasterOption {
  id: string;
  nama: string;
  kode?: string;
  jenjang?: string;
  status?: string;
}

interface OfflineSuccessResult {
  pendaftar_id: string;
  nomor_pendaftaran: string;
  user_id: string;
  email: string;
  temporary_password?: string | null;
  status_pendaftaran: string;
  is_lunas_loket: boolean;
  nomor_tagihan?: string | null;
  cetak_bukti_url: string;
  cetak_kartu_url: string;
}

export const PendaftaranOfflinePage: React.FC = () => {
  const { toast } = useToast();

  const [jalurList, setJalurList] = useState<MasterOption[]>([]);
  const [gelombangList, setGelombangList] = useState<MasterOption[]>([]);
  const [prodiList, setProdiList] = useState<MasterOption[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  // Form State
  const [namaLengkap, setNamaLengkap] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [noHp, setNoHp] = useState<string>("");
  const [nik, setNik] = useState<string>("");
  const [tempatLahir, setTempatLahir] = useState<string>("");
  const [tglLahir, setTglLahir] = useState<string>("");
  const [jenisKelamin, setJenisKelamin] = useState<string>("L");
  const [agama, setAgama] = useState<string>("Katolik");
  const [alamatLengkap, setAlamatLengkap] = useState<string>("");

  const [namaOrtu, setNamaOrtu] = useState<string>("");
  const [noHpOrtu, setNoHpOrtu] = useState<string>("");
  const [asalSekolah, setAsalSekolah] = useState<string>("");
  const [jurusanSekolah, setJurusanSekolah] = useState<string>("");
  const [nilaiRapor, setNilaiRapor] = useState<string>("80.0");

  const [jalurId, setJalurId] = useState<string>("");
  const [gelombangId, setGelombangId] = useState<string>("");
  const [prodi1, setProdi1] = useState<string>("");
  const [prodi2, setProdi2] = useState<string>("");

  const [lunasLoket, setLunasLoket] = useState<boolean>(true);
  const [catatanLoket, setCatatanLoket] = useState<string>("");

  // Hasil Sukses
  const [successResult, setSuccessResult] =
    useState<OfflineSuccessResult | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const loadMaster = async () => {
    try {
      setIsError(false);

      const [jalurRes, gelRes, prodiRes] = await Promise.all([
        fetch("/api/master/jalur"),
        fetch("/api/master/gelombang"),
        fetch("/api/master/prodi"),
      ]);

      if (jalurRes.ok) {
        const j = await jalurRes.json();
        setJalurList(j);
        if (j.length > 0) setJalurId(j[0].id);
      }

      if (gelRes.ok) {
        const g = await gelRes.json();
        setGelombangList(g);
        const active = g.find((item: any) => item.status === "BUKA");
        if (active) setGelombangId(active.id);
        else if (g.length > 0) setGelombangId(g[0].id);
      }

      if (prodiRes.ok) {
        const p = await prodiRes.json();
        setProdiList(p);
        if (p.length > 0) setProdi1(p[0].id);
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMaster();
  }, []);

  const resetForm = () => {
    setNamaLengkap("");
    setEmail("");
    setNoHp("");
    setNik("");
    setTempatLahir("");
    setTglLahir("");
    setJenisKelamin("L");
    setAgama("Katolik");
    setAlamatLengkap("");
    setNamaOrtu("");
    setNoHpOrtu("");
    setAsalSekolah("");
    setJurusanSekolah("");
    setNilaiRapor("80.0");
    setProdi2("");
    setLunasLoket(true);
    setCatatanLoket("");
    setSuccessResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !namaLengkap ||
      !email ||
      !noHp ||
      !nik ||
      !tempatLahir ||
      !tglLahir ||
      !alamatLengkap
    ) {
      toast({
        title: "Data Belum Lengkap",
        description: "Harap isi seluruh kolom identitas diri calon mahasiswa.",
        variant: "peringatan",
      });
      return;
    }

    if (nik.length !== 16) {
      toast({
        title: "Format NIK Tidak Valid",
        description:
          "Nomor Induk Kependudukan (NIK) harus berjumlah tepat 16 digit angka.",
        variant: "peringatan",
      });
      return;
    }

    if (!jalurId || !gelombangId || !prodi1) {
      toast({
        title: "Pilihan Akademik Belum Lengkap",
        description:
          "Harap tentukan Jalur, Gelombang, dan Pilihan Program Studi Utama.",
        variant: "peringatan",
      });
      return;
    }

    if (prodi2 && prodi2 === prodi1) {
      toast({
        title: "Pilihan Prodi Tidak Valid",
        description: "Pilihan Program Studi 1 dan Pilihan 2 tidak boleh sama.",
        variant: "peringatan",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        nama_lengkap: namaLengkap,
        email,
        no_hp: noHp,
        nik,
        tempat_lahir: tempatLahir,
        tgl_lahir: tglLahir,
        jenis_kelamin: jenisKelamin,
        agama,
        alamat_lengkap: alamatLengkap,
        nama_ortu: namaOrtu || "Orang Tua Calon",
        no_hp_ortu: noHpOrtu || noHp,
        asal_sekolah: asalSekolah || "SMA/SMK",
        jurusan_sekolah: jurusanSekolah || "Umum",
        nilai_rapor_avg: parseFloat(nilaiRapor) || 0.0,
        jalur_id: jalurId,
        gelombang_id: gelombangId,
        prodi_pilihan_1: prodi1,
        prodi_pilihan_2: prodi2 || null,
        lunas_loket: lunasLoket,
        catatan_loket: catatanLoket || null,
      };

      const res = await fetch("/api/pendaftaran/admin/offline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.pesan ||
            errJson.detail?.join(", ") ||
            "Gagal memproses pendaftaran offline",
        );
      }

      const data: OfflineSuccessResult = await res.json();
      setSuccessResult(data);
      toast({
        title: "Pendaftaran Berhasil",
        description: `Calon berhasil didaftarkan dengan Nomor: ${data.nomor_pendaftaran}`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Pendaftaran Gagal",
        description:
          err.message || "Terjadi kesalahan saat memproses pendaftaran loket.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Tersalin",
      description: `${label} berhasil disalin ke clipboard.`,
      variant: "success",
    });
  };

  if (isLoading) {
    return <CardSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Gagal Memuat Formulir Loket Offline"
        message="Tidak dapat memuat data master pendaftaran. Silakan periksa koneksi Anda."
        onRetry={loadMaster}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-100">
        <div>
          <div className="flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-biru-800" />
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
              Pendaftaran Calon Mahasiswa Offline (Loket PMB)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-biru-800/80 mt-1">
            Input data calon mahasiswa baru yang mendaftar secara langsung di
            loket admisi kampus.
          </p>
        </div>
      </div>

      {/* Modal / Banner Hasil Sukses */}
      {successResult && (
        <Card className="p-6 bg-biru-50/80 border-2 border-biru-600 rounded-3xl space-y-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-biru-700 text-putih flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold text-biru-950">
                Pendaftaran Calon Offline Berhasil Diproses!
              </h2>
              <p className="text-xs text-biru-800 leading-relaxed">
                Akun calon mahasiswa telah aktif. Berikan kredensial login
                sementara ini kepada calon mahasiswa.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
            <div className="p-3.5 bg-putih rounded-2xl border border-biru-200">
              <span className="text-biru-800 block text-[11px] uppercase tracking-wider font-semibold">
                Nomor Pendaftaran
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-base font-bold text-biru-950">
                  {successResult.nomor_pendaftaran}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      successResult.nomor_pendaftaran,
                      "Nomor Pendaftaran",
                    )
                  }
                  className="text-biru-700 hover:text-biru-900 cursor-pointer"
                  title="Salin Nomor"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-putih rounded-2xl border border-biru-200">
              <span className="text-biru-800 block text-[11px] uppercase tracking-wider font-semibold">
                Email Akun Calon
              </span>
              <span className="font-bold text-biru-950 text-xs mt-1 block truncate">
                {successResult.email}
              </span>
            </div>

            <div className="p-3.5 bg-putih rounded-2xl border border-biru-200">
              <span className="text-biru-800 block text-[11px] uppercase tracking-wider font-semibold">
                Password Sementara
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-xs font-bold text-biru-950">
                  {showPassword
                    ? successResult.temporary_password || "(Akun Lama)"
                    : "••••••••"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-biru-700 hover:text-biru-900 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {successResult.temporary_password && (
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          successResult.temporary_password!,
                          "Password",
                        )
                      }
                      className="text-biru-700 hover:text-biru-900 cursor-pointer"
                      title="Salin Password"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Cetak PDF Langsung */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-biru-200">
            <a
              href={successResult.cetak_bukti_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
            >
              <Button variant="primary" size="sm" className="gap-2">
                <Printer className="w-4 h-4" />
                <span>Cetak Bukti Pendaftaran (PDF)</span>
              </Button>
            </a>

            <a
              href={successResult.cetak_kartu_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                <span>Cetak Kartu Peserta Ujian (PDF)</span>
              </Button>
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              className="gap-2 ml-auto text-biru-800"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Input Pendaftar Baru</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Formulir Input Offline */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SEKSI 1: IDENTITAS DIRI */}
        <Card className="p-6 sm:p-8 bg-putih border border-biru-200 rounded-3xl space-y-6 shadow-xs">
          <div className="border-b border-biru-100 pb-3">
            <h2 className="font-serif text-lg font-bold text-biru-950">
              1. Identitas Pribadi Calon Mahasiswa
            </h2>
            <p className="text-xs text-biru-800/80 mt-0.5">
              Data resmi sesuai dokumen kependudukan Kartu Tanda Penduduk (KTP)
              atau Kartu Keluarga (KK).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Nama Lengkap Sesuai KTP <span className="text-biru-700">*</span>
              </label>
              <input
                type="text"
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                placeholder="Contoh: Maria Fransiska Kusuma"
                required
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Nomor Induk Kependudukan (NIK 16 Digit){" "}
                <span className="text-biru-700">*</span>
              </label>
              <input
                type="text"
                maxLength={16}
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                placeholder="3372010101070001"
                required
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-mono font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Alamat Email Aktif <span className="text-biru-700">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="calon@example.com"
                required
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Nomor Telepon / WhatsApp{" "}
                <span className="text-biru-700">*</span>
              </label>
              <input
                type="text"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="081234567890"
                required
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Tempat Lahir <span className="text-biru-700">*</span>
              </label>
              <input
                type="text"
                value={tempatLahir}
                onChange={(e) => setTempatLahir(e.target.value)}
                placeholder="Surakarta"
                required
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Tanggal Lahir <span className="text-biru-700">*</span>
              </label>
              <input
                type="date"
                value={tglLahir}
                onChange={(e) => setTglLahir(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Jenis Kelamin <span className="text-biru-700">*</span>
              </label>
              <select
                value={jenisKelamin}
                onChange={(e) => setJenisKelamin(e.target.value)}
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Agama <span className="text-biru-700">*</span>
              </label>
              <select
                value={agama}
                onChange={(e) => setAgama(e.target.value)}
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              >
                <option value="Katolik">Katolik</option>
                <option value="Kristen Protestan">Kristen Protestan</option>
                <option value="Islam">Islam</option>
                <option value="Hindu">Hindu</option>
                <option value="Buddha">Buddha</option>
                <option value="Konghucu">Konghucu</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Alamat Lengkap KTP <span className="text-biru-700">*</span>
              </label>
              <textarea
                value={alamatLengkap}
                onChange={(e) => setAlamatLengkap(e.target.value)}
                placeholder="Jl. Mayor Sunaryo No. 37, RT 01/RW 02, Kelurahan..."
                rows={2}
                required
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              />
            </div>
          </div>
        </Card>

        {/* SEKSI 2: PENDIDIKAN & ORANG TUA */}
        <Card className="p-6 sm:p-8 bg-putih border border-biru-200 rounded-3xl space-y-6 shadow-xs">
          <div className="border-b border-biru-100 pb-3">
            <h2 className="font-serif text-lg font-bold text-biru-950">
              2. Asal Sekolah & Kontak Orang Tua
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Asal Sekolah SMA / SMK
              </label>
              <input
                type="text"
                value={asalSekolah}
                onChange={(e) => setAsalSekolah(e.target.value)}
                placeholder="Contoh: SMA Regina Pacis Surakarta"
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Jurusan Sekolah
              </label>
              <input
                type="text"
                value={jurusanSekolah}
                onChange={(e) => setJurusanSekolah(e.target.value)}
                placeholder="Contoh: MIPA / IPS / Rekayasa Perangkat Lunak"
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Nama Orang Tua / Wali
              </label>
              <input
                type="text"
                value={namaOrtu}
                onChange={(e) => setNamaOrtu(e.target.value)}
                placeholder="Nama Ayah / Ibu"
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Nomor Telepon Orang Tua / Wali
              </label>
              <input
                type="text"
                value={noHpOrtu}
                onChange={(e) => setNoHpOrtu(e.target.value)}
                placeholder="081987654321"
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Nilai Rapor Rata-rata (Skala 0 - 100)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={nilaiRapor}
                onChange={(e) => setNilaiRapor(e.target.value)}
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              />
            </div>
          </div>
        </Card>

        {/* SEKSI 3: JALUR & PROGRAM STUDI */}
        <Card className="p-6 sm:p-8 bg-putih border border-biru-200 rounded-3xl space-y-6 shadow-xs">
          <div className="border-b border-biru-100 pb-3">
            <h2 className="font-serif text-lg font-bold text-biru-950">
              3. Pilihan Jalur & Program Studi
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Jalur Seleksi PMB <span className="text-biru-700">*</span>
              </label>
              <select
                value={jalurId}
                onChange={(e) => setJalurId(e.target.value)}
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              >
                {jalurList.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Gelombang Pendaftaran <span className="text-biru-700">*</span>
              </label>
              <select
                value={gelombangId}
                onChange={(e) => setGelombangId(e.target.value)}
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              >
                {gelombangList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama} {g.status === "BUKA" ? "(Buka)" : "(Tutup)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Program Studi Pilihan 1 (Prioritas){" "}
                <span className="text-biru-700">*</span>
              </label>
              <select
                value={prodi1}
                onChange={(e) => setProdi1(e.target.value)}
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              >
                {prodiList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.jenjang} {p.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Program Studi Pilihan 2 (Cadangan)
              </label>
              <select
                value={prodi2}
                onChange={(e) => setProdi2(e.target.value)}
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              >
                <option value="">-- Tidak Memilih Pilihan 2 --</option>
                {prodiList
                  .filter((p) => p.id !== prodi1 && boleh_pilihan_2(p.kode))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.jenjang} {p.nama}
                    </option>
                  ))}
              </select>
              <p className="text-[11px] text-biru-700">
                {PESAN_HANYA_PILIHAN_1}
              </p>
            </div>
          </div>

          {gelombangList.length === 0 && (
            <div className="p-4 rounded-2xl bg-biru-50 border border-biru-200 text-xs text-biru-900 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-biru-700 shrink-0" />
              <span>
                Belum ada gelombang PMB yang terdaftar. Harap tambahkan
                gelombang pendaftaran terlebih dahulu di menu Konfigurasi PMB.
              </span>
            </div>
          )}

          {prodiList.length === 0 && (
            <div className="p-4 rounded-2xl bg-biru-50 border border-biru-200 text-xs text-biru-900 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-biru-700 shrink-0" />
              <span>
                Belum ada program studi yang terdaftar. Harap tambahkan program
                studi terlebih dahulu di menu Konfigurasi PMB.
              </span>
            </div>
          )}
        </Card>

        {/* SEKSI 4: ADMINISTRASI LOKET & PEMBAYARAN */}
        <Card className="p-6 sm:p-8 bg-putih border border-biru-200 rounded-3xl space-y-6 shadow-xs">
          <div className="border-b border-biru-100 pb-3">
            <h2 className="font-serif text-lg font-bold text-biru-950">
              4. Administrasi Loket & Pembayaran
            </h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 rounded-2xl bg-biru-50/60 border border-biru-200 cursor-pointer">
              <input
                type="checkbox"
                checked={lunasLoket}
                onChange={(e) => setLunasLoket(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-biru-800 focus:ring-biru-600 border-biru-300"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-biru-950 block">
                  Tandai Biaya Formulir Telah Lunas di Loket PMB (TUNAI_LOKET)
                </span>
                <span className="text-[11px] text-biru-800/80 block">
                  Bila dicentang, sistem otomatis menerbitkan invoice berstatus
                  LUNAS sehingga calon dapat langsung mencetak Kartu Peserta
                  Ujian tanpa pembayaran online.
                </span>
              </div>
            </label>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-biru-950 uppercase tracking-wider block">
                Catatan Petugas Loket (Opsional)
              </label>
              <input
                type="text"
                value={catatanLoket}
                onChange={(e) => setCatatanLoket(e.target.value)}
                placeholder="Contoh: Dokumen fisik fotokopi KTP dan Rapor telah diterima di meja loket"
                className="w-full px-4 py-2.5 bg-biru-50/50 border border-biru-200 rounded-2xl text-xs font-medium text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-biru-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={resetForm}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={
                isSubmitting ||
                gelombangList.length === 0 ||
                prodiList.length === 0 ||
                !prodi1 ||
                !gelombangId
              }
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting ? "Memproses..." : "Simpan Pendaftaran Offline"}
              </span>
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};
