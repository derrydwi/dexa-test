import { QueryClient } from "@tanstack/react-query";
import type { User } from "@wfh/contracts";
import { ApiError } from "./http";
import { advanceSession } from "./session-boundary";

export const sessionKey = ["session"] as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      retry: (count, error) =>
        count < 1 &&
        error instanceof ApiError &&
        (error.status === 0 || error.status >= 500),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
});

export function changeSession(user: User | null) {
  advanceSession();
  void queryClient.cancelQueries();
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== "session",
  });
  queryClient.getMutationCache().clear();
  queryClient.setQueryData(sessionKey, user);
}
