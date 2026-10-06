import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { AttendanceRecord, User } from "@wfh/contracts";

export class UserResponseDto implements User {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeCode!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  department!: string;

  @ApiProperty()
  jobTitle!: string;

  @ApiProperty({ enum: ["HR", "EMPLOYEE"] })
  role!: User["role"];

  @ApiProperty()
  active!: boolean;
}

export class AttendanceResponseDto implements AttendanceRecord {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  employeeCode!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  department!: string;

  @ApiProperty({ format: "date" })
  workDate!: string;

  @ApiProperty({ format: "date-time" })
  checkInAt!: string;

  @ApiProperty({ type: String, nullable: true, format: "date-time" })
  checkOutAt!: string | null;

  @ApiProperty()
  checkInPhoto!: string;

  @ApiProperty({ type: String, nullable: true })
  checkOutPhoto!: string | null;

  @ApiProperty({ enum: ["Working", "Completed", "Incomplete"] })
  status!: AttendanceRecord["status"];
}

export class EmployeePageDto {
  @ApiProperty({ type: [UserResponseDto] })
  items!: UserResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class AttendancePageDto {
  @ApiProperty({ type: [AttendanceResponseDto] })
  items!: AttendanceResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class ErrorResponseDto {
  @ApiProperty()
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
  })
  message!: string | string[];

  @ApiProperty()
  timestamp!: string;

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: { type: "array", items: { type: "string" } },
  })
  fieldErrors?: Record<string, string[]>;
}

export class MessageResponseDto {
  @ApiProperty()
  message!: string;
}

export class HealthResponseDto {
  @ApiProperty()
  service!: string;

  @ApiProperty()
  status!: string;
}
