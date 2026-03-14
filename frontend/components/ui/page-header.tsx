// @ts-nocheck
import React from 'react';
import { cn } from '../../lib/utils';

const PageHeader = ({ icon: Icon, title, description, className, children }) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}>
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-7 h-7 text-yellow-400 shrink-0" />}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
          {description && <p className="text-gray-400 text-sm mt-0.5">{description}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
};

export default PageHeader;

