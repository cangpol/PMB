import React from "react";
import { BuktiPembayaranAdminPanel } from "../../components/admin/BuktiPembayaranAdminPanel";

/** Antrean verifikasi bukti bayar formulir & daftar ulang (VA Mandiri / QRIS). */
export const VerifikasiPembayaranPage: React.FC = () => (
  <div className="space-y-6">
    <div>
      <span className="text-xs font-bold text-biru-800 uppercase tracking-wider">
        Keuangan & Tagihan
      </span>
      <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950 mt-1">
        Verifikasi Bukti Pembayaran
      </h1>
      <p className="text-xs sm:text-sm text-biru-800/80 mt-1">
        Bukti transfer VA Mandiri / QRIS dari calon. Bukti formulir yang
        disetujui membuka tahap unggah berkas; bukti daftar ulang yang disetujui
        membuka tahap registrasi ulang.
      </p>
    </div>
    <BuktiPembayaranAdminPanel />
  </div>
);

export default VerifikasiPembayaranPage;
