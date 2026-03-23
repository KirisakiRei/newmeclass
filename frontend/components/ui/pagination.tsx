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
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  compact = false,
}) => {
  const shouldRenderControls = totalPages > 1 || typeof onPageSizeChange === 'function';
  if (!shouldRenderControls) return null;

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

  if (compact) {
    return (
      <div className={cn('flex flex-col gap-3 pt-4 sm:flex-row sm:items-end sm:justify-between', className)}>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
          {showInfo && totalItems != null ? (
            <p>
              Menampilkan {startItem}–{endItem} dari {totalItems}
            </p>
          ) : null}
          {typeof onPageSizeChange === 'function' ? (
            <label className="flex items-center gap-2">
              <span>Tampilkan</span>
              <select
                value={pageSize}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
                className="rounded-md border border-yellow-400/20 bg-[#1a1a1a] px-2 py-1 text-white"
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span>data</span>
            </label>
          ) : null}
        </div>

        <div className="flex items-center gap-1 self-end">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 border-yellow-400/20 text-gray-400 hover:text-yellow-400 disabled:opacity-30"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="min-w-[48px] rounded-md border border-yellow-400/20 bg-[#1a1a1a] px-2 py-1 text-center text-xs font-semibold text-yellow-400">
            {currentPage}/{Math.max(totalPages, 1)}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 border-yellow-400/20 text-gray-400 hover:text-yellow-400 disabled:opacity-30"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3 pt-4 lg:flex-row lg:items-center lg:justify-between', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {showInfo && totalItems != null && (
          <p className="text-gray-400 text-sm">
            Menampilkan {startItem}–{endItem} dari {totalItems}
          </p>
        )}
        {typeof onPageSizeChange === 'function' ? (
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <span>Tampilkan</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-md border border-yellow-400/20 bg-[#1a1a1a] px-2 py-1 text-white"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span>data</span>
          </label>
        ) : null}
      </div>
      
      <div className="flex flex-wrap items-center gap-1">
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
