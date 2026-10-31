import React from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "./Label";

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Komponen FormField Terpadu PMB UPT
 * Mengemas label, input, deskripsi pembantu (hint), dan pesan validasi error secara aksesibel.
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  hint,
  error,
  className = "",
  children,
}) => {
  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {hint && !error && (
        <p className="text-xs text-biru-700/80 leading-relaxed">{hint}</p>
      )}
      {error && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-biru-800 animate-fade-in mt-1">
          <AlertCircle className="w-3.5 h-3.5 text-biru-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
