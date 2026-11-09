import React, { useEffect, useId, useRef, useState } from "react";
import {
  cariSekolah,
  type PreferensiWilayah,
  type SaranSekolah,
} from "../../lib/sekolah";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Domisili calon: sekolah di kabupaten/provinsi yang sama ditampilkan lebih dulu */
  preferensi?: PreferensiWilayah;
}

/**
 * Isian nama sekolah dengan saran: ketik beberapa huruf, daftar sekolah yang cocok muncul.
 * Pilih salah satu saran, atau tetap ketik sendiri bila sekolah tidak ada di daftar.
 */
export const AutocompleteSekolah: React.FC<Props> = ({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  invalid,
  preferensi,
}) => {
  const listId = useId();
  const [saran, setSaran] = useState<SaranSekolah[]>([]);
  const [terbuka, setTerbuka] = useState(false);
  const [aktif, setAktif] = useState(-1);
  const [memuat, setMemuat] = useState(false);
  const sedangMengetik = useRef(false);
  const provinsi = preferensi?.provinsi;
  const kabupaten = preferensi?.kabupaten;

  useEffect(() => {
    if (!sedangMengetik.current) return; // hanya saat calon mengetik, bukan saat nilai awal dimuat
    if (value.trim().length < 2) {
      setSaran([]);
      return;
    }
    let batal = false;
    setMemuat(true);
    const t = setTimeout(() => {
      cariSekolah(value, { provinsi, kabupaten })
        .then((h) => {
          if (batal) return;
          setSaran(h);
          setAktif(-1);
        })
        .catch(() => !batal && setSaran([]))
        .finally(() => !batal && setMemuat(false));
    }, 150);
    return () => {
      batal = true;
      clearTimeout(t);
    };
  }, [value, provinsi, kabupaten]);

  const pilih = (s: SaranSekolah) => {
    sedangMengetik.current = false;
    onChange(s.nama);
    setTerbuka(false);
    setSaran([]);
  };

  const tampil = terbuka && saran.length > 0;

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={tampil}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={aktif >= 0 ? `${listId}-${aktif}` : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          sedangMengetik.current = true;
          onChange(e.target.value);
          setTerbuka(true);
        }}
        onFocus={() => setTerbuka(true)}
        onBlur={() => {
          setTimeout(() => setTerbuka(false), 120);
          onBlur?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setTerbuka(false);
          if (!tampil) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAktif((a) => (a + 1) % saran.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAktif((a) => (a <= 0 ? saran.length - 1 : a - 1));
          } else if (e.key === "Enter" && aktif >= 0) {
            e.preventDefault();
            pilih(saran[aktif]);
          }
        }}
        className={`w-full rounded-lg border bg-putih px-3 py-2.5 text-sm text-biru-950 focus:border-biru-600 focus:outline-none focus:ring-2 focus:ring-biru-600/20 disabled:bg-biru-50 ${
          invalid ? "border-biru-600 ring-1 ring-biru-600" : "border-biru-200"
        }`}
      />
      {tampil && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-biru-200 bg-putih shadow-soft-lg"
        >
          {saran.map((s, i) => (
            <li
              key={`${s.nama}-${s.kabupaten}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === aktif}
              // mousedown agar terpilih sebelum input kehilangan fokus
              onMouseDown={(e) => {
                e.preventDefault();
                pilih(s);
              }}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === aktif ? "bg-biru-100" : "hover:bg-biru-50"
              }`}
            >
              <span className="block font-medium text-biru-950">{s.nama}</span>
              <span className="block text-[11px] text-biru-700">
                {s.kabupaten}, {s.provinsi}
              </span>
            </li>
          ))}
        </ul>
      )}
      {memuat && terbuka && saran.length === 0 && (
        <p className="mt-1 text-[11px] text-biru-700">Mencari sekolah…</p>
      )}
    </div>
  );
};
