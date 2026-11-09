import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  CreditCard,
  FileCheck,
  Printer,
  Lock,
  Download,
} from "lucide-react";
import {
  Card,
  Button,
  StatusBadge,
  CardSkeleton,
  ErrorState,
} from "../../components/common";
import { fetchApi } from "../../services/api";
import {
  BuktiPembayaranCard,
  rupiah,
  type BuktiPembayaranItem,
} from "../../components/pembayaran/BuktiPembayaranCard";
import { AlurStepper, useAlur } from "../../components/pendaftaran/AlurStepper";
import {
  PESAN_DAFTAR_ULANG_SELESAI,
  berkasDaftarUlangLengkap,
  berkasTerbaru,
} from "../../lib/berkasDaftarUlang";
import { KartuMahasiswa } from "../../components/dokumen/KartuMahasiswa";
import {
  atributAccept,
  periksaFormatBerkas,
  unggahKeStorage,
} from "@/lib/unggahBerkas";
import { PopupFormatSalah } from "@/components/berkas/PopupFormatSalah";

interface TagihanDto {
  id: string;
  nomor_tagihan: string;
  nominal_asli: number;
  nominal_akhir: number;
  diskon: number;
  status: string; // 'PENDING' | 'PAID' | 'MENUNGGU_PEMBAYARAN' | 'LUNAS'
  metode_pembayaran: string;
  payment_url?: string | null;
  va_number?: string | null;
  tgl_jatuh_tempo?: string | null;
  rincian?: { komponen: string; nominal: number }[];
}

interface BerkasDaftarUlang {
  id: string;
  pendaftar_id: string;
  jenis_berkas: string;
  file_key: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  status_verifikasi: "PENDING" | "VALID" | "INVALID";
  catatan?: string | null;
  uploaded_at: string;
}

interface DaftarUlangResponse {
  pendaftar_id: string;
  nomor_pendaftaran: string;
  nama_lengkap: string;
  prodi_diterima: string;
  jenjang: string;
  fakultas: string;
  status_kelulusan: string;
  status_daftar_ulang: string; // 'BELUM_DAFTAR_ULANG' | 'TAGIHAN_TERBIT' | 'LUNAS' | 'BERKAS_LENGKAP' | 'TERDAFTAR_SEBAGAI_MAHASISWA'
  nomor_registrasi?: string | null;
  status_bukti_bayar?: string | null;
  catatan_bukti_bayar?: string | null;
  nim_resmi?: string | null;
  nomor_loa?: string | null;
  tagihan?: TagihanDto | null;
  berkas_list: BerkasDaftarUlang[];
  potongan_persen?: number;
  benefit_jalur?: string | null;
}

const REQUIRED_DOCS = [
  {
    jenis: "SPKP",
    title: "SPKP",
    desc: "Unggah SPKP yang telah ditandatangani.",
  },
  {
    jenis: "BERKAS_PERATURAN",
    title: "Berkas Peraturan",
    desc: "Unggah berkas peraturan yang telah ditandatangani.",
  },
  {
    jenis: "SURAT_PERNYATAAN_BEASISWA",
    title: "Surat Pernyataan (Beasiswa)",
    desc: "Surat pernyataan penerima beasiswa yang telah ditandatangani.",
  },
  {
    jenis: "KTP",
    title: "KTP",
    desc: "Scan atau foto KTP yang jelas dan terbaca.",
  },
  {
    jenis: "KK",
    title: "KK",
    desc: "Scan atau foto Kartu Keluarga (KK) yang jelas dan terbaca.",
  },
  {
    jenis: "TRANSKRIP_NILAI",
    title: "Transkrip Nilai",
    desc: "Scan transkrip nilai dari sekolah asal.",
  },
];

const TIPE_BERKAS = ["application/pdf", "image/jpeg", "image/png"];
const MAKS_BERKAS = 5 * 1024 * 1024;

export const DaftarUlangPage: React.FC = () => {
  const { alur, muatUlang: muatAlur } = useAlur();
  const [data, setData] = useState<DaftarUlangResponse | null>(null);
  const [formatSalah, setFormatSalah] = useState<string | null>(null);
  const [buktiList, setBuktiList] = useState<BuktiPembayaranItem[]>([]);
  const [berkasError, setBerkasError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [uploadingJenis, setUploadingJenis] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [res, bukti] = await Promise.all([
        fetchApi<DaftarUlangResponse>("/api/kelulusan/daftar-ulang"),
        fetchApi<BuktiPembayaranItem[]>("/api/pembayaran/bukti/my"),
      ]);
      setData(res);
      setBuktiList(bukti);
      await muatAlur();
    } catch (err: unknown) {
      const e = err as { pesan?: string };
      setErrorMessage(
        e.pesan || "Gagal memuat informasi registrasi daftar ulang.",
      );
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const unggahBerkas = async (jenis: string, file: File) => {
    setBerkasError(null);
    const cek = await periksaFormatBerkas(file, TIPE_BERKAS);
    if (!cek.ok) {
      setFormatSalah(cek.alasan);
      return;
    }
    const mime = cek.mime;
    if (file.size > MAKS_BERKAS) {
      setBerkasError("Ukuran berkas maksimal 5 MB.");
      return;
    }
    setUploadingJenis(jenis);
    try {
      const presign = await fetchApi<{ upload_url: string; file_key: string }>(
        "/api/kelulusan/daftar-ulang/berkas/presign",
        {
          method: "POST",
          body: JSON.stringify({ jenis_berkas: jenis, file_name: file.name }),
        },
      );
      await unggahKeStorage(presign.upload_url, file, mime);
      await fetchApi("/api/kelulusan/daftar-ulang/berkas", {
        method: "POST",
        body: JSON.stringify({
          jenis_berkas: jenis,
          file_name: file.name,
          mime_type: mime,
          file_size_bytes: file.size,
          file_key: presign.file_key,
        }),
      });
      await loadData();
    } catch (err: unknown) {
      const e = err as { pesan?: string; message?: string };
      setBerkasError(e.pesan || e.message || "Gagal mengunggah berkas.");
    } finally {
      setUploadingJenis(null);
    }
  };

  const getDocStatus = (jenis: string) =>
    data ? berkasTerbaru(data.berkas_list, jenis) : undefined;

  const berkasLengkap =
    !!data &&
    berkasDaftarUlangLengkap(
      data.berkas_list,
      REQUIRED_DOCS.map((d) => d.jenis),
    );

  const isLunas =
    data?.status_daftar_ulang === "LUNAS" ||
    data?.status_daftar_ulang === "BERKAS_LENGKAP" ||
    data?.status_daftar_ulang === "TERDAFTAR_SEBAGAI_MAHASISWA" ||
    data?.tagihan?.status === "LUNAS" ||
    data?.tagihan?.status === "PAID";

  const isBerkasLengkap =
    data?.status_daftar_ulang === "BERKAS_LENGKAP" ||
    data?.status_daftar_ulang === "TERDAFTAR_SEBAGAI_MAHASISWA";

  const isTerdaftarMaba =
    data?.status_daftar_ulang === "TERDAFTAR_SEBAGAI_MAHASISWA";

  const buktiDu = data?.tagihan
    ? (buktiList.find((b) => b.tagihan_id === data.tagihan?.id) ?? null)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PopupFormatSalah
        alasan={formatSalah}
        onTutup={() => setFormatSalah(null)}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-biru-200">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-biru-950">
            Daftar Ulang & Registrasi Mahasiswa Baru
          </h1>
          <p className="text-xs sm:text-sm text-biru-800">
            Tahapan penyelesaian administrasi UKT, verifikasi berkas, dan
            perolehan NIM resmi PMB 2026
          </p>
        </div>
        {data && (
          <StatusBadge
            status={
              isTerdaftarMaba
                ? "berhasil"
                : isBerkasLengkap
                  ? "info"
                  : isLunas
                    ? "peringatan"
                    : "standar"
            }
            label={data.status_daftar_ulang.replace(/_/g, " ")}
          />
        )}
      </div>

      {isLoading && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!isLoading && isError && (
        <ErrorState
          title="Gagal Memuat Halaman Daftar Ulang"
          message={errorMessage}
          onRetry={loadData}
        />
      )}

      {!isLoading && !isError && data && (
        <div className="space-y-6">
          {alur && <AlurStepper alur={alur} ringkas />}

          {/* Kartu Mahasiswa Sementara (Jika Sudah Terbit NIM Resmi) */}
          {isTerdaftarMaba && data.nim_resmi && (
            <section className="space-y-3" aria-label="Kartu Tanda Mahasiswa">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-biru-950">
                    Kartu Tanda Mahasiswa Sementara
                  </h3>
                  <p className="text-xs text-biru-800">
                    Terdaftar resmi sebagai mahasiswa baru. Cetak kartu untuk
                    kegiatan orientasi.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5 text-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Kartu Tanda Mahasiswa</span>
                </Button>
              </div>
              <KartuMahasiswa
                nim={data.nim_resmi}
                nama={data.nama_lengkap}
                prodi={`${data.jenjang} ${data.prodi_diterima}`}
                fakultas={data.fakultas}
                nomorPendaftaran={data.nomor_pendaftaran}
              />
            </section>
          )}

          {/* LoA yang memuat NIM, tersedia setelah NIM terbit */}
          {isTerdaftarMaba && data.nim_resmi && (
            <section
              className="rounded-2xl border border-biru-200 bg-putih p-5 flex flex-wrap items-center justify-between gap-3"
              aria-label="Surat Penerimaan (LoA)"
            >
              <div>
                <h3 className="font-serif text-lg font-bold text-biru-950">
                  Surat Penerimaan (LoA)
                </h3>
                <p className="text-xs text-biru-800">
                  LoA sudah memuat NIM Anda ({data.nim_resmi}).
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open("/api/kelulusan/loa/pdf", "_blank")}
                className="gap-1.5 text-xs"
              >
                <Download className="w-4 h-4" />
                <span>Unduh LoA (PDF)</span>
              </Button>
            </section>
          )}

          {/* Beasiswa jalur READY */}
          {((data.potongan_persen ?? 0) > 0 || data.benefit_jalur) && (
            <section
              className="rounded-2xl border border-biru-300 bg-biru-50 p-5 space-y-1 text-sm text-biru-950"
              aria-label="Beasiswa jalur pendaftaran"
            >
              <h3 className="font-serif text-lg font-bold">
                Beasiswa Jalur Pendaftaran Anda
              </h3>
              {(data.potongan_persen ?? 0) > 0 && (
                <p>
                  Potongan <strong>{data.potongan_persen}%</strong> untuk biaya
                  DPP dan SKS.
                </p>
              )}
              {data.benefit_jalur && <p>Benefit: {data.benefit_jalur}.</p>}
              {data.tagihan && data.tagihan.nominal_akhir === 0 && (
                <p className="font-semibold">
                  Tagihan daftar ulang Anda Rp 0, sehingga pembayaran otomatis
                  lunas. Silakan lengkapi berkas registrasi di bawah.
                </p>
              )}
            </section>
          )}

          {/* Section 1: Tagihan Pembayaran UKT */}
          <Card className="p-6 border-biru-200 bg-putih rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-biru-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-biru-800" />
                <h3 className="font-bold text-base text-biru-950 font-serif">
                  Tagihan Biaya Registrasi & UKT Semester 1
                </h3>
              </div>
              <StatusBadge
                status={isLunas ? "berhasil" : "peringatan"}
                label={isLunas ? "LUNAS" : "MENUNGGU PEMBAYARAN"}
              />
            </div>

            {data.tagihan ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-biru-50/70 border border-biru-200 rounded-xl text-xs">
                  <div>
                    <span className="text-biru-700">Nomor Tagihan</span>
                    <p className="font-mono font-bold text-biru-950 mt-0.5">
                      {data.tagihan.nomor_tagihan}
                    </p>
                  </div>
                  <div>
                    <span className="text-biru-700">Nominal UKT</span>
                    <p className="font-mono font-bold text-biru-950 mt-0.5">
                      Rp {data.tagihan.nominal_asli.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div>
                    <span className="text-biru-700">Potongan / Beasiswa</span>
                    <p className="font-mono font-bold text-emerald-700 mt-0.5">
                      Rp {data.tagihan.diskon.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div>
                    <span className="text-biru-700">Total Wajib Bayar</span>
                    <p className="font-mono text-base font-extrabold text-biru-950 mt-0.5">
                      Rp {data.tagihan.nominal_akhir.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {data.tagihan.rincian && data.tagihan.rincian.length > 0 && (
                  <table className="w-full text-xs">
                    <caption className="text-left font-bold text-biru-950 pb-2">
                      Rincian biaya daftar ulang
                    </caption>
                    <tbody>
                      {data.tagihan.rincian.map((r) => (
                        <tr
                          key={r.komponen}
                          className="border-b border-biru-100"
                        >
                          <td className="py-1.5 text-biru-800">{r.komponen}</td>
                          <td className="py-1.5 text-right font-mono text-biru-950">
                            {rupiah(r.nominal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {data.tagihan.tgl_jatuh_tempo && !isLunas && (
                  <p className="text-xs font-semibold text-biru-950 p-3 rounded-xl bg-biru-50 border border-biru-200">
                    Batas pembayaran daftar ulang:{" "}
                    {new Date(data.tagihan.tgl_jatuh_tempo).toLocaleString(
                      "id-ID",
                      {
                        dateStyle: "full",
                        timeStyle: "short",
                        timeZone: "Asia/Jakarta",
                      },
                    )}{" "}
                    WIB
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-biru-700">
                Tidak ada tagihan daftar ulang aktif.
              </p>
            )}
          </Card>

          {data.tagihan && (
            <BuktiPembayaranCard
              tagihanId={data.tagihan.id}
              nomorTagihan={data.tagihan.nomor_tagihan}
              nominal={data.tagihan.nominal_akhir}
              judul="Pembayaran Daftar Ulang"
              buktiTerakhir={buktiDu}
              sudahDisetujui={Boolean(isLunas)}
              beritaTransfer={data.nomor_registrasi}
              onTerkirim={loadData}
            />
          )}

          {/* Section 2: Unggah Berkas Registrasi Mahasiswa Baru */}
          <Card className="p-6 border-biru-200 bg-putih rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-biru-200">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-biru-800" />
                <h3 className="font-bold text-base text-biru-950 font-serif">
                  Berkas Registrasi Mahasiswa Baru
                </h3>
              </div>
              <span className="text-xs text-biru-800">
                Wajib dilengkapi seluruhnya untuk penerbitan NIM
              </span>
            </div>

            {!isLunas && (
              <p className="flex items-center gap-2 text-xs text-biru-900 p-3 rounded-xl bg-biru-50 border border-biru-200">
                <Lock className="w-4 h-4 shrink-0" />
                Unggah berkas registrasi ulang dibuka setelah pembayaran daftar
                ulang disetujui admin PMB.
              </p>
            )}
            {berkasLengkap && !data?.nim_resmi && (
              <div
                role="status"
                className="rounded-xl border border-biru-300 bg-biru-50 p-4 text-sm text-biru-950"
              >
                <p className="font-bold">Pendaftaran Anda telah selesai</p>
                <p>{PESAN_DAFTAR_ULANG_SELESAI}</p>
              </div>
            )}
            {berkasError && (
              <p className="text-xs font-semibold text-rose-700" role="alert">
                {berkasError}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REQUIRED_DOCS.map((doc) => {
                const statusDoc = getDocStatus(doc.jenis);
                const isUploaded = Boolean(statusDoc);
                const isValid = statusDoc?.status_verifikasi === "VALID";
                const isPending = statusDoc?.status_verifikasi === "PENDING";
                const isInvalid = statusDoc?.status_verifikasi === "INVALID";

                return (
                  <div
                    key={doc.jenis}
                    className="p-4 border border-biru-200 rounded-2xl bg-putih hover:border-biru-400 transition-colors space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-xs text-biru-950">
                          {doc.title}
                        </h4>
                        {isValid && (
                          <StatusBadge status="berhasil" label="VALID" />
                        )}
                        {isPending && (
                          <StatusBadge
                            status="peringatan"
                            label="MENUNGGU VERIFIKASI"
                          />
                        )}
                        {isInvalid && (
                          <StatusBadge status="gagal" label="REVISI" />
                        )}
                        {!isUploaded && (
                          <StatusBadge status="standar" label="BELUM UNGGAH" />
                        )}
                      </div>
                      <p className="text-[11px] text-biru-700 mt-1 leading-relaxed">
                        {doc.desc}
                      </p>
                    </div>

                    {statusDoc?.catatan && (
                      <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                        Catatan Verifikator: {statusDoc.catatan}
                      </p>
                    )}

                    <div className="pt-2 border-t border-biru-100 flex items-center justify-between">
                      {isUploaded ? (
                        <div className="text-[11px] text-biru-900 font-mono truncate max-w-[180px]">
                          {statusDoc.file_name}
                        </div>
                      ) : (
                        <span className="text-[11px] text-biru-600 italic">
                          PDF/JPG/PNG maks 5 MB
                        </span>
                      )}

                      {!isValid && isLunas && (
                        <>
                          <input
                            ref={(el) => {
                              inputRefs.current[doc.jenis] = el;
                            }}
                            type="file"
                            accept={atributAccept(TIPE_BERKAS)}
                            className="hidden"
                            aria-label={`Unggah ${doc.title}`}
                            onChange={(e) => {
                              const f = e.currentTarget.files?.[0];
                              e.currentTarget.value = "";
                              if (f) unggahBerkas(doc.jenis, f);
                            }}
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={uploadingJenis === doc.jenis}
                            onClick={() =>
                              inputRefs.current[doc.jenis]?.click()
                            }
                            className="gap-1 text-[11px] px-3 py-1"
                          >
                            <Upload className="w-3.5 h-3.5 text-biru-700" />
                            <span>
                              {uploadingJenis === doc.jenis
                                ? "Mengunggah..."
                                : isUploaded
                                  ? "Unggah Ulang"
                                  : "Unggah Dokumen"}
                            </span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
