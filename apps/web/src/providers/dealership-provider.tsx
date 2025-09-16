// contexts/DealershipContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface DealershipContextType {
  dealershipId: string;
  isLoading: boolean;
  error: string | null;
  role: string;
}

const DealershipContext = createContext<DealershipContextType>({
  dealershipId: "",
  isLoading: true,
  error: null,
  role: "",
});

export const useDealership = () => useContext(DealershipContext);

interface DealershipProviderProps {
  children: ReactNode;
}

export function DealershipProvider({ children }: DealershipProviderProps) {
  const { user, loading, error } = useCurrentUser();

  return (
    <DealershipContext.Provider
      value={{
        dealershipId: user?.dealershipId ?? "No dealership ID",
        isLoading: loading,
        error,
        role: user?.role ?? "No role",
      }}
    >
      {children}
    </DealershipContext.Provider>
  );
}