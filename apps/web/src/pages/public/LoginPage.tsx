import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LogIn,
  Lock,
  Mail,
  Shield,
  User,
  CreditCard,
  FileCheck,
  Eye,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/useAuth";
import {
  tujuanSetelahLogin,
  WAJIB_VERIFIKASI_EMAIL,
} from "../../components/auth/akses";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email tidak boleh kosong")
    .email("Format alamat email tidak valid"),
  password: z.string().min(1, "Kata sandi tidak boleh kosong"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (!isLoading && user) {
      const destination = tujuanSetelahLogin(
        user.role,
        location.state?.from?.pathname,
        user.is_email_verified,
      );
      navigate(destination, { replace: true });
    }
  }, [user, isLoading, navigate, location.state]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const user = await login(values);
      const destination = tujuanSetelahLogin(
        user.role,
        location.state?.from?.pathname,
        user.is_email_verified,
      );
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { pesan?: string };
      setErrorMessage(
        apiErr.pesan ||
          "Gagal masuk. Periksa kembali email dan kata sandi Anda.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (email: string, pass: string) => {
    setValue("email", email);
    setValue("password", pass);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-biru-950 sm:text-3xl">
          Masuk ke Portal PMB
        </h2>
        <p className="mt-2 text-sm text-biru-700">
          Masukkan email dan kata sandi Anda untuk mengakses akun PMB
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
            Alamat Email
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-biru-900">
              Kata Sandi
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-biru-700 hover:text-biru-950 hover:underline"
            >
              Lupa kata sandi?
            </Link>
          </div>
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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          <LogIn className="mr-2 h-4 w-4" />
          <span>Masuk ke Akun</span>
        </Button>
      </form>

      {/* Akun demo berisi kata sandi asli: HANYA tampil di mode pengembangan,
          tidak pernah ikut ke build produksi. */}
      {import.meta.env.DEV && (
        <Card className="border border-biru-200 bg-biru-50/60 p-4 space-y-3">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-biru-800 text-center">
            Pilihan Demo Akun (Klik untuk Mengisi):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                fillCredentials("calon@triputra.id", "Pignatelli2026!")
              }
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-biru-200 bg-putih text-biru-900 hover:bg-biru-100 transition-colors text-center"
            >
              <User className="h-4 w-4 text-biru-700 mb-1" />
              <span className="text-[11px] font-medium">Calon Mhs</span>
            </button>
            <button
              type="button"
              onClick={() =>
                fillCredentials("admin@triputra.id", "Pignatelli2026!")
              }
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-biru-200 bg-putih text-biru-900 hover:bg-biru-100 transition-colors text-center"
            >
              <Shield className="h-4 w-4 text-biru-700 mb-1" />
              <span className="text-[11px] font-medium">Admin PMB</span>
            </button>
            <button
              type="button"
              onClick={() =>
                fillCredentials("keuangan@triputra.id", "Pignatelli2026!")
              }
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-biru-200 bg-putih text-biru-900 hover:bg-biru-100 transition-colors text-center"
            >
              <CreditCard className="h-4 w-4 text-biru-700 mb-1" />
              <span className="text-[11px] font-medium">Keuangan</span>
            </button>
            <button
              type="button"
              onClick={() =>
                fillCredentials("pengawas@triputra.id", "Pignatelli2026!")
              }
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-biru-200 bg-putih text-biru-900 hover:bg-biru-100 transition-colors text-center"
            >
              <Eye className="h-4 w-4 text-biru-700 mb-1" />
              <span className="text-[11px] font-medium">Pengawas CBT</span>
            </button>
            <button
              type="button"
              onClick={() =>
                fillCredentials("asesor@triputra.id", "Pignatelli2026!")
              }
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-biru-200 bg-putih text-biru-900 hover:bg-biru-100 transition-colors text-center"
            >
              <FileCheck className="h-4 w-4 text-biru-700 mb-1" />
              <span className="text-[11px] font-medium">Asesor RPL</span>
            </button>
            <button
              type="button"
              onClick={() =>
                fillCredentials("superadmin@triputra.id", "Pignatelli2026!")
              }
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-biru-200 bg-putih text-biru-900 hover:bg-biru-100 transition-colors text-center"
            >
              <Shield className="h-4 w-4 text-biru-900 mb-1" />
              <span className="text-[11px] font-semibold">Super Admin</span>
            </button>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2 pt-2 text-center text-xs text-biru-800">
        <div>
          Belum memiliki akun PMB?{" "}
          <Link
            to="/register"
            className="font-bold text-biru-700 hover:text-biru-950 hover:underline"
          >
            Daftar Akun Baru
          </Link>
        </div>
        {WAJIB_VERIFIKASI_EMAIL && (
          <div>
            Sudah punya token aktivasi?{" "}
            <Link
              to="/verify-email"
              className="font-medium text-biru-600 hover:text-biru-950 hover:underline"
            >
              Verifikasi Email Di Sini
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
