import React from "react";

interface Props {
  jumlah: number;
  /** Teks pembaca layar, mis. "berkas menunggu diperiksa". */
  keterangan: string;
  className?: string;
}

/** Lencana angka merah: ada pekerjaan yang menunggu pemeriksaan admin. */
export const LencanaAntrean: React.FC<Props> = ({
  jumlah,
  keterangan,
  className = "",
}) => {
  if (jumlah <= 0) return null;
  return (
    <span
      className={`inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold leading-none text-putih shadow-xs ${className}`}
      title={`${jumlah} ${keterangan}`}
      aria-label={`${jumlah} ${keterangan}`}
    >
      {jumlah > 99 ? "99+" : jumlah}
    </span>
  );
};
