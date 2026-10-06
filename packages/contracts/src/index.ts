export interface User {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  department: string;
  jobTitle: string;
  role: "HR" | "EMPLOYEE";
  active: boolean;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  department: string;
  workDate: string;
  checkInAt: string;
  checkOutAt: string | null;
  checkInPhoto: string;
  checkOutPhoto: string | null;
  status: "Working" | "Completed" | "Incomplete";
}

export const SESSION_COOKIE = "wfh_session";

export const workDate = (date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const attendanceStatus = (
  date: string,
  checkOut: Date | string | null,
  today = workDate(),
): AttendanceRecord["status"] =>
  checkOut ? "Completed" : date < today ? "Incomplete" : "Working";

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateEmployeeInput {
  employeeCode: string;
  fullName: string;
  email: string;
  department: string;
  jobTitle: string;
  password: string;
}

export interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {
  status?: "active" | "inactive";
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  timestamp: string;
  fieldErrors?: Record<string, string[]>;
}

export type AttendanceAction = "check-in" | "check-out";
