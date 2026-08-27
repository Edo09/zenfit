import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { RQ_CACHE_KEY, persistStorage } from "@/src/lib/storage-keys";

export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

// Module scope (not component state) so the outbox and signOut cleanup can
// reach the same client/persister without hooks.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // Must outlive PERSIST_MAX_AGE or restored queries are GC'd on hydration.
      gcTime: 1000 * 60 * 60 * 24 * 35,
    },
    mutations: {
      // Mutations only write the local cache + outbox; the default "online"
      // mode would pause them while offline — exactly when they must run.
      networkMode: "always",
      retry: 0,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: persistStorage,
  key: RQ_CACHE_KEY,
  throttleTime: 2000,
});
