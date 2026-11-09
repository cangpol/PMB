import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { GELOMBANG_CONTENT } from "../../content/beranda";

// Helper component untuk menguji logika countdown murni
interface TestCountdownProps {
  tglSelesai: string | null;
  isActive: boolean;
}

const TestCountdownComponent: React.FC<TestCountdownProps> = ({
  tglSelesai,
  isActive,
}) => {
  const [isClosed, setIsClosed] = React.useState<boolean>(false);
  const [time, setTime] = React.useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  React.useEffect(() => {
    if (!isActive || !tglSelesai) {
      setIsClosed(true);
      return;
    }

    const target = new Date(tglSelesai).getTime();
    const diff = target - Date.now();

    if (diff <= 0) {
      setIsClosed(true);
    } else {
      setIsClosed(false);
      setTime({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }
  }, [tglSelesai, isActive]);

  if (isClosed) {
    return (
      <div>
        <span data-testid="closed-badge">
          {GELOMBANG_CONTENT.stateDitutup.badge}
        </span>
        <h3>{GELOMBANG_CONTENT.stateDitutup.judul}</h3>
        <p>{GELOMBANG_CONTENT.stateDitutup.jadwalBerikutnya}</p>
        <button>{GELOMBANG_CONTENT.stateDitutup.cta}</button>
      </div>
    );
  }

  return (
    <div>
      <span data-testid="days">{String(time.days).padStart(2, "0")}</span>
      <span data-testid="hours">{String(time.hours).padStart(2, "0")}</span>
      <span data-testid="minutes">{String(time.minutes).padStart(2, "0")}</span>
      <span data-testid="seconds">{String(time.seconds).padStart(2, "0")}</span>
      <button>{GELOMBANG_CONTENT.ctaAktif}</button>
    </div>
  );
};

describe("Logika Hitung Mundur & State Gelombang PMB", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("menghitung mundur dengan benar saat gelombang masih aktif di masa depan", () => {
    // Set waktu sekarang ke 1 Januari 2026
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    // Gelombang berakhir 10 hari lagi
    const targetDate = "2026-01-11T00:00:00Z";

    render(
      <MemoryRouter>
        <TestCountdownComponent tglSelesai={targetDate} isActive={true} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("days").textContent).toBe("10");
    expect(screen.getByText(GELOMBANG_CONTENT.ctaAktif)).toBeInTheDocument();
    expect(screen.queryByTestId("closed-badge")).not.toBeInTheDocument();
  });

  it("menampilkan state ditutup (bukan 00:00:00:00) saat batas akhir gelombang telah terlewati", () => {
    // Set waktu sekarang ke 15 Agustus 2026
    vi.setSystemTime(new Date("2026-08-15T00:00:00Z"));

    // Gelombang telah berakhir pada 31 Juli 2026
    const expiredDate = "2026-07-31T23:59:59Z";

    render(
      <MemoryRouter>
        <TestCountdownComponent tglSelesai={expiredDate} isActive={true} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("closed-badge").textContent).toBe(
      GELOMBANG_CONTENT.stateDitutup.badge,
    );
    expect(
      screen.getByText(GELOMBANG_CONTENT.stateDitutup.judul),
    ).toBeInTheDocument();
    expect(
      screen.getByText(GELOMBANG_CONTENT.stateDitutup.cta),
    ).toBeInTheDocument();

    // Pastikan kotak angka timer tidak ditampilkan sama sekali
    expect(screen.queryByTestId("days")).not.toBeInTheDocument();
  });

  it("menampilkan state ditutup saat tidak ada gelombang aktif (null/is_active false)", () => {
    render(
      <MemoryRouter>
        <TestCountdownComponent tglSelesai={null} isActive={false} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("closed-badge").textContent).toBe(
      GELOMBANG_CONTENT.stateDitutup.badge,
    );
    expect(
      screen.getByText(GELOMBANG_CONTENT.stateDitutup.cta),
    ).toBeInTheDocument();
  });
});
