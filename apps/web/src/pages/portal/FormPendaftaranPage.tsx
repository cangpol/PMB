import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button, CardSkeleton, ErrorState } from "../../components/common";
import { DynamicFormRenderer } from "../../components/form/DynamicFormRenderer";
import type { DefinisiFieldItem } from "../../components/form/DynamicFormRenderer";
import { useToast } from "@/components/ui/useToast";

export const FormPendaftaranPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fields, setFields] = useState<DefinisiFieldItem[]>([]);
  const [defaultValues, setDefaultValues] = useState<Record<string, any>>({});
  const [pendaftarDetail, setPendaftarDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const loadFormData = async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      // Ambil definisi field dinamis & data pendaftar aktif jika ada
      const [fieldsRes, myRes] = await Promise.all([
        fetch("/api/pendaftaran/fields"),
        fetch("/api/pendaftaran/my"),
      ]);

      if (!fieldsRes.ok) {
        throw new Error("Gagal memuat formulir pendaftaran");
      }

      const fieldsData = await fieldsRes.json();
      setFields(fieldsData);

      if (myRes.ok) {
        const myData = await myRes.json();
        setPendaftarDetail(myData);

        // Gabungkan data formulir JSONB dengan nilai yang tersimpan
        const savedForm = myData.data_formulir || {};
        const prefill: Record<string, any> = {
          ...savedForm,
          nik: savedForm.nik || myData.nik || "",
          nama_lengkap: savedForm.nama_lengkap || myData.nama_lengkap || "",
          tempat_lahir: savedForm.tempat_lahir || myData.tempat_lahir || "",
          tgl_lahir: savedForm.tgl_lahir || myData.tgl_lahir || "",
          jenis_kelamin: savedForm.jenis_kelamin || myData.jenis_kelamin || "",
          agama: savedForm.agama || myData.agama || "",
          alamat_ktp:
            savedForm.alamat_ktp ||
            savedForm.alamat_lengkap ||
            myData.alamat_lengkap ||
            "",
          nama_ayah: savedForm.nama_ayah || myData.nama_ortu || "",
          no_hp_ortu: savedForm.no_hp_ortu || myData.no_hp_ortu || "",
          asal_sekolah: savedForm.asal_sekolah || myData.asal_sekolah || "",
          jurusan_sekolah:
            savedForm.jurusan_sekolah || myData.jurusan_sekolah || "",
          nilai_rata_rata_rapor:
            savedForm.nilai_rata_rata_rapor || myData.nilai_rapor_avg || 0,
        };
        setDefaultValues(prefill);
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFormData();
  }, []);

  const handleSubmit = async (formData: Record<string, any>) => {
    try {
      setIsSubmitting(true);
      setSaveSuccess(false);

      const res = await fetch("/api/pendaftaran/submit-dinamis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: formData,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.detail?.join(", ") ||
            errJson.pesan ||
            "Gagal menyimpan biodata pendaftaran",
        );
      }

      const updated = await res.json();
      setPendaftarDetail(updated);
      setSaveSuccess(true);
      toast({
        variant: "success",
        title: "Biodata Tersimpan",
        description:
          "Formulir biodata pendaftaran Anda berhasil disimpan secara aman.",
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Kesalahan Validasi",
        description: err.message || "Gagal menyimpan formulir pendaftaran",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        <div className="h-8 w-64 bg-biru-100 animate-pulse rounded-md" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <ErrorState
          title="Gagal Memuat Formulir"
          message="Tidak dapat terhubung ke server pendaftaran PMB."
          onRetry={loadFormData}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-biru-100 pb-6">
        <div>
          <span className="text-xs font-semibold text-biru-800 tracking-wider uppercase">
            Portal Calon Mahasiswa • Tahap 2
          </span>
          <h1 className="font-serif text-3xl font-bold text-biru-950 mt-1">
            Formulir Biodata Pendaftaran
          </h1>
          <p className="text-xs text-biru-800 mt-1">
            Isi seluruh informasi biodata diri, kontak orang tua/wali, dan
            riwayat pendidikan Anda dengan teliti dan benar.
          </p>
        </div>

        {pendaftarDetail && (
          <div className="bg-biru-50 px-4 py-2.5 rounded-xl border border-biru-200 text-right">
            <span className="text-[11px] text-biru-700 block font-medium">
              Nomor Pendaftaran Resmi
            </span>
            <span className="font-mono text-sm font-bold text-biru-950">
              {pendaftarDetail.nomor_pendaftaran}
            </span>
          </div>
        )}
      </div>

      {/* Alert Berhasil Disimpan */}
      {saveSuccess && (
        <div className="p-4 bg-biru-900 text-putih rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-biru-200 shrink-0" />
            <div>
              <h4 className="font-serif font-bold text-base">
                Biodata Berhasil Disimpan!
              </h4>
              <p className="text-xs text-biru-200">
                Data Anda telah terverifikasi oleh server. Silakan lanjutkan ke
                tahap unggah dokumen berkas persyaratan.
              </p>
            </div>
          </div>

          <Button
            onClick={() => navigate("/portal/berkas")}
            className="bg-putih text-biru-950 hover:bg-biru-50 font-bold px-4 py-2 text-xs flex items-center gap-1.5 shrink-0"
          >
            <span>Lanjut Unggah Berkas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Mesin Form Dinamis */}
      <DynamicFormRenderer
        fields={fields}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitButtonText="Simpan Biodata Pendaftaran"
      />
    </div>
  );
};
