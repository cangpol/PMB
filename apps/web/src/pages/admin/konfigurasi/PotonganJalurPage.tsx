import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, ErrorState } from "../../../components/common";
import { fetchApi, type ApiError } from "@/services/api";
import { useToast } from "@/components/ui/useToast";
import { formatRupiah } from "../../../services/prodi";
import {
  ALUR_LABEL,
  ATURAN_KHUSUS,
  parsePersen,
  parseRapor,
  type PotonganJalur,
} from "../../../lib/potonganJalur";

const teks = (n: number | null) => (n === null ? "" : String(n));

const KartuJalur: React.FC<{ j: PotonganJalur }> = ({ j }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tetap, setTetap] = useState(teks(j.potongan_tetap));
  const [maks, setMaks] = useState(teks(j.potongan_maks));
  const [rapor, setRapor] = useState(teks(j.rapor_minimal));
  const [formulir, setFormulir] = useState(String(j.biaya_formulir));
  const [benefit, setBenefit] = useState(j.benefit_tambahan ?? "");

  const vTetap = parsePersen(tetap);
  const vMaks = parsePersen(maks);
  const vRapor = parseRapor(rapor);
  const vFormulir = /^\d{1,12}$/.test(formulir.trim())
    ? Number(formulir)
    : undefined;
  const lewatBatas =
    typeof vTetap === "number" && typeof vMaks === "number" && vTetap > vMaks;
  const valid =
    vTetap !== undefined &&
    vMaks !== undefined &&
    vRapor !== undefined &&
    vFormulir !== undefined &&
    !lewatBatas;
  const berubah =
    vTetap !== j.potongan_tetap ||
    vMaks !== j.potongan_maks ||
    vRapor !== j.rapor_minimal ||
    vFormulir !== j.biaya_formulir ||
    benefit.trim() !== (j.benefit_tambahan ?? "");

  const simpan = useMutation({
    mutationFn: () =>
      fetchApi(`/api/admin/konfigurasi/potongan-jalur/${j.id}`, {
        method: "PUT",
        body: JSON.stringify({
          potongan_tetap: vTetap,
          potongan_maks: vMaks,
          rapor_minimal: vRapor,
          biaya_formulir: vFormulir,
          benefit_tambahan: benefit.trim() || null,
          kriteria_seleksi: j.kriteria_seleksi,
        }),
      }),
    onSuccess: () => {
      toast({
        title: "Potongan tersimpan",
        description: j.nama_jalur,
        variant: "success",
      });
      void qc.invalidateQueries({ queryKey: ["potongan-jalur"] });
    },
    onError: (e) =>
      toast({
        title: "Gagal menyimpan",
        description: (e as unknown as ApiError).pesan ?? "Terjadi kesalahan.",
        variant: "error",
      }),
  });

  const field = (
    label: string,
    nilai: string,
    ubah: (v: string) => void,
    salah: boolean,
    petunjuk: string,
  ) => (
    <label className="block text-xs">
      <span className="font-semibold text-biru-900">{label}</span>
      <input
        aria-label={`${label} ${j.nama_jalur}`}
        inputMode="decimal"
        value={nilai}
        onChange={(e) => ubah(e.target.value)}
        className={`mt-1 w-full rounded-lg border px-2.5 py-1.5 tabular-nums ${
          salah ? "border-red-400" : "border-biru-200"
        }`}
      />
      <span className="text-[11px] text-biru-600">{petunjuk}</span>
    </label>
  );

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-bold text-biru-950">{j.nama_jalur}</h2>
          <p className="text-[11px] text-biru-600">
            {ALUR_LABEL[j.alur_seleksi]} · {j.jumlah_calon_berpotongan} calon
            sudah berpotongan
            {!j.is_active && " · nonaktif"}
          </p>
        </div>
        <Button
          size="sm"
          disabled={!valid || !berubah || simpan.isPending}
          onClick={() => simpan.mutate()}
        >
          Simpan
        </Button>
      </div>
      {ATURAN_KHUSUS[j.kode_jalur] && (
        <p className="text-[11px] rounded-lg bg-biru-50 text-biru-800 px-3 py-2">
          {ATURAN_KHUSUS[j.kode_jalur]}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {field(
          "Potongan tetap (%)",
          tetap,
          setTetap,
          vTetap === undefined || lewatBatas,
          "Kosong = ditentukan admin per calon",
        )}
        {field(
          "Batas potongan admin (%)",
          maks,
          setMaks,
          vMaks === undefined || lewatBatas,
          "Maksimal yang boleh diberikan admin",
        )}
        {field(
          "Rapor minimal",
          rapor,
          setRapor,
          vRapor === undefined,
          "Kosong = tanpa syarat rapor",
        )}
        {field(
          "Biaya formulir (Rp)",
          formulir,
          setFormulir,
          vFormulir === undefined,
          vFormulir === 0 ? "Gratis" : formatRupiah(vFormulir ?? 0),
        )}
      </div>
      {lewatBatas && (
        <p role="alert" className="text-[11px] text-red-600">
          Potongan tetap tidak boleh melebihi batas potongan admin.
        </p>
      )}
      <label className="block text-xs">
        <span className="font-semibold text-biru-900">Benefit tambahan</span>
        <input
          aria-label={`Benefit tambahan ${j.nama_jalur}`}
          value={benefit}
          onChange={(e) => setBenefit(e.target.value)}
          className="mt-1 w-full rounded-lg border border-biru-200 px-2.5 py-1.5"
        />
      </label>
    </Card>
  );
};

export const PotonganJalurPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery<PotonganJalur[]>({
    queryKey: ["potongan-jalur"],
    queryFn: () => fetchApi("/api/admin/konfigurasi/potongan-jalur"),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-bold text-biru-950">
          Potongan Biaya per Jalur
        </h1>
        <p className="text-sm text-biru-700 mt-1">
          Atur potongan biaya DPP dan SKS untuk tiap jalur masuk. Potongan tetap
          diberikan seragam saat admin menyetujui calon; bila kosong, admin
          menentukan potongan per calon pada menu Seleksi &amp; Kuota Jalur,
          sebatas batas potongan di sini. Perubahan berlaku untuk persetujuan
          berikutnya, calon yang sudah disetujui tidak berubah.
        </p>
      </div>
      {isLoading && <p className="text-sm text-biru-700">Memuat…</p>}
      {isError && (
        <ErrorState
          title="Gagal memuat potongan jalur"
          message="Periksa koneksi lalu coba lagi."
          onRetry={() => void refetch()}
        />
      )}
      {data?.map((j) => (
        <KartuJalur key={j.id} j={j} />
      ))}
    </div>
  );
};
