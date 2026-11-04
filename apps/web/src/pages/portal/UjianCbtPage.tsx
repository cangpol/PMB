import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  Wifi,
  WifiOff,
  ShieldAlert,
  FileCheck2,
} from "lucide-react";
import {
  Button,
  Card,
  StatusBadge,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";
import { fetchApi, type ApiError } from "@/services/api";
import { useToast } from "@/components/ui/useToast";
import {
  useCbtAntiCheat,
  type JenisPelanggaran,
} from "@/hooks/useCbtAntiCheat";
import type { components } from "@/types/api";

type SesiCalonInfo = components["schemas"]["SesiCalonInfoResponse"];
type MulaiUjianCbtResponse = components["schemas"]["MulaiUjianCbtResponse"];
type SoalCbtPeserta = components["schemas"]["SoalCbtPesertaResponse"];
type AutosaveResponse = components["schemas"]["AutosaveJawabanResponse"];
type SubmitUjianResponse = components["schemas"]["SubmitUjianResponse"];

export const UjianCbtPage: React.FC = () => {
  const { toast } = useToast();

  // State Utama Sesi
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sesiInfo, setSesiInfo] = useState<SesiCalonInfo | null>(null);

  // State Pengerjaan Ujian
  const [ujianActive, setUjianActive] = useState<boolean>(false);
  const [soalList, setSoalList] = useState<SoalCbtPeserta[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [jawabanMap, setJawabanMap] = useState<
    Record<string, { pilihan?: string; ragu_ragu: boolean }>
  >({});
  const [sisaDetik, setSisaDetik] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasilUjian, setHasilUjian] = useState<SubmitUjianResponse | null>(
    null,
  );

  // Ref untuk interval timer server
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Monitor status koneksi internet browser
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 1. Fetch Informasi Sesi Calon
  const loadMySesi = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<SesiCalonInfo>("/api/cbt/my-sesi");
      setSesiInfo(res);

      // Jika peserta ternyata sedang mengerjakan, langsung otomatis pulihkan sesi
      if (res.status_ujian === "SEDANG_MENGERJAKAN") {
        await startOrResumeExam();
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr.pesan || "Gagal memuat jadwal sesi ujian Anda");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMySesi();
  }, [loadMySesi]);

  // 2. Mulai atau Lanjutkan Ujian
  const startOrResumeExam = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<MulaiUjianCbtResponse>("/api/cbt/mulai", {
        method: "POST",
      });

      const rawSoal = res.daftar_soal || [];
      setSoalList(rawSoal);
      setSisaDetik(res.sisa_detik);

      // Inisialisasi peta jawaban dari server
      const initialMap: Record<
        string,
        { pilihan?: string; ragu_ragu: boolean }
      > = {};
      rawSoal.forEach((s: SoalCbtPeserta) => {
        initialMap[s.id] = {
          pilihan: s.jawaban_terpilih || undefined,
          ragu_ragu: s.ragu_ragu || false,
        };
      });
      setJawabanMap(initialMap);
      setUjianActive(true);
      setCurrentIndex(0);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Gagal Membuka Ujian",
        description:
          apiErr.pesan || "Terjadi kesalahan saat memulai sesi ujian",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 3. Interval Hitung Mundur Waktu Server
  useEffect(() => {
    if (!ujianActive || sisaDetik <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSisaDetik((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmitOnExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ujianActive, sisaDetik]);

  // 4. Autosave Jawaban ke Server & LocalStorage Fallback
  const handlePilihJawaban = async (soalId: string, opsiKey: string) => {
    const current = jawabanMap[soalId] || { ragu_ragu: false };
    const updated = { ...current, pilihan: opsiKey };

    // Optimistic UI update
    setJawabanMap((prev) => ({ ...prev, [soalId]: updated }));

    // Simpan ke localStorage sebagai backup offline
    try {
      const offlineCacheKey = `cbt_backup_${sesiInfo?.nomor_peserta || "active"}`;
      const cached = JSON.parse(localStorage.getItem(offlineCacheKey) || "{}");
      cached[soalId] = updated;
      localStorage.setItem(offlineCacheKey, JSON.stringify(cached));
    } catch {
      // Ignored
    }

    // Kirim autosave ke backend
    try {
      setIsSyncing(true);
      const res = await fetchApi<AutosaveResponse>("/api/cbt/autosave", {
        method: "POST",
        body: JSON.stringify({
          soal_id: soalId,
          pilihan_jawaban: opsiKey,
          ragu_ragu: updated.ragu_ragu,
        }),
      });
      // Sinkronkan sisa detik dari server otoritatif
      if (res.sisa_detik) {
        setSisaDetik(res.sisa_detik);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.pesan?.includes("habis")) {
        toast({
          title: "Waktu Habis",
          description: "Waktu ujian telah habis di server.",
          type: "error",
        });
        handleAutoSubmitOnExpiry();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleRagu = async (soalId: string) => {
    const current = jawabanMap[soalId] || { ragu_ragu: false };
    const updated = { ...current, ragu_ragu: !current.ragu_ragu };

    setJawabanMap((prev) => ({ ...prev, [soalId]: updated }));

    try {
      setIsSyncing(true);
      await fetchApi<AutosaveResponse>("/api/cbt/autosave", {
        method: "POST",
        body: JSON.stringify({
          soal_id: soalId,
          pilihan_jawaban: updated.pilihan,
          ragu_ragu: updated.ragu_ragu,
        }),
      });
    } catch {
      // Ignored offline
    } finally {
      setIsSyncing(false);
    }
  };

  // 5. Submit Akhir Ujian (Manual atau Auto saat Waktu Habis)
  const handleSubmitUjian = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetchApi<SubmitUjianResponse>("/api/cbt/submit", {
        method: "POST",
      });
      setHasilUjian(res);
      setUjianActive(false);
      setShowSubmitModal(false);
      toast({
        title: "Ujian Selesai",
        description: "Jawaban Anda telah berhasil dikumpulkan dan dinilai.",
      });
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast({
        title: "Gagal Mengumpulkan Ujian",
        description: apiErr.pesan || "Terjadi kesalahan saat submit ujian.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmitOnExpiry = useCallback(async () => {
    try {
      setIsSubmitting(true);
      const res = await fetchApi<SubmitUjianResponse>("/api/cbt/submit", {
        method: "POST",
      });
      setHasilUjian(res);
      setUjianActive(false);
      setShowSubmitModal(false);
      toast({
        title: "Waktu Ujian Habis",
        description: "Jawaban Anda otomatis dikumpulkan oleh sistem server.",
        type: "error",
      });
    } catch {
      // Jika server sudah otomatis menutup, muat ulang info sesi
      loadMySesi();
    } finally {
      setIsSubmitting(false);
    }
  }, [loadMySesi, toast]);

  // 6. Pengawasan integritas: klien melapor, server menghitung & memutuskan
  const [pelanggaran, setPelanggaran] = useState<{
    total: number;
    batas: number;
  }>({ total: 0, batas: 5 });

  const handlePelanggaran = useCallback(
    async (jenis: JenisPelanggaran, detail?: string) => {
      try {
        const res = await fetchApi<{
          total_pelanggaran: number;
          batas_pelanggaran: number;
          auto_submitted: boolean;
        }>("/api/cbt/pelanggaran", {
          method: "POST",
          body: JSON.stringify({ jenis, detail }),
        });
        setPelanggaran({
          total: res.total_pelanggaran,
          batas: res.batas_pelanggaran,
        });
        if (res.auto_submitted) {
          toast({
            title: "Ujian Dihentikan",
            description:
              "Pelanggaran tata tertib melebihi batas. Jawaban dikumpulkan otomatis.",
            type: "error",
          });
          await handleAutoSubmitOnExpiry();
        } else {
          toast({
            title: `Peringatan ${res.total_pelanggaran}/${res.batas_pelanggaran}`,
            description:
              "Aktivitas mencurigakan terdeteksi dan dicatat. Tetap fokus pada layar ujian.",
            type: "error",
          });
        }
      } catch {
        // Gagal lapor (mis. offline) tidak boleh mengganggu peserta
      }
    },
    [handleAutoSubmitOnExpiry, toast],
  );

  const { isFullscreen, masukFullscreen } = useCbtAntiCheat({
    aktif: ujianActive,
    onPelanggaran: handlePelanggaran,
  });

  // Format detik ke format mm:ss atau hh:mm:ss
  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const h = Math.floor(m / 60);
    const remM = m % 60;

    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${remM.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Hitung jumlah jawaban
  const totalDijawab = Object.values(jawabanMap).filter(
    (j) => j.pilihan,
  ).length;
  const totalRagu = Object.values(jawabanMap).filter((j) => j.ragu_ragu).length;
  const totalSoal = soalList.length;

  // =========================================================================
  // VIEW: LOADING / SKELETON
  // =========================================================================
  if (loading && !ujianActive) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  // =========================================================================
  // VIEW: ERROR STATE
  // =========================================================================
  if (error && !sesiInfo) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <ErrorState
          title="Tidak Ada Sesi Ujian"
          message={error}
          onRetry={loadMySesi}
        />
        <div className="mt-6 text-center">
          <Link to="/portal/dashboard">
            <Button variant="outline">Kembali ke Dashboard Calon</Button>
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: UJIAN SELESAI / HASIL
  // =========================================================================
  if (hasilUjian || sesiInfo?.status_ujian === "SELESAI") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Card className="text-center p-8 bg-white border border-biru-200 shadow-sm">
          <div className="w-16 h-16 bg-biru-50 text-biru-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-serif font-bold text-biru-950 mb-2">
            Ujian CBT Selesai Dikerjakan
          </h2>
          <p className="text-slate-600 max-w-lg mx-auto mb-8 text-sm">
            Terima kasih atas partisipasi Anda dalam Ujian Computer-Based Test
            (CBT) Seleksi Penerimaan Mahasiswa Baru Universitas Pignatelli
            Triputra. Seluruh jawaban telah tersimpan dengan aman di server.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl mx-auto mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Total Soal
              </p>
              <p className="text-xl font-bold text-biru-950">
                {hasilUjian?.total_soal || sesiInfo?.total_soal || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Dijawab
              </p>
              <p className="text-xl font-bold text-biru-600">
                {hasilUjian?.total_dijawab ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Status
              </p>
              <p className="text-sm font-semibold text-emerald-600 mt-1">
                Tersimpan
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Hasil Akhir
              </p>
              <p className="text-sm font-semibold text-biru-950 mt-1">
                Sesuai Jadwal
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/portal/dashboard">
              <Button variant="primary" className="w-full sm:w-auto">
                Kembali ke Dashboard Utama
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // VIEW: GATEKEEPER PRESENSI (BELUM HADIR DI MEJA PENGAWAS)
  // =========================================================================
  if (sesiInfo && sesiInfo.status_presensi !== "HADIR") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Card className="p-8 border-l-4 border-l-amber-500 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-100 text-amber-800 mb-2">
                Presensi Diperlukan
              </span>
              <h2 className="text-xl font-serif font-bold text-biru-950 mb-2">
                Akses Ujian CBT Masih Terkunci
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Untuk menjaga integritas dan ketertiban pelaksanaan ujian, modul
                CBT online hanya dapat dibuka setelah Anda melakukan verifikasi
                kehadiran di hadapan Pengawas Ujian PMB.
              </p>

              {/* Detail Sesi Ujian */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 text-sm mb-6">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Sesi Ujian:</span>
                  <span className="font-semibold text-biru-950">
                    {sesiInfo.nama_sesi || "Sesi CBT PMB"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Nomor Peserta:</span>
                  <span className="font-mono font-semibold text-biru-950">
                    {sesiInfo.nomor_peserta}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Jadwal Sesi:</span>
                  <span className="font-semibold text-biru-950">
                    {sesiInfo.nama_sesi || "Sesi Reguler PMB"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Ruangan Ujian:</span>
                  <span className="font-semibold text-biru-950">
                    {sesiInfo.ruang || "Lab Komputer CBT"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Kehadiran:</span>
                  <StatusBadge
                    status={
                      sesiInfo.status_presensi === "BELUM_HADIR"
                        ? "DRAFT"
                        : "LUNAS"
                    }
                  />
                </div>
              </div>

              <div className="bg-biru-50 border border-biru-200 p-4 rounded-xl text-xs text-biru-900 mb-6 flex items-start gap-3">
                <FileCheck2 className="w-5 h-5 text-biru-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Instruksi:</strong> Tunjukkan Kartu Peserta Ujian yang
                  memuat kode QR resmi kepada pengawas di meja presensi. Setelah
                  pengawas melakukan scan, klik tombol{" "}
                  <em>Periksa Ulang Kehadiran</em> di bawah ini.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  variant="primary"
                  onClick={loadMySesi}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <RotateCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Periksa Ulang Kehadiran
                </Button>
                <Link to="/portal/dashboard" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full">
                    Kembali ke Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // VIEW: BRIEFING SEBELUM MULAI (SUDAH HADIR TAPI BELUM MULAI)
  // =========================================================================
  if (sesiInfo && !ujianActive) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Card className="p-8 border border-biru-200 bg-white shadow-sm">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full mb-3">
              Kehadiran Terverifikasi ✓
            </span>
            <h1 className="text-2xl font-serif font-bold text-biru-950 mb-2">
              Ujian Seleksi CBT PMB
            </h1>
            <p className="text-slate-600 text-sm">
              Universitas Pignatelli Triputra menyelenggarakan tes ini dengan
              standar transparansi dan akuntabilitas tinggi.
            </p>
          </div>

          {/* Ringkasan Parameter Ujian */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 bg-slate-50 p-5 rounded-xl border border-slate-200 text-sm">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Durasi Ujian
              </p>
              <p className="font-semibold text-biru-950 text-base mt-0.5">
                {sesiInfo.durasi_menit || 90} Menit
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Ruangan
              </p>
              <p className="font-semibold text-biru-950 text-base mt-0.5">
                {sesiInfo.ruang || "Lab CBT"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Otoritas Timer
              </p>
              <p className="font-semibold text-emerald-700 text-base mt-0.5">
                Server Terpusat
              </p>
            </div>
          </div>

          {/* Tata Tertib Ujian */}
          <div className="space-y-3 mb-8 text-sm text-slate-600">
            <h3 className="font-semibold text-biru-950">
              Petunjuk & Tata Tertib Pengerjaan:
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
              <li>
                Timer dihitung secara terpusat oleh server. Jika peramban
                ditutup atau koneksi terputus, timer tetap berjalan.
              </li>
              <li>
                Setiap pilihan jawaban otomatis tersimpan (autosave) secara
                real-time saat diklik.
              </li>
              <li>
                Gunakan tombol <em>Tandai Ragu-ragu</em> bila Anda ingin
                memeriksa kembali soal sebelum submit akhir.
              </li>
              <li>
                Jika batas waktu berakhir, seluruh jawaban yang telah dipilih
                akan otomatis dikumpulkan oleh sistem.
              </li>
              <li>
                Ujian berjalan dalam mode layar penuh. Berpindah tab/jendela,
                keluar layar penuh, menyalin/menempel, klik kanan, membuka
                developer tools, atau mencetak akan <strong>dicatat</strong>.
                Setelah 5 pelanggaran, ujian otomatis dikumpulkan.
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Link to="/portal/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                Batal & Keluar
              </Button>
            </Link>
            <Button
              variant="primary"
              onClick={async () => {
                await masukFullscreen();
                await startOrResumeExam();
              }}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" /> Menyiapkan
                  Ujian...
                </>
              ) : (
                <>
                  Mulai Kerjakan Sekarang <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // VIEW: ANTARMUKA UJIAN AKTIF (FOKUS & TENANG)
  // =========================================================================
  const currentSoal = soalList[currentIndex];
  const currentJawaban = currentSoal ? jawabanMap[currentSoal.id] : undefined;
  const isTimeCritical = sisaDetik <= 300; // < 5 menit

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col select-none">
      {/* Gerbang layar penuh: soal disembunyikan sampai peserta kembali fullscreen */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-[60] bg-biru-950/95 flex items-center justify-center p-6 text-center">
          <div className="max-w-md text-white space-y-4">
            <ShieldAlert className="w-12 h-12 mx-auto text-amber-400" />
            <h2 className="text-xl font-serif font-bold">
              Mode Layar Penuh Diperlukan
            </h2>
            <p className="text-sm text-biru-100 leading-relaxed">
              Soal disembunyikan hingga Anda kembali ke layar penuh. Waktu ujian
              tetap berjalan di server.
            </p>
            <Button variant="primary" onClick={masukFullscreen}>
              Kembali ke Layar Penuh
            </Button>
          </div>
        </div>
      )}
      {pelanggaran.total > 0 && (
        <div className="bg-rose-600 text-white text-xs text-center py-1.5 font-semibold">
          Peringatan integritas: {pelanggaran.total}/{pelanggaran.batas}{" "}
          pelanggaran tercatat. Ujian otomatis berakhir pada batas maksimum.
        </div>
      )}
      {/* Top Bar Ujian: Timer & Indikator Sinkronisasi */}
      <header className="sticky top-0 z-30 bg-biru-950 text-white shadow-md border-b border-biru-900 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-biru-100 uppercase">
              {sesiInfo?.nama_sesi || "Ujian Seleksi PMB CBT"}
            </h1>
            <p className="text-xs text-biru-300 font-mono">
              Peserta: {sesiInfo?.nomor_peserta}
            </p>
          </div>

          {/* Indikator Status & Countdown Timer Server */}
          <div className="flex items-center gap-4">
            {/* Status Sync */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-biru-200">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-rose-400" />
              )}
              <span>{isSyncing ? "Menyimpan..." : "Tersinkronisasi"}</span>
            </div>

            {/* Countdown Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-base transition-colors ${
                isTimeCritical
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-biru-900 text-biru-50 border border-biru-700"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTimer(sisaDetik)}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSubmitModal(true)}
              className="bg-transparent border-biru-700 text-white hover:bg-biru-900"
            >
              Selesai
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace Ujian */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Butir Soal & Pilihan Jawaban (8 Kolom) */}
        <section className="lg:col-span-8 space-y-4">
          {currentSoal ? (
            <Card className="p-6 sm:p-8 bg-white border border-slate-200 shadow-sm flex flex-col justify-between min-h-[500px]">
              <div>
                {/* Header Soal */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-biru-950">
                      Soal No. {currentIndex + 1}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-biru-50 text-biru-700 font-semibold uppercase">
                      {currentSoal.kategori}
                    </span>
                    <span className="text-xs text-slate-400">
                      Bobot: {currentSoal.bobot}
                    </span>
                  </div>

                  {/* Tombol Ragu-ragu */}
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none text-slate-700 hover:text-amber-700">
                    <input
                      type="checkbox"
                      checked={currentJawaban?.ragu_ragu || false}
                      onChange={() => handleToggleRagu(currentSoal.id)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span
                      className={
                        currentJawaban?.ragu_ragu
                          ? "text-amber-600 font-bold"
                          : ""
                      }
                    >
                      Ragu-ragu
                    </span>
                  </label>
                </div>

                {/* Teks Pertanyaan */}
                <div className="text-slate-800 text-base leading-relaxed mb-6 font-sans">
                  {currentSoal.pertanyaan}
                </div>

                {/* Gambar Soal (Jika Ada) */}
                {currentSoal.gambar_url && (
                  <div className="mb-6 max-h-64 overflow-hidden rounded-lg border border-slate-200">
                    <img
                      src={currentSoal.gambar_url}
                      alt={`Gambar Soal ${currentIndex + 1}`}
                      className="object-contain w-full h-full"
                    />
                  </div>
                )}

                {/* Daftar Opsi Jawaban */}
                <div className="space-y-3 mb-8">
                  {currentSoal.opsi_jawaban.map((opsi) => {
                    const optionKey = (opsi as any).id || opsi.label;
                    const isSelected = currentJawaban?.pilihan === optionKey;
                    return (
                      <button
                        key={optionKey}
                        type="button"
                        onClick={() =>
                          handlePilihJawaban(currentSoal.id, optionKey)
                        }
                        className={`w-full text-left p-4 rounded-xl border flex items-start gap-4 transition-all ${
                          isSelected
                            ? "border-biru-600 bg-biru-50/70 text-biru-950 font-medium shadow-sm ring-1 ring-biru-600"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                            isSelected
                              ? "bg-biru-600 text-white"
                              : "bg-slate-100 text-slate-600 border border-slate-300"
                          }`}
                        >
                          {opsi.label}
                        </span>
                        <span className="flex-1 mt-1 text-sm leading-relaxed">
                          {opsi.teks}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigasi Bawah */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentIndex === 0}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Sebelumnya
                </Button>

                <span className="text-xs text-slate-500">
                  {currentIndex + 1} dari {totalSoal} Soal
                </span>

                {currentIndex < totalSoal - 1 ? (
                  <Button
                    variant="primary"
                    onClick={() =>
                      setCurrentIndex((prev) =>
                        Math.min(totalSoal - 1, prev + 1),
                      )
                    }
                    className="flex items-center gap-2"
                  >
                    Selanjutnya <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => setShowSubmitModal(true)}
                    className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800"
                  >
                    Kumpulkan <CheckCircle2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <EmptyState
              title="Soal Tidak Ditemukan"
              description="Daftar butir soal belum dimuat."
            />
          )}
        </section>

        {/* Kolom Kanan: Kisi Nomor Navigasi Soal (4 Kolom) */}
        <aside className="lg:col-span-4 space-y-4">
          <Card className="p-5 bg-white border border-slate-200 shadow-sm sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="font-semibold text-biru-950 text-sm">
                Navigasi Nomor Soal
              </h3>
              <span className="text-xs font-mono font-medium text-slate-500">
                {totalDijawab}/{totalSoal} Terjawab
              </span>
            </div>

            {/* Grid Tombol Soal */}
            <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1 mb-6">
              {soalList.map((soal, idx) => {
                const jwb = jawabanMap[soal.id];
                const isSelected = jwb && jwb.pilihan;
                const isRagu = jwb && jwb.ragu_ragu;
                const isCurrent = idx === currentIndex;

                let btnStyle =
                  "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
                if (isSelected) {
                  btnStyle = "bg-biru-600 text-white border-biru-700";
                }
                if (isRagu) {
                  btnStyle = "bg-amber-500 text-white border-amber-600";
                }
                if (isCurrent) {
                  btnStyle += " ring-2 ring-biru-950 ring-offset-1 font-bold";
                }

                return (
                  <button
                    key={soal.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-lg border text-xs font-medium flex items-center justify-center transition-all ${btnStyle}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legenda Status Warna */}
            <div className="border-t border-slate-200 pt-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-biru-600 shrink-0" />
                <span>Sudah Dijawab ({totalDijawab})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-500 shrink-0" />
                <span>Ragu-ragu ({totalRagu})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300 shrink-0" />
                <span>Belum Dijawab ({totalSoal - totalDijawab})</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSubmitModal(true)}
                className="w-full flex items-center justify-center gap-2 border-biru-600 text-biru-700 hover:bg-biru-50"
              >
                Selesaikan Ujian Sekarang
              </Button>
            </div>
          </Card>
        </aside>
      </main>

      {/* Modal Konfirmasi Selesai Ujian */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-white shadow-xl border border-slate-200 rounded-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-serif font-bold text-biru-950 text-center mb-2">
              Konfirmasi Pengumpulan Jawaban
            </h3>
            <p className="text-xs text-slate-600 text-center mb-6">
              Apakah Anda yakin ingin mengakhiri sesi ujian ini? Setelah
              disubmit, jawaban tidak dapat diubah kembali.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Butir Soal:</span>
                <span className="font-semibold text-biru-950">{totalSoal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Soal Terjawab:</span>
                <span className="font-semibold text-emerald-700">
                  {totalDijawab}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Masih Ragu-ragu:</span>
                <span
                  className={`font-semibold ${totalRagu > 0 ? "text-amber-600" : "text-slate-600"}`}
                >
                  {totalRagu}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Belum Dijawab:</span>
                <span
                  className={`font-semibold ${totalSoal - totalDijawab > 0 ? "text-rose-600" : "text-slate-600"}`}
                >
                  {totalSoal - totalDijawab}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Kembali Periksa
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitUjian}
                disabled={isSubmitting}
                className="flex-1 bg-biru-600 hover:bg-biru-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin mr-1" />{" "}
                    Mengirim...
                  </>
                ) : (
                  "Ya, Kumpulkan"
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
