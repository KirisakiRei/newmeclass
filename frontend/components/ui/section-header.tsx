// @ts-nocheck
import React from 'react';
import { cn } from '../../lib/utils';

const SectionHeader = ({ 
  title, 
  subtitle, 
  badge,
  align = 'center', 
  className,
  children 
}) => {
  const alignClass = {
    center: 'text-center',
    left: 'text-left',
    right: 'text-right',
  };

  return (
    <div className={cn('mb-8 sm:mb-12', alignClass[align], className)}>
      {badge && (
        <span className="inline-block px-4 py-1.5 bg-[#D4A017]/10 text-[#D4A017] text-xs sm:text-sm font-semibold rounded-full mb-3 sm:mb-4 tracking-wide uppercase">
          {badge}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className={cn(
          'text-gray-400 text-sm sm:text-base max-w-2xl',
          align === 'center' && 'mx-auto'
        )}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
};

export default SectionHeader;

