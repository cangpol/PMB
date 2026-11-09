import React, { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { Card } from "../common";
import { fetchApi } from "../../services/api";

interface Item {
  kode: string;
  label: string;
  jumlah: number;
  persen: number;
  rincian?: { nama: string; jumlah: number }[];
}

export const SumberInformasiCard: React.FC = () => {
  const [data, setData] = useState<{ total: number; items: Item[] } | null>(
    null,
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchApi<{ total: number; items: Item[] }>(
      "/api/dashboard/admin/sumber-informasi",
    )
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const tampil = data?.items.filter((i) => i.jumlah > 0) ?? [];

  return (
    <Card className="p-5 border-biru-200 bg-putih rounded-2xl shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-biru-800" />
        <h3 className="font-serif font-bold text-base text-biru-950">
          Sumber Informasi PMB
        </h3>
        {data && (
          <span className="ml-auto text-xs text-biru-700">
            {data.total} calon terdaftar
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-rose-700">
          Gagal memuat data sumber informasi.
        </p>
      )}
      {data && tampil.length === 0 && (
        <p className="text-xs text-biru-700">Belum ada data.</p>
      )}
      <ul className="space-y-2">
        {tampil.map((i) => (
          <li key={i.kode} className="text-xs">
            <div className="flex justify-between text-biru-900">
              <span>{i.label}</span>
              <span className="font-semibold">
                {i.jumlah} ({i.persen}%)
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-biru-100 mt-1">
              <div
                className="h-1.5 rounded-full bg-biru-600"
                style={{ width: `${Math.min(100, i.persen)}%` }}
              />
            </div>
            {i.rincian && i.rincian.length > 0 && (
              <p className="mt-1 text-[11px] text-biru-700">
                {i.rincian.map((r) => `${r.nama} ${r.jumlah}`).join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
};
