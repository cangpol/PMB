import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  GraduationCap,
  FileText,
  Send,
  Monitor,
  Building,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button, Card, CardSkeleton, ErrorState } from "../common";
import { DynamicFormRenderer } from "../form/DynamicFormRenderer";
import type { DefinisiFieldItem } from "../form/DynamicFormRenderer";
import { useToast } from "@/components/ui/useToast";
import { fetchApi, type ApiError } from "@/services/api";
import {
  ambilPilihanAwal,
  cariJalurAwal,
  cariProdiAwal,
  hapusPilihanAwal,
} from "@/lib/pilihanAwal";
import type { components } from "@/types/api";
import { AlurStepper, useAlur } from "./AlurStepper";

type Jalur = components["schemas"]["JalurResponse"];
type Gelombang = components["schemas"]["GelombangResponse"];
type Prodi = components["schemas"]["ProdiResponse"];
type SesiTersedia = components["schemas"]["SesiTersediaItem"];

interface PendaftaranSaya {
  id: string;
  nomor_pendaftaran: string;
  status_pendaftaran: string;
  jalur_id: string;
  gelombang_id: string;
  prodi_pilihan_1: string;
  prodi_pilihan_2?: string | null;
  nama_jalur?: string;
  nama_gelombang?: string;
  nama_prodi_1?: string;
  nama_prodi_2?: string | null;
  data_formulir?: Record<string, unknown>;
}

const SELECT =
  "w-full px-4 py-3 bg-biru-50/50 border border-biru-200 rounded-2xl text-sm text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-600 transition";

const fmtWaktu = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }) + " WIB";

const pesanError = (err: unknown, cadangan: string) => {
  const e = err as ApiError & { message?: string };
  return e.detail?.length
    ? e.detail.join(", ")
    : e.pesan || e.message || cadangan;
};

/**
 * Langkah 3 alur PMB: isi formulir.
 * (1) Jalur, gelombang & prodi -> (2) data diri, sekolah, orang tua -> (3) jadwal seleksi (sesi CBT) & kirim.
 */
export const WizardPendaftaran: React.FC = () => {
  const { toast } = useToast();
  const { alur, muatUlang: muatAlur } = useAlur();

  const [tahap, setTahap] = useState<0 | 1 | 2>(0);
  const [jalurList, setJalurList] = useState<Jalur[]>([]);
  const [gelombangList, setGelombangList] = useState<Gelombang[]>([]);
  const [prodiList, setProdiList] = useState<Prodi[]>([]);
  const [fields, setFields] = useState<DefinisiFieldItem[]>([]);
  const [saya, setSaya] = useState<PendaftaranSaya | null>(null);
  const [sesiList, setSesiList] = useState<SesiTersedia[]>([]);

  const [jalurId, setJalurId] = useState("");
  const [gelombangId, setGelombangId] = useState("");
  const [prodi1, setProdi1] = useState("");
  const [prodi2, setProdi2] = useState("");
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [sesiId, setSesiId] = useState("");
  const [setuju, setSetuju] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const jalurDipilih = jalurList.find((j) => j.id === jalurId);
  const butuhCbt =
    !jalurDipilih || ["CBT", "CAMPURAN"].includes(jalurDipilih.tipe_seleksi);

  const muat = useCallback(async () => {
    try {
      setLoadError(null);
      const [j, g, p, my] = await Promise.all([
        fetchApi<Jalur[]>("/api/master/jalur"),
        fetchApi<Gelombang[]>("/api/master/gelombang"),
        fetchApi<Prodi[]>("/api/master/prodi"),
        fetchApi<PendaftaranSaya>("/api/pendaftaran/my").catch(
          (err: ApiError) => {
            if (err.kode === "DATA_TIDAK_DITEMUKAN") return null;
            throw err;
          },
        ),
      ]);
      setJalurList(j);
      setGelombangList(g);
      setProdiList(p);
      setSaya(my);
      // Jalur/prodi dari website (mis. /register?jalur=rpl) dipakai bila belum
      // pernah memilih; tanpa itu calon wajib memilih sendiri (tidak ada default diam-diam).
      const awal = my ? {} : ambilPilihanAwal();
      setJalurId(my?.jalur_id ?? cariJalurAwal(j, awal.jalur)?.id ?? "");
      setGelombangId(my?.gelombang_id ?? g[0]?.id ?? "");
      setProdi1(my?.prodi_pilihan_1 ?? cariProdiAwal(p, awal.prodi)?.id ?? "");
      setProdi2(my?.prodi_pilihan_2 ?? "");
      setFormValues(my?.data_formulir ?? {});
      // Lanjutkan dari tahap yang belum diisi
      if (my) {
        const adaBiodata =
          my.data_formulir && Object.keys(my.data_formulir).length > 0;
        setTahap(adaBiodata ? 2 : 1);
      }
    } catch (err) {
      setLoadError(pesanError(err, "Gagal memuat formulir pendaftaran."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  // Kolom formulir dinamis mengikuti jalur
  useEffect(() => {
    if (!jalurId) return;
    fetchApi<DefinisiFieldItem[]>(`/api/pendaftaran/fields?jalur_id=${jalurId}`)
      .then(setFields)
      .catch(() => setFields([]));
  }, [jalurId]);

  // Sesi CBT yang bisa dipilih mengikuti gelombang & jalur. Daftar diperbarui
  // berkala & saat tab kembali aktif, agar sesi yang baru dibuka admin langsung tampil.
  const [memuatSesi, setMemuatSesi] = useState(false);
  const muatSesi = useCallback(async () => {
    if (!jalurId || !gelombangId) return;
    setMemuatSesi(true);
    try {
      const list = await fetchApi<SesiTersedia[]>(
        `/api/cbt/sesi-tersedia?gelombang_id=${gelombangId}&jalur_id=${jalurId}`,
      );
      setSesiList(list);
      // Lepaskan pilihan bila sesinya sudah ditutup / berakhir
      setSesiId((id) => (id && !list.some((x) => x.id === id) ? "" : id));
    } catch {
      setSesiList([]);
    } finally {
      setMemuatSesi(false);
    }
  }, [jalurId, gelombangId]);

  useEffect(() => {
    if (tahap !== 2) return;
    muatSesi();
    const interval = window.setInterval(muatSesi, 20_000);
    const saatAktif = () => {
      if (document.visibilityState === "visible") muatSesi();
    };
    document.addEventListener("visibilitychange", saatAktif);
    window.addEventListener("focus", saatAktif);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", saatAktif);
      window.removeEventListener("focus", saatAktif);
    };
  }, [tahap, muatSesi]);

  const sudahDikirim = useMemo(
    () => !!alur && alur.status_pendaftaran !== "DRAFT",
    [alur],
  );

  const simpanPilihan = async () => {
    if (!jalurId || !gelombangId || !prodi1) {
      toast({
        title: "Pilihan belum lengkap",
        description: "Tentukan jalur, gelombang, dan program studi pilihan 1.",
        variant: "peringatan",
      });
      return;
    }
    if (prodi2 && prodi2 === prodi1) {
      toast({
        title: "Pilihan prodi tidak valid",
        description: "Program studi pilihan 1 dan 2 tidak boleh sama.",
        variant: "peringatan",
      });
      return;
    }
    try {
      setIsSaving(true);
      await fetchApi("/api/pendaftaran/pilih-prodi", {
        method: "POST",
        body: JSON.stringify({
          jalur_id: jalurId,
          gelombang_id: gelombangId,
          prodi_pilihan_1: prodi1,
          prodi_pilihan_2: prodi2 || null,
        }),
      });
      hapusPilihanAwal();
      await muat();
      setTahap(1);
    } catch (err) {
      toast({
        title: "Gagal menyimpan pilihan",
        description: pesanError(err, "Terjadi kesalahan."),
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const simpanBiodata = async (data: Record<string, unknown>) => {
    try {
      setIsSaving(true);
      await fetchApi("/api/pendaftaran/submit-dinamis", {
        method: "POST",
        body: JSON.stringify({
          jalur_id: jalurId,
          gelombang_id: gelombangId,
          prodi_pilihan_1: prodi1,
          prodi_pilihan_2: prodi2 || null,
          data,
        }),
      });
      setFormValues(data);
      setTahap(2);
    } catch (err) {
      toast({
        title: "Validasi formulir gagal",
        description: pesanError(err, "Periksa kembali isian formulir Anda."),
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const kirimFormulir = async () => {
    if (butuhCbt && !sesiId) {
      toast({
        title: "Jadwal seleksi belum dipilih",
        description: "Pilih salah satu sesi CBT yang tersedia.",
        variant: "peringatan",
      });
      return;
    }
    try {
      setIsSaving(true);
      // Simpan pilihan sesi bersama data formulir, lalu kunci formulir
      await fetchApi("/api/pendaftaran/submit-dinamis", {
        method: "POST",
        body: JSON.stringify({
          jalur_id: jalurId,
          gelombang_id: gelombangId,
          prodi_pilihan_1: prodi1,
          prodi_pilihan_2: prodi2 || null,
          sesi_ujian_id: sesiId || null,
          data: formValues,
        }),
      });
      const hasil = await fetchApi<{ pesan: string; biaya_gratis?: boolean }>(
        "/api/pendaftaran/finalisasi",
        { method: "POST" },
      );
      toast({
        title: "Formulir terkirim",
        description: hasil.biaya_gratis
          ? "Jalur Anda tanpa biaya formulir. Lanjutkan dengan unggah berkas."
          : "Lanjutkan dengan pembayaran biaya formulir.",
        variant: "success",
      });
      await Promise.all([muat(), muatAlur()]);
    } catch (err) {
      toast({
        title: "Gagal mengirim formulir",
        description: pesanError(err, "Terjadi kesalahan."),
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <CardSkeleton />;
  if (loadError)
    return (
      <ErrorState
        title="Gagal Memuat Formulir"
        message={loadError}
        onRetry={muat}
      />
    );

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-100">
      <div>
        <span className="text-xs font-bold text-biru-800 uppercase tracking-wider block">
          Langkah 3 dari 9
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-1">
          Formulir Pendaftaran
        </h1>
        <p className="text-xs sm:text-sm text-biru-800/80 mt-1">
          Pilihan prodi, jadwal seleksi, data diri, data sekolah, dan data orang
          tua.
        </p>
      </div>
      {saya?.nomor_pendaftaran && (
        <div className="p-3 bg-biru-50 border border-biru-200 rounded-2xl shrink-0">
          <span className="text-[11px] font-bold text-biru-700 block uppercase tracking-wider">
            Nomor Pendaftaran
          </span>
          <span className="font-mono text-base font-bold text-biru-950">
            {saya.nomor_pendaftaran}
          </span>
        </div>
      )}
    </div>
  );

  // Formulir sudah dikirim: tampilkan ringkasan + langkah berikutnya
  if (sudahDikirim && saya) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {header}
        {alur && <AlurStepper alur={alur} />}
        <Card className="p-6 border-biru-200 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-biru-950">
            <CheckCircle2 className="w-5 h-5 text-biru-700" />
            <h2 className="font-serif font-bold text-lg">
              Formulir telah dikirim
            </h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ["Jalur", saya.nama_jalur],
              ["Gelombang", saya.nama_gelombang],
              ["Prodi pilihan 1", saya.nama_prodi_1],
              ["Prodi pilihan 2", saya.nama_prodi_2 || "-"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="p-3 rounded-xl bg-biru-50/60 border border-biru-100"
              >
                <dt className="text-[11px] text-biru-700">{k}</dt>
                <dd className="font-bold text-biru-950">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-biru-800">
            Formulir terkunci setelah dikirim. Hubungi panitia PMB bila ada data
            yang perlu diperbaiki.
          </p>
          <a
            href={`/api/pendaftaran/${saya.id}/cetak/bukti-pendaftaran`}
            target="_blank"
            rel="noreferrer"
            className="inline-block"
          >
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" /> Unduh Bukti Pendaftaran (PDF)
            </Button>
          </a>
        </Card>
      </div>
    );
  }

  const daftarTahap = [
    { judul: "Jalur & Prodi", icon: GraduationCap },
    { judul: "Data Diri, Sekolah & Orang Tua", icon: FileText },
    { judul: "Jadwal Seleksi & Kirim", icon: CalendarClock },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {header}

      <ol className="grid grid-cols-3 gap-2" aria-label="Bagian formulir">
        {daftarTahap.map((t, i) => {
          const Icon = t.icon;
          const aktif = i === tahap;
          const lewat = i < tahap;
          return (
            <li
              key={t.judul}
              aria-current={aktif ? "step" : undefined}
              className={`flex items-center gap-2 p-3 rounded-2xl border text-xs ${
                aktif
                  ? "border-biru-700 bg-biru-50 font-bold text-biru-950"
                  : lewat
                    ? "border-biru-200 text-biru-800"
                    : "border-biru-100 text-biru-400"
              }`}
            >
              {lewat ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <Icon className="w-4 h-4 shrink-0" />
              )}
              <span>
                {i + 1}. {t.judul}
              </span>
            </li>
          );
        })}
      </ol>

      {tahap === 0 && (
        <Card className="p-6 sm:p-8 border-biru-200 rounded-3xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="space-y-2 block">
              <span className="text-xs font-bold text-biru-950 uppercase tracking-wider">
                Jalur masuk *
              </span>
              <select
                value={jalurId}
                onChange={(e) => setJalurId(e.target.value)}
                className={SELECT}
              >
                <option value="" disabled>
                  -- Pilih jalur masuk --
                </option>
                {jalurList.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nama_jalur} - formulir Rp{" "}
                    {j.biaya_formulir.toLocaleString("id-ID")}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 block">
              <span className="text-xs font-bold text-biru-950 uppercase tracking-wider">
                Gelombang *
              </span>
              <select
                value={gelombangId}
                onChange={(e) => setGelombangId(e.target.value)}
                className={SELECT}
              >
                {gelombangList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama_gelombang}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 block">
              <span className="text-xs font-bold text-biru-950 uppercase tracking-wider">
                Program studi pilihan 1 *
              </span>
              <select
                value={prodi1}
                onChange={(e) => setProdi1(e.target.value)}
                className={SELECT}
              >
                <option value="">-- Pilih program studi --</option>
                {prodiList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.jenjang} {p.nama_prodi}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 block">
              <span className="text-xs font-bold text-biru-950 uppercase tracking-wider">
                Program studi pilihan 2
              </span>
              <select
                value={prodi2}
                onChange={(e) => setProdi2(e.target.value)}
                className={SELECT}
              >
                <option value="">-- Tidak memilih --</option>
                {prodiList
                  .filter((p) => p.id !== prodi1)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.jenjang} {p.nama_prodi}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          {gelombangList.length === 0 && (
            <p className="flex items-center gap-2 text-xs text-biru-900 p-3 rounded-xl bg-biru-50 border border-biru-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Belum ada gelombang pendaftaran yang dibuka.
            </p>
          )}
          <div className="flex justify-end pt-4 border-t border-biru-100">
            <Button
              variant="primary"
              onClick={simpanPilihan}
              disabled={isSaving || !prodi1 || gelombangList.length === 0}
              className="gap-2"
            >
              {isSaving ? "Menyimpan..." : "Simpan & Lanjutkan"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {tahap === 1 && (
        <Card className="p-6 sm:p-8 border-biru-200 rounded-3xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-bold text-biru-950">
              Data diri, data sekolah & data orang tua
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTahap(0)}
              className="gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali
            </Button>
          </div>
          <DynamicFormRenderer
            fields={fields}
            defaultValues={formValues}
            onSubmit={simpanBiodata}
            isSubmitting={isSaving}
            submitButtonText="Simpan & Pilih Jadwal Seleksi"
          />
        </Card>
      )}

      {tahap === 2 && (
        <Card className="p-6 sm:p-8 border-biru-200 rounded-3xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-bold text-biru-950">
              Jadwal seleksi (sesi CBT)
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTahap(1)}
              className="gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali
            </Button>
          </div>

          {butuhCbt && (
            <div className="flex items-center justify-between gap-2 text-[11px] text-biru-800">
              <span>Daftar sesi diperbarui otomatis.</span>
              <button
                type="button"
                onClick={muatSesi}
                disabled={memuatSesi}
                className="inline-flex items-center gap-1 font-bold text-biru-800 hover:text-biru-950 disabled:opacity-60"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${memuatSesi ? "animate-spin" : ""}`}
                  aria-hidden
                />
                Muat ulang
              </button>
            </div>
          )}

          {butuhCbt ? (
            sesiList.length === 0 ? (
              <p className="flex items-center gap-2 text-xs text-biru-900 p-3 rounded-xl bg-biru-50 border border-biru-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Belum ada sesi CBT yang dibuka untuk jalur & gelombang ini.
                Silakan cek kembali nanti atau hubungi panitia PMB.
              </p>
            ) : (
              <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <legend className="sr-only">Pilih sesi CBT</legend>
                {sesiList.map((s) => {
                  const sisa = s.kuota - s.terisi;
                  const penuh = sisa <= 0;
                  const ModeIcon = s.mode === "ONLINE" ? Monitor : Building;
                  return (
                    <label
                      key={s.id}
                      className={`flex gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                        sesiId === s.id
                          ? "border-biru-700 bg-biru-50"
                          : "border-biru-200 hover:border-biru-400"
                      } ${penuh ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <input
                        type="radio"
                        name="sesi"
                        value={s.id}
                        checked={sesiId === s.id}
                        disabled={penuh}
                        onChange={() => setSesiId(s.id)}
                        className="mt-1 accent-biru-700"
                      />
                      <span className="space-y-1 text-xs text-biru-900">
                        <span className="block text-sm font-bold text-biru-950">
                          {s.nama_sesi}
                        </span>
                        <span className="block">
                          {fmtWaktu(s.jadwal_mulai)} s.d.{" "}
                          {fmtWaktu(s.jadwal_selesai)} WIB
                        </span>
                        {new Date(s.jadwal_mulai).getTime() <= Date.now() && (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            Sedang berlangsung
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <ModeIcon className="w-3.5 h-3.5" />
                          {s.mode === "ONLINE"
                            ? "Online dari rumah"
                            : `Di kampus - ${s.ruang}`}
                        </span>
                        <span className="block font-semibold">
                          {penuh ? "Kuota penuh" : `Sisa kuota: ${sisa}`}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            )
          ) : (
            <p className="text-xs text-biru-900 p-3 rounded-xl bg-biru-50 border border-biru-200">
              Jalur {jalurDipilih?.nama_jalur} diseleksi tanpa CBT. Jadwal
              pengumuman mengikuti gelombang pendaftaran.
            </p>
          )}

          <label className="flex items-start gap-2 text-xs text-biru-900">
            <input
              type="checkbox"
              checked={setuju}
              onChange={(e) => setSetuju(e.target.checked)}
              className="mt-0.5 accent-biru-700"
            />
            <span>
              Saya menyatakan data yang saya isi benar. Setelah dikirim,
              formulir terkunci dan tidak dapat diubah lagi.
            </span>
          </label>

          <div className="flex justify-end pt-4 border-t border-biru-100">
            <Button
              variant="primary"
              onClick={kirimFormulir}
              disabled={isSaving || !setuju || (butuhCbt && !sesiId)}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {isSaving ? "Mengirim..." : "Kirim Formulir"}
            </Button>
          </div>
          <p className="text-[11px] text-biru-700 text-right">
            {jalurDipilih?.biaya_formulir === 0 ? (
              <>
                Jalur ini tanpa biaya formulir. Setelah terkirim:{" "}
                <Link to="/portal/berkas" className="underline">
                  unggah berkas
                </Link>
                .
              </>
            ) : (
              <>
                Setelah terkirim:{" "}
                <Link to="/portal/pembayaran" className="underline">
                  bayar biaya formulir
                </Link>{" "}
                lalu unggah buktinya.
              </>
            )}
          </p>
        </Card>
      )}
    </div>
  );
};
