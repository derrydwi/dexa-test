import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User, UpdateEmployeeInput } from "@wfh/contracts";
import { employeesApi, type EmployeeFilters } from "./api";

export const employeeKeys = {
  all: (userId: string) => ["employees", userId] as const,
};

export function useEmployees(
  userId: string,
  filters: EmployeeFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: [...employeeKeys.all(userId), filters],
    queryFn: ({ signal }) => employeesApi.list(filters, signal),
    enabled,
  });
}

export function useEmployeeChange(userId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      employee,
      input,
    }: {
      employee: User;
      input?: UpdateEmployeeInput;
    }) =>
      input
        ? employeesApi.update(employee.id, input)
        : employeesApi.deactivate(employee.id),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: employeeKeys.all(userId) }),
  });
}
