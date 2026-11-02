import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import {
  Typography,
  H1,
  H2,
  H3,
  H4,
  Body,
  Caption,
  TypographyLabel,
  Numeric,
} from "./Typography";

describe("Typography Component - Design System Scale & Accessibility", () => {
  it("renders default body text as <p> with font-sans", () => {
    render(
      <div>
        <Typography>Teks default sistem PMB UPITRA</Typography>
        <Body>Paragraf isi standar akademik</Body>
        <Caption>Keterangan tambahan caption</Caption>
      </div>,
    );
    const el = screen.getByText("Teks default sistem PMB UPITRA");
    expect(el.tagName).toBe("P");
    expect(el).toHaveClass("font-sans");
    expect(screen.getByText("Paragraf isi standar akademik")).toHaveClass(
      "font-sans",
    );
    expect(screen.getByText("Keterangan tambahan caption")).toHaveClass(
      "text-xs",
    );
  });

  it("renders H1 with <h1> tag, font-serif, and tracking-tight", () => {
    render(<H1>Penerimaan Mahasiswa Baru UPITRA</H1>);
    const el = screen.getByRole("heading", { level: 1 });
    expect(el).toBeInTheDocument();
    expect(el.tagName).toBe("H1");
    expect(el).toHaveClass("font-serif");
    expect(el).toHaveClass("font-bold");
  });

  it("renders H2, H3, H4 with appropriate heading levels", () => {
    render(
      <div>
        <H2>Jalur Masuk Prestasi</H2>
        <H3>Fakultas Sains & Teknologi</H3>
        <H4>Program Studi S1 Sains Data</H4>
      </div>,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Jalur Masuk Prestasi",
    );
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "Fakultas Sains & Teknologi",
    );
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(
      "Program Studi S1 Sains Data",
    );
  });

  it("supports polymorphic 'as' prop to render semantic tags", () => {
    render(
      <Typography variant="h2" as="span">
        Judul dalam format inline span
      </Typography>,
    );
    const el = screen.getByText("Judul dalam format inline span");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("font-serif");
  });

  it("renders Label with uppercase and tracking-wider", () => {
    render(<TypographyLabel>GELOMBANG 1 SELEKSI</TypographyLabel>);
    const el = screen.getByText("GELOMBANG 1 SELEKSI");
    expect(el).toHaveClass("uppercase");
    expect(el).toHaveClass("tracking-wider");
  });

  it("enforces tabular-nums on Numeric component and numbers", () => {
    render(<Numeric>Rp 450.000.000</Numeric>);
    const el = screen.getByText("Rp 450.000.000");
    expect(el).toHaveClass("tabular-nums");
    expect(el).toHaveClass("font-sans");
  });

  it("allows switching font family between sans, serif, and mono", () => {
    render(
      <div>
        <Typography font="mono" data-testid="mono-text">
          PMB-2026-00123
        </Typography>
        <Typography font="serif" data-testid="serif-text">
          Universitas Pignatelli Triputra
        </Typography>
      </div>,
    );
    expect(screen.getByTestId("mono-text")).toHaveClass("font-mono");
    expect(screen.getByTestId("serif-text")).toHaveClass("font-serif");
  });
});
