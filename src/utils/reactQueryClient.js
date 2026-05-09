import { QueryClient } from '@tanstack/react-query';

// ✅ Export a single shared QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});
