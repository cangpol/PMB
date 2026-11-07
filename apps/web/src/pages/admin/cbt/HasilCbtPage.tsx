import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  Search,
  Download,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  Button,
  ErrorState,
  Input,
  Select,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { useDialog } from "@/components/ui/useDialog";
import { fetchApi } from "@/services/api";
import { KUNCI_ANTREAN } from "@/hooks/useAntreanVerifikasi";
import type { components } from "@/types/api";

type HasilCbt = components["schemas"]["HasilCbtAdminResponse"];
type BarisHasil = HasilCbt["items"][number];
type Sesi = { id: string; nama_sesi: string; jadwal_selesai: string };

const pesanError = (e: unknown) =>
  (e as { pesan?: string })?.pesan ??
  (e instanceof Error ? e.message : "Terjadi kesalahan. Silakan coba lagi.");

const NAMA_STATUS: Record<string, string> = {
  MENUNGGU: "Belum mulai",
  SEDANG_MENGERJAKAN: "Mengerjakan",
  SELESAI: "Selesai",
  WAKTU_HABIS: "Waktu habis",
};

const fmtTanggal = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export const HasilCbtPage: React.FC = () => {
  const dialog = useDialog();
  const qc = useQueryClient();
  const [ulang, setUlang] = useState<BarisHasil | null>(null);
  const [filter, setFilter] = useState<"SEMUA" | "KEPUTUSAN" | "LULUS">(
    "SEMUA",
  );
  const [cari, setCari] = useState("");
  const [cariTerpakai, setCariTerpakai] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setCariTerpakai(cari), 300);
    return () => clearTimeout(t);
  }, [cari]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["hasil-cbt-admin", cariTerpakai],
    queryFn: () =>
      fetchApi<HasilCbt>(
        `/api/cbt/admin/hasil${cariTerpakai ? `?q=${encodeURIComponent(cariTerpakai)}` : ""}`,
      ),
    refetchInterval: 15_000,
  });

  // Percobaan terbaru per calon: percobaan lama (sudah diulang) tidak butuh tindakan lagi
  const { baris, terbaru, jumlahLulus, jumlahKeputusan } = useMemo(() => {
    const items = data?.items ?? [];
    const selesai = (x: BarisHasil) =>
      x.status_ujian === "SELESAI" || x.status_ujian === "WAKTU_HABIS";
    const sedangUlang = new Set(
      items.filter((x) => !selesai(x)).map((x) => x.pendaftar_id),
    );
    const sudahTerlihat = new Set<string>();
    const terbaru = new Set<string>();
    for (const x of items) {
      if (!selesai(x) || sedangUlang.has(x.pendaftar_id)) continue;
      if (!sudahTerlihat.has(x.pendaftar_id)) {
        sudahTerlihat.add(x.pendaftar_id);
        terbaru.add(x.peserta_sesi_id);
      }
    }
    const perluKeputusan = (x: BarisHasil) =>
      terbaru.has(x.peserta_sesi_id) &&
      x.is_lulus === false &&
      !x.disetujui_admin;
    const lulus = (x: BarisHasil) =>
      terbaru.has(x.peserta_sesi_id) && x.is_lulus === true;
    return {
      terbaru,
      jumlahLulus: items.filter(lulus).length,
      jumlahKeputusan: items.filter(perluKeputusan).length,
      baris:
        filter === "KEPUTUSAN"
          ? items.filter(perluKeputusan)
          : filter === "LULUS"
            ? items.filter(lulus)
            : items,
    };
  }, [data, filter]);

  const setujui = async (p: BarisHasil) => {
    const lulus = p.is_lulus === true;
    let alasan: string | null = "";
    if (lulus) {
      const ya = await dialog.konfirmasi({
        judul: `Setujui hasil ${p.nama_peserta}?`,
        deskripsi: `Nilai ${p.nilai_akhir?.toFixed(2)} sudah memenuhi passing grade. Hasil ditandai "Disetujui admin"; peserta tetap lanjut ke tahap pengumuman.`,
        nada: "sukses",
        labelYa: "Setujui",
      });
      if (!ya) return;
    } else {
      alasan = await dialog.masukkanAlasan({
        judul: `Setujui ${p.nama_peserta} melanjutkan proses?`,
        deskripsi: `Nilai ${p.nilai_akhir?.toFixed(2)} di bawah batas lulus. Hasil diubah menjadi LULUS (disetujui admin) dan peserta lanjut ke tahap pengumuman. Nilai asli tidak berubah.`,
        label: "Alasan persetujuan",
        placeholder: "Contoh: kendala teknis saat ujian",
        labelKirim: "Setujui",
      });
      if (!alasan) return;
    }
    try {
      await fetchApi(`/api/cbt/admin/hasil/${p.peserta_sesi_id}/setujui`, {
        method: "POST",
        body: JSON.stringify({ alasan: alasan || null }),
      });
      await qc.invalidateQueries({ queryKey: ["hasil-cbt-admin"] });
      await qc.invalidateQueries({ queryKey: KUNCI_ANTREAN });
      await dialog.hasil({
        nada: "sukses",
        judul: "Hasil disetujui",
        deskripsi: `${p.nama_peserta} dapat melanjutkan proses seleksi.`,
        autoTutupMs: 3500,
      });
    } catch (e) {
      await dialog.hasil({
        nada: "gagal",
        judul: "Gagal menyetujui",
        deskripsi: pesanError(e),
      });
    }
  };

  const unduhCsv = useMemo(
    () => () => {
      if (!data) return;
      const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const baris = [
        [
          "No",
          "Nomor Peserta",
          "Nama",
          "Email",
          "Sesi",
          "Status",
          "Benar",
          "Salah",
          "Kosong",
          "Nilai",
          "Hasil",
          "Waktu Submit",
        ].join(","),
        ...data.items.map((p, i) =>
          [
            i + 1,
            q(p.nomor_peserta),
            q(p.nama_peserta),
            q(p.email),
            q(p.nama_sesi),
            p.status_ujian,
            p.jumlah_benar ?? "",
            p.jumlah_salah ?? "",
            p.jumlah_kosong ?? "",
            p.nilai_akhir?.toFixed(2) ?? "",
            p.is_lulus == null ? "" : p.is_lulus ? "LULUS" : "TIDAK LULUS",
            p.waktu_submit ?? "",
          ].join(","),
        ),
      ];
      const url = URL.createObjectURL(
        new Blob([baris.join("\n")], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "hasil-cbt.csv";
      a.click();
      URL.revokeObjectURL(url);
    },
    [data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-biru-700 uppercase tracking-wider mb-1">
            <ClipboardCheck className="w-4 h-4" />
            <span>Ujian Seleksi (CBT)</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Hasil Pengerjaan CBT
          </h1>
          <p className="text-xs sm:text-sm text-biru-800 font-light mt-1">
            Skor, jumlah benar/salah, dan status semua peserta dari seluruh
            sesi. Diperbarui otomatis.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={unduhCsv}
          disabled={!data || data.items.length === 0}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Ekspor CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ["Peserta", data?.total],
          ["Sudah selesai", data?.selesai],
          ["Memenuhi passing grade", jumlahLulus],
          ["Perlu keputusan admin", jumlahKeputusan],
          ["Rata-rata nilai", data?.rata_rata?.toFixed(2) ?? "-"],
        ].map(([judul, nilai]) => (
          <div
            key={judul as string}
            className="bg-putih border border-biru-200 rounded-2xl p-4"
          >
            <p className="text-xs uppercase tracking-wide text-biru-700">
              {judul}
            </p>
            <p className="text-2xl font-bold text-biru-950">{nilai ?? "-"}</p>
          </div>
        ))}
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Saring hasil"
      >
        {(
          [
            ["SEMUA", "Semua"],
            ["KEPUTUSAN", `Perlu keputusan (${jumlahKeputusan})`],
            ["LULUS", `Memenuhi passing grade (${jumlahLulus})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={filter === k}
            onClick={() => setFilter(k)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === k
                ? "border-biru-700 bg-biru-700 text-white"
                : "border-biru-200 bg-putih text-biru-800 hover:bg-biru-50"
            } ${k === "KEPUTUSAN" && jumlahKeputusan > 0 && filter !== k ? "border-rose-300 text-rose-700" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      <Input
        aria-label="Cari peserta"
        placeholder="Cari nama, email, atau nomor peserta..."
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
      />

      {error ? (
        <ErrorState
          message={error instanceof Error ? error.message : "Gagal memuat"}
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto bg-putih border border-biru-200 rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-biru-700 bg-biru-50/60">
                <th className="px-4 py-3">Peserta</th>
                <th className="px-4 py-3">Sesi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">
                  Benar / Salah / Kosong
                </th>
                <th className="px-4 py-3 text-right">Nilai</th>
                <th className="px-4 py-3 text-center">Hasil</th>
                <th className="px-4 py-3">Selesai</th>
                <th className="px-4 py-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {baris.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-biru-800"
                  >
                    Tidak ada hasil pada kategori ini.
                  </td>
                </tr>
              )}
              {baris.map((p) => (
                <tr
                  key={p.peserta_sesi_id}
                  className="border-t border-biru-100 hover:bg-biru-50/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-biru-950">
                      {p.nama_peserta}
                    </div>
                    <div className="text-xs text-biru-700">
                      {p.nomor_peserta} · {p.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="text-biru-700 underline-offset-2 hover:underline"
                      to={`/admin/cbt/monitor/${p.sesi_id}`}
                    >
                      {p.nama_sesi}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {NAMA_STATUS[p.status_ujian] ?? p.status_ujian}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {p.nilai_akhir == null
                      ? "-"
                      : `${p.jumlah_benar} / ${p.jumlah_salah} / ${p.jumlah_kosong}`}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {p.nilai_akhir == null ? "-" : p.nilai_akhir.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.is_lulus == null ? (
                      "-"
                    ) : (
                      <>
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold border ${
                            p.is_lulus
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {p.is_lulus ? "LULUS" : "TIDAK LULUS"}
                        </span>
                        {p.disetujui_admin && (
                          <div
                            className="mt-1 text-[10px] text-biru-700"
                            title={p.disetujui_alasan ?? undefined}
                          >
                            Disetujui admin
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-biru-800">
                    {fmtTanggal(p.waktu_submit)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!terbaru.has(p.peserta_sesi_id) &&
                      (p.status_ujian === "SELESAI" ||
                        p.status_ujian === "WAKTU_HABIS") && (
                        <span className="text-xs text-biru-700">
                          Percobaan sebelumnya
                        </span>
                      )}
                    {terbaru.has(p.peserta_sesi_id) && (
                      <div className="flex justify-end gap-2">
                        {p.is_lulus != null && !p.disetujui_admin && (
                          <Button
                            size="sm"
                            variant={p.is_lulus ? "outline" : "primary"}
                            leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                            onClick={() => void setujui(p)}
                          >
                            Setujui
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                          onClick={() => setUlang(p)}
                        >
                          Ujian Ulang
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ulang && (
        <UjianUlangModal
          peserta={ulang}
          onTutup={() => setUlang(null)}
          onBerhasil={async () => {
            const nama = ulang.nama_peserta;
            setUlang(null);
            await qc.invalidateQueries({ queryKey: ["hasil-cbt-admin"] });
            await dialog.hasil({
              nada: "sukses",
              judul: "Ujian ulang diizinkan",
              deskripsi: `${nama} dapat mengerjakan CBT kembali dari menu Ujian Seleksi.`,
              autoTutupMs: 3500,
            });
          }}
        />
      )}
    </div>
  );
};

const UjianUlangModal: React.FC<{
  peserta: BarisHasil;
  onTutup: () => void;
  onBerhasil: () => void | Promise<void>;
}> = ({ peserta, onTutup, onBerhasil }) => {
  const [sesiId, setSesiId] = useState("");
  const [alasan, setAlasan] = useState("");
  const [kirim, setKirim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: sesi } = useQuery({
    queryKey: ["sesi-cbt-admin"],
    queryFn: () => fetchApi<Sesi[]>("/api/cbt/admin/sesi"),
  });
  const sesiTerbuka = (sesi ?? []).filter(
    (x) => new Date(x.jadwal_selesai).getTime() > Date.now(),
  );

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onTutup();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onTutup]);

  const submit = async () => {
    if (alasan.trim().length < 5) {
      setError("Alasan wajib diisi (minimal 5 karakter).");
      return;
    }
    try {
      setKirim(true);
      setError(null);
      await fetchApi(
        `/api/cbt/admin/hasil/${peserta.peserta_sesi_id}/ujian-ulang`,
        {
          method: "POST",
          body: JSON.stringify({
            alasan: alasan.trim(),
            sesi_id: sesiId || null,
          }),
        },
      );
      await onBerhasil();
    } catch (e) {
      setError(pesanError(e));
    } finally {
      setKirim(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-biru-950/50 p-4 backdrop-blur-sm"
      onClick={onTutup}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Izinkan ujian ulang"
        className="w-full max-w-md space-y-4 rounded-2xl bg-putih p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-bold text-biru-950">
            Izinkan ujian ulang
          </h2>
          <p className="text-sm text-biru-800">
            {peserta.nama_peserta} ({peserta.nomor_peserta}), nilai saat ini{" "}
            {peserta.nilai_akhir?.toFixed(2) ?? "-"}.
          </p>
        </div>
        <div className="space-y-1">
          <label
            className="text-xs font-bold text-biru-900"
            htmlFor="sesi-ulang"
          >
            Sesi ujian
          </label>
          <Select
            id="sesi-ulang"
            value={sesiId}
            onChange={(e) => setSesiId(e.target.value)}
          >
            <option value="">Sesi yang sama (jika masih berlangsung)</option>
            {sesiTerbuka
              .filter((x) => x.id !== peserta.sesi_id)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nama_sesi}
                </option>
              ))}
          </Select>
          <p className="text-xs text-biru-700">
            Memilih sesi lain menyimpan riwayat percobaan sebelumnya. Di sesi
            yang sama, jawaban dan hasil lama diganti (jejaknya tetap ada di
            audit log).
          </p>
        </div>
        <div className="space-y-1">
          <label
            className="text-xs font-bold text-biru-900"
            htmlFor="alasan-ulang"
          >
            Alasan
          </label>
          <Textarea
            id="alasan-ulang"
            rows={3}
            maxLength={500}
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Contoh: gangguan koneksi saat ujian"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-rose-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onTutup} disabled={kirim}>
            Batal
          </Button>
          <Button onClick={() => void submit()} isLoading={kirim}>
            Izinkan Ujian Ulang
          </Button>
        </div>
      </div>
    </div>
  );
};
