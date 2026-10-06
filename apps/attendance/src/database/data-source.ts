import "reflect-metadata";
import { DataSource } from "typeorm";
import { Attendance } from "../attendance/attendance.entity";
import { attendanceConfig } from "../config/configuration";
import { AttendanceSchema1790899200000 } from "./migrations/1790899200000-attendance-schema";

export const databaseOptions = {
  type: "mysql" as const,
  url: attendanceConfig.databaseUrl,
  timezone: "Z",
  charset: "utf8mb4",
  entities: [Attendance],
  migrations: [AttendanceSchema1790899200000],
  synchronize: false,
};

export const database = new DataSource(databaseOptions);
