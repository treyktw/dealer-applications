import { useState, useMemo, useEffect } from 'react';
import { useDebounced } from '@/hooks/useDebounce';
import { useUrlState } from '@/hooks/useUrlState';

interface PaginatedSearchParams {
  defaultSearch?: string;
  defaultPage?: number;
  defaultLimit?: number;
  defaultFilters?: Record<string, string | number | null>;
  searchDelay?: number;
}

interface PaginatedSearchReturn {
  // Search
  searchTerm: string;
  debouncedSearch: string;
  setSearchTerm: (term: string) => void;
  isSearching: boolean;
  
  // Pagination
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  
  // Filters
  filters: Record<string, string | number | null>;
  setFilter: (key: string, value: string | number | null) => void;
  clearFilter: (key: string) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
  
  // URL Management
  updateUrl: () => void;
  resetToDefaults: () => void;
}

export function usePaginatedSearch({
  defaultSearch = '',
  defaultPage = 1,
  defaultLimit = 25,
  defaultFilters = {},
  searchDelay = 500
}: PaginatedSearchParams = {}): PaginatedSearchReturn {
  
  // URL state management
  const [searchTerm, setSearchTermUrl] = useUrlState('search', defaultSearch);
  const [page, setPageUrl] = useUrlState('page', defaultPage, String, Number);
  const [limit, setLimitUrl] = useUrlState('limit', defaultLimit, String, Number);
  
  // Individual filter management - we need to handle this differently since hooks can't be called in callbacks
  // For now, we'll use a simpler approach with individual state management
  const [filters, setFilters] = useState<Record<string, string | number | null>>(defaultFilters);
  
  // Local search state for immediate UI feedback
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debouncedSearch = useDebounced(localSearchTerm, searchDelay);
  
  // Update URL when debounced search changes
  const setSearchTerm = (term: string) => {
    setLocalSearchTerm(term);
    // Reset page when searching
    if (term !== searchTerm) {
      setPageUrl(1);
    }
  };
  
  // Update URL search when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== searchTerm) {
      setSearchTermUrl(debouncedSearch);
    }
  }, [debouncedSearch, searchTerm, setSearchTermUrl]);
  
  // Calculate derived state
  const isSearching = localSearchTerm !== debouncedSearch;
  
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      const defaultValue = defaultFilters[key];
      return value !== defaultValue && value !== '' && value !== null && value !== undefined;
    }) || debouncedSearch !== defaultSearch;
  }, [filters, defaultFilters, debouncedSearch, defaultSearch]);
  
  // Filter management functions
  const setFilter = (key: string, value: string | number | null) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    // Reset page when filtering
    setPageUrl(1);
  };
  
  const clearFilter = (key: string) => {
    const defaultValue = defaultFilters[key];
    setFilter(key, defaultValue);
  };
  
  const clearAllFilters = () => {
    setLocalSearchTerm(defaultSearch);
    setSearchTermUrl(defaultSearch);
    setPageUrl(defaultPage);
    setLimitUrl(defaultLimit);
    setFilters(defaultFilters);
  };
  
  const resetToDefaults = () => {
    clearAllFilters();
  };
  
  const updateUrl = () => {
    // This is handled automatically by the URL state hooks
  };
  
  return {
    // Search
    searchTerm: localSearchTerm,
    debouncedSearch,
    setSearchTerm,
    isSearching,
    
    // Pagination  
    page,
    setPage: setPageUrl,
    limit,
    setLimit: setLimitUrl,
    
    // Filters
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
    
    // URL Management
    updateUrl,
    resetToDefaults
  };
}