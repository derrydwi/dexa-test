import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Employee } from "../employees/employee.entity";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { Session } from "./session.entity";
import { SessionGuard } from "./session.guard";

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Session])],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
