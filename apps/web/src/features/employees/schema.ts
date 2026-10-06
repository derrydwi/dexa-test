import { z } from "zod";

const fields = {
  fullName: z.string().trim().min(2, "Use at least 2 characters.").max(100),
  employeeCode: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens or underscores.")
    .toUpperCase(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(254)
    .email("Enter a valid email address."),
  department: z.string().trim().min(1, "Enter a department.").max(80),
  jobTitle: z.string().trim().min(1, "Enter a job title.").max(80),
};
const password = z.string().min(10, "Use at least 10 characters.").max(128);

export const createEmployeeSchema = z.object({ ...fields, password });

export const editEmployeeSchema = z.object({
  ...fields,
  password: z.union([z.literal(""), password]),
});

export type EmployeeValues = z.infer<typeof createEmployeeSchema>;
