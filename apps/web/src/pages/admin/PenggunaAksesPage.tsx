import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Users, Search, ScanLine } from "lucide-react";
import {
  Button,
  Checkbox,
  ErrorState,
  Input,
  Select,
  Skeleton,
  Switch,
} from "@/components/ui";
import { useDialog } from "@/components/ui/useDialog";
import { useToast } from "@/components/ui/useToast";
import { useAuth } from "@/context";
import { KUNCI_FITUR, useAturPengawasCbt, useFitur } from "@/hooks/useFitur";
import {
  aturPeranMassal,
  getDaftarPengguna,
  type Pengguna,
} from "@/services/pengguna";

export const NAMA_PERAN: Record<string, string> = {
  super_admin: "Super Admin",
  admin_pmb: "Admin PMB",
  keuangan: "Keuangan",
  pengawas_ujian: "Pengawas Ujian",
  asesor_rpl: "Asesor RPL",
  calon_mahasiswa: "Mahasiswa",
};

/** Peran yang dapat dibagikan Super Admin (urutan = urutan tombol). */
const PERAN_BISA_DIBAGI = [
  "admin_pmb",
  "keuangan",
  "calon_mahasiswa",
  "pengawas_ujian",
  "asesor_rpl",
] as const;

const pesanError = (e: unknown) =>
  e instanceof Error ? e.message : "Terjadi kesalahan. Silakan coba lagi.";

export const PenggunaAksesPage: React.FC = () => {
  const { user: saya } = useAuth();
  const dialog = useDialog();
  const { toast } = useToast();
  const qc = useQueryClient();

  const fitur = useFitur();
  const aturPengawas = useAturPengawasCbt();

  const [cari, setCari] = useState("");
  const [cariTerpakai, setCariTerpakai] = useState("");
  const [filterPeran, setFilterPeran] = useState("");
  const [pengguna, setPengguna] = useState<Pengguna[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dipilih, setDipilih] = useState<Set<string>>(new Set());
  const [menyimpan, setMenyimpan] = useState(false);

  // Tunda pencarian agar tidak memanggil API di tiap ketukan
  useEffect(() => {
    const t = setTimeout(() => setCariTerpakai(cari), 300);
    return () => clearTimeout(t);
  }, [cari]);

  const muat = useCallback(async () => {
    try {
      setMemuat(true);
      setError(null);
      setPengguna(await getDaftarPengguna(cariTerpakai, filterPeran));
    } catch (e) {
      setError(pesanError(e));
    } finally {
      setMemuat(false);
    }
  }, [cariTerpakai, filterPeran]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const bisaDipilih = useCallback(
    (u: Pengguna) => u.role !== "super_admin" && u.id !== saya?.user_id,
    [saya?.user_id],
  );
  const kandidat = useMemo(
    () => pengguna.filter(bisaDipilih),
    [pengguna, bisaDipilih],
  );
  const semuaTercentang =
    kandidat.length > 0 && kandidat.every((u) => dipilih.has(u.id));

  const toggle = (id: string) =>
    setDipilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSemua = () =>
    setDipilih(
      semuaTercentang ? new Set() : new Set(kandidat.map((u) => u.id)),
    );

  const ubahPengawas = async (aktif: boolean) => {
    const lanjut = await dialog.konfirmasi({
      judul: aktif
        ? "Aktifkan fitur pengawas CBT?"
        : "Matikan fitur pengawas CBT?",
      deskripsi: aktif
        ? "Akun berperan Pengawas Ujian akan dapat memakai meja presensi dan monitor ujian."
        : "Akun berperan Pengawas Ujian tidak akan bisa memakai meja presensi dan monitor ujian. Admin PMB dan Super Admin tidak terpengaruh.",
      nada: aktif ? "sukses" : "bahaya",
      labelYa: aktif ? "Aktifkan" : "Matikan",
    });
    if (!lanjut) return;
    try {
      await aturPengawas.mutateAsync(aktif);
      toast({
        variant: "berhasil",
        title: aktif
          ? "Fitur pengawas CBT diaktifkan"
          : "Fitur pengawas CBT dimatikan",
      });
    } catch (e) {
      void qc.invalidateQueries({ queryKey: KUNCI_FITUR });
      await dialog.hasil({
        nada: "gagal",
        judul: "Gagal mengubah fitur",
        deskripsi: pesanError(e),
      });
    }
  };

  const terapkanPeran = async (role: string) => {
    const ids = [...dipilih];
    if (ids.length === 0) return;
    const nama = NAMA_PERAN[role] ?? role;
    const lanjut = await dialog.konfirmasi({
      judul: `Jadikan ${ids.length} pengguna sebagai ${nama}?`,
      deskripsi:
        "Peran lama diganti dan pengguna terkait harus login ulang agar akses barunya berlaku.",
      nada: role === "calon_mahasiswa" ? "default" : "sukses",
      labelYa: `Jadikan ${nama}`,
    });
    if (!lanjut) return;
    try {
      setMenyimpan(true);
      const hasil = await aturPeranMassal(ids, role);
      const rincian = hasil.diubah
        .slice(0, 6)
        .map((u) => `${u.nama_lengkap} (${u.email})`);
      if (hasil.diubah.length > 6)
        rincian.push(`dan ${hasil.diubah.length - 6} pengguna lainnya`);
      await dialog.hasil({
        nada: hasil.dilewati.length ? "peringatan" : "sukses",
        judul: `${hasil.diubah.length} pengguna kini ${nama}`,
        deskripsi: hasil.dilewati.length
          ? `${hasil.dilewati.length} pengguna dilewati: ${hasil.dilewati[0].alasan.toLowerCase()}.`
          : undefined,
        rincian,
        autoTutupMs: hasil.dilewati.length ? undefined : 4000,
      });
      setDipilih(new Set());
      await muat();
    } catch (e) {
      await dialog.hasil({
        nada: "gagal",
        judul: "Gagal mengubah peran",
        deskripsi: pesanError(e),
      });
    } finally {
      setMenyimpan(false);
    }
  };

  const aktif = fitur.data?.pengawas_cbt_aktif ?? true;

  return (
    <div className="space-y-6">
      <div className="border-b border-biru-100 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-biru-700 uppercase tracking-wider mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Khusus Super Admin</span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
          Pengguna & Akses
        </h1>
        <p className="text-xs sm:text-sm text-biru-800 font-light mt-1">
          Atur fitur sistem dan bagikan akses dengan mencentang pengguna lalu
          memilih perannya.
        </p>
      </div>

      {/* Sakelar fitur pengawas CBT */}
      <section
        aria-labelledby="judul-fitur-pengawas"
        className="bg-putih border border-biru-200 rounded-2xl p-6 shadow-soft-sm"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-biru-50 text-biru-700 border border-biru-100">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="judul-fitur-pengawas"
                className="text-base font-bold text-biru-950"
              >
                Fitur Pengawas CBT
              </h2>
              <p className="text-xs text-biru-800 font-light">
                Meja presensi dan monitor ujian untuk akun Pengawas Ujian. Bila
                dimatikan, hanya Admin PMB dan Super Admin yang dapat
                memakainya.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {fitur.isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <>
                <Switch
                  id="sakelar-pengawas-cbt"
                  checked={aktif}
                  disabled={aturPengawas.isPending || fitur.isError}
                  onChange={(v) => void ubahPengawas(v)}
                />
                <span className="text-xs font-bold text-biru-950 w-12">
                  {aktif ? "ON" : "OFF"}
                </span>
              </>
            )}
          </div>
        </div>
        {fitur.isError && (
          <p className="mt-3 text-xs text-biru-900">
            Status fitur tidak dapat dimuat. Muat ulang halaman.
          </p>
        )}
      </section>

      {/* Pembagian akses pengguna */}
      <section
        aria-labelledby="judul-akses"
        className="bg-putih border border-biru-200 rounded-2xl shadow-soft-sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-biru-50 text-biru-700 border border-biru-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="judul-akses"
                className="text-base font-bold text-biru-950"
              >
                Bagikan Akses Pengguna
              </h2>
              <p className="text-xs text-biru-800 font-light">
                Centang pengguna, lalu pilih peran barunya. Akun Super Admin dan
                akun Anda sendiri tidak dapat diubah.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <Input
              aria-label="Cari pengguna"
              placeholder="Cari nama atau email..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
            <Select
              aria-label="Saring berdasarkan peran"
              value={filterPeran}
              onChange={(e) => {
                setFilterPeran(e.target.value);
                setDipilih(new Set());
              }}
            >
              <option value="">Semua peran</option>
              {Object.entries(NAMA_PERAN).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>

          {dipilih.size > 0 && (
            <div
              role="region"
              aria-label="Aksi untuk pengguna terpilih"
              className="rounded-xl border border-biru-300 bg-biru-50 p-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"
            >
              <span className="text-sm font-semibold text-biru-950">
                {dipilih.size} pengguna dipilih
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-biru-800">Jadikan:</span>
                {PERAN_BISA_DIBAGI.map((r) => (
                  <Button
                    key={r}
                    size="sm"
                    variant={r === "calon_mahasiswa" ? "outline" : "primary"}
                    disabled={menyimpan}
                    onClick={() => void terapkanPeran(r)}
                  >
                    {NAMA_PERAN[r]}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={menyimpan}
                  onClick={() => setDipilih(new Set())}
                >
                  Batal pilih
                </Button>
              </div>
            </div>
          )}
        </div>

        {error ? (
          <div className="px-6 pb-6">
            <ErrorState message={error} onRetry={() => void muat()} />
          </div>
        ) : memuat ? (
          <div className="px-6 pb-6 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-biru-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-biru-700 bg-biru-50/60">
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      id="pilih-semua"
                      aria-label="Pilih semua pengguna"
                      checked={semuaTercentang}
                      disabled={kandidat.length === 0}
                      onChange={toggleSemua}
                    />
                  </th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Peran saat ini</th>
                </tr>
              </thead>
              <tbody>
                {pengguna.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-biru-800"
                    >
                      Tidak ada pengguna yang cocok.
                    </td>
                  </tr>
                )}
                {pengguna.map((u) => {
                  const boleh = bisaDipilih(u);
                  return (
                    <tr
                      key={u.id}
                      className="border-t border-biru-100 hover:bg-biru-50/40"
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          id={`pilih-${u.id}`}
                          aria-label={`Pilih ${u.nama_lengkap}`}
                          checked={dipilih.has(u.id)}
                          disabled={!boleh}
                          onChange={() => toggle(u.id)}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-biru-950">
                        {u.nama_lengkap}
                        {u.id === saya?.user_id && (
                          <span className="ml-2 text-xs font-normal text-biru-700">
                            (Anda)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-biru-800">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-biru-200 bg-biru-50 px-2.5 py-0.5 text-xs font-semibold text-biru-900">
                          {NAMA_PERAN[u.role] ?? u.role}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
