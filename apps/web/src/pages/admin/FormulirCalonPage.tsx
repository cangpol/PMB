import React, { useCallback, useEffect, useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { PageHeader } from "@/components/admin/PageHeader";
import { fetchApi } from "@/services/api";

interface FormulirCalonItem {
  id: string;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  email: string;
  nama_jalur: string;
  nama_gelombang: string;
  status_pendaftaran: string;
  created_at: string;
}

interface FormulirCalonList {
  total: number;
  items: FormulirCalonItem[];
}

const PER_HALAMAN = 20;

const formatTanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

const labelStatus = (s: string) => s.replace(/_/g, " ");

/**
 * Menu admin "Formulir Calon": cari calon mahasiswa lalu unduh formulir
 * pendaftaran lengkap yang mereka isi dalam format PDF.
 */
export const FormulirCalonPage: React.FC = () => {
  const [kataKunci, setKataKunci] = useState("");
  const [q, setQ] = useState("");
  const [halaman, setHalaman] = useState(0);
  const [data, setData] = useState<FormulirCalonList | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tunda pencarian agar tidak memanggil API di setiap ketukan.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(kataKunci.trim());
      setHalaman(0);
    }, 350);
    return () => window.clearTimeout(t);
  }, [kataKunci]);

  const muat = useCallback(async () => {
    setMemuat(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PER_HALAMAN),
        offset: String(halaman * PER_HALAMAN),
      });
      if (q) params.set("q", q);
      setData(
        await fetchApi<FormulirCalonList>(
          `/api/pendaftaran/admin/formulir?${params.toString()}`,
        ),
      );
    } catch (e) {
      setError(
        (e as { pesan?: string }).pesan ?? "Gagal memuat daftar formulir calon.",
      );
    } finally {
      setMemuat(false);
    }
  }, [q, halaman]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void muat();
  }, [muat]);

  const total = data?.total ?? 0;
  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));

  return (
    <div className="space-y-6">
      <PageHeader
        tag="Pendaftaran & Berkas"
        title="Formulir Calon Mahasiswa"
        description="Unduh formulir pendaftaran lengkap yang diisi calon mahasiswa dalam format PDF."
      />

      <div className="relative max-w-md">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-biru-600"
        />
        <Input
          value={kataKunci}
          onChange={(e) => setKataKunci(e.target.value)}
          placeholder="Cari nama, nomor pendaftaran, atau email"
          aria-label="Cari calon mahasiswa"
          className="pl-10"
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void muat()} />
      ) : memuat && !data ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Calon tidak ditemukan"
          description={
            q
              ? "Tidak ada calon yang cocok dengan pencarian Anda."
              : "Belum ada calon mahasiswa yang mendaftar."
          }
        />
      ) : (
        <>
          <Table aria-busy={memuat}>
            <TableHeader>
              <TableRow>
                <TableHead>No. Pendaftaran</TableHead>
                <TableHead>Nama Calon</TableHead>
                <TableHead>Jalur / Gelombang</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mendaftar</TableHead>
                <TableHead className="text-right">Formulir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold whitespace-nowrap">
                    {c.nomor_pendaftaran}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-biru-950">
                      {c.nama_lengkap}
                    </div>
                    <div className="text-xs text-biru-700">{c.email}</div>
                  </TableCell>
                  <TableCell>
                    <div>{c.nama_jalur}</div>
                    <div className="text-xs text-biru-700">
                      {c.nama_gelombang}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="netral" size="sm">
                      {labelStatus(c.status_pendaftaran)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatTanggal(c.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <a
                      href={`/api/pendaftaran/${c.id}/cetak/formulir`}
                      download={`Formulir-${c.nomor_pendaftaran}.pdf`}
                      aria-label={`Unduh formulir PDF ${c.nama_lengkap}`}
                    >
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" aria-hidden="true" />
                        <span>PDF</span>
                      </Button>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-biru-800">
            <span>
              {total.toLocaleString("id-ID")} calon · Halaman {halaman + 1} dari{" "}
              {totalHalaman}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={halaman === 0 || memuat}
                onClick={() => setHalaman((h) => Math.max(0, h - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={halaman + 1 >= totalHalaman || memuat}
                onClick={() => setHalaman((h) => h + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
