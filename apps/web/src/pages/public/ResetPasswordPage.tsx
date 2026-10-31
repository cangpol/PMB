import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, KeyRound, CheckCircle2, AlertCircle, LogIn } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/useAuth";

const resetSchema = z
  .object({
    token: z.string().min(1, "Token reset password tidak boleh kosong"),
    new_password: z
      .string()
      .min(1, "Kata sandi baru tidak boleh kosong")
      .min(8, "Kata sandi minimal 8 karakter"),
    confirm_password: z
      .string()
      .min(1, "Konfirmasi kata sandi tidak boleh kosong")
      .min(8, "Konfirmasi kata sandi minimal 8 karakter"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirm_password"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const tokenParam = searchParams.get("token") || "";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: tokenParam,
      new_password: "",
      confirm_password: "",
    },
  });

  useEffect(() => {
    if (tokenParam) {
      setValue("token", tokenParam);
    }
  }, [tokenParam, setValue]);

  const onSubmit = async (values: ResetFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await resetPassword({
        token: values.token.trim(),
        new_password: values.new_password,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      const apiErr = err as { pesan?: string };
      setErrorMessage(
        apiErr.pesan ||
          "Gagal mereset kata sandi. Token mungkin sudah kedaluwarsa atau tidak valid.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <Card className="border border-biru-200 p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-biru-100 text-biru-800 border border-biru-300">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-biru-950">
            Kata Sandi Berhasil Diperbarui!
          </h2>
          <p className="text-sm text-biru-800 leading-relaxed max-w-sm mx-auto">
            Kata sandi akun Anda telah sukses diperbarui. Silakan masuk kembali
            menggunakan kata sandi baru Anda.
          </p>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate("/login")}
            >
              <LogIn className="mr-2 h-4 w-4" />
              <span>Masuk ke Akun Sekarang</span>
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
          Atur Ulang Kata Sandi
        </h2>
        <p className="mt-2 text-sm text-biru-700">
          Masukkan token reset dan buat kata sandi baru yang kuat untuk akun PMB
          Anda.
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
            Token Reset Password
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-biru-500" />
            <Input
              {...register("token")}
              type="text"
              placeholder="Masukkan kode / token reset"
              className="pl-10 font-mono text-sm"
              aria-invalid={!!errors.token}
            />
          </div>
          {errors.token && (
            <p className="mt-1 text-xs font-semibold text-biru-800">
              {errors.token.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-biru-900 mb-1.5">
            Kata Sandi Baru (Min. 8 Karakter)
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-biru-500" />
            <Input
              {...register("new_password")}
              type="password"
              placeholder="••••••••"
              className="pl-10"
              aria-invalid={!!errors.new_password}
            />
          </div>
          {errors.new_password && (
            <p className="mt-1 text-xs font-semibold text-biru-800">
              {errors.new_password.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-biru-900 mb-1.5">
            Konfirmasi Kata Sandi Baru
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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          <Lock className="mr-2 h-4 w-4" />
          <span>Simpan Kata Sandi Baru</span>
        </Button>
      </form>

      <div className="pt-2 text-center text-xs text-biru-800">
        Kembali ke halaman login?{" "}
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
