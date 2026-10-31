import React, { useState } from "react";
import {
  BookOpen,
  Compass,
  Calendar,
  Ticket,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";

type ActiveTab = "prodi" | "jalur" | "gelombang" | "voucher";

interface ProdiItem {
  id: string;
  kode: string;
  nama: string;
  jenjang: string;
  fakultas: string;
  kuota: number;
  passing_score: number;
  ukt: number;
  is_active: boolean;
}

interface JalurItem {
  id: string;
  kode: string;
  nama: string;
  biaya: number;
  deskripsi: string;
  is_active: boolean;
}

interface GelombangItem {
  id: string;
  nama: string;
  tgl_mulai: string;
  tgl_selesai: string;
  kuota: number;
  is_active: boolean;
}

interface VoucherItem {
  id: string;
  kode: string;
  diskon_persen: number;
  diskon_nominal: number;
  kuota: number;
  terpakai: number;
  is_active: boolean;
}

const INITIAL_PRODI: ProdiItem[] = [
  {
    id: "1",
    kode: "SI-01",
    nama: "Sistem Informasi",
    jenjang: "S1",
    fakultas: "Fakultas Sains & Teknologi",
    kuota: 80,
    passing_score: 70,
    ukt: 6500000,
    is_active: true,
  },
  {
    id: "2",
    kode: "IF-02",
    nama: "Informatika",
    jenjang: "S1",
    fakultas: "Fakultas Sains & Teknologi",
    kuota: 100,
    passing_score: 75,
    ukt: 7000000,
    is_active: true,
  },
  {
    id: "3",
    kode: "AKT-01",
    nama: "Akuntansi Bisnis",
    jenjang: "S1",
    fakultas: "Fakultas Ekonomi & Bisnis",
    kuota: 60,
    passing_score: 75,
    ukt: 6000000,
    is_active: true,
  },
  {
    id: "4",
    kode: "MNJ-01",
    nama: "Manajemen Pemasaran",
    jenjang: "D3",
    fakultas: "Fakultas Ekonomi & Bisnis",
    kuota: 50,
    passing_score: 65,
    ukt: 5000000,
    is_active: true,
  },
];

const INITIAL_JALUR: JalurItem[] = [
  {
    id: "1",
    kode: "JALUR-RAPOR",
    nama: "Jalur Reguler Prestasi (RAPOR)",
    biaya: 250000,
    deskripsi: "Seleksi berkas nilai rapor semester 1-5 tanpa tes tertulis",
    is_active: true,
  },
  {
    id: "2",
    kode: "JALUR-CBT",
    nama: "Jalur Mandiri Tes CBT Online",
    biaya: 250000,
    deskripsi: "Ujian Computer-Based Testing potensi akademik & bahasa Inggris",
    is_active: true,
  },
  {
    id: "3",
    kode: "JALUR-BEASISWA",
    nama: "Jalur Beasiswa Triputra Peduli",
    biaya: 0,
    deskripsi: "Program beasiswa penuh biaya kuliah dari Yayasan Triputra",
    is_active: true,
  },
  {
    id: "4",
    kode: "JALUR-MITRA",
    nama: "Jalur Kemitraan Sekolah Rekanan",
    biaya: 150000,
    deskripsi:
      "Khusus bagi alumni sekolah mitra kerjasama Universitas Pignatelli Triputra",
    is_active: true,
  },
];

const INITIAL_GELOMBANG: GelombangItem[] = [
  {
    id: "1",
    nama: "Gelombang I (Early Bird)",
    tgl_mulai: "01 Nov 2026",
    tgl_selesai: "31 Des 2026",
    kuota: 150,
    is_active: true,
  },
  {
    id: "2",
    nama: "Gelombang II (Reguler)",
    tgl_mulai: "01 Jan 2027",
    tgl_selesai: "31 Mar 2027",
    kuota: 200,
    is_active: false,
  },
  {
    id: "3",
    nama: "Gelombang III (Terakhir)",
    tgl_mulai: "01 Apr 2027",
    tgl_selesai: "30 Jun 2027",
    kuota: 100,
    is_active: false,
  },
];

const INITIAL_VOUCHER: VoucherItem[] = [
  {
    id: "1",
    kode: "PIGNATELLI2026",
    diskon_persen: 50,
    diskon_nominal: 125000,
    kuota: 100,
    terpakai: 24,
    is_active: true,
  },
  {
    id: "2",
    kode: "TRIPUTRAPEDULI",
    diskon_persen: 100,
    diskon_nominal: 250000,
    kuota: 50,
    terpakai: 12,
    is_active: true,
  },
  {
    id: "3",
    kode: "SEKOLAHMITRA",
    diskon_persen: 40,
    diskon_nominal: 100000,
    kuota: 80,
    terpakai: 15,
    is_active: true,
  },
];

export const MasterDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("prodi");
  const [prodiList] = useState<ProdiItem[]>(INITIAL_PRODI);
  const [jalurList] = useState<JalurItem[]>(INITIAL_JALUR);
  const [gelombangList] = useState<GelombangItem[]>(INITIAL_GELOMBANG);
  const [voucherList] = useState<VoucherItem[]>(INITIAL_VOUCHER);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-biru-100 pb-5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-biru-950">
            Manajemen Data Master PMB
          </h1>
          <p className="text-biru-800 text-sm mt-1">
            Konfigurasi program studi, kuota, jalur pendaftaran, jadwal
            gelombang, dan kode promo voucher.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-biru-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("prodi")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "prodi"
              ? "border-biru-600 text-biru-950 bg-biru-50/50 rounded-t-lg"
              : "border-transparent text-biru-800 hover:text-biru-950"
          }`}
        >
          <BookOpen className="w-4 h-4 text-biru-700" />
          Program Studi & Kuota
        </button>

        <button
          onClick={() => setActiveTab("jalur")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "jalur"
              ? "border-biru-600 text-biru-950 bg-biru-50/50 rounded-t-lg"
              : "border-transparent text-biru-800 hover:text-biru-950"
          }`}
        >
          <Compass className="w-4 h-4 text-biru-700" />
          Jalur Pendaftaran
        </button>

        <button
          onClick={() => setActiveTab("gelombang")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "gelombang"
              ? "border-biru-600 text-biru-950 bg-biru-50/50 rounded-t-lg"
              : "border-transparent text-biru-800 hover:text-biru-950"
          }`}
        >
          <Calendar className="w-4 h-4 text-biru-700" />
          Gelombang & Jadwal
        </button>

        <button
          onClick={() => setActiveTab("voucher")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "voucher"
              ? "border-biru-600 text-biru-950 bg-biru-50/50 rounded-t-lg"
              : "border-transparent text-biru-800 hover:text-biru-950"
          }`}
        >
          <Ticket className="w-4 h-4 text-biru-700" />
          Kode Voucher Promo
        </button>
      </div>

      {/* Tab Contents */}
      {isLoading ? (
        <Card className="p-6">
          <TableSkeleton rows={5} cols={6} />
        </Card>
      ) : isError ? (
        <Card className="p-6">
          <ErrorState
            title="Gagal Memuat Data Master"
            message="Terjadi kendala saat mengambil data konfigurasi sistem dari server."
            onRetry={() => {
              setIsError(false);
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 500);
            }}
          />
        </Card>
      ) : (
        <>
          {/* Tab Content: Program Studi */}
          {activeTab === "prodi" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-bold text-biru-950 text-base">
                  Daftar Program Studi & Biaya UKT
                </h3>
              </div>

              <Card className="overflow-hidden">
                {prodiList.length === 0 ? (
                  <EmptyState
                    title="Data Program Studi Kosong"
                    description="Belum ada program studi yang dikonfigurasi dalam sistem."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-biru-50 border-b border-biru-200 text-biru-950 font-semibold text-xs tracking-wider uppercase">
                          <th className="py-3 px-4">Kode</th>
                          <th className="py-3 px-4">Nama Program Studi</th>
                          <th className="py-3 px-4">Jenjang</th>
                          <th className="py-3 px-4">Fakultas</th>
                          <th className="py-3 px-4 text-center">
                            Passing Score
                          </th>
                          <th className="py-3 px-4 text-center">
                            Kuota Mahasiswa
                          </th>
                          <th className="py-3 px-4 text-right">
                            Biaya UKT / Smt
                          </th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-biru-100 text-biru-950">
                        {prodiList.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-biru-50/50 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono font-medium text-biru-700">
                              {item.kode}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-biru-950">
                              {item.nama}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold">
                              <span className="px-2 py-0.5 rounded border border-biru-200 bg-biru-50 text-biru-900">
                                {item.jenjang}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-biru-800">
                              {item.fakultas}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-xs">
                              {item.passing_score}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-xs">
                              {item.kuota} Kursi
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-biru-950">
                              Rp {item.ukt.toLocaleString("id-ID")}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <StatusBadge
                                status={
                                  item.is_active ? "terverifikasi" : "ditolak"
                                }
                                label={item.is_active ? "Aktif" : "Nonaktif"}
                                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Tab Content: Jalur Pendaftaran */}
          {activeTab === "jalur" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-bold text-biru-950 text-base">
                  Skema Jalur Penerimaan
                </h3>
              </div>

              <Card className="overflow-hidden">
                {jalurList.length === 0 ? (
                  <EmptyState
                    title="Data Jalur Pendaftaran Kosong"
                    description="Belum ada jalur penerimaan yang dibuka saat ini."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-biru-50 border-b border-biru-200 text-biru-950 font-semibold text-xs tracking-wider uppercase">
                          <th className="py-3 px-4">Kode Jalur</th>
                          <th className="py-3 px-4">Nama Jalur</th>
                          <th className="py-3 px-4">Deskripsi</th>
                          <th className="py-3 px-4 text-right">
                            Biaya Formulir
                          </th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-biru-100 text-biru-950">
                        {jalurList.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-biru-50/50 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono font-medium text-biru-700">
                              {item.kode}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-biru-950">
                              {item.nama}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-biru-800">
                              {item.deskripsi}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-biru-950">
                              Rp {item.biaya.toLocaleString("id-ID")}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <StatusBadge
                                status={
                                  item.is_active ? "terverifikasi" : "ditolak"
                                }
                                label={item.is_active ? "Aktif" : "Nonaktif"}
                                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Tab Content: Gelombang & Jadwal */}
          {activeTab === "gelombang" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-bold text-biru-950 text-base">
                  Periode & Gelombang Pendaftaran
                </h3>
              </div>

              <Card className="overflow-hidden">
                {gelombangList.length === 0 ? (
                  <EmptyState
                    title="Data Gelombang Kosong"
                    description="Belum ada periode gelombang pendaftaran yang dijadwalkan."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-biru-50 border-b border-biru-200 text-biru-950 font-semibold text-xs tracking-wider uppercase">
                          <th className="py-3 px-4">Nama Gelombang</th>
                          <th className="py-3 px-4">Tanggal Mulai</th>
                          <th className="py-3 px-4">Tanggal Penutupan</th>
                          <th className="py-3 px-4 text-center">
                            Alokasi Kuota
                          </th>
                          <th className="py-3 px-4 text-center">
                            Status Periode
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-biru-100 text-biru-950">
                        {gelombangList.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-biru-50/50 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-semibold text-biru-950">
                              {item.nama}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-mono text-biru-900">
                              {item.tgl_mulai}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-mono text-biru-900">
                              {item.tgl_selesai}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-xs">
                              {item.kuota} Pendaftar
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <StatusBadge
                                status={
                                  item.is_active ? "terverifikasi" : "ditolak"
                                }
                                label={
                                  item.is_active ? "Buka (Aktif)" : "Ditutup"
                                }
                                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Tab Content: Kode Voucher */}
          {activeTab === "voucher" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-bold text-biru-950 text-base">
                  Kode Diskon & Beasiswa Formulir
                </h3>
              </div>

              <Card className="overflow-hidden">
                {voucherList.length === 0 ? (
                  <EmptyState
                    title="Data Voucher Kosong"
                    description="Belum ada kode voucher promo atau potongan formulir yang tersedia."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-biru-50 border-b border-biru-200 text-biru-950 font-semibold text-xs tracking-wider uppercase">
                          <th className="py-3 px-4">Kode Voucher</th>
                          <th className="py-3 px-4 text-center">
                            Potongan (%)
                          </th>
                          <th className="py-3 px-4 text-right">
                            Potongan Maksimal
                          </th>
                          <th className="py-3 px-4 text-center">
                            Penggunaan / Kuota
                          </th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-biru-100 text-biru-950">
                        {voucherList.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-biru-50/50 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-biru-700 bg-biru-50/30">
                              {item.kode}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-xs text-biru-950">
                              {item.diskon_persen}%
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-medium text-xs text-biru-900">
                              Rp {item.diskon_nominal.toLocaleString("id-ID")}
                            </td>
                            <td className="py-3.5 px-4 text-center text-xs font-mono">
                              {item.terpakai} / {item.kuota}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <StatusBadge
                                status={
                                  item.is_active ? "terverifikasi" : "ditolak"
                                }
                                label={
                                  item.is_active ? "Aktif" : "Habis/Nonaktif"
                                }
                                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
