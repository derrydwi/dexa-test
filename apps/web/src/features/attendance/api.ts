import { api } from "@/lib/http";
import type { AttendanceAction, AttendanceRecord, Page } from "@wfh/contracts";

export interface AttendanceFilters {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  status?: string;
  employeeId?: string;
}

export const attendanceApi = {
  list: (filters: AttendanceFilters, signal?: AbortSignal) =>
    api<Page<AttendanceRecord>>(
      `/api/attendance?${new URLSearchParams(
        Object.entries(filters)
          .filter(([, value]) => value !== undefined && value !== "")
          .map(([key, value]) => [key, String(value)]),
      )}`,
      { signal },
    ),
  submit: (action: AttendanceAction, photo: File) => {
    const body = new FormData();
    body.append("photo", photo);

    return api<AttendanceRecord>(`/api/attendance/${action}`, {
      method: "POST",
      body,
    });
  },
};
