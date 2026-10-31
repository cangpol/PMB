import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/useAuth";

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, "Email tidak boleh kosong")
    .email("Format alamat email tidak valid"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const { forgotPassword } = useAuth();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await forgotPassword(values.email);
      setSubmittedEmail(values.email);
    } catch (err: unknown) {
      const apiErr = err as { pesan?: string };
      setErrorMessage(
        apiErr.pesan ||
          "Gagal memproses permintaan reset password. Silakan coba lagi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="space-y-6">
        <Card className="border border-biru-200 p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-biru-100 text-biru-800 border border-biru-300">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-biru-950">
            Permintaan Dikirim
          </h2>
          <p className="text-sm text-biru-800 leading-relaxed max-w-sm mx-auto">
            Jika alamat email{" "}
            <span className="font-semibold text-biru-950">
              {submittedEmail}
            </span>{" "}
            terdaftar di sistem PMB kami, instruksi beserta token untuk mengatur
            ulang kata sandi telah dikirimkan ke kotak masuk Anda.
          </p>

          <div className="pt-2 flex flex-col gap-3">
            <Link to="/reset-password">
              <Button variant="primary" size="lg" className="w-full">
                <span>Sudah Punya Token? Reset Sekarang</span>
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                <span>Kembali ke Halaman Login</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-biru-950 sm:text-3xl">
          Lupa Kata Sandi?
        </h2>
        <p className="mt-2 text-sm text-biru-700">
          Masukkan alamat email yang terdaftar untuk menerima instruksi reset
          kata sandi akun Anda.
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
            Alamat Email Akun
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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          <Send className="mr-2 h-4 w-4" />
          <span>Kirim Instruksi Reset</span>
        </Button>
      </form>

      <div className="pt-2 text-center text-xs text-biru-800">
        Ingat kembali kata sandi Anda?{" "}
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
