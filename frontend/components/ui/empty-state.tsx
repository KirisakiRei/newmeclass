// @ts-nocheck
import React from 'react';
import { cn } from '../../lib/utils';
import { PackageOpen, Search, FileX, Users, Inbox } from 'lucide-react';

const icons = {
  default: Inbox,
  search: Search,
  file: FileX,
  users: Users,
  package: PackageOpen,
};

const EmptyState = ({ 
  icon = 'default', 
  title = 'Belum ada data', 
  description, 
  action,
  className 
}) => {
  const Icon = typeof icon === 'string' ? icons[icon] || icons.default : icon;

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-yellow-400/60" />
      </div>
      <h3 className="text-white font-medium mb-1">{title}</h3>
      {description && <p className="text-gray-400 text-sm max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;

