import React, { useState, useEffect } from "react";
import {
  Sliders,
  Mail,
  PhoneCall,
  Save,
  CheckCircle2,
  AlertCircle,
  Power,
} from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Switch,
  ErrorState,
  Skeleton,
} from "@/components/ui";
import { getPengaturanList, updatePengaturan } from "@/services/konfigurasi";

export const PengaturanPmbPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [pmbBuka, setPmbBuka] = useState(true);
  const [pesanTutup, setPesanTutup] = useState("");
  const [emailVerifikasi, setEmailVerifikasi] = useState("");
  const [emailLulus, setEmailLulus] = useState("");
  const [kontakEmail, setKontakEmail] = useState("");
  const [kontakWa, setKontakWa] = useState("");
  const [jamLayanan, setJamLayanan] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchPengaturanData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPengaturanList();

      const map = new Map<string, string>();
      data.forEach((p) => map.set(p.kunci, p.nilai));

      setPmbBuka(map.get("PMB_BUKA") !== "false");
      setPesanTutup(
        map.get("PMB_PESAN_TUTUP") ||
          "Pendaftaran PMB Universitas Pignatelli Triputra saat ini belum dibuka atau sedang dalam masa jeda gelombang.",
      );
      setEmailVerifikasi(
        map.get("TEMPLATE_EMAIL_VERIFIKASI") ||
          "Selamat datang di PMB Universitas Pignatelli Triputra. Klik tautan berikut untuk memverifikasi akun Anda: {{LINK_VERIFIKASI}}",
      );
      setEmailLulus(
        map.get("TEMPLATE_EMAIL_LULUS") ||
          "Selamat! Anda dinyatakan LULUS seleksi penerimaan mahasiswa baru Universitas Pignatelli Triputra. Unduh Surat Penerimaan (LoA) di portal.",
      );
      setKontakEmail(map.get("KONTAK_EMAIL") || "pmb@pignatelli.ac.id");
      setKontakWa(map.get("KONTAK_WHATSAPP") || "+62 811-2233-4455");
      setJamLayanan(
        map.get("JAM_LAYANAN") ||
          "Senin - Jumat: 08.00 - 16.00 WIB | Sabtu: 08.00 - 12.00 WIB",
      );
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setError(e.pesan || "Gagal memuat pengaturan sistem PMB");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPengaturanData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveSuccess(false);
    setSaveError(null);

    const itemsToSave = [
      { kunci: "PMB_BUKA", nilai: pmbBuka ? "true" : "false" },
      { kunci: "PMB_PESAN_TUTUP", nilai: pesanTutup },
      { kunci: "TEMPLATE_EMAIL_VERIFIKASI", nilai: emailVerifikasi },
      { kunci: "TEMPLATE_EMAIL_LULUS", nilai: emailLulus },
      { kunci: "KONTAK_EMAIL", nilai: kontakEmail },
      { kunci: "KONTAK_WHATSAPP", nilai: kontakWa },
      { kunci: "JAM_LAYANAN", nilai: jamLayanan },
    ];

    try {
      for (const item of itemsToSave) {
        await updatePengaturan(item);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      await fetchPengaturanData();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setSaveError(e.pesan || "Gagal menyimpan perubahan pengaturan");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Gagal Memuat Pengaturan"
        message={error}
        onRetry={fetchPengaturanData}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-biru-700 uppercase tracking-wider mb-1">
            <Sliders className="w-4 h-4" />
            <span>Konfigurasi Global</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Pengaturan Sistem PMB
          </h1>
          <p className="text-xs sm:text-sm text-biru-800 font-light mt-1">
            Kontrol status pendaftaran portal publik, template email notifikasi,
            dan informasi kontak helpdesk.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-biru-800 bg-biru-100 px-3 py-1.5 rounded-xl border border-biru-200 animate-fade-in font-medium">
              <CheckCircle2 className="w-4 h-4 text-biru-700" />
              <span>Pengaturan berhasil disimpan</span>
            </div>
          )}
        </div>
      </div>

      {saveError && (
        <div className="p-3 rounded-xl bg-biru-100 border border-biru-300 flex items-center gap-2 text-xs text-biru-950 font-medium">
          <AlertCircle className="w-4 h-4 text-biru-800 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* KARTU 1: STATUS PENDAFTARAN PMB */}
        <div className="bg-putih border border-biru-200 rounded-2xl p-6 shadow-soft-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-biru-50 text-biru-700 border border-biru-100">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-biru-950">
                  Status Penerimaan Mahasiswa Baru
                </h2>
                <p className="text-xs text-biru-800 font-light">
                  Buka atau tutup seluruh proses pendaftaran akun dan pengisian
                  formulir secara global.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={pmbBuka} onChange={setPmbBuka} id="pmb-switch" />
              <span className="text-xs font-bold text-biru-950">
                {pmbBuka ? "BUKA" : "TUTUP"}
              </span>
            </div>
          </div>

          {!pmbBuka && (
            <div className="space-y-1 pt-2 border-t border-biru-100">
              <label className="text-xs font-bold text-biru-900">
                Pesan untuk Calon Mahasiswa Saat PMB Ditutup
              </label>
              <Textarea
                rows={2}
                value={pesanTutup}
                onChange={(e) => setPesanTutup(e.target.value)}
                placeholder="Pemberitahuan yang akan tampil pada beranda dan halaman pendaftaran..."
              />
            </div>
          )}
        </div>

        {/* KARTU 2: TEMPLATE EMAIL OTOMATIS */}
        <div className="bg-putih border border-biru-200 rounded-2xl p-6 shadow-soft-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-biru-50 text-biru-700 border border-biru-100">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-biru-950">
                Template Email Notifikasi Otomatis
              </h2>
              <p className="text-xs text-biru-800 font-light">
                Pesan email yang dikirimkan oleh sistem MailSender ke calon
                mahasiswa.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-biru-900">
                  Email Verifikasi Pendaftaran Akun
                </label>
                <span className="text-[11px] font-mono text-biru-700">
                  Placeholder: {"{{LINK_VERIFIKASI}}"}
                </span>
              </div>
              <Textarea
                rows={3}
                value={emailVerifikasi}
                onChange={(e) => setEmailVerifikasi(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-biru-900">
                  Email Pengumuman Seleksi & Kelulusan
                </label>
                <span className="text-[11px] font-mono text-biru-700">
                  Placeholder: {"{{NAMA}}"}, {"{{PRODI}}"}
                </span>
              </div>
              <Textarea
                rows={3}
                value={emailLulus}
                onChange={(e) => setEmailLulus(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* KARTU 3: KONTAK HELPDESK & LAYANAN PMB */}
        <div className="bg-putih border border-biru-200 rounded-2xl p-6 shadow-soft-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-biru-50 text-biru-700 border border-biru-100">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-biru-950">
                Kontak Helpdesk & Jam Layanan PMB
              </h2>
              <p className="text-xs text-biru-800 font-light">
                Informasi narahubung resmi yang ditampilkan pada footer dan
                halaman bantuan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Email Resmi Helpdesk PMB
              </label>
              <Input
                type="email"
                required
                value={kontakEmail}
                onChange={(e) => setKontakEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Nomor WhatsApp Center PMB
              </label>
              <Input
                required
                value={kontakWa}
                onChange={(e) => setKontakWa(e.target.value)}
              />
            </div>

            <div className="col-span-1 sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-biru-900">
                Jam Kerja Pelayanan PMB
              </label>
              <Input
                required
                value={jamLayanan}
                onChange={(e) => setJamLayanan(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={fetchPengaturanData}
            disabled={isSubmitting}
          >
            Reset Form
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>
              {isSubmitting
                ? "Menyimpan Perubahan..."
                : "Simpan Semua Pengaturan"}
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
};
