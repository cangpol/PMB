import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  UserPlus,
  User,
  Mail,
  Phone,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/useAuth";
import { tujuanSetelahLogin } from "../../components/auth/akses";
import {
  SUMBER_INFORMASI_OPTIONS,
  PLATFORM_MEDIA_SOSIAL,
  LAINNYA_PLATFORM,
} from "../../data/sumberInformasi";
import { PilihAsalSekolah } from "../../components/auth/PilihAsalSekolah";
import { simpanPilihanAwal } from "../../lib/pilihanAwal";

/** Kode sumber informasi yang memunculkan pilihan asal sekolah */
const SUMBER_SEKOLAH = "SOSIALISASI_SEKOLAH";

const registerSchema = z
  .object({
    nama_lengkap: z
      .string()
      .min(1, "Nama lengkap tidak boleh kosong")
      .min(3, "Nama lengkap minimal 3 karakter"),
    email: z
      .string()
      .min(1, "Email tidak boleh kosong")
      .email("Format email tidak valid"),
    no_hp: z
      .string()
      .min(1, "Nomor WhatsApp/HP tidak boleh kosong")
      .min(10, "Nomor HP minimal 10 digit")
      .max(20, "Nomor HP maksimal 20 digit"),
    password: z
      .string()
      .min(1, "Kata sandi tidak boleh kosong")
      .min(8, "Kata sandi minimal 8 karakter"),
    confirm_password: z
      .string()
      .min(1, "Konfirmasi kata sandi tidak boleh kosong")
      .min(8, "Konfirmasi kata sandi minimal 8 karakter"),
    sumber_informasi: z
      .string()
      .min(1, "Pilih dari mana Anda mengetahui PMB UPITRA"),
    sumber_informasi_lainnya: z
      .string()
      .max(150, "Maksimal 150 karakter")
      .optional(),
    sumber_platform: z.string().optional(),
    // Hanya diisi & wajib bila sumber informasi = Sosialisasi di Sekolah
    provinsi_sekolah: z.string().optional(),
    kabupaten_sekolah: z.string().optional(),
    nama_sekolah: z
      .string()
      .trim()
      .max(255, "Maksimal 255 karakter")
      .optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Konfirmasi kata sandi tidak cocok dengan kata sandi di atas",
    path: ["confirm_password"],
  })
  .superRefine((data, ctx) => {
    if (data.sumber_informasi !== SUMBER_SEKOLAH) return;
    const wajib: [keyof typeof data, string][] = [
      ["provinsi_sekolah", "Pilih provinsi asal sekolah"],
      ["kabupaten_sekolah", "Pilih kabupaten / kota asal sekolah"],
      ["nama_sekolah", "Pilih atau ketik nama sekolah Anda"],
    ];
    for (const [path, message] of wajib) {
      if (!String(data[path] ?? "").trim()) {
        ctx.addIssue({ code: "custom", message, path: [path] });
      }
    }
  })
  .refine(
    (data) =>
      data.sumber_informasi !== "MEDIA_SOSIAL" || !!data.sumber_platform,
    {
      message: "Pilih media sosialnya",
      path: ["sumber_platform"],
    },
  )
  .refine(
    (data) =>
      !(
        (data.sumber_informasi === "LAINNYA" ||
          (data.sumber_informasi === "MEDIA_SOSIAL" &&
            data.sumber_platform === LAINNYA_PLATFORM)) &&
        !data.sumber_informasi_lainnya?.trim()
      ),
    {
      message: "Mohon sebutkan sumber informasi Anda",
      path: ["sumber_informasi_lainnya"],
    },
  );

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { register: registerAuth, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Jalur/prodi yang dipilih di website dibawa sampai formulir pendaftaran
  React.useEffect(() => {
    simpanPilihanAwal(searchParams);
  }, [searchParams]);

  React.useEffect(() => {
    if (!isLoading && user) {
      navigate(tujuanSetelahLogin(user.role, null, user.is_email_verified), {
        replace: true,
      });
    }
  }, [user, isLoading, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nama_lengkap: "",
      email: "",
      no_hp: "",
      password: "",
      confirm_password: "",
      sumber_informasi: "",
      sumber_informasi_lainnya: "",
      sumber_platform: "",
      provinsi_sekolah: "",
      kabupaten_sekolah: "",
      nama_sekolah: "",
    },
  });
  const sumberDipilih = watch("sumber_informasi");
  React.useEffect(() => {
    if (sumberDipilih !== SUMBER_SEKOLAH) {
      setValue("provinsi_sekolah", "");
      setValue("kabupaten_sekolah", "");
      setValue("nama_sekolah", "");
    }
  }, [sumberDipilih, setValue]);
  const platformDipilih = watch("sumber_platform");
  const perluKeterangan =
    sumberDipilih === "LAINNYA" ||
    (sumberDipilih === "MEDIA_SOSIAL" && platformDipilih === LAINNYA_PLATFORM);

  const onSubmit = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await registerAuth({
        nama_lengkap: values.nama_lengkap,
        email: values.email,
        no_hp: values.no_hp,
        password: values.password,
        sumber_informasi: values.sumber_informasi,
        sumber_informasi_lainnya:
          values.sumber_informasi === "MEDIA_SOSIAL"
            ? values.sumber_platform === LAINNYA_PLATFORM
              ? values.sumber_informasi_lainnya?.trim()
              : values.sumber_platform
            : values.sumber_informasi === "LAINNYA"
              ? values.sumber_informasi_lainnya?.trim()
              : undefined,
        ...(values.sumber_informasi === SUMBER_SEKOLAH
          ? {
              provinsi_asal_sekolah: values.provinsi_sekolah,
              kabupaten_asal_sekolah: values.kabupaten_sekolah,
              asal_sekolah: values.nama_sekolah?.trim(),
            }
          : {}),
      });
      setRegisteredEmail(values.email);
    } catch (err: unknown) {
      const apiErr = err as { pesan?: string };
      setErrorMessage(
        apiErr.pesan ||
          "Pendaftaran akun gagal. Alamat email mungkin sudah terdaftar sebelumnya.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="space-y-6">
        <Card className="border border-biru-200 p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-biru-100 text-biru-800 border border-biru-300">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-biru-950">
            Registrasi Berhasil!
          </h2>
          <p className="text-sm text-biru-800 leading-relaxed max-w-sm mx-auto">
            Akun PMB Anda untuk{" "}
            <span className="font-semibold text-biru-950">
              {registeredEmail}
            </span>{" "}
            telah berhasil dibuat. Kode verifikasi akun telah dikirimkan ke
            email Anda.
          </p>

          <div className="pt-2 flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() =>
                navigate(
                  `/verify-email?email=${encodeURIComponent(registeredEmail)}`,
                )
              }
            >
              <span>Verifikasi Email Sekarang</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => navigate("/portal/dashboard")}
            >
              <span>Lanjut ke Dashboard Calon Mahasiswa</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-biru-950 sm:text-3xl">
          Pendaftaran Akun Calon Mahasiswa
        </h2>
        <p className="mt-2 text-sm text-biru-700">
          Lengkapi formulir di bawah ini untuk memulai proses pendaftaran PMB
          Universitas Pignatelli Triputra.
        </p>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-biru-300 bg-biru-50 p-4 text-biru-950">
          <AlertCircle className="h-5 w-5 shrink-0 text-biru-800 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed">
            {errorMessage}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-biru-900 mb-1.5">
            Nama Lengkap (Sesuai Ijazah/KTP)
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-biru-500" />
            <Input
              {...register("nama_lengkap")}
              type="text"
              placeholder="Misal: Budi Santoso"
              className="pl-10"
              aria-invalid={!!errors.nama_lengkap}
            />
          </div>
          {errors.nama_lengkap && (
            <p className="mt-1 text-xs font-semibold text-biru-800">
              {errors.nama_lengkap.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-biru-900 mb-1.5">
            Alamat Email Aktif
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-biru-500" />
            <Input
              {...register("email")}
              type="email"
              placeholder="nama@email.com"
              className="pl-10"
              aria-invalid={!!errors.email}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs font-semibold text-biru-800">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-biru-900 mb-1.5">
            Nomor WhatsApp / HP
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-biru-500" />
            <Input
              {...register("no_hp")}
              type="tel"
              placeholder="081234567890"
              className="pl-10"
              aria-invalid={!!errors.no_hp}
            />
          </div>
          {errors.no_hp && (
            <p className="mt-1 text-xs font-semibold text-biru-800">
              {errors.no_hp.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="sumber_informasi"
            className="block text-xs font-bold uppercase tracking-wider text-biru-900 mb-1.5"
          >
            Dari mana Anda mengetahui PMB UPITRA?
          </label>
          <select
            id="sumber_informasi"
            {...register("sumber_informasi")}
            aria-invalid={!!errors.sumber_informasi}
            className="w-full rounded-lg border border-biru-200 bg-putih px-3 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none focus:ring-2 focus:ring-biru-600/20"
          >
            <option value="">-- Pilih sumber informasi --</option>
            {SUMBER_INFORMASI_OPTIONS.map((o) => (
              <option key={o.kode} value={o.kode}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.sumber_informasi && (
            <p className="mt-1 text-xs font-semibold text-biru-800">
              {errors.sumber_informasi.message}
            </p>
          )}
          {sumberDipilih === "MEDIA_SOSIAL" && (
            <div className="mt-2">
              <select
                aria-label="Nama media sosial"
                {...register("sumber_platform")}
                aria-invalid={!!errors.sumber_platform}
                className="w-full rounded-lg border border-biru-200 bg-putih px-3 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none focus:ring-2 focus:ring-biru-600/20"
              >
                <option value="">-- Media sosial apa? --</option>
                {PLATFORM_MEDIA_SOSIAL.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {errors.sumber_platform && (
                <p className="mt-1 text-xs font-semibold text-biru-800">
                  {errors.sumber_platform.message}
                </p>
              )}
            </div>
          )}
          {perluKeterangan && (
            <div className="mt-2">
              <Input
                {...register("sumber_informasi_lainnya")}
                type="text"
                maxLength={150}
                placeholder={
                  sumberDipilih === "MEDIA_SOSIAL"
                    ? "Sebutkan nama media sosialnya"
                    : "Sebutkan sumber informasi Anda"
                }
                aria-invalid={!!errors.sumber_informasi_lainnya}
              />
              {errors.sumber_informasi_lainnya && (
                <p className="mt-1 text-xs font-semibold text-biru-800">
                  {errors.sumber_informasi_lainnya.message}
                </p>
              )}
            </div>
          )}
        </div>

        {sumberDipilih === SUMBER_SEKOLAH && (
          <PilihAsalSekolah
            value={{
              provinsi: watch("provinsi_sekolah") ?? "",
              kabupaten: watch("kabupaten_sekolah") ?? "",
              sekolah: watch("nama_sekolah") ?? "",
            }}
            onChange={(v) => {
              const opt = { shouldValidate: isSubmitted };
              setValue("provinsi_sekolah", v.provinsi, opt);
              setValue("kabupaten_sekolah", v.kabupaten, opt);
              setValue("nama_sekolah", v.sekolah, opt);
            }}
            errors={{
              provinsi: errors.provinsi_sekolah?.message,
              kabupaten: errors.kabupaten_sekolah?.message,
              sekolah: errors.nama_sekolah?.message,
            }}
          />
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-biru-900 mb-1.5">
            Kata Sandi (Minimal 8 Karakter)
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-biru-500" />
            <Input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              className="pl-10"
              aria-invalid={!!errors.password}
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-xs font-semibold text-biru-800">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-biru-900 mb-1.5">
            Konfirmasi Kata Sandi
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-biru-500" />
            <Input
              {...register("confirm_password")}
              type="password"
              placeholder="••••••••"
              className="pl-10"
              aria-invalid={!!errors.confirm_password}
            />
          </div>
          {errors.confirm_password && (
            <p className="mt-1 text-xs font-semibold text-biru-800">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        <div className="p-3 bg-biru-50 rounded-xl border border-biru-200 text-xs text-biru-900 flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-biru-700 shrink-0 mt-0.5" />
          <span>
            Data pribadi Anda dijamin kerahasiaannya dan hanya digunakan untuk
            keperluan seleksi PMB Universitas Pignatelli Triputra.
          </span>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          <span>Daftar Akun Sekarang</span>
        </Button>
      </form>

      <div className="pt-2 text-center text-xs text-biru-800">
        Sudah memiliki akun PMB?{" "}
        <Link
          to="/login"
          className="font-bold text-biru-700 hover:text-biru-950 hover:underline"
        >
          Masuk di sini
        </Link>
      </div>
    </div>
  );
};
