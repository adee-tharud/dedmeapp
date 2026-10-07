/**
 * QueryClient singleton — centralised here so it isn't re-created every
 * time the root layout re-renders, and so it can be imported anywhere
 * (e.g. in mutation callbacks outside of React components).
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale threshold: 60 s is a sensible default for this app's data.
      staleTime: 60 * 1000,
      // Retry once on failure (network blip); don't hammer Supabase.
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
