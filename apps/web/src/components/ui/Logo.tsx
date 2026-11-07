import * as React from "react";
import logoMark from "../../assets/logo-upitra.png";

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tinggi lambang logo (px). Teks mengikuti ukuran ini. */
  height?: number;
  /** Dipertahankan agar pemakaian lama tetap valid; membatasi lebar maksimum komponen. */
  width?: number;
  /** `dark` = dipakai di atas latar gelap (lambang diberi alas putih, teks putih). */
  theme?: "light" | "dark";
  /** `false` = hanya lambang. */
  showText?: boolean;
  className?: string;
  src?: string;
}

/**
 * Logo resmi PMB Universitas Pignatelli Triputra:
 * lambang kubus "P" di kiri, di sampingnya tulisan "PMB" dan "Universitas Pignatelli Triputra".
 * Ukuran lambang eksplisit mencegah pergeseran tata letak (CLS); bila gambar gagal dimuat,
 * ditampilkan monogram sebagai cadangan.
 */
export const Logo: React.FC<LogoProps> = ({
  width,
  height = 44,
  theme = "light",
  showText = true,
  className = "",
  src = logoMark,
  style,
  ...props
}) => {
  const [hasError, setHasError] = React.useState<boolean>(false);
  const gelap = theme === "dark";

  const warnaJudul = gelap ? "text-putih" : "text-biru-950";
  const warnaSub = gelap ? "text-biru-200" : "text-biru-700";
  // Skala teks mengikuti tinggi lambang, dengan batas bawah agar tetap terbaca
  const ukJudul = Math.max(14, Math.round(height * 0.5));
  const ukSub = Math.max(9, Math.round(height * 0.23));
  const lambang = gelap ? Math.round(height * 0.92) : height;

  const lambangEl = hasError ? (
    <div
      role="img"
      aria-label="Logo Universitas Pignatelli Triputra"
      className="flex shrink-0 items-center justify-center rounded-xl bg-biru-900 font-serif font-bold text-putih"
      style={{ width: lambang, height: lambang, fontSize: lambang * 0.38 }}
    >
      UP
    </div>
  ) : (
    <img
      src={src}
      alt="Logo Universitas Pignatelli Triputra"
      width={lambang}
      height={lambang}
      onError={() => setHasError(true)}
      className="shrink-0 object-contain"
      style={{ width: lambang, height: lambang }}
      loading="eager"
      decoding="async"
    />
  );

  return (
    <div
      className={`inline-flex items-center select-none ${showText ? "gap-3" : ""} ${className}`}
      style={{ maxWidth: width, ...style }}
      {...props}
    >
      {gelap && !hasError ? (
        <span className="flex shrink-0 items-center justify-center rounded-xl bg-putih p-[3px] shadow-soft-sm">
          {lambangEl}
        </span>
      ) : (
        lambangEl
      )}
      {showText && (
        <div className="flex min-w-0 flex-col leading-tight">
          <span
            className={`font-serif font-extrabold tracking-wide ${warnaJudul}`}
            style={{ fontSize: ukJudul, lineHeight: 1.05 }}
          >
            PMB
          </span>
          <span
            className={`font-semibold tracking-tight ${warnaSub}`}
            style={{ fontSize: ukSub, lineHeight: 1.2 }}
          >
            Universitas Pignatelli Triputra
          </span>
        </div>
      )}
    </div>
  );
};
