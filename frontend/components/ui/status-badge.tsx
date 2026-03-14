// @ts-nocheck
import React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle, Clock, XCircle, AlertTriangle, Ban, RefreshCw, Star } from 'lucide-react';

const statusConfig = {
  success: { icon: CheckCircle, bg: 'bg-green-400/20', text: 'text-green-400' },
  pending: { icon: Clock, bg: 'bg-yellow-400/20', text: 'text-yellow-400' },
  error: { icon: XCircle, bg: 'bg-red-400/20', text: 'text-red-400' },
  warning: { icon: AlertTriangle, bg: 'bg-orange-400/20', text: 'text-orange-400' },
  inactive: { icon: Ban, bg: 'bg-gray-400/20', text: 'text-gray-400' },
  processing: { icon: RefreshCw, bg: 'bg-blue-400/20', text: 'text-blue-400' },
  premium: { icon: Star, bg: 'bg-purple-400/20', text: 'text-purple-400' },
};

const StatusBadge = ({ status, label, className, showIcon = true, size = 'sm' }) => {
  const config = statusConfig[status] || statusConfig.inactive;
  const Icon = config.icon;
  
  const sizes = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded font-medium',
      config.bg, config.text, sizes[size],
      className
    )}>
      {showIcon && <Icon className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />}
      {label}
    </span>
  );
};

// Helper to map common status strings to our config
export function getStatusType(status) {
  const map = {
    'active': 'success', 'approved': 'success', 'completed': 'success', 'verified': 'success', 'paid': 'success',
    'pending': 'pending', 'waiting': 'pending',
    'rejected': 'error', 'failed': 'error', 'expired': 'error',
    'inactive': 'inactive', 'disabled': 'inactive',
    'processing': 'processing',
    'premium': 'premium',
  };
  return map[status.toLowerCase()] || 'inactive';
}

export function getStatusLabel(status) {
  const map = {
    'active': 'Aktif', 'approved': 'Disetujui', 'completed': 'Selesai', 'verified': 'Terverifikasi', 'paid': 'Dibayar',
    'pending': 'Menunggu', 'waiting': 'Menunggu',
    'rejected': 'Ditolak', 'failed': 'Gagal', 'expired': 'Kadaluarsa',
    'inactive': 'Nonaktif', 'disabled': 'Dinonaktifkan',
    'processing': 'Diproses',
    'premium': 'Premium',
  };
  return map[status.toLowerCase()] || status;
}

export default StatusBadge;

