import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Komponen Logo Universitas Pignatelli Triputra", () => {
  it("merender gambar logo resmi dengan alt text dan dimensi eksplisit", () => {
    render(<Logo width={220} height={44} />);
    const img = screen.getByRole("img", {
      name: /Logo Universitas Pignatelli Triputra/i,
    });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("width", "220");
    expect(img).toHaveAttribute("height", "44");
  });

  it("beralih ke fallback monogram & teks nama universitas saat pemuatan gambar gagal", () => {
    render(<Logo width={220} height={44} />);
    const img = screen.getByRole("img", {
      name: /Logo Universitas Pignatelli Triputra/i,
    });

    // Simulasi gambar error pemuatan
    fireEvent.error(img);

    // Pastikan fallback monogram UP dan teks universitas dirender
    expect(screen.getByText("UP")).toBeInTheDocument();
    expect(screen.getByText("UNIVERSITAS PIGNATELLI")).toBeInTheDocument();
    expect(screen.getByText("TRIPUTRA")).toBeInTheDocument();
  });

  it("mendukung mode gelap dengan styling kontras yang sesuai", () => {
    render(<Logo theme="dark" />);
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.getByText("UNIVERSITAS PIGNATELLI")).toHaveClass("text-putih");
  });
});
