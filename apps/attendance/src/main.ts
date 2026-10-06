import { Logger } from "@nestjs/common";
import { bootstrap } from "@wfh/common";
import { AppModule } from "./app.module";
import { attendanceConfig } from "./config/configuration";

bootstrap(
  AppModule,
  "WFH Attendance API",
  attendanceConfig.port,
  "api/attendance/docs",
).catch((error: Error) => {
  new Logger("Bootstrap").error(error.stack);
  process.exitCode = 1;
});
