import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

export interface PaginationProps extends React.ComponentPropsWithoutRef<"nav"> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPrevNext?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showPrevNext = true,
  className = "",
  ...props
}) => {
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <nav
      role="navigation"
      aria-label="Navigasi halaman pagination"
      className={`flex items-center justify-center gap-1.5 ${className}`}
      {...props}
    >
      {showPrevNext && (
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Halaman sebelumnya"
          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-biru-200 bg-putih px-3 text-sm font-medium text-biru-900 shadow-soft-sm transition-colors hover:bg-biru-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Sebelumnya</span>
        </button>
      )}

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, idx) => {
          if (page === "ellipsis") {
            return (
              <span
                key={`ellipsis-${idx}`}
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center text-biru-600"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            );
          }

          const isCurrent = page === currentPage;

          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              aria-current={isCurrent ? "page" : undefined}
              aria-label={`Halaman ${page}`}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500 ${
                isCurrent
                  ? "bg-biru-900 text-putih shadow-soft-sm"
                  : "border border-biru-200 bg-putih text-biru-900 hover:bg-biru-50"
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>

      {showPrevNext && (
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Halaman selanjutnya"
          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-biru-200 bg-putih px-3 text-sm font-medium text-biru-900 shadow-soft-sm transition-colors hover:bg-biru-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500"
        >
          <span className="hidden sm:inline">Selanjutnya</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </nav>
  );
};
