import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import { Button } from "../common";
import type { Pengguna } from "@/services/pengguna";

export interface IsianPengguna {
  email: string;
  nama_lengkap: string;
  no_hp: string;
  role: string;
  password: string;
}

interface Props {
  /** null = tambah baru; berisi pengguna = ubah data */
  pengguna: Pengguna | null;
  peranTersedia: { kode: string; nama: string }[];
  menyimpan: boolean;
  galat?: string | null;
  onSimpan: (v: IsianPengguna) => void;
  onClose: () => void;
}

const kelas = "mt-1 w-full rounded-lg border border-biru-200 px-2.5 py-2";

/** Dialog tambah pengguna baru atau ubah nama, email, dan nomor HP. */
export const PenggunaFormDialog: React.FC<Props> = ({
  pengguna,
  peranTersedia,
  menyimpan,
  galat,
  onSimpan,
  onClose,
}) => {
  const ubah = pengguna !== null;
  const [v, setV] = useState<IsianPengguna>({
    email: pengguna?.email ?? "",
    nama_lengkap: pengguna?.nama_lengkap ?? "",
    no_hp: pengguna?.no_hp ?? "",
    role: pengguna?.role ?? peranTersedia[0]?.kode ?? "admin_pmb",
    password: "",
  });
  const set = (k: keyof IsianPengguna, val: string) =>
    setV((p) => ({ ...p, [k]: val }));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim());
  const valid =
    emailOk &&
    v.nama_lengkap.trim().length >= 3 &&
    v.no_hp.trim().length >= 10 &&
    v.no_hp.trim().length <= 20 &&
    (ubah || v.password === "" || v.password.length >= 8);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {ubah ? "Ubah data pengguna" : "Tambah pengguna"}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-3 text-xs">
          <label className="block">
            <span className="font-semibold text-biru-900">Nama lengkap</span>
            <input
              aria-label="Nama lengkap"
              className={kelas}
              value={v.nama_lengkap}
              onChange={(e) => set("nama_lengkap", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="font-semibold text-biru-900">Email</span>
            <input
              aria-label="Email"
              type="email"
              className={kelas}
              value={v.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="font-semibold text-biru-900">Nomor HP</span>
            <input
              aria-label="Nomor HP"
              inputMode="tel"
              className={kelas}
              value={v.no_hp}
              onChange={(e) => set("no_hp", e.target.value)}
            />
          </label>
          {!ubah && (
            <>
              <label className="block">
                <span className="font-semibold text-biru-900">Peran</span>
                <select
                  aria-label="Peran"
                  className={kelas}
                  value={v.role}
                  onChange={(e) => set("role", e.target.value)}
                >
                  {peranTersedia.map((p) => (
                    <option key={p.kode} value={p.kode}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-semibold text-biru-900">
                  Password (opsional)
                </span>
                <input
                  aria-label="Password"
                  type="text"
                  autoComplete="off"
                  className={kelas}
                  value={v.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Kosongkan agar dibuatkan password sementara"
                />
                {v.password !== "" && v.password.length < 8 && (
                  <span className="text-[11px] text-red-700">
                    Password minimal 8 karakter.
                  </span>
                )}
              </label>
            </>
          )}
          {galat && (
            <p role="alert" className="text-xs text-red-700">
              {galat}
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            size="sm"
            disabled={!valid || menyimpan}
            onClick={() => onSimpan(v)}
          >
            {menyimpan ? "Menyimpan…" : ubah ? "Simpan" : "Tambah"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
