import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AttendanceAction } from "@wfh/contracts";
import { attendanceApi, type AttendanceFilters } from "./api";

export const attendanceKeys = {
  all: (userId: string) => ["attendance", userId] as const,
};

export function useAttendance(userId: string, filters: AttendanceFilters) {
  return useQuery({
    queryKey: [...attendanceKeys.all(userId), filters],
    queryFn: ({ signal }) => attendanceApi.list(filters, signal),
  });
}

export function useAttendanceSubmit(userId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      action,
      photo,
    }: {
      action: AttendanceAction;
      photo: File;
    }) => attendanceApi.submit(action, photo),
    onSettled: () =>
      client.invalidateQueries({ queryKey: attendanceKeys.all(userId) }),
  });
}
