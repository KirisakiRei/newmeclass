// @ts-nocheck
import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './button';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  className,
  showInfo = true,
  totalItems,
  pageSize,
}) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getVisiblePages();
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3 pt-4', className)}>
      {showInfo && totalItems != null && (
        <p className="text-gray-400 text-sm">
          Menampilkan {startItem}–{endItem} dari {totalItems}
        </p>
      )}
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-yellow-400/20 text-gray-400 hover:text-yellow-400 disabled:opacity-30"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="Halaman pertama"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-yellow-400/20 text-gray-400 hover:text-yellow-400 disabled:opacity-30"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        {pages[0] > 1 && (
          <span className="text-gray-500 px-1">...</span>
        )}
        
        {pages.map(page => (
          <Button
            key={page}
            variant={page === currentPage ? 'default' : 'outline'}
            size="icon"
            className={cn(
              'h-8 w-8',
              page === currentPage ?
                 'bg-yellow-400 text-[#1a1a1a] hover:bg-yellow-500' 
                : 'border-yellow-400/20 text-gray-400 hover:text-yellow-400'
            )}
            onClick={() => onPageChange(page)}
            aria-label={`Halaman ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </Button>
        ))}
        
        {pages[pages.length - 1] < totalPages && (
          <span className="text-gray-500 px-1">...</span>
        )}
        
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-yellow-400/20 text-gray-400 hover:text-yellow-400 disabled:opacity-30"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-yellow-400/20 text-gray-400 hover:text-yellow-400 disabled:opacity-30"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Halaman terakhir"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export const usePagination = (items, pageSize = 10) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  
  const totalPages = Math.ceil((items.length || 0) / pageSize);
  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize) || [];
  
  // Reset to page 1 if items change and current page is out of bounds
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    setCurrentPage,
    totalItems: items.length || 0,
    pageSize,
  };
};

export default Pagination;

