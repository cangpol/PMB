import React, { useState, useEffect } from "react";
import {
  Plus,
  GripVertical,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  FolderOpen,
  Footprints,
  Layers,
  RotateCw,
} from "lucide-react";
import {
  StatusBadge,
  TableSkeleton,
  ErrorState,
} from "../../../components/common";
import { Button, Card, Input } from "@/components/ui";
import {
  DynamicFormRenderer,
  type DefinisiFieldItem,
} from "../../../components/form/DynamicFormRenderer";
import { useToast } from "@/components/ui/useToast";

interface DefinisiBerkasItem {
  id: string;
  jalur_id?: string | null;
  kode_berkas: string;
  nama: string;
  deskripsi?: string | null;
  wajib: boolean;
  tipe_file: string;
  ukuran_maks_kb: number;
  urutan: number;
  is_active: boolean;
}

interface DefinisiLangkahItem {
  id: string;
  jalur_id?: string | null;
  kode_langkah: string;
  judul_langkah: string;
  deskripsi?: string | null;
  tipe_langkah: string;
  urutan: number;
  wajib: boolean;
  is_active: boolean;
}

export const FormBuilderPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"fields" | "berkas" | "langkah">(
    "fields",
  );

  // Data states
  const [fields, setFields] = useState<DefinisiFieldItem[]>([]);
  const [berkasList, setBerkasList] = useState<DefinisiBerkasItem[]>([]);
  const [langkahList, setLangkahList] = useState<DefinisiLangkahItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  // Field Modal State
  const [isFieldModalOpen, setIsFieldModalOpen] = useState<boolean>(false);
  const [editingField, setEditingField] = useState<DefinisiFieldItem | null>(
    null,
  );
  const [fieldFormData, setFieldFormData] = useState({
    kode_field: "",
    label: "",
    tipe_field: "teks",
    placeholder: "",
    wajib: true,
    kelompok: "DATA_PRIBADI",
    opsi_text: "",
    min: "",
    max: "",
    format: "",
  });

  // Berkas Modal State
  const [isBerkasModalOpen, setIsBerkasModalOpen] = useState<boolean>(false);
  const [editingBerkas, setEditingBerkas] = useState<DefinisiBerkasItem | null>(
    null,
  );
  const [berkasFormData, setBerkasFormData] = useState({
    kode_berkas: "",
    nama: "",
    deskripsi: "",
    wajib: true,
    tipe_file: "image/jpeg,image/png,application/pdf",
    ukuran_maks_mb: "3",
  });

  // Drag and Drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      const [fieldsRes, berkasRes, langkahRes] = await Promise.all([
        fetch("/api/pendaftaran/admin/form-builder/fields"),
        fetch("/api/pendaftaran/admin/form-builder/berkas"),
        fetch("/api/pendaftaran/admin/form-builder/langkah"),
      ]);

      if (!fieldsRes.ok || !berkasRes.ok || !langkahRes.ok) {
        throw new Error("Gagal memuat konfigurasi form");
      }

      const [fieldsData, berkasData, langkahData] = await Promise.all([
        fieldsRes.json(),
        berkasRes.json(),
        langkahRes.json(),
      ]);

      setFields(fieldsData);
      setBerkasList(berkasData);
      setLangkahList(langkahData);
    } catch (err) {
      console.error(err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handler Field Modal
  const handleOpenAddField = () => {
    setEditingField(null);
    setFieldFormData({
      kode_field: "",
      label: "",
      tipe_field: "teks",
      placeholder: "",
      wajib: true,
      kelompok: "DATA_PRIBADI",
      opsi_text: "",
      min: "",
      max: "",
      format: "",
    });
    setIsFieldModalOpen(true);
  };

  const handleOpenEditField = (item: DefinisiFieldItem) => {
    setEditingField(item);
    const opsiArr = Array.isArray(item.opsi) ? item.opsi : [];
    const aturan = item.aturan_validasi || {};
    setFieldFormData({
      kode_field: item.kode_field,
      label: item.label,
      tipe_field: item.tipe_field,
      placeholder: item.placeholder || "",
      wajib: item.wajib,
      kelompok: item.kelompok,
      opsi_text: opsiArr.join(", "),
      min: aturan.min !== undefined ? String(aturan.min) : "",
      max: aturan.max !== undefined ? String(aturan.max) : "",
      format: aturan.format || "",
    });
    setIsFieldModalOpen(true);
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const opsiList = fieldFormData.opsi_text
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const aturan: Record<string, any> = {};
      if (fieldFormData.min) aturan.min = Number(fieldFormData.min);
      if (fieldFormData.max) aturan.max = Number(fieldFormData.max);
      if (fieldFormData.format) aturan.format = fieldFormData.format;

      if (editingField) {
        // UPDATE
        const res = await fetch(
          `/api/pendaftaran/admin/form-builder/fields/${editingField.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jalur_id: editingField.jalur_id,
              label: fieldFormData.label,
              tipe_field: fieldFormData.tipe_field,
              placeholder: fieldFormData.placeholder || null,
              wajib: fieldFormData.wajib,
              opsi: opsiList,
              aturan_validasi: aturan,
              urutan: editingField.urutan,
              kelompok: fieldFormData.kelompok,
              is_active: editingField.is_active,
            }),
          },
        );
        if (!res.ok) throw new Error("Gagal memperbarui field");
        toast({
          variant: "success",
          title: "Berhasil",
          description: "Field formulir berhasil diperbarui.",
        });
      } else {
        // CREATE
        const res = await fetch("/api/pendaftaran/admin/form-builder/fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kode_field: fieldFormData.kode_field
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "_"),
            label: fieldFormData.label,
            tipe_field: fieldFormData.tipe_field,
            placeholder: fieldFormData.placeholder || null,
            wajib: fieldFormData.wajib,
            opsi: opsiList,
            aturan_validasi: aturan,
            urutan: fields.length + 1,
            kelompok: fieldFormData.kelompok,
          }),
        });
        if (!res.ok) throw new Error("Gagal membuat field baru");
        toast({
          variant: "success",
          title: "Berhasil",
          description: "Field formulir baru berhasil ditambahkan.",
        });
      }

      setIsFieldModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Kesalahan",
        description: err.message || "Gagal menyimpan field",
      });
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus field ini?")) return;
    try {
      const res = await fetch(
        `/api/pendaftaran/admin/form-builder/fields/${id}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Gagal menghapus field");
      toast({
        variant: "success",
        title: "Dihapus",
        description: "Field formulir berhasil dihapus.",
      });
      fetchData();
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Kesalahan",
        description: err.message || "Gagal menghapus field",
      });
    }
  };

  // Reorder Field Up / Down
  const handleMoveField = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const newFields = [...fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, moved);

    setFields(newFields);

    try {
      await fetch("/api/pendaftaran/admin/form-builder/fields/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_ids: newFields.map((f) => f.id) }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...fields];
    const [moved] = newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, moved);

    setDraggedIndex(null);
    setFields(newFields);

    try {
      await fetch("/api/pendaftaran/admin/form-builder/fields/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_ids: newFields.map((f) => f.id) }),
      });
      toast({
        variant: "success",
        title: "Urutan Disimpan",
        description: "Urutan tampilan field berhasil diperbarui.",
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Handler Berkas Modal
  const handleOpenAddBerkas = () => {
    setEditingBerkas(null);
    setBerkasFormData({
      kode_berkas: "",
      nama: "",
      deskripsi: "",
      wajib: true,
      tipe_file: "image/jpeg,image/png,application/pdf",
      ukuran_maks_mb: "3",
    });
    setIsBerkasModalOpen(true);
  };

  const handleOpenEditBerkas = (item: DefinisiBerkasItem) => {
    setEditingBerkas(item);
    setBerkasFormData({
      kode_berkas: item.kode_berkas,
      nama: item.nama,
      deskripsi: item.deskripsi || "",
      wajib: item.wajib,
      tipe_file: item.tipe_file,
      ukuran_maks_mb: String((item.ukuran_maks_kb / 1024).toFixed(0)),
    });
    setIsBerkasModalOpen(true);
  };

  const handleSaveBerkas = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const kb = Math.round(Number(berkasFormData.ukuran_maks_mb || 3) * 1024);

      if (editingBerkas) {
        const res = await fetch(
          `/api/pendaftaran/admin/form-builder/berkas/${editingBerkas.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jalur_id: editingBerkas.jalur_id,
              nama: berkasFormData.nama,
              deskripsi: berkasFormData.deskripsi || null,
              wajib: berkasFormData.wajib,
              tipe_file: berkasFormData.tipe_file,
              ukuran_maks_kb: kb,
              urutan: editingBerkas.urutan,
              is_active: editingBerkas.is_active,
            }),
          },
        );
        if (!res.ok) throw new Error("Gagal memperbarui berkas");
        toast({
          variant: "success",
          title: "Berhasil",
          description: "Syarat berkas berhasil diperbarui.",
        });
      } else {
        const res = await fetch("/api/pendaftaran/admin/form-builder/berkas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kode_berkas: berkasFormData.kode_berkas.trim().toUpperCase(),
            nama: berkasFormData.nama,
            deskripsi: berkasFormData.deskripsi || null,
            wajib: berkasFormData.wajib,
            tipe_file: berkasFormData.tipe_file,
            ukuran_maks_kb: kb,
            urutan: berkasList.length + 1,
          }),
        });
        if (!res.ok) throw new Error("Gagal membuat syarat berkas baru");
        toast({
          variant: "success",
          title: "Berhasil",
          description: "Syarat berkas baru berhasil ditambahkan.",
        });
      }

      setIsBerkasModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Kesalahan",
        description: err.message || "Gagal menyimpan berkas",
      });
    }
  };

  const handleDeleteBerkas = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus syarat berkas ini?"))
      return;
    try {
      const res = await fetch(
        `/api/pendaftaran/admin/form-builder/berkas/${id}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Gagal menghapus berkas");
      toast({
        variant: "success",
        title: "Dihapus",
        description: "Syarat berkas berhasil dihapus.",
      });
      fetchData();
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Kesalahan",
        description: err.message || "Gagal menghapus berkas",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-biru-100 animate-pulse rounded-md" />
        <TableSkeleton rows={6} cols={5} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Gagal Memuat Form Builder"
          message="Terjadi kendala saat menghubungkan ke database formulir PMB."
          onRetry={fetchData}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-biru-100 pb-6">
        <div>
          <span className="text-xs font-semibold text-biru-800 tracking-wider uppercase">
            Konfigurasi Penerimaan Mahasiswa Baru
          </span>
          <h1 className="font-serif text-3xl font-bold text-biru-950 mt-1">
            Form & Berkas Builder
          </h1>
          <p className="text-xs text-biru-800 mt-1">
            Kelola kolom biodata dinamis, persyaratan unggah berkas, dan tahapan
            alur pendaftaran tanpa perlu ubah kode program.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchData}
            className="flex items-center gap-2 border-biru-200 text-biru-900 hover:bg-biru-50"
          >
            <RotateCw className="w-4 h-4" />
            <span>Segarkan</span>
          </Button>

          {activeTab === "fields" && (
            <Button
              onClick={handleOpenAddField}
              className="bg-biru-900 text-putih hover:bg-biru-950 flex items-center gap-2 shadow-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kolom Biodata</span>
            </Button>
          )}

          {activeTab === "berkas" && (
            <Button
              onClick={handleOpenAddBerkas}
              className="bg-biru-900 text-putih hover:bg-biru-950 flex items-center gap-2 shadow-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Syarat Berkas</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-2 border-b border-biru-200">
        <button
          onClick={() => setActiveTab("fields")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "fields"
              ? "border-biru-900 text-biru-950"
              : "border-transparent text-biru-700 hover:text-biru-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Kolom Formulir Biodata ({fields.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("berkas")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "berkas"
              ? "border-biru-900 text-biru-950"
              : "border-transparent text-biru-700 hover:text-biru-900"
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Dokumen Berkas Persyaratan ({berkasList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("langkah")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "langkah"
              ? "border-biru-900 text-biru-950"
              : "border-transparent text-biru-700 hover:text-biru-900"
          }`}
        >
          <Footprints className="w-4 h-4" />
          <span>Alur Langkah Pendaftaran ({langkahList.length})</span>
        </button>
      </div>

      {/* TAB 1: FIELD FORMULIR BIODATA DENGAN LIVE PREVIEW */}
      {activeTab === "fields" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri: Pengelola Field & Reordering (7 Kolom) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-biru-950">
                Struktur Kolom Formulir
              </h2>
              <span className="text-xs text-biru-700">
                Tarik gagang{" "}
                <GripVertical className="w-3.5 h-3.5 inline text-biru-400" />{" "}
                untuk mengurutkan
              </span>
            </div>

            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e)}
                  onDrop={() => handleDrop(idx)}
                  className={`p-4 bg-putih rounded-xl border border-biru-100 shadow-xs flex items-center justify-between gap-4 transition hover:border-biru-300 ${
                    draggedIndex === idx
                      ? "opacity-40 border-dashed border-biru-600"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="cursor-grab text-biru-400 hover:text-biru-900 p-1">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="w-6 h-6 rounded-full bg-biru-50 text-biru-900 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="truncate space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-biru-950 truncate">
                          {field.label}
                        </span>
                        {field.wajib && (
                          <span className="text-[10px] bg-biru-100 text-biru-900 font-bold px-1.5 py-0.2 rounded">
                            Wajib
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-biru-700">
                        <span className="font-mono bg-biru-50 px-1 rounded text-biru-800">
                          {field.kode_field}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{field.tipe_field}</span>
                        <span>•</span>
                        <span className="text-biru-600">{field.kelompok}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveField(idx, "up")}
                      className="p-1.5 text-biru-700 hover:text-biru-950 disabled:opacity-30 rounded hover:bg-biru-50"
                      title="Pindahkan ke atas"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === fields.length - 1}
                      onClick={() => handleMoveField(idx, "down")}
                      className="p-1.5 text-biru-700 hover:text-biru-950 disabled:opacity-30 rounded hover:bg-biru-50"
                      title="Pindahkan ke bawah"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditField(field)}
                      className="p-1.5 text-biru-800 hover:text-biru-950 rounded hover:bg-biru-50"
                      title="Ubah Field"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteField(field.id)}
                      className="p-1.5 text-biru-600 hover:text-biru-900 rounded hover:bg-biru-50"
                      title="Hapus Field"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kolom Kanan: Live Preview Form Calon (5 Kolom) */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="p-4 bg-biru-950 text-putih rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-biru-300" />
                <span className="font-serif text-sm font-bold">
                  Pratinjau Langsung Form Calon
                </span>
              </div>
              <span className="text-[11px] bg-biru-900 text-biru-200 px-2 py-0.5 rounded-full font-medium">
                Live Preview
              </span>
            </div>
            <div className="p-5 bg-biru-50/50 rounded-b-xl border border-biru-200 shadow-sm max-h-[75vh] overflow-y-auto">
              <p className="text-xs text-biru-800 mb-4 italic">
                Tampilan di bawah adalah pratinjau bagaimana calon mahasiswa
                melihat formulir ini secara real-time.
              </p>
              <DynamicFormRenderer
                fields={fields}
                readOnly={true}
                onSubmit={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOKUMEN BERKAS PERSYARATAN */}
      {activeTab === "berkas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-biru-950">
              Daftar Persyaratan Berkas Pendaftaran
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {berkasList.map((item) => (
              <Card
                key={item.id}
                className="p-5 border-biru-100 bg-putih shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold bg-biru-50 text-biru-900 px-2 py-0.5 rounded">
                      {item.kode_berkas}
                    </span>
                    {item.wajib ? (
                      <span className="text-[10px] bg-biru-900 text-putih font-bold px-2 py-0.5 rounded-full">
                        Wajib
                      </span>
                    ) : (
                      <span className="text-[10px] bg-biru-100 text-biru-800 font-medium px-2 py-0.5 rounded-full">
                        Opsional
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-base font-bold text-biru-950">
                    {item.nama}
                  </h3>
                  {item.deskripsi && (
                    <p className="text-xs text-biru-800 line-clamp-2">
                      {item.deskripsi}
                    </p>
                  )}
                  <div className="text-xs text-biru-700 pt-2 space-y-1">
                    <div>
                      Format:{" "}
                      <strong className="font-semibold">
                        {item.tipe_file}
                      </strong>
                    </div>
                    <div>
                      Batas Maks:{" "}
                      <strong className="font-semibold">
                        {(item.ukuran_maks_kb / 1024).toFixed(1)} MB
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-biru-100">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEditBerkas(item)}
                    className="text-xs border-biru-200 text-biru-900 hover:bg-biru-50"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Ubah
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteBerkas(item.id)}
                    className="text-xs border-biru-200 text-biru-600 hover:bg-biru-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Hapus
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LANGKAH ALUR PENDAFTARAN */}
      {activeTab === "langkah" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-biru-950">
              Tahapan Alur Pendaftaran Calon Mahasiswa
            </h2>
          </div>

          <div className="space-y-3 max-w-3xl">
            {langkahList.map((step, idx) => (
              <div
                key={step.id}
                className="p-5 bg-putih rounded-xl border border-biru-100 shadow-xs flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-biru-900 text-putih font-bold text-sm flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-serif text-base font-bold text-biru-950">
                      {step.judul_langkah}
                    </h4>
                    {step.deskripsi && (
                      <p className="text-xs text-biru-800 mt-0.5">
                        {step.deskripsi}
                      </p>
                    )}
                    <span className="inline-block font-mono text-[11px] text-biru-600 mt-1">
                      Tipe: {step.tipe_langkah} •{" "}
                      {step.wajib ? "Wajib" : "Opsional"}
                    </span>
                  </div>
                </div>

                <StatusBadge status="success" label="Aktif" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DIALOG MODAL: TAMBAH / UBAH FIELD BIODATA */}
      {isFieldModalOpen && (
        <div className="fixed inset-0 z-50 bg-biru-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-putih rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-biru-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-biru-100">
              <h3 className="font-serif text-lg font-bold text-biru-950">
                {editingField
                  ? "Ubah Kolom Biodata"
                  : "Tambah Kolom Biodata Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsFieldModalOpen(false)}
                className="text-biru-400 hover:text-biru-900 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveField} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-biru-900 mb-1">
                  Label Tampilan Form *
                </label>
                <Input
                  required
                  placeholder="Contoh: Nomor Induk Kependudukan (NIK)"
                  value={fieldFormData.label}
                  onChange={(e) =>
                    setFieldFormData({
                      ...fieldFormData,
                      label: e.target.value,
                    })
                  }
                />
              </div>

              {!editingField && (
                <div>
                  <label className="block text-xs font-semibold text-biru-900 mb-1">
                    Kode Field Database * (huruf kecil, underscore)
                  </label>
                  <Input
                    required
                    placeholder="Contoh: nomor_nik, asal_sekolah"
                    value={fieldFormData.kode_field}
                    onChange={(e) =>
                      setFieldFormData({
                        ...fieldFormData,
                        kode_field: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-biru-900 mb-1">
                    Tipe Masukan *
                  </label>
                  <select
                    value={fieldFormData.tipe_field}
                    onChange={(e) =>
                      setFieldFormData({
                        ...fieldFormData,
                        tipe_field: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-putih border border-biru-200 rounded-lg text-xs text-biru-950"
                  >
                    <option value="teks">Teks Pendek</option>
                    <option value="angka">Angka / Numerik</option>
                    <option value="tanggal">Tanggal (YYYY-MM-DD)</option>
                    <option value="pilihan">Pilihan Dropdown</option>
                    <option value="pilihan_ganda">
                      Pilihan Ganda (Checkbox)
                    </option>
                    <option value="textarea">Teks Panjang (Textarea)</option>
                    <option value="wilayah">
                      Wilayah (Provinsi & Kabupaten)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-biru-900 mb-1">
                    Kelompok Bagian *
                  </label>
                  <select
                    value={fieldFormData.kelompok}
                    onChange={(e) =>
                      setFieldFormData({
                        ...fieldFormData,
                        kelompok: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-putih border border-biru-200 rounded-lg text-xs text-biru-950"
                  >
                    <option value="DATA_PRIBADI">Data Identitas Pribadi</option>
                    <option value="DATA_ORANG_TUA">
                      Data Orang Tua / Wali
                    </option>
                    <option value="DATA_SEKOLAH">
                      Data Asal Sekolah & Nilai
                    </option>
                    <option value="DATA_TAMBAHAN">
                      Informasi Tambahan / Minat
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-biru-900 mb-1">
                  Placeholder / Petunjuk Pengisian
                </label>
                <Input
                  placeholder="Contoh: Masukkan 16 digit angka sesuai KTP"
                  value={fieldFormData.placeholder}
                  onChange={(e) =>
                    setFieldFormData({
                      ...fieldFormData,
                      placeholder: e.target.value,
                    })
                  }
                />
              </div>

              {(fieldFormData.tipe_field === "pilihan" ||
                fieldFormData.tipe_field === "pilihan_ganda") && (
                <div>
                  <label className="block text-xs font-semibold text-biru-900 mb-1">
                    Daftar Opsi (Pisahkan dengan koma) *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Contoh: Katolik, Kristen Protestan, Islam, Hindu, Buddha"
                    value={fieldFormData.opsi_text}
                    onChange={(e) =>
                      setFieldFormData({
                        ...fieldFormData,
                        opsi_text: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-putih border border-biru-200 rounded-lg text-xs text-biru-950"
                  />
                </div>
              )}

              {/* Aturan Validasi Khusus */}
              <div className="p-3 bg-biru-50/50 rounded-lg border border-biru-100 space-y-3">
                <span className="text-xs font-bold text-biru-950 block">
                  Aturan Validasi Tambahan (Opsional)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-biru-800 mb-1">
                      Min (Char/Nilai)
                    </label>
                    <Input
                      type="number"
                      placeholder="Contoh: 16"
                      value={fieldFormData.min}
                      onChange={(e) =>
                        setFieldFormData({
                          ...fieldFormData,
                          min: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-biru-800 mb-1">
                      Max (Char/Nilai)
                    </label>
                    <Input
                      type="number"
                      placeholder="Contoh: 100"
                      value={fieldFormData.max}
                      onChange={(e) =>
                        setFieldFormData({
                          ...fieldFormData,
                          max: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-biru-800 mb-1">
                      Format Khusus
                    </label>
                    <select
                      value={fieldFormData.format}
                      onChange={(e) =>
                        setFieldFormData({
                          ...fieldFormData,
                          format: e.target.value,
                        })
                      }
                      className="w-full px-2 py-2 bg-putih border border-biru-200 rounded-lg text-xs text-biru-950"
                    >
                      <option value="">Tidak ada</option>
                      <option value="nik">NIK (16 Digit Angka)</option>
                      <option value="email">Email Valid</option>
                      <option value="phone">
                        Nomor Telepon (min. 10 Digit)
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="wajib_cb"
                  checked={fieldFormData.wajib}
                  onChange={(e) =>
                    setFieldFormData({
                      ...fieldFormData,
                      wajib: e.target.checked,
                    })
                  }
                  className="rounded border-biru-300 text-biru-900 focus:ring-biru-800"
                />
                <label
                  htmlFor="wajib_cb"
                  className="text-xs font-semibold text-biru-900"
                >
                  Wajib Diisi oleh Calon Mahasiswa
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-biru-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFieldModalOpen(false)}
                  className="border-biru-200 text-biru-900"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-biru-900 text-putih hover:bg-biru-950 font-semibold"
                >
                  Simpan Kolom
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG MODAL: TAMBAH / UBAH DOKUMEN BERKAS */}
      {isBerkasModalOpen && (
        <div className="fixed inset-0 z-50 bg-biru-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-putih rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-biru-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-biru-100">
              <h3 className="font-serif text-lg font-bold text-biru-950">
                {editingBerkas
                  ? "Ubah Syarat Berkas"
                  : "Tambah Syarat Berkas Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsBerkasModalOpen(false)}
                className="text-biru-400 hover:text-biru-900 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBerkas} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-biru-900 mb-1">
                  Nama Dokumen Persyaratan *
                </label>
                <Input
                  required
                  placeholder="Contoh: Pasfoto Formal Berwarna (3x4)"
                  value={berkasFormData.nama}
                  onChange={(e) =>
                    setBerkasFormData({
                      ...berkasFormData,
                      nama: e.target.value,
                    })
                  }
                />
              </div>

              {!editingBerkas && (
                <div>
                  <label className="block text-xs font-semibold text-biru-900 mb-1">
                    Kode Berkas * (huruf kapital, e.g. PASFOTO, KTP_KK)
                  </label>
                  <Input
                    required
                    placeholder="Contoh: PASFOTO, IJAZAH_SKL"
                    value={berkasFormData.kode_berkas}
                    onChange={(e) =>
                      setBerkasFormData({
                        ...berkasFormData,
                        kode_berkas: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-biru-900 mb-1">
                  Deskripsi / Petunjuk Dokumen
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Pakaian rapi berkerah, latar belakang merah atau biru."
                  value={berkasFormData.deskripsi}
                  onChange={(e) =>
                    setBerkasFormData({
                      ...berkasFormData,
                      deskripsi: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-putih border border-biru-200 rounded-lg text-xs text-biru-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-biru-900 mb-1">
                    Format File Diizinkan
                  </label>
                  <Input
                    value={berkasFormData.tipe_file}
                    onChange={(e) =>
                      setBerkasFormData({
                        ...berkasFormData,
                        tipe_file: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-biru-900 mb-1">
                    Batas Ukuran (MB)
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    value={berkasFormData.ukuran_maks_mb}
                    onChange={(e) =>
                      setBerkasFormData({
                        ...berkasFormData,
                        ukuran_maks_mb: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="wajib_berkas_cb"
                  checked={berkasFormData.wajib}
                  onChange={(e) =>
                    setBerkasFormData({
                      ...berkasFormData,
                      wajib: e.target.checked,
                    })
                  }
                  className="rounded border-biru-300 text-biru-900 focus:ring-biru-800"
                />
                <label
                  htmlFor="wajib_berkas_cb"
                  className="text-xs font-semibold text-biru-900"
                >
                  Wajib Diunggah untuk Memenuhi Syarat Pendaftaran
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-biru-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBerkasModalOpen(false)}
                  className="border-biru-200 text-biru-900"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-biru-900 text-putih hover:bg-biru-950 font-semibold"
                >
                  Simpan Berkas
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
