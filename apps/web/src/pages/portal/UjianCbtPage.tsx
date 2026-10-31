import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Award,
} from "lucide-react";
import {
  Button,
  Card,
  StatusBadge,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";

interface SoalItem {
  id: number;
  pertanyaan: string;
  pilihan: { key: string; text: string }[];
}

const DAFTAR_SOAL_MOCK: SoalItem[] = [
  {
    id: 1,
    pertanyaan: "Jika 3x + 7 = 22, maka nilai dari 2x - 3 adalah...",
    pilihan: [
      { key: "A", text: "5" },
      { key: "B", text: "7" },
      { key: "C", text: "9" },
      { key: "D", text: "11" },
    ],
  },
  {
    id: 2,
    pertanyaan:
      "Semua mahasiswa Universitas Pignatelli Triputra memiliki kartu identitas. Sebagian peserta magang adalah mahasiswa. Kesimpulan yang tepat adalah...",
    pilihan: [
      { key: "A", text: "Semua peserta magang memiliki kartu identitas" },
      { key: "B", text: "Sebagian peserta magang memiliki kartu identitas" },
      { key: "C", text: "Semua mahasiswa adalah peserta magang" },
      {
        key: "D",
        text: "Tidak ada peserta magang yang memiliki kartu identitas",
      },
    ],
  },
  {
    id: 3,
    pertanyaan:
      "Manakah dari struktur data berikut yang menerapkan prinsip First-In, First-Out (FIFO)?",
    pilihan: [
      { key: "A", text: "Stack (Tumpukan)" },
      { key: "B", text: "Queue (Antrean)" },
      { key: "C", text: "Binary Search Tree" },
      { key: "D", text: "Hash Map" },
    ],
  },
  {
    id: 4,
    pertanyaan:
      'Choose the most appropriate word: "The university decided to _____ the scholarship quota due to the high number of qualified applicants."',
    pilihan: [
      { key: "A", text: "expand" },
      { key: "B", text: "prevent" },
      { key: "C", text: "diminish" },
      { key: "D", text: "withdraw" },
    ],
  },
];

export const UjianCbtPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [jawaban, setJawaban] = useState<Record<number, string>>({
    1: "B",
    2: "B",
  });
  const [timeLeft, setTimeLeft] = useState<number>(3540); // 59 menit
  const [isFinished, setIsFinished] = useState<boolean>(false);

  useEffect(() => {
    if (!isStarted || isFinished) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isStarted, isFinished]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (key: string) => {
    setJawaban((prev) => ({ ...prev, [DAFTAR_SOAL_MOCK[currentIdx].id]: key }));
  };

  const handleFinish = () => {
    setIsFinished(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-200">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Computer-Based Test (CBT) Daring
          </h1>
          <p className="text-xs text-biru-800">
            Tes Potensi Skolastik & Kemampuan Dasar Akademik PMB 2026
          </p>
        </div>
        <StatusBadge
          status={
            isFinished ? "berhasil" : isStarted ? "menunggu" : "peringatan"
          }
          label={
            isFinished
              ? "Ujian Selesai (Skor 85.0)"
              : isStarted
                ? "Ujian Berlangsung"
                : "Siap Mulai Ujian"
          }
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <ErrorState
          title="Gagal Memuat Soal CBT"
          message="Terjadi gangguan saat mengambil bank soal ujian online."
          onRetry={() => {
            setIsError(false);
            setIsLoading(false);
          }}
        />
      )}

      {/* Empty State */}
      {!isLoading && !isError && DAFTAR_SOAL_MOCK.length === 0 && (
        <EmptyState
          title="Bank Soal Belum Tersedia"
          description="Sesi ujian online belum memiliki daftar butir soal aktif."
        />
      )}

      {!isStarted && !isFinished && (
        <Card className="border-2 border-biru-200 shadow-md space-y-6">
          <div className="space-y-3 pb-4 border-b border-biru-100">
            <h2 className="font-serif text-2xl font-bold text-biru-950">
              Petunjuk Teknis Pelaksanaan Ujian
            </h2>
            <p className="text-sm text-biru-800 leading-relaxed font-light">
              Ujian CBT terdiri dari 40 soal pilihan ganda meliputi kemampuan
              penalaran logis, numerik, bahasa Indonesia, dan pemahaman bahasa
              Inggris dasar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-biru-50/60 border border-biru-100 space-y-1">
              <span className="text-biru-800 block">Durasi Ujian</span>
              <span className="font-bold text-biru-950 text-base">
                60 Menit
              </span>
            </div>
            <div className="p-4 rounded-xl bg-biru-50/60 border border-biru-100 space-y-1">
              <span className="text-biru-800 block">
                Passing Grade Rata-Rata
              </span>
              <span className="font-bold text-biru-950 text-base">
                65.0 Poin
              </span>
            </div>
            <div className="p-4 rounded-xl bg-biru-50/60 border border-biru-100 space-y-1">
              <span className="text-biru-800 block">Kesempatan Tes</span>
              <span className="font-bold text-biru-950 text-base">
                1 Kali Percobaan
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-biru-50 border border-biru-200 text-xs text-biru-900 space-y-1.5 leading-relaxed">
            <span className="font-bold block">Tata Tertib Peserta:</span>
            <ul className="list-disc list-inside space-y-1 text-biru-800">
              <li>
                Pastikan koneksi internet stabil sebelum menekan tombol Mulai
                Ujian.
              </li>
              <li>Timer akan terus berjalan dan tidak dapat dijeda (pause).</li>
              <li>
                Hasil nilai akan langsung dihitung secara otomatis saat ujian
                disubmit.
              </li>
            </ul>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsStarted(true)}
            className="w-full gap-2"
          >
            <span>Mulai Pengerjaan Ujian Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>
      )}

      {isStarted && !isFinished && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sisi Soal Ujian */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="border-2 border-biru-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-biru-100">
                <span className="font-bold text-xs text-biru-800 uppercase tracking-wider">
                  Soal Nomor {DAFTAR_SOAL_MOCK[currentIdx].id} dari{" "}
                  {DAFTAR_SOAL_MOCK.length}
                </span>
                <span className="text-xs text-biru-700 font-semibold">
                  Bobot: 1.0
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-base text-biru-950 font-medium leading-relaxed">
                  {DAFTAR_SOAL_MOCK[currentIdx].pertanyaan}
                </p>

                {/* Pilihan Opsi */}
                <div className="space-y-2.5 pt-2">
                  {DAFTAR_SOAL_MOCK[currentIdx].pilihan.map((opsi) => {
                    const isSelected =
                      jawaban[DAFTAR_SOAL_MOCK[currentIdx].id] === opsi.key;
                    return (
                      <div
                        key={opsi.key}
                        onClick={() => handleSelectOption(opsi.key)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3.5 ${
                          isSelected
                            ? "bg-biru-100/70 border-biru-700 text-biru-950 font-semibold"
                            : "bg-putih border-biru-200 text-biru-900 hover:bg-biru-50/50"
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? "bg-biru-700 text-putih"
                              : "bg-biru-100 text-biru-800"
                          }`}
                        >
                          {opsi.key}
                        </span>
                        <span className="text-sm">{opsi.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigasi Soal Bawah */}
              <div className="flex items-center justify-between pt-4 border-t border-biru-100">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => i - 1)}
                  className="gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </Button>

                {currentIdx < DAFTAR_SOAL_MOCK.length - 1 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setCurrentIdx((i) => i + 1)}
                    className="gap-1.5"
                  >
                    <span>Berikutnya</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleFinish}
                    className="gap-1.5 bg-biru-700 hover:bg-biru-800"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selesai & Kumpulkan Jawaban</span>
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Sisi Panel Timer & Nomor Soal */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border border-biru-200 bg-putih shadow-xs space-y-4">
              {/* Timer */}
              <div className="p-4 rounded-xl bg-biru-950 text-putih text-center space-y-1">
                <span className="text-[11px] text-biru-200 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-biru-400" />
                  Sisa Waktu Ujian
                </span>
                <span className="font-mono text-3xl font-bold tracking-wider text-putih block">
                  {formatTimer(timeLeft)}
                </span>
              </div>

              {/* Lembar Nomor Soal */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-biru-900 block">
                  Nomor Soal:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {DAFTAR_SOAL_MOCK.map((s, idx) => {
                    const isAnswered = !!jawaban[s.id];
                    const isCurrent = currentIdx === idx;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setCurrentIdx(idx)}
                        className={`h-9 rounded-lg font-bold text-xs transition-all flex items-center justify-center ${
                          isCurrent
                            ? "ring-2 ring-biru-600 bg-biru-700 text-putih"
                            : isAnswered
                              ? "bg-biru-100 text-biru-950 border border-biru-300"
                              : "bg-putih border border-biru-200 text-biru-800 hover:bg-biru-50"
                        }`}
                      >
                        {s.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleFinish}
                className="w-full text-xs border-biru-600 text-biru-700 hover:bg-biru-50 mt-2"
              >
                Kumpulkan Ujian Sekarang
              </Button>
            </Card>
          </div>
        </div>
      )}

      {isFinished && (
        <Card className="border-2 border-biru-200 shadow-md p-8 text-center space-y-6 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-biru-100 border border-biru-300 flex items-center justify-center text-biru-700 mx-auto">
            <Award className="w-9 h-9" />
          </div>

          <div>
            <span className="text-xs font-bold text-biru-800 uppercase tracking-wider block">
              Hasil Penilaian Ujian Seleksi
            </span>
            <h2 className="font-serif text-3xl font-bold text-biru-950 mt-1">
              Ujian Selesai Dinilai
            </h2>
            <p className="text-xs text-biru-800 mt-1">
              Jawaban Anda telah berhasil diverifikasi dan tersimpan dalam
              sistem pusat
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-biru-50/80 border border-biru-200 grid grid-cols-2 gap-4 text-left">
            <div>
              <span className="text-xs text-biru-800 block">
                Total Skor CBT
              </span>
              <span className="font-serif text-3xl font-bold text-biru-700 block mt-0.5">
                85.0
              </span>
            </div>
            <div>
              <span className="text-xs text-biru-800 block">Passing Grade</span>
              <span className="font-bold text-biru-950 text-xl block mt-1">
                65.0
              </span>
            </div>
          </div>

          <div className="p-3 bg-biru-100/60 rounded-xl border border-biru-300 text-xs text-biru-950 font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-biru-700" />
            <span>
              Skor Anda melampaui passing grade Program Studi Pilihan 1 (S1
              Informatika).
            </span>
          </div>

          <Link to="/portal/hasil" className="block pt-2">
            <Button variant="primary" size="md" className="w-full gap-2">
              <span>Buka Halaman Pengumuman Kelulusan</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
};
