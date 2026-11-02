import * as React from "react";

export type TypographyVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "body-lg"
  | "body"
  | "body-sm"
  | "caption"
  | "label"
  | "numeric";

export type TypographyTag =
  "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div" | "label";

export type TypographyFont = "sans" | "serif" | "mono";

export type TypographyWeight = 400 | 500 | 600 | 700;

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  as?: TypographyTag;
  variant?: TypographyVariant;
  font?: TypographyFont;
  weight?: TypographyWeight;
  tabularNums?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const DEFAULT_TAG_MAP: Record<TypographyVariant, TypographyTag> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  "body-lg": "p",
  body: "p",
  "body-sm": "p",
  caption: "span",
  label: "span",
  numeric: "span",
};

const VARIANT_CLASS_MAP: Record<TypographyVariant, string> = {
  display:
    "text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-biru-950 tracking-[-0.035em] leading-[1.1]",
  h1: "text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-biru-950 tracking-[-0.025em] leading-[1.2]",
  h2: "text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-biru-950 tracking-[-0.02em] leading-[1.25]",
  h3: "text-lg sm:text-xl lg:text-2xl font-serif font-semibold text-biru-950 tracking-[-0.015em] leading-[1.3]",
  h4: "text-base sm:text-lg font-sans font-semibold text-biru-950 tracking-[-0.01em] leading-[1.35]",
  "body-lg": "text-lg font-sans font-normal text-biru-800 leading-[1.4]",
  body: "text-base font-sans font-normal text-biru-800 leading-[1.5]",
  "body-sm": "text-sm font-sans font-normal text-biru-700 leading-[1.4]",
  caption: "text-xs font-sans font-normal text-biru-600 leading-[1.33]",
  label:
    "text-xs font-sans font-bold uppercase tracking-wider text-biru-800 leading-[1.33]",
  numeric: "font-sans tabular-nums text-biru-950",
};

const FONT_MAP: Record<TypographyFont, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

const WEIGHT_MAP: Record<TypographyWeight, string> = {
  400: "font-normal",
  500: "font-medium",
  600: "font-semibold",
  700: "font-bold",
};

export const Typography: React.FC<TypographyProps> = ({
  as,
  variant = "body",
  font,
  weight,
  tabularNums,
  className = "",
  children,
  ...props
}) => {
  const Component = as || DEFAULT_TAG_MAP[variant] || "p";

  const fontClass = font ? FONT_MAP[font] : "";
  const weightClass = weight ? WEIGHT_MAP[weight] : "";
  const numericClass =
    tabularNums || variant === "numeric" ? "tabular-nums" : "";

  return (
    <Component
      className={`${VARIANT_CLASS_MAP[variant]} ${fontClass} ${weightClass} ${numericClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
};

// Aliases / Convenient Subcomponents
export const H1: React.FC<Omit<TypographyProps, "variant">> = (props) => (
  <Typography variant="h1" {...props} />
);

export const H2: React.FC<Omit<TypographyProps, "variant">> = (props) => (
  <Typography variant="h2" {...props} />
);

export const H3: React.FC<Omit<TypographyProps, "variant">> = (props) => (
  <Typography variant="h3" {...props} />
);

export const H4: React.FC<Omit<TypographyProps, "variant">> = (props) => (
  <Typography variant="h4" {...props} />
);

export const Body: React.FC<Omit<TypographyProps, "variant">> = (props) => (
  <Typography variant="body" {...props} />
);

export const Caption: React.FC<Omit<TypographyProps, "variant">> = (props) => (
  <Typography variant="caption" {...props} />
);

export const TypographyLabel: React.FC<Omit<TypographyProps, "variant">> = (
  props,
) => <Typography variant="label" as="span" {...props} />;

export const Numeric: React.FC<Omit<TypographyProps, "variant">> = (props) => (
  <Typography variant="numeric" tabularNums {...props} />
);
