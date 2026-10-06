import { AttendanceRecord, attendanceStatus, workDate } from "@wfh/contracts";
import { Attendance } from "./attendance.entity";

export const presentAttendance = (
  row: Attendance,
  today = workDate(),
): AttendanceRecord => ({
  id: row.id,
  employeeId: row.employeeId,
  employeeCode: row.employeeCode,
  fullName: row.fullName,
  department: row.department,
  workDate: row.workDate,
  checkInAt: row.checkInAt.toISOString(),
  checkOutAt: row.checkOutAt?.toISOString() || null,
  checkInPhoto: `/api/attendance/${row.id}/photos/check-in`,
  checkOutPhoto: row.checkOutPhoto
    ? `/api/attendance/${row.id}/photos/check-out`
    : null,
  status: attendanceStatus(row.workDate, row.checkOutAt, today),
});
