import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, X } from "lucide-react";
import { AutocompleteSekolah } from "../form/AutocompleteSekolah";
import { getProdiList } from "../../services/prodi";
import {
  validasiMinat,
  type FormMinat,
  type GalatMinat,
} from "../../lib/minatCalon";

/** Jeda sebelum pop up muncul setelah halaman dibuka. */
const TUNDA_MUNCUL_MS = 500;

const KOSONG: FormMinat = {
  nama: "",
  no_hp: "",
  email: "",
  asal_sekolah: "",
  prodi_id: "",
};

const label = "block text-[13px] font-bold text-putih mb-1";
const isian =
  "w-full rounded-xl border bg-putih px-3.5 py-2 text-sm text-biru-950 placeholder:text-biru-400 focus:outline-none focus:ring-2 focus:ring-biru-300";

/** Pop up halaman depan, tampil setiap halaman dibuka: pengunjung meninggalkan data minat agar dihubungi tim PMB. */
export const PopupMinatCalon: React.FC = () => {
  const [terbuka, setTerbuka] = useState(false);
  const [form, setForm] = useState<FormMinat>(KOSONG);
  const [galat, setGalat] = useState<GalatMinat>({});
  const [kirim, setKirim] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [galatServer, setGalatServer] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setTerbuka(true), TUNDA_MUNCUL_MS);
    return () => clearTimeout(t);
  }, []);

  const kartuRef = useRef<HTMLDivElement>(null);
  const tutupRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!terbuka) return;
    const tekan = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutupRef.current();
    };
    window.addEventListener("keydown", tekan);
    document.body.style.overflow = "hidden";
    kartuRef.current?.querySelector<HTMLElement>("input")?.focus();
    return () => {
      window.removeEventListener("keydown", tekan);
      document.body.style.overflow = "";
    };
  }, [terbuka]);

  const { data: prodi = [] } = useQuery({
    queryKey: ["prodi-popup-minat"],
    queryFn: getProdiList,
    enabled: terbuka,
    staleTime: 10 * 60_000,
  });

  const tutup = () => {
    setTerbuka(false);
  };

  tutupRef.current = tutup;

  const ubah = (k: keyof FormMinat, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setGalat((g) => ({ ...g, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const g = validasiMinat(form);
    setGalat(g);
    if (Object.keys(g).length > 0) return;
    const p = prodi.find((x) => x.id === form.prodi_id);
    setKirim(true);
    setGalatServer(null);
    try {
      const res = await fetch("/api/cms/prospek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama.trim(),
          no_hp: form.no_hp.trim(),
          email: form.email.trim(),
          asal_sekolah: form.asal_sekolah.trim(),
          prodi_id: form.prodi_id,
          prodi_minat: p ? `${p.jenjang} - ${p.nama_prodi}` : "",
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          pesan?: string;
        };
        throw new Error(body.pesan || "Data belum dapat dikirim.");
      }
      setSukses(true);
    } catch (err) {
      setGalatServer(
        err instanceof Error ? err.message : "Data belum dapat dikirim.",
      );
    } finally {
      setKirim(false);
    }
  };

  if (!terbuka) return null;

  const pesan = (k: keyof FormMinat) =>
    galat[k] ? (
      <p role="alert" className="mt-1 text-xs font-semibold text-amber-300">
        {galat[k]}
      </p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-biru-950/70 backdrop-blur-xs animate-fade-in"
        onClick={tutup}
        aria-hidden="true"
      />
      <div
        ref={kartuRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="minat-judul"
        className="relative z-10 w-full max-w-[860px] max-h-[92dvh] overflow-y-auto rounded-3xl bg-biru-950 shadow-soft-xl animate-scale-up"
      >
        <button
          type="button"
          aria-label="Tutup"
          onClick={tutup}
          className="absolute right-3 top-3 z-20 rounded-full bg-putih/10 p-1.5 text-putih hover:bg-putih/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-putih"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="grid md:grid-cols-[5fr_6fr]">
          <div className="hidden md:flex flex-col justify-between gap-6 bg-gradient-to-br from-biru-600 via-biru-800 to-biru-950 p-8 text-putih">
            <p className="text-xs font-bold uppercase tracking-widest text-biru-200">
              Universitas Pignatelli Triputra
            </p>
            <div className="space-y-3">
              <h2 className="font-serif text-3xl lg:text-4xl font-bold leading-tight">
                Open Enrollment
                <span className="block text-biru-200">2026/2027</span>
              </h2>
              <p className="text-sm text-biru-100 leading-relaxed">
                Tinggalkan datamu, tim PMB akan menghubungi untuk membantu
                memilih jalur dan program studi yang paling cocok.
              </p>
            </div>
            <p className="text-xs text-biru-200">
              Unggul, Berintegritas, Inovatif
            </p>
          </div>

          <div className="bg-biru-950 p-6 pt-12 sm:p-8 md:pt-8">
            {sukses ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center text-putih">
                <CheckCircle2 className="h-12 w-12 text-biru-300" />
                <h2 id="minat-judul" className="font-serif text-xl font-bold">
                  Terima kasih, data Anda sudah kami terima
                </h2>
                <p className="text-sm text-biru-200">
                  Tim PMB akan menghubungi Anda melalui WhatsApp atau email.
                </p>
                <button
                  type="button"
                  onClick={tutup}
                  className="mt-2 rounded-xl bg-putih px-6 py-2.5 text-sm font-bold text-biru-950 hover:bg-biru-50"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-3">
                <h2
                  id="minat-judul"
                  className="font-serif text-xl font-bold text-putih pr-8 md:pr-6"
                >
                  Tanya Info PMB
                </h2>
                <div>
                  <label htmlFor="minat-nama" className={label}>
                    Nama Lengkap
                  </label>
                  <input
                    id="minat-nama"
                    autoComplete="name"
                    value={form.nama}
                    onChange={(e) => ubah("nama", e.target.value)}
                    className={`${isian} ${galat.nama ? "border-amber-300" : "border-transparent"}`}
                  />
                  {pesan("nama")}
                </div>
                <div>
                  <label htmlFor="minat-hp" className={label}>
                    Nomor HP/WA
                  </label>
                  <input
                    id="minat-hp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="08xxxxxx"
                    value={form.no_hp}
                    onChange={(e) => ubah("no_hp", e.target.value)}
                    className={`${isian} ${galat.no_hp ? "border-amber-300" : "border-transparent"}`}
                  />
                  {pesan("no_hp")}
                </div>
                <div>
                  <label htmlFor="minat-email" className={label}>
                    Email
                  </label>
                  <input
                    id="minat-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => ubah("email", e.target.value)}
                    className={`${isian} ${galat.email ? "border-amber-300" : "border-transparent"}`}
                  />
                  {pesan("email")}
                </div>
                <div>
                  <span className={label}>Asal Sekolah</span>
                  <AutocompleteSekolah
                    value={form.asal_sekolah}
                    onChange={(v) => ubah("asal_sekolah", v)}
                    invalid={!!galat.asal_sekolah}
                  />
                  {pesan("asal_sekolah")}
                </div>
                <div>
                  <label htmlFor="minat-prodi" className={label}>
                    Program Studi yang Diminati
                  </label>
                  <select
                    id="minat-prodi"
                    value={form.prodi_id}
                    onChange={(e) => ubah("prodi_id", e.target.value)}
                    className={`${isian} ${galat.prodi_id ? "border-amber-300" : "border-transparent"}`}
                  >
                    <option value="">Pilih program studi</option>
                    {prodi.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.jenjang} - {p.nama_prodi}
                      </option>
                    ))}
                  </select>
                  {pesan("prodi_id")}
                </div>
                {galatServer && (
                  <p
                    role="alert"
                    className="text-xs font-semibold text-amber-300"
                  >
                    {galatServer}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={kirim}
                  className="w-full rounded-xl bg-putih py-3 text-sm font-bold text-biru-950 hover:bg-biru-50 disabled:opacity-60"
                >
                  {kirim ? "Mengirim…" : "Tanya Info PMB"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
