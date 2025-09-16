'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create a client
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}