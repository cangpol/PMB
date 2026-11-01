import React from "react";
import { Badge, type BadgeProps } from "../ui/Badge";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

export interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  icon: customIcon,
}) => {
  const normalized = status.toLowerCase();
  let variant: BadgeProps["variant"] = "netral";
  let autoIcon = <Clock className="w-3.5 h-3.5" />;
  let text = label || status;

  if (
    normalized.includes("lunas") ||
    normalized.includes("berhasil") ||
    normalized.includes("lulus") ||
    normalized.includes("valid") ||
    normalized.includes("diakui") ||
    normalized.includes("selesai")
  ) {
    variant = "berhasil";
    autoIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
    text = label || "Berhasil";
  } else if (normalized.includes("terverifikasi")) {
    variant = "berhasil";
    autoIcon = <ShieldCheck className="w-3.5 h-3.5" />;
    text = label || "Terverifikasi";
  } else if (
    normalized.includes("gagal") ||
    normalized.includes("ditolak") ||
    normalized.includes("tidak_lulus")
  ) {
    variant = "gagal";
    autoIcon = <XCircle className="w-3.5 h-3.5" />;
    text = label || "Gagal";
  } else if (
    normalized.includes("peringatan") ||
    normalized.includes("revisi")
  ) {
    variant = "peringatan";
    autoIcon = <AlertCircle className="w-3.5 h-3.5" />;
    text = label || "Perlu Perbaikan";
  } else if (normalized.includes("menunggu") || normalized.includes("proses")) {
    variant = "menunggu";
    autoIcon = <Clock className="w-3.5 h-3.5" />;
    text = label || "Menunggu";
  }

  return (
    <Badge variant={variant} icon={customIcon || autoIcon}>
      {text}
    </Badge>
  );
};
