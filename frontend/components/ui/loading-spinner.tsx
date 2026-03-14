// @ts-nocheck
import React from 'react';
import { cn } from '../../lib/utils';

// ── Base shimmer atom ─────────────────────────────────────────────────────────
export const Skeleton = ({ className, ...props }) => (
  <div
    className={cn('animate-pulse rounded-md bg-white/[0.07]', className)}
    {...props}
  />
);

// ── Table rows skeleton ───────────────────────────────────────────────────────
export const TableSkeleton = ({ rows = 6, cols = 5, className }) => (
  <div className={cn('w-full divide-y divide-white/[0.04]', className)}>
    <div
      className="grid gap-4 px-4 py-3"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-3/4" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, ri) => (
      <div
        key={ri}
        className="grid gap-4 px-4 py-3.5"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }).map((_, ci) => (
          <Skeleton
            key={ci}
            className={cn(
              'h-4',
              ci === 0 ? 'w-full' :
              ci % 3 === 1 ? 'w-4/5' :
              ci % 3 === 2 ? 'w-2/3' : 'w-1/2'
            )}
          />
        ))}
      </div>
    ))}
  </div>
);

// ── Card grid skeleton ────────────────────────────────────────────────────────
export const CardGridSkeleton = ({ cards = 6, cols = 3, className }) => (
  <div
    className={cn(
      'grid gap-4',
      cols >= 4 ? 'grid-cols-2 lg:grid-cols-4' :
      cols === 2 ? 'grid-cols-1 sm:grid-cols-2' :
      'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      className
    )}
  >
    {Array.from({ length: cards }).map((_, i) => (
      <div key={i} className="bg-[#2a2a2a] border border-white/[0.05] rounded-xl p-4 space-y-3">
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

// ── Stats cards + chart skeleton ──────────────────────────────────────────────
export const StatsSkeleton = ({ className }) => (
  <div className={cn('space-y-5', className)}>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[#2a2a2a] border border-white/[0.05] rounded-xl p-5 space-y-3">
          <div className="flex justify-between items-start">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-[#2a2a2a] border border-white/[0.05] rounded-xl p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

// ── Full-page dashboard skeleton (replaces full-page spinner) ─────────────────
const DashboardPageSkeleton = ({ className }) => (
  <div className={cn('min-h-[60vh] space-y-5 p-6', className)}>
    {/* Page header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-32 rounded-lg" />
    </div>

    {/* Summary strip */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-[#2a2a2a] border border-white/[0.05] rounded-xl px-4 py-3 flex justify-between items-center"
        >
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      ))}
    </div>

    {/* Filter bar */}
    <div className="flex gap-3">
      <Skeleton className="h-9 flex-1 max-w-xs rounded-lg" />
      <Skeleton className="h-9 w-24 rounded-lg" />
      <Skeleton className="h-9 w-24 rounded-lg" />
    </div>

    {/* Table card */}
    <div className="bg-[#2a2a2a] border border-white/[0.05] rounded-xl overflow-hidden">
      <TableSkeleton rows={8} cols={5} />
      <div className="flex justify-between items-center px-4 py-3 border-t border-white/[0.06]">
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-7 rounded" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ── LoadingSpinner: always renders DashboardPageSkeleton ─────────────────────
const LoadingSpinner = ({ className }) => (
  <DashboardPageSkeleton className={className} />
);

export const LoadingOverlay = ({ text }) => (
  <div className="min-h-[60vh]">
    <DashboardPageSkeleton />
  </div>
);

export const LoadingPage = ({ text = 'Memuat...' }) => (
  <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center">
    <LoadingSpinner size="lg" text={text} />
  </div>
);

export default LoadingSpinner;

