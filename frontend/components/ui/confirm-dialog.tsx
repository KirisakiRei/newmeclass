// @ts-nocheck
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { AlertTriangle, Trash2, CheckCircle } from 'lucide-react';

const ConfirmDialog = ({
  open,
  onOpenChange,
  title = 'Konfirmasi',
  description = 'Apakah Anda yakin',
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'default', // 'default' | 'danger'
  loading = false,
  onConfirm,
  onCancel,
  children,
}) => {
  const icons = {
    default: <CheckCircle className="w-6 h-6 text-yellow-400" />,
    danger: <AlertTriangle className="w-6 h-6 text-red-400" />,
  };

  const handleCancel = () => {
    onCancel.();
    onOpenChange.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#2a2a2a] border-yellow-400/20 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {icons[variant]}
            <DialogTitle className="text-white">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-gray-400 mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        {children && <div className="py-2">{children}</div>}
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={variant === 'danger' ?
               'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-yellow-400 hover:bg-yellow-500 text-[#1a1a1a]'
            }
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Memproses...
              </span>
            ) : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;

