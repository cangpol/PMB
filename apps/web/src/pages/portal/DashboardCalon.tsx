import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Download,
  FileText,
  FolderOpen,
  GraduationCap,
  Lock,
  Printer,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Button,
  Card,
  StatusBadge,
  CardSkeleton,
  ErrorState,
} from "../../components/common";
import { useAuth } from "@/context";
import { fetchApi } from "@/services/api";
import type { components } from "@/types/api";
import {
  AlurStepper,
  langkahTerbuka,
  useAlur,
} from "../../components/pendaftaran/AlurStepper";
import { LANGKAH_HALAMAN } from "../../components/pendaftaran/GerbangLangkah";
import { rupiah } from "../../components/pembayaran/BuktiPembayaranCard";
import {
  formatHariTanggal,
  formatJam,
} from "../../components/cbt/RiwayatCbtCard";

type DashboardSummary = components["schemas"]["DashboardSummaryResponse"];
type RingkasanBiaya = components["schemas"]["RingkasanBiayaItem"];

const LABEL_BIAYA: Record<string, { teks: string; kelas: string }> = {
  BELUM_TERBIT: { teks: "Belum diterbitkan", kelas: "text-biru-700" },
  MENUNGGU_PEMBAYARAN: { teks: "Belum dibayar", kelas: "text-amber-700" },
  MENUNGGU_VERIFIKASI: {
    teks: "Menunggu verifikasi admin",
    kelas: "text-amber-700",
  },
  DITOLAK: { teks: "Bukti ditolak", kelas: "text-rose-700" },
  LUNAS: { teks: "Lunas", kelas: "text-emerald-700" },
  KEDALUWARSA: { teks: "Kedaluwarsa", kelas: "text-rose-700" },
  BATAL: { teks: "Batal", kelas: "text-biru-700" },
};

const LABEL_PENGUMUMAN: Record<string, string> = {
  LULUS: "Lulus seleksi",
  CADANGAN: "Cadangan",
  TIDAK_LULUS: "Tidak lulus",
};

const StatusBiaya: React.FC<{ status: string }> = ({ status }) => {
  const l = LABEL_BIAYA[status] ?? { teks: status, kelas: "text-biru-800" };
  return <span className={`font-semibold ${l.kelas}`}>{l.teks}</span>;
};

/** Satu baris label–nilai di kartu ringkasan. */
const Baris: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex justify-between gap-3 text-xs">
    <dt className="text-biru-800 shrink-0">{label}</dt>
    <dd className="text-biru-950 font-semibold text-right min-w-0 break-words">
      {children}
    </dd>
  </div>
);

interface KartuProps {
  judul: string;
  icon: LucideIcon;
  href: string;
  terbuka: boolean;
  children: React.ReactNode;
}

/** Kartu ringkasan satu fitur portal; terkunci mengikuti alur PMB. */
const KartuRingkasan: React.FC<KartuProps> = ({
  judul,
  icon: Icon,
  href,
  terbuka,
  children,
}) => (
  <Card
    className={`p-5 border border-biru-200 rounded-2xl flex flex-col gap-3 ${
      terbuka ? "" : "bg-biru-50/40"
    }`}
  >
    <div className="flex items-center gap-2">
      <span
        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
          terbuka
            ? "bg-biru-700 text-putih"
            : "bg-biru-50 text-biru-400 border border-biru-200"
        }`}
      >
        <Icon className="w-4 h-4" aria-hidden />
      </span>
      <h3 className="font-bold text-sm text-biru-950">{judul}</h3>
      {!terbuka && (
        <Lock
          className="w-3.5 h-3.5 ml-auto text-biru-400"
          aria-label="Terkunci"
        />
      )}
    </div>
    {terbuka ? (
      <>
        <dl className="space-y-1.5 flex-1">{children}</dl>
        <Link
          to={href}
          className="inline-flex items-center gap-1 text-xs font-bold text-biru-800 hover:text-biru-950"
        >
          Buka <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </>
    ) : (
      <p className="text-xs text-biru-700/80 flex-1">
        Terbuka setelah langkah sebelumnya selesai.
      </p>
    )}
  </Card>
);

export const DashboardCalon: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const { alur, muatUlang: muatAlur } = useAlur();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setSummary(
        await fetchApi<DashboardSummary>("/api/pendaftaran/dashboard-summary"),
      );
      await muatAlur();
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [muatAlur]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) return <CardSkeleton />;

  if (isError || !summary) {
    return (
      <ErrorState
        title="Gagal Memuat Status Pendaftaran"
        message="Tidak dapat memuat ringkasan data tahapan seleksi Anda. Silakan periksa koneksi dan coba kembali."
        onRetry={fetchDashboardData}
      />
    );
  }

  const langkahAktif = alur?.langkah.find((l) => l.kode === alur.langkah_aktif);
  const terbuka = (kode: readonly string[]) => langkahTerbuka(alur, kode);

  const biayaFormulir = summary.biaya.find((b) => b.jenis === "FORMULIR");
  const biayaDu = summary.biaya.find((b) => b.jenis === "DAFTAR_ULANG");
  const totalBiaya = summary.biaya.reduce((n, b) => n + b.nominal, 0);
  const totalLunas = summary.biaya
    .filter((b) => b.status === "LUNAS")
    .reduce((n, b) => n + b.nominal, 0);

  const { berkas, cbt } = summary;

  return (
    <div className="space-y-8">
      {/* Kartu Utama & Status */}
      <Card className="border-2 border-biru-200 bg-putih shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-100">
          <div>
            <span className="text-xs font-bold text-biru-800 uppercase tracking-wider block">
              Portal Calon Mahasiswa Baru
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-0.5">
              {user?.nama_lengkap || "Calon Mahasiswa"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-biru-800">Status Pendaftaran:</span>
            <StatusBadge
              status={
                !langkahAktif
                  ? "berhasil"
                  : langkahAktif.status === "DITOLAK"
                    ? "gagal"
                    : "menunggu"
              }
              label={
                langkahAktif
                  ? `Langkah ${langkahAktif.nomor}: ${langkahAktif.judul}`
                  : "Terdaftar sebagai Mahasiswa"
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
          {[
            {
              label: "Nomor Pendaftaran",
              nilai: summary.nomor_pendaftaran ?? "-",
              mono: true,
            },
            {
              label: "Jalur Masuk",
              nilai: summary.jalur_nama ?? "Belum memilih",
            },
            {
              label: "Pilihan Utama (1)",
              nilai: summary.prodi_1_nama ?? "Belum memilih",
            },
            summary.nim_resmi
              ? { label: "NIM Resmi", nilai: summary.nim_resmi, mono: true }
              : {
                  label: "Total Biaya PMB",
                  nilai: totalBiaya > 0 ? rupiah(totalBiaya) : "-",
                  mono: true,
                },
          ].map((k) => (
            <div
              key={k.label}
              className="p-3.5 rounded-2xl bg-biru-50/60 border border-biru-100 min-w-0"
            >
              <span className="text-biru-800 block text-[11px] uppercase tracking-wider font-semibold">
                {k.label}
              </span>
              <span
                className={`font-bold text-biru-950 mt-0.5 block truncate ${
                  k.mono ? "font-mono text-sm" : ""
                }`}
                title={k.nilai}
              >
                {k.nilai}
              </span>
            </div>
          ))}
        </div>

        {summary.pendaftar_id && (
          <div className="pt-3 border-t border-biru-100 flex flex-wrap items-center gap-3">
            {summary.bisa_cetak_bukti && (
              <a
                href={`/api/pendaftaran/${summary.pendaftar_id}/cetak/bukti-pendaftaran`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <Printer className="w-4 h-4" />
                  <span>Cetak Bukti Pendaftaran (PDF)</span>
                </Button>
              </a>
            )}
            {summary.bisa_cetak_kartu && (
              <a
                href={`/api/pendaftaran/${summary.pendaftar_id}/cetak/kartu-peserta`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="primary" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  <span>Cetak Kartu Peserta Ujian (PDF)</span>
                </Button>
              </a>
            )}
          </div>
        )}
      </Card>

      {/* Ringkasan seluruh fitur */}
      <section className="space-y-4" aria-labelledby="judul-ringkasan">
        <h2
          id="judul-ringkasan"
          className="font-serif text-xl font-bold text-biru-950"
        >
          Ringkasan Pendaftaran
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <KartuRingkasan
            judul="Formulir & Program Studi"
            icon={FileText}
            href="/portal/formulir"
            terbuka={terbuka(LANGKAH_HALAMAN.formulir)}
          >
            <Baris label="Jalur">{summary.jalur_nama ?? "-"}</Baris>
            <Baris label="Gelombang">{summary.gelombang_nama ?? "-"}</Baris>
            <Baris label="Prodi pilihan 1">{summary.prodi_1_nama ?? "-"}</Baris>
            <Baris label="Prodi pilihan 2">{summary.prodi_2_nama ?? "-"}</Baris>
            {summary.tgl_daftar && (
              <Baris label="Terdaftar">
                {formatHariTanggal(summary.tgl_daftar)}
              </Baris>
            )}
          </KartuRingkasan>

          <KartuRingkasan
            judul="Pembayaran Formulir"
            icon={CreditCard}
            href="/portal/pembayaran"
            terbuka={terbuka(LANGKAH_HALAMAN.pembayaran)}
          >
            <Baris label="Biaya">
              {biayaFormulir ? rupiah(biayaFormulir.nominal) : "-"}
            </Baris>
            <Baris label="Status">
              {biayaFormulir ? (
                <StatusBiaya status={biayaFormulir.status} />
              ) : (
                "-"
              )}
            </Baris>
            {biayaFormulir?.nomor_tagihan && (
              <Baris label="No. tagihan">
                <span className="font-mono">{biayaFormulir.nomor_tagihan}</span>
              </Baris>
            )}
          </KartuRingkasan>

          <KartuRingkasan
            judul="Berkas Persyaratan"
            icon={FolderOpen}
            href="/portal/berkas"
            terbuka={terbuka(LANGKAH_HALAMAN.berkas)}
          >
            {berkas ? (
              <>
                <Baris label="Berkas wajib">
                  {berkas.wajib_terunggah} dari {berkas.total_wajib} terunggah
                </Baris>
                <Baris label="Valid">{berkas.valid}</Baris>
                <Baris label="Menunggu verifikasi">
                  {berkas.menunggu_verifikasi}
                </Baris>
                <Baris label="Perlu diperbaiki">
                  <span className={berkas.ditolak > 0 ? "text-rose-700" : ""}>
                    {berkas.ditolak}
                  </span>
                </Baris>
              </>
            ) : (
              <Baris label="Status">Belum dimulai</Baris>
            )}
          </KartuRingkasan>

          <KartuRingkasan
            judul="Ujian CBT"
            icon={GraduationCap}
            href="/portal/ujian"
            terbuka={terbuka(LANGKAH_HALAMAN.ujian)}
          >
            {cbt ? (
              <>
                <Baris label="Sesi">{cbt.nama_sesi ?? "Belum dipilih"}</Baris>
                {cbt.jadwal_mulai && (
                  <Baris label="Jadwal">
                    {formatHariTanggal(cbt.jadwal_mulai)},{" "}
                    {formatJam(cbt.jadwal_mulai)} WIB
                  </Baris>
                )}
                {cbt.mode && (
                  <Baris label="Mode">
                    {cbt.mode === "ONLINE" ? "Online" : `Luring · ${cbt.ruang}`}
                  </Baris>
                )}
                <Baris label="Skor terakhir">
                  {cbt.nilai_terakhir != null
                    ? cbt.nilai_terakhir.toFixed(2)
                    : "Belum ada"}
                </Baris>
                {cbt.waktu_selesai_terakhir && (
                  <Baris label="Dikerjakan">
                    {formatHariTanggal(cbt.waktu_selesai_terakhir)},{" "}
                    {formatJam(cbt.waktu_selesai_terakhir)} WIB
                  </Baris>
                )}
              </>
            ) : (
              <Baris label="Status">Jalur Anda tanpa ujian CBT</Baris>
            )}
          </KartuRingkasan>

          <KartuRingkasan
            judul="Pengumuman Kelulusan"
            icon={CheckCircle2}
            href="/portal/hasil"
            terbuka={terbuka(LANGKAH_HALAMAN.hasil)}
          >
            <Baris label="Hasil">
              {summary.pengumuman_status
                ? (LABEL_PENGUMUMAN[summary.pengumuman_status] ??
                  summary.pengumuman_status)
                : "Belum diumumkan"}
            </Baris>
            {summary.prodi_diterima_nama && (
              <Baris label="Diterima di">{summary.prodi_diterima_nama}</Baris>
            )}
            {!summary.pengumuman_status &&
              summary.cbt?.memenuhi_passing_grade != null && (
                <Baris label="Hasil CBT">
                  {summary.cbt.memenuhi_passing_grade
                    ? summary.cbt.disetujui_admin
                      ? "Disetujui panitia, menunggu pengumuman resmi"
                      : "Lulus passing grade, menunggu pengumuman resmi"
                    : "Belum memenuhi passing grade, menunggu keputusan panitia"}
                </Baris>
              )}
          </KartuRingkasan>

          <KartuRingkasan
            judul="Daftar Ulang"
            icon={ClipboardCheck}
            href="/portal/daftar-ulang"
            terbuka={terbuka(LANGKAH_HALAMAN.daftarUlang)}
          >
            <Baris label="Biaya">
              {biayaDu ? rupiah(biayaDu.nominal) : "-"}
            </Baris>
            <Baris label="Status">
              {biayaDu ? <StatusBiaya status={biayaDu.status} /> : "-"}
            </Baris>
            {biayaDu?.tgl_jatuh_tempo && biayaDu.status !== "LUNAS" && (
              <Baris label="Batas bayar">
                {formatHariTanggal(biayaDu.tgl_jatuh_tempo)}
              </Baris>
            )}
            <Baris label="NIM">
              <span className="font-mono">{summary.nim_resmi ?? "-"}</span>
            </Baris>
          </KartuRingkasan>
        </div>
      </section>

      {/* Rincian seluruh biaya */}
      {summary.biaya.length > 0 && (
        <section className="space-y-4" aria-labelledby="judul-biaya">
          <h2
            id="judul-biaya"
            className="font-serif text-xl font-bold text-biru-950 flex items-center gap-2"
          >
            <Wallet className="w-5 h-5 text-biru-800" aria-hidden />
            Rincian Biaya
          </h2>
          <Card className="p-0 border border-biru-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-biru-50 text-biru-800">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Biaya</th>
                  <th className="text-left font-semibold px-4 py-3">
                    No. tagihan
                  </th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-right font-semibold px-4 py-3">
                    Nominal
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.biaya.map((b: RingkasanBiaya) => (
                  <tr key={b.jenis} className="border-t border-biru-100">
                    <td className="px-4 py-3 text-biru-950 font-semibold">
                      {b.label}
                    </td>
                    <td className="px-4 py-3 font-mono text-biru-900">
                      {b.nomor_tagihan ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBiaya status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-biru-950">
                      {rupiah(b.nominal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-biru-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-bold text-biru-950">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-biru-950">
                    {rupiah(totalBiaya)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 pb-3 text-biru-800">
                    Sudah lunas
                  </td>
                  <td className="px-4 pb-3 text-right font-mono text-emerald-700">
                    {rupiah(totalLunas)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>
          {biayaDu?.status === "BELUM_TERBIT" && (
            <p className="text-xs text-biru-800">
              Biaya daftar ulang di atas adalah perkiraan sesuai program studi
              tempat Anda diterima. Tagihan resmi terbit di halaman Daftar
              Ulang.
            </p>
          )}
        </section>
      )}

      {/* Stepper Progres Alur PMB */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-bold text-biru-950">
          Tahapan & Progres Pendaftaran
        </h2>
        {alur ? <AlurStepper alur={alur} /> : <CardSkeleton />}
      </div>
    </div>
  );
};
