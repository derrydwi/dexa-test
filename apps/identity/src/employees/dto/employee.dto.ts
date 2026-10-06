import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "@wfh/contracts";
import { Transform, Type } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

const email = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

export class CreateEmployeeDto implements CreateEmployeeInput {
  @ApiProperty({ example: "EMP-003" })
  @Transform(trim)
  @Matches(/^[A-Za-z0-9_-]+$/)
  @Length(2, 24)
  employeeCode!: string;

  @ApiProperty({ example: "Alex Morgan" })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  fullName!: string;

  @ApiProperty({ example: "alex@wfh.test" })
  @Transform(email)
  @IsEmail()
  @Length(3, 254)
  email!: string;

  @ApiProperty({ example: "Engineering" })
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  department!: string;

  @ApiProperty({ example: "Software Engineer" })
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  jobTitle!: string;

  @ApiProperty({ minLength: 10, maxLength: 128 })
  @IsString()
  @Length(10, 128)
  password!: string;
}

export class UpdateEmployeeDto
  extends PartialType(CreateEmployeeDto, {
    skipNullProperties: false,
  })
  implements UpdateEmployeeInput
{
  @ApiPropertyOptional({ enum: ["active", "inactive"] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(["active", "inactive"])
  status?: "active" | "inactive";
}

export class EmployeeQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(0, 100)
  q?: string;

  @ApiPropertyOptional({
    enum: ["active", "inactive", "all"],
    default: "active",
  })
  @IsIn(["active", "inactive", "all"])
  status: "active" | "inactive" | "all" = "active";

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
