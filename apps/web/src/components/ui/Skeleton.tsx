import React from "react";

export interface SkeletonProps {
  className?: string;
  count?: number;
}

/**
 * Komponen Skeleton Efek Pulse Lembut PMB UPT
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = "h-4 w-full",
  count = 1,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-biru-100/70 rounded-lg ${className}`}
        />
      ))}
    </>
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  return (
    <div
      className={`bg-putih border border-biru-200 rounded-2xl p-6 shadow-soft-sm space-y-4 ${className}`}
    >
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="pt-2 flex gap-3">
        <Skeleton className="h-9 w-24 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => {
  return (
    <div className="w-full space-y-3 p-4 bg-putih border border-biru-200 rounded-xl">
      <div className="flex gap-4 border-b border-biru-200 pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2 border-b border-biru-100">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const AvatarSkeleton: React.FC<{ size?: "sm" | "md" | "lg" }> = ({
  size = "md",
}) => {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };
  return <Skeleton className={`${sizeMap[size]} rounded-full`} />;
};
