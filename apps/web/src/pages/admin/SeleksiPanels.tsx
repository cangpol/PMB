import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button, Card, EmptyState } from "../../components/common";
import { fetchApi, type ApiError } from "@/services/api";
import { KUNCI_ANTREAN } from "@/hooks/useAntreanVerifikasi";
import { useToast } from "@/components/ui/useToast";
import {
  TINGKAT_PRESTASI,
  JALUR_ACHIEVEMENT,
  JALUR_CREATOR,
  hitungPotongan,
  memakaiRapor,
  potonganDitentukanAdmin,
} from "../../lib/beasiswa";

export interface BerkasRingkas {
  id: string;
  jenis_berkas: string;
  file_name: string;
}

export interface SeleksiItem {
  pendaftar_id: string;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  nama_jalur: string;
  status_pendaftaran: string;
  nilai_rapor_avg: number;
  status_seleksi_rapor: string;
  nilai_seleksi_rapor: number | null;
  skor_cbt: number | null;
  status_seleksi_interview: string;
  nilai_seleksi_interview: number | null;
  berkas: BerkasRingkas[];
  kode_jalur: string;
  alur_seleksi: string;
  rapor_minimal: number | null;
  potongan_tetap: number | null;
  potongan_maks: number | null;
  kriteria_seleksi: string | null;
  benefit_tambahan: string | null;
  potongan_persen: number;
  tingkat_prestasi: string | null;
  jumlah_follower: number | null;
  cbt_dilewati: boolean;
  prodi_pilihan_1_nama: string;
  prodi_pilihan_2_nama: string | null;
  pilihan_ke_diterima: number | null;
}

export const pesanError = (e: unknown) =>
  (e as ApiError).pesan ?? "Terjadi kesalahan.";

export const parseNilai = (t: string | undefined): number | null => {
  const v = (t ?? "").trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(v)) return null;
  const n = Number(v);
  return n >= 0 && n <= 100 ? n : null;
};

const parseAngka = (t: string | undefined): number | null => {
  const v = (t ?? "").replace(/[.\s]/g, "");
  return /^\d+$/.test(v) ? Number(v) : null;
};

export const BadgeHasil: React.FC<{ hasil: string }> = ({ hasil }) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
      hasil === "LULUS"
        ? "bg-biru-900 text-putih"
        : hasil === "TIDAK_LULUS"
          ? "bg-biru-100 text-biru-900 border border-biru-300"
          : "bg-biru-50 text-biru-700 border border-biru-200"
    }`}
  >
    {hasil === "LULUS"
      ? "Lulus"
      : hasil === "TIDAK_LULUS"
        ? "Tidak lulus"
        : "Menunggu"}
  </span>
);

const labelBerkas = (jenis: string) =>
  jenis
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

function useSimpanSeleksi(tahap: "RAPOR" | "INTERVIEW") {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (v: { id: string; body: Record<string, unknown> }) =>
      fetchApi(`/api/pendaftaran/admin/seleksi/${v.id}/${tahap}`, {
        method: "PUT",
        body: JSON.stringify(v.body),
      }),
    onSuccess: () => {
      toast({ title: "Hasil seleksi disimpan", variant: "success" });
      void qc.invalidateQueries({ queryKey: ["admin-seleksi", tahap] });
      void qc.invalidateQueries({ queryKey: KUNCI_ANTREAN });
    },
    onError: (e) =>
      toast({
        title: "Gagal menyimpan",
        description: pesanError(e),
        variant: "error",
      }),
  });
}

function useDaftarSeleksi(tahap: "RAPOR" | "INTERVIEW") {
  return useQuery<SeleksiItem[]>({
    queryKey: ["admin-seleksi", tahap],
    queryFn: () => fetchApi(`/api/pendaftaran/admin/seleksi?tahap=${tahap}`),
  });
}

function useLihatBerkas() {
  const { toast } = useToast();
  return async (id: string) => {
    try {
      const d = await fetchApi<{ download_url: string }>(
        `/api/pendaftaran/berkas/${id}/presign-download`,
      );
      window.open(d.download_url, "_blank", "noopener");
    } catch (e) {
      toast({
        title: "Berkas tidak dapat dibuka",
        description: pesanError(e),
        variant: "error",
      });
    }
  };
}

const inputCls = "rounded-lg border border-biru-200 px-2 py-1.5 text-xs";

/** Penempatan program studi (pilihan 1 atau 2). */
const PilihPenempatan: React.FC<{
  r: SeleksiItem;
  nilai: number;
  onChange: (n: number) => void;
}> = ({ r, nilai, onChange }) => (
  <select
    aria-label={`Penempatan ${r.nama_lengkap}`}
    value={nilai}
    onChange={(e) => onChange(Number(e.target.value))}
    className={inputCls}
  >
    <option value={0}>Pilih program…</option>
    <option value={1}>Pilihan 1: {r.prodi_pilihan_1_nama}</option>
    {r.prodi_pilihan_2_nama && (
      <option value={2}>Pilihan 2: {r.prodi_pilihan_2_nama}</option>
    )}
  </select>
);

// ---------------------------------------------------------------------------
// Seleksi tahap pertama: rapor / berkas, sesuai aturan jalur READY calon
// ---------------------------------------------------------------------------

const BarisSeleksiAwal: React.FC<{
  r: SeleksiItem;
  simpan: ReturnType<typeof useSimpanSeleksi>;
  lihatBerkas: (id: string) => void;
}> = ({ r, simpan, lihatBerkas }) => {
  const [rapor, setRapor] = useState(String(r.nilai_rapor_avg));
  const [tingkat, setTingkat] = useState(r.tingkat_prestasi ?? "");
  const [follower, setFollower] = useState(
    r.jumlah_follower != null ? String(r.jumlah_follower) : "",
  );
  const [potonganAdmin, setPotonganAdmin] = useState("");
  const [pilihan, setPilihan] = useState(0);

  const pakaiRapor = memakaiRapor(r);
  const langsung = r.alur_seleksi === "LANGSUNG_LULUS";
  const nilaiRapor = pakaiRapor ? parseNilai(rapor) : null;
  const nilaiFollower = parseAngka(follower);
  const nilaiPotonganAdmin =
    potonganAdmin.trim() === "" ? null : parseAngka(potonganAdmin);

  const hasil = hitungPotongan(r, {
    rataRapor: nilaiRapor,
    tingkatPrestasi: tingkat,
    follower: nilaiFollower,
    potonganAdmin: nilaiPotonganAdmin,
  });
  const valid =
    (!pakaiRapor || nilaiRapor !== null) &&
    !("galat" in hasil) &&
    (!langsung || pilihan > 0);

  const luluskan = () =>
    simpan.mutate({
      id: r.pendaftar_id,
      body: {
        hasil: "LULUS",
        nilai: nilaiRapor,
        ...(r.kode_jalur === JALUR_ACHIEVEMENT && tingkat
          ? { tingkat_prestasi: tingkat }
          : {}),
        ...(r.kode_jalur === JALUR_CREATOR
          ? { jumlah_follower: nilaiFollower }
          : {}),
        ...(nilaiPotonganAdmin !== null
          ? { potongan_persen: nilaiPotonganAdmin }
          : {}),
        ...(langsung ? { pilihan_ke: pilihan } : {}),
      },
    });

  return (
    <tr className="border-b border-biru-50 align-top">
      <td className="py-2 pr-3 min-w-44">
        <p className="font-semibold text-biru-950">{r.nama_lengkap}</p>
        <p className="text-biru-600">{r.nomor_pendaftaran}</p>
        <p className="mt-1 font-semibold text-biru-800">{r.nama_jalur}</p>
        {r.kriteria_seleksi && (
          <p className="mt-0.5 max-w-xs text-[11px] leading-snug text-biru-700">
            {r.kriteria_seleksi}
          </p>
        )}
      </td>
      <td className="py-2 pr-3">
        <div className="flex max-w-48 flex-col gap-1">
          {r.berkas.length === 0 && (
            <span className="text-biru-600">Belum ada berkas</span>
          )}
          {r.berkas.map((b) => (
            <Button
              key={b.id}
              size="sm"
              variant="outline"
              onClick={() => lihatBerkas(b.id)}
              title={b.file_name}
            >
              {labelBerkas(b.jenis_berkas)}
            </Button>
          ))}
        </div>
      </td>
      <td className="py-2 pr-3 space-y-2">
        {pakaiRapor && (
          <div>
            <label className="block text-[11px] text-biru-600">
              Rata-rata rapor
            </label>
            <input
              aria-label={`Rata-rata rapor ${r.nama_lengkap}`}
              inputMode="decimal"
              value={rapor}
              onChange={(e) => setRapor(e.target.value)}
              className={`${inputCls} w-24 ${nilaiRapor === null ? "border-red-400" : ""}`}
            />
            <p className="text-[11px] text-biru-600">
              Isian calon: {r.nilai_rapor_avg}
              {r.rapor_minimal !== null && ` · minimal ${r.rapor_minimal}`}
            </p>
          </div>
        )}
        {r.kode_jalur === JALUR_ACHIEVEMENT && (
          <div>
            <label className="block text-[11px] text-biru-600">
              Tingkat sertifikat prestasi
            </label>
            <select
              aria-label={`Tingkat prestasi ${r.nama_lengkap}`}
              value={tingkat}
              onChange={(e) => setTingkat(e.target.value)}
              className={inputCls}
            >
              <option value="">Tanpa sertifikat</option>
              {TINGKAT_PRESTASI.map((t) => (
                <option key={t.kode} value={t.kode}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {r.kode_jalur === JALUR_CREATOR && (
          <div>
            <label className="block text-[11px] text-biru-600">
              Jumlah follower
            </label>
            <input
              aria-label={`Jumlah follower ${r.nama_lengkap}`}
              inputMode="numeric"
              value={follower}
              onChange={(e) => setFollower(e.target.value)}
              className={`${inputCls} w-28`}
            />
          </div>
        )}
        {potonganDitentukanAdmin(r) && (
          <div>
            <label className="block text-[11px] text-biru-600">
              Potongan (maks. {r.potongan_maks ?? 100}%)
            </label>
            <input
              aria-label={`Potongan ${r.nama_lengkap}`}
              inputMode="numeric"
              value={potonganAdmin}
              placeholder={String(r.potongan_maks ?? 0)}
              onChange={(e) => setPotonganAdmin(e.target.value)}
              className={`${inputCls} w-20`}
            />
          </div>
        )}
        <p
          className={`text-[11px] font-semibold ${"galat" in hasil ? "text-red-700" : "text-biru-900"}`}
        >
          {"galat" in hasil
            ? hasil.galat
            : `Potongan DPP & SKS: ${hasil.persen}%`}
        </p>
      </td>
      <td className="py-2 pr-3 space-y-2">
        {langsung ? (
          <>
            <PilihPenempatan r={r} nilai={pilihan} onChange={setPilihan} />
            <p className="max-w-44 text-[11px] text-biru-700">
              CBT dan wawancara dinyatakan lulus saat disetujui.
            </p>
          </>
        ) : r.alur_seleksi === "TANPA_CBT" ? (
          <p className="max-w-44 text-[11px] text-biru-700">
            CBT dilewati (lulus). Lanjut ke seleksi wawancara.
          </p>
        ) : (
          <p className="max-w-44 text-[11px] text-biru-700">
            Lanjut ke ujian CBT online.
          </p>
        )}
        {r.benefit_tambahan && (
          <p className="max-w-44 text-[11px] text-biru-700">
            Benefit: {r.benefit_tambahan}
          </p>
        )}
      </td>
      <td className="py-2 pr-3">
        <BadgeHasil hasil={r.status_seleksi_rapor} />
      </td>
      <td className="py-2 text-right whitespace-nowrap space-x-2">
        <Button
          size="sm"
          disabled={simpan.isPending || !valid}
          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          onClick={luluskan}
        >
          Setujui, Lulus
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={simpan.isPending}
          leftIcon={<XCircle className="w-3.5 h-3.5" />}
          onClick={() =>
            simpan.mutate({
              id: r.pendaftar_id,
              body: { hasil: "TIDAK_LULUS", nilai: nilaiRapor },
            })
          }
        >
          Tidak lulus
        </Button>
      </td>
    </tr>
  );
};

export const PanelSeleksiAwal: React.FC = () => {
  const { data = [], isLoading } = useDaftarSeleksi("RAPOR");
  const simpan = useSimpanSeleksi("RAPOR");
  const lihatBerkas = useLihatBerkas();

  if (isLoading)
    return <p className="text-sm text-biru-700 py-6">Memuat daftar calon…</p>;
  if (data.length === 0)
    return (
      <EmptyState
        title="Belum ada calon untuk seleksi rapor & berkas"
        description="Calon muncul setelah seluruh berkasnya diverifikasi."
      />
    );

  return (
    <Card className="p-5 space-y-3 overflow-x-auto">
      <p className="text-xs text-biru-700">
        Periksa berkas calon sesuai ketentuan jalurnya. Jika sesuai, klik{" "}
        <strong>Setujui, Lulus</strong>. Bila rata-rata rapor tidak sesuai
        dengan berkas, perbaiki angkanya lebih dulu. Jalur READY Early, Partner
        Scholarship, Achievement, Legacy Scholarship, dan Future Leader melewati
        CBT dan wawancara (dinyatakan lulus); READY Creator hanya melewati CBT;
        READY Admission lanjut ke CBT.
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-biru-600 border-b border-biru-100">
            <th className="py-2 pr-3">Calon & jalur</th>
            <th className="py-2 pr-3">Berkas</th>
            <th className="py-2 pr-3">Penilaian</th>
            <th className="py-2 pr-3">Tahap berikutnya</th>
            <th className="py-2 pr-3">Hasil</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <BarisSeleksiAwal
              key={r.pendaftar_id}
              r={r}
              simpan={simpan}
              lihatBerkas={(id) => void lihatBerkas(id)}
            />
          ))}
        </tbody>
      </table>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Seleksi interview / wawancara
// ---------------------------------------------------------------------------

export const PanelInterview: React.FC = () => {
  const { data = [], isLoading } = useDaftarSeleksi("INTERVIEW");
  const simpan = useSimpanSeleksi("INTERVIEW");
  const [nilai, setNilai] = useState<Record<string, string>>({});
  const [pilihan, setPilihan] = useState<Record<string, number>>({});

  if (isLoading)
    return <p className="text-sm text-biru-700 py-6">Memuat daftar calon…</p>;
  if (data.length === 0)
    return (
      <EmptyState
        title="Belum ada calon untuk interview"
        description="Calon muncul setelah menyelesaikan CBT online (atau CBT-nya dilewati)."
      />
    );

  return (
    <Card className="p-5 space-y-3 overflow-x-auto">
      <p className="text-xs text-biru-700">
        Isi nilai interview, tentukan penempatan program studi (pilihan 1 atau
        2), lalu klik Lulus. Surat penerimaan terbit untuk program studi yang
        dipilih.
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-biru-600 border-b border-biru-100">
            <th className="py-2 pr-3">Calon</th>
            <th className="py-2 pr-3">Jalur</th>
            <th className="py-2 pr-3">Skor rapor</th>
            <th className="py-2 pr-3">Skor CBT</th>
            <th className="py-2 pr-3">Nilai interview (0-100)</th>
            <th className="py-2 pr-3">Penempatan program</th>
            <th className="py-2 pr-3">Hasil</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {data.map((r) => {
            const nilaiTeks =
              nilai[r.pendaftar_id] ??
              (r.nilai_seleksi_interview != null
                ? String(r.nilai_seleksi_interview)
                : "");
            const nilaiValid = parseNilai(nilaiTeks) !== null;
            const pil = pilihan[r.pendaftar_id] ?? r.pilihan_ke_diterima ?? 0;
            return (
              <tr
                key={r.pendaftar_id}
                className="border-b border-biru-50 align-top"
              >
                <td className="py-2 pr-3">
                  <p className="font-semibold text-biru-950">
                    {r.nama_lengkap}
                  </p>
                  <p className="text-biru-600">{r.nomor_pendaftaran}</p>
                </td>
                <td className="py-2 pr-3">{r.nama_jalur}</td>
                <td className="py-2 pr-3 tabular-nums">
                  {r.nilai_rapor_avg.toFixed(1)}
                </td>
                <td className="py-2 pr-3 tabular-nums">
                  {r.cbt_dilewati
                    ? "Dilewati (lulus)"
                    : (r.skor_cbt?.toFixed(1) ?? "-")}
                </td>
                <td className="py-2 pr-3">
                  <input
                    aria-label={`Nilai interview ${r.nama_lengkap}`}
                    inputMode="decimal"
                    value={nilaiTeks}
                    onChange={(e) =>
                      setNilai((n) => ({
                        ...n,
                        [r.pendaftar_id]: e.target.value,
                      }))
                    }
                    className={`${inputCls} w-24`}
                  />
                </td>
                <td className="py-2 pr-3">
                  <PilihPenempatan
                    r={r}
                    nilai={pil}
                    onChange={(n) =>
                      setPilihan((p) => ({ ...p, [r.pendaftar_id]: n }))
                    }
                  />
                </td>
                <td className="py-2 pr-3">
                  <BadgeHasil hasil={r.status_seleksi_interview} />
                </td>
                <td className="py-2 text-right whitespace-nowrap space-x-2">
                  <Button
                    size="sm"
                    disabled={simpan.isPending || !nilaiValid || pil === 0}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() =>
                      simpan.mutate({
                        id: r.pendaftar_id,
                        body: {
                          hasil: "LULUS",
                          nilai: parseNilai(nilaiTeks),
                          pilihan_ke: pil,
                        },
                      })
                    }
                  >
                    Lulus
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={simpan.isPending}
                    leftIcon={<XCircle className="w-3.5 h-3.5" />}
                    onClick={() =>
                      simpan.mutate({
                        id: r.pendaftar_id,
                        body: {
                          hasil: "TIDAK_LULUS",
                          nilai: parseNilai(nilaiTeks),
                        },
                      })
                    }
                  >
                    Tidak lulus
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};
