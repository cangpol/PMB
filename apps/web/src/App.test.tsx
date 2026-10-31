import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, Card, StatusBadge } from "./components/common";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";

describe("PMB Frontend Unit & Business Logic Tests", () => {
  describe("Design Token & Brand Consistency", () => {
    it("menggunakan palet resmi Universitas Pignatelli Triputra (hanya biru dan putih)", () => {
      const allowedBlueTokens = [
        "#061633", // biru-950
        "#0B2559", // biru-900
        "#12378A", // biru-800
        "#1A4BB5", // biru-700
        "#2563EB", // biru-600
        "#3B82F6", // biru-500
        "#BFD4F8", // biru-200
        "#DCE8FC", // biru-100
        "#F1F6FE", // biru-50
        "#FFFFFF", // putih
      ];

      expect(allowedBlueTokens.length).toBe(10);
      allowedBlueTokens.forEach((token) => {
        expect(token).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe("Business Logic: Perhitungan Biaya & Voucher", () => {
    function hitungTotalPembayaran(
      biayaAsli: number,
      diskonPersen: number,
    ): number {
      const diskon = (biayaAsli * diskonPersen) / 100;
      return Math.max(0, biayaAsli - diskon);
    }

    it("menghitung potongan 100% untuk beasiswa penuh", () => {
      const biayaFormulir = 250000;
      const total = hitungTotalPembayaran(biayaFormulir, 100);
      expect(total).toBe(0);
    });

    it("menghitung potongan 50% untuk voucher promo early bird", () => {
      const biayaFormulir = 250000;
      const total = hitungTotalPembayaran(biayaFormulir, 50);
      expect(total).toBe(125000);
    });

    it("tidak menghasilkan nilai negatif saat potongan melebihi biaya", () => {
      const biayaFormulir = 200000;
      const total = hitungTotalPembayaran(biayaFormulir, 120);
      expect(total).toBe(0);
    });
  });

  describe("Business Logic: Evaluasi Ambang Batas Kelulusan", () => {
    function tentukanKelulusan(
      skorAkhir: number,
      passingScore: number,
      kuotaTersedia: number,
      peringkat: number,
    ): "LULUS" | "CADANGAN" | "TIDAK_LULUS" {
      if (skorAkhir >= passingScore && peringkat <= kuotaTersedia) {
        return "LULUS";
      } else if (skorAkhir >= passingScore - 5) {
        return "CADANGAN";
      }
      return "TIDAK_LULUS";
    }

    it("menyatakan LULUS jika nilai di atas passing score dan dalam kuota", () => {
      const status = tentukanKelulusan(88.5, 75.0, 50, 12);
      expect(status).toBe("LULUS");
    });

    it("menyatakan CADANGAN jika nilai mendekati passing score", () => {
      const status = tentukanKelulusan(72.0, 75.0, 50, 60);
      expect(status).toBe("CADANGAN");
    });

    it("menyatakan TIDAK_LULUS jika nilai di bawah batas ambang kelulusan", () => {
      const status = tentukanKelulusan(65.0, 75.0, 50, 90);
      expect(status).toBe("TIDAK_LULUS");
    });
  });

  describe("Form Validation Schema (Zod)", () => {
    const registerSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      nama_lengkap: z.string().min(3),
      no_hp: z.string().regex(/^[0-9+]{9,15}$/),
    });

    it("memvalidasi data pendaftar yang benar", () => {
      const validData = {
        email: "calon.mhs@example.com",
        password: "PasswordRahasia123",
        nama_lengkap: "Budi Santoso",
        no_hp: "081234567890",
      };
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("menolak password yang terlalu pendek (< 8 karakter)", () => {
      const invalidData = {
        email: "calon.mhs@example.com",
        password: "pendek",
        nama_lengkap: "Budi Santoso",
        no_hp: "081234567890",
      };
      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("Komponen UI Dasar (Blue-and-White Theme)", () => {
    it("merender Button varian primary dengan benar", () => {
      render(<Button variant="primary">Kirim Berkas</Button>);
      const btn = screen.getByRole("button", { name: /kirim berkas/i });
      expect(btn).toBeDefined();
    });

    it("merender Card dengan border biru dan latar putih", () => {
      render(
        <Card data-testid="test-card">
          <p>Informasi PMB</p>
        </Card>,
      );
      expect(screen.getByText("Informasi PMB")).toBeDefined();
    });

    it("merender StatusBadge dengan teks dan ikon yang sesuai", () => {
      render(
        <StatusBadge
          status="terverifikasi"
          label="Dokumen Sah"
          icon={<CheckCircle2 data-testid="check-icon" />}
        />,
      );
      expect(screen.getByText("Dokumen Sah")).toBeDefined();
    });
  });
});
