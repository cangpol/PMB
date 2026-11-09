import React, { useMemo } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Users,
  GraduationCap,
  Sparkles,
  Save,
  AlertCircle,
} from "lucide-react";
import { Button, Card, Input, EmptyState } from "@/components/ui";
import { PilihWilayahDomisili } from "./PilihWilayahDomisili";
import { AutocompleteSekolah } from "./AutocompleteSekolah";

export interface DefinisiFieldItem {
  id: string;
  jalur_id?: string | null;
  kode_field: string;
  label: string;
  tipe_field: string;
  placeholder?: string | null;
  wajib: boolean;
  opsi?: any;
  aturan_validasi?: any;
  urutan: number;
  kelompok: string;
  is_active: boolean;
}

interface DynamicFormRendererProps {
  fields: DefinisiFieldItem[];
  defaultValues?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  isSubmitting?: boolean;
  submitButtonText?: string;
  readOnly?: boolean;
}

function buildDynamicZodSchema(fields: DefinisiFieldItem[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  fields.forEach((f) => {
    if (!f.is_active) return;
    const aturan = f.aturan_validasi || {};

    switch (f.tipe_field) {
      case "teks": {
        let s: z.ZodTypeAny = z.string();
        if (aturan.min) {
          s = (s as z.ZodString).min(
            aturan.min,
            `${f.label} minimal ${aturan.min} karakter`,
          );
        }
        if (aturan.max) {
          s = (s as z.ZodString).max(
            aturan.max,
            `${f.label} maksimal ${aturan.max} karakter`,
          );
        }
        if (aturan.format === "nik") {
          s = (s as z.ZodString).regex(
            /^\d{16}$/,
            `${f.label} harus berupa 16 digit angka`,
          );
        }
        if (aturan.format === "email") {
          s = (s as z.ZodString).email(`Format ${f.label} tidak valid`);
        }
        if (aturan.format === "phone") {
          s = (s as z.ZodString).regex(
            /^[0-9+\-\s]{10,}$/,
            `Nomor ${f.label} minimal 10 digit angka`,
          );
        }
        if (f.wajib) {
          s = (s as z.ZodString).min(1, `${f.label} wajib diisi`);
        } else {
          s = s.optional().or(z.literal(""));
        }
        shape[f.kode_field] = s;
        break;
      }

      case "angka": {
        let num: z.ZodTypeAny = z.coerce.number();
        if (aturan.min !== undefined) {
          num = (num as z.ZodNumber).min(
            aturan.min,
            `${f.label} minimal ${aturan.min}`,
          );
        }
        if (aturan.max !== undefined) {
          num = (num as z.ZodNumber).max(
            aturan.max,
            `${f.label} maksimal ${aturan.max}`,
          );
        }
        if (!f.wajib) {
          num = num.optional().or(z.literal(0));
        }
        shape[f.kode_field] = num;
        break;
      }

      case "tanggal": {
        let d: z.ZodTypeAny = z
          .string()
          .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            `Format tanggal ${f.label} harus YYYY-MM-DD`,
          );
        if (!f.wajib) {
          d = d.optional().or(z.literal(""));
        }
        shape[f.kode_field] = d;
        break;
      }

      case "pilihan": {
        let sel: z.ZodTypeAny = z.string();
        if (f.wajib) {
          sel = (sel as z.ZodString).min(1, `Silakan pilih ${f.label}`);
        } else {
          sel = sel.optional().or(z.literal(""));
        }
        shape[f.kode_field] = sel;
        break;
      }

      case "pilihan_ganda": {
        let arr: z.ZodTypeAny = z.array(z.string());
        if (f.wajib) {
          arr = (arr as z.ZodArray<z.ZodString>).min(
            aturan.min || 1,
            `Pilih minimal ${aturan.min || 1} pilihan untuk ${f.label}`,
          );
        }
        if (aturan.max) {
          arr = (arr as z.ZodArray<z.ZodString>).max(
            aturan.max,
            `Pilih maksimal ${aturan.max} pilihan untuk ${f.label}`,
          );
        }
        shape[f.kode_field] = arr;
        break;
      }

      case "textarea": {
        let ta: z.ZodTypeAny = z.string();
        if (f.wajib) {
          ta = (ta as z.ZodString).min(
            aturan.min || 1,
            `${f.label} wajib diisi minimal ${aturan.min || 1} karakter`,
          );
        } else {
          ta = ta.optional().or(z.literal(""));
        }
        if (aturan.max) {
          ta = (ta as z.ZodString).max(
            aturan.max,
            `${f.label} maksimal ${aturan.max} karakter`,
          );
        }
        shape[f.kode_field] = ta;
        break;
      }

      case "wilayah": {
        let wil: z.ZodTypeAny = z.object({
          negara: z.string().trim().min(1, `Isi Negara untuk ${f.label}`),
          provinsi: z.string().trim().min(1, `Isi Provinsi untuk ${f.label}`),
          kabupaten: z
            .string()
            .trim()
            .min(1, `Isi Kabupaten/Kota untuk ${f.label}`),
          kecamatan: z.string().trim().min(1, `Isi Kecamatan untuk ${f.label}`),
        });
        if (!f.wajib) {
          wil = wil.optional();
        }
        shape[f.kode_field] = wil;
        break;
      }

      default:
        shape[f.kode_field] = z.any().optional();
    }
  });

  return z.object(shape);
}

function parseOptions(opsi: any): string[] {
  if (Array.isArray(opsi)) {
    return opsi.map((item) =>
      typeof item === "string"
        ? item
        : item.value || item.label || String(item),
    );
  }
  return [];
}

const KELOMPOK_METADATA: Record<
  string,
  { title: string; icon: React.ReactNode }
> = {
  DATA_PRIBADI: {
    title: "Data Identitas Pribadi Calon Mahasiswa",
    icon: <User className="w-5 h-5 text-biru-900" />,
  },
  DATA_ORANG_TUA: {
    title: "Data Orang Tua / Wali Mahasiswa",
    icon: <Users className="w-5 h-5 text-biru-900" />,
  },
  DATA_SEKOLAH: {
    title: "Data Asal Sekolah & Nilai Akademik",
    icon: <GraduationCap className="w-5 h-5 text-biru-900" />,
  },
  DATA_TAMBAHAN: {
    title: "Informasi Tambahan & Minat Bakat",
    icon: <Sparkles className="w-5 h-5 text-biru-900" />,
  },
};

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  fields,
  defaultValues = {},
  onSubmit,
  isSubmitting = false,
  submitButtonText = "Simpan Biodata Pendaftaran",
  readOnly = false,
}) => {
  const dynamicSchema = useMemo(() => buildDynamicZodSchema(fields), [fields]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(dynamicSchema),
    defaultValues,
  });

  // Domisili calon dipakai untuk mengurutkan saran nama sekolah
  const kodeWilayah = fields.find(
    (f) => f.tipe_field === "wilayah",
  )?.kode_field;
  const domisili = useWatch({
    control,
    name: kodeWilayah ?? "__tanpa_wilayah__",
  }) as { provinsi?: string; kabupaten?: string } | undefined;

  const groupedFields = useMemo(() => {
    const groups: Record<string, DefinisiFieldItem[]> = {};
    const sorted = [...fields].sort((a, b) => a.urutan - b.urutan);

    sorted.forEach((f) => {
      const g = f.kelompok || "DATA_PRIBADI";
      if (!groups[g]) groups[g] = [];
      groups[g].push(f);
    });

    return groups;
  }, [fields]);

  if (fields.length === 0) {
    return (
      <Card className="p-8 border-biru-200 bg-putih text-center shadow-xs">
        <EmptyState
          title="Belum Ada Kolom Formulir"
          description="Formulir pendaftaran untuk jalur ini belum dikonfigurasi atau belum memiliki kolom isian aktif."
        />
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {Object.entries(groupedFields).map(([groupKey, groupItems]) => {
        const meta = KELOMPOK_METADATA[groupKey] || {
          title: groupKey.replace(/_/g, " "),
          icon: <User className="w-5 h-5 text-biru-900" />,
        };

        return (
          <Card
            key={groupKey}
            className="p-6 border-biru-100 bg-putih shadow-sm"
          >
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-biru-100">
              <div className="p-2 bg-biru-50 rounded-lg text-biru-900">
                {meta.icon}
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-biru-950">
                  {meta.title}
                </h3>
                <p className="text-xs text-biru-800">
                  Lengkapi seluruh kolom yang bertanda bintang merah (*) secara
                  akurat.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {groupItems.map((field) => {
                const error = errors[field.kode_field];
                const isFullWidth =
                  field.tipe_field === "textarea" ||
                  field.tipe_field === "wilayah" ||
                  field.tipe_field === "pilihan_ganda" ||
                  field.kode_field.includes("alamat") ||
                  field.kode_field.includes("sekolah");

                return (
                  <div
                    key={field.id}
                    className={
                      isFullWidth ? "md:col-span-2 space-y-1.5" : "space-y-1.5"
                    }
                  >
                    <label className="block text-xs font-semibold text-biru-900">
                      {field.label}{" "}
                      {field.wajib && <span className="text-biru-600">*</span>}
                    </label>

                    {/* RENDER BERDASARKAN TIPE FIELD */}
                    {field.tipe_field === "teks" &&
                      field.kode_field === "asal_sekolah" && (
                        <Controller
                          control={control}
                          name={field.kode_field}
                          render={({ field: c }) => (
                            <AutocompleteSekolah
                              value={c.value ?? ""}
                              onChange={c.onChange}
                              onBlur={c.onBlur}
                              placeholder={field.placeholder || undefined}
                              disabled={readOnly}
                              invalid={!!error}
                              preferensi={{
                                provinsi: domisili?.provinsi,
                                kabupaten: domisili?.kabupaten,
                              }}
                            />
                          )}
                        />
                      )}

                    {field.tipe_field === "teks" &&
                      field.kode_field !== "asal_sekolah" && (
                        <Input
                          type="text"
                          placeholder={field.placeholder || undefined}
                          disabled={readOnly}
                          {...register(field.kode_field)}
                          className={`w-full ${error ? "border-biru-600 ring-1 ring-biru-600" : ""}`}
                        />
                      )}

                    {field.tipe_field === "angka" && (
                      <Input
                        type="number"
                        step="any"
                        placeholder={field.placeholder || undefined}
                        disabled={readOnly}
                        {...register(field.kode_field)}
                        className={`w-full ${error ? "border-biru-600 ring-1 ring-biru-600" : ""}`}
                      />
                    )}

                    {field.tipe_field === "tanggal" && (
                      <Input
                        type="date"
                        placeholder="YYYY-MM-DD"
                        disabled={readOnly}
                        {...register(field.kode_field)}
                        className={`w-full ${error ? "border-biru-600 ring-1 ring-biru-600" : ""}`}
                      />
                    )}

                    {field.tipe_field === "pilihan" && (
                      <select
                        disabled={readOnly}
                        {...register(field.kode_field)}
                        className={`w-full px-3.5 py-2.5 bg-putih border rounded-lg text-sm text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-800 transition ${
                          error
                            ? "border-biru-600 ring-1 ring-biru-600"
                            : "border-biru-200"
                        }`}
                      >
                        <option value="">
                          {field.placeholder || `-- Pilih ${field.label} --`}
                        </option>
                        {parseOptions(field.opsi).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {field.tipe_field === "pilihan_ganda" && (
                      <Controller
                        control={control}
                        name={field.kode_field}
                        defaultValue={[]}
                        render={({ field: controllerField }) => {
                          const currentVals: string[] = Array.isArray(
                            controllerField.value,
                          )
                            ? controllerField.value
                            : [];
                          const options = parseOptions(field.opsi);

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3.5 bg-biru-50/50 rounded-lg border border-biru-100">
                              {options.map((opt) => {
                                const isChecked = currentVals.includes(opt);
                                return (
                                  <label
                                    key={opt}
                                    className={`flex items-center gap-2.5 p-2 rounded-md text-xs font-medium cursor-pointer transition ${
                                      isChecked
                                        ? "bg-putih text-biru-950 shadow-xs border border-biru-300"
                                        : "text-biru-800 hover:bg-biru-100/50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      value={opt}
                                      checked={isChecked}
                                      disabled={readOnly}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          controllerField.onChange([
                                            ...currentVals,
                                            opt,
                                          ]);
                                        } else {
                                          controllerField.onChange(
                                            currentVals.filter(
                                              (v) => v !== opt,
                                            ),
                                          );
                                        }
                                      }}
                                      className="rounded border-biru-300 text-biru-900 focus:ring-biru-800"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        }}
                      />
                    )}

                    {field.tipe_field === "textarea" && (
                      <textarea
                        rows={3}
                        placeholder={field.placeholder || undefined}
                        disabled={readOnly}
                        {...register(field.kode_field)}
                        className={`w-full px-3.5 py-2.5 bg-putih border rounded-lg text-sm text-biru-950 focus:outline-none focus:ring-2 focus:ring-biru-800 transition ${
                          error
                            ? "border-biru-600 ring-1 ring-biru-600"
                            : "border-biru-200"
                        }`}
                      />
                    )}

                    {field.tipe_field === "wilayah" && (
                      <Controller
                        control={control}
                        name={field.kode_field}
                        render={({ field: controllerField }) => (
                          <PilihWilayahDomisili
                            value={controllerField.value}
                            onChange={controllerField.onChange}
                            disabled={readOnly}
                          />
                        )}
                      />
                    )}

                    {error && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-biru-700 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 text-biru-800" />
                        <span>{String(error.message)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {!readOnly && (
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-biru-900 text-putih hover:bg-biru-950 font-semibold shadow-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? "Menyimpan Data..." : submitButtonText}</span>
          </Button>
        </div>
      )}
    </form>
  );
};
