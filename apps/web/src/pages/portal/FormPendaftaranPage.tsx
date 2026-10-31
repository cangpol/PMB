import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  GraduationCap,
  Building,
  CheckCircle2,
  Save,
  ArrowRight,
} from "lucide-react";
import {
  Button,
  Card,
  StatusBadge,
  CardSkeleton,
  ErrorState,
} from "../../components/common";

const baseSchema = z.object({
  // Step 1: Biodata
  nik: z.string().length(16, "NIK harus tepat 16 digit angka"),
  tempat_lahir: z.string().min(2, "Tempat lahir tidak boleh kosong"),
  tgl_lahir: z.string().min(1, "Tanggal lahir wajib diisi"),
  jenis_kelamin: z.enum(["L", "P"]),
  agama: z.string().min(2, "Pilih agama"),
  alamat_lengkap: z.string().min(5, "Alamat lengkap minimal 5 karakter"),
  nama_ortu: z.string().min(2, "Nama orang tua wajib diisi"),
  no_hp_ortu: z.string().min(10, "Nomor HP orang tua minimal 10 digit"),

  // Step 2: Akademik
  asal_sekolah: z.string().min(3, "Nama asal sekolah minimal 3 karakter"),
  jurusan_sekolah: z.string().min(2, "Jurusan sekolah minimal 2 karakter"),
  nilai_rapor_avg: z.number().min(0).max(100, "Nilai rapor antara 0-100"),

  // Step 3: Pilihan Prodi
  prodi_pilihan_1: z.string().min(1, "Pilihan 1 wajib dipilih"),
  prodi_pilihan_2: z.string().optional(),
});

const formSchema = baseSchema.refine(
  (data) =>
    !data.prodi_pilihan_2 || data.prodi_pilihan_1 !== data.prodi_pilihan_2,
  {
    message: "Pilihan Program Studi 1 dan 2 tidak boleh sama",
    path: ["prodi_pilihan_2"],
  },
);

type FormValues = z.infer<typeof baseSchema>;

export const FormPendaftaranPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"biodata" | "akademik" | "prodi">(
    "biodata",
  );
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      nik: "3372012304040001",
      tempat_lahir: "Surakarta",
      tgl_lahir: "2008-05-15",
      jenis_kelamin: "L",
      agama: "Katolik",
      alamat_lengkap: "Jl. Slamet Riyadi No. 120, Surakarta",
      nama_ortu: "Bambang Sudarsono",
      no_hp_ortu: "081234567899",
      asal_sekolah: "SMA Negeri 1 Surakarta",
      jurusan_sekolah: "MIPA",
      nilai_rapor_avg: 87.5,
      prodi_pilihan_1: "TI",
      prodi_pilihan_2: "SI",
    },
  });

  const onSubmit = (values: FormValues) => {
    console.log("Menyimpan formulir pendaftaran:", values);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  if (isLoading) {
    return <CardSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Gagal Memuat Formulir Pendaftaran"
        message="Tidak dapat memuat draf formulir pendaftaran Anda dari server."
        onRetry={() => {
          setIsError(false);
          setIsLoading(true);
          setTimeout(() => setIsLoading(false), 500);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Form */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-200">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Formulir Pendaftaran Mahasiswa Baru
          </h1>
          <p className="text-xs text-biru-800">
            Pastikan data yang diisi sesuai dengan dokumen identitas resmi
            (KTP/Ijazah/Rapor)
          </p>
        </div>
        <StatusBadge status="berhasil" label="Status: Terisi Lengkap" />
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-biru-100 border border-biru-600 text-biru-950 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-biru-700" />
          <span>
            Perubahan formulir pendaftaran berhasil disimpan ke sistem server.
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1.5 bg-biru-50/80 border border-biru-200 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab("biodata")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "biodata"
              ? "bg-biru-700 text-putih shadow-xs"
              : "text-biru-900 hover:bg-biru-100"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>1. Biodata Calon Mahasiswa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("akademik")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "akademik"
              ? "bg-biru-700 text-putih shadow-xs"
              : "text-biru-900 hover:bg-biru-100"
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>2. Riwayat Pendidikan & Rapor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("prodi")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "prodi"
              ? "bg-biru-700 text-putih shadow-xs"
              : "text-biru-900 hover:bg-biru-100"
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>3. Pilihan Program Studi</span>
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* TAB 1: BIODATA */}
        {activeTab === "biodata" && (
          <Card className="border border-biru-200 shadow-sm space-y-6">
            <h2 className="font-serif text-xl font-bold text-biru-950 pb-3 border-b border-biru-100">
              Data Identitas Calon Mahasiswa
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-biru-900 uppercase tracking-wider mb-1.5">
                  Nomor Induk Kependudukan (NIK 16 Digit)
                </label>
                <input
                  {...register("nik")}
                  type="text"
                  maxLength={16}
                  className="w-full bg-putih border border-biru-200 rounded-xl px-4 py-2.5 text-sm text-biru-950 font-mono focus:border-biru-600 focus:outline-none"
                />
                {errors.nik && (
                  <p className="text-xs text-biru-800 font-semibold mt-1">
                    {errors.nik.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-biru-900 uppercase tracking-wider mb-1.5">
                  Jenis Kelamin
                </label>
                <select
                  {...register("jenis_kelamin")}
                  className="w-full bg-putih border border-biru-200 rounded-xl px-4 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-biru-900 uppercase tracking-wider mb-1.5">
                  Tempat Lahir
                </label>
                <input
                  {...register("tempat_lahir")}
                  type="text"
                  className="w-full bg-putih border border-biru-200 rounded-xl px-4 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none"
                />
                {errors.tempat_lahir && (
                  <p className="text-xs text-biru-800 font-semibold mt-1">
                    {errors.tempat_lahir.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-biru-900 uppercase tracking-wider mb-1.5">
                  Tanggal Lahir
                </label>
                <input
                  {...register("tgl_lahir")}
                  type="date"
                  className="w-full bg-putih border border-biru-200 rounded-xl px-4 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none"
                />
                {errors.tgl_lahir && (
                  <p className="text-xs text-biru-800 font-semibold mt-1">
                    {errors.tgl_lahir.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-biru-900 uppercase tracking-wider mb-1.5">
                  Agama
                </label>
                <select
                  {...register("agama")}
                  className="w-full bg-putih border border-biru-200 rounded-xl px-4 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none"
                >
                  <option value="Katolik">Katolik</option>
                  <option value="Kristen">Kristen</option>
                  <option value="Islam">Islam</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Konghucu">Konghucu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-biru-900 uppercase tracking-wider mb-1.5">
                  Nama Orang Tua / Wali
                </label>
                <input
                  {...register("nama_ortu")}
                  type="text"
                  className="w-full bg-putih border border-biru-200 rounded-xl px-4 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none"
                />
                {errors.nama_ortu && (
                  <p className="text-xs text-biru-800 font-semibold mt-1">
                    {errors.nama_ortu.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-biru-900 uppercase tracking-wider mb-1.5">
                  Alamat Lengkap (Sesuai KTP/KK)
                </label>
                <textarea
                  {...register("alamat_lengkap")}
                  rows={2}
                  className="w-full bg-putih border border-biru-200 rounded-xl px-4 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none"
                />
                {errors.alamat_lengkap && (
                  <p className="text-xs text-biru-800 font-semibold mt-1">
                    {errors.alamat_lengkap.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-biru-100">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setActiveTab("akademik")}
                className="gap-2"
              >
                <span>Lanjut ke Riwayat Pendidikan</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* TAB 2: AKADEMIK */}
        {activeTab === "akademik" && (
          <Card className="border border-biru-200 shadow-sm space-y-6">
            <h2 className="font-serif text-xl font-bold text-biru-950 pb-3 border-b border-biru-100">
              Riwayat Pendidikan Asal Sekolah & Nilai Rapor
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-biru-900 uppercase tracking-wider mb-1.5">
                  Nama Asal Sekolah (SMA / SMK / MA)
                </label>
                <input
                  {...register("asal_sekolah")}
                  type="text"
                  placeholder="Misal: SMA Negeri 1 Surakarta"
                  className="w-full bg-putih border border-biru-200 rounded-xl px-4 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none"
                />
                {errors.asal_sekolah && (
                  <p className="text-xs text-biru-800 font-semibold mt-1">
                    {errors.asal_sekolah.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-biru-900 uppercase tracking-wider mb-1.5">
                  Jurusan Sekolah
                </label>
                <input
                  {...register("jurusan_sekolah")}
                  type="text"
                  placeholder="Misal: MIPA / IPS / Rekayasa Perangkat Lunak"
                  className="w-full bg-putih border border-biru-200 rounded-xl px-4 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none"
                />
                {errors.jurusan_sekolah && (
                  <p className="text-xs text-biru-800 font-semibold mt-1">
                    {errors.jurusan_sekolah.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-biru-900 uppercase tracking-wider mb-1.5">
                  Rata-rata Nilai Rapor Semester 1 - 5 (Skala 0 - 100)
                </label>
                <input
                  {...register("nilai_rapor_avg")}
                  type="number"
                  step="0.01"
                  className="w-full bg-putih border border-biru-200 rounded-xl px-4 py-2.5 text-sm text-biru-950 font-mono focus:border-biru-600 focus:outline-none"
                />
                {errors.nilai_rapor_avg && (
                  <p className="text-xs text-biru-800 font-semibold mt-1">
                    {errors.nilai_rapor_avg.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-biru-100">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setActiveTab("biodata")}
              >
                Kembali
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setActiveTab("prodi")}
                className="gap-2"
              >
                <span>Lanjut ke Pilihan Prodi</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* TAB 3: PRODI */}
        {activeTab === "prodi" && (
          <Card className="border border-biru-200 shadow-sm space-y-6">
            <h2 className="font-serif text-xl font-bold text-biru-950 pb-3 border-b border-biru-100">
              Pilihan Program Studi Universitas Pignatelli Triputra
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-biru-900 uppercase tracking-wider mb-1.5">
                  Pilihan Program Studi 1 (Prioritas Utama)
                </label>
                <select
                  {...register("prodi_pilihan_1")}
                  className="w-full bg-putih border border-biru-200 rounded-xl px-4 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none"
                >
                  <option value="TI">
                    S1 Informatika (Passing Score: 70.0)
                  </option>
                  <option value="SI">
                    S1 Sistem Informasi (Passing Score: 68.0)
                  </option>
                  <option value="MN">
                    S1 Manajemen Bisnis (Passing Score: 65.0)
                  </option>
                  <option value="AK">S1 Akuntansi (Passing Score: 65.0)</option>
                  <option value="MI">
                    D3 Manajemen Informatika (Passing Score: 60.0)
                  </option>
                </select>
                {errors.prodi_pilihan_1 && (
                  <p className="text-xs text-biru-800 font-semibold mt-1">
                    {errors.prodi_pilihan_1.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-biru-900 uppercase tracking-wider mb-1.5">
                  Pilihan Program Studi 2 (Pilihan Cadangan)
                </label>
                <select
                  {...register("prodi_pilihan_2")}
                  className="w-full bg-putih border border-biru-200 rounded-xl px-4 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none"
                >
                  <option value="SI">
                    S1 Sistem Informasi (Passing Score: 68.0)
                  </option>
                  <option value="TI">
                    S1 Informatika (Passing Score: 70.0)
                  </option>
                  <option value="MN">
                    S1 Manajemen Bisnis (Passing Score: 65.0)
                  </option>
                  <option value="AK">S1 Akuntansi (Passing Score: 65.0)</option>
                  <option value="MI">
                    D3 Manajemen Informatika (Passing Score: 60.0)
                  </option>
                </select>
                {errors.prodi_pilihan_2 && (
                  <p className="text-xs text-biru-800 font-semibold mt-1">
                    {errors.prodi_pilihan_2.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-biru-100">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setActiveTab("akademik")}
              >
                Kembali
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Seluruh Formulir</span>
              </Button>
            </div>
          </Card>
        )}
      </form>
    </div>
  );
};
