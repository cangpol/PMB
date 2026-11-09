import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Repeat } from "lucide-react";
import { Button, Card, EmptyState } from "../../components/common";
import { fetchApi } from "@/services/api";
import { useAntreanVerifikasi } from "@/hooks/useAntreanVerifikasi";
import { useNotifikasiAdmin } from "@/hooks/useNotifikasiAdmin";
import { useToast } from "@/components/ui/useToast";
import { PanelInterview, PanelSeleksiAwal, pesanError } from "./SeleksiPanels";

export interface KuotaJalur {
  jalur_id: string;
  kode_jalur: string;
  nama_jalur: string;
  kuota_maksimal: number | null;
  terisi: number;
  menunggu_pindah: number;
}

interface MenungguPindah {
  pendaftar_id: string;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  jalur_id: string;
  nama_jalur: string;
}

type Tab = "PINDAH" | "RAPOR" | "INTERVIEW";

const TABS: { id: Tab; label: string }[] = [
  { id: "RAPOR", label: "Seleksi Rapor & Berkas" },
  { id: "INTERVIEW", label: "Seleksi Interview" },
  { id: "PINDAH", label: "Kuota & Pindah Jalur" },
];

/** Sisa kuota teks: "12 dari 70" atau "Tanpa batas". */
export function teksKuota(k: Pick<KuotaJalur, "kuota_maksimal" | "terisi">) {
  if (k.kuota_maksimal === null) return `${k.terisi} terisi · tanpa batas`;
  return `${k.terisi} dari ${k.kuota_maksimal} terisi`;
}

export const kuotaPenuh = (k: Pick<KuotaJalur, "kuota_maksimal" | "terisi">) =>
  k.kuota_maksimal !== null && k.terisi >= k.kuota_maksimal;

const PanelPindahJalur: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tujuan, setTujuan] = useState<Record<string, string>>({});

  const kuota = useQuery<KuotaJalur[]>({
    queryKey: ["admin-kuota-jalur"],
    queryFn: () => fetchApi("/api/pendaftaran/admin/kuota-jalur"),
  });
  const menunggu = useQuery<MenungguPindah[]>({
    queryKey: ["admin-menunggu-pindah"],
    queryFn: () => fetchApi("/api/pendaftaran/admin/pindah-jalur"),
  });
  const notifikasi = useNotifikasiAdmin();

  const segarkan = () => {
    for (const k of [
      "admin-kuota-jalur",
      "admin-menunggu-pindah",
      "admin-notifikasi",
    ])
      void qc.invalidateQueries({ queryKey: [k] });
  };

  const pindah = useMutation({
    mutationFn: (v: { pendaftarId: string; jalurId: string }) =>
      fetchApi(`/api/pendaftaran/admin/pindah-jalur/${v.pendaftarId}`, {
        method: "POST",
        body: JSON.stringify({ jalur_id: v.jalurId }),
      }),
    onSuccess: () => {
      toast({ title: "Calon dipindahkan", variant: "success" });
      segarkan();
    },
    onError: (e) =>
      toast({
        title: "Gagal memindahkan",
        description: pesanError(e),
        variant: "error",
      }),
  });

  const baca = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/pendaftaran/admin/notifikasi/${id}/baca`, {
        method: "POST",
      }),
    onSuccess: segarkan,
  });

  const daftarKuota = kuota.data ?? [];
  const daftarMenunggu = menunggu.data ?? [];
  const daftarNotif = (notifikasi.data ?? []).filter((n) => !n.sudah_dibaca);

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-3">
        <h2 className="font-serif text-lg font-bold text-biru-950">
          Kuota daftar ulang per jalur
        </h2>
        <p className="text-xs text-biru-700">
          Kuota dihitung dari calon yang sudah daftar ulang. Calon lulus yang
          daftar ulang setelah kuota penuh ditahan dan menunggu dipindahkan.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {daftarKuota.map((k) => (
            <div
              key={k.jalur_id}
              className="rounded-xl border border-biru-200 p-3 text-xs space-y-1"
            >
              <p className="font-bold text-biru-950 text-sm">{k.nama_jalur}</p>
              <p className="text-biru-700">{teksKuota(k)}</p>
              {kuotaPenuh(k) && (
                <p className="font-semibold text-biru-900">Kuota penuh</p>
              )}
              {k.menunggu_pindah > 0 && (
                <p className="text-biru-900">
                  {k.menunggu_pindah} calon menunggu dipindahkan
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-serif text-lg font-bold text-biru-950 flex items-center gap-2">
          <Bell className="w-4 h-4" /> Notifikasi belum dibaca
        </h2>
        {daftarNotif.length === 0 ? (
          <p className="text-xs text-biru-700">Tidak ada notifikasi baru.</p>
        ) : (
          <ul className="space-y-2">
            {daftarNotif.map((n) => (
              <li
                key={n.id}
                className="rounded-xl border border-biru-200 p-3 text-xs flex items-start justify-between gap-3"
              >
                <div>
                  <p className="font-bold text-biru-950">{n.judul}</p>
                  <p className="text-biru-700 mt-0.5">{n.pesan}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => baca.mutate(n.id)}
                >
                  Tandai dibaca
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-serif text-lg font-bold text-biru-950 flex items-center gap-2">
          <Repeat className="w-4 h-4" /> Calon menunggu dipindahkan
        </h2>
        {daftarMenunggu.length === 0 ? (
          <EmptyState
            title="Tidak ada calon yang perlu dipindahkan"
            description="Calon yang tertolak karena kuota jalur penuh akan muncul di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-biru-600 border-b border-biru-100">
                  <th className="py-2 pr-3">Calon</th>
                  <th className="py-2 pr-3">Jalur semula</th>
                  <th className="py-2 pr-3">Pindahkan ke</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {daftarMenunggu.map((m) => {
                  const pilihan = tujuan[m.pendaftar_id] ?? "";
                  return (
                    <tr
                      key={m.pendaftar_id}
                      className="border-b border-biru-50"
                    >
                      <td className="py-2 pr-3">
                        <p className="font-semibold text-biru-950">
                          {m.nama_lengkap}
                        </p>
                        <p className="text-biru-600">{m.nomor_pendaftaran}</p>
                      </td>
                      <td className="py-2 pr-3">{m.nama_jalur}</td>
                      <td className="py-2 pr-3">
                        <select
                          aria-label={`Jalur tujuan ${m.nama_lengkap}`}
                          value={pilihan}
                          onChange={(e) =>
                            setTujuan((t) => ({
                              ...t,
                              [m.pendaftar_id]: e.target.value,
                            }))
                          }
                          className="rounded-lg border border-biru-200 px-2 py-1.5 text-xs"
                        >
                          <option value="">Pilih jalur…</option>
                          {daftarKuota
                            .filter(
                              (k) =>
                                k.jalur_id !== m.jalur_id && !kuotaPenuh(k),
                            )
                            .map((k) => (
                              <option key={k.jalur_id} value={k.jalur_id}>
                                {k.nama_jalur}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          disabled={!pilihan || pindah.isPending}
                          onClick={() =>
                            pindah.mutate({
                              pendaftarId: m.pendaftar_id,
                              jalurId: pilihan,
                            })
                          }
                        >
                          Pindahkan
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

const TAB_VALID: Tab[] = ["RAPOR", "INTERVIEW", "PINDAH"];

export const SeleksiTahapPage: React.FC = () => {
  const [params] = useSearchParams();
  const tabAwal = params.get("tab");
  const [tab, setTab] = useState<Tab>(
    TAB_VALID.includes(tabAwal as Tab) ? (tabAwal as Tab) : "RAPOR",
  );
  const { data: antrean } = useAntreanVerifikasi();
  const menunggu = {
    RAPOR: antrean?.seleksi_rapor.menunggu ?? 0,
    INTERVIEW: antrean?.seleksi_interview.menunggu ?? 0,
    PINDAH: 0,
  } satisfies Record<Tab, number>;
  const perluTindakan = menunggu.RAPOR + menunggu.INTERVIEW;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-biru-950">
          Seleksi & Kuota Jalur
        </h1>
        <p className="text-sm text-biru-700 mt-1">
          Urutan seleksi: <strong>1. Rapor</strong> →{" "}
          <strong>2. CBT online</strong> (otomatis di portal calon) →{" "}
          <strong>3. Interview</strong>. Kuota jalur dihitung dari calon yang
          sudah daftar ulang.
        </p>
      </div>
      {perluTindakan > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-biru-300 bg-biru-50 px-4 py-3 text-sm text-biru-950"
        >
          <strong>Perlu diselesaikan:</strong>{" "}
          {[
            menunggu.RAPOR > 0 &&
              `${menunggu.RAPOR} calon menunggu seleksi rapor`,
            menunggu.INTERVIEW > 0 &&
              `${menunggu.INTERVIEW} calon menunggu seleksi interview`,
          ]
            .filter(Boolean)
            .join(" dan ")}
          .
        </div>
      )}
      <div
        role="tablist"
        className="flex gap-2 border-b border-biru-200 overflow-x-auto"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 cursor-pointer ${
              tab === t.id
                ? "border-biru-800 text-biru-950"
                : "border-transparent text-biru-600 hover:text-biru-900"
            }`}
          >
            {t.label}
            {menunggu[t.id] > 0 && (
              <span className="ml-2 inline-block min-w-5 rounded-full bg-biru-800 px-1.5 text-center text-[11px] font-bold text-putih">
                {menunggu[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>
      {tab === "PINDAH" ? (
        <PanelPindahJalur />
      ) : tab === "RAPOR" ? (
        <PanelSeleksiAwal />
      ) : (
        <PanelInterview />
      )}
    </div>
  );
};
