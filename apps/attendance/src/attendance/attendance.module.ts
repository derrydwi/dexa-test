import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IdentityClientModule } from "../identity-client/identity-client.module";
import { PhotosModule } from "../photos/photos.module";
import { AttendanceController } from "./attendance.controller";
import { Attendance } from "./attendance.entity";
import { AttendanceService } from "./attendance.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance]),
    IdentityClientModule,
    PhotosModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
