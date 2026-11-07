import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Komponen Logo PMB Universitas Pignatelli Triputra", () => {
  it("menampilkan lambang logo dengan teks PMB dan nama universitas di sampingnya", () => {
    render(<Logo height={44} />);
    const img = screen.getByRole("img", {
      name: /Logo Universitas Pignatelli Triputra/i,
    });
    expect(img).toHaveAttribute("width", "44");
    expect(img).toHaveAttribute("height", "44");
    expect(screen.getByText("PMB")).toBeInTheDocument();
    expect(
      screen.getByText("Universitas Pignatelli Triputra"),
    ).toBeInTheDocument();
  });

  it("showText=false hanya menampilkan lambang", () => {
    render(<Logo showText={false} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.queryByText("PMB")).not.toBeInTheDocument();
  });

  it("beralih ke monogram UP saat gambar gagal dimuat, teks tetap ada", () => {
    render(<Logo height={44} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText("UP")).toBeInTheDocument();
    expect(screen.getByText("PMB")).toBeInTheDocument();
  });

  it("mode gelap memakai teks putih dan alas putih di balik lambang", () => {
    const { container } = render(<Logo theme="dark" />);
    expect(screen.getByText("PMB")).toHaveClass("text-putih");
    expect(container.querySelector("span.bg-putih")).not.toBeNull();
  });
});
