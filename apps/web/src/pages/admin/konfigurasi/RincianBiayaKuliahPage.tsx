import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, ErrorState } from "../../../components/common";
import { fetchApi, type ApiError } from "@/services/api";
import { useToast } from "@/components/ui/useToast";
import { formatRupiah } from "../../../services/prodi";
import {
  MAKS_SEMESTER,
  parseNominal,
  totalHinggaLulus,
  type RincianBiayaKuliah,
} from "../../../lib/biayaKuliah";

const SEMESTER = Array.from({ length: MAKS_SEMESTER }, (_, i) => i + 1);

const BarisBiaya: React.FC<{ r: RincianBiayaKuliah }> = ({ r }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [admisi, setAdmisi] = useState(String(r.admisi));
  const [semester, setSemester] = useState(r.semester.map(String));

  const nilaiAdmisi = parseNominal(admisi);
  const nilaiSemester = semester.map(parseNominal);
  // Semester di luar lama studi prodi (mis. 7-8 untuk D3) tidak dipakai
  const dipakai = (i: number) => i < r.jumlah_semester;
  const valid =
    nilaiAdmisi !== null &&
    nilaiSemester.every((v, i) => !dipakai(i) || v !== null);
  const berubah =
    nilaiAdmisi !== r.admisi ||
    nilaiSemester.some((v, i) => dipakai(i) && v !== r.semester[i]);
  const total = valid
    ? totalHinggaLulus(
        nilaiAdmisi!,
        nilaiSemester.map((v) => v ?? 0),
        r.jumlah_semester,
      )
    : null;

  const simpan = useMutation({
    mutationFn: () =>
      fetchApi(`/api/admin/konfigurasi/rincian-biaya-kuliah/${r.prodi_id}`, {
        method: "PUT",
        body: JSON.stringify({
          admisi: nilaiAdmisi,
          semester: nilaiSemester.map((v, i) =>
            dipakai(i) ? v : r.semester[i],
          ),
        }),
      }),
    onSuccess: () => {
      toast({
        title: "Biaya kuliah tersimpan",
        description: `${r.jenjang} ${r.nama_prodi}`,
        variant: "success",
      });
      void qc.invalidateQueries({ queryKey: ["rincian-biaya-kuliah"] });
    },
    onError: (e) =>
      toast({
        title: "Gagal menyimpan",
        description: (e as unknown as ApiError).pesan ?? "Terjadi kesalahan.",
        variant: "error",
      }),
  });

  const input = (
    label: string,
    nilai: string,
    ubah: (v: string) => void,
    salah: boolean,
    nonaktif = false,
  ) => (
    <td className="py-2 px-1.5">
      <input
        aria-label={`${label} ${r.nama_prodi}`}
        inputMode="numeric"
        value={nonaktif ? "-" : nilai}
        disabled={nonaktif}
        onChange={(e) => ubah(e.target.value)}
        className={`w-24 rounded-lg border px-2 py-1.5 text-right tabular-nums text-xs disabled:bg-biru-50 disabled:text-biru-400 ${
          salah ? "border-red-400" : "border-biru-200"
        }`}
      />
    </td>
  );

  return (
    <tr className="border-b border-biru-100">
      <td className="py-2 px-3 min-w-44">
        <p className="font-semibold text-biru-950">
          {r.jenjang} {r.nama_prodi}
        </p>
        <p className="text-[11px] text-biru-600">
          {r.fakultas} · {r.jumlah_semester} semester
        </p>
      </td>
      {input("Admisi", admisi, setAdmisi, nilaiAdmisi === null)}
      {SEMESTER.map((n, i) =>
        input(
          `Semester ${n}`,
          semester[i],
          (v) => setSemester((s) => s.map((x, j) => (j === i ? v : x))),
          dipakai(i) && nilaiSemester[i] === null,
          !dipakai(i),
        ),
      )}
      <td className="py-2 px-3 text-right font-bold tabular-nums text-biru-950 whitespace-nowrap">
        {total === null ? "-" : formatRupiah(total)}
      </td>
      <td className="py-2 px-3 text-right">
        <Button
          size="sm"
          disabled={!valid || !berubah || simpan.isPending}
          onClick={() => simpan.mutate()}
        >
          Simpan
        </Button>
      </td>
    </tr>
  );
};

export const RincianBiayaKuliahPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery<RincianBiayaKuliah[]>({
    queryKey: ["rincian-biaya-kuliah"],
    queryFn: () => fetchApi("/api/master/rincian-biaya-kuliah"),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-bold text-biru-950">
          Rincian Biaya Kuliah
        </h1>
        <p className="text-sm text-biru-700 mt-1">
          Atur biaya kuliah tiap program studi. Total pembayaran hingga lulus =
          jumlah Admisi dan biaya setiap semester (S1: 8 semester, D3: 6
          semester), dihitung otomatis dan tampil di halaman Biaya publik. Biaya
          daftar ulang calon = Admisi − biaya formulir pendaftaran yang sudah
          dibayar.
        </p>
      </div>

      {isLoading && <p className="text-sm text-biru-700">Memuat…</p>}
      {isError && (
        <ErrorState
          title="Gagal memuat rincian biaya"
          message="Periksa koneksi lalu coba lagi."
          onRetry={() => void refetch()}
        />
      )}
      {data && (
        <Card className="p-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-biru-600 border-b border-biru-200">
                <th className="py-2 px-3">Program Studi</th>
                <th className="py-2 px-1.5 text-right">Admisi</th>
                {SEMESTER.map((n) => (
                  <th key={n} className="py-2 px-1.5 text-right">
                    Semester {n}
                  </th>
                ))}
                <th className="py-2 px-3 text-right">Total hingga Lulus</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <BarisBiaya
                  key={`${r.prodi_id}-${r.admisi}-${r.semester.join("-")}`}
                  r={r}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
