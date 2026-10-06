import { api } from "@/lib/http";
import type { LoginInput, User } from "@wfh/contracts";

export const authApi = {
  me: (signal?: AbortSignal) => api<User>("/api/auth/me", { signal }),
  login: (input: LoginInput) =>
    api<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  logout: () =>
    api<{ message: string }>("/api/auth/logout", { method: "POST" }),
};
