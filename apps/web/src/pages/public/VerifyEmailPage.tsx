import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, KeyRound, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/useAuth";

const verifySchema = z.object({
  token: z.string().min(1, "Token verifikasi tidak boleh kosong"),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, user } = useAuth();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const tokenParam = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      token: tokenParam,
    },
  });

  useEffect(() => {
    if (tokenParam) {
      setValue("token", tokenParam);
    }
  }, [tokenParam, setValue]);

  const onSubmit = async (values: VerifyFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await verifyEmail({ token: values.token.trim() });
      setStatus("success");
    } catch (err: unknown) {
      const apiErr = err as { pesan?: string };
      setErrorMessage(
        apiErr.pesan ||
          "Token verifikasi tidak valid, telah kedaluwarsa, atau sudah pernah digunakan.",
      );
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user && user.is_email_verified) {
    return (
      <div className="space-y-6">
        <Card className="border border-biru-200 p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-biru-100 text-biru-800 border border-biru-300">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-biru-950">
            Email Sudah Terverifikasi
          </h2>
          <p className="text-sm text-biru-800 leading-relaxed max-w-sm mx-auto">
            Alamat email Anda (
            <span className="font-semibold text-biru-950">{user.email}</span>)
            telah diverifikasi dan akun Anda telah aktif sepenuhnya.
          </p>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() =>
                navigate(
                  user.role === "calon_mahasiswa"
                    ? "/portal/dashboard"
                    : "/admin/dashboard",
                )
              }
            >
              <span>Lanjut ke Dashboard PMB</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="space-y-6">
        <Card className="border border-biru-200 p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-biru-100 text-biru-800 border border-biru-300">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-biru-950">
            Email Berhasil Diverifikasi!
          </h2>
          <p className="text-sm text-biru-800 leading-relaxed max-w-sm mx-auto">
            Selamat, akun email Anda telah aktif secara resmi di sistem PMB
            Universitas Pignatelli Triputra.
          </p>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                if (user) {
                  navigate(
                    user.role === "calon_mahasiswa"
                      ? "/portal/dashboard"
                      : "/admin/dashboard",
                  );
                } else {
                  navigate("/login");
                }
              }}
            >
              <span>
                {user ? "Buka Dashboard PMB" : "Masuk ke Akun Sekarang"}
              </span>
              <ArrowRight className="ml-2 h-4 w-4" />
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
          Verifikasi Email Akun
        </h2>
        <p className="mt-2 text-sm text-biru-700">
          {emailParam ? (
            <>
              Masukkan kode verifikasi yang telah kami kirimkan ke{" "}
              <span className="font-semibold text-biru-950">{emailParam}</span>.
            </>
          ) : (
            "Masukkan kode atau token verifikasi yang Anda terima pada email pendaftaran."
          )}
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
            Token / Kode Verifikasi
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-biru-500" />
            <Input
              {...register("token")}
              type="text"
              placeholder="Contoh: 8f4a1c5d-..."
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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          <span>Verifikasi Akun Sekarang</span>
        </Button>
      </form>

      <div className="flex flex-col gap-2 pt-2 text-center text-xs text-biru-800">
        <div>
          Sudah selesai verifikasi?{" "}
          <Link
            to="/login"
            className="font-bold text-biru-700 hover:text-biru-950 hover:underline"
          >
            Masuk ke Akun
          </Link>
        </div>
        <div>
          Belum menerima email? Periksa folder spam atau hubungi panitia PMB.
        </div>
      </div>
    </div>
  );
};
