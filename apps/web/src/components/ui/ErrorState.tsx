import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Terjadi Kesalahan",
  message,
  onRetry,
  retryLabel = "Coba Lagi",
  className = "",
  children,
}) => {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center rounded-2xl border border-biru-300 bg-biru-50 p-8 text-center sm:p-12 ${className}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-biru-200 bg-putih text-biru-900 shadow-soft-sm">
        <AlertCircle className="h-8 w-8" aria-hidden="true" />
      </div>

      <h3 className="mt-4 font-serif text-lg font-semibold text-biru-950 sm:text-xl">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm text-biru-800 sm:text-base">
        {message}
      </p>

      {onRetry && (
        <div className="mt-6">
          <Button
            variant="outline"
            onClick={onRetry}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            {retryLabel}
          </Button>
        </div>
      )}

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
};
