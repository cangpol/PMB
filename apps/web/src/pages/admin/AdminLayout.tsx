import React, { useState, useEffect, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AdminSidebar } from "../../components/admin/AdminSidebar";
import { AdminTopbar } from "../../components/admin/AdminTopbar";
import { CommandPalette } from "../../components/admin/CommandPalette";

export const AdminLayout: React.FC = () => {
  const location = useLocation();

  // 1. State Collapsed Rail untuk Desktop/Tablet
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("pmb_admin_sidebar_collapsed");
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore JSON error
    }
    // Default: jika layar tablet (768 - 1279px), mulai dengan rail collapsed
    if (typeof window !== "undefined") {
      return window.innerWidth < 1280;
    }
    return false;
  });

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(
          "pmb_admin_sidebar_collapsed",
          JSON.stringify(next),
        );
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  // 2. State Mobile Drawer untuk Layar <768px
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Otomatis tutup drawer mobile saat berpindah rute
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Kunci scroll body saat mobile drawer terbuka
  useEffect(() => {
    if (mobileDrawerOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [mobileDrawerOpen]);

  // Tutup drawer mobile dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileDrawerOpen]);

  // 3. State Command Palette (Ctrl+K / Cmd+K)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-biru-50/40 text-biru-950 flex antialiased">
      {/* ===================================================================== */}
      {/* 1. SIDEBAR DESKTOP / TABLET (STICKY 100DVH, SCROLL MANDIRI) */}
      {/* ===================================================================== */}
      <div className="hidden lg:block shrink-0">
        <AdminSidebar
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* ===================================================================== */}
      {/* 2. SIDEBAR MOBILE DRAWER DENGAN OVERLAY BACKDROP */}
      {/* ===================================================================== */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-biru-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative flex-1 flex flex-col max-w-[280px] w-full bg-putih shadow-soft-xl animate-in slide-in-from-left duration-250 z-10">
            <AdminSidebar
              collapsed={false}
              onToggleCollapse={() => setMobileDrawerOpen(false)}
              onNavigate={() => setMobileDrawerOpen(false)}
              className="w-full h-full border-r-0"
            />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. KONTEN UTAMA (TOPBAR STICKY + SCROLLABLE BODY MAX-W-1440PX) */}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AdminTopbar
          onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* ===================================================================== */}
      {/* 4. COMMAND PALETTE (CTRL+K / CMD+K) */}
      {/* ===================================================================== */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
};
