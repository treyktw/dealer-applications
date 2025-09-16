// File: app/inventory/components/PaginationControl.tsx
import { useCallback } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationControl({
  currentPage,
  totalPages,
  onPageChange
}: PaginationControlProps) {
  // Handle page change with bounds checking
  const changePage = useCallback((page: number) => {
    // Ensure page is within valid range
    const validPage = Math.max(1, Math.min(page, totalPages));
    if (validPage !== currentPage) {
      onPageChange(validPage);
    }
  }, [currentPage, totalPages, onPageChange]);

  // Don't render pagination if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    
    // Always show first page
    pages.push(1);
    
    // Calculate range around current page
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);
    
    // Add ellipsis after first page if needed
    if (startPage > 2) {
      pages.push("ellipsis-start");
    }
    
    // Add pages around current page
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      pages.push("ellipsis-end");
    }
    
    // Always show last page if we have more than one page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <Pagination>
      <PaginationContent>
        {/* Previous button */}
        <PaginationItem>
          <PaginationPrevious 
            onClick={(e) => {
              e.preventDefault();
              changePage(currentPage - 1);
            }}
            className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>

        {/* Page numbers */}
        {getPageNumbers().map((page, index) => {
          if (page === "ellipsis-start" || page === "ellipsis-end") {
            return (
              <PaginationItem key={`${page}-${index}`}>
                <span className="px-4">...</span>
              </PaginationItem>
            );
          }

          return (
            <PaginationItem key={`page-${page}`}>
              <PaginationLink
                onClick={(e) => {
                  e.preventDefault();
                  changePage(page as number);
                }}
                isActive={page === currentPage}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        {/* Next button */}
        <PaginationItem>
          <PaginationNext 
            onClick={(e) => {
              e.preventDefault();
              changePage(currentPage + 1);
            }}
            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}