/**
 * Nomor pendaftaran sementara diawali "W" (mis. W270001-3132) dan berganti menjadi nomor
 * asli tanpa "W" (mis. 270031-3132) setelah biaya formulir dibayar.
 */
export const nomorSementara = (nomor?: string | null): boolean =>
  !!nomor && nomor.startsWith("W");

export const labelNomorPendaftaran = (nomor?: string | null): string =>
  nomorSementara(nomor) ? "Nomor Pendaftaran Sementara" : "Nomor Pendaftaran";

export const CATATAN_NOMOR_SEMENTARA =
  "Nomor asli terbit setelah biaya formulir dibayar.";
