import { api } from "@/lib/http";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  User,
  Page,
} from "@wfh/contracts";

export interface EmployeeFilters {
  q?: string;
  status?: "active" | "inactive" | "all";
  page?: number;
  pageSize?: number;
}

export const employeesApi = {
  list: (query: EmployeeFilters, signal?: AbortSignal) =>
    api<Page<User>>(
      `/api/employees?${new URLSearchParams(
        Object.entries(query)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)]),
      )}`,
      { signal },
    ),
  create: (input: CreateEmployeeInput) =>
    api<User>("/api/employees", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateEmployeeInput) =>
    api<User>(`/api/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deactivate: (id: string) =>
    api<User>(`/api/employees/${id}`, { method: "DELETE" }),
};
