import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";

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
  storage: AsyncStorage,
  key: "habbito-rq-cache-v1",
  throttleTime: 2000,
});
