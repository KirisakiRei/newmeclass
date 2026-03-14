// @ts-nocheck
import React from 'react';
import { cn } from '../../lib/utils';

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-white/10', className)}
      {...props}
    />
  );
};

export const SkeletonCard = () => (
  <div className="bg-[#2a2a2a] border border-yellow-400/10 rounded-xl p-6 space-y-4">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-3 w-2/3" />
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="space-y-3">
    <div className="flex gap-4 pb-3 border-b border-yellow-400/10">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 py-2">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-3 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonStats = ({ count = 4 }) => (
  <div className={cn('grid gap-4', `grid-cols-2 md:grid-cols-${Math.min(count, 4)}`)}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-[#2a2a2a] border border-yellow-400/10 rounded-xl p-4 text-center space-y-2">
        <Skeleton className="h-8 w-16 mx-auto" />
        <Skeleton className="h-3 w-20 mx-auto" />
      </div>
    ))}
  </div>
);

export default Skeleton;

