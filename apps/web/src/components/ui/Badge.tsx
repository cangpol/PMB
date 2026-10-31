import React from "react";
import { CheckCircle2, Clock, AlertCircle, XCircle, Info } from "lucide-react";

export type BadgeVariant =
  "berhasil" | "menunggu" | "gagal" | "peringatan" | "netral" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  label?: React.ReactNode;
}

/**
 * Komponen Lencana Status (Badge) PMB UPT
 * Mengandalkan kombinasi Ikon + Teks + Level Kontras Token Biru (tanpa warna hijau/merah).
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = "netral",
  size = "md",
  icon,
  label,
  children,
  className = "",
  ...props
}) => {
  const defaultIcons: Record<BadgeVariant, React.ReactNode> = {
    berhasil: <CheckCircle2 className="w-3.5 h-3.5 text-biru-700" />,
    menunggu: <Clock className="w-3.5 h-3.5 text-biru-600" />,
    gagal: <XCircle className="w-3.5 h-3.5 text-biru-800" />,
    peringatan: <AlertCircle className="w-3.5 h-3.5 text-biru-700" />,
    netral: <Info className="w-3.5 h-3.5 text-biru-600" />,
    outline: <Info className="w-3.5 h-3.5 text-biru-700" />,
  };

  const variantStyles: Record<BadgeVariant, string> = {
    berhasil:
      "bg-biru-50 text-biru-950 border border-biru-500 font-semibold shadow-soft-sm",
    menunggu: "bg-biru-100/70 text-biru-900 border border-biru-200 font-medium",
    gagal:
      "bg-biru-950 text-putih border border-biru-900 font-semibold shadow-soft-sm",
    peringatan:
      "bg-biru-50 text-biru-950 border-2 border-biru-600 font-semibold",
    netral: "bg-biru-50/50 text-biru-800 border border-biru-200 font-medium",
    outline: "bg-transparent text-biru-950 border border-biru-500 font-medium",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1 rounded-md",
    md: "px-2.5 py-1 text-xs gap-1.5 rounded-lg",
  };

  const content = label || children;
  const renderedIcon = icon !== undefined ? icon : defaultIcons[variant];

  return (
    <span
      className={`inline-flex items-center tracking-wide shrink-0 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {renderedIcon}
      {content && <span>{content}</span>}
    </span>
  );
};
