import React, { useEffect, useId, useState } from "react";
import { Input } from "../ui/Input";
import {
  muatProvinsi,
  muatSekolah,
  type ProvinsiSekolah,
} from "../../lib/sekolah";

export interface AsalSekolahValue {
  provinsi: string;
  kabupaten: string;
  sekolah: string;
}

interface Props {
  value: AsalSekolahValue;
  onChange: (v: AsalSekolahValue) => void;
  errors?: Partial<Record<keyof AsalSekolahValue, string>>;
}

const selectCls =
  "w-full rounded-lg border border-biru-200 bg-putih px-3 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none focus:ring-2 focus:ring-biru-600/20 disabled:bg-biru-50 disabled:text-biru-500";
const labelCls =
  "block text-xs font-bold uppercase tracking-wider text-biru-900 mb-1.5";

/**
 * Pilihan bertingkat: Provinsi -> Kabupaten/Kota -> Sekolah (SMA/SMK).
 * Nama sekolah bisa dicari dengan mengetik; bila sekolah tidak ada di daftar,
 * calon tetap bisa mengetik nama sekolahnya sendiri.
 */
export const PilihAsalSekolah: React.FC<Props> = ({
  value,
  onChange,
  errors,
}) => {
  const listId = useId();
  const [provinsiList, setProvinsiList] = useState<ProvinsiSekolah[]>([]);
  const [sekolahList, setSekolahList] = useState<string[]>([]);
  const [gagal, setGagal] = useState(false);
  const [memuat, setMemuat] = useState(false);

  useEffect(() => {
    muatProvinsi()
      .then(setProvinsiList)
      .catch(() => setGagal(true));
  }, []);

  const prov = provinsiList.find((p) => p.nama === value.provinsi);
  const kab = prov?.kabupaten.find((k) => k.nama === value.kabupaten);

  useEffect(() => {
    if (!prov || !kab) {
      setSekolahList([]);
      return;
    }
    let batal = false;
    setMemuat(true);
    muatSekolah(prov.kode, kab.kode)
      .then((l) => !batal && setSekolahList(l))
      .catch(() => !batal && setSekolahList([]))
      .finally(() => !batal && setMemuat(false));
    return () => {
      batal = true;
    };
  }, [prov, kab]);

  return (
    <div className="space-y-4">
      {gagal && (
        <p className="text-xs font-semibold text-biru-800">
          Daftar sekolah gagal dimuat. Muat ulang halaman ini.
        </p>
      )}
      <div>
        <label htmlFor={`${listId}-prov`} className={labelCls}>
          Provinsi Asal Sekolah
        </label>
        <select
          id={`${listId}-prov`}
          className={selectCls}
          value={value.provinsi}
          aria-invalid={!!errors?.provinsi}
          onChange={(e) =>
            onChange({ provinsi: e.target.value, kabupaten: "", sekolah: "" })
          }
        >
          <option value="">-- Pilih provinsi --</option>
          {provinsiList.map((p) => (
            <option key={p.kode} value={p.nama}>
              {p.nama}
            </option>
          ))}
        </select>
        {errors?.provinsi && (
          <p className="mt-1 text-xs font-semibold text-biru-800">
            {errors.provinsi}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${listId}-kab`} className={labelCls}>
          Kabupaten / Kota
        </label>
        <select
          id={`${listId}-kab`}
          className={selectCls}
          value={value.kabupaten}
          disabled={!prov}
          aria-invalid={!!errors?.kabupaten}
          onChange={(e) =>
            onChange({ ...value, kabupaten: e.target.value, sekolah: "" })
          }
        >
          <option value="">
            {prov ? "-- Pilih kabupaten / kota --" : "Pilih provinsi dahulu"}
          </option>
          {prov?.kabupaten.map((k) => (
            <option key={k.kode} value={k.nama}>
              {k.nama}
            </option>
          ))}
        </select>
        {errors?.kabupaten && (
          <p className="mt-1 text-xs font-semibold text-biru-800">
            {errors.kabupaten}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${listId}-sek`} className={labelCls}>
          Nama Sekolah (SMA / SMK)
        </label>
        <Input
          id={`${listId}-sek`}
          list={listId}
          value={value.sekolah}
          disabled={!kab}
          maxLength={255}
          autoComplete="off"
          placeholder={
            kab
              ? memuat
                ? "Memuat daftar sekolah..."
                : "Ketik untuk mencari sekolah"
              : "Pilih kabupaten / kota dahulu"
          }
          aria-invalid={!!errors?.sekolah}
          onChange={(e) => onChange({ ...value, sekolah: e.target.value })}
        />
        <datalist id={listId}>
          {sekolahList.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {kab && !memuat && (
          <p className="mt-1 text-[11px] text-biru-700">
            {sekolahList.length > 0
              ? `${sekolahList.length} sekolah di ${kab.nama}. Sekolah tidak ada di daftar? Ketik nama sekolah Anda.`
              : "Belum ada data sekolah untuk wilayah ini. Ketik nama sekolah Anda."}
          </p>
        )}
        {errors?.sekolah && (
          <p className="mt-1 text-xs font-semibold text-biru-800">
            {errors.sekolah}
          </p>
        )}
      </div>
    </div>
  );
};
