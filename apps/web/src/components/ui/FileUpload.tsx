import * as React from "react";
import { UploadCloud, File, X, AlertCircle } from "lucide-react";
import { Button } from "./Button";

export interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSizeMB = 5,
  multiple = false,
  disabled = false,
  label = "Unggah Berkas",
  helperText = "Format yang didukung: PDF, JPG, PNG (Maksimal 5MB)",
  className = "",
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const DANGEROUS_EXTENSIONS = [
    ".exe",
    ".bat",
    ".cmd",
    ".sh",
    ".msi",
    ".js",
    ".vbs",
    ".hta",
    ".html",
    ".htm",
    ".svg",
    ".php",
    ".asp",
    ".aspx",
    ".py",
    ".jar",
    ".com",
    ".scr",
  ];

  const validateAndAddFiles = (files: FileList | File[]) => {
    setErrorMessage(null);
    const validList: File[] = [];
    const allowedSpecs = accept
      .split(",")
      .map((spec) => spec.trim().toLowerCase())
      .filter(Boolean);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lastDot = file.name.lastIndexOf(".");
      const ext =
        lastDot !== -1 ? file.name.substring(lastDot).toLowerCase() : "";

      // Blacklist dangerous file types (e.g. executable or SVG XSS)
      if (DANGEROUS_EXTENSIONS.includes(ext)) {
        setErrorMessage(
          `Format berkas "${file.name}" berpotensi berbahaya dan tidak diizinkan.`,
        );
        return;
      }

      // Validate allowed specifications without vulnerable regex
      const isAllowed = allowedSpecs.some((spec) => {
        if (spec.startsWith(".")) {
          return ext === spec;
        }
        if (spec.endsWith("/*")) {
          const mimePrefix = spec.slice(0, -2);
          return file.type.toLowerCase().startsWith(`${mimePrefix}/`);
        }
        return file.type.toLowerCase() === spec;
      });

      if (allowedSpecs.length > 0 && !isAllowed) {
        setErrorMessage(`Format berkas "${file.name}" tidak didukung.`);
        return;
      }

      if (file.size > maxSizeBytes) {
        setErrorMessage(
          `Ukuran berkas "${file.name}" melebihi batas ${maxSizeMB}MB.`,
        );
        return;
      }

      validList.push(file);
      if (!multiple) break;
    }

    const updated = multiple ? [...selectedFiles, ...validList] : validList;
    setSelectedFiles(updated);
    onFilesSelected(updated);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, idx) => idx !== index);
    setSelectedFiles(updated);
    onFilesSelected(updated);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-biru-950">
          {label}
        </label>
      )}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Area unggah berkas, klik atau seret berkas ke sini"
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-biru-500 sm:p-8 ${
          disabled
            ? "cursor-not-allowed border-biru-100 bg-biru-50/50 opacity-60"
            : isDragOver
              ? "border-biru-600 bg-biru-50 shadow-soft-md"
              : "border-biru-200 bg-putih hover:border-biru-500 hover:bg-biru-50/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-biru-100 text-biru-800">
          <UploadCloud className="h-6 w-6" aria-hidden="true" />
        </div>

        <p className="mt-3 text-sm font-medium text-biru-950">
          <span className="font-semibold text-biru-700 underline underline-offset-2">
            Klik untuk memilih
          </span>{" "}
          atau seret dan lepas berkas di sini
        </p>

        <p className="mt-1 text-xs text-biru-700">{helperText}</p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-biru-300 bg-biru-50 p-3 text-sm text-biru-900"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-biru-700" />
          <span>{errorMessage}</span>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <ul className="space-y-2">
          {selectedFiles.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-biru-200 bg-putih p-3 shadow-soft-sm"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-biru-100 text-biru-800">
                  <File className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-biru-950">
                    {file.name}
                  </p>
                  <p className="text-xs text-biru-700">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                type="button"
                aria-label={`Hapus ${file.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="h-8 w-8 p-0 text-biru-700 hover:bg-biru-100 hover:text-biru-950"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
