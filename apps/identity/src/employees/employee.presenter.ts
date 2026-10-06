import type { User } from "@wfh/contracts";
import { Employee } from "./employee.entity";

export const publicEmployee = (employee: Employee): User => ({
  id: employee.id,
  employeeCode: employee.employeeCode,
  fullName: employee.fullName,
  email: employee.email,
  department: employee.department,
  jobTitle: employee.jobTitle,
  role: employee.role,
  active: employee.active,
});
