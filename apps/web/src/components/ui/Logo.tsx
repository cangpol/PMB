import * as React from "react";
import logoSvg from "../../assets/logo-placeholder.svg";

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number;
  height?: number;
  theme?: "light" | "dark";
  showText?: boolean;
  className?: string;
  src?: string;
}

/**
 * Komponen Logo Resmi Universitas Pignatelli Triputra
 * Menampilkan vektor logo institusi dengan atribut dimensi eksplisit untuk mencegah CLS,
 * serta fallback SVG terpadu (monogram UPITRA + nama universitas) jika gambar eksternal gagal dimuat.
 */
export const Logo: React.FC<LogoProps> = ({
  width = 220,
  height = 44,
  theme = "light",
  showText = true,
  className = "",
  src = logoSvg,
  ...props
}) => {
  const [hasError, setHasError] = React.useState<boolean>(false);

  // Jika gambar gagal dimuat, tampilkan fallback monogram & teks institusi
  if (hasError) {
    return (
      <div
        className={`flex items-center gap-2.5 select-none ${className}`}
        style={{ height }}
        {...props}
      >
        {/* Monogram Badge */}
        <div
          className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center font-serif font-bold text-sm shadow-soft-sm ${
            theme === "dark"
              ? "bg-biru-800 text-putih border border-biru-600"
              : "bg-biru-900 text-putih border border-biru-800"
          }`}
          aria-hidden="true"
        >
          UP
        </div>

        {showText && (
          <div className="flex flex-col leading-tight">
            <span
              className={`font-serif text-sm font-bold tracking-tight ${
                theme === "dark" ? "text-putih" : "text-biru-950"
              }`}
            >
              UNIVERSITAS PIGNATELLI
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-widest ${
                theme === "dark" ? "text-biru-300" : "text-biru-700"
              }`}
            >
              TRIPUTRA
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center select-none ${className}`}
      {...props}
    >
      <img
        src={src}
        alt="Logo Universitas Pignatelli Triputra"
        width={width}
        height={height}
        onError={() => setHasError(true)}
        className="h-9 sm:h-10 w-auto object-contain"
        loading="eager"
        decoding="async"
      />
    </div>
  );
};
