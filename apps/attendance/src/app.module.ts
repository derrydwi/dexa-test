import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AttendanceModule } from "./attendance/attendance.module";
import { databaseOptions } from "./database/data-source";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseOptions),
    AttendanceModule,
    HealthModule,
  ],
})
export class AppModule {}
