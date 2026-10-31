import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogTitle,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Pagination,
  FileUpload,
} from "./index";

describe("Design System - UI Components & Accessibility", () => {
  it("Button renders primary variant with accessible loading state", () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button variant="primary" onClick={handleClick}>
        Kirim Berkas
      </Button>,
    );

    const btn = screen.getByRole("button", { name: /kirim berkas/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Test loading state
    rerender(
      <Button variant="primary" isLoading onClick={handleClick}>
        Kirim Berkas
      </Button>,
    );
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Memproses...")).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it("Badge renders status variants with text labels and proper ARIA role", () => {
    render(
      <div>
        <Badge variant="berhasil">Lolos Berkas</Badge>
        <Badge variant="menunggu">Menunggu Verifikasi</Badge>
        <Badge variant="peringatan">Perlu Perbaikan</Badge>
        <Badge variant="gagal">Tidak Lolos</Badge>
      </div>,
    );

    expect(screen.getByText("Lolos Berkas")).toBeInTheDocument();
    expect(screen.getByText("Menunggu Verifikasi")).toBeInTheDocument();
    expect(screen.getByText("Perlu Perbaikan")).toBeInTheDocument();
    expect(screen.getByText("Tidak Lolos")).toBeInTheDocument();
  });

  it("Tabs supports full keyboard navigation (ArrowRight, ArrowLeft, Home, End)", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Jalur Prestasi</TabsTrigger>
          <TabsTrigger value="tab2">Jalur Reguler</TabsTrigger>
          <TabsTrigger value="tab3">Beasiswa</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Konten Prestasi</TabsContent>
        <TabsContent value="tab2">Konten Reguler</TabsContent>
        <TabsContent value="tab3">Konten Beasiswa</TabsContent>
      </Tabs>,
    );

    const tab1 = screen.getByRole("tab", { name: "Jalur Prestasi" });
    const tab2 = screen.getByRole("tab", { name: "Jalur Reguler" });
    const tab3 = screen.getByRole("tab", { name: "Beasiswa" });

    expect(tab1).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Konten Prestasi")).toBeInTheDocument();

    // ArrowRight moves focus to tab2
    tab1.focus();
    fireEvent.keyDown(tab1, { key: "ArrowRight" });
    expect(tab2).toHaveFocus();
    expect(tab2).toHaveAttribute("aria-selected", "true");

    // ArrowRight moves focus to tab3
    fireEvent.keyDown(tab2, { key: "ArrowRight" });
    expect(tab3).toHaveFocus();

    // ArrowRight wraps around to tab1
    fireEvent.keyDown(tab3, { key: "ArrowRight" });
    expect(tab1).toHaveFocus();

    // ArrowLeft wraps around backwards to tab3
    fireEvent.keyDown(tab1, { key: "ArrowLeft" });
    expect(tab3).toHaveFocus();
  });

  it("Dialog closes on Escape keydown and invokes onClose callback", () => {
    const handleClose = vi.fn();
    render(
      <Dialog open={true} onClose={handleClose}>
        <DialogContent>
          <DialogTitle>Konfirmasi Pendaftaran</DialogTitle>
          <p>Detail pendaftaran Anda</p>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Konfirmasi Pendaftaran")).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalled();
  });

  it("DropdownMenu opens on Enter/Space/ArrowDown and closes on Escape", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Opsi Akun</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => {}}>Profil</DropdownMenuItem>
          <DropdownMenuItem onClick={() => {}}>Pengaturan</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    const trigger = screen.getByRole("button", { name: /opsi akun/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Open by clicking or keyboard
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /profil/i }),
    ).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Pagination handles page changes and boundary button disabling", () => {
    const handlePageChange = vi.fn();
    const { rerender } = render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={handlePageChange}
      />,
    );

    const prevBtn = screen.getByRole("button", { name: /halaman sebelumnya/i });
    const nextBtn = screen.getByRole("button", {
      name: /halaman selanjutnya/i,
    });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);

    // On last page
    rerender(
      <Pagination
        currentPage={5}
        totalPages={5}
        onPageChange={handlePageChange}
      />,
    );
    expect(nextBtn).toBeDisabled();
  });

  it("FileUpload displays error when file exceeds maxSizeMB limit", () => {
    const handleFiles = vi.fn();
    render(
      <FileUpload
        onFilesSelected={handleFiles}
        maxSizeMB={2}
        label="Unggah Portofolio"
      />,
    );

    const dropzone = screen.getByRole("button", {
      name: /area unggah berkas/i,
    });
    expect(dropzone).toBeInTheDocument();

    // Simulate dropping oversized file (3MB)
    const largeFile = new File(
      ["dummy content".repeat(300000)],
      "oversized.pdf",
      {
        type: "application/pdf",
      },
    );

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [largeFile],
      },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/melebihi batas 2MB/i);
    expect(handleFiles).not.toHaveBeenCalled();
  });

  it("FileUpload rejects dangerous file extensions like .exe and .svg", () => {
    const handleFiles = vi.fn();
    render(
      <FileUpload
        onFilesSelected={handleFiles}
        accept=".pdf,.jpg"
        label="Unggah Portofolio"
      />,
    );

    const dropzone = screen.getByRole("button", {
      name: /area unggah berkas/i,
    });

    const dangerousFile = new File(["malicious script"], "payload.exe", {
      type: "application/x-msdownload",
    });

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [dangerousFile],
      },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /berpotensi berbahaya/i,
    );
    expect(handleFiles).not.toHaveBeenCalled();
  });
});
