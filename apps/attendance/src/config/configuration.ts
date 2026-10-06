import { port, url, workspaceRoot } from "@wfh/common";
import { resolve } from "node:path";

export const attendanceConfig = {
  port: port("ATTENDANCE_PORT", 3002),
  databaseUrl: url(
    "ATTENDANCE_DATABASE_URL",
    "mysql://attendance:attendance_local@127.0.0.1:3307/attendance_db",
    ["mysql:"],
  ),
  identityUrl: url("IDENTITY_URL", "http://localhost:3001", [
    "http:",
    "https:",
  ]),
  identityTimeoutMs: 2500,
  uploadDirectory: resolve(workspaceRoot, process.env.UPLOAD_DIR || "uploads"),
};
