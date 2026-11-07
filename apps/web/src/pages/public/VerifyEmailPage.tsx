import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2, MailCheck, RefreshCw, LogOut } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/useAuth";
import {
  dashboardPeran,
  WAJIB_VERIFIKASI_EMAIL,
} from "../../components/auth/akses";

const JEDA_KIRIM_ULANG = 60;

/**
 * Verifikasi email calon dengan kode 6 digit yang dikirim ke email.
 * Halaman ini wajib dilewati sebelum calon dapat memakai fitur PMB.
 */
export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, verifyEmail, kirimUlangKode, logout } = useAuth();
  const [kode, setKode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [berhasil, setBerhasil] = useState(false);
  const [jeda, setJeda] = useState(JEDA_KIRIM_ULANG);

  // Hitung mundur tombol kirim ulang (kode pertama dikirim saat mendaftar)
  useEffect(() => {
    if (jeda <= 0) return;
    const t = window.setTimeout(() => setJeda((d) => d - 1), 1000);
    return () => window.clearTimeout(t);
  }, [jeda]);

  if (isLoading) return null;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: { pathname: "/verify-email" } }}
      />
    );
  }
  if ((user.is_email_verified || !WAJIB_VERIFIKASI_EMAIL) && !berhasil) {
    return <Navigate to={dashboardPeran(user.role)} replace />;
  }

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!/^\d{6}$/.test(kode)) {
      setError("Masukkan 6 digit kode dari email Anda.");
      return;
    }
    try {
      setMengirim(true);
      await verifyEmail({ kode });
      setBerhasil(true);
    } catch (err: unknown) {
      setError(
        (err as { pesan?: string }).pesan || "Kode verifikasi tidak valid.",
      );
      setKode("");
    } finally {
      setMengirim(false);
    }
  };

  const kirimUlang = async () => {
    setError(null);
    setInfo(null);
    try {
      const res = await kirimUlangKode();
      setInfo(res.pesan);
      setJeda(JEDA_KIRIM_ULANG);
      setKode("");
    } catch (err: unknown) {
      setError(
        (err as { pesan?: string }).pesan || "Gagal mengirim ulang kode.",
      );
    }
  };

  if (berhasil) {
    return (
      <Card className="border border-biru-200 p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-biru-950">
          Email Terverifikasi
        </h1>
        <p className="text-sm text-biru-800">
          Terima kasih. Akun Anda sudah aktif; silakan lanjutkan pendaftaran.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate(dashboardPeran(user.role), { replace: true })}
        >
          Lanjut ke Portal Pendaftaran
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border border-biru-200 p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-biru-100 text-biru-800 border border-biru-300">
          <MailCheck className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-biru-950">
          Verifikasi Email Anda
        </h1>
        <p className="text-sm text-biru-800 leading-relaxed">
          Kami mengirim <strong>kode 6 digit</strong> ke{" "}
          <span className="font-semibold text-biru-950 break-all">
            {user.email}
          </span>
          . Masukkan kode tersebut untuk membuktikan email ini milik Anda.
        </p>
      </div>

      <form onSubmit={kirim} className="space-y-3" noValidate>
        <label htmlFor="kode-verifikasi" className="sr-only">
          Kode verifikasi 6 digit
        </label>
        <input
          id="kode-verifikasi"
          value={kode}
          onChange={(e) => {
            setKode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError(null);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          placeholder="••••••"
          aria-invalid={!!error}
          aria-describedby={error ? "kode-error" : undefined}
          className="w-full text-center font-mono text-3xl tracking-[0.5em] py-3 rounded-xl border border-biru-300 bg-putih text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600"
        />
        {error && (
          <p
            id="kode-error"
            className="text-xs font-semibold text-rose-700 text-center"
            role="alert"
          >
            {error}
          </p>
        )}
        {info && (
          <p className="text-xs text-emerald-800 text-center" role="status">
            {info}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={mengirim || kode.length !== 6}
        >
          {mengirim ? "Memeriksa..." : "Verifikasi"}
        </Button>
      </form>

      <div className="text-center space-y-2 text-xs text-biru-800">
        <p>
          Tidak menerima email? Periksa folder Spam/Promosi. Kode berlaku 15
          menit.
        </p>
        <button
          type="button"
          onClick={kirimUlang}
          disabled={jeda > 0}
          className="inline-flex items-center gap-1.5 font-bold text-biru-800 hover:text-biru-950 disabled:text-biru-400 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden />
          {jeda > 0 ? `Kirim ulang kode (${jeda} dtk)` : "Kirim ulang kode"}
        </button>
        <div>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
            className="inline-flex items-center gap-1.5 text-biru-700 hover:text-biru-950"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden />
            Salah email? Keluar dan daftar ulang
          </button>
        </div>
      </div>
    </Card>
  );
};

export default VerifyEmailPage;
