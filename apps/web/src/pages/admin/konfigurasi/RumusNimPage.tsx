import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, RotateCcw, Save, Info } from "lucide-react";
import { Button, ErrorState, Input, Select, Skeleton } from "@/components/ui";
import { useDialog } from "@/components/ui/useDialog";
import { fetchApi } from "@/services/api";
import type { components } from "@/types/api";

type Rumus = components["schemas"]["RumusNimResponse"];
type Pratinjau = components["schemas"]["PratinjauRumusNimResponse"];

const KUNCI = ["rumus-nim"] as const;

const pesanError = (e: unknown) =>
  (e as { pesan?: string })?.pesan ??
  (e instanceof Error ? e.message : "Terjadi kesalahan. Silakan coba lagi.");

const fmtWaktu = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export const RumusNimPage: React.FC = () => {
  const dialog = useDialog();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: KUNCI,
    queryFn: () => fetchApi<Rumus>("/api/kelulusan/admin/rumus-nim"),
  });

  const [template, setTemplate] = useState("");
  const [lingkup, setLingkup] = useState("PER_PRODI_TAHUN");
  const [pratinjau, setPratinjau] = useState<Pratinjau | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  // Isi form dari rumus yang berlaku saat data pertama kali tiba / setelah disimpan
  useEffect(() => {
    if (data) {
      setTemplate(data.template);
      setLingkup(data.lingkup_urut);
    }
  }, [data]);

  // Pratinjau langsung (tertunda 350 ms) ke server: validasi + contoh NIM per prodi
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(async () => {
      try {
        setPratinjau(
          await fetchApi<Pratinjau>(
            "/api/kelulusan/admin/rumus-nim/pratinjau",
            {
              method: "POST",
              body: JSON.stringify({ template, lingkup_urut: lingkup }),
            },
          ),
        );
      } catch (e) {
        setPratinjau({ valid: false, pesan: pesanError(e), contoh: [] });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [template, lingkup, data]);

  const sisipkan = (token: string) => {
    const el = inputRef.current;
    const awal = el?.selectionStart ?? template.length;
    const akhir = el?.selectionEnd ?? template.length;
    const baru = template.slice(0, awal) + token + template.slice(akhir);
    setTemplate(baru);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = awal + token.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const berubah =
    !!data &&
    (template.trim() !== data.template || lingkup !== data.lingkup_urut);
  const bisaSimpan = berubah && pratinjau?.valid === true && !menyimpan;

  const simpan = async () => {
    const ya = await dialog.konfirmasi({
      judul: "Simpan rumus NIM baru?",
      deskripsi:
        "Rumus baru hanya berlaku untuk NIM yang terbit setelah ini. NIM mahasiswa yang sudah terbit tidak berubah. Perubahan dicatat di audit log.",
      labelYa: "Simpan Rumus",
    });
    if (!ya) return;
    try {
      setMenyimpan(true);
      await fetchApi<Rumus>("/api/kelulusan/admin/rumus-nim", {
        method: "PUT",
        body: JSON.stringify({
          template: template.trim(),
          lingkup_urut: lingkup,
        }),
      });
      await qc.invalidateQueries({ queryKey: KUNCI });
      await dialog.hasil({
        nada: "sukses",
        judul: "Rumus NIM disimpan",
        deskripsi: "NIM berikutnya akan memakai rumus baru.",
        autoTutupMs: 3000,
      });
    } catch (e) {
      await dialog.hasil({
        nada: "gagal",
        judul: "Rumus NIM gagal disimpan",
        deskripsi: pesanError(e),
      });
    } finally {
      setMenyimpan(false);
    }
  };

  if (error)
    return (
      <ErrorState message={pesanError(error)} onRetry={() => void refetch()} />
    );

  return (
    <div className="space-y-6">
      <div className="border-b border-biru-100 pb-5">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-biru-700">
          <Hash className="h-4 w-4" />
          <span>Konfigurasi</span>
        </div>
        <h1 className="font-serif text-2xl font-bold text-biru-950 sm:text-3xl">
          Rumus Pembuatan NIM
        </h1>
        <p className="mt-1 text-xs font-light text-biru-800 sm:text-sm">
          Atur format Nomor Induk Mahasiswa sesuai prosedur kampus. Hanya Admin
          PMB dan Super Admin yang dapat mengubahnya.
        </p>
      </div>

      {isLoading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <section className="space-y-4 rounded-2xl border border-biru-200 bg-putih p-6 shadow-soft-sm">
            <div className="space-y-1">
              <label
                htmlFor="rumus-nim"
                className="text-xs font-bold text-biru-900"
              >
                Rumus NIM
              </label>
              <Input
                id="rumus-nim"
                ref={inputRef}
                value={template}
                maxLength={100}
                spellCheck={false}
                onChange={(e) => setTemplate(e.target.value)}
                className="font-mono"
                error={pratinjau?.valid === false}
              />
              <p
                role={pratinjau?.valid === false ? "alert" : undefined}
                className={`text-xs ${
                  pratinjau?.valid === false
                    ? "font-medium text-rose-700"
                    : "text-biru-700"
                }`}
              >
                {pratinjau?.valid === false
                  ? pratinjau.pesan
                  : `Maksimum ${data.panjang_maks} karakter. Wajib memuat tepat satu {URUT:N}.`}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-biru-900">
                Klik token untuk menyisipkan
              </p>
              <div className="flex flex-wrap gap-2">
                {data.token.map((t) => (
                  <button
                    key={t.token}
                    type="button"
                    onClick={() => sisipkan(t.token)}
                    title={`${t.keterangan} (contoh: ${t.contoh})`}
                    className="rounded-lg border border-biru-200 bg-biru-50 px-2.5 py-1 font-mono text-xs font-semibold text-biru-900 transition hover:border-biru-500 hover:bg-biru-100"
                  >
                    {t.token}
                  </button>
                ))}
              </div>
              <ul className="mt-3 grid gap-1 text-xs text-biru-800 sm:grid-cols-2">
                {data.token.map((t) => (
                  <li key={t.token}>
                    <span className="font-mono font-semibold">{t.token}</span> :{" "}
                    {t.keterangan}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="lingkup-nim"
                className="text-xs font-bold text-biru-900"
              >
                Cakupan nomor urut
              </label>
              <Select
                id="lingkup-nim"
                value={lingkup}
                onChange={(e) => setLingkup(e.target.value)}
              >
                {data.lingkup_pilihan.map((l) => (
                  <option key={l.kode} value={l.kode}>
                    {l.keterangan}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-biru-100 pt-4">
              <p className="flex items-center gap-1.5 text-xs text-biru-700">
                <Info className="h-3.5 w-3.5" />
                Terakhir diubah {fmtWaktu(data.diperbarui_pada)}
                {data.diperbarui_oleh ? ` oleh ${data.diperbarui_oleh}` : ""}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setTemplate(data.template_bawaan);
                    setLingkup("PER_PRODI_TAHUN");
                  }}
                >
                  Kembalikan ke bawaan
                </Button>
                <Button
                  size="sm"
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                  disabled={!bisaSimpan}
                  isLoading={menyimpan}
                  onClick={() => void simpan()}
                >
                  Simpan Rumus
                </Button>
              </div>
            </div>
          </section>

          <section
            aria-label="Pratinjau NIM"
            className="rounded-2xl border border-biru-200 bg-putih shadow-soft-sm"
          >
            <div className="border-b border-biru-100 px-6 py-4">
              <h2 className="text-base font-bold text-biru-950">
                Pratinjau NIM
              </h2>
              <p className="text-xs text-biru-800">
                NIM yang akan terbit berikutnya untuk tiap program studi dengan
                rumus di atas.
              </p>
            </div>
            {pratinjau?.valid ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-biru-50/60 text-left text-xs uppercase tracking-wide text-biru-700">
                    <th className="px-6 py-2.5">Program Studi</th>
                    <th className="px-6 py-2.5">Kode</th>
                    <th className="px-6 py-2.5 text-right">Contoh NIM</th>
                  </tr>
                </thead>
                <tbody>
                  {pratinjau.contoh.map((c) => (
                    <tr
                      key={c.kode_prodi + c.prodi}
                      className="border-t border-biru-100"
                    >
                      <td className="px-6 py-2.5 text-biru-950">{c.prodi}</td>
                      <td className="px-6 py-2.5 font-mono text-biru-800">
                        {c.kode_prodi}
                      </td>
                      <td className="px-6 py-2.5 text-right font-mono font-bold text-biru-950">
                        {c.nim}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-6 py-8 text-center text-sm text-biru-700">
                {pratinjau
                  ? "Perbaiki rumus untuk melihat pratinjau."
                  : "Memuat pratinjau..."}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
};
