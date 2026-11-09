import React, { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import {
  DAFTAR_NEGARA,
  NEGARA_INDONESIA,
  WILAYAH_KOSONG,
  muatKabupatenDomisili,
  muatProvinsiDomisili,
  type KabupatenWilayah,
  type ProvinsiWilayah,
  type WilayahDomisili,
} from "../../lib/wilayah";

interface Props {
  value?: Partial<WilayahDomisili> | null;
  onChange: (v: WilayahDomisili) => void;
  disabled?: boolean;
}

const LAINNYA = "__lainnya__";
const selectCls =
  "w-full px-3 py-2 bg-putih border border-biru-200 rounded-lg text-xs text-biru-950 focus:ring-2 focus:ring-biru-800 disabled:bg-biru-100/30";
const labelCls = "block text-xs text-biru-800 mb-1";

/**
 * Wilayah domisili saat ini: Negara -> Provinsi -> Kabupaten/Kota -> Kecamatan.
 * Untuk Indonesia semuanya berupa pilihan bertingkat; untuk negara lain, isian bebas.
 */
export const PilihWilayahDomisili: React.FC<Props> = ({
  value,
  onChange,
  disabled,
}) => {
  const v: WilayahDomisili = { ...WILAYAH_KOSONG, ...value };
  const negaraDikenal = (DAFTAR_NEGARA as readonly string[]).includes(v.negara);
  const [negaraLain, setNegaraLain] = useState(!negaraDikenal);
  const indonesia = v.negara === NEGARA_INDONESIA;

  const [provinsiList, setProvinsiList] = useState<ProvinsiWilayah[]>([]);
  const [kabupatenList, setKabupatenList] = useState<KabupatenWilayah[]>([]);
  const [gagal, setGagal] = useState(false);

  useEffect(() => {
    if (!indonesia) return;
    muatProvinsiDomisili()
      .then(setProvinsiList)
      .catch(() => setGagal(true));
  }, [indonesia]);

  const prov = provinsiList.find((p) => p.nama === v.provinsi);
  useEffect(() => {
    if (!indonesia || !prov) {
      setKabupatenList([]);
      return;
    }
    let batal = false;
    muatKabupatenDomisili(prov.kode)
      .then((l) => !batal && setKabupatenList(l))
      .catch(() => !batal && setKabupatenList([]));
    return () => {
      batal = true;
    };
  }, [indonesia, prov]);

  const kab = kabupatenList.find((k) => k.nama === v.kabupaten);
  const ubah = (bagian: Partial<WilayahDomisili>) =>
    onChange({ ...v, ...bagian });

  const pilihNegara = (nilai: string) => {
    if (nilai === LAINNYA) {
      setNegaraLain(true);
      onChange({ ...WILAYAH_KOSONG, negara: "" });
      return;
    }
    setNegaraLain(false);
    onChange({ ...WILAYAH_KOSONG, negara: nilai });
  };

  return (
    <div className="p-4 bg-biru-50/40 rounded-xl border border-biru-100 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-biru-900">
        <MapPin className="w-4 h-4 text-biru-800" />
        <span>Negara, Provinsi, Kabupaten/Kota, dan Kecamatan</span>
      </div>
      {gagal && (
        <p role="alert" className="text-xs text-biru-900">
          Daftar wilayah belum dapat dimuat. Muat ulang halaman ini.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="dom-negara" className={labelCls}>
            Negara
          </label>
          <select
            id="dom-negara"
            disabled={disabled}
            value={negaraLain ? LAINNYA : v.negara}
            onChange={(e) => pilihNegara(e.target.value)}
            className={selectCls}
          >
            {DAFTAR_NEGARA.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value={LAINNYA}>Negara lain…</option>
          </select>
          {negaraLain && (
            <input
              aria-label="Nama negara"
              disabled={disabled}
              value={v.negara}
              placeholder="Ketik nama negara"
              onChange={(e) => ubah({ negara: e.target.value })}
              className={`${selectCls} mt-2`}
            />
          )}
        </div>

        {indonesia ? (
          <>
            <div>
              <label htmlFor="dom-provinsi" className={labelCls}>
                Provinsi
              </label>
              <select
                id="dom-provinsi"
                disabled={disabled}
                value={v.provinsi}
                onChange={(e) =>
                  ubah({
                    provinsi: e.target.value,
                    kabupaten: "",
                    kecamatan: "",
                  })
                }
                className={selectCls}
              >
                <option value="">-- Pilih Provinsi --</option>
                {provinsiList.map((p) => (
                  <option key={p.kode} value={p.nama}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dom-kabupaten" className={labelCls}>
                Kabupaten / Kota
              </label>
              <select
                id="dom-kabupaten"
                disabled={disabled || !v.provinsi}
                value={v.kabupaten}
                onChange={(e) =>
                  ubah({ kabupaten: e.target.value, kecamatan: "" })
                }
                className={selectCls}
              >
                <option value="">
                  {v.provinsi
                    ? "-- Pilih Kabupaten/Kota --"
                    : "Pilih provinsi terlebih dahulu"}
                </option>
                {kabupatenList.map((k) => (
                  <option key={k.nama} value={k.nama}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dom-kecamatan" className={labelCls}>
                Kecamatan
              </label>
              <select
                id="dom-kecamatan"
                disabled={disabled || !v.kabupaten}
                value={v.kecamatan}
                onChange={(e) => ubah({ kecamatan: e.target.value })}
                className={selectCls}
              >
                <option value="">
                  {v.kabupaten
                    ? "-- Pilih Kecamatan --"
                    : "Pilih kabupaten/kota terlebih dahulu"}
                </option>
                {(kab?.kecamatan ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            {(
              [
                ["provinsi", "Provinsi / Negara Bagian"],
                ["kabupaten", "Kota / Kabupaten"],
                ["kecamatan", "Kecamatan / Distrik"],
              ] as const
            ).map(([k, label]) => (
              <div key={k}>
                <label htmlFor={`dom-${k}`} className={labelCls}>
                  {label}
                </label>
                <input
                  id={`dom-${k}`}
                  disabled={disabled}
                  value={v[k]}
                  onChange={(e) => ubah({ [k]: e.target.value })}
                  className={selectCls}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
