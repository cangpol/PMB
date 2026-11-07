import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  CheckCheck,
  AlertCircle,
  Eye,
  X,
  FileCheck2,
  ExternalLink,
  RotateCw,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  Button,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";
import { Input } from "@/components/ui";
import { useToast } from "@/components/ui/useToast";
import { useDialog } from "@/components/ui/useDialog";
import { useQueryClient } from "@tanstack/react-query";
import {
  KUNCI_ANTREAN,
  useAntreanVerifikasi,
} from "@/hooks/useAntreanVerifikasi";
import { sejak } from "@/components/admin/KartuAntrean";
import { fetchApi } from "@/services/api";
import type { components } from "@/types/api";

type CalonBerkas = components["schemas"]["BerkasCalonRingkasan"];
type BerkasDetail = components["schemas"]["BerkasDetailItem"];
type HasilSahkanSemua = components["schemas"]["SahkanSemuaBerkasResponse"];

const STATUS_PILIHAN = [
  { nilai: "PENDING", label: "Perlu diperiksa" },
  { nilai: "INVALID", label: "Ada yang ditolak" },
  { nilai: "VALID", label: "Semua sudah sah" },
  { nilai: "SEMUA", label: "Semua calon" },
];

const adalahPending = (s: string) => s === "PENDING" || s === "BELUM";
const adalahValid = (s: string) => s === "VALID" || s === "DITERIMA";
const adalahTolak = (s: string) => s === "INVALID" || s === "DITOLAK";

/** Unggahan terbaru tiap jenis berkas; yang perlu diperiksa di atas. */
const terbaruPerJenis = (semua: BerkasDetail[]): BerkasDetail[] => {
  const peta = new Map<string, BerkasDetail>();
  for (const b of semua) {
    const lama = peta.get(b.kode_berkas);
    if (!lama || new Date(b.uploaded_at) > new Date(lama.uploaded_at)) {
      peta.set(b.kode_berkas, b);
    }
  }
  const urutan = (s: string) => (adalahPending(s) ? 0 : adalahTolak(s) ? 1 : 2);
  return [...peta.values()].sort(
    (a, b) =>
      urutan(a.status_verifikasi) - urutan(b.status_verifikasi) ||
      a.nama_berkas.localeCompare(b.nama_berkas),
  );
};

const pesanError = (err: unknown, cadangan: string): string => {
  const e = err as { pesan?: string; message?: string };
  return e?.pesan || e?.message || cadangan;
};

export const VerifikasiBerkasPage: React.FC = () => {
  const { toast } = useToast();
  const dialog = useDialog();
  const queryClient = useQueryClient();
  const { data: antrean } = useAntreanVerifikasi();
  const menunggu = antrean?.berkas.menunggu ?? 0;

  const [calonList, setCalonList] = useState<CalonBerkas[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  // Filter
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");

  // Pilihan calon untuk pengesahan massal
  const [dipilih, setDipilih] = useState<Set<string>>(new Set());

  // Panel detail berkas satu calon
  const [calonDetail, setCalonDetail] = useState<CalonBerkas | null>(null);
  const [berkasDetail, setBerkasDetail] = useState<BerkasDetail[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Pratinjau dokumen
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [previewMime, setPreviewMime] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const segarkanAntrean = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: KUNCI_ANTREAN });
  }, [queryClient]);

  const fetchCalon = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const params = new URLSearchParams();
      if (statusFilter !== "SEMUA") params.append("status", statusFilter);
      if (search.trim()) params.append("search", search.trim());
      const data = await fetchApi<CalonBerkas[]>(
        `/api/pendaftaran/admin/berkas-per-calon?${params.toString()}`,
      );
      setCalonList(data);
      // Buang pilihan calon yang sudah tidak ada di daftar
      setDipilih((lama) => {
        const ada = new Set(data.map((c) => c.pendaftar_id));
        return new Set([...lama].filter((id) => ada.has(id)));
      });
    } catch (err) {
      console.error(err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    void fetchCalon();
  }, [fetchCalon]);

  const muatDetail = useCallback(
    async (pendaftarId: string) => {
      try {
        setIsLoadingDetail(true);
        const data = await fetchApi<BerkasDetail[]>(
          `/api/pendaftaran/admin/berkas-list?pendaftar_id=${pendaftarId}`,
        );
        setBerkasDetail(terbaruPerJenis(data));
      } catch (err) {
        toast({
          variant: "error",
          title: "Kesalahan",
          description: pesanError(err, "Gagal memuat berkas calon"),
        });
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [toast],
  );

  const bukaDetail = (calon: CalonBerkas) => {
    setCalonDetail(calon);
    setBerkasDetail([]);
    void muatDetail(calon.pendaftar_id);
  };

  const tutupDetail = () => {
    setCalonDetail(null);
    setBerkasDetail([]);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchCalon();
  };

  const handleLihatBerkas = async (item: BerkasDetail) => {
    try {
      setPreviewTitle(`${item.nama_berkas} - ${item.nama_lengkap}`);
      setPreviewMime(item.mime_type || "application/pdf");
      const data = await fetchApi<{ download_url: string }>(
        `/api/pendaftaran/berkas/${item.id}/presign-download`,
      );
      setPreviewUrl(data.download_url);
    } catch (err) {
      toast({
        variant: "error",
        title: "Kesalahan",
        description: pesanError(err, "Gagal membuka pratinjau dokumen"),
      });
    }
  };

  /** Muat ulang daftar, panel detail, dan lencana setelah ada perubahan status. */
  const segarkanSemua = async (pendaftarId?: string) => {
    segarkanAntrean();
    await fetchCalon();
    if (pendaftarId) await muatDetail(pendaftarId);
  };

  const handleVerifikasi = async (
    berkas: BerkasDetail,
    status: "VALID" | "INVALID",
  ) => {
    let catatan: string | undefined;
    if (status === "INVALID") {
      const alasan = await dialog.masukkanAlasan({
        judul: "Tolak berkas ini?",
        deskripsi: (
          <>
            <strong className="text-biru-950">{berkas.nama_berkas}</strong>{" "}
            milik{" "}
            <strong className="text-biru-950">{berkas.nama_lengkap}</strong>{" "}
            akan dikembalikan untuk diperbaiki. Alasan ini dikirim ke calon.
          </>
        ),
        label: "Catatan revisi untuk calon mahasiswa",
        placeholder:
          "Contoh: foto buram / tidak jelas, atau ijazah belum berlegalisir.",
        nilaiAwal: berkas.catatan ?? "",
        labelKirim: "Tolak Berkas",
        nada: "bahaya",
      });
      if (alasan === null) return;
      catatan = alasan;
    }
    try {
      setIsSubmitting(true);
      await fetchApi("/api/pendaftaran/admin/verifikasi-berkas", {
        method: "POST",
        body: JSON.stringify({
          berkas_id: berkas.id,
          status_verifikasi: status,
          catatan: catatan || null,
        }),
      });
      await segarkanSemua(berkas.pendaftar_id);
      void dialog.hasil(
        status === "VALID"
          ? {
              nada: "sukses",
              judul: "Berkas disetujui",
              deskripsi: `${berkas.nama_berkas} milik ${berkas.nama_lengkap} dinyatakan sah.`,
              autoTutupMs: 2200,
            }
          : {
              nada: "ditolak",
              judul: "Berkas ditolak",
              deskripsi: `${berkas.nama_berkas} dikembalikan ke ${berkas.nama_lengkap} untuk diperbaiki.`,
              rincian: [`Alasan: ${catatan}`],
              autoTutupMs: 4500,
            },
      );
    } catch (err) {
      void dialog.hasil({
        nada: "gagal",
        judul: "Verifikasi gagal",
        deskripsi: pesanError(err, "Gagal memproses verifikasi"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sahkanSemua = async (calon: CalonBerkas[]) => {
    const target = calon.filter((c) => c.menunggu > 0);
    if (target.length === 0) return;
    const jumlahBerkas = target.reduce((n, c) => n + c.menunggu, 0);
    const ya = await dialog.konfirmasi({
      judul: "Sahkan semua berkas?",
      nada: "sukses",
      deskripsi: (
        <>
          <strong className="text-biru-950">{jumlahBerkas} berkas</strong> yang
          menunggu milik{" "}
          <strong className="text-biru-950">
            {target.length === 1
              ? target[0].nama_lengkap
              : `${target.length} calon`}
          </strong>{" "}
          akan ditandai sah. Berkas yang sudah ditolak tidak ikut disahkan. Bila
          semua berkas wajib sudah sah, calon otomatis maju ke tahap berikutnya
          dan menerima pemberitahuan.
        </>
      ),
      labelYa: "Ya, Sahkan Semua",
    });
    if (!ya) return;

    try {
      setIsSubmitting(true);
      const res = await fetchApi<HasilSahkanSemua>(
        "/api/pendaftaran/admin/verifikasi-berkas-semua",
        {
          method: "POST",
          body: JSON.stringify({
            pendaftar_ids: target.map((c) => c.pendaftar_id),
          }),
        },
      );
      setDipilih(new Set());
      await segarkanSemua(calonDetail?.pendaftar_id);
      const belumLengkap = res.hasil.filter(
        (h) => h.berkas_disahkan > 0 && !h.lengkap,
      );
      void dialog.hasil(
        belumLengkap.length
          ? {
              nada: "peringatan",
              judul: `${res.berkas_disahkan} berkas disahkan`,
              deskripsi: `${belumLengkap.length} calon belum mengunggah semua berkas wajib, jadi tahapnya belum maju:`,
              rincian: belumLengkap.map((h) => h.nama_lengkap),
              labelTutup: "Mengerti",
            }
          : {
              nada: "sukses",
              judul: `${res.berkas_disahkan} berkas disetujui`,
              deskripsi: `Dari ${res.calon_diproses} calon. Calon yang berkas wajibnya lengkap otomatis maju ke tahap berikutnya.`,
              rincian: res.hasil
                .filter((h) => h.berkas_disahkan > 0)
                .slice(0, 6)
                .map((h) => `${h.nama_lengkap} · ${h.berkas_disahkan} berkas`),
              autoTutupMs: 4000,
            },
      );
    } catch (err) {
      void dialog.hasil({
        nada: "gagal",
        judul: "Berkas gagal disahkan",
        deskripsi: pesanError(err, "Gagal mengesahkan berkas"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pilihan massal
  const bisaDipilih = useMemo(
    () => calonList.filter((c) => c.menunggu > 0),
    [calonList],
  );
  const semuaDipilih =
    bisaDipilih.length > 0 &&
    bisaDipilih.every((c) => dipilih.has(c.pendaftar_id));
  const calonDipilih = calonList.filter((c) => dipilih.has(c.pendaftar_id));
  const berkasDipilih = calonDipilih.reduce((n, c) => n + c.menunggu, 0);

  const togglePilih = (id: string) =>
    setDipilih((lama) => {
      const baru = new Set(lama);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });

  const togglePilihSemua = () =>
    setDipilih(
      semuaDipilih
        ? new Set()
        : new Set(bisaDipilih.map((c) => c.pendaftar_id)),
    );

  // Escape menutup lapisan paling atas
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (previewUrl) setPreviewUrl(null);
      else if (calonDetail) tutupDetail();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewUrl, calonDetail]);

  const menungguDetail = berkasDetail.filter((b) =>
    adalahPending(b.status_verifikasi),
  ).length;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-biru-100 pb-6">
        <div>
          <span className="text-xs font-semibold text-biru-800 tracking-wider uppercase">
            Operasional PMB • Administrator & Verifikator
          </span>
          <h1 className="font-serif text-3xl font-bold text-biru-950 mt-1">
            Verifikasi Dokumen Berkas PMB
          </h1>
          <p className="text-xs text-biru-800 mt-1">
            Berkas dikelompokkan per calon mahasiswa. Buka detail untuk
            memeriksa tiap dokumen, atau sahkan semuanya sekaligus.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => void fetchCalon()}
          className="flex items-center gap-2 border-biru-200 text-biru-900 hover:bg-biru-50 self-start md:self-auto text-xs"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Segarkan Data</span>
        </Button>
      </div>

      {/* Penanda: ada berkas yang menunggu pemeriksaan admin */}
      {menunggu > 0 ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5 text-rose-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p className="text-xs leading-relaxed">
              <strong>{menunggu} berkas</strong> dari{" "}
              <strong>{antrean?.berkas.calon} calon</strong> perlu Anda periksa
              {antrean?.berkas.terlama_sejak
                ? ` (tertua diunggah ${sejak(antrean.berkas.terlama_sejak)})`
                : ""}
              .
            </p>
          </div>
          {statusFilter !== "PENDING" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatusFilter("PENDING")}
              className="self-start border-rose-300 text-xs text-rose-900 hover:bg-rose-100 sm:self-auto"
            >
              Tampilkan yang perlu diperiksa
            </Button>
          )}
        </div>
      ) : (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          Semua berkas yang masuk sudah diperiksa.
        </div>
      )}

      {/* Filter & Pencarian */}
      <Card className="p-4 border-biru-100 bg-putih shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-2 w-full md:w-96"
        >
          <Input
            placeholder="Cari no. pendaftaran, nama, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs"
          />
          <Button
            type="submit"
            className="bg-biru-900 text-putih hover:bg-biru-950 px-3 py-2 text-xs font-semibold shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
          </Button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-biru-700" />
          <span className="text-xs font-semibold text-biru-900">
            Tampilkan:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-putih border border-biru-200 rounded-lg text-xs text-biru-950 focus:ring-2 focus:ring-biru-800"
          >
            {STATUS_PILIHAN.map((o) => (
              <option key={o.nilai} value={o.nilai}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Bilah aksi massal */}
      {dipilih.size > 0 && (
        <div
          role="region"
          aria-label="Aksi untuk calon terpilih"
          className="flex flex-col gap-2 rounded-2xl border border-biru-300 bg-biru-100/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-xs text-biru-950">
            <strong>{dipilih.size} calon</strong> dipilih ({berkasDipilih}{" "}
            berkas menunggu)
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDipilih(new Set())}
              className="border-biru-300 text-xs text-biru-900"
            >
              Batal pilih
            </Button>
            <Button
              size="sm"
              onClick={() => void sahkanSemua(calonDipilih)}
              className="bg-biru-900 text-xs font-semibold text-putih hover:bg-biru-950"
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
              Sahkan semua berkas terpilih
            </Button>
          </div>
        </div>
      )}

      {/* Daftar calon */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : isError ? (
        <ErrorState
          title="Gagal Memuat Berkas"
          message="Tidak dapat mengambil daftar berkas dari database pendaftaran."
          onRetry={() => void fetchCalon()}
        />
      ) : calonList.length === 0 ? (
        <EmptyState
          title={
            statusFilter === "PENDING" && !search.trim()
              ? "Tidak Ada Berkas yang Perlu Diperiksa"
              : "Tidak Ada Calon yang Cocok"
          }
          description={
            statusFilter === "PENDING" && !search.trim()
              ? "Semua berkas yang masuk sudah diperiksa. Pilih “Semua calon” untuk melihat riwayat."
              : "Belum ada calon yang memenuhi kriteria pencarian atau filter yang dipilih."
          }
        />
      ) : (
        <Card className="overflow-hidden border-biru-100 bg-putih shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-biru-950 text-putih uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={semuaDipilih}
                      disabled={bisaDipilih.length === 0}
                      onChange={togglePilihSemua}
                      aria-label="Pilih semua calon yang berkasnya menunggu"
                      className="h-4 w-4 accent-biru-600"
                    />
                  </th>
                  <th className="py-3 px-4">Calon Mahasiswa</th>
                  <th className="py-3 px-4">Jalur & Prodi</th>
                  <th className="py-3 px-4">Berkas</th>
                  <th className="py-3 px-4">Menunggu Sejak</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-biru-100 text-biru-950">
                {calonList.map((c) => {
                  const perlu = c.menunggu > 0;
                  return (
                    <tr
                      key={c.pendaftar_id}
                      className={`transition ${
                        perlu
                          ? "bg-rose-50/60 hover:bg-rose-50"
                          : "hover:bg-biru-50/40"
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={dipilih.has(c.pendaftar_id)}
                          disabled={!perlu}
                          onChange={() => togglePilih(c.pendaftar_id)}
                          aria-label={`Pilih ${c.nama_lengkap}`}
                          className="h-4 w-4 accent-biru-600 disabled:opacity-30"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => bukaDetail(c)}
                          className="text-left"
                        >
                          <div className="font-bold text-biru-950 hover:underline">
                            {c.nama_lengkap}
                          </div>
                          <div className="font-mono text-[11px] text-biru-800">
                            {c.nomor_pendaftaran}
                          </div>
                          <div className="text-[11px] text-biru-600">
                            {c.email}
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-biru-900">{c.nama_jalur}</div>
                        <div className="text-[11px] text-biru-600">
                          {c.nama_prodi ?? "-"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {c.menunggu > 0 && (
                            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-putih">
                              {c.menunggu} perlu diperiksa
                            </span>
                          )}
                          {c.valid > 0 && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                              {c.valid} sah
                            </span>
                          )}
                          {c.ditolak > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                              {c.ditolak} ditolak
                            </span>
                          )}
                          <span className="text-[10px] text-biru-600">
                            dari {c.total} berkas
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-biru-800">
                        {c.menunggu_sejak ? sejak(c.menunggu_sejak) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => bukaDetail(c)}
                            className="border-biru-200 text-xs text-biru-900 hover:bg-biru-50"
                          >
                            Detail
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void sahkanSemua([c])}
                            disabled={!perlu || isSubmitting}
                            className="bg-biru-900 text-xs text-putih hover:bg-biru-950 disabled:opacity-40"
                            title="Sahkan semua berkas yang menunggu milik calon ini"
                          >
                            <CheckCheck className="mr-1 h-3.5 w-3.5" />
                            Sahkan Semua
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-biru-100 bg-biru-50/40 px-4 py-2 text-[11px] text-biru-700">
            Menampilkan {calonList.length} calon
            {calonList.length >= 200
              ? " (batas 200; persempit dengan pencarian)"
              : ""}
          </div>
        </Card>
      )}

      {/* Panel Detail Berkas Satu Calon */}
      {calonDetail && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-biru-950/60 p-4 backdrop-blur-xs"
          onClick={tutupDetail}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Berkas ${calonDetail.nama_lengkap}`}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-biru-200 bg-putih shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-biru-100 bg-biru-950 p-4 text-putih">
              <div className="min-w-0">
                <h2 className="truncate font-serif text-lg font-bold">
                  {calonDetail.nama_lengkap}
                </h2>
                <p className="font-mono text-[11px] text-biru-200">
                  {calonDetail.nomor_pendaftaran} · {calonDetail.nama_jalur}
                  {calonDetail.nama_prodi ? ` · ${calonDetail.nama_prodi}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={tutupDetail}
                className="rounded-lg p-1.5 text-putih transition hover:bg-biru-900"
                aria-label="Tutup detail"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {isLoadingDetail && berkasDetail.length === 0 ? (
                <TableSkeleton rows={4} cols={3} />
              ) : berkasDetail.length === 0 ? (
                <EmptyState
                  title="Belum Ada Berkas"
                  description="Calon ini belum mengunggah dokumen apa pun."
                />
              ) : (
                berkasDetail.map((b) => {
                  const pending = adalahPending(b.status_verifikasi);
                  const valid = adalahValid(b.status_verifikasi);
                  const tolak = adalahTolak(b.status_verifikasi);
                  return (
                    <div
                      key={b.id}
                      className={`rounded-xl border p-3.5 ${
                        pending
                          ? "border-rose-200 bg-rose-50/60"
                          : "border-biru-100 bg-putih"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-biru-950">
                              {b.nama_berkas}
                            </span>
                            {b.wajib ? (
                              <span className="rounded bg-biru-100 px-1.5 py-0.5 text-[10px] font-bold text-biru-900">
                                Wajib
                              </span>
                            ) : (
                              <span className="rounded bg-biru-50 px-1.5 py-0.5 text-[10px] text-biru-700">
                                Opsional
                              </span>
                            )}
                            {pending && (
                              <StatusBadge
                                status="warning"
                                label="Perlu diperiksa"
                              />
                            )}
                            {valid && (
                              <StatusBadge
                                status="success"
                                label="Diterima (Sah)"
                              />
                            )}
                            {tolak && (
                              <StatusBadge
                                status="error"
                                label="Perlu Perbaikan"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-1 font-mono text-[11px] text-biru-800">
                            <FileText className="h-3.5 w-3.5 text-biru-700" />
                            <span className="max-w-[260px] truncate">
                              {b.file_name}
                            </span>
                            <span className="text-biru-600">
                              · {(b.file_size_bytes / 1024).toFixed(0)} KB ·{" "}
                              {new Date(b.uploaded_at).toLocaleString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {b.catatan && (
                            <div className="rounded border border-biru-200 bg-biru-50 p-1.5 text-[11px] italic text-biru-800">
                              Catatan: {b.catatan}
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleLihatBerkas(b)}
                            className="border-biru-200 p-1.5 text-xs text-biru-900 hover:bg-biru-50"
                            title="Pratinjau Dokumen"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void handleVerifikasi(b, "VALID")}
                            disabled={isSubmitting || valid}
                            className="bg-biru-900 px-2.5 py-1 text-xs text-putih hover:bg-biru-950 disabled:opacity-40"
                            title="Sahkan Berkas"
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Terima
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleVerifikasi(b, "INVALID")}
                            disabled={isSubmitting}
                            className="border-biru-300 px-2 py-1 text-xs text-biru-700 hover:bg-biru-50"
                            title="Tolak dan Minta Revisi"
                          >
                            <AlertCircle className="mr-1 h-3.5 w-3.5" />
                            Tolak
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-biru-100 bg-biru-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-biru-800">
                {menungguDetail > 0
                  ? `${menungguDetail} berkas menunggu pemeriksaan Anda.`
                  : "Tidak ada berkas yang menunggu pemeriksaan."}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={tutupDetail}
                  className="border-biru-200 text-xs text-biru-900"
                >
                  Tutup
                </Button>
                <Button
                  size="sm"
                  disabled={menungguDetail === 0 || isSubmitting}
                  onClick={() =>
                    void sahkanSemua([
                      {
                        ...calonDetail,
                        menunggu: menungguDetail,
                      },
                    ])
                  }
                  className="bg-biru-900 text-xs font-semibold text-putih hover:bg-biru-950 disabled:opacity-40"
                >
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                  Sahkan Semua ({menungguDetail})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pratinjau Dokumen Berkas */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-biru-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-putih rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden border border-biru-200">
            <div className="p-4 bg-biru-950 text-putih flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-biru-300" />
                <h3 className="font-serif text-base font-bold">
                  {previewTitle}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-biru-900 rounded-lg text-putih transition"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="p-1.5 hover:bg-biru-900 rounded-lg text-putih transition"
                  aria-label="Tutup pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-biru-50/50 p-4 flex items-center justify-center overflow-auto">
              {previewMime.includes("image") ? (
                <img
                  src={previewUrl}
                  alt={previewTitle}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-md border border-biru-200"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={previewTitle}
                  className="w-full h-full rounded-lg border border-biru-200 shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
