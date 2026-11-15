import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileSpreadsheet, FileText, UserPlus } from "lucide-react";
import { unduhProspek, type FormatEkspor } from "../../lib/prospekEkspor";
import { useToast } from "@/components/ui/useToast";
import { Card } from "../common";
import { fetchApi } from "@/services/api";
import {
  LABEL_STATUS_PROSPEK,
  LABEL_SUMBER_PROSPEK,
  tautanWa,
  type Prospek,
} from "../../lib/prospek";

/** Ringkasan calon prospek dari formulir minat di halaman depan (dashboard eksekutif). */
export const RingkasanProspekCard: React.FC = () => {
  const { toast } = useToast();
  const unduh = (format: FormatEkspor) =>
    unduhProspek(format).catch((e: unknown) =>
      toast({
        title: "Gagal mengunduh",
        description: e instanceof Error ? e.message : "Terjadi kesalahan.",
        variant: "error",
      }),
    );
  const { data } = useQuery<Prospek[]>({
    queryKey: ["prospek-calon"],
    queryFn: () => fetchApi("/api/cms/admin/prospek"),
    refetchInterval: 60_000,
  });
  if (!data) return null;

  const hitung = (s: Prospek["status"]) =>
    data.filter((p) => p.status === s).length;
  const ringkas: [string, number][] = [
    ["Total prospek", data.length],
    [
      "Konsultasi belum dibalas",
      data.filter(
        (p) => p.sumber === "KONSULTASI_ONLINE" && p.status === "BARU",
      ).length,
    ],
    ["Belum dihubungi", hitung("BARU")],
    ["Sudah dihubungi", hitung("DIHUBUNGI")],
    ["Sudah daftar", hitung("SUDAH_DAFTAR")],
  ];

  return (
    <Card className="p-5 border-biru-200 bg-putih space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-biru-100 flex items-center justify-center text-biru-800 shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-biru-950">
              Calon Prospek
            </h2>
            <p className="text-[11px] text-biru-600">
              Formulir minat (pop up) dan konsultasi online dari halaman Kontak
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void unduh("xlsx")}
            className="inline-flex items-center gap-1 rounded-lg border border-biru-200 px-2.5 py-1.5 text-xs font-semibold text-biru-800 hover:bg-biru-50 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            type="button"
            onClick={() => void unduh("pdf")}
            className="inline-flex items-center gap-1 rounded-lg border border-biru-200 px-2.5 py-1.5 text-xs font-semibold text-biru-800 hover:bg-biru-50 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <Link
            to="/admin/cms/prospek"
            className="inline-flex items-center gap-1 text-xs font-bold text-biru-700 hover:text-biru-950"
          >
            Kelola semua <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ringkas.map(([k, v]) => (
          <div
            key={k}
            className="rounded-xl border border-biru-100 bg-biru-50/50 px-3 py-2"
          >
            <dt className="text-[11px] text-biru-600">{k}</dt>
            <dd className="font-serif text-2xl font-extrabold text-biru-950 tabular-nums">
              {v}
            </dd>
          </div>
        ))}
      </dl>

      {data.length === 0 ? (
        <p className="text-xs text-biru-700">Belum ada data masuk.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-biru-600 border-b border-biru-200">
                <th className="py-2 pr-3">Tanggal</th>
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3">Asal Sekolah</th>
                <th className="py-2 pr-3">Sumber</th>
                <th className="py-2 pr-3">Program Studi &amp; Pertanyaan</th>
                <th className="py-2 pr-3">Kontak</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 5).map((p) => (
                <tr key={p.id} className="border-b border-biru-100">
                  <td className="py-2 pr-3 whitespace-nowrap text-biru-700">
                    {new Date(p.created_at).toLocaleDateString("id-ID")}
                  </td>
                  <td className="py-2 pr-3 font-semibold text-biru-950">
                    {p.nama}
                  </td>
                  <td className="py-2 pr-3">{p.asal_sekolah || "-"}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {LABEL_SUMBER_PROSPEK[p.sumber] ?? p.sumber}
                  </td>
                  <td className="py-2 pr-3 max-w-72">
                    {p.prodi_minat}
                    {p.pesan && (
                      <span className="block truncate text-[11px] text-biru-600">
                        “{p.pesan}”
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <a
                      href={tautanWa(p.no_hp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-biru-700 underline"
                    >
                      {p.no_hp}
                    </a>
                  </td>
                  <td className="py-2">{LABEL_STATUS_PROSPEK[p.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
