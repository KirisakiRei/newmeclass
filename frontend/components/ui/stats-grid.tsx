// @ts-nocheck
import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from './card';

const StatsGrid = ({ stats, className, columns }) => {
  const cols = columns || Math.min(stats.length, 4);
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={cn('grid gap-3 sm:gap-4', colsClass[cols] || 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4', className)}>
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card key={i} className="bg-[#2a2a2a] border-yellow-400/20 hover:border-yellow-400/40 transition-colors">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center gap-2 sm:gap-3">
                {Icon && (
                  <div className={cn('w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0', stat.iconBg || 'bg-yellow-400/10')}>
                    <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', stat.iconColor || 'text-yellow-400')} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn('text-base sm:text-xl md:text-2xl lg:text-xl font-bold leading-tight break-words', stat.valueColor || 'text-white')}>
                    {stat.value}
                  </p>
                  <p className="text-gray-400 text-xs leading-snug mt-0.5">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsGrid;

