import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button, Card, ErrorState } from "../../components/common";
import { fetchApi, type ApiError } from "@/services/api";
import { useToast } from "@/components/ui/useToast";
import {
  LABEL_STATUS_PROSPEK,
  LABEL_SUMBER_PROSPEK,
  tautanWa,
  type Prospek,
} from "../../lib/prospek";
import { unduhProspek, type FormatEkspor } from "../../lib/prospekEkspor";

const BarisProspek: React.FC<{ p: Prospek }> = ({ p }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState(p.status);
  const [catatan, setCatatan] = useState(p.catatan ?? "");
  const berubah = status !== p.status || catatan.trim() !== (p.catatan ?? "");

  const simpan = useMutation({
    mutationFn: () =>
      fetchApi(`/api/cms/admin/prospek/${p.id}`, {
        method: "PUT",
        body: JSON.stringify({ status, catatan: catatan.trim() || null }),
      }),
    onSuccess: () => {
      toast({ title: "Tersimpan", description: p.nama, variant: "success" });
      void qc.invalidateQueries({ queryKey: ["prospek-calon"] });
    },
    onError: (e) =>
      toast({
        title: "Gagal menyimpan",
        description: (e as unknown as ApiError).pesan ?? "Terjadi kesalahan.",
        variant: "error",
      }),
  });

  return (
    <tr className="border-b border-biru-100 align-top">
      <td className="py-2.5 px-3 whitespace-nowrap text-biru-700">
        {new Date(p.created_at).toLocaleDateString("id-ID")}
      </td>
      <td className="py-2.5 px-3 min-w-40">
        <p className="font-semibold text-biru-950">{p.nama}</p>
        <p className="text-[11px] text-biru-600">
          {p.asal_sekolah || LABEL_SUMBER_PROSPEK[p.sumber] || p.sumber}
        </p>
        {p.sumber === "KONSULTASI_ONLINE" && (
          <span className="mt-1 inline-block rounded-full bg-biru-100 px-2 py-0.5 text-[10px] font-bold text-biru-800">
            Konsultasi online
          </span>
        )}
      </td>
      <td className="py-2.5 px-3 whitespace-nowrap">
        <a
          href={tautanWa(p.no_hp)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-biru-700 underline"
        >
          {p.no_hp}
        </a>
        <a
          href={`mailto:${p.email}`}
          className="block text-[11px] text-biru-600 hover:underline"
        >
          {p.email}
        </a>
      </td>
      <td className="py-2.5 px-3 min-w-36 max-w-64">
        {p.prodi_minat}
        {p.pesan && (
          <p className="mt-1 whitespace-pre-wrap rounded-lg bg-biru-50 px-2 py-1.5 text-[11px] text-biru-800">
            {p.pesan}
          </p>
        )}
      </td>
      <td className="py-2.5 px-3">
        <select
          aria-label={`Status ${p.nama}`}
          value={status}
          onChange={(e) => setStatus(e.target.value as Prospek["status"])}
          className="rounded-lg border border-biru-200 px-2 py-1.5"
        >
          {Object.entries(LABEL_STATUS_PROSPEK).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2.5 px-3">
        <input
          aria-label={`Catatan ${p.nama}`}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Catatan tindak lanjut"
          className="w-48 rounded-lg border border-biru-200 px-2 py-1.5"
        />
      </td>
      <td className="py-2.5 px-3 text-right">
        <Button
          size="sm"
          disabled={!berubah || simpan.isPending}
          onClick={() => simpan.mutate()}
        >
          Simpan
        </Button>
      </td>
    </tr>
  );
};

export const ProspekCalonPage: React.FC = () => {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"" | Prospek["status"]>("");
  const [sumber, setSumber] = useState("");
  const [mengunduh, setMengunduh] = useState<FormatEkspor | null>(null);
  const { data, isLoading, isError, refetch } = useQuery<Prospek[]>({
    queryKey: ["prospek-calon"],
    queryFn: () => fetchApi("/api/cms/admin/prospek"),
  });
  const tampil = (data ?? []).filter(
    (p) => (!filter || p.status === filter) && (!sumber || p.sumber === sumber),
  );

  const unduh = async (format: FormatEkspor) => {
    setMengunduh(format);
    try {
      await unduhProspek(format, { status: filter, sumber });
      toast({
        title: format === "xlsx" ? "Excel diunduh" : "PDF diunduh",
        description: `${tampil.length} prospek masuk berkas.`,
        variant: "success",
      });
    } catch (e) {
      toast({
        title: "Gagal mengunduh",
        description: e instanceof Error ? e.message : "Terjadi kesalahan.",
        variant: "error",
      });
    } finally {
      setMengunduh(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-biru-950">
            Calon Prospek
          </h1>
          <p className="text-sm text-biru-700 mt-1">
            Pengunjung yang mengisi formulir minat di pop up halaman depan.
            Hubungi lewat WhatsApp atau email, lalu tandai statusnya.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter status prospek"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="rounded-lg border border-biru-200 px-3 py-2 text-xs"
          >
            <option value="">Semua status</option>
            {Object.entries(LABEL_STATUS_PROSPEK).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter sumber prospek"
            value={sumber}
            onChange={(e) => setSumber(e.target.value)}
            className="rounded-lg border border-biru-200 px-3 py-2 text-xs"
          >
            <option value="">Semua sumber</option>
            {Object.entries(LABEL_SUMBER_PROSPEK).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={tampil.length === 0 || mengunduh !== null}
            onClick={() => void unduh("xlsx")}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {mengunduh === "xlsx" ? "Mengunduh…" : "Excel"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={tampil.length === 0 || mengunduh !== null}
            onClick={() => void unduh("pdf")}
          >
            <FileText className="w-4 h-4" />
            {mengunduh === "pdf" ? "Mengunduh…" : "PDF"}
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-biru-700">Memuat…</p>}
      {isError && (
        <ErrorState
          title="Gagal memuat prospek"
          message="Periksa koneksi lalu coba lagi."
          onRetry={() => void refetch()}
        />
      )}
      {data && (
        <Card className="p-3 overflow-x-auto">
          {tampil.length === 0 ? (
            <p className="p-4 text-sm text-biru-700">Belum ada data.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-biru-600 border-b border-biru-200">
                  <th className="py-2 px-3">Tanggal</th>
                  <th className="py-2 px-3">Nama &amp; Sekolah</th>
                  <th className="py-2 px-3">Kontak</th>
                  <th className="py-2 px-3">Program Studi</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Catatan</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {tampil.map((p) => (
                  <BarisProspek key={p.id} p={p} />
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
};
