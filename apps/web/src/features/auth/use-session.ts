import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError, errorMessage } from "@/lib/http";
import { changeSession, queryClient, sessionKey } from "@/lib/query-client";
import { useEffect } from "react";
import { authApi } from "./api";

export function useSession() {
  const session = useQuery({
    queryKey: sessionKey,
    enabled: queryClient.getQueryData(sessionKey) !== null,
    queryFn: async ({ signal }) => {
      try {
        return await authApi.me(signal);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => changeSession(null),
  });

  useEffect(() => {
    const expired = () => changeSession(null);
    window.addEventListener("session-expired", expired);

    return () => window.removeEventListener("session-expired", expired);
  }, []);

  return {
    user: session.data ?? null,
    setUser: changeSession,
    loading: session.isPending && session.fetchStatus !== "idle",
    error: session.error
      ? errorMessage(session.error)
      : logout.error
        ? errorMessage(logout.error)
        : "",
    logoutBusy: logout.isPending,
    loadSession: session.refetch,
    logout: async () => {
      try {
        await logout.mutateAsync();
      } catch {
        /* Render the mutation error. */
      }
    },
  };
}
