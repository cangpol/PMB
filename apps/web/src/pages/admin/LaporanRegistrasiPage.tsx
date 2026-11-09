import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Download,
  MessageCircle,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "../../components/common";
import { fetchApi, type ApiError } from "@/services/api";
import { useToast } from "@/components/ui/useToast";
import {
  SUMBER_INFORMASI_OPTIONS,
  PLATFORM_MEDIA_SOSIAL,
  LAINNYA_PLATFORM,
} from "../../data/sumberInformasi";

interface Baris {
  id: string;
  nama_lengkap: string;
  email: string;
  no_hp: string | null;
  sumber_informasi: string | null;
  keterangan: string | null;
  provinsi_asal_sekolah: string | null;
  kabupaten_asal_sekolah: string | null;
  asal_sekolah: string | null;
  created_at: string;
}

interface Laporan {
  ringkasan: {
    total: number;
    per_sumber: { kode: string; label: string; jumlah: number }[];
    per_platform: { nama: string; jumlah: number }[];
    sekolah_teratas: {
      sekolah: string;
      kabupaten: string | null;
      provinsi: string | null;
      jumlah: number;
    }[];
  };
  items: Baris[];
}

interface Filter {
  q: string;
  sumber: string;
  platform: string;
  dari: string;
  sampai: string;
}

const FILTER_KOSONG: Filter = {
  q: "",
  sumber: "",
  platform: "",
  dari: "",
  sampai: "",
};
const PER_HALAMAN = 50;

const labelSumber = (kode: string | null) =>
  kode === null
    ? "Belum diisi"
    : (SUMBER_INFORMASI_OPTIONS.find((o) => o.kode === kode)?.label ?? kode);

/** Query string filter (tanpa halaman); isian kosong tidak dikirim. */
function queryFilter(f: Filter): URLSearchParams {
  const p = new URLSearchParams();
  (Object.keys(f) as (keyof Filter)[]).forEach((k) => {
    const v = f[k].trim();
    if (!v) return;
    if (k === "platform" && f.sumber !== "MEDIA_SOSIAL") return;
    p.set(k, v);
  });
  return p;
}

/** 08xx -> https://wa.me/628xx, untuk follow up lewat WhatsApp. */
function linkWhatsApp(noHp: string | null): string | null {
  if (!noHp) return null;
  let d = noHp.replace(/\D/g, "");
  if (d.startsWith("0")) d = `62${d.slice(1)}`;
  return d.length >= 9 ? `https://wa.me/${d}` : null;
}

function keterangan(b: Baris): string {
  if (b.sumber_informasi === "SOSIALISASI_SEKOLAH") {
    const wilayah = [b.kabupaten_asal_sekolah, b.provinsi_asal_sekolah]
      .filter(Boolean)
      .join(", ");
    return [b.asal_sekolah, wilayah].filter(Boolean).join(" — ") || "-";
  }
  if (b.sumber_informasi === "MEDIA_SOSIAL" || b.sumber_informasi === "LAINNYA")
    return b.keterangan || "-";
  return "-";
}

const tanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

const inputCls =
  "w-full rounded-lg border border-biru-200 bg-putih px-3 py-2 text-sm text-biru-950 focus:border-biru-600 focus:outline-none focus:ring-2 focus:ring-biru-600/20";

export const LaporanRegistrasiPage: React.FC = () => {
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>(FILTER_KOSONG);
  const [terapkan, setTerapkan] = useState<Filter>(FILTER_KOSONG);
  const [halaman, setHalaman] = useState(0);
  const [mengunduh, setMengunduh] = useState(false);

  // Pencarian teks ditunda sebentar agar tidak memanggil API di tiap ketukan
  useEffect(() => {
    const t = window.setTimeout(() => {
      setTerapkan(filter);
      setHalaman(0);
    }, 350);
    return () => window.clearTimeout(t);
  }, [filter]);

  const qs = useMemo(() => queryFilter(terapkan).toString(), [terapkan]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useQuery<Laporan>({
      queryKey: ["laporan-registrasi", qs, halaman],
      queryFn: () =>
        fetchApi<Laporan>(
          `/api/dashboard/admin/laporan-registrasi?${qs}${qs ? "&" : ""}limit=${PER_HALAMAN}&offset=${halaman * PER_HALAMAN}`,
        ),
      placeholderData: keepPreviousData,
    });

  const total = data?.ringkasan.total ?? 0;
  const jumlahHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const adaFilter = JSON.stringify(filter) !== JSON.stringify(FILTER_KOSONG);

  const ubah = (patch: Partial<Filter>) =>
    setFilter((f) => ({ ...f, ...patch }));

  const unduhPdf = async () => {
    setMengunduh(true);
    try {
      const res = await fetch(
        `/api/dashboard/admin/laporan-registrasi/pdf${qs ? `?${qs}` : ""}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ApiError | null;
        throw err ?? { pesan: `Gagal mengunduh (HTTP ${res.status})` };
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Registrasi_PMB_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "PDF diunduh",
        description: `${total} pendaftar masuk laporan.`,
        variant: "success",
      });
    } catch (e) {
      toast({
        title: "Gagal mengunduh PDF",
        description: (e as ApiError).pesan ?? "Terjadi kesalahan.",
        variant: "error",
      });
    } finally {
      setMengunduh(false);
    }
  };

  const sumberTeratas = data?.ringkasan.per_sumber.slice(0, 6) ?? [];
  const maksSumber = Math.max(1, ...sumberTeratas.map((s) => s.jumlah));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-biru-200 pb-5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-biru-950">
            Laporan Registrasi & Sumber Informasi
          </h1>
          <p className="text-biru-800 text-xs sm:text-sm mt-1">
            Siapa yang mendaftar, kontaknya, dan dari mana mereka tahu PMB
            UPITRA. Gunakan untuk follow up dan evaluasi promosi.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={unduhPdf}
          disabled={mengunduh || total === 0}
          className="gap-1.5 self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          {mengunduh ? "Menyiapkan PDF..." : "Unduh PDF"}
        </Button>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 border-biru-200 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-biru-800" />
            <h2 className="font-serif font-bold text-sm text-biru-950">
              Sumber informasi
            </h2>
            <span className="ml-auto text-xs font-semibold text-biru-800">
              {total} calon
            </span>
          </div>
          {sumberTeratas.length === 0 && (
            <p className="text-xs text-biru-700">Belum ada data.</p>
          )}
          <ul className="space-y-2">
            {sumberTeratas.map((s) => (
              <li key={s.kode} className="text-xs">
                <button
                  type="button"
                  onClick={() => ubah({ sumber: s.kode, platform: "" })}
                  className="w-full text-left"
                  title="Klik untuk menyaring"
                >
                  <div className="flex justify-between text-biru-900">
                    <span>{s.label}</span>
                    <span className="font-semibold">{s.jumlah}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-biru-100 mt-1">
                    <div
                      className="h-1.5 rounded-full bg-biru-600"
                      style={{ width: `${(s.jumlah / maksSumber) * 100}%` }}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 border-biru-200 rounded-2xl space-y-3">
          <h2 className="font-serif font-bold text-sm text-biru-950">
            Media sosial
          </h2>
          {(data?.ringkasan.per_platform.length ?? 0) === 0 && (
            <p className="text-xs text-biru-700">Belum ada data.</p>
          )}
          <ul className="space-y-1.5">
            {data?.ringkasan.per_platform.map((p) => (
              <li key={p.nama} className="text-xs">
                <button
                  type="button"
                  onClick={() =>
                    ubah({ sumber: "MEDIA_SOSIAL", platform: p.nama })
                  }
                  className="w-full flex justify-between text-biru-900 hover:text-biru-950"
                  title="Klik untuk menyaring"
                >
                  <span>{p.nama}</span>
                  <span className="font-semibold">{p.jumlah}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 border-biru-200 rounded-2xl space-y-3">
          <h2 className="font-serif font-bold text-sm text-biru-950">
            Sekolah teratas
          </h2>
          {(data?.ringkasan.sekolah_teratas.length ?? 0) === 0 && (
            <p className="text-xs text-biru-700">Belum ada data.</p>
          )}
          <ul className="space-y-1.5">
            {data?.ringkasan.sekolah_teratas.map((s) => (
              <li key={`${s.sekolah}-${s.kabupaten}`} className="text-xs">
                <button
                  type="button"
                  onClick={() => ubah({ q: s.sekolah })}
                  className="w-full flex justify-between gap-3 text-left text-biru-900 hover:text-biru-950"
                  title="Klik untuk menyaring"
                >
                  <span>
                    {s.sekolah}
                    {s.kabupaten && (
                      <span className="text-biru-700"> · {s.kabupaten}</span>
                    )}
                  </span>
                  <span className="font-semibold">{s.jumlah}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Filter */}
      <Card className="p-4 border-biru-200 rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="lg:col-span-2">
            <label
              htmlFor="lap-cari"
              className="block text-[11px] font-bold uppercase tracking-wider text-biru-900 mb-1"
            >
              Cari
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-biru-500" />
              <input
                id="lap-cari"
                value={filter.q}
                onChange={(e) => ubah({ q: e.target.value })}
                placeholder="Nama, email, no. HP, sekolah"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="lap-sumber"
              className="block text-[11px] font-bold uppercase tracking-wider text-biru-900 mb-1"
            >
              Sumber
            </label>
            <select
              id="lap-sumber"
              value={filter.sumber}
              onChange={(e) => ubah({ sumber: e.target.value, platform: "" })}
              className={inputCls}
            >
              <option value="">Semua sumber</option>
              {SUMBER_INFORMASI_OPTIONS.map((o) => (
                <option key={o.kode} value={o.kode}>
                  {o.label}
                </option>
              ))}
              <option value="BELUM_DIISI">Belum diisi</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="lap-platform"
              className="block text-[11px] font-bold uppercase tracking-wider text-biru-900 mb-1"
            >
              Media sosial
            </label>
            <select
              id="lap-platform"
              value={filter.platform}
              disabled={filter.sumber !== "MEDIA_SOSIAL"}
              onChange={(e) => ubah({ platform: e.target.value })}
              className={`${inputCls} disabled:bg-biru-50 disabled:text-biru-500`}
            >
              <option value="">Semua platform</option>
              {PLATFORM_MEDIA_SOSIAL.filter((n) => n !== LAINNYA_PLATFORM).map(
                (n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ),
              )}
              {filter.platform &&
                !PLATFORM_MEDIA_SOSIAL.includes(filter.platform) && (
                  <option value={filter.platform}>{filter.platform}</option>
                )}
            </select>
          </div>
          <div>
            <label
              htmlFor="lap-dari"
              className="block text-[11px] font-bold uppercase tracking-wider text-biru-900 mb-1"
            >
              Dari tanggal
            </label>
            <input
              id="lap-dari"
              type="date"
              value={filter.dari}
              max={filter.sampai || undefined}
              onChange={(e) => ubah({ dari: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label
              htmlFor="lap-sampai"
              className="block text-[11px] font-bold uppercase tracking-wider text-biru-900 mb-1"
            >
              Sampai tanggal
            </label>
            <input
              id="lap-sampai"
              type="date"
              value={filter.sampai}
              min={filter.dari || undefined}
              onChange={(e) => ubah({ sampai: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
        {adaFilter && (
          <button
            type="button"
            onClick={() => setFilter(FILTER_KOSONG)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-biru-800 hover:text-biru-950"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Atur ulang filter
          </button>
        )}
      </Card>

      {/* Tabel */}
      <Card className="border-biru-200 rounded-2xl overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState
            title="Gagal Memuat Laporan"
            message={
              (error as unknown as ApiError)?.pesan ?? "Terjadi kesalahan."
            }
            onRetry={() => refetch()}
          />
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="Tidak Ada Pendaftar"
            description="Tidak ada pendaftar yang cocok dengan filter ini."
          />
        ) : (
          <div
            className={`overflow-x-auto ${isFetching ? "opacity-70" : ""}`}
            aria-busy={isFetching}
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-biru-950 text-putih">
                  {[
                    "Nama",
                    "No. HP",
                    "Email",
                    "Sumber",
                    "Keterangan",
                    "Daftar",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-bold whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.items.map((b) => {
                  const wa = linkWhatsApp(b.no_hp);
                  return (
                    <tr
                      key={b.id}
                      className="border-t border-biru-100 odd:bg-biru-50/40 align-top"
                    >
                      <td className="px-4 py-3 font-semibold text-biru-950">
                        {b.nama_lengkap}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-biru-900">
                        {b.no_hp ?? "-"}
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Chat WhatsApp ${b.nama_lengkap}`}
                            title="Chat WhatsApp"
                            className="ml-2 inline-flex align-middle text-biru-700 hover:text-biru-950"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-biru-900 break-all">
                        {b.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-biru-900">
                        {labelSumber(b.sumber_informasi)}
                      </td>
                      <td className="px-4 py-3 text-biru-900 min-w-48">
                        {keterangan(b)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-biru-800">
                        {tanggal(b.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!isError && total > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-biru-100 text-xs text-biru-800">
            <span>
              {halaman * PER_HALAMAN + 1}–
              {Math.min(total, (halaman + 1) * PER_HALAMAN)} dari {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={halaman === 0}
                onClick={() => setHalaman((h) => h - 1)}
              >
                Sebelumnya
              </Button>
              <span>
                {halaman + 1} / {jumlahHalaman}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={halaman + 1 >= jumlahHalaman}
                onClick={() => setHalaman((h) => h + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
